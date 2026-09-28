require('dotenv').config();
const { createPoolFromEnv } = require('../server/db/connection');
const crypto = require('crypto');

async function run() {
  const pool = createPoolFromEnv();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Update item 19 to featured
    await conn.execute('UPDATE catalog_items SET featured = 1 WHERE id = 19');

    // 2. Check if PC Gamer already exists
    const [pcRows] = await conn.execute('SELECT id FROM catalog_items WHERE slug = ?', ['pc-gamer-cancun-ryzen-5-rtx-3060']);
    let pcId = pcRows.length ? pcRows[0].id : null;
    if (!pcId) {
      const pcPubId = crypto.randomUUID();
      const [pcResult] = await conn.execute(
        `INSERT INTO catalog_items (
          public_id, sku, internal_code, slug, name, short_description, description,
          item_type, product_kind_code, condition_code, status, base_price, sale_price,
          currency, tax_rate, track_stock, stock_quantity, reserved_quantity, minimum_stock,
          featured, allow_purchase, allow_quote, brand, model, warranty_text,
          seo_title, seo_description, seo_keywords, seo_canonical_url, sold_display_mode,
          published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          pcPubId, 'PIX-GAM-002', 'INT-PCG-002', 'pc-gamer-cancun-ryzen-5-rtx-3060',
          'PC Gamer Cancún Master Ryzen 5 + RTX 3060',
          'PC Gamer ensamblada y optimizada en Cancún. Procesador AMD Ryzen 5 5600, RTX 3060 12GB, 16 GB RAM DDR4 3200MHz, 1 TB SSD NVMe M.2 y fuente 650W 80+ Bronze. 1 año de garantía y soporte técnico local.',
          'Ensamble gamer de alto rendimiento configurado y probado en el taller de Pixon PC Cancún con pruebas de estrés de CPU, GPU y temperaturas en clima tropical.\n\nComponentes:\n- Procesador: AMD Ryzen 5 5600 (6 núcleos / 12 hilos hasta 4.4 GHz)\n- Tarjeta Gráfica: GeForce RTX 3060 12 GB GDDR6\n- Memoria RAM: 16 GB DDR4 3200 MHz en Dual Channel\n- Almacenamiento: 1 TB SSD NVMe M.2 Kingston / Crucial de alta velocidad\n- Tarjeta Madre: Chipset B550 con disipación VRM y ranura M.2 PCIe 4.0\n- Fuente de Poder: 650W certificación 80 Plus Bronze con protección de voltaje\n- Gabinete: Cristal templado con flujo de aire optimizado y ventiladores ARGB\n- Sistema: Windows 11 Pro optimizado, drivers actualizados y BIOS ajustada\n\nIncluye garantía por escrito de 1 año con soporte técnico directo en Cancún.',
          'EQUIPMENT', 'GAMING_PC', 'NEW', 'ACTIVE', '18500.00', '16499.00',
          'MXN', '0.00', 1, 3, 1,
          1, 1, 1, 'Pixon Custom', 'Master Gaming Cancún', '1 Año de garantía completa con Pixon PC',
          'PC Gamer Ryzen 5 + RTX 3060 12GB en Cancún | Pixon PC',
          'Compra tu PC Gamer armada en Cancún con Ryzen 5 5600, RTX 3060 12GB, 16GB RAM y 1TB SSD. Garantía de 1 año y pruebas de estrés certificadas.',
          'pc gamer cancun, computadora gamer cancun, rtx 3060 cancun, ryzen 5 cancun, ensamble gamer cancun, pixon pc',
          'https://pixon.com.mx/tienda/pc-gamer-cancun-ryzen-5-rtx-3060', 'KEEP_VISIBLE'
        ]
      );
      pcId = pcResult.insertId;
      console.log('Inserted PC Gamer id:', pcId);

      // Category 8
      await conn.execute('INSERT INTO catalog_item_categories (catalog_item_id, category_id, is_primary, sort_order) VALUES (?, 8, 1, 0)', [pcId]);
      // Badge 5 (RECOMMENDED)
      await conn.execute('INSERT INTO catalog_item_badges (catalog_item_id, badge_id, sort_order) VALUES (?, 5, 0)', [pcId]);
      // Media
      await conn.execute(
        'INSERT INTO catalog_media (catalog_item_id, media_type, url, mime_type, alt_text, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, 0, 1)',
        [pcId, 'IMAGE', '/assets/images/ensamble-pc-gamer-cancun.webp', 'image/webp', 'PC Gamer Cancún Ryzen 5 y RTX 3060']
      );
    }

    // 3. Check if Mantenimiento service already exists
    const [srvRows] = await conn.execute('SELECT id FROM catalog_items WHERE slug = ?', ['mantenimiento-preventivo-pasta-termica-arctic-mx4']);
    let srvId = srvRows.length ? srvRows[0].id : null;
    if (!srvId) {
      const srvPubId = crypto.randomUUID();
      const [srvResult] = await conn.execute(
        `INSERT INTO catalog_items (
          public_id, sku, internal_code, slug, name, short_description, description,
          item_type, product_kind_code, condition_code, status, base_price, sale_price,
          currency, tax_rate, track_stock, stock_quantity, reserved_quantity, minimum_stock,
          featured, allow_purchase, allow_quote, brand, model, warranty_text,
          seo_title, seo_description, seo_keywords, seo_canonical_url, sold_display_mode,
          published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          srvPubId, 'PIX-SRV-003', 'INT-SRV-003', 'mantenimiento-preventivo-pasta-termica-arctic-mx4',
          'Mantenimiento Preventivo Integral + Pasta Térmica Arctic MX-4',
          'Servicio preventivo completo para PC o Laptop en Cancún. Desensamble cuidadoso, limpieza profunda antiestática, soplado de turbinas y aplicación de pasta térmica Arctic MX-4 de alta conductividad.',
          'Mantenimiento preventivo especializado para laptops y computadoras de escritorio en Cancún. El calor y la humedad de la zona aceleran la acumulación de polvo salino en disipadores y resecan la pasta térmica original.\n\nIncluye:\n- Desensamble técnico y diagnóstico inicial de temperaturas\n- Limpieza profunda de ventiladores, disipadores y carcasa interior\n- Retiro de pasta seca con alcohol isopropílico al 99%\n- Aplicación de pasta térmica prémium Arctic MX-4 de alta conductividad térmica\n- Lubricación o limpieza de rodamientos de ventiladores si aplica\n- Pruebas de estrés térmico antes y después del servicio\n- Reporte fotográfico del antes y después enviado a tu WhatsApp\n\nEntrega el mismo día o en 24 horas hábiles con garantía Pixon PC.',
          'SERVICE', 'SERVICE', 'NOT_APPLICABLE', 'ACTIVE', '850.00', '650.00',
          'MXN', '0.00', 0, 99, 0,
          1, 1, 1, 'Pixon PC', 'Servicio Técnico Especializado', 'Garantía técnica de satisfacción y temperaturas controladas',
          'Mantenimiento Preventivo con Pasta Térmica Arctic MX-4 en Cancún | Pixon PC',
          'Servicio de mantenimiento preventivo y cambio de pasta térmica Arctic MX-4 para computadoras y laptops en Cancún. Diagnóstico y garantía por escrito.',
          'mantenimiento preventivo cancun, cambio pasta termica cancun, arctic mx4 cancun, limpieza laptop cancun, servicio tecnico cancun',
          'https://pixon.com.mx/tienda/mantenimiento-preventivo-pasta-termica-arctic-mx4', 'KEEP_VISIBLE'
        ]
      );
      srvId = srvResult.insertId;
      console.log('Inserted Service id:', srvId);

      // Category 30
      await conn.execute('INSERT INTO catalog_item_categories (catalog_item_id, category_id, is_primary, sort_order) VALUES (?, 30, 1, 0)', [srvId]);
      // Badge 1 (MEGA_OFFER)
      await conn.execute('INSERT INTO catalog_item_badges (catalog_item_id, badge_id, sort_order) VALUES (?, 1, 0)', [srvId]);
      // Media
      await conn.execute(
        'INSERT INTO catalog_media (catalog_item_id, media_type, url, mime_type, alt_text, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, 0, 1)',
        [srvId, 'IMAGE', '/assets/images/mantenimiento-pc-escritorio.webp', 'image/webp', 'Mantenimiento Preventivo de PC y Laptop en Cancún']
      );
    }

    await conn.commit();
    console.log('Successfully seeded featured products!');
  } catch (err) {
    await conn.rollback();
    console.error('Error seeding featured products:', err);
  } finally {
    conn.release();
    pool.end();
  }
}

run();
