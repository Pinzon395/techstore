-- Cada pago/refund conserva su moneda explicita; backfill seguro desde el pedido.
ALTER TABLE commerce_payments
  ADD COLUMN IF NOT EXISTS currency CHAR(3) NULL AFTER amount;

UPDATE commerce_payments payment
JOIN commerce_orders orders ON orders.id = payment.order_id
SET payment.currency = orders.currency
WHERE payment.currency IS NULL;

ALTER TABLE commerce_payments
  MODIFY COLUMN currency CHAR(3) NOT NULL DEFAULT 'MXN',
  ADD INDEX IF NOT EXISTS idx_commerce_payments_currency (currency, status);
