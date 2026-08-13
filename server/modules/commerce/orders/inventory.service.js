'use strict';

const { ConflictError, NotFoundError, ValidationError, InvalidStateError } = require('../errors');
const { positiveId, integerValue, plainText, validateIdList, enumValue } = require('../validation');

function demandEntries(demand) {
    return [...demand.entries()].filter(([, quantity]) => quantity > 0).sort(([a], [b]) => a - b);
}

class InventoryService {
    constructor({ pool, runTransaction, audit, notifications }) {
        this.pool = pool;
        this.runTransaction = runTransaction;
        this.audit = audit;
        this.notifications = notifications;
    }

    async lockItems(connection, ids) {
        if (!ids.length) return [];
        const sorted = [...new Set(ids)].sort((a, b) => a - b);
        const [rows] = await connection.execute(
            `SELECT id, name, item_type, status, track_stock, stock_quantity, reserved_quantity, minimum_stock, deleted_at
             FROM catalog_items WHERE id IN (${sorted.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`,
            sorted
        );
        if (rows.length !== sorted.length) throw new NotFoundError('Producto');
        return rows;
    }

    async reserve(connection, orderId, demand, actorUserId = null) {
        const entries = demandEntries(demand);
        if (!entries.length) return [];
        const rows = await this.lockItems(connection, entries.map(([id]) => id));
        const byId = new Map(rows.map((row) => [Number(row.id), row]));
        for (const [id, quantity] of entries) {
            const item = byId.get(id);
            const available = Number(item.stock_quantity) - Number(item.reserved_quantity);
            if (item.deleted_at || !Number(item.track_stock) || available < quantity) {
                throw new ConflictError('Producto ya no disponible', {
                    catalog_item_id: id,
                    requested: quantity,
                    available: Math.max(0, available)
                });
            }
        }
        for (const [id, quantity] of entries) {
            await connection.execute(
                `UPDATE catalog_items
                 SET reserved_quantity = reserved_quantity + ?,
                     status = CASE
                       WHEN stock_quantity - reserved_quantity - ? = 0 AND item_type = 'EQUIPMENT' THEN 'RESERVED'
                       WHEN stock_quantity - reserved_quantity - ? = 0 THEN 'OUT_OF_STOCK'
                       ELSE status END,
                     version = version + 1
                 WHERE id = ?`,
                [quantity, quantity, quantity, id]
            );
            await connection.execute(
                `INSERT INTO commerce_order_inventory_reservations (order_id, catalog_item_id, quantity)
                 VALUES (?, ?, ?)`,
                [orderId, id, quantity]
            );
            await connection.execute(
                `INSERT INTO commerce_inventory_movements
                    (catalog_item_id, qty_delta, quantity_before, quantity_after, reason, reference_order_id, created_by, note)
                 VALUES (?, ?, ?, ?, 'RESERVE', ?, ?, 'Reserva al crear pedido')`,
                [id, quantity, Number(byId.get(id).stock_quantity) - Number(byId.get(id).reserved_quantity),
                    Number(byId.get(id).stock_quantity) - Number(byId.get(id).reserved_quantity) - quantity,
                    orderId, actorUserId]
            );
        }
        return entries;
    }

    async releaseOrder(connection, orderId, actorUserId = null, note = 'Reserva liberada') {
        const [reservations] = await connection.execute(
            `SELECT r.catalog_item_id, r.quantity
             FROM commerce_order_inventory_reservations r
             WHERE r.order_id = ? AND r.status = 'RESERVED'
             ORDER BY r.catalog_item_id FOR UPDATE`,
            [orderId]
        );
        if (!reservations.length) return false;
        const lockedItems = await this.lockItems(connection, reservations.map((row) => Number(row.catalog_item_id)));
        const lockedById = new Map(lockedItems.map((item) => [Number(item.id), item]));
        for (const row of reservations) {
            const quantity = Number(row.quantity);
            const [update] = await connection.execute(
                `UPDATE catalog_items
                 SET reserved_quantity = reserved_quantity - ?,
                     status = CASE WHEN status IN ('RESERVED','OUT_OF_STOCK') AND stock_quantity > reserved_quantity - ? THEN 'ACTIVE' ELSE status END,
                     version = version + 1
                 WHERE id = ? AND reserved_quantity >= ?`,
                [quantity, quantity, row.catalog_item_id, quantity]
            );
            if (!update.affectedRows) throw new InvalidStateError('La reserva de inventario es inconsistente');
            await connection.execute(
                `INSERT INTO commerce_inventory_movements
                    (catalog_item_id, qty_delta, quantity_before, quantity_after, reason, reference_order_id, created_by, note)
                 VALUES (?, ?, ?, ?, 'RELEASE', ?, ?, ?)`,
                [row.catalog_item_id, -quantity,
                    Number(lockedById.get(Number(row.catalog_item_id)).stock_quantity) - Number(lockedById.get(Number(row.catalog_item_id)).reserved_quantity),
                    Number(lockedById.get(Number(row.catalog_item_id)).stock_quantity) - Number(lockedById.get(Number(row.catalog_item_id)).reserved_quantity) + quantity,
                    orderId, actorUserId, String(note).slice(0, 500)]
            );
        }
        await connection.execute(
            "UPDATE commerce_order_inventory_reservations SET status = 'RELEASED' WHERE order_id = ? AND status = 'RESERVED'",
            [orderId]
        );
        return true;
    }

    async consumeOrder(connection, orderId, actorUserId = null) {
        const [reservations] = await connection.execute(
            `SELECT r.catalog_item_id, r.quantity
             FROM commerce_order_inventory_reservations r
             WHERE r.order_id = ? AND r.status = 'RESERVED'
             ORDER BY r.catalog_item_id FOR UPDATE`,
            [orderId]
        );
        if (!reservations.length) return false;
        const lockedItems = await this.lockItems(connection, reservations.map((row) => Number(row.catalog_item_id)));
        const lockedById = new Map(lockedItems.map((item) => [Number(item.id), item]));
        for (const row of reservations) {
            const quantity = Number(row.quantity);
            const [update] = await connection.execute(
                `UPDATE catalog_items
                 SET stock_quantity = stock_quantity - ?, reserved_quantity = reserved_quantity - ?,
                     status = CASE
                       WHEN stock_quantity - ? = 0 AND item_type = 'EQUIPMENT' THEN 'SOLD'
                       WHEN stock_quantity - ? = 0 THEN 'OUT_OF_STOCK'
                       WHEN status IN ('RESERVED','OUT_OF_STOCK') THEN 'ACTIVE'
                       ELSE status END,
                     version = version + 1
                 WHERE id = ? AND stock_quantity >= ? AND reserved_quantity >= ?`,
                [quantity, quantity, quantity, quantity, row.catalog_item_id, quantity, quantity]
            );
            if (!update.affectedRows) throw new InvalidStateError('La reserva ya no puede consumirse', { catalog_item_id: row.catalog_item_id });
            await connection.execute(
                `INSERT INTO commerce_inventory_movements
                    (catalog_item_id, qty_delta, quantity_before, quantity_after, reason, reference_order_id, created_by, note)
                 VALUES (?, ?, ?, ?, 'SALE', ?, ?, 'Venta confirmada')`,
                [row.catalog_item_id, -quantity, Number(lockedById.get(Number(row.catalog_item_id)).stock_quantity),
                    Number(lockedById.get(Number(row.catalog_item_id)).stock_quantity) - quantity, orderId, actorUserId]
            );
            const [[after]] = await connection.execute('SELECT name, stock_quantity, minimum_stock FROM catalog_items WHERE id = ?', [row.catalog_item_id]);
            if (Number(after.stock_quantity) <= Number(after.minimum_stock)) {
                await this.notifications.create(connection, {
                    adminBroadcast: true,
                    type: 'LOW_STOCK',
                    title: `Stock bajo: ${after.name}`,
                    payload: { catalog_item_id: Number(row.catalog_item_id), stock_quantity: Number(after.stock_quantity) }
                });
            }
        }
        await connection.execute(
            "UPDATE commerce_order_inventory_reservations SET status = 'CONSUMED' WHERE order_id = ? AND status = 'RESERVED'",
            [orderId]
        );
        return true;
    }

    async returnOrder(connection, orderId, actorUserId = null, note = 'Pedido cancelado despues del pago') {
        const [reservations] = await connection.execute(
            `SELECT catalog_item_id, quantity FROM commerce_order_inventory_reservations
             WHERE order_id = ? AND status = 'CONSUMED' ORDER BY catalog_item_id FOR UPDATE`,
            [orderId]
        );
        if (!reservations.length) return false;
        const lockedItems = await this.lockItems(connection, reservations.map((row) => Number(row.catalog_item_id)));
        const lockedById = new Map(lockedItems.map((item) => [Number(item.id), item]));
        for (const row of reservations) {
            const quantity = Number(row.quantity);
            await connection.execute(
                `UPDATE catalog_items SET stock_quantity = stock_quantity + ?,
                    status = CASE WHEN status IN ('SOLD','OUT_OF_STOCK') THEN 'ACTIVE' ELSE status END,
                    version = version + 1 WHERE id = ?`,
                [quantity, row.catalog_item_id]
            );
            await connection.execute(
                `INSERT INTO commerce_inventory_movements
                    (catalog_item_id, qty_delta, quantity_before, quantity_after, reason, reference_order_id, created_by, note)
                 VALUES (?, ?, ?, ?, 'RETURN', ?, ?, ?)`,
                [row.catalog_item_id, quantity, Number(lockedById.get(Number(row.catalog_item_id)).stock_quantity),
                    Number(lockedById.get(Number(row.catalog_item_id)).stock_quantity) + quantity,
                    orderId, actorUserId, String(note).slice(0, 500)]
            );
        }
        await connection.execute(
            "UPDATE commerce_order_inventory_reservations SET status = 'RETURNED' WHERE order_id = ? AND status = 'CONSUMED'",
            [orderId]
        );
        return true;
    }

    async listMovements(query = {}) {
        const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 30));
        const params = [];
        const where = [];
        if (query.reason) { where.push('m.reason = ?'); params.push(String(query.reason).toUpperCase()); }
        if (query.catalog_item_id) { where.push('m.catalog_item_id = ?'); params.push(positiveId(query.catalog_item_id, 'catalog_item_id')); }
        const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [[count]] = await this.pool.execute(`SELECT COUNT(*) total FROM commerce_inventory_movements m ${clause}`, params);
        const [rows] = await this.pool.execute(
            `SELECT m.id, m.catalog_item_id, i.name AS item_name, i.sku, m.qty_delta,
                    m.quantity_before, m.quantity_after, m.reason, m.reference_text,
                    m.reference_order_id, o.folio, m.created_by, u.name AS created_by_name, m.note, m.created_at
             FROM commerce_inventory_movements m
             JOIN catalog_items i ON i.id = m.catalog_item_id
             LEFT JOIN commerce_orders o ON o.id = m.reference_order_id
             LEFT JOIN users u ON u.id = m.created_by
             ${clause} ORDER BY m.created_at DESC, m.id DESC LIMIT ? OFFSET ?`,
            [...params, pageSize, (page - 1) * pageSize]
        );
        const [[summary]] = await this.pool.execute(
            `SELECT COALESCE(SUM(stock_quantity),0) stock, COALESCE(SUM(reserved_quantity),0) reserved,
                    SUM(track_stock = 1 AND stock_quantity <= minimum_stock) low_stock,
                    SUM(item_type = 'EQUIPMENT' AND status = 'ACTIVE') available,
                    COALESCE(SUM(COALESCE(cost_reference,0) * stock_quantity),0) inventory_value
             FROM catalog_items WHERE deleted_at IS NULL`
        );
        return { rows, total: Number(count.total || 0), page, pageSize, summary };
    }

    async listItems(query = {}) {
        const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize, 10) || 50));
        const params = [];
        const where = ['i.deleted_at IS NULL', 'i.track_stock = 1'];
        if (query.q) {
            const like = `%${String(query.q).slice(0, 120).replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_')}%`;
            where.push("(i.name LIKE ? ESCAPE '!' OR i.sku LIKE ? ESCAPE '!' OR i.internal_code LIKE ? ESCAPE '!')");
            params.push(like, like, like);
        }
        if (query.status === 'LOW_STOCK') where.push('(i.stock_quantity - i.reserved_quantity) <= i.minimum_stock');
        if (query.status === 'OUT_OF_STOCK') where.push('(i.stock_quantity - i.reserved_quantity) <= 0');
        if (query.status === 'INCONSISTENT') where.push('(i.reserved_quantity > i.stock_quantity)');
        const clause = `WHERE ${where.join(' AND ')}`;
        const [[count]] = await this.pool.execute(`SELECT COUNT(*) total FROM catalog_items i ${clause}`, params);
        const [rows] = await this.pool.execute(
            `SELECT i.id, i.sku, i.internal_code, i.name, i.product_kind_code, i.item_type,
                    i.stock_quantity, i.reserved_quantity,
                    (i.stock_quantity - i.reserved_quantity) available_quantity,
                    i.minimum_stock, i.cost_reference, i.currency, i.physical_location,
                    i.status, c.name AS category_name,
                    (COALESCE(i.cost_reference,0) * i.stock_quantity) inventory_value
             FROM catalog_items i
             LEFT JOIN catalog_item_categories ic ON ic.catalog_item_id = i.id AND ic.is_primary = 1
             LEFT JOIN catalog_categories c ON c.id = ic.category_id
             ${clause} ORDER BY i.name, i.id LIMIT ? OFFSET ?`,
            [...params, pageSize, (page - 1) * pageSize]
        );
        return { rows, total: Number(count.total || 0), page, pageSize };
    }

    async adjust(payload, actor) {
        const itemId = positiveId(payload?.catalog_item_id, 'catalog_item_id');
        const delta = integerValue(payload?.delta, { field: 'delta', min: -100000, max: 100000 });
        if (delta === 0) throw new ValidationError('delta no puede ser cero');
        const movementReason = enumValue(payload?.movement_reason || 'ADJUSTMENT',
            ['ENTRY', 'EXIT', 'ADJUSTMENT', 'RETURN', 'LOSS', 'DAMAGE'], { field: 'movement_reason' });
        if (['ENTRY', 'RETURN'].includes(movementReason) && delta < 0) throw new ValidationError('Este movimiento requiere una cantidad positiva');
        if (['EXIT', 'LOSS', 'DAMAGE'].includes(movementReason) && delta > 0) throw new ValidationError('Este movimiento requiere una cantidad negativa');
        const note = plainText(payload?.reason, { field: 'reason', max: 500, required: true, multiline: true });
        return this.runTransaction(this.pool, async (connection) => {
            const [rows] = await this.lockItems(connection, [itemId]);
            const before = rows[0];
            const next = Number(before.stock_quantity) + delta;
            if (next < Number(before.reserved_quantity)) throw new ConflictError('El ajuste dejaria stock por debajo de las reservas activas');
            await connection.execute(
                `UPDATE catalog_items SET stock_quantity = ?,
                    status = CASE
                      WHEN ? = 0 AND item_type = 'EQUIPMENT' THEN 'SOLD'
                      WHEN ? = 0 THEN 'OUT_OF_STOCK'
                      WHEN status IN ('SOLD','OUT_OF_STOCK','RESERVED') THEN 'ACTIVE'
                      ELSE status END,
                    version = version + 1, updated_by = ? WHERE id = ?`,
                [next, next, next, actor.userId, itemId]
            );
            await connection.execute(
                `INSERT INTO commerce_inventory_movements
                    (catalog_item_id, qty_delta, quantity_before, quantity_after, reason, created_by, note)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [itemId, delta, Number(before.stock_quantity), next, movementReason, actor.userId, note]
            );
            const [[after]] = await connection.execute('SELECT id, stock_quantity, reserved_quantity, status, version FROM catalog_items WHERE id = ?', [itemId]);
            await this.audit.write(connection, { actor, action: 'adjust', entity: 'commerce_inventory', entityId: itemId, before, after, metadata: { reason: movementReason, note, delta } });
            return after;
        });
    }

    async getBundle(id, executor = this.pool) {
        const bundleId = positiveId(id, 'id');
        const [rows] = await executor.execute(
            `SELECT b.component_catalog_item_id AS catalog_item_id, b.quantity, b.sort_order,
                    i.name, i.item_type, i.base_price, i.sale_price, i.currency, i.status
             FROM commerce_bundle_items b JOIN catalog_items i ON i.id = b.component_catalog_item_id
             WHERE b.bundle_catalog_item_id = ? ORDER BY b.sort_order, b.component_catalog_item_id`,
            [bundleId]
        );
        return rows;
    }

    async replaceBundle(id, payload, actor) {
        const bundleId = positiveId(id, 'id');
        if (!Array.isArray(payload?.items) || !payload.items.length) throw new ValidationError('El bundle requiere componentes');
        const entries = payload.items.map((entry, index) => ({
            id: positiveId(entry.catalog_item_id, `items[${index}].catalog_item_id`),
            quantity: integerValue(entry.quantity, { field: `items[${index}].quantity`, min: 1, max: 100 }),
            sort: index
        }));
        if (new Set(entries.map((e) => e.id)).size !== entries.length || entries.some((e) => e.id === bundleId)) {
            throw new ValidationError('Componentes duplicados o referencia circular directa');
        }
        return this.runTransaction(this.pool, async (connection) => {
            const [[bundle]] = await connection.execute("SELECT id, item_type FROM catalog_items WHERE id = ? AND deleted_at IS NULL FOR UPDATE", [bundleId]);
            if (!bundle || bundle.item_type !== 'BUNDLE') throw new ValidationError('El articulo no es un bundle');
            const before = await this.getBundle(bundleId, connection);
            await this.lockItems(connection, entries.map((e) => e.id));
            await connection.execute('DELETE FROM commerce_bundle_items WHERE bundle_catalog_item_id = ?', [bundleId]);
            await connection.query(
                'INSERT INTO commerce_bundle_items (bundle_catalog_item_id, component_catalog_item_id, quantity, sort_order) VALUES ?',
                [entries.map((entry) => [bundleId, entry.id, entry.quantity, entry.sort])]
            );
            const after = await this.getBundle(bundleId, connection);
            await this.audit.write(connection, { actor, action: 'update', entity: 'commerce_bundle', entityId: bundleId, before, after });
            return after;
        });
    }
}

module.exports = { InventoryService, demandEntries };
