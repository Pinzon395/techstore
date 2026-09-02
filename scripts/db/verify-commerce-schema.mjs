import 'dotenv/config';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'pixon_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pixon_db',
  dateStrings: true,
});

const checks = [
  ['migraciones 002-006 aplicadas', `SELECT COUNT(*) failures FROM schema_migrations
    WHERE name IN ('002_commerce_catalog.sql','003_commerce_orders.sql','004_commerce_admin_catalog.sql','005_commerce_promotions_refunds_providers.sql','006_commerce_payment_currency.sql')
      AND status <> 'applied'`],
  ['stock no negativo y reservas validas', `SELECT COUNT(*) failures FROM catalog_items
    WHERE stock_quantity < 0 OR reserved_quantity < 0 OR reserved_quantity > stock_quantity`],
  ['items con pedido existente', `SELECT COUNT(*) failures FROM commerce_order_items child
    LEFT JOIN commerce_orders parent ON parent.id = child.order_id WHERE parent.id IS NULL`],
  ['pagos con pedido existente', `SELECT COUNT(*) failures FROM commerce_payments child
    LEFT JOIN commerce_orders parent ON parent.id = child.order_id WHERE parent.id IS NULL`],
  ['moneda de pagos consistente', `SELECT COUNT(*) failures FROM commerce_payments payment
    JOIN commerce_orders orders ON orders.id = payment.order_id WHERE payment.currency <> orders.currency`],
  ['reservas con referencias existentes', `SELECT COUNT(*) failures FROM commerce_order_inventory_reservations reservation
    LEFT JOIN commerce_orders orders ON orders.id = reservation.order_id
    LEFT JOIN catalog_items item ON item.id = reservation.catalog_item_id
    WHERE orders.id IS NULL OR item.id IS NULL`],
  ['reservas del catalogo sincronizadas con el ledger', `SELECT COUNT(*) failures FROM catalog_items item
    WHERE item.reserved_quantity <> (
      SELECT COALESCE(SUM(reservation.quantity), 0)
      FROM commerce_order_inventory_reservations reservation
      WHERE reservation.catalog_item_id = item.id AND reservation.status = 'RESERVED'
    )`],
  ['publicaciones con categoria e imagen principal', `SELECT COUNT(*) failures FROM catalog_items item
    WHERE item.status = 'ACTIVE' AND item.published_at IS NOT NULL
      AND (
        NOT EXISTS (SELECT 1 FROM catalog_item_categories category WHERE category.catalog_item_id = item.id)
        OR NOT EXISTS (SELECT 1 FROM catalog_media media WHERE media.catalog_item_id = item.id AND media.is_primary = 1 AND media.deleted_at IS NULL)
      )`],
  ['stock disponible para publicaciones comprables', `SELECT COUNT(*) failures FROM catalog_items item
    WHERE item.status = 'ACTIVE' AND item.published_at IS NOT NULL
      AND item.allow_purchase = 1 AND item.track_stock = 1
      AND item.stock_quantity - item.reserved_quantity < 0`],
  ['pedidos pendientes con intento de pago', `SELECT COUNT(*) failures FROM commerce_orders orders
    WHERE orders.status = 'PENDING_PAYMENT'
      AND NOT EXISTS (
        SELECT 1 FROM commerce_payments payment
        WHERE payment.order_id = orders.id AND payment.status = 'PENDING'
      )`],
  ['pedidos pendientes no vencidos', `SELECT COUNT(*) failures FROM commerce_orders orders
    WHERE orders.status = 'PENDING_PAYMENT'
      AND orders.reservation_expires_at IS NOT NULL
      AND orders.reservation_expires_at < UTC_TIMESTAMP()`],
  ['totales de pedidos consistentes', `SELECT COUNT(*) failures FROM commerce_orders orders
    WHERE orders.total <> orders.subtotal - orders.discount_total
       OR orders.total <> (SELECT COALESCE(SUM(item.line_total),0) FROM commerce_order_items item WHERE item.order_id = orders.id)`],
  ['refunds dentro del monto pagado', `SELECT COUNT(*) failures FROM commerce_payments payment
    WHERE payment.refunded_amount < 0 OR payment.refunded_amount > payment.amount
       OR payment.refunded_amount <> (SELECT COALESCE(SUM(refund.amount),0) FROM commerce_refunds refund
                                      WHERE refund.payment_id = payment.id AND refund.status = 'SUCCEEDED')`],
  ['usos de promociones sincronizados', `SELECT COUNT(*) failures FROM commerce_promotions promotion
    WHERE promotion.redemptions_count <> (SELECT COUNT(*) FROM commerce_promotion_usage use_record WHERE use_record.promotion_id = promotion.id)`],
  ['returns limitados a cantidades vendidas', `SELECT COUNT(*) failures FROM commerce_order_items item
    WHERE (SELECT COALESCE(SUM(return_item.quantity),0) FROM commerce_return_items return_item
           JOIN commerce_returns returns ON returns.id = return_item.return_id
           WHERE return_item.order_item_id = item.id AND returns.status NOT IN ('REJECTED','CANCELLED')) > item.quantity`],
];

try {
  for (const [label, sql] of checks) {
    const [[result]] = await connection.query(sql);
    if (Number(result.failures) !== 0) throw new Error(`${label}: ${result.failures} inconsistencia(s)`);
    console.log(`OK ${label}`);
  }
  const [constraints] = await connection.query(
    `SELECT COUNT(*) total FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND (TABLE_NAME LIKE 'commerce_%' OR TABLE_NAME LIKE 'catalog_%')`
  );
  console.log(`OK integridad referencial: ${constraints[0].total} foreign keys Commerce/Catalog.`);
} finally {
  await connection.end();
}
