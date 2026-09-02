'use strict';

const crypto = require('crypto');
const { Money } = require('../money');
const { ConflictError, NotFoundError, InvalidStateError } = require('../errors');
const { assertTransition } = require('./order-state');
const { inspectPaymentProof } = require('./payment-proof-inspector');

function parseJson(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return fallback; }
}

function decimal(value) { return value === null || value === undefined ? null : String(value); }

function buildInventoryDemand(requested, bundleRows, byId) {
    const demand = new Map();
    const componentsByBundle = new Map();
    for (const row of bundleRows) {
        const id = Number(row.bundle_catalog_item_id);
        if (!componentsByBundle.has(id)) componentsByBundle.set(id, []);
        componentsByBundle.get(id).push(row);
    }
    for (const entry of requested) {
        const components = componentsByBundle.get(entry.catalog_item_id) || [];
        if (entry.item.item_type === 'BUNDLE' && components.length) {
            for (const component of components) {
                const componentItem = byId.get(Number(component.component_catalog_item_id));
                if (!componentItem || componentItem.deleted_at) throw new ConflictError('Un componente del paquete ya no esta disponible');
                if (Number(componentItem.track_stock)) {
                    const quantity = entry.quantity * Number(component.quantity);
                    demand.set(Number(componentItem.id), (demand.get(Number(componentItem.id)) || 0) + quantity);
                }
            }
        } else if (Number(entry.item.track_stock)) {
            demand.set(entry.catalog_item_id, (demand.get(entry.catalog_item_id) || 0) + entry.quantity);
        }
    }
    return demand;
}

function publicOrder(row, items, payments, history, settings = null) {
    const payment = payments[0] || null;
    return {
        folio: row.folio,
        customer: { name: row.customer_name, email: row.customer_email, phone: row.customer_phone },
        status: row.status,
        delivery_method: row.delivery_method,
        delivery_note: row.delivery_note,
        pricing: {
            subtotal: decimal(row.subtotal),
            discount_total: decimal(row.discount_total),
            total: decimal(row.total),
            currency: row.currency
        },
        items: items.map((item) => ({
            catalog_item_id: item.catalog_item_id,
            slug: item.slug,
            title: item.title_snapshot,
            sku: item.sku_snapshot,
            item_type: item.item_type_snapshot,
            list_unit_price: decimal(item.list_unit_price),
            unit_price: decimal(item.unit_price),
            discount_amount: decimal(item.discount_amount),
            quantity: Number(item.quantity),
            line_total: decimal(item.line_total)
        })),
        payment: payment ? {
            method: payment.method,
            status: payment.status,
            amount: decimal(payment.amount),
            proof_received: Boolean(payment.uploaded_at),
            uploaded_at: payment.uploaded_at,
            rejection_reason: payment.status === 'REJECTED' ? payment.rejection_reason : null
        } : null,
        transfer: payment?.method === 'BANK_TRANSFER' && settings?.BANK_TRANSFER?.enabled
            ? {
                beneficiary: settings.BANK_TRANSFER.beneficiary || '',
                bank: settings.BANK_TRANSFER.bank || '',
                clabe: settings.BANK_TRANSFER.clabe || '',
                account: settings.BANK_TRANSFER.account || '',
                instructions: settings.BANK_TRANSFER.instructions || '',
                reference: row.folio,
                amount: decimal(row.total),
                currency: row.currency
            }
            : null,
        timeline: history.map((entry) => ({
            from_status: entry.from_status,
            to_status: entry.to_status,
            actor: entry.actor_type,
            note: entry.note,
            created_at: entry.created_at
        })),
        ticket: row.ticket_code ? { folio: row.ticket_code } : null,
        reservation_expires_at: row.reservation_expires_at,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

class OrderService {
    constructor({ pool, runTransaction, promotionService, settingsService, inventoryService, notifications, audit, proofStorage, proofMaxBytes, emails }) {
        Object.assign(this, { pool, runTransaction, promotionService, settingsService, inventoryService, notifications, audit, proofStorage, proofMaxBytes, emails });
    }

    async generateFolio(connection, date = new Date()) {
        const year = date.getUTCFullYear();
        const key = `orders:${year}`;
        await connection.execute(
            `INSERT INTO commerce_counters (counter_key, counter_value) VALUES (?, 1)
             ON DUPLICATE KEY UPDATE counter_value = counter_value + 1`,
            [key]
        );
        const [[counter]] = await connection.execute('SELECT counter_value FROM commerce_counters WHERE counter_key = ? FOR UPDATE', [key]);
        return `PIX-${year}-${String(counter.counter_value).padStart(6, '0')}`;
    }

    async acquireIdempotencyLock(connection, idempotencyKey) {
        const key = `idem:${crypto.createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 48)}`;
        await connection.execute(
            `INSERT INTO commerce_counters (counter_key, counter_value) VALUES (?, 0)
             ON DUPLICATE KEY UPDATE counter_value = counter_value`,
            [key]
        );
        await connection.execute('SELECT counter_value FROM commerce_counters WHERE counter_key = ? FOR UPDATE', [key]);
    }

    async lockCheckoutItems(connection, requested) {
        const requestedIds = requested.map((entry) => entry.catalog_item_id).sort((a, b) => a - b);
        const [bundleProbe] = await connection.execute(
            `SELECT b.bundle_catalog_item_id, b.component_catalog_item_id, b.quantity
             FROM commerce_bundle_items b WHERE b.bundle_catalog_item_id IN (${requestedIds.map(() => '?').join(',')})
             ORDER BY b.bundle_catalog_item_id, b.component_catalog_item_id`,
            requestedIds
        );
        const allIds = [...new Set([...requestedIds, ...bundleProbe.map((row) => Number(row.component_catalog_item_id))])].sort((a, b) => a - b);
        const [rows] = await connection.execute(
            `SELECT id, sku, slug, name, brand, item_type, status, base_price, sale_price, cost_reference, currency,
                    track_stock, stock_quantity, reserved_quantity, allow_purchase, published_at, deleted_at
             FROM catalog_items WHERE id IN (${allIds.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`,
            allIds
        );
        if (rows.length !== allIds.length) throw new NotFoundError('Producto');
        const [bundleRows] = await connection.execute(
            `SELECT b.bundle_catalog_item_id, b.component_catalog_item_id, b.quantity
             FROM commerce_bundle_items b WHERE b.bundle_catalog_item_id IN (${requestedIds.map(() => '?').join(',')})
             ORDER BY b.bundle_catalog_item_id, b.component_catalog_item_id FOR UPDATE`,
            requestedIds
        );
        if (JSON.stringify(bundleRows.map((r) => [Number(r.bundle_catalog_item_id), Number(r.component_catalog_item_id), Number(r.quantity)]))
            !== JSON.stringify(bundleProbe.map((r) => [Number(r.bundle_catalog_item_id), Number(r.component_catalog_item_id), Number(r.quantity)]))) {
            throw new ConflictError('El paquete cambio mientras se procesaba la compra. Reintenta');
        }
        return { rows, bundleRows };
    }

    async expireStaleReservations(connection, limit = 25) {
        const [orders] = await connection.execute(
            `SELECT id, status FROM commerce_orders
             WHERE status = 'PENDING_PAYMENT' AND reservation_expires_at IS NOT NULL
               AND reservation_expires_at < UTC_TIMESTAMP()
             ORDER BY reservation_expires_at LIMIT ? FOR UPDATE`,
            [limit]
        );
        for (const order of orders) {
            await this.inventoryService.releaseOrder(connection, order.id, null, 'Reserva vencida');
            await connection.execute("UPDATE commerce_orders SET status = 'CANCELLED' WHERE id = ?", [order.id]);
            await connection.execute(
                `INSERT INTO commerce_order_status_history (order_id, from_status, to_status, actor_type, note)
                 VALUES (?, 'PENDING_PAYMENT', 'CANCELLED', 'SYSTEM', 'Reserva vencida')`,
                [order.id]
            );
        }
        return orders.length;
    }

    async runReservationMaintenance(limit = 100) {
        return this.runTransaction(
            this.pool,
            (connection) => this.expireStaleReservations(connection, limit),
            { isolationLevel: 'READ COMMITTED', maxRetries: 2 }
        );
    }

    async create(input, actor) {
        const result = await this.runTransaction(this.pool, async (connection) => {
            await this.acquireIdempotencyLock(connection, input.idempotencyKey);
            const [[existing]] = await connection.execute('SELECT id FROM commerce_orders WHERE idempotency_key = ? LIMIT 1 FOR UPDATE', [input.idempotencyKey]);
            if (existing) return { order: await this.getById(existing.id, connection), replayed: true };

            await this.expireStaleReservations(connection);
            await this.settingsService.assertEnabled(connection, input.paymentMethod);
            const { rows, bundleRows } = await this.lockCheckoutItems(connection, input.items);
            const byId = new Map(rows.map((row) => [Number(row.id), row]));
            const requested = input.items.map((entry) => ({ ...entry, item: byId.get(entry.catalog_item_id) }));
            const currencies = new Set();
            for (const entry of requested) {
                const item = entry.item;
                if (!item || item.deleted_at || item.status !== 'ACTIVE' || !item.published_at || !Number(item.allow_purchase)) {
                    throw new ConflictError('Producto ya no disponible', { catalog_item_id: entry.catalog_item_id });
                }
                currencies.add(item.currency);
            }
            if (currencies.size !== 1) throw new ConflictError('No se pueden mezclar monedas en un pedido');
            const currency = [...currencies][0];

            const priced = [];
            let subtotal = Money.zero(currency);
            for (const entry of requested) {
                subtotal = subtotal.add(Money.fromDecimal(entry.item.base_price, currency).multiply(entry.quantity));
            }
            let total = Money.zero(currency);
            for (const entry of requested) {
                const pricing = await this.promotionService.findBestForItem(connection, entry.item, {
                    quantity: entry.quantity,
                    subtotal: subtotal.toDecimal(),
                    couponCodes: input.couponCodes,
                    customerEmail: input.customer.email,
                    userId: actor.userId
                });
                const line = pricing.unitPrice.multiply(entry.quantity);
                total = total.add(line);
                priced.push({ ...entry, pricing, line });
            }
            const appliedCoupons = new Set(priced.flatMap((entry) =>
                (entry.pricing.promotions || []).map((promotion) => promotion.coupon_code).filter(Boolean)));
            const rejectedCoupon = input.couponCodes.find((code) => !appliedCoupons.has(code));
            if (rejectedCoupon) throw new ConflictError('El cupon no es valido o no cumple sus condiciones', { coupon_code: rejectedCoupon });
            const discount = subtotal.subtract(total);
            const folio = await this.generateFolio(connection);
            const reservationMinutes = await this.settingsService.reservationMinutes(connection);
            const [orderInsert] = await connection.execute(
                `INSERT INTO commerce_orders
                    (folio, idempotency_key, user_id, customer_name, customer_phone, customer_email,
                     subtotal, discount_total, total, currency, delivery_method, delivery_note, reservation_expires_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))`,
                [folio, input.idempotencyKey, actor.userId, input.customer.name, input.customer.phone, input.customer.email,
                    subtotal.toDecimal(), discount.toDecimal(), total.toDecimal(), currency, input.deliveryMethod, input.deliveryNote, reservationMinutes]
            );
            const orderId = orderInsert.insertId;
            for (const entry of priced) {
                await connection.execute(
                    `INSERT INTO commerce_order_items
                        (order_id, catalog_item_id, promotion_id, promotion_snapshot, title_snapshot, sku_snapshot, item_type_snapshot, cost_unit_snapshot,
                         list_unit_price, unit_price, discount_amount, quantity, line_total)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [orderId, entry.item.id, entry.pricing.promotion?.id || null,
                        entry.pricing.promotions?.length ? JSON.stringify(entry.pricing.promotions.map((promotion) => ({
                            id: Number(promotion.id), name: promotion.name, coupon_code: promotion.coupon_code || null,
                            type: promotion.promotion_type, value: String(promotion.promotion_value), priority: Number(promotion.priority || 0)
                        }))) : null,
                        entry.item.name, entry.item.sku, entry.item.item_type,
                        entry.item.cost_reference, entry.pricing.listPrice.toDecimal(), entry.pricing.unitPrice.toDecimal(), entry.pricing.discount.toDecimal(),
                        entry.quantity, entry.line.toDecimal()]
                );
            }
            await this.promotionService.recordUsage(connection, {
                orderId, priced, userId: actor.userId, customerEmail: input.customer.email, currency
            });
            await connection.execute(
                `INSERT INTO commerce_payments (order_id, amount, currency, method) VALUES (?, ?, ?, ?)`,
                [orderId, total.toDecimal(), currency, input.paymentMethod]
            );

            const demand = buildInventoryDemand(requested, bundleRows, byId);
            await this.inventoryService.reserve(connection, orderId, demand, actor.userId);
            await connection.execute(
                `INSERT INTO commerce_order_status_history (order_id, from_status, to_status, actor_type, actor_user_id, note)
                 VALUES (?, NULL, 'PENDING_PAYMENT', ?, ?, 'Pedido recibido')`,
                [orderId, actor.userId ? 'USER' : 'CUSTOMER', actor.userId]
            );
            await this.notifications.create(connection, {
                adminBroadcast: true,
                type: 'ORDER_CREATED',
                title: `Nuevo pedido ${folio}`,
                payload: { order_id: orderId, folio, total: total.toDecimal(), currency }
            });
            return { order: await this.getById(orderId, connection), replayed: false };
        }, { isolationLevel: 'READ COMMITTED', maxRetries: 2 });

        if (!result.replayed) this.notifyCreated(result.order);
        return result;
    }

    notifyCreated(order) {
        const jobs = [
            this.emails.notifyOwnerOrderCreated(order),
            this.emails.notifyCustomerOrderCreated(order)
        ];
        Promise.allSettled(jobs).then((results) => {
            results.forEach((entry) => { if (entry.status === 'rejected') console.error('[commerce-email] order-created:', entry.reason); });
        });
    }

    async getById(id, executor = this.pool) {
        const [[row]] = await executor.execute(
            `SELECT o.*, r.ticket_code FROM commerce_orders o LEFT JOIN repairs r ON r.id = o.ticket_id WHERE o.id = ? LIMIT 1`,
            [id]
        );
        if (!row) throw new NotFoundError('Pedido');
        const [items] = await executor.execute(
            `SELECT oi.*, ci.slug FROM commerce_order_items oi LEFT JOIN catalog_items ci ON ci.id = oi.catalog_item_id
             WHERE oi.order_id = ? ORDER BY oi.id`, [id]
        );
        const [payments] = await executor.execute('SELECT * FROM commerce_payments WHERE order_id = ? ORDER BY id DESC', [id]);
        const [history] = await executor.execute('SELECT * FROM commerce_order_status_history WHERE order_id = ? ORDER BY created_at, id', [id]);
        const settings = payments[0]?.method === 'BANK_TRANSFER'
            ? await this.settingsService.getPaymentMethods(executor, { enabledOnly: true }) : null;
        return publicOrder(row, items, payments, history, settings);
    }

    async lookup(folio, { email = null, userId = null } = {}) {
        await this.runTransaction(this.pool, (connection) => this.expireStaleReservations(connection, 10));
        const params = [folio];
        const ownership = [];
        if (userId) { ownership.push('o.user_id = ?'); params.push(userId); }
        if (email) { ownership.push('LOWER(o.customer_email) = ?'); params.push(email.toLowerCase()); }
        if (!ownership.length) throw new NotFoundError('Pedido');
        const [[row]] = await this.pool.execute(
            `SELECT o.id FROM commerce_orders o WHERE o.folio = ? AND (${ownership.join(' OR ')}) LIMIT 1`, params
        );
        if (!row) throw new NotFoundError('Pedido');
        return this.getById(row.id);
    }

    async uploadProof(folio, access, upload, actor) {
        const inspected = inspectPaymentProof(upload.buffer, {
            declaredMimeType: upload.contentType,
            originalName: upload.fileName,
            maxBytes: this.proofMaxBytes
        });
        const storageKey = await this.proofStorage.save(upload.buffer, inspected.extension);
        let previousKey = null;
        try {
            const order = await this.runTransaction(this.pool, async (connection) => {
                const params = [folio];
                const ownership = [];
                if (access.userId) { ownership.push('o.user_id = ?'); params.push(access.userId); }
                if (access.email) { ownership.push('LOWER(o.customer_email) = ?'); params.push(access.email.toLowerCase()); }
                if (!ownership.length) throw new NotFoundError('Pedido');
                const [[lockedOrder]] = await connection.execute(
                    `SELECT o.* FROM commerce_orders o WHERE o.folio = ? AND (${ownership.join(' OR ')}) LIMIT 1 FOR UPDATE`, params
                );
                if (!lockedOrder) throw new NotFoundError('Pedido');
                if (!['PENDING_PAYMENT','PAYMENT_REVIEW'].includes(lockedOrder.status)) {
                    throw new InvalidStateError('El pedido ya no acepta comprobantes');
                }
                const [[payment]] = await connection.execute(
                    'SELECT * FROM commerce_payments WHERE order_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE', [lockedOrder.id]
                );
                if (!payment || payment.method !== 'BANK_TRANSFER' || payment.status === 'APPROVED') {
                    throw new InvalidStateError('Este pago no acepta comprobante');
                }
                previousKey = payment.proof_storage_key;
                await connection.execute(
                    `UPDATE commerce_payments SET status = 'UNDER_REVIEW', proof_storage_key = ?, proof_original_name = ?,
                        proof_mime = ?, proof_size_bytes = ?, proof_checksum_sha256 = ?, uploaded_at = UTC_TIMESTAMP(),
                        reviewed_by = NULL, reviewed_at = NULL, rejection_reason = NULL WHERE id = ?`,
                    [storageKey, inspected.originalName, inspected.mimeType, inspected.sizeBytes, inspected.sha256, payment.id]
                );
                if (lockedOrder.status === 'PENDING_PAYMENT') {
                    assertTransition('PENDING_PAYMENT', 'PAYMENT_REVIEW');
                    await connection.execute("UPDATE commerce_orders SET status = 'PAYMENT_REVIEW', reservation_expires_at = NULL WHERE id = ?", [lockedOrder.id]);
                    await connection.execute(
                        `INSERT INTO commerce_order_status_history (order_id, from_status, to_status, actor_type, actor_user_id, note)
                         VALUES (?, 'PENDING_PAYMENT', 'PAYMENT_REVIEW', ?, ?, 'Comprobante recibido')`,
                        [lockedOrder.id, actor.userId ? 'USER' : 'CUSTOMER', actor.userId]
                    );
                }
                await this.notifications.create(connection, {
                    adminBroadcast: true,
                    type: 'PAYMENT_REVIEW',
                    title: `Comprobante recibido: ${lockedOrder.folio}`,
                    payload: { order_id: lockedOrder.id, payment_id: payment.id, folio: lockedOrder.folio }
                });
                await this.audit.write(connection, {
                    actor,
                    action: 'upload_proof', entity: 'commerce_payment', entityId: payment.id,
                    before: { status: payment.status, checksum: payment.proof_checksum_sha256 },
                    after: { status: 'UNDER_REVIEW', checksum: inspected.sha256, mime: inspected.mimeType, size: inspected.sizeBytes }
                });
                return this.getById(lockedOrder.id, connection);
            });
            if (previousKey && previousKey !== storageKey) this.proofStorage.remove(previousKey).catch(() => {});
            Promise.allSettled([this.emails.notifyCustomerPaymentReview(order)]).catch(() => {});
            return order;
        } catch (error) {
            await this.proofStorage.remove(storageKey).catch(() => {});
            throw error;
        }
    }

    async listMine(userId, query = {}) {
        const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
        const pageSize = Math.min(50, Math.max(1, Number.parseInt(query.pageSize, 10) || 10));
        const [[count]] = await this.pool.execute('SELECT COUNT(*) total FROM commerce_orders WHERE user_id = ?', [userId]);
        const [rows] = await this.pool.execute(
            `SELECT o.folio, o.status, o.total, o.currency, o.created_at,
                    (SELECT COUNT(*) FROM commerce_order_items oi WHERE oi.order_id = o.id) item_count,
                    (SELECT method FROM commerce_payments p WHERE p.order_id = o.id ORDER BY p.id DESC LIMIT 1) payment_method,
                    (SELECT status FROM commerce_payments p WHERE p.order_id = o.id ORDER BY p.id DESC LIMIT 1) payment_status
             FROM commerce_orders o WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
            [userId, pageSize, (page - 1) * pageSize]
        );
        return { rows: rows.map((row) => ({ ...row, total: decimal(row.total), item_count: Number(row.item_count) })), total: Number(count.total || 0), page, pageSize };
    }
}

module.exports = { OrderService, publicOrder, parseJson, buildInventoryDemand };
