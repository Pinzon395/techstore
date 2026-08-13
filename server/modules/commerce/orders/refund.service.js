'use strict';

const crypto = require('crypto');
const { Money, normalizeMoney } = require('../money');
const { ValidationError, NotFoundError, InvalidStateError, ConflictError } = require('../errors');
const { positiveId, plainText, integerValue, booleanValue } = require('../validation');

const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,79}$/;

class RefundService {
    constructor({ pool, runTransaction, audit, providerService }) {
        Object.assign(this, { pool, runTransaction, audit, providerService });
    }

    async list(paymentIdValue, executor = this.pool) {
        const paymentId = positiveId(paymentIdValue, 'payment_id');
        const [rows] = await executor.execute(
            `SELECT id, public_id, order_id, payment_id, refund_type, amount, currency, reason, status,
                    provider, external_refund_id, failure_reason, requested_by, completed_by,
                    requested_at, completed_at, updated_at
             FROM commerce_refunds WHERE payment_id = ? ORDER BY requested_at DESC, id DESC`, [paymentId]
        );
        return rows;
    }

    async request(orderIdValue, paymentIdValue, payload, actor) {
        const orderId = positiveId(orderIdValue, 'order_id');
        const paymentId = positiveId(paymentIdValue, 'payment_id');
        const amount = normalizeMoney(payload?.amount, { field: 'amount' });
        if (Money.fromDecimal(amount).minor === 0n) throw new ValidationError('El refund debe ser mayor que cero');
        const reason = plainText(payload?.reason, { field: 'reason', max: 1000, multiline: true, required: true });
        const idempotencyKey = String(payload?.idempotency_key || '').trim();
        if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) throw new ValidationError('idempotency_key no es valida');

        const created = await this.runTransaction(this.pool, async (connection) => {
            const [[replay]] = await connection.execute('SELECT * FROM commerce_refunds WHERE idempotency_key = ? LIMIT 1 FOR UPDATE', [idempotencyKey]);
            if (replay) return { refund: replay, replayed: true, external: false };
            const [[payment]] = await connection.execute(
                'SELECT * FROM commerce_payments WHERE id = ? AND order_id = ? LIMIT 1 FOR UPDATE', [paymentId, orderId]
            );
            if (!payment) throw new NotFoundError('Pago');
            if (!['APPROVED','PARTIALLY_REFUNDED'].includes(payment.status)) {
                throw new InvalidStateError('Solo se pueden reembolsar pagos aprobados');
            }
            const [[reserved]] = await connection.execute(
                `SELECT COALESCE(SUM(amount),0) total FROM commerce_refunds
                 WHERE payment_id = ? AND status IN ('PENDING','PROCESSING','SUCCEEDED')`, [paymentId]
            );
            const paid = Money.fromDecimal(payment.amount, payment.currency);
            const committed = Money.fromDecimal(String(reserved.total || '0.00'), payment.currency);
            const available = paid.subtract(committed);
            const requested = Money.fromDecimal(amount, payment.currency);
            if (requested.compare(available) > 0) {
                throw new ConflictError('El refund supera el monto disponible', { refundable_amount: available.toDecimal() });
            }
            const provider = payment.provider || (['STRIPE','PAYPAL','MERCADO_PAGO'].includes(payment.method) ? payment.method : null);
            if (provider && (!payment.external_transaction_id || !this.providerService.isConfigured(provider))) {
                throw new InvalidStateError('El proveedor externo no esta configurado o el pago no tiene transaccion externa');
            }
            const refundType = requested.compare(available) === 0 ? 'TOTAL' : 'PARTIAL';
            const status = provider ? 'PROCESSING' : 'PENDING';
            const publicId = crypto.randomUUID();
            const [insert] = await connection.execute(
                `INSERT INTO commerce_refunds
                    (public_id, idempotency_key, order_id, payment_id, refund_type, amount, currency,
                     reason, status, provider, requested_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [publicId, idempotencyKey, orderId, paymentId, refundType, amount, payment.currency,
                    reason, status, provider, actor.userId]
            );
            const [[refund]] = await connection.execute('SELECT * FROM commerce_refunds WHERE id = ?', [insert.insertId]);
            await this.audit.write(connection, {
                actor, action: 'request', entity: 'commerce_refund', entityId: refund.id,
                before: null, after: { amount, currency: payment.currency, refund_type: refundType, status, provider }
            });
            return { refund, payment, replayed: false, external: Boolean(provider) };
        }, { isolationLevel: 'READ COMMITTED', maxRetries: 2 });

        if (created.replayed || !created.external) return created;
        return this.processExternal(created.refund, created.payment, actor);
    }

    async processExternal(refund, payment, actor) {
        try {
            const result = await this.providerService.refund(refund.provider, {
                transactionId: payment.external_transaction_id,
                amount: String(refund.amount),
                amountMinor: Money.fromDecimal(refund.amount, refund.currency).minor.toString(),
                currency: refund.currency,
                idempotencyKey: refund.idempotency_key
            });
            if (result.status === 'SUCCEEDED') {
                return { refund: await this.complete(refund.id, { external_id: result.externalId }, actor, { external: true }), replayed: false };
            }
            await this.pool.execute(
                'UPDATE commerce_refunds SET external_refund_id = ? WHERE id = ? AND status = \'PROCESSING\'',
                [result.externalId, refund.id]
            );
            return { refund: { ...refund, external_refund_id: result.externalId, status: 'PROCESSING' }, replayed: false };
        } catch (error) {
            await this.pool.execute(
                `UPDATE commerce_refunds SET status = 'FAILED', failure_reason = ? WHERE id = ? AND status = 'PROCESSING'`,
                [String(error.message || 'Error del proveedor').slice(0, 1000), refund.id]
            );
            throw error;
        }
    }

    async complete(refundIdValue, payload, actor, { external = false } = {}) {
        const refundId = positiveId(refundIdValue, 'refund_id');
        return this.runTransaction(this.pool, async (connection) => {
            const [[refund]] = await connection.execute('SELECT * FROM commerce_refunds WHERE id = ? LIMIT 1 FOR UPDATE', [refundId]);
            if (!refund) throw new NotFoundError('Refund');
            if (refund.status === 'SUCCEEDED') return refund;
            if (external ? refund.status !== 'PROCESSING' : refund.status !== 'PENDING') {
                throw new InvalidStateError('El refund no puede completarse en su estado actual');
            }
            const [[payment]] = await connection.execute('SELECT * FROM commerce_payments WHERE id = ? LIMIT 1 FOR UPDATE', [refund.payment_id]);
            const refunded = Money.fromDecimal(payment.refunded_amount, payment.currency).add(refund.amount);
            if (refunded.compare(payment.amount) > 0) throw new ConflictError('El refund supera el monto pagado');
            const paymentStatus = refunded.compare(payment.amount) === 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
            await connection.execute(
                `UPDATE commerce_refunds SET status = 'SUCCEEDED', external_refund_id = COALESCE(?, external_refund_id),
                    completed_by = ?, completed_at = UTC_TIMESTAMP(), failure_reason = NULL WHERE id = ?`,
                [payload?.external_id || null, actor.userId, refundId]
            );
            await connection.execute('UPDATE commerce_payments SET refunded_amount = ?, status = ? WHERE id = ?', [refunded.toDecimal(), paymentStatus, payment.id]);
            await this.audit.write(connection, {
                actor, action: 'complete', entity: 'commerce_refund', entityId: refundId,
                before: { status: refund.status, payment_status: payment.status, refunded_amount: payment.refunded_amount },
                after: { status: 'SUCCEEDED', payment_status: paymentStatus, refunded_amount: refunded.toDecimal() }
            });
            const [[after]] = await connection.execute('SELECT * FROM commerce_refunds WHERE id = ?', [refundId]);
            return after;
        });
    }

    async cancel(refundIdValue, actor) {
        const refundId = positiveId(refundIdValue, 'refund_id');
        return this.runTransaction(this.pool, async (connection) => {
            const [[refund]] = await connection.execute('SELECT * FROM commerce_refunds WHERE id = ? LIMIT 1 FOR UPDATE', [refundId]);
            if (!refund) throw new NotFoundError('Refund');
            if (refund.status === 'CANCELLED') return refund;
            if (refund.status !== 'PENDING') throw new InvalidStateError('Solo un refund pendiente puede cancelarse');
            await connection.execute("UPDATE commerce_refunds SET status = 'CANCELLED', completed_by = ?, completed_at = UTC_TIMESTAMP() WHERE id = ?", [actor.userId, refundId]);
            await this.audit.write(connection, { actor, action: 'cancel', entity: 'commerce_refund', entityId: refundId, before: { status: refund.status }, after: { status: 'CANCELLED' } });
            return { ...refund, status: 'CANCELLED' };
        });
    }
}

class ReturnService {
    constructor({ pool, runTransaction, audit }) { Object.assign(this, { pool, runTransaction, audit }); }

    async request(orderIdValue, payload, actor) {
        const orderId = positiveId(orderIdValue, 'order_id');
        const reason = plainText(payload?.reason, { field: 'reason', max: 1000, multiline: true, required: true });
        if (!Array.isArray(payload?.items) || !payload.items.length) throw new ValidationError('items es obligatorio');
        const items = payload.items.map((item, index) => ({
            orderItemId: positiveId(item.order_item_id, `items[${index}].order_item_id`),
            quantity: integerValue(item.quantity, { field: `items[${index}].quantity`, min: 1, max: 100 }),
            restock: booleanValue(item.restock, { field: `items[${index}].restock`, fallback: false })
        }));
        return this.runTransaction(this.pool, async (connection) => {
            const [[order]] = await connection.execute('SELECT id, status FROM commerce_orders WHERE id = ? FOR UPDATE', [orderId]);
            if (!order) throw new NotFoundError('Pedido');
            if (!['PAID','PREPARING','READY','COMPLETED'].includes(order.status)) throw new InvalidStateError('El pedido no admite devoluciones');
            const publicId = crypto.randomUUID();
            const [insert] = await connection.execute(
                'INSERT INTO commerce_returns (public_id, order_id, reason, requested_by) VALUES (?, ?, ?, ?)',
                [publicId, orderId, reason, actor.userId]
            );
            for (const item of items) {
                const [[orderItem]] = await connection.execute('SELECT id, quantity FROM commerce_order_items WHERE id = ? AND order_id = ? FOR UPDATE', [item.orderItemId, orderId]);
                if (!orderItem) throw new NotFoundError('Item del pedido');
                const [[used]] = await connection.execute(
                    `SELECT COALESCE(SUM(ri.quantity),0) quantity FROM commerce_return_items ri
                     JOIN commerce_returns r ON r.id = ri.return_id
                     WHERE ri.order_item_id = ? AND r.status NOT IN ('REJECTED','CANCELLED')`, [item.orderItemId]
                );
                if (Number(used.quantity) + item.quantity > Number(orderItem.quantity)) throw new ConflictError('La devolucion supera la cantidad comprada');
                await connection.execute('INSERT INTO commerce_return_items (return_id, order_item_id, quantity, restock) VALUES (?, ?, ?, ?)', [insert.insertId, item.orderItemId, item.quantity, item.restock]);
            }
            await this.audit.write(connection, { actor, action: 'request', entity: 'commerce_return', entityId: insert.insertId, before: null, after: { order_id: orderId, items } });
            return { id: insert.insertId, public_id: publicId, order_id: orderId, status: 'REQUESTED', reason, items };
        });
    }

    async updateStatus(returnIdValue, payload, actor) {
        const returnId = positiveId(returnIdValue, 'return_id');
        const next = String(payload?.status || '').toUpperCase();
        const transitions = { REQUESTED: ['APPROVED','REJECTED','CANCELLED'], APPROVED: ['RECEIVED','CANCELLED'], RECEIVED: [], REJECTED: [], CANCELLED: [] };
        return this.runTransaction(this.pool, async (connection) => {
            const [[record]] = await connection.execute('SELECT * FROM commerce_returns WHERE id = ? FOR UPDATE', [returnId]);
            if (!record) throw new NotFoundError('Devolucion');
            if (record.status === next) return record;
            if (!transitions[record.status]?.includes(next)) throw new InvalidStateError(`No se puede cambiar la devolucion de ${record.status} a ${next}`);
            if (next === 'RECEIVED') {
                const [items] = await connection.execute(
                    `SELECT ri.*, oi.catalog_item_id FROM commerce_return_items ri
                     JOIN commerce_order_items oi ON oi.id = ri.order_item_id WHERE ri.return_id = ? FOR UPDATE`, [returnId]
                );
                for (const item of items.filter((entry) => Number(entry.restock) && !entry.inventory_restored_at && entry.catalog_item_id)) {
                    const [[catalog]] = await connection.execute('SELECT id, stock_quantity FROM catalog_items WHERE id = ? FOR UPDATE', [item.catalog_item_id]);
                    const before = Number(catalog.stock_quantity);
                    const after = before + Number(item.quantity);
                    await connection.execute("UPDATE catalog_items SET stock_quantity = ?, status = CASE WHEN status IN ('SOLD','OUT_OF_STOCK') THEN 'ACTIVE' ELSE status END WHERE id = ?", [after, catalog.id]);
                    await connection.execute(
                        `INSERT INTO commerce_inventory_movements
                            (catalog_item_id, qty_delta, quantity_before, quantity_after, reason, reference_order_id, created_by, note)
                         VALUES (?, ?, ?, ?, 'RETURN', ?, ?, ?)`,
                        [catalog.id, item.quantity, before, after, record.order_id, actor.userId, `Devolucion ${record.public_id}`]
                    );
                    await connection.execute('UPDATE commerce_return_items SET inventory_restored_at = UTC_TIMESTAMP() WHERE return_id = ? AND order_item_id = ?', [returnId, item.order_item_id]);
                }
            }
            await connection.execute(
                `UPDATE commerce_returns SET status = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(),
                    received_at = CASE WHEN ? = 'RECEIVED' THEN UTC_TIMESTAMP() ELSE received_at END WHERE id = ?`,
                [next, actor.userId, next, returnId]
            );
            await this.audit.write(connection, { actor, action: 'status_change', entity: 'commerce_return', entityId: returnId, before: { status: record.status }, after: { status: next } });
            return { ...record, status: next, reviewed_by: actor.userId };
        });
    }
}

module.exports = { RefundService, ReturnService };
