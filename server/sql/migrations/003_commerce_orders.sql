-- Pixon PC - marketplace transaccional (pedidos, pagos e inventario)
-- MariaDB 10.11+, InnoDB, utf8mb4. Migracion aditiva: no modifica tablas
-- legacy de orders/payments/carts/coupons.

CREATE TABLE IF NOT EXISTS commerce_counters (
  counter_key VARCHAR(64) NOT NULL PRIMARY KEY,
  counter_value BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_commerce_counters_value CHECK (counter_value >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  folio VARCHAR(24) NOT NULL,
  idempotency_key VARCHAR(80) NULL,
  user_id CHAR(36) NULL,
  ticket_id BIGINT UNSIGNED NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(24) NOT NULL,
  customer_email VARCHAR(190) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  status ENUM(
    'PENDING_PAYMENT','PAYMENT_REVIEW','PAID','PREPARING','READY','COMPLETED','CANCELLED'
  ) NOT NULL DEFAULT 'PENDING_PAYMENT',
  delivery_method ENUM('PICKUP','LOCAL_DELIVERY','SERVICE_ON_SITE') NOT NULL DEFAULT 'PICKUP',
  delivery_note VARCHAR(1000) NULL,
  reservation_expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_commerce_orders_folio UNIQUE (folio),
  CONSTRAINT uq_commerce_orders_idempotency UNIQUE (idempotency_key),
  CONSTRAINT fk_commerce_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_commerce_orders_ticket FOREIGN KEY (ticket_id) REFERENCES repairs(id) ON DELETE SET NULL,
  CONSTRAINT chk_commerce_orders_amounts CHECK (
    subtotal >= 0 AND discount_total >= 0 AND total >= 0
    AND discount_total <= subtotal AND total = subtotal - discount_total
  ),
  CONSTRAINT chk_commerce_orders_currency CHECK (BINARY currency REGEXP '^[A-Z]{3}$'),
  KEY idx_commerce_orders_status_created (status, created_at DESC),
  KEY idx_commerce_orders_user_created (user_id, created_at DESC),
  KEY idx_commerce_orders_email_created (customer_email, created_at DESC),
  KEY idx_commerce_orders_reservation_expiry (status, reservation_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  catalog_item_id BIGINT UNSIGNED NULL,
  promotion_id BIGINT UNSIGNED NULL,
  title_snapshot VARCHAR(180) NOT NULL,
  sku_snapshot VARCHAR(64) NULL,
  item_type_snapshot VARCHAR(24) NOT NULL,
  cost_unit_snapshot DECIMAL(12,2) NULL,
  list_unit_price DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  quantity INT UNSIGNED NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_commerce_order_items_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_order_items_catalog FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE SET NULL,
  CONSTRAINT chk_commerce_order_items_amounts CHECK (
    list_unit_price >= 0 AND unit_price >= 0 AND discount_amount >= 0
    AND (cost_unit_snapshot IS NULL OR cost_unit_snapshot >= 0)
    AND unit_price <= list_unit_price AND quantity > 0 AND line_total = unit_price * quantity
  ),
  KEY idx_commerce_order_items_order (order_id, id),
  KEY idx_commerce_order_items_catalog (catalog_item_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method ENUM('BANK_TRANSFER','CASH','TERMINAL') NOT NULL,
  status ENUM('PENDING','UNDER_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  proof_storage_key VARCHAR(96) NULL,
  proof_original_name VARCHAR(255) NULL,
  proof_mime VARCHAR(80) NULL,
  proof_size_bytes INT UNSIGNED NULL,
  proof_checksum_sha256 CHAR(64) NULL,
  uploaded_at DATETIME NULL,
  reviewed_by CHAR(36) NULL,
  reviewed_at DATETIME NULL,
  rejection_reason VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_commerce_payments_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_payments_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_commerce_payments_amount CHECK (amount >= 0),
  CONSTRAINT chk_commerce_payments_proof CHECK (
    (proof_storage_key IS NULL AND proof_mime IS NULL AND proof_size_bytes IS NULL AND proof_checksum_sha256 IS NULL)
    OR
    (proof_storage_key IS NOT NULL AND proof_mime IS NOT NULL AND proof_size_bytes > 0 AND proof_checksum_sha256 IS NOT NULL)
  ),
  KEY idx_commerce_payments_order (order_id, status),
  KEY idx_commerce_payments_status_uploaded (status, uploaded_at DESC),
  KEY idx_commerce_payments_checksum (proof_checksum_sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_order_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  actor_type ENUM('CUSTOMER','USER','ADMIN','SYSTEM') NOT NULL,
  actor_user_id CHAR(36) NULL,
  note VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_commerce_history_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_history_user FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_commerce_history_order_date (order_id, created_at, id),
  KEY idx_commerce_history_actor (actor_user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_inventory_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  catalog_item_id BIGINT UNSIGNED NOT NULL,
  qty_delta INT NOT NULL,
  reason ENUM('SALE','RESERVE','RELEASE','ADJUSTMENT','RETURN') NOT NULL,
  reference_order_id BIGINT UNSIGNED NULL,
  created_by CHAR(36) NULL,
  note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_commerce_inventory_item FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_inventory_order FOREIGN KEY (reference_order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_inventory_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_commerce_inventory_delta CHECK (qty_delta <> 0),
  KEY idx_commerce_inventory_item_date (catalog_item_id, created_at DESC),
  KEY idx_commerce_inventory_order (reference_order_id, reason),
  KEY idx_commerce_inventory_reason_date (reason, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Snapshot operativo de las unidades reservadas. Evita que una edicion futura
-- de la composicion de un bundle cambie lo que debe consumir un pedido existente.
CREATE TABLE IF NOT EXISTS commerce_order_inventory_reservations (
  order_id BIGINT UNSIGNED NOT NULL,
  catalog_item_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  status ENUM('RESERVED','CONSUMED','RELEASED','RETURNED') NOT NULL DEFAULT 'RESERVED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id, catalog_item_id),
  CONSTRAINT fk_commerce_reservation_order FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commerce_reservation_item FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE RESTRICT,
  CONSTRAINT chk_commerce_reservation_quantity CHECK (quantity > 0),
  KEY idx_commerce_reservation_item_status (catalog_item_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_bundle_items (
  bundle_catalog_item_id BIGINT UNSIGNED NOT NULL,
  component_catalog_item_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bundle_catalog_item_id, component_catalog_item_id),
  CONSTRAINT fk_commerce_bundle_parent FOREIGN KEY (bundle_catalog_item_id) REFERENCES catalog_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_commerce_bundle_component FOREIGN KEY (component_catalog_item_id) REFERENCES catalog_items(id) ON DELETE RESTRICT,
  CONSTRAINT chk_commerce_bundle_quantity CHECK (quantity > 0),
  CONSTRAINT chk_commerce_bundle_not_self CHECK (bundle_catalog_item_id <> component_catalog_item_id),
  KEY idx_commerce_bundle_component (component_catalog_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_promotions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  promotion_type ENUM('PERCENT','FIXED','SALE_PRICE','BUNDLE_PRICE') NOT NULL,
  promotion_value DECIMAL(12,2) NOT NULL,
  scope ENUM('ITEM','CATEGORY') NOT NULL,
  badge_id SMALLINT UNSIGNED NULL,
  status ENUM('DRAFT','ACTIVE','SCHEDULED','ENDED') NOT NULL DEFAULT 'DRAFT',
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  presentation JSON NULL,
  created_by CHAR(36) NULL,
  updated_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_commerce_promotions_badge FOREIGN KEY (badge_id) REFERENCES catalog_badges(id) ON DELETE SET NULL,
  CONSTRAINT fk_commerce_promotions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_commerce_promotions_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_commerce_promotions_value CHECK (promotion_value >= 0),
  CONSTRAINT chk_commerce_promotions_dates CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  KEY idx_commerce_promotions_live (status, starts_at, ends_at),
  KEY idx_commerce_promotions_type (promotion_type, scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_promotion_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  promotion_id BIGINT UNSIGNED NOT NULL,
  catalog_item_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_commerce_promotion_item UNIQUE (promotion_id, catalog_item_id),
  CONSTRAINT uq_commerce_promotion_category UNIQUE (promotion_id, category_id),
  CONSTRAINT fk_commerce_promotion_items_promotion FOREIGN KEY (promotion_id) REFERENCES commerce_promotions(id) ON DELETE CASCADE,
  CONSTRAINT fk_commerce_promotion_items_item FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_commerce_promotion_items_category FOREIGN KEY (category_id) REFERENCES catalog_categories(id) ON DELETE CASCADE,
  CONSTRAINT chk_commerce_promotion_target CHECK (
    (catalog_item_id IS NOT NULL AND category_id IS NULL)
    OR (catalog_item_id IS NULL AND category_id IS NOT NULL)
  ),
  KEY idx_commerce_promotion_target_item (catalog_item_id, promotion_id),
  KEY idx_commerce_promotion_target_category (category_id, promotion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE commerce_order_items
  ADD CONSTRAINT fk_commerce_order_items_promotion
  FOREIGN KEY IF NOT EXISTS (promotion_id) REFERENCES commerce_promotions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS commerce_notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recipient_user_id CHAR(36) NULL,
  admin_broadcast TINYINT(1) NOT NULL DEFAULT 0,
  notification_type VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  payload JSON NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_commerce_notifications_user FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_commerce_notifications_recipient CHECK (recipient_user_id IS NOT NULL OR admin_broadcast = 1),
  CONSTRAINT chk_commerce_notifications_broadcast CHECK (admin_broadcast IN (0, 1)),
  KEY idx_commerce_notifications_admin (admin_broadcast, read_at, created_at DESC),
  KEY idx_commerce_notifications_user (recipient_user_id, read_at, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS commerce_settings (
  setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_commerce_settings_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO commerce_settings (setting_key, setting_value, updated_by) VALUES
  ('payment_methods', JSON_OBJECT(
    'BANK_TRANSFER', JSON_OBJECT('enabled', false, 'beneficiary', '', 'bank', '', 'account', '', 'clabe', '', 'card', '', 'instructions', ''),
    'CASH', JSON_OBJECT('enabled', true, 'instructions', 'Pago al recoger en Pixon PC.'),
    'TERMINAL', JSON_OBJECT('enabled', true, 'instructions', 'Pago con terminal al recoger en Pixon PC.')
  ), NULL),
  ('reservation_policy', JSON_OBJECT('minutes', 1440), NULL)
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
