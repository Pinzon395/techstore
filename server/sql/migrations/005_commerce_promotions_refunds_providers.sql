-- Commerce: cupones, reglas de promociones, refunds/returns y proveedores externos.
-- Aditiva, MariaDB 10.11+, sin secretos de proveedores en la base de datos.

INSERT INTO permissions (code, module, name, description, is_sensitive) VALUES
  ('payments.refund', 'payments', 'Procesar refunds', 'Crear, completar y cancelar refunds financieros.', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_sensitive = VALUES(is_sensitive);

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT role.id, permission.id, NULL FROM roles role
JOIN permissions permission ON permission.code = 'payments.refund'
WHERE role.code = 'admin';

ALTER TABLE commerce_promotions
  MODIFY COLUMN scope ENUM('ITEM','CATEGORY','BRAND') NOT NULL,
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(64) NULL AFTER name,
  ADD COLUMN IF NOT EXISTS minimum_quantity INT UNSIGNED NOT NULL DEFAULT 1 AFTER scope,
  ADD COLUMN IF NOT EXISTS minimum_subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER minimum_quantity,
  ADD COLUMN IF NOT EXISTS max_redemptions INT UNSIGNED NULL AFTER minimum_subtotal,
  ADD COLUMN IF NOT EXISTS max_redemptions_per_customer INT UNSIGNED NULL AFTER max_redemptions,
  ADD COLUMN IF NOT EXISTS redemptions_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER max_redemptions_per_customer,
  ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 0 AFTER redemptions_count,
  ADD COLUMN IF NOT EXISTS stackable TINYINT(1) NOT NULL DEFAULT 0 AFTER priority,
  ADD COLUMN IF NOT EXISTS stop_processing TINYINT(1) NOT NULL DEFAULT 1 AFTER stackable;

ALTER TABLE commerce_promotions
  ADD UNIQUE INDEX IF NOT EXISTS uq_commerce_promotions_coupon (coupon_code),
  ADD INDEX IF NOT EXISTS idx_commerce_promotions_priority (status, priority DESC, id),
  ADD INDEX IF NOT EXISTS idx_commerce_promotions_usage (redemptions_count, max_redemptions);

CREATE TABLE IF NOT EXISTS commerce_promotion_brands (
  promotion_id BIGINT UNSIGNED NOT NULL,
  brand VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (promotion_id, brand),
  CONSTRAINT fk_commerce_promotion_brands_promotion
    FOREIGN KEY (promotion_id) REFERENCES commerce_promotions(id) ON DELETE CASCADE,
  KEY idx_commerce_promotion_brands_brand (brand, promotion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_promotion_usage (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  promotion_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id CHAR(36) NULL,
  customer_email VARCHAR(190) NOT NULL,
  coupon_code_snapshot VARCHAR(64) NULL,
  discount_amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_commerce_promotion_usage_order UNIQUE (promotion_id, order_id),
  CONSTRAINT fk_commerce_promotion_usage_promotion
    FOREIGN KEY (promotion_id) REFERENCES commerce_promotions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_promotion_usage_order
    FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_promotion_usage_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_commerce_promotion_usage_customer (promotion_id, customer_email, created_at),
  KEY idx_commerce_promotion_usage_user (promotion_id, user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE commerce_payments
  MODIFY COLUMN method ENUM('BANK_TRANSFER','CASH','TERMINAL','STRIPE','PAYPAL','MERCADO_PAGO') NOT NULL,
  MODIFY COLUMN status ENUM('PENDING','UNDER_REVIEW','APPROVED','REJECTED','CANCELLED','PARTIALLY_REFUNDED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS provider VARCHAR(32) NULL AFTER method,
  ADD COLUMN IF NOT EXISTS external_transaction_id VARCHAR(191) NULL AFTER provider,
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(80) NULL AFTER external_transaction_id,
  ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER amount,
  ADD COLUMN IF NOT EXISTS provider_metadata JSON NULL AFTER rejection_reason;

ALTER TABLE commerce_payments
  ADD UNIQUE INDEX IF NOT EXISTS uq_commerce_payment_external (provider, external_transaction_id),
  ADD INDEX IF NOT EXISTS idx_commerce_payments_refunds (status, refunded_amount);

ALTER TABLE commerce_order_items
  ADD COLUMN IF NOT EXISTS promotion_snapshot JSON NULL AFTER promotion_id;

CREATE TABLE IF NOT EXISTS commerce_refunds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL,
  idempotency_key VARCHAR(80) NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  refund_type ENUM('PARTIAL','TOTAL') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  status ENUM('PENDING','PROCESSING','SUCCEEDED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  provider VARCHAR(32) NULL,
  external_refund_id VARCHAR(191) NULL,
  failure_reason VARCHAR(1000) NULL,
  requested_by CHAR(36) NULL,
  completed_by CHAR(36) NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_commerce_refunds_public UNIQUE (public_id),
  CONSTRAINT uq_commerce_refunds_idempotency UNIQUE (idempotency_key),
  CONSTRAINT uq_commerce_refunds_external UNIQUE (provider, external_refund_id),
  CONSTRAINT fk_commerce_refunds_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_refunds_payment FOREIGN KEY (payment_id) REFERENCES commerce_payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_refunds_requested_by FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_commerce_refunds_completed_by FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_commerce_refunds_payment (payment_id, status, requested_at),
  KEY idx_commerce_refunds_order (order_id, requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_returns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(36) NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  status ENUM('REQUESTED','APPROVED','RECEIVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'REQUESTED',
  reason VARCHAR(1000) NOT NULL,
  internal_note VARCHAR(1000) NULL,
  requested_by CHAR(36) NULL,
  reviewed_by CHAR(36) NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  received_at DATETIME NULL,
  CONSTRAINT uq_commerce_returns_public UNIQUE (public_id),
  CONSTRAINT fk_commerce_returns_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_returns_requested_by FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_commerce_returns_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_commerce_returns_order (order_id, status, requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_return_items (
  return_id BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  restock TINYINT(1) NOT NULL DEFAULT 0,
  inventory_restored_at DATETIME NULL,
  PRIMARY KEY (return_id, order_item_id),
  CONSTRAINT fk_commerce_return_items_return FOREIGN KEY (return_id) REFERENCES commerce_returns(id) ON DELETE CASCADE,
  CONSTRAINT fk_commerce_return_items_order_item FOREIGN KEY (order_item_id) REFERENCES commerce_order_items(id) ON DELETE RESTRICT,
  KEY idx_commerce_return_items_order_item (order_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_payment_provider_configs (
  provider ENUM('STRIPE','PAYPAL','MERCADO_PAGO') NOT NULL PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  mode ENUM('TEST','LIVE') NOT NULL DEFAULT 'TEST',
  display_name VARCHAR(100) NOT NULL,
  public_config JSON NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  updated_by CHAR(36) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_commerce_provider_config_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO commerce_payment_provider_configs (provider, enabled, mode, display_name, sort_order) VALUES
  ('STRIPE', 0, 'TEST', 'Stripe', 100),
  ('PAYPAL', 0, 'TEST', 'PayPal', 110),
  ('MERCADO_PAGO', 0, 'TEST', 'Mercado Pago', 120)
ON DUPLICATE KEY UPDATE provider = VALUES(provider);

CREATE TABLE IF NOT EXISTS commerce_payment_provider_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider ENUM('STRIPE','PAYPAL','MERCADO_PAGO') NOT NULL,
  external_event_id VARCHAR(191) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  payload_checksum_sha256 CHAR(64) NOT NULL,
  status ENUM('RECEIVED','PROCESSED','IGNORED','FAILED') NOT NULL DEFAULT 'RECEIVED',
  error_message VARCHAR(1000) NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  CONSTRAINT uq_commerce_provider_event UNIQUE (provider, external_event_id),
  KEY idx_commerce_provider_events_status (status, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_payment_operations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  idempotency_key VARCHAR(80) NOT NULL,
  operation_type ENUM('CREATE_PAYMENT','CAPTURE','REFUND','WEBHOOK') NOT NULL,
  payment_id BIGINT UNSIGNED NULL,
  refund_id BIGINT UNSIGNED NULL,
  provider ENUM('STRIPE','PAYPAL','MERCADO_PAGO') NOT NULL,
  request_checksum_sha256 CHAR(64) NOT NULL,
  status ENUM('PENDING','SUCCEEDED','FAILED') NOT NULL DEFAULT 'PENDING',
  external_id VARCHAR(191) NULL,
  error_message VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT uq_commerce_payment_operation UNIQUE (idempotency_key),
  CONSTRAINT fk_commerce_payment_operation_payment FOREIGN KEY (payment_id) REFERENCES commerce_payments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_payment_operation_refund FOREIGN KEY (refund_id) REFERENCES commerce_refunds(id) ON DELETE RESTRICT,
  KEY idx_commerce_payment_operations_provider (provider, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
