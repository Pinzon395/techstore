'use strict';

const { Money, normalizeMoney } = require('../money');
const { ValidationError, NotFoundError } = require('../errors');
const { plainText, enumValue, positiveId, validateIdList, integerValue, booleanValue } = require('../validation');
const { PROMOTION_TYPES, PROMOTION_SCOPES, PROMOTION_STATUSES } = require('./order-validation');

const EFFECTIVE_STATUS_SQL = `CASE
    WHEN p.status = 'DRAFT' THEN 'DRAFT'
    WHEN p.status = 'ENDED' OR (p.ends_at IS NOT NULL AND p.ends_at <= UTC_TIMESTAMP()) THEN 'ENDED'
    WHEN p.starts_at IS NOT NULL AND p.starts_at > UTC_TIMESTAMP() THEN 'SCHEDULED'
    ELSE 'ACTIVE' END`;

function parsePresentation(value) {
    if (value === null || value === undefined || value === '') return null;
    const input = typeof value === 'string' ? (() => { try { return JSON.parse(value); } catch { return null; } })() : value;
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ValidationError('presentation debe ser un objeto');
    return {
        title: plainText(input.title, { field: 'presentation.title', max: 180, nullable: true }),
        text: plainText(input.text, { field: 'presentation.text', max: 500, multiline: true, nullable: true }),
        banner: plainText(input.banner, { field: 'presentation.banner', max: 512, nullable: true })
    };
}

function dateTime(value, field, nullable = true) {
    if ((value === null || value === undefined || value === '') && nullable) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new ValidationError(`${field} no es una fecha valida`, { field });
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function validatePromotion(payload, { partial = false } = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ValidationError('El cuerpo debe ser un objeto');
    const out = {};
    const copy = (key, parser) => { if (!partial || Object.hasOwn(payload, key)) out[key] = parser(payload[key]); };
    copy('name', (v) => plainText(v, { field: 'name', max: 160, required: true }));
    copy('coupon_code', (v) => {
        if (v === null || v === undefined || v === '') return null;
        const code = String(v).trim().toUpperCase();
        if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(code)) throw new ValidationError('coupon_code no es valido');
        return code;
    });
    copy('promotion_type', (v) => enumValue(v, PROMOTION_TYPES, { field: 'promotion_type' }));
    copy('promotion_value', (v) => normalizeMoney(v, { field: 'promotion_value' }));
    copy('scope', (v) => enumValue(v, PROMOTION_SCOPES, { field: 'scope' }));
    copy('badge_id', (v) => (v === null || v === '' || v === undefined ? null : positiveId(v, 'badge_id')));
    copy('status', (v) => enumValue(v, PROMOTION_STATUSES, { field: 'status', required: false, fallback: 'DRAFT' }));
    copy('starts_at', (v) => dateTime(v, 'starts_at'));
    copy('ends_at', (v) => dateTime(v, 'ends_at'));
    copy('presentation', parsePresentation);
    copy('minimum_quantity', (v) => integerValue(v, { field: 'minimum_quantity', min: 1, max: 100, fallback: 1 }));
    copy('minimum_subtotal', (v) => normalizeMoney(v ?? 0, { field: 'minimum_subtotal' }));
    copy('max_redemptions', (v) => (v === null || v === '' || v === undefined ? null : integerValue(v, { field: 'max_redemptions', min: 1, max: 100000000 })));
    copy('max_redemptions_per_customer', (v) => (v === null || v === '' || v === undefined ? null : integerValue(v, { field: 'max_redemptions_per_customer', min: 1, max: 1000000 })));
    copy('priority', (v) => integerValue(v, { field: 'priority', min: -32768, max: 32767, fallback: 0 }));
    copy('stackable', (v) => booleanValue(v, { field: 'stackable', fallback: false }));
    copy('stop_processing', (v) => booleanValue(v, { field: 'stop_processing', fallback: true }));
    if (payload.item_ids !== undefined) out.item_ids = validateIdList(payload.item_ids, 'item_ids');
    if (payload.category_ids !== undefined) out.category_ids = validateIdList(payload.category_ids, 'category_ids');
    if (payload.brands !== undefined) {
        if (!Array.isArray(payload.brands)) throw new ValidationError('brands debe ser una lista');
        out.brands = [...new Set(payload.brands.map((v, index) => plainText(v, { field: `brands[${index}]`, max: 100, required: true })) )];
    }
    if (out.starts_at && out.ends_at && out.ends_at <= out.starts_at) throw new ValidationError('ends_at debe ser posterior a starts_at');
    if (out.promotion_type === 'PERCENT' && Money.fromDecimal(out.promotion_value).compare('100.00') > 0) {
        throw new ValidationError('El porcentaje no puede superar 100');
    }
    return out;
}

function applyPromotionRules(listPrice, baselinePrice, promotions, currency) {
    const list = Money.fromDecimal(listPrice, currency);
    let current = Money.fromDecimal(baselinePrice, currency);
    const applied = [];
    const ordered = [...promotions].sort((left, right) =>
        Number(right.priority || 0) - Number(left.priority || 0) || Number(left.id) - Number(right.id));
    for (const promotion of ordered) {
        if (applied.length && (!promotion.stackable || applied.some((entry) => !entry.stackable))) continue;
        const candidate = priceAfterPromotion(current.toDecimal(), promotion, currency);
        if (candidate.compare(current) >= 0) continue;
        applied.push({
            ...promotion,
            discount: current.subtract(candidate),
            stackable: Boolean(Number(promotion.stackable))
        });
        current = candidate;
        if (!Number(promotion.stackable) || Number(promotion.stop_processing)) break;
    }
    return { listPrice: list, unitPrice: current, discount: list.subtract(current), promotions: applied };
}

function priceAfterPromotion(listPrice, promotion, currency) {
    const list = Money.fromDecimal(listPrice, currency);
    const value = Money.fromDecimal(promotion.promotion_value, currency);
    if (promotion.promotion_type === 'PERCENT') {
        const basisPoints = value.minor;
        const minor = (list.minor * (10000n - basisPoints)) / 10000n;
        return new Money(minor < 0n ? 0n : minor, currency);
    }
    if (promotion.promotion_type === 'FIXED') {
        return value.minor >= list.minor ? Money.zero(currency) : list.subtract(value);
    }
    return value.compare(list) > 0 ? list : value;
}

class PromotionService {
    constructor({ pool, runTransaction, audit }) {
        this.pool = pool;
        this.runTransaction = runTransaction;
        this.audit = audit;
    }

    async findBestForItem(connection, item, context = {}) {
        const couponCodes = context.couponCodes || [];
        const [rows] = await connection.execute(
            `SELECT p.*,
                    (SELECT COUNT(*) FROM commerce_promotion_usage use_record
                      WHERE use_record.promotion_id = p.id
                        AND (use_record.user_id = ? OR LOWER(use_record.customer_email) = ?)) AS customer_redemptions
             FROM commerce_promotions p
             WHERE p.status IN ('ACTIVE','SCHEDULED')
               AND (p.starts_at IS NULL OR p.starts_at <= UTC_TIMESTAMP())
               AND (p.ends_at IS NULL OR p.ends_at > UTC_TIMESTAMP())
               AND p.minimum_quantity <= ?
               AND p.minimum_subtotal <= ?
               AND (p.max_redemptions IS NULL OR p.redemptions_count < p.max_redemptions)
             ORDER BY p.id FOR UPDATE`,
            [context.userId || null, String(context.customerEmail || '').toLowerCase(), context.quantity || 1, context.subtotal || '0.00']
        );
        const eligible = [];
        for (const row of rows) {
            if (row.coupon_code && !couponCodes.includes(String(row.coupon_code).toUpperCase())) continue;
            if (row.max_redemptions_per_customer !== null
                && Number(row.customer_redemptions) >= Number(row.max_redemptions_per_customer)) continue;
            let matches = false;
            if (row.scope === 'ITEM') {
                const [[target]] = await connection.execute(
                    'SELECT 1 matched FROM commerce_promotion_items WHERE promotion_id = ? AND catalog_item_id = ? LIMIT 1',
                    [row.id, item.id]
                );
                matches = Boolean(target);
            } else if (row.scope === 'CATEGORY') {
                const [[target]] = await connection.execute(
                    `SELECT 1 matched FROM commerce_promotion_items target
                     JOIN catalog_item_categories item_category ON item_category.category_id = target.category_id
                     WHERE target.promotion_id = ? AND item_category.catalog_item_id = ? LIMIT 1`,
                    [row.id, item.id]
                );
                matches = Boolean(target);
            } else if (row.scope === 'BRAND' && item.brand) {
                const [[target]] = await connection.execute(
                    'SELECT 1 matched FROM commerce_promotion_brands WHERE promotion_id = ? AND LOWER(brand) = LOWER(?) LIMIT 1',
                    [row.id, item.brand]
                );
                matches = Boolean(target);
            }
            if (matches) eligible.push(row);
        }
        const list = Money.fromDecimal(item.base_price, item.currency);
        const baseline = item.sale_price === null ? list : Money.fromDecimal(item.sale_price, item.currency);
        const result = applyPromotionRules(item.base_price, baseline.toDecimal(), eligible, item.currency);
        return { ...result, promotion: result.promotions[0] || null };
    }

    async recordUsage(connection, { orderId, priced, userId, customerEmail, currency }) {
        const totals = new Map();
        for (const entry of priced) {
            for (const promotion of entry.pricing.promotions || []) {
                const amount = promotion.discount.multiply(entry.quantity);
                const current = totals.get(Number(promotion.id)) || Money.zero(currency);
                totals.set(Number(promotion.id), current.add(amount));
            }
        }
        for (const [promotionId, amount] of totals) {
            const [[promotion]] = await connection.execute(
                'SELECT id, coupon_code, max_redemptions, redemptions_count FROM commerce_promotions WHERE id = ? FOR UPDATE',
                [promotionId]
            );
            if (!promotion || (promotion.max_redemptions !== null
                && Number(promotion.redemptions_count) >= Number(promotion.max_redemptions))) {
                throw new ValidationError('La promocion alcanzo su limite de usos');
            }
            await connection.execute(
                `INSERT INTO commerce_promotion_usage
                    (promotion_id, order_id, user_id, customer_email, coupon_code_snapshot, discount_amount, currency)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [promotionId, orderId, userId || null, customerEmail, promotion.coupon_code, amount.toDecimal(), currency]
            );
            await connection.execute(
                'UPDATE commerce_promotions SET redemptions_count = redemptions_count + 1 WHERE id = ?',
                [promotionId]
            );
        }
    }

    async listPublic() {
        const [rows] = await this.pool.execute(
            `SELECT p.id, p.name, p.promotion_type, p.promotion_value, p.scope,
                    p.starts_at, p.ends_at, p.presentation, b.label AS badge
             FROM commerce_promotions p
             LEFT JOIN catalog_badges b ON b.id = p.badge_id
             WHERE p.status IN ('ACTIVE','SCHEDULED')
               AND (p.starts_at IS NULL OR p.starts_at <= UTC_TIMESTAMP())
               AND (p.ends_at IS NULL OR p.ends_at > UTC_TIMESTAMP())
             ORDER BY p.ends_at IS NULL, p.ends_at, p.id DESC`
        );
        return rows.map((row) => ({ ...row, promotion_value: String(row.promotion_value), presentation: typeof row.presentation === 'string' ? JSON.parse(row.presentation) : row.presentation }));
    }

    async listAdmin({ page = 1, pageSize = 25, status = null } = {}) {
        const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
        const safeSize = Math.min(100, Math.max(1, Number.parseInt(pageSize, 10) || 25));
        const params = [];
        const where = status ? `WHERE ${EFFECTIVE_STATUS_SQL} = ?` : '';
        if (status) params.push(enumValue(status, PROMOTION_STATUSES, { field: 'status' }));
        const [[count]] = await this.pool.execute(`SELECT COUNT(*) total FROM commerce_promotions p ${where}`, params);
        const [rows] = await this.pool.execute(
            `SELECT p.*, ${EFFECTIVE_STATUS_SQL} AS status, b.label AS badge_label,
                    (SELECT COUNT(*) FROM commerce_promotion_items t WHERE t.promotion_id = p.id) AS target_count
             FROM commerce_promotions p LEFT JOIN catalog_badges b ON b.id = p.badge_id
             ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [...params, safeSize, (safePage - 1) * safeSize]
        );
        return { rows, total: Number(count.total || 0), page: safePage, pageSize: safeSize };
    }

    async getAdmin(id, executor = this.pool) {
        const promotionId = positiveId(id, 'id');
        const [[promotion]] = await executor.execute('SELECT * FROM commerce_promotions WHERE id = ? LIMIT 1', [promotionId]);
        if (!promotion) throw new NotFoundError('Promocion');
        const [targets] = await executor.execute('SELECT catalog_item_id, category_id FROM commerce_promotion_items WHERE promotion_id = ?', [promotionId]);
        const [brands] = await executor.execute('SELECT brand FROM commerce_promotion_brands WHERE promotion_id = ? ORDER BY brand', [promotionId]);
        return { ...promotion, item_ids: targets.map((t) => t.catalog_item_id).filter(Boolean), category_ids: targets.map((t) => t.category_id).filter(Boolean), brands: brands.map((row) => row.brand) };
    }

    async save(id, payload, actor) {
        const partial = id !== null && id !== undefined;
        const input = validatePromotion(payload, { partial });
        return this.runTransaction(this.pool, async (connection) => {
            let promotionId;
            let before = null;
            if (partial) {
                promotionId = positiveId(id, 'id');
                before = await this.getAdmin(promotionId, connection);
                const allowed = ['name','coupon_code','promotion_type','promotion_value','scope','minimum_quantity','minimum_subtotal','max_redemptions','max_redemptions_per_customer','priority','stackable','stop_processing','badge_id','status','starts_at','ends_at','presentation'];
                const entries = allowed.filter((key) => input[key] !== undefined);
                if (entries.length) {
                    await connection.execute(`UPDATE commerce_promotions SET ${entries.map((k) => `${k} = ?`).join(', ')}, updated_by = ? WHERE id = ?`, [
                        ...entries.map((k) => k === 'presentation' ? JSON.stringify(input[k]) : input[k]), actor.userId, promotionId
                    ]);
                }
            } else {
                const [result] = await connection.execute(
                    `INSERT INTO commerce_promotions (name, coupon_code, promotion_type, promotion_value, scope,
                        minimum_quantity, minimum_subtotal, max_redemptions, max_redemptions_per_customer,
                        priority, stackable, stop_processing, badge_id, status, starts_at, ends_at, presentation, created_by, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [input.name, input.coupon_code, input.promotion_type, input.promotion_value, input.scope,
                        input.minimum_quantity, input.minimum_subtotal, input.max_redemptions, input.max_redemptions_per_customer,
                        input.priority, input.stackable, input.stop_processing, input.badge_id, input.status,
                        input.starts_at, input.ends_at, input.presentation ? JSON.stringify(input.presentation) : null, actor.userId, actor.userId]
                );
                promotionId = result.insertId;
            }
            if (input.brands !== undefined) {
                await connection.execute('DELETE FROM commerce_promotion_brands WHERE promotion_id = ?', [promotionId]);
                if ((input.scope || before?.scope) === 'BRAND' && input.brands.length) {
                    await connection.query('INSERT INTO commerce_promotion_brands (promotion_id, brand) VALUES ?', [input.brands.map((brand) => [promotionId, brand])]);
                }
            }
            if (input.item_ids !== undefined || input.category_ids !== undefined) {
                await connection.execute('DELETE FROM commerce_promotion_items WHERE promotion_id = ?', [promotionId]);
                const itemIds = input.item_ids || [];
                const categoryIds = input.category_ids || [];
                if ((input.scope || before?.scope) === 'ITEM' && itemIds.length) {
                    await connection.query('INSERT INTO commerce_promotion_items (promotion_id, catalog_item_id) VALUES ?', [itemIds.map((target) => [promotionId, target])]);
                }
                if ((input.scope || before?.scope) === 'CATEGORY' && categoryIds.length) {
                    await connection.query('INSERT INTO commerce_promotion_items (promotion_id, category_id) VALUES ?', [categoryIds.map((target) => [promotionId, target])]);
                }
            }
            const after = await this.getAdmin(promotionId, connection);
            await this.audit.write(connection, { actor, action: partial ? 'update' : 'create', entity: 'commerce_promotion', entityId: promotionId, before, after });
            return after;
        });
    }

    async remove(id, actor) {
        const promotionId = positiveId(id, 'id');
        return this.runTransaction(this.pool, async (connection) => {
            const before = await this.getAdmin(promotionId, connection);
            await connection.execute("UPDATE commerce_promotions SET status = 'ENDED', ends_at = COALESCE(ends_at, UTC_TIMESTAMP()), updated_by = ? WHERE id = ?", [actor.userId, promotionId]);
            const after = await this.getAdmin(promotionId, connection);
            await this.audit.write(connection, { actor, action: 'end', entity: 'commerce_promotion', entityId: promotionId, before, after });
            return after;
        });
    }
}

module.exports = { PromotionService, validatePromotion, priceAfterPromotion, applyPromotionRules };
