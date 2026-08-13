'use strict';

const { PUBLIC_CATALOG_STATUSES } = require('../constants');
const { mapDatabaseError } = require('../errors');

const PUBLIC_ITEM_COLUMNS = `
    ci.id, ci.public_id, ci.sku, ci.slug, ci.name,
    ci.short_description, ci.description, ci.item_type, ci.product_kind_code, ci.condition_code,
    ci.status, ci.base_price, ci.sale_price, ci.currency,
    ci.track_stock, ci.stock_quantity, ci.reserved_quantity, ci.minimum_stock,
    ci.featured, ci.allow_purchase, ci.allow_quote, ci.brand, ci.model, ci.tax_rate,
    ci.warranty_text, ci.video_url, ci.seo_title, ci.seo_description, ci.seo_keywords, ci.seo_canonical_url,
    ci.sold_display_mode, ci.version,
    ci.published_at, ci.created_at, ci.updated_at`;

const ADMIN_ITEM_COLUMNS = `${PUBLIC_ITEM_COLUMNS},
    ci.cost_reference, ci.internal_code, ci.physical_location, ci.supplier_name,
    ci.created_by, ci.updated_by, ci.deleted_at`;

const ITEM_MUTABLE_COLUMNS = new Set([
    'sku', 'internal_code', 'slug', 'name', 'short_description', 'description', 'item_type', 'product_kind_code',
    'condition_code', 'base_price', 'sale_price', 'cost_reference', 'currency',
    'track_stock', 'stock_quantity', 'minimum_stock', 'featured',
    'allow_purchase', 'allow_quote', 'brand', 'model', 'tax_rate', 'warranty_text',
    'physical_location', 'supplier_name', 'video_url',
    'seo_title', 'seo_description', 'seo_keywords', 'seo_canonical_url', 'sold_display_mode', 'updated_by'
]);

const CATEGORY_MUTABLE_COLUMNS = new Set([
    'parent_id', 'name', 'slug', 'description', 'image_url', 'icon', 'sort_order', 'status'
]);
const BADGE_MUTABLE_COLUMNS = new Set([
    'badge_key', 'label', 'description', 'style_variant', 'icon', 'sort_order', 'status'
]);
const ATTRIBUTE_MUTABLE_COLUMNS = new Set([
    'attribute_key', 'label', 'description', 'data_type', 'unit', 'options_json',
    'filterable', 'searchable', 'required', 'sort_order', 'status'
]);

function bool(value) {
    return value === true || value === 1 || value === '1';
}

function parseJson(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function decimal(value) {
    return value === null || value === undefined ? null : String(value);
}

function mapItem(row, { publicView = false } = {}) {
    if (!row) return null;
    const item = {
        id: row.id,
        public_id: row.public_id,
        sku: row.sku,
        slug: row.slug,
        name: row.name,
        short_description: row.short_description,
        description: row.description,
        item_type: row.item_type,
        product_kind_code: row.product_kind_code,
        condition: row.condition_code,
        status: row.status,
        pricing: {
            base_price: decimal(row.base_price),
            sale_price: decimal(row.sale_price),
            effective_price: decimal(row.sale_price ?? row.base_price),
            currency: row.currency
        },
        inventory: {
            tracked: bool(row.track_stock),
            stock_quantity: Number(row.stock_quantity || 0),
            reserved_quantity: Number(row.reserved_quantity || 0),
            available_quantity: Math.max(0, Number(row.stock_quantity || 0) - Number(row.reserved_quantity || 0)),
            minimum_stock: Number(row.minimum_stock || 0)
        },
        featured: bool(row.featured),
        allow_purchase: bool(row.allow_purchase),
        allow_quote: bool(row.allow_quote),
        brand: row.brand,
        model: row.model,
        tax_rate: decimal(row.tax_rate),
        warranty_text: row.warranty_text,
        video_url: row.video_url,
        seo: {
            title: row.seo_title,
            description: row.seo_description,
            keywords: row.seo_keywords,
            canonical_url: row.seo_canonical_url
        },
        sold_display_mode: row.sold_display_mode,
        version: Number(row.version || 1),
        published_at: row.published_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        categories: [],
        badges: [],
        media: [],
        attributes: []
    };
    if (!publicView) {
        item.cost_reference = decimal(row.cost_reference);
        item.internal_code = row.internal_code;
        item.physical_location = row.physical_location;
        item.supplier_name = row.supplier_name;
        item.created_by = row.created_by;
        item.updated_by = row.updated_by;
        item.deleted_at = row.deleted_at;
    }
    return item;
}

function escapeLike(value) {
    return String(value).replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_');
}

function placeholders(values) {
    return values.map(() => '?').join(', ');
}

function updateStatement(table, idColumn, id, changes, allowedColumns) {
    const entries = Object.entries(changes).filter(([key, value]) => allowedColumns.has(key) && value !== undefined);
    if (entries.length === 0) return null;
    return {
        sql: `UPDATE ${table} SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE ${idColumn} = ?`,
        params: [...entries.map(([, value]) => value), id]
    };
}

class CatalogRepository {
    constructor(pool) {
        if (!pool || typeof pool.execute !== 'function') throw new TypeError('Se requiere pool');
        this.pool = pool;
    }

    async listPublic(filters) {
        return this.#listItems(this.pool, filters, { publicView: true });
    }

    async listAdmin(filters) {
        return this.#listItems(this.pool, filters, { publicView: false });
    }

    async #listItems(executor, filters, { publicView }) {
        const params = [];
        const where = ['ci.deleted_at IS NULL'];
        let cte = '';

        if (publicView) {
            where.push(`ci.status IN (${placeholders(PUBLIC_CATALOG_STATUSES)})`);
            params.push(...PUBLIC_CATALOG_STATUSES);
            where.push('ci.published_at IS NOT NULL', 'ci.published_at <= UTC_TIMESTAMP()');
            where.push("(ci.status <> 'SOLD' OR ci.sold_display_mode <> 'HIDE')");
            if (!filters.status && filters.availability !== 'SOLD') {
                where.push("ci.status <> 'SOLD'");
            }
        }
        if (filters.status) {
            where.push('ci.status = ?');
            params.push(filters.status);
        }
        if (filters.itemType) {
            where.push('ci.item_type = ?');
            params.push(filters.itemType);
        }
        if (filters.productKind) {
            where.push('ci.product_kind_code = ?');
            params.push(filters.productKind);
        }
        if (filters.conditionCode) {
            where.push('ci.condition_code = ?');
            params.push(filters.conditionCode);
        }
        if (filters.brand) {
            where.push("ci.brand LIKE ? ESCAPE '!'");
            params.push(`%${escapeLike(filters.brand)}%`);
        }
        if (filters.featured !== null && filters.featured !== undefined) {
            where.push('ci.featured = ?');
            params.push(filters.featured ? 1 : 0);
        }
        if (filters.q) {
            const query = `%${escapeLike(filters.q)}%`;
            where.push(`(
                ci.name LIKE ? ESCAPE '!'
                OR ci.sku LIKE ? ESCAPE '!'
                OR ci.short_description LIKE ? ESCAPE '!'
                OR ci.brand LIKE ? ESCAPE '!'
                OR EXISTS (
                    SELECT 1
                    FROM catalog_item_attribute_values search_value
                    JOIN catalog_attribute_definitions search_definition
                      ON search_definition.id = search_value.attribute_definition_id
                    WHERE search_value.catalog_item_id = ci.id
                      AND search_definition.searchable = 1
                      AND search_definition.status = 'ACTIVE'
                      AND search_value.value_text LIKE ? ESCAPE '!'
                )
            )`);
            params.push(query, query, query, query, query);
        }
        if (filters.minPrice !== null && filters.minPrice !== undefined) {
            where.push('COALESCE(ci.sale_price, ci.base_price) >= ?');
            params.push(filters.minPrice);
        }
        if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
            where.push('COALESCE(ci.sale_price, ci.base_price) <= ?');
            params.push(filters.maxPrice);
        }
        if (filters.availability === 'AVAILABLE') {
            where.push("ci.status = 'ACTIVE' AND (ci.track_stock = 0 OR ci.stock_quantity > ci.reserved_quantity)");
        } else if (filters.availability === 'UNAVAILABLE') {
            where.push("(ci.status <> 'ACTIVE' OR (ci.track_stock = 1 AND ci.stock_quantity <= ci.reserved_quantity))");
        } else if (filters.availability === 'LOW_STOCK') {
            where.push("ci.status = 'ACTIVE' AND ci.track_stock = 1 AND (ci.stock_quantity - ci.reserved_quantity) > 0 AND (ci.stock_quantity - ci.reserved_quantity) <= ci.minimum_stock");
        } else if (filters.availability === 'OUT_OF_STOCK') {
            where.push("(ci.status = 'OUT_OF_STOCK' OR (ci.track_stock = 1 AND ci.stock_quantity <= ci.reserved_quantity))");
        } else if (filters.availability === 'RESERVED') {
            where.push("ci.status = 'RESERVED'");
        } else if (filters.availability === 'SOLD') {
            where.push("ci.status = 'SOLD'");
        }
        if (filters.category) {
            cte = `WITH RECURSIVE category_tree AS (
                SELECT id FROM catalog_categories WHERE slug = ? AND status <> 'ARCHIVED'
                UNION ALL
                SELECT child.id
                FROM catalog_categories child
                JOIN category_tree parent ON child.parent_id = parent.id
                WHERE child.status <> 'ARCHIVED'
            ) `;
            params.unshift(filters.category);
            where.push(`EXISTS (
                SELECT 1 FROM catalog_item_categories cic_filter
                WHERE cic_filter.catalog_item_id = ci.id
                  AND cic_filter.category_id IN (SELECT id FROM category_tree)
            )`);
        }

        const whereSql = where.join(' AND ');
        const countSql = `${cte}SELECT COUNT(*) AS total FROM catalog_items ci WHERE ${whereSql}`;
        const [[countRow]] = await executor.execute(countSql, params);

        const publicSort = {
            featured: 'ci.featured DESC, ci.published_at DESC, ci.id DESC',
            newest: 'ci.published_at DESC, ci.id DESC',
            price_asc: 'COALESCE(ci.sale_price, ci.base_price) ASC, ci.id DESC',
            price_desc: 'COALESCE(ci.sale_price, ci.base_price) DESC, ci.id DESC',
            name: 'ci.name ASC, ci.id DESC'
        };
        const adminSort = {
            newest: 'ci.created_at DESC, ci.id DESC',
            oldest: 'ci.created_at ASC, ci.id ASC',
            name: 'ci.name ASC, ci.id DESC',
            price_asc: 'COALESCE(ci.sale_price, ci.base_price) ASC, ci.id DESC',
            price_desc: 'COALESCE(ci.sale_price, ci.base_price) DESC, ci.id DESC',
            stock_asc: '(ci.stock_quantity - ci.reserved_quantity) ASC, ci.id DESC',
            stock_desc: '(ci.stock_quantity - ci.reserved_quantity) DESC, ci.id DESC'
        };
        const sortSql = (publicView ? publicSort : adminSort)[filters.sort]
            || (publicView ? publicSort.featured : adminSort.newest);
        const columns = publicView ? PUBLIC_ITEM_COLUMNS : ADMIN_ITEM_COLUMNS;
        const dataSql = `${cte}SELECT ${columns}
            FROM catalog_items ci
            WHERE ${whereSql}
            ORDER BY ${sortSql}
            LIMIT ? OFFSET ?`;
        const [rows] = await executor.execute(dataSql, [...params, filters.pageSize, filters.offset]);
        const items = rows.map((row) => mapItem(row, { publicView }));
        await this.hydrateSummaries(executor, items, { publicView });
        return { items, total: Number(countRow.total || 0) };
    }

    async getPublicBySlug(slug, executor = this.pool) {
        const [rows] = await executor.execute(
            `SELECT ${PUBLIC_ITEM_COLUMNS}
             FROM catalog_items ci
             WHERE ci.slug = ?
               AND ci.deleted_at IS NULL
               AND ci.status IN (${placeholders(PUBLIC_CATALOG_STATUSES)})
               AND ci.published_at IS NOT NULL
               AND ci.published_at <= UTC_TIMESTAMP()
               AND (ci.status <> 'SOLD' OR ci.sold_display_mode <> 'HIDE')
             LIMIT 1`,
            [slug, ...PUBLIC_CATALOG_STATUSES]
        );
        const item = mapItem(rows[0], { publicView: true });
        if (item) await this.hydrateDetails(executor, [item], { publicView: true });
        return item;
    }

    async getPublicById(id, executor = this.pool) {
        const [rows] = await executor.execute(
            `SELECT ${PUBLIC_ITEM_COLUMNS}
             FROM catalog_items ci
             WHERE ci.id = ?
               AND ci.deleted_at IS NULL
               AND ci.status IN (${placeholders(PUBLIC_CATALOG_STATUSES)})
               AND ci.published_at IS NOT NULL
               AND ci.published_at <= UTC_TIMESTAMP()
               AND (ci.status <> 'SOLD' OR ci.sold_display_mode <> 'HIDE')
             LIMIT 1`,
            [id, ...PUBLIC_CATALOG_STATUSES]
        );
        const item = mapItem(rows[0], { publicView: true });
        if (item) await this.hydrateDetails(executor, [item], { publicView: true });
        return item;
    }

    async findPublicLegacyItem(legacyType, legacyId) {
        const link = await this.findLegacyLink(this.pool, legacyType, legacyId);
        if (!link) return null;
        return this.getPublicById(link.catalog_item_id);
    }

    async getAdminById(id, executor = this.pool, { forUpdate = false } = {}) {
        const [rows] = await executor.execute(
            `SELECT ${ADMIN_ITEM_COLUMNS}
             FROM catalog_items ci
             WHERE ci.id = ? AND ci.deleted_at IS NULL
             LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
            [id]
        );
        const item = mapItem(rows[0], { publicView: false });
        if (item) await this.hydrateDetails(executor, [item], { publicView: false });
        return item;
    }

    async hydrateSummaries(executor, items, { publicView }) {
        if (items.length === 0) return items;
        const ids = items.map((item) => item.id);
        const idSql = placeholders(ids);
        const byId = new Map(items.map((item) => [String(item.id), item]));

        const [categories] = await executor.execute(
            `SELECT cic.catalog_item_id, c.id, c.parent_id, c.name, c.slug, cic.is_primary
             FROM catalog_item_categories cic
             JOIN catalog_categories c ON c.id = cic.category_id
             WHERE cic.catalog_item_id IN (${idSql})
               AND c.deleted_at IS NULL
               ${publicView ? "AND c.status = 'ACTIVE'" : ''}
             ORDER BY cic.is_primary DESC, c.sort_order, c.id`,
            ids
        );
        for (const row of categories) {
            byId.get(String(row.catalog_item_id))?.categories.push({
                id: row.id,
                parent_id: row.parent_id,
                name: row.name,
                slug: row.slug,
                is_primary: bool(row.is_primary)
            });
        }

        const [primaryMedia] = await executor.execute(
            `SELECT ranked.* FROM (
                SELECT cm.id, cm.catalog_item_id, cm.media_type, cm.url, cm.alt_text,
                       cm.mime_type, cm.size_bytes, cm.sort_order, cm.is_primary,
                       ROW_NUMBER() OVER (
                           PARTITION BY cm.catalog_item_id
                           ORDER BY cm.is_primary DESC, cm.sort_order, cm.id
                       ) AS position
                FROM catalog_media cm
                WHERE cm.catalog_item_id IN (${idSql})
                  AND cm.deleted_at IS NULL
            ) ranked
            WHERE ranked.position = 1`,
            ids
        );
        for (const row of primaryMedia) {
            byId.get(String(row.catalog_item_id))?.media.push(this.mapMedia(row));
        }

        const [badges] = await executor.execute(
            `SELECT cib.catalog_item_id, b.id, b.badge_key, b.label, b.style_variant, b.icon,
                    COALESCE(cib.sort_order, b.sort_order) AS sort_order,
                    cib.label_override, cib.starts_at, cib.ends_at
             FROM catalog_item_badges cib
             JOIN catalog_badges b ON b.id = cib.badge_id
             WHERE cib.catalog_item_id IN (${idSql})
               ${publicView ? "AND b.status = 'ACTIVE'" : ''}
               ${publicView ? 'AND (cib.starts_at IS NULL OR cib.starts_at <= UTC_TIMESTAMP()) AND (cib.ends_at IS NULL OR cib.ends_at >= UTC_TIMESTAMP())' : ''}
             ORDER BY b.sort_order, b.id`,
            ids
        );
        for (const row of badges) {
            byId.get(String(row.catalog_item_id))?.badges.push({
                id: row.id,
                key: row.badge_key,
                label: row.label_override || row.label,
                style: row.style_variant,
                icon: row.icon,
                starts_at: row.starts_at,
                ends_at: row.ends_at
            });
        }
        return items;
    }

    async hydrateDetails(executor, items, { publicView }) {
        await this.hydrateSummaries(executor, items, { publicView });
        if (items.length === 0) return items;
        const ids = items.map((item) => item.id);
        const idSql = placeholders(ids);
        const byId = new Map(items.map((item) => [String(item.id), item]));

        const [media] = await executor.execute(
            `SELECT id, catalog_item_id, media_type, url, alt_text, mime_type,
                    size_bytes, sort_order, is_primary, metadata, created_at
             FROM catalog_media
             WHERE catalog_item_id IN (${idSql})
               AND deleted_at IS NULL
             ORDER BY is_primary DESC, sort_order, id`,
            ids
        );
        for (const item of items) item.media = [];
        for (const row of media) byId.get(String(row.catalog_item_id))?.media.push(this.mapMedia(row));

        const [attributes] = await executor.execute(
            `SELECT v.catalog_item_id, d.id AS definition_id, d.attribute_key, d.label,
                    d.data_type, d.unit, d.filterable, d.searchable,
                    v.value_text, v.value_number, v.value_boolean, v.value_date,
                    v.value_json, v.sort_order
             FROM catalog_item_attribute_values v
             JOIN catalog_attribute_definitions d ON d.id = v.attribute_definition_id
             WHERE v.catalog_item_id IN (${idSql})
               ${publicView ? "AND d.status = 'ACTIVE'" : ''}
             ORDER BY v.sort_order, d.sort_order, d.id`,
            ids
        );
        for (const row of attributes) {
            byId.get(String(row.catalog_item_id))?.attributes.push(this.mapAttribute(row));
        }
        return items;
    }

    mapMedia(row) {
        return {
            id: row.id,
            type: row.media_type,
            url: row.url,
            alt_text: row.alt_text,
            mime_type: row.mime_type,
            size_bytes: Number(row.size_bytes || 0),
            sort_order: Number(row.sort_order || 0),
            is_primary: bool(row.is_primary),
            metadata: parseJson(row.metadata),
            created_at: row.created_at
        };
    }

    mapAttribute(row) {
        let value;
        if (row.data_type === 'INTEGER' || row.data_type === 'DECIMAL') value = decimal(row.value_number);
        else if (row.data_type === 'BOOLEAN') value = bool(row.value_boolean);
        else if (row.data_type === 'DATE') value = row.value_date;
        else if (row.data_type === 'JSON') value = parseJson(row.value_json);
        else value = row.value_text;
        return {
            definition_id: row.definition_id,
            key: row.attribute_key,
            label: row.label,
            data_type: row.data_type,
            unit: row.unit,
            filterable: bool(row.filterable),
            searchable: bool(row.searchable),
            value,
            sort_order: Number(row.sort_order || 0)
        };
    }

    async createItem(connection, item) {
        try {
            const [result] = await connection.execute(
                `INSERT INTO catalog_items (
                    public_id, sku, internal_code, slug, name, short_description, description,
                    item_type, product_kind_code, condition_code, status, base_price, sale_price,
                    cost_reference, currency, tax_rate, track_stock, stock_quantity,
                    reserved_quantity, minimum_stock, physical_location, supplier_name,
                    featured, allow_purchase, allow_quote, brand, model, warranty_text, video_url,
                    seo_title, seo_description, seo_keywords, seo_canonical_url, sold_display_mode,
                    created_by, updated_by
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    item.public_id, item.sku, item.internal_code, item.slug, item.name,
                    item.short_description, item.description, item.item_type, item.product_kind_code,
                    item.condition_code, item.status, item.base_price, item.sale_price,
                    item.cost_reference, item.currency, item.tax_rate, item.track_stock ? 1 : 0,
                    item.stock_quantity, item.minimum_stock, item.physical_location, item.supplier_name,
                    item.featured ? 1 : 0, item.allow_purchase ? 1 : 0, item.allow_quote ? 1 : 0,
                    item.brand, item.model, item.warranty_text, item.video_url, item.seo_title,
                    item.seo_description, item.seo_keywords, item.seo_canonical_url, item.sold_display_mode,
                    item.created_by, item.updated_by
                ]
            );
            return result.insertId;
        } catch (error) {
            throw mapDatabaseError(error, 'El slug, SKU o codigo interno ya existe');
        }
    }

    async updateItem(connection, id, changes, expectedVersion) {
        const statement = updateStatement('catalog_items', 'id', id, changes, ITEM_MUTABLE_COLUMNS);
        if (!statement) return false;
        try {
            const sql = statement.sql.replace(' WHERE id = ?', ', version = version + 1 WHERE id = ?');
            const [result] = await connection.execute(
                expectedVersion === undefined ? sql : `${sql} AND version = ?`,
                expectedVersion === undefined ? statement.params : [...statement.params, expectedVersion]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw mapDatabaseError(error, 'El slug, SKU o codigo interno ya existe');
        }
    }

    async publishItem(connection, id) {
        const [result] = await connection.execute(
            `UPDATE catalog_items
             SET status = CASE
                    WHEN track_stock = 1 AND stock_quantity <= reserved_quantity THEN 'OUT_OF_STOCK'
                    ELSE 'ACTIVE'
                 END,
                 published_at = COALESCE(published_at, UTC_TIMESTAMP()),
                 version = version + 1,
                 updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND status IN ('DRAFT', 'HIDDEN', 'OUT_OF_STOCK', 'ACTIVE')`,
            [id]
        );
        return result.affectedRows > 0;
    }

    async touchItem(connection, id, updatedBy) {
        const [result] = await connection.execute(
            `UPDATE catalog_items
             SET updated_by = ?, version = version + 1, updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND deleted_at IS NULL`,
            [updatedBy || null, id]
        );
        return result.affectedRows > 0;
    }

    async findMissingRequiredAttributes(executor, itemId) {
        const [rows] = await executor.execute(
            `SELECT DISTINCT d.id, d.attribute_key, d.label
             FROM catalog_attribute_definitions d
             LEFT JOIN catalog_category_attribute_definitions category_definition
               ON category_definition.attribute_definition_id = d.id
             LEFT JOIN catalog_product_kind_attributes kind_definition
               ON kind_definition.attribute_definition_id = d.id
             LEFT JOIN catalog_item_categories item_category
               ON item_category.category_id = category_definition.category_id
              AND item_category.catalog_item_id = ?
             WHERE d.status = 'ACTIVE'
               AND (d.required = 1
                    OR (category_definition.is_required = 1 AND item_category.catalog_item_id IS NOT NULL)
                    OR (kind_definition.is_required = 1 AND kind_definition.product_kind_code = (
                        SELECT product_kind_code FROM catalog_items WHERE id = ?
                    )))
               AND NOT EXISTS (
                    SELECT 1 FROM catalog_item_attribute_values value
                    WHERE value.catalog_item_id = ? AND value.attribute_definition_id = d.id
               )
             ORDER BY d.sort_order, d.id`,
            [itemId, itemId, itemId]
        );
        return rows;
    }

    async archiveItem(connection, id, updatedBy) {
        const [result] = await connection.execute(
            `UPDATE catalog_items
             SET status = 'ARCHIVED', allow_purchase = 0, updated_by = ?,
                 version = version + 1, updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND status <> 'ARCHIVED'`,
            [updatedBy, id]
        );
        return result.affectedRows > 0;
    }

    async hideItem(connection, id, updatedBy) {
        const [result] = await connection.execute(
            `UPDATE catalog_items SET status = 'HIDDEN', allow_purchase = 0, updated_by = ?,
                    version = version + 1, updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND deleted_at IS NULL AND status IN ('ACTIVE','OUT_OF_STOCK')`,
            [updatedBy, id]
        );
        return result.affectedRows > 0;
    }

    async softDeleteItem(connection, id, updatedBy) {
        const [result] = await connection.execute(
            `UPDATE catalog_items
             SET deleted_at = UTC_TIMESTAMP(), status = 'ARCHIVED', allow_purchase = 0,
                 updated_by = ?, version = version + 1, updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND deleted_at IS NULL AND status IN ('DRAFT','ARCHIVED')`,
            [updatedBy, id]
        );
        return result.affectedRows > 0;
    }

    async duplicateItem(connection, sourceId, copy) {
        const [result] = await connection.execute(
            `INSERT INTO catalog_items (
                public_id, sku, internal_code, slug, name, short_description, description,
                item_type, product_kind_code, condition_code, status, base_price, sale_price,
                cost_reference, currency, tax_rate, track_stock, stock_quantity, reserved_quantity,
                minimum_stock, physical_location, supplier_name, featured, allow_purchase, allow_quote,
                brand, model, warranty_text, video_url, seo_title, seo_description, seo_keywords,
                seo_canonical_url, sold_display_mode, created_by, updated_by
             )
             SELECT ?, NULL, NULL, ?, ?, short_description, description,
                    item_type, product_kind_code, condition_code, 'DRAFT', base_price, sale_price,
                    cost_reference, currency, tax_rate, track_stock, 0, 0, minimum_stock,
                    physical_location, supplier_name, 0, allow_purchase, allow_quote,
                    brand, model, warranty_text, video_url, seo_title, seo_description, seo_keywords,
                    NULL, sold_display_mode, ?, ?
             FROM catalog_items WHERE id = ? AND deleted_at IS NULL`,
            [copy.publicId, copy.slug, copy.name, copy.userId, copy.userId, sourceId]
        );
        if (!result.affectedRows) return null;
        const newId = result.insertId;
        await connection.execute(
            `INSERT INTO catalog_item_categories (catalog_item_id, category_id, is_primary, sort_order)
             SELECT ?, category_id, is_primary, sort_order FROM catalog_item_categories WHERE catalog_item_id = ?`,
            [newId, sourceId]
        );
        await connection.execute(
            `INSERT INTO catalog_item_badges (catalog_item_id, badge_id, label_override, starts_at, ends_at, sort_order)
             SELECT ?, badge_id, label_override, starts_at, ends_at, sort_order
             FROM catalog_item_badges WHERE catalog_item_id = ?`,
            [newId, sourceId]
        );
        await connection.execute(
            `INSERT INTO catalog_item_attribute_values
                (catalog_item_id, attribute_definition_id, value_text, value_number, value_boolean, value_date, value_json, sort_order)
             SELECT ?, attribute_definition_id, value_text, value_number, value_boolean, value_date, value_json, sort_order
             FROM catalog_item_attribute_values WHERE catalog_item_id = ?`,
            [newId, sourceId]
        );
        return newId;
    }

    async replaceItemCategories(connection, itemId, categoryIds) {
        await connection.execute('DELETE FROM catalog_item_categories WHERE catalog_item_id = ?', [itemId]);
        if (categoryIds.length === 0) return;
        const values = categoryIds.map((categoryId, index) => [itemId, categoryId, index === 0 ? 1 : 0]);
        await connection.query(
            `INSERT INTO catalog_item_categories (catalog_item_id, category_id, is_primary, sort_order)
             VALUES ?`,
            [values.map(([itemIdValue, categoryId, primary], index) => [itemIdValue, categoryId, primary, index])]
        );
    }

    async replaceItemBadges(connection, itemId, badgeIds) {
        await connection.execute('DELETE FROM catalog_item_badges WHERE catalog_item_id = ?', [itemId]);
        if (badgeIds.length === 0) return;
        await connection.query(
            `INSERT INTO catalog_item_badges (catalog_item_id, badge_id) VALUES ?`,
            [badgeIds.map((badgeId) => [itemId, badgeId])]
        );
    }

    async replaceItemAttributes(connection, itemId, values) {
        await connection.execute('DELETE FROM catalog_item_attribute_values WHERE catalog_item_id = ?', [itemId]);
        if (values.length === 0) return;
        await connection.query(
            `INSERT INTO catalog_item_attribute_values (
                catalog_item_id, attribute_definition_id,
                value_text, value_number, value_boolean, value_date, value_json, sort_order
             ) VALUES ?`,
            [values.map((entry) => [
                itemId,
                entry.definition_id,
                entry.value_text ?? null,
                entry.value_number ?? null,
                entry.value_boolean ?? null,
                entry.value_date ?? null,
                entry.value_json ?? null,
                entry.sort_order
            ])]
        );
    }

    async getCategoriesByIds(executor, ids, { forUpdate = false } = {}) {
        if (ids.length === 0) return [];
        const [rows] = await executor.execute(
            `SELECT id, parent_id, name, slug, status
             FROM catalog_categories
             WHERE id IN (${placeholders(ids)})${forUpdate ? ' FOR UPDATE' : ''}`,
            ids
        );
        return rows;
    }

    async getBadgesByIds(executor, ids) {
        if (ids.length === 0) return [];
        const [rows] = await executor.execute(
            `SELECT id, badge_key, label, status FROM catalog_badges WHERE id IN (${placeholders(ids)})`,
            ids
        );
        return rows;
    }

    async getAttributeDefinitionsByIds(executor, ids) {
        if (ids.length === 0) return [];
        const [rows] = await executor.execute(
            `SELECT id, attribute_key, label, data_type, unit, required, status
             FROM catalog_attribute_definitions
             WHERE id IN (${placeholders(ids)})`,
            ids
        );
        return rows.map((row) => ({ ...row, required: bool(row.required) }));
    }

    async listCategories({ publicView = false } = {}) {
        const [rows] = await this.pool.execute(
            `SELECT c.id, c.parent_id, c.name, c.slug, c.description, c.image_url,
                    c.icon, c.sort_order, c.status, c.created_at, c.updated_at,
                    COUNT(DISTINCT CASE
                        WHEN ci.deleted_at IS NULL
                         AND ci.status IN (${placeholders(PUBLIC_CATALOG_STATUSES)})
                         AND ci.published_at IS NOT NULL
                        THEN ci.id END
                    ) AS public_item_count
             FROM catalog_categories c
             LEFT JOIN catalog_item_categories cic ON cic.category_id = c.id
             LEFT JOIN catalog_items ci ON ci.id = cic.catalog_item_id
             WHERE c.deleted_at IS NULL
               ${publicView ? "AND c.status = 'ACTIVE'" : ''}
             GROUP BY c.id
             ORDER BY c.sort_order, c.name, c.id`,
            PUBLIC_CATALOG_STATUSES
        );
        const categories = rows.map((row) => ({
            ...row,
            sort_order: Number(row.sort_order || 0),
            public_item_count: Number(row.public_item_count || 0),
            ...(publicView ? {} : { attributes: [] })
        }));
        if (!publicView && categories.length > 0) {
            const byId = new Map(categories.map((category) => [String(category.id), category]));
            const [attributeRows] = await this.pool.execute(
                `SELECT relation.category_id,
                        relation.attribute_definition_id AS definition_id,
                        relation.is_required, relation.sort_order
                 FROM catalog_category_attribute_definitions relation
                 JOIN catalog_attribute_definitions definition
                   ON definition.id = relation.attribute_definition_id
                 WHERE definition.status = 'ACTIVE'
                 ORDER BY relation.category_id, relation.sort_order, relation.attribute_definition_id`
            );
            for (const row of attributeRows) {
                const category = byId.get(String(row.category_id));
                if (!category) continue;
                category.attributes.push({
                    definition_id: row.definition_id,
                    required: bool(row.is_required),
                    sort_order: Number(row.sort_order || 0)
                });
            }
        }
        return categories;
    }

    async getCategoryById(id, executor = this.pool, { forUpdate = false } = {}) {
        const [rows] = await executor.execute(
            `SELECT id, parent_id, name, slug, description, image_url, icon,
                    sort_order, status, created_at, updated_at
             FROM catalog_categories
             WHERE id = ? AND deleted_at IS NULL
             LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
            [id]
        );
        return rows[0] || null;
    }

    async categoryWouldCycle(executor, categoryId, proposedParentId) {
        if (!proposedParentId) return false;
        const [[row]] = await executor.execute(
            `WITH RECURSIVE descendants AS (
                SELECT id FROM catalog_categories WHERE parent_id = ?
                UNION ALL
                SELECT c.id FROM catalog_categories c
                JOIN descendants d ON c.parent_id = d.id
             )
             SELECT EXISTS(SELECT 1 FROM descendants WHERE id = ?) AS cycles`,
            [categoryId, proposedParentId]
        );
        return bool(row.cycles);
    }

    async createCategory(connection, category) {
        try {
            const [result] = await connection.execute(
                `INSERT INTO catalog_categories
                    (parent_id, name, slug, description, image_url, icon, sort_order, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [category.parent_id, category.name, category.slug, category.description,
                    category.image_url, category.icon, category.sort_order, category.status]
            );
            return result.insertId;
        } catch (error) {
            throw mapDatabaseError(error, 'El slug de categoria ya existe');
        }
    }

    async updateCategory(connection, id, changes) {
        const statement = updateStatement('catalog_categories', 'id', id, changes, CATEGORY_MUTABLE_COLUMNS);
        if (!statement) return false;
        try {
            const [result] = await connection.execute(statement.sql, statement.params);
            return result.affectedRows > 0;
        } catch (error) {
            throw mapDatabaseError(error, 'El slug de categoria ya existe');
        }
    }

    async listBadges({ publicView = false } = {}) {
        const [rows] = await this.pool.execute(
            `SELECT id, badge_key, label, description, style_variant, icon, sort_order,
                    status, created_at, updated_at
             FROM catalog_badges ${publicView ? "WHERE status = 'ACTIVE'" : ''}
             ORDER BY sort_order, id`
        );
        return rows.map((row) => ({ ...row, sort_order: Number(row.sort_order || 0) }));
    }

    async getBadgeById(id, executor = this.pool) {
        const [rows] = await executor.execute('SELECT * FROM catalog_badges WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
    }

    async createBadge(connection, badge) {
        try {
            const [result] = await connection.execute(
                `INSERT INTO catalog_badges
                    (badge_key, label, description, style_variant, icon, sort_order, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [badge.badge_key, badge.label, badge.description, badge.style_variant,
                    badge.icon, badge.sort_order, badge.status]
            );
            return result.insertId;
        } catch (error) {
            throw mapDatabaseError(error, 'La clave de badge ya existe');
        }
    }

    async updateBadge(connection, id, changes) {
        const statement = updateStatement('catalog_badges', 'id', id, changes, BADGE_MUTABLE_COLUMNS);
        if (!statement) return false;
        try {
            const [result] = await connection.execute(statement.sql, statement.params);
            return result.affectedRows > 0;
        } catch (error) {
            throw mapDatabaseError(error, 'La clave de badge ya existe');
        }
    }

    async listAttributeDefinitions() {
        const [rows] = await this.pool.execute(
            `SELECT id, attribute_key, label, description, data_type, unit, options_json,
                    filterable, searchable, required, sort_order, status, created_at, updated_at
             FROM catalog_attribute_definitions ORDER BY sort_order, id`
        );
        return rows.map((row) => ({
            ...row,
            filterable: bool(row.filterable),
            searchable: bool(row.searchable),
                    required: bool(row.required),
                    options: parseJson(row.options_json),
            sort_order: Number(row.sort_order || 0)
        }));
    }

    async listProductKinds() {
        const [rows] = await this.pool.execute(
            `SELECT k.code, k.item_type, k.name, k.description, k.icon, k.sort_order, k.is_active,
                    a.attribute_definition_id, a.is_required, a.section_name, a.sort_order AS attribute_sort_order,
                    d.attribute_key, d.label AS attribute_label, d.description AS attribute_description,
                    d.data_type, d.unit, d.options_json, d.filterable, d.searchable, d.status AS attribute_status
             FROM catalog_product_kinds k
             LEFT JOIN catalog_product_kind_attributes a ON a.product_kind_code = k.code
             LEFT JOIN catalog_attribute_definitions d ON d.id = a.attribute_definition_id
             WHERE k.is_active = 1
             ORDER BY k.sort_order, k.code, a.sort_order, d.id`
        );
        const kinds = new Map();
        for (const row of rows) {
            if (!kinds.has(row.code)) {
                kinds.set(row.code, {
                    code: row.code,
                    item_type: row.item_type,
                    name: row.name,
                    description: row.description,
                    icon: row.icon,
                    sort_order: Number(row.sort_order || 0),
                    attributes: []
                });
            }
            if (row.attribute_definition_id && row.attribute_status === 'ACTIVE') {
                kinds.get(row.code).attributes.push({
                    id: Number(row.attribute_definition_id),
                    definition_id: Number(row.attribute_definition_id),
                    attribute_key: row.attribute_key,
                    label: row.attribute_label,
                    description: row.attribute_description,
                    data_type: row.data_type,
                    unit: row.unit,
                    options: parseJson(row.options_json),
                    filterable: bool(row.filterable),
                    searchable: bool(row.searchable),
                    required: bool(row.is_required),
                    section: row.section_name,
                    sort_order: Number(row.attribute_sort_order || 0)
                });
            }
        }
        return [...kinds.values()];
    }

    async getProductKind(code, executor = this.pool) {
        const [rows] = await executor.execute(
            'SELECT code, item_type, name FROM catalog_product_kinds WHERE code = ? AND is_active = 1 LIMIT 1',
            [code]
        );
        return rows[0] || null;
    }

    async getAttributeDefinitionById(id, executor = this.pool) {
        const [rows] = await executor.execute(
            'SELECT * FROM catalog_attribute_definitions WHERE id = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    }

    async createAttributeDefinition(connection, definition) {
        try {
            const [result] = await connection.execute(
                `INSERT INTO catalog_attribute_definitions
                    (attribute_key, label, description, data_type, unit, options_json,
                     filterable, searchable, required, sort_order, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [definition.attribute_key, definition.label, definition.description,
                    definition.data_type, definition.unit,
                    definition.options_json ? JSON.stringify(definition.options_json) : null,
                    definition.filterable ? 1 : 0, definition.searchable ? 1 : 0,
                    definition.required ? 1 : 0, definition.sort_order, definition.status]
            );
            return result.insertId;
        } catch (error) {
            throw mapDatabaseError(error, 'La clave del atributo ya existe');
        }
    }

    async updateAttributeDefinition(connection, id, changes) {
        const normalized = { ...changes };
        if (normalized.options_json !== undefined) {
            normalized.options_json = normalized.options_json === null
                ? null
                : JSON.stringify(normalized.options_json);
        }
        for (const key of ['filterable', 'searchable', 'required']) {
            if (normalized[key] !== undefined) normalized[key] = normalized[key] ? 1 : 0;
        }
        const statement = updateStatement(
            'catalog_attribute_definitions', 'id', id, normalized, ATTRIBUTE_MUTABLE_COLUMNS
        );
        if (!statement) return false;
        try {
            const [result] = await connection.execute(statement.sql, statement.params);
            return result.affectedRows > 0;
        } catch (error) {
            throw mapDatabaseError(error, 'La clave del atributo ya existe');
        }
    }

    async replaceCategoryAttributes(connection, categoryId, definitions) {
        await connection.execute(
            'DELETE FROM catalog_category_attribute_definitions WHERE category_id = ?',
            [categoryId]
        );
        if (definitions.length === 0) return;
        await connection.query(
            `INSERT INTO catalog_category_attribute_definitions
                (category_id, attribute_definition_id, is_required, sort_order)
             VALUES ?`,
            [definitions.map((entry, index) => [
                categoryId, entry.definition_id, entry.required ? 1 : 0, entry.sort_order ?? index
            ])]
        );
    }

    async addMedia(connection, media) {
        const [[count]] = await connection.execute(
            'SELECT COUNT(*) AS total FROM catalog_media WHERE catalog_item_id = ? AND deleted_at IS NULL',
            [media.catalog_item_id]
        );
        const primary = media.is_primary || Number(count.total) === 0;
        if (primary) {
            await connection.execute(
                'UPDATE catalog_media SET is_primary = 0 WHERE catalog_item_id = ? AND deleted_at IS NULL',
                [media.catalog_item_id]
            );
        }
        const [result] = await connection.execute(
            `INSERT INTO catalog_media (
                catalog_item_id, media_type, storage_key, url, mime_type,
                size_bytes, checksum_sha256, alt_text, sort_order, is_primary, metadata
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [media.catalog_item_id, media.media_type, media.storage_key, media.url,
                media.mime_type, media.size_bytes, media.checksum_sha256,
                media.alt_text, media.sort_order,
                primary ? 1 : 0, media.metadata ? JSON.stringify(media.metadata) : null]
        );
        return result.insertId;
    }

    async getMediaById(itemId, mediaId, executor = this.pool, { forUpdate = false } = {}) {
        const [rows] = await executor.execute(
            `SELECT * FROM catalog_media
             WHERE id = ? AND catalog_item_id = ? AND deleted_at IS NULL
             LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
            [mediaId, itemId]
        );
        return rows[0] || null;
    }

    async updateMedia(connection, itemId, mediaId, changes) {
        if (changes.is_primary) {
            await connection.execute(
                'UPDATE catalog_media SET is_primary = 0 WHERE catalog_item_id = ? AND deleted_at IS NULL',
                [itemId]
            );
        }
        const allowed = new Set(['alt_text', 'sort_order', 'is_primary']);
        const normalized = { ...changes };
        if (normalized.is_primary !== undefined) normalized.is_primary = normalized.is_primary ? 1 : 0;
        const statement = updateStatement('catalog_media', 'id', mediaId, normalized, allowed);
        if (!statement) return false;
        const [result] = await connection.execute(
            `${statement.sql} AND catalog_item_id = ?`,
            [...statement.params, itemId]
        );
        return result.affectedRows > 0;
    }

    async deleteMedia(connection, itemId, mediaId) {
        const media = await this.getMediaById(itemId, mediaId, connection, { forUpdate: true });
        if (!media) return null;
        await connection.execute(
            'UPDATE catalog_media SET deleted_at = UTC_TIMESTAMP(), is_primary = 0 WHERE id = ? AND catalog_item_id = ?',
            [mediaId, itemId]
        );
        if (bool(media.is_primary)) {
            await connection.execute(
                `UPDATE catalog_media SET is_primary = 1
                 WHERE id = (
                    SELECT selected.id FROM (
                        SELECT id FROM catalog_media
                        WHERE catalog_item_id = ? AND deleted_at IS NULL ORDER BY sort_order, id LIMIT 1
                    ) selected
                 )`,
                [itemId]
            );
        }
        return media;
    }

    async findMediaByStorageKey(storageKey) {
        const [rows] = await this.pool.execute(
            `SELECT cm.storage_key, cm.mime_type, ci.status AS item_status,
                    ci.sold_display_mode, ci.deleted_at AS item_deleted_at, ci.published_at
             FROM catalog_media cm
             JOIN catalog_items ci ON ci.id = cm.catalog_item_id
             WHERE cm.storage_key = ? AND cm.deleted_at IS NULL LIMIT 1`,
            [storageKey]
        );
        return rows[0] || null;
    }

    async findLegacyLink(executor, legacyType, legacyId, { forUpdate = false } = {}) {
        const [rows] = await executor.execute(
            `SELECT catalog_item_id, legacy_entity_type, legacy_entity_id
             FROM catalog_legacy_links
             WHERE legacy_entity_type = ? AND legacy_entity_id = ?
             LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
            [legacyType, String(legacyId)]
        );
        return rows[0] || null;
    }

    async createLegacyLink(connection, itemId, legacyType, legacyId, sourceSnapshot = null) {
        await connection.execute(
            `INSERT INTO catalog_legacy_links
                (catalog_item_id, legacy_entity_type, legacy_entity_id, source_snapshot, synced_at)
             VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
            [itemId, legacyType, String(legacyId), sourceSnapshot ? JSON.stringify(sourceSnapshot) : null]
        );
    }
}

module.exports = {
    CatalogRepository,
    mapItem,
    parseJson,
    escapeLike,
    updateStatement
};
