'use strict';

const { NotFoundError, InvalidStateError, ValidationError } = require('../errors');
const { positiveId, plainText } = require('../validation');
const { assertTransition } = require('./order-state');

function escapeLike(value) { return String(value).replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_'); }

class AdminOrderService {
    constructor({ pool, runTransaction, orderService, inventoryService, notifications, settingsService, audit, emails, dashboardService }) {
        Object.assign(this, { pool, runTransaction, orderService, inventoryService, notifications, settingsService, audit, emails, dashboardService });
    }

    async list(query = {}) {
        const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 25));
        const where = [];
        const params = [];
        if (query.status) { where.push('o.status = ?'); params.push(String(query.status).toUpperCase()); }
        if (query.payment_status) {
            where.push(`EXISTS (
                SELECT 1 FROM commerce_payments pf
                WHERE pf.id = (SELECT MAX(pf2.id) FROM commerce_payments pf2 WHERE pf2.order_id = o.id)
                  AND pf.status = ?
            )`);
            params.push(String(query.payment_status).toUpperCase());
        }
        if (query.payment_method) {
            where.push(`EXISTS (SELECT 1 FROM commerce_payments pm WHERE pm.order_id = o.id AND pm.method = ?)`);
            params.push(String(query.payment_method).toUpperCase());
        }
        if (query.product) {
            const like = `%${escapeLike(String(query.product).slice(0, 120))}%`;
            where.push(`EXISTS (SELECT 1 FROM commerce_order_items pi WHERE pi.order_id = o.id
                AND (pi.title_snapshot LIKE ? ESCAPE '!' OR pi.sku_snapshot LIKE ? ESCAPE '!'))`);
            params.push(like, like);
        }
        if (query.min_total !== undefined && query.min_total !== '') {
            const value = Number(query.min_total); if (!Number.isFinite(value) || value < 0) throw new ValidationError('min_total no es valido');
            where.push('o.total >= ?'); params.push(value.toFixed(2));
        }
        if (query.max_total !== undefined && query.max_total !== '') {
            const value = Number(query.max_total); if (!Number.isFinite(value) || value < 0) throw new ValidationError('max_total no es valido');
            where.push('o.total <= ?'); params.push(value.toFixed(2));
        }
        if (query.from) { where.push('o.created_at >= ?'); params.push(String(query.from).slice(0, 10)); }
        if (query.to) { where.push('o.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(String(query.to).slice(0, 10)); }
        const q = String(query.q || query.customer || query.folio || '').trim();
        if (q) {
            const like = `%${escapeLike(q.slice(0, 120))}%`;
            where.push("(o.folio LIKE ? ESCAPE '!' OR o.customer_name LIKE ? ESCAPE '!' OR o.customer_email LIKE ? ESCAPE '!' OR o.customer_phone LIKE ? ESCAPE '!')");
            params.push(like, like, like, like);
        }
        const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [[count]] = await this.pool.execute(`SELECT COUNT(*) total FROM commerce_orders o ${clause}`, params);
        const [rows] = await this.pool.execute(
            `SELECT o.id, o.folio, o.customer_name, o.customer_email, o.customer_phone,
                    o.total, o.currency, o.status, o.delivery_method, o.created_at,
                    (SELECT COALESCE(SUM(oi.quantity),0) FROM commerce_order_items oi WHERE oi.order_id = o.id) item_count,
                    p.id AS payment_id, p.method AS payment_method, p.status AS payment_status,
                    p.reviewed_at AS payment_reviewed_at, reviewer.name AS payment_reviewed_by
             FROM commerce_orders o
             LEFT JOIN commerce_payments p ON p.id = (SELECT MAX(p2.id) FROM commerce_payments p2 WHERE p2.order_id = o.id)
             LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by
             ${clause} ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
            [...params, pageSize, (page - 1) * pageSize]
        );
        const [[summary]] = await this.pool.execute(
            `SELECT COUNT(*) total,
                    SUM(status = 'PENDING_PAYMENT') pending,
                    SUM(status = 'PAYMENT_REVIEW') review,
                    SUM(status = 'PAID') paid,
                    SUM(status = 'PREPARING') preparing,
                    SUM(status = 'READY') ready
             FROM commerce_orders`
        );
        return { rows, total: Number(count.total || 0), page, pageSize, summary };
    }

    async detail(id, executor = this.pool) {
        const orderId = positiveId(id, 'id');
        const [[order]] = await executor.execute(
            `SELECT o.*, r.ticket_code FROM commerce_orders o LEFT JOIN repairs r ON r.id = o.ticket_id WHERE o.id = ? LIMIT 1`,
            [orderId]
        );
        if (!order) throw new NotFoundError('Pedido');
        const [items] = await executor.execute('SELECT * FROM commerce_order_items WHERE order_id = ? ORDER BY id', [orderId]);
        const [payments] = await executor.execute(
            `SELECT p.*, u.name AS reviewed_by_name,
                    CASE WHEN p.proof_storage_key IS NULL THEN NULL ELSE CONCAT('/api/admin/commerce/payment-proofs/', p.proof_storage_key) END proof_url
             FROM commerce_payments p LEFT JOIN users u ON u.id = p.reviewed_by WHERE p.order_id = ? ORDER BY p.id DESC`,
            [orderId]
        );
        const [history] = await executor.execute(
            `SELECT h.*, u.name AS actor_name FROM commerce_order_status_history h
             LEFT JOIN users u ON u.id = h.actor_user_id WHERE h.order_id = ? ORDER BY h.created_at, h.id`, [orderId]
        );
        const [reservations] = await executor.execute(
            `SELECT r.*, i.name AS item_name, i.sku FROM commerce_order_inventory_reservations r
             JOIN catalog_items i ON i.id = r.catalog_item_id WHERE r.order_id = ? ORDER BY r.catalog_item_id`, [orderId]
        );
        const [refunds] = await executor.execute('SELECT * FROM commerce_refunds WHERE order_id = ? ORDER BY requested_at DESC, id DESC', [orderId]);
        const [returns] = await executor.execute('SELECT * FROM commerce_returns WHERE order_id = ? ORDER BY requested_at DESC, id DESC', [orderId]);
        return { order, items, payments, history, reservations, refunds, returns };
    }

    async updateStatus(id, payload, actor) {
        const orderId = positiveId(id, 'id');
        const next = String(payload?.status || '').trim().toUpperCase();
        const note = plainText(payload?.note, { field: 'note', max: 1000, multiline: true, nullable: true });
        const outcome = await this.runTransaction(this.pool, async (connection) => {
            const [[order]] = await connection.execute('SELECT * FROM commerce_orders WHERE id = ? LIMIT 1 FOR UPDATE', [orderId]);
            if (!order) throw new NotFoundError('Pedido');
            if (order.status === next) return { order: await this.orderService.getById(orderId, connection), changed: false };
            assertTransition(order.status, next);
            if (next === 'CANCELLED') {
                if (['PENDING_PAYMENT','PAYMENT_REVIEW'].includes(order.status)) {
                    await this.inventoryService.releaseOrder(connection, orderId, actor.userId, note || 'Pedido cancelado');
                } else {
                    await this.inventoryService.returnOrder(connection, orderId, actor.userId, note || 'Pedido cancelado');
                }
                await connection.execute(
                    `UPDATE commerce_payments SET status = 'REJECTED', reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(),
                        rejection_reason = COALESCE(?, 'Pedido cancelado')
                     WHERE order_id = ? AND status IN ('PENDING','UNDER_REVIEW')`,
                    [actor.userId, note, orderId]
                );
            }
            await connection.execute('UPDATE commerce_orders SET status = ?, reservation_expires_at = NULL WHERE id = ?', [next, orderId]);
            await connection.execute(
                `INSERT INTO commerce_order_status_history (order_id, from_status, to_status, actor_type, actor_user_id, note)
                 VALUES (?, ?, ?, 'ADMIN', ?, ?)`, [orderId, order.status, next, actor.userId, note]
            );
            await this.audit.write(connection, { actor, action: 'status_change', entity: 'commerce_order', entityId: orderId, before: { status: order.status }, after: { status: next }, metadata: { note } });
            return { order: await this.orderService.getById(orderId, connection), changed: true };
        });
        if (outcome.changed) this.notifyStatus(outcome.order, next);
        return outcome.order;
    }

    async linkTicket(id, payload, actor) {
        const orderId = positiveId(id, 'id');
        const ticketCode = plainText(payload?.ticket_code, { field: 'ticket_code', max: 32, nullable: true });
        return this.runTransaction(this.pool, async (connection) => {
            const [[order]] = await connection.execute('SELECT id, ticket_id FROM commerce_orders WHERE id = ? LIMIT 1 FOR UPDATE', [orderId]);
            if (!order) throw new NotFoundError('Pedido');
            let ticketId = null;
            if (ticketCode) {
                const [[ticket]] = await connection.execute('SELECT id FROM repairs WHERE UPPER(ticket_code) = UPPER(?) LIMIT 1', [ticketCode]);
                if (!ticket) throw new NotFoundError('Ticket');
                ticketId = ticket.id;
            }
            await connection.execute('UPDATE commerce_orders SET ticket_id = ? WHERE id = ?', [ticketId, orderId]);
            await this.audit.write(connection, {
                actor,
                action: 'link_ticket',
                entity: 'commerce_order',
                entityId: orderId,
                before: { ticket_id: order.ticket_id },
                after: { ticket_id: ticketId }
            });
            return this.detail(orderId, connection);
        });
    }

    notifyStatus(order, status) {
        const fn = status === 'READY' ? this.emails.notifyCustomerOrderReady
            : status === 'COMPLETED' ? this.emails.notifyCustomerOrderCompleted : null;
        if (fn) Promise.allSettled([fn(order)]).catch(() => {});
    }

    async approvePayment(orderIdValue, paymentIdValue, actor) {
        const orderId = positiveId(orderIdValue, 'id');
        const paymentId = positiveId(paymentIdValue, 'payment_id');
        const outcome = await this.runTransaction(this.pool, async (connection) => {
            const [[payment]] = await connection.execute('SELECT * FROM commerce_payments WHERE id = ? AND order_id = ? LIMIT 1 FOR UPDATE', [paymentId, orderId]);
            if (!payment) throw new NotFoundError('Pago');
            const [[order]] = await connection.execute('SELECT * FROM commerce_orders WHERE id = ? LIMIT 1 FOR UPDATE', [orderId]);
            if (!order) throw new NotFoundError('Pedido');
            if (payment.status === 'APPROVED') {
                if (['PAID','PREPARING','READY','COMPLETED'].includes(order.status)) {
                    return { order: await this.orderService.getById(orderId, connection), replayed: true };
                }
                throw new InvalidStateError('Pago aprobado con estado de pedido inconsistente');
            }
            if (!['PENDING','UNDER_REVIEW'].includes(payment.status) || !['PENDING_PAYMENT','PAYMENT_REVIEW'].includes(order.status)) {
                throw new InvalidStateError('El pago no puede aprobarse en su estado actual');
            }
            await this.inventoryService.consumeOrder(connection, orderId, actor.userId);
            await connection.execute(
                "UPDATE commerce_payments SET status = 'APPROVED', reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(), rejection_reason = NULL WHERE id = ?",
                [actor.userId, paymentId]
            );
            if (order.status === 'PENDING_PAYMENT') {
                await connection.execute(
                    `INSERT INTO commerce_order_status_history (order_id, from_status, to_status, actor_type, actor_user_id, note)
                     VALUES (?, 'PENDING_PAYMENT', 'PAYMENT_REVIEW', 'ADMIN', ?, 'Pago verificado directamente')`,
                    [orderId, actor.userId]
                );
            }
            await connection.execute("UPDATE commerce_orders SET status = 'PAID', reservation_expires_at = NULL WHERE id = ?", [orderId]);
            await connection.execute(
                `INSERT INTO commerce_order_status_history (order_id, from_status, to_status, actor_type, actor_user_id, note)
                 VALUES (?, ?, 'PAID', 'ADMIN', ?, 'Pago aprobado')`,
                [orderId, order.status === 'PENDING_PAYMENT' ? 'PAYMENT_REVIEW' : order.status, actor.userId]
            );
            await this.notifications.create(connection, {
                adminBroadcast: true, type: 'PAYMENT_APPROVED', title: `Pago confirmado: ${order.folio}`,
                payload: { order_id: orderId, payment_id: paymentId, folio: order.folio }
            });
            await this.audit.write(connection, {
                actor, action: 'approve', entity: 'commerce_payment', entityId: paymentId,
                before: { payment_status: payment.status, order_status: order.status },
                after: { payment_status: 'APPROVED', order_status: 'PAID' }
            });
            return { order: await this.orderService.getById(orderId, connection), replayed: false };
        }, { isolationLevel: 'READ COMMITTED', maxRetries: 2 });
        if (!outcome.replayed) Promise.allSettled([this.emails.notifyCustomerPaymentApproved(outcome.order)]).catch(() => {});
        return outcome;
    }

    async rejectPayment(orderIdValue, paymentIdValue, payload, actor) {
        const orderId = positiveId(orderIdValue, 'id');
        const paymentId = positiveId(paymentIdValue, 'payment_id');
        const reason = plainText(payload?.reason, { field: 'reason', max: 1000, multiline: true, required: true });
        const order = await this.runTransaction(this.pool, async (connection) => {
            const [[payment]] = await connection.execute('SELECT * FROM commerce_payments WHERE id = ? AND order_id = ? LIMIT 1 FOR UPDATE', [paymentId, orderId]);
            if (!payment) throw new NotFoundError('Pago');
            const [[lockedOrder]] = await connection.execute('SELECT * FROM commerce_orders WHERE id = ? LIMIT 1 FOR UPDATE', [orderId]);
            if (!lockedOrder) throw new NotFoundError('Pedido');
            if (payment.status === 'APPROVED') throw new InvalidStateError('Un pago aprobado no puede rechazarse');
            if (payment.status === 'REJECTED' && payment.rejection_reason === reason) return this.orderService.getById(orderId, connection);
            await connection.execute(
                `UPDATE commerce_payments SET status = 'REJECTED', reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(), rejection_reason = ? WHERE id = ?`,
                [actor.userId, reason, paymentId]
            );
            if (lockedOrder.status === 'PAYMENT_REVIEW') {
                assertTransition('PAYMENT_REVIEW', 'PENDING_PAYMENT');
                const minutes = await this.settingsService.reservationMinutes(connection);
                await connection.execute(
                    "UPDATE commerce_orders SET status = 'PENDING_PAYMENT', reservation_expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE) WHERE id = ?",
                    [minutes, orderId]
                );
                await connection.execute(
                    `INSERT INTO commerce_order_status_history (order_id, from_status, to_status, actor_type, actor_user_id, note)
                     VALUES (?, 'PAYMENT_REVIEW', 'PENDING_PAYMENT', 'ADMIN', ?, ?)`, [orderId, actor.userId, reason]
                );
            }
            await this.audit.write(connection, {
                actor, action: 'reject', entity: 'commerce_payment', entityId: paymentId,
                before: { status: payment.status }, after: { status: 'REJECTED', rejection_reason: reason }
            });
            return this.orderService.getById(orderId, connection);
        });
        Promise.allSettled([this.emails.notifyCustomerPaymentRejected?.(order, reason)]).catch(() => {});
        return order;
    }

    async dashboard(query = {}) {
        if (!this.dashboardService) throw new Error('DashboardService no configurado');
        return this.dashboardService.getCommerceReport(query);
    }
}

module.exports = { AdminOrderService, escapeLike };
