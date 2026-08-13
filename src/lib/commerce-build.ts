import mysql from 'mysql2/promise';

type CatalogItem = Record<string, any>;

function parseJson(value: any, fallback: any = null) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

export async function getPublishedCommerceItems(): Promise<CatalogItem[]> {
  let connection: any;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pixon_db',
      charset: 'utf8mb4',
      connectTimeout: 5000,
    });
    const [rows] = await connection.execute<any[]>(`
      SELECT ci.id, ci.slug, ci.sku, ci.name, ci.short_description, ci.description,
             ci.item_type, ci.condition_code, ci.status, ci.base_price, ci.sale_price,
             ci.currency, ci.track_stock, ci.stock_quantity, ci.reserved_quantity,
             ci.allow_purchase, ci.allow_quote, ci.brand, ci.warranty_text, ci.seo_title, ci.seo_description,
             ci.seo_canonical_url, ci.sold_display_mode,
             (SELECT cm.url FROM catalog_media cm WHERE cm.catalog_item_id = ci.id
                AND cm.deleted_at IS NULL ORDER BY cm.is_primary DESC, cm.sort_order, cm.id LIMIT 1) image_url
      FROM catalog_items ci
      WHERE ci.deleted_at IS NULL AND ci.status IN ('ACTIVE','RESERVED','SOLD','OUT_OF_STOCK')
        AND ci.published_at IS NOT NULL AND ci.published_at <= UTC_TIMESTAMP()
        AND (ci.status <> 'SOLD' OR ci.sold_display_mode <> 'HIDE')
      ORDER BY ci.published_at DESC, ci.id DESC
    `);
    for (const item of rows) {
      const [media] = await connection.execute<any[]>(
        `SELECT url, alt_text, mime_type FROM catalog_media WHERE catalog_item_id = ? AND deleted_at IS NULL ORDER BY is_primary DESC, sort_order, id`,
        [item.id]
      );
      const [attributes] = await connection.execute<any[]>(
        `SELECT d.label, d.attribute_key, d.unit, v.value_text, v.value_integer, v.value_decimal,
                v.value_boolean, v.value_date, v.value_json
         FROM catalog_item_attribute_values v JOIN catalog_attribute_definitions d ON d.id = v.attribute_definition_id
         WHERE v.catalog_item_id = ? AND d.status = 'ACTIVE' ORDER BY v.sort_order, d.sort_order, d.id`,
        [item.id]
      );
      const [categories] = await connection.execute<any[]>(
        `SELECT c.name, c.slug FROM catalog_item_categories x JOIN catalog_categories c ON c.id = x.category_id
         WHERE x.catalog_item_id = ? AND c.status = 'ACTIVE' ORDER BY x.is_primary DESC, x.sort_order`, [item.id]
      );
      const [badges] = await connection.execute<any[]>(
        `SELECT b.label, b.style_variant FROM catalog_item_badges x JOIN catalog_badges b ON b.id = x.badge_id
         WHERE x.catalog_item_id = ? AND b.status = 'ACTIVE'
           AND (x.starts_at IS NULL OR x.starts_at <= UTC_TIMESTAMP())
           AND (x.ends_at IS NULL OR x.ends_at >= UTC_TIMESTAMP())
         ORDER BY x.sort_order, b.sort_order LIMIT 2`, [item.id]
      );
      item.media = media;
      item.categories = categories;
      item.badges = badges;
      item.attributes = attributes.map((attribute: any) => ({
        label: attribute.label,
        key: attribute.attribute_key,
        unit: attribute.unit,
        value: attribute.value_text ?? attribute.value_integer ?? attribute.value_decimal
          ?? (attribute.value_boolean == null ? null : Boolean(attribute.value_boolean))
          ?? attribute.value_date ?? parseJson(attribute.value_json),
      }));
    }
    return rows;
  } catch (error: any) {
    console.warn(`[commerce-build] Catalogo dinamico omitido: ${error?.code || error?.message || 'sin conexion'}`);
    return [];
  } finally {
    await connection?.end?.().catch(() => {});
  }
}
