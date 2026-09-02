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
    if (out.promotion_value !== undefined && Money.fromDecimal(out.promotion_value).compare('0.00') <= 0) {
        throw new ValidationError('El valor de la promocion debe ser mayor a cero');
    }
    if (out.max_redemptions !== undefined && out.max_redemptions !== null
        && out.max_redemptions_per_customer !== undefined && out.max_redemptions_per_customer !== null
        && out.max_redemptions_per_customer > out.max_redemptions) {
        throw new ValidationError('El limite por cliente no puede superar el limite total');
    }
    if (!partial) assertTargetSelection(out);
    return out;
}

function assertTargetSelection(input) {
    if (input.scope === 'ITEM' && !input.item_ids?.length) {
        throw new ValidationError('Selecciona al menos un producto para la promocion');
    }
    if (input.scope === 'CATEGORY' && !input.category_ids?.length) {
        throw new ValidationError('Selecciona al menos una categoria para la promocion');
    }
    if (input.scope === 'BRAND' && !input.brands?.length) {
        throw new ValidationError('Selecciona al menos una marca para la promocion');
    }
}

function targetCondition(input, alias = 'ci') {
    if (input.scope === 'ITEM') {
        return { sql: `${alias}.id IN (${input.item_ids.map(() => '?').join(',')})`, params: input.item_ids };
    }
    if (input.scope === 'CATEGORY') {
        return {
            sql: `EXISTS (SELECT 1 FROM catalog_item_categories selected_category
                         WHERE selected_category.catalog_item_id = ${alias}.id
                           AND selected_category.category_id IN (${input.category_ids.map(() => '?').join(',')}))`,
            params: input.category_ids
        };
    }
    return {
        sql: `${alias}.brand IN (${input.brands.map(() => '?').join(',')})`,
        params: input.brands
    };
}

function promotionPriceExpression(input, alias = 'ci') {
    const baseline = `COALESCE(${alias}.sale_price, ${alias}.base_price)`;
    if (input.promotion_type === 'PERCENT') {
        return { sql: `ROUND(${baseline} * (100 - ?) / 100, 2)`, params: [input.promotion_value] };
    }
    if (input.promotion_type === 'FIXED') {
        return { sql: `GREATEST(0, ${baseline} - ?)`, params: [input.promotion_value] };
    }
    return { sql: `LEAST(${baseline}, ?)`, params: [input.promotion_value] };
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

    async listAdmin({ page = 1, pageSize = 25, status = null, q = null, type = null, scope = null } = {}) {
        const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
        const safeSize = Math.min(100, Math.max(1, Number.parseInt(pageSize, 10) || 25));
        const params = [];
        const conditions = [];
        if (status) { conditions.push(`${EFFECTIVE_STATUS_SQL} = ?`); params.push(enumValue(status, PROMOTION_STATUSES, { field: 'status' })); }
        if (type) { conditions.push('p.promotion_type = ?'); params.push(enumValue(type, PROMOTION_TYPES, { field: 'type' })); }
        if (scope) { conditions.push('p.scope = ?'); params.push(enumValue(scope, PROMOTION_SCOPES, { field: 'scope' })); }
        if (q) {
            const search = `%${String(q).trim().replace(/[!%_]/g, (character) => `!${character}`).slice(0, 120)}%`;
            conditions.push("(p.name LIKE ? ESCAPE '!' OR p.coupon_code LIKE ? ESCAPE '!')");
            params.push(search, search);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const [[count]] = await this.pool.execute(`SELECT COUNT(*) total FROM commerce_promotions p ${where}`, params);
        const [[summary]] = await this.pool.execute(
            `SELECT COUNT(*) total,
                    SUM(${EFFECTIVE_STATUS_SQL} = 'ACTIVE') active,
                    SUM(${EFFECTIVE_STATUS_SQL} = 'SCHEDULED') scheduled,
                    SUM(${EFFECTIVE_STATUS_SQL} = 'DRAFT') draft,
                    SUM(${EFFECTIVE_STATUS_SQL} = 'ENDED') ended,
                    COALESCE(SUM(p.redemptions_count), 0) redemptions,
                    (SELECT COALESCE(SUM(usage_record.discount_amount), 0) FROM commerce_promotion_usage usage_record) discount_granted
             FROM commerce_promotions p`
        );
        const [rows] = await this.pool.execute(
            `SELECT p.*, ${EFFECTIVE_STATUS_SQL} AS status, b.label AS badge_label,
                    CASE WHEN p.scope = 'BRAND'
                         THEN (SELECT COUNT(*) FROM commerce_promotion_brands target_brand WHERE target_brand.promotion_id = p.id)
                         ELSE (SELECT COUNT(*) FROM commerce_promotion_items target_item WHERE target_item.promotion_id = p.id)
                    END AS target_count,
                    CASE WHEN p.scope = 'ITEM' THEN
                        (SELECT COUNT(*) FROM commerce_promotion_items target_item WHERE target_item.promotion_id = p.id AND target_item.catalog_item_id IS NOT NULL)
                         WHEN p.scope = 'CATEGORY' THEN
                        (SELECT COUNT(DISTINCT item_category.catalog_item_id)
                           FROM commerce_promotion_items target_category
                           JOIN catalog_item_categories item_category ON item_category.category_id = target_category.category_id
                           JOIN catalog_items affected_item ON affected_item.id = item_category.catalog_item_id AND affected_item.deleted_at IS NULL
                          WHERE target_category.promotion_id = p.id)
                         ELSE
                        (SELECT COUNT(DISTINCT affected_item.id)
                           FROM commerce_promotion_brands target_brand
                           JOIN catalog_items affected_item ON affected_item.brand = target_brand.brand AND affected_item.deleted_at IS NULL
                          WHERE target_brand.promotion_id = p.id)
                    END AS affected_count,
                    (SELECT COALESCE(SUM(usage_record.discount_amount), 0)
                       FROM commerce_promotion_usage usage_record WHERE usage_record.promotion_id = p.id) AS discount_granted
             FROM commerce_promotions p LEFT JOIN catalog_badges b ON b.id = p.badge_id
             ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [...params, safeSize, (safePage - 1) * safeSize]
        );
        return {
            rows, total: Number(count.total || 0), page: safePage, pageSize: safeSize,
            summary: {
                total: Number(summary.total || 0), active: Number(summary.active || 0), scheduled: Number(summary.scheduled || 0),
                draft: Number(summary.draft || 0), ended: Number(summary.ended || 0), redemptions: Number(summary.redemptions || 0),
                discount_granted: String(summary.discount_granted || '0.00')
            }
        };
    }

    async getAdmin(id, executor = this.pool) {
        const promotionId = positiveId(id, 'id');
        const [[promotion]] = await executor.execute('SELECT * FROM commerce_promotions WHERE id = ? LIMIT 1', [promotionId]);
        if (!promotion) throw new NotFoundError('Promocion');
        const [targets] = await executor.execute('SELECT catalog_item_id, category_id FROM commerce_promotion_items WHERE promotion_id = ?', [promotionId]);
        const [brands] = await executor.execute('SELECT brand FROM commerce_promotion_brands WHERE promotion_id = ? ORDER BY brand', [promotionId]);
        let presentation = promotion.presentation;
        if (typeof presentation === 'string') { try { presentation = JSON.parse(presentation); } catch { presentation = null; } }
        return { ...promotion, presentation, item_ids: targets.map((t) => t.catalog_item_id).filter(Boolean), category_ids: targets.map((t) => t.category_id).filter(Boolean), brands: brands.map((row) => row.brand) };
    }

    async listTargets({ scope = 'ITEM', q = null, page = 1, pageSize = 100, selected = [] } = {}) {
        const targetScope = enumValue(scope, PROMOTION_SCOPES, { field: 'scope' });
        const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
        const safeSize = Math.min(100, Math.max(1, Number.parseInt(pageSize, 10) || 100));
        const search = q ? plainText(q, { field: 'q', max: 100, nullable: true }) : null;
        const rawSelected = (Array.isArray(selected) ? selected : selected ? [selected] : []).slice(0, 100);
        const offset = (safePage - 1) * safeSize;

        if (targetScope === 'ITEM') {
            const selectedIds = validateIdList(rawSelected, 'selected');
            const query = search ? `%${search.replace(/[!%_]/g, (character) => `!${character}`)}%` : null;
            const searchClause = query ? "(ci.name LIKE ? ESCAPE '!' OR ci.sku LIKE ? ESCAPE '!' OR ci.brand LIKE ? ESCAPE '!')" : null;
            const selectedClause = selectedIds.length ? `ci.id IN (${selectedIds.map(() => '?').join(',')})` : null;
            const choiceClause = [searchClause, selectedClause].filter(Boolean).join(' OR ');
            const where = `ci.deleted_at IS NULL${choiceClause ? ` AND (${choiceClause})` : ''}`;
            const whereParams = [...(query ? [query, query, query] : []), ...selectedIds];
            const order = selectedIds.length ? `ci.id IN (${selectedIds.map(() => '?').join(',')}) DESC, ` : '';
            const [[count]] = await this.pool.execute(`SELECT COUNT(*) total FROM catalog_items ci WHERE ${where}`, whereParams);
            const [rows] = await this.pool.execute(
                `SELECT ci.id, ci.name, ci.sku, ci.brand, ci.status, ci.currency,
                        COALESCE(ci.sale_price, ci.base_price) effective_price
                   FROM catalog_items ci WHERE ${where}
                  ORDER BY ${order}ci.name, ci.id LIMIT ? OFFSET ?`,
                [...whereParams, ...selectedIds, safeSize, offset]
            );
            return { rows: rows.map((row) => ({ value: String(row.id), title: row.name, detail: [row.sku || 'Sin SKU', row.brand || 'Sin marca', `${row.currency} ${row.effective_price}`].join(' · ') })), total: Number(count.total || 0), page: safePage, pageSize: safeSize };
        }

        if (targetScope === 'CATEGORY') {
            const selectedIds = validateIdList(rawSelected, 'selected');
            const query = search ? `%${search.replace(/[!%_]/g, (character) => `!${character}`)}%` : null;
            const searchClause = query ? "c.name LIKE ? ESCAPE '!'" : null;
            const selectedClause = selectedIds.length ? `c.id IN (${selectedIds.map(() => '?').join(',')})` : null;
            const choiceClause = [searchClause, selectedClause].filter(Boolean).join(' OR ');
            const where = `c.deleted_at IS NULL AND c.status <> 'ARCHIVED'${choiceClause ? ` AND (${choiceClause})` : ''}`;
            const whereParams = [...(query ? [query] : []), ...selectedIds];
            const order = selectedIds.length ? `c.id IN (${selectedIds.map(() => '?').join(',')}) DESC, ` : '';
            const [[count]] = await this.pool.execute(`SELECT COUNT(*) total FROM catalog_categories c WHERE ${where}`, whereParams);
            const [rows] = await this.pool.execute(
                `SELECT c.id, c.name, COUNT(DISTINCT ci.id) item_count
                   FROM catalog_categories c
                   LEFT JOIN catalog_item_categories relation ON relation.category_id = c.id
                   LEFT JOIN catalog_items ci ON ci.id = relation.catalog_item_id AND ci.deleted_at IS NULL
                  WHERE ${where}
                  GROUP BY c.id, c.name
                  ORDER BY ${order}c.name, c.id LIMIT ? OFFSET ?`,
                [...whereParams, ...selectedIds, safeSize, offset]
            );
            return { rows: rows.map((row) => ({ value: String(row.id), title: row.name, detail: `${Number(row.item_count || 0)} productos` })), total: Number(count.total || 0), page: safePage, pageSize: safeSize };
        }

        const selectedBrands = [...new Set(rawSelected.map((value, index) => plainText(value, { field: `selected[${index}]`, max: 100, required: true })))];
        const query = search ? `%${search.replace(/[!%_]/g, (character) => `!${character}`)}%` : null;
        const searchClause = query ? "ci.brand LIKE ? ESCAPE '!'" : null;
        const selectedClause = selectedBrands.length ? `ci.brand IN (${selectedBrands.map(() => '?').join(',')})` : null;
        const choiceClause = [searchClause, selectedClause].filter(Boolean).join(' OR ');
        const where = `ci.deleted_at IS NULL AND ci.brand IS NOT NULL AND TRIM(ci.brand) <> ''${choiceClause ? ` AND (${choiceClause})` : ''}`;
        const whereParams = [...(query ? [query] : []), ...selectedBrands];
        const order = selectedBrands.length ? `ci.brand IN (${selectedBrands.map(() => '?').join(',')}) DESC, ` : '';
        const [[count]] = await this.pool.execute(`SELECT COUNT(DISTINCT ci.brand) total FROM catalog_items ci WHERE ${where}`, whereParams);
        const [rows] = await this.pool.execute(
            `SELECT ci.brand, COUNT(*) item_count FROM catalog_items ci WHERE ${where}
              GROUP BY ci.brand ORDER BY ${order}ci.brand LIMIT ? OFFSET ?`,
            [...whereParams, ...selectedBrands, safeSize, offset]
        );
        return { rows: rows.map((row) => ({ value: row.brand, title: row.brand, detail: `${Number(row.item_count || 0)} productos` })), total: Number(count.total || 0), page: safePage, pageSize: safeSize };
    }

    async assertTargetsExist(executor, input) {
        if (input.scope === 'ITEM') {
            const [[row]] = await executor.execute(
                `SELECT COUNT(*) total FROM catalog_items
                  WHERE deleted_at IS NULL AND id IN (${input.item_ids.map(() => '?').join(',')})`, input.item_ids
            );
            if (Number(row.total) !== input.item_ids.length) throw new ValidationError('Uno o mas productos seleccionados ya no existen');
        } else if (input.scope === 'CATEGORY') {
            const [[row]] = await executor.execute(
                `SELECT COUNT(*) total FROM catalog_categories
                  WHERE status <> 'ARCHIVED' AND id IN (${input.category_ids.map(() => '?').join(',')})`, input.category_ids
            );
            if (Number(row.total) !== input.category_ids.length) throw new ValidationError('Una o mas categorias seleccionadas ya no existen');
        } else {
            const [[row]] = await executor.execute(
                `SELECT COUNT(DISTINCT brand) total FROM catalog_items
                  WHERE deleted_at IS NULL AND brand IN (${input.brands.map(() => '?').join(',')})`, input.brands
            );
            if (Number(row.total) !== input.brands.length) throw new ValidationError('Una o mas marcas seleccionadas ya no tienen productos');
        }
    }

    async preview(payload, { excludeId = null } = {}) {
        const input = validatePromotion(payload);
        await this.assertTargetsExist(this.pool, input);
        const target = targetCondition(input);
        const price = promotionPriceExpression(input);
        const [sample] = await this.pool.execute(
            `SELECT priced.id, priced.name, priced.sku, priced.brand, priced.currency,
                    priced.baseline_price, priced.final_price, priced.cost_reference,
                    (priced.baseline_price - priced.final_price) discount_amount,
                    (priced.cost_reference IS NOT NULL AND priced.final_price < priced.cost_reference) below_cost
               FROM (
                    SELECT ci.id, ci.name, ci.sku, ci.brand, ci.currency, ci.cost_reference,
                           COALESCE(ci.sale_price, ci.base_price) baseline_price,
                           ${price.sql} final_price
                      FROM catalog_items ci
                     WHERE ci.deleted_at IS NULL AND ${target.sql}
               ) priced
              ORDER BY (priced.baseline_price - priced.final_price) DESC, priced.name
              LIMIT 12`,
            [...price.params, ...target.params]
        );
        const [[impact]] = await this.pool.execute(
            `SELECT COUNT(*) target_count,
                    SUM(priced.final_price < priced.baseline_price) discounted_count,
                    SUM(priced.cost_reference IS NOT NULL AND priced.final_price < priced.cost_reference) below_cost_count,
                    COALESCE(SUM(priced.baseline_price - priced.final_price), 0) sample_unit_savings
               FROM (
                    SELECT ci.cost_reference, COALESCE(ci.sale_price, ci.base_price) baseline_price,
                           ${price.sql} final_price
                      FROM catalog_items ci
                     WHERE ci.deleted_at IS NULL AND ${target.sql}
               ) priced`,
            [...price.params, ...target.params]
        );
        const overlapTarget = targetCondition(input, 'conflict_item');
        const conflictParams = [];
        const conflictWhere = [];
        if (excludeId) { conflictWhere.push('p.id <> ?'); conflictParams.push(positiveId(excludeId, 'exclude_id')); }
        conflictWhere.push("p.status IN ('ACTIVE','SCHEDULED')");
        conflictWhere.push('(p.ends_at IS NULL OR ? IS NULL OR p.ends_at > ?)');
        conflictParams.push(input.starts_at, input.starts_at);
        conflictWhere.push('(? IS NULL OR p.starts_at IS NULL OR p.starts_at < ?)');
        conflictParams.push(input.ends_at, input.ends_at);
        conflictParams.push(...overlapTarget.params);
        const [conflicts] = await this.pool.execute(
            `SELECT p.id, p.name, p.promotion_type, p.promotion_value, p.priority, p.stackable,
                    ${EFFECTIVE_STATUS_SQL} status
               FROM commerce_promotions p
              WHERE ${conflictWhere.join(' AND ')}
                AND EXISTS (
                    SELECT 1 FROM catalog_items conflict_item
                     WHERE conflict_item.deleted_at IS NULL
                       AND ${overlapTarget.sql}
                       AND (
                            (p.scope = 'ITEM' AND EXISTS (
                                SELECT 1 FROM commerce_promotion_items item_target
                                 WHERE item_target.promotion_id = p.id
                                   AND item_target.catalog_item_id = conflict_item.id
                            ))
                            OR (p.scope = 'CATEGORY' AND EXISTS (
                                SELECT 1 FROM commerce_promotion_items category_target
                                JOIN catalog_item_categories item_category
                                  ON item_category.category_id = category_target.category_id
                                 AND item_category.catalog_item_id = conflict_item.id
                                 WHERE category_target.promotion_id = p.id
                            ))
                            OR (p.scope = 'BRAND' AND EXISTS (
                                SELECT 1 FROM commerce_promotion_brands brand_target
                                 WHERE brand_target.promotion_id = p.id
                                   AND brand_target.brand = conflict_item.brand
                            ))
                       )
                )
              ORDER BY p.priority DESC, p.id DESC LIMIT 10`, conflictParams
        );
        return {
            target_count: Number(impact.target_count || 0), discounted_count: Number(impact.discounted_count || 0),
            below_cost_count: Number(impact.below_cost_count || 0), sample_unit_savings: String(impact.sample_unit_savings || '0.00'),
            conflicts: conflicts.map((row) => ({ ...row, promotion_value: String(row.promotion_value), stackable: Boolean(row.stackable) })),
            sample: sample.map((row) => ({ ...row, baseline_price: String(row.baseline_price), final_price: String(row.final_price),
                cost_reference: row.cost_reference === null ? null : String(row.cost_reference), discount_amount: String(row.discount_amount), below_cost: Boolean(row.below_cost) }))
        };
    }

    async save(id, payload, actor) {
        const partial = id !== null && id !== undefined;
        const input = validatePromotion(payload, { partial });
        return this.runTransaction(this.pool, async (connection) => {
            let promotionId = partial ? positiveId(id, 'id') : null;
            let before = null;
            if (partial) {
                before = await this.getAdmin(promotionId, connection);
            }
            const effective = {
                ...(before || {}), ...input,
                item_ids: input.item_ids !== undefined ? input.item_ids : (before?.item_ids || []),
                category_ids: input.category_ids !== undefined ? input.category_ids : (before?.category_ids || []),
                brands: input.brands !== undefined ? input.brands : (before?.brands || [])
            };
            assertTargetSelection(effective);
            if (effective.starts_at && effective.ends_at && effective.ends_at <= effective.starts_at) {
                throw new ValidationError('La fecha final debe ser posterior a la fecha de inicio');
            }
            if (['ACTIVE', 'SCHEDULED'].includes(effective.status) && effective.ends_at) {
                const [[clock]] = await connection.execute('SELECT ? <= UTC_TIMESTAMP() AS already_ended', [effective.ends_at]);
                if (Boolean(clock.already_ended)) throw new ValidationError('Una promocion publicada no puede finalizar en el pasado');
            }
            if (effective.max_redemptions !== null && effective.max_redemptions_per_customer !== null
                && Number(effective.max_redemptions_per_customer) > Number(effective.max_redemptions)) {
                throw new ValidationError('El limite por cliente no puede superar el limite total');
            }
            if (before && effective.max_redemptions !== null
                && Number(effective.max_redemptions) < Number(before.redemptions_count || 0)) {
                throw new ValidationError('El limite total no puede ser menor a los usos ya registrados');
            }
            await this.assertTargetsExist(connection, effective);
            if (effective.coupon_code) {
                const [[duplicate]] = await connection.execute(
                    'SELECT id FROM commerce_promotions WHERE coupon_code = ? AND (? IS NULL OR id <> ?) LIMIT 1',
                    [effective.coupon_code, promotionId, promotionId]
                );
                if (duplicate) throw new ValidationError('Ese codigo de cupon ya pertenece a otra promocion');
            }
            if (partial) {
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
            const targetsChanged = !partial || input.scope !== undefined || input.item_ids !== undefined
                || input.category_ids !== undefined || input.brands !== undefined;
            if (targetsChanged) {
                await connection.execute('DELETE FROM commerce_promotion_brands WHERE promotion_id = ?', [promotionId]);
                await connection.execute('DELETE FROM commerce_promotion_items WHERE promotion_id = ?', [promotionId]);
                if (effective.scope === 'BRAND') {
                    await connection.query('INSERT INTO commerce_promotion_brands (promotion_id, brand) VALUES ?', [effective.brands.map((brand) => [promotionId, brand])]);
                } else if (effective.scope === 'ITEM') {
                    await connection.query('INSERT INTO commerce_promotion_items (promotion_id, catalog_item_id) VALUES ?', [effective.item_ids.map((target) => [promotionId, target])]);
                } else {
                    await connection.query('INSERT INTO commerce_promotion_items (promotion_id, category_id) VALUES ?', [effective.category_ids.map((target) => [promotionId, target])]);
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
