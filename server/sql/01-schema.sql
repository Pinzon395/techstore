-- ═══════════════════════════════════════════════════════════════════════════
-- Pixon PC — Esquema MariaDB 10.11+
-- Ejecutar como: mysql -u root -p < 01-schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- COLLATE: utf8mb4_uca1400_ai_ci es el equivalente moderno de MariaDB 10.10+.
-- Si tu MariaDB es 10.5–10.9, cambia a utf8mb4_unicode_520_ci.
-- NUNCA uses utf8mb4_0900_ai_ci aquí: esa collation es exclusiva de MySQL 8.
CREATE DATABASE IF NOT EXISTS pixon_db
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_uca1400_ai_ci;

USE pixon_db;

SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';
SET FOREIGN_KEY_CHECKS = 0;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. IDENTIDAD Y ACCESO
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  id              TINYINT UNSIGNED PRIMARY KEY,
  code            VARCHAR(32) NOT NULL UNIQUE,
  name            VARCHAR(64) NOT NULL,
  description     VARCHAR(255),
  is_staff        TINYINT(1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id                CHAR(36)        PRIMARY KEY,
  google_id         VARCHAR(64)     UNIQUE,
  email             VARCHAR(190)    NOT NULL UNIQUE,
  email_verified_at TIMESTAMP       NULL,
  password_hash     VARCHAR(255)    NULL,
  name              VARCHAR(120)    NOT NULL,
  avatar_url        VARCHAR(512),
  phone             VARCHAR(20),
  role_id           TINYINT UNSIGNED NOT NULL DEFAULT 4,
  is_active         TINYINT(1)      NOT NULL DEFAULT 1,
  last_login_at     TIMESTAMP       NULL,
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP       NULL,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  KEY idx_users_role        (role_id),
  KEY idx_users_active      (is_active, deleted_at),
  KEY idx_users_created_at  (created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id     CHAR(36) NOT NULL,
  permission  VARCHAR(64) NOT NULL,
  granted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS addresses (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      CHAR(36) NOT NULL,
  label        VARCHAR(40)  NOT NULL DEFAULT 'principal',
  recipient    VARCHAR(120),
  street       VARCHAR(255) NOT NULL,
  ext_number   VARCHAR(20),
  int_number   VARCHAR(20),
  neighborhood VARCHAR(100),
  city         VARCHAR(100) NOT NULL,
  state        VARCHAR(100) NOT NULL,
  country      CHAR(2)      NOT NULL DEFAULT 'MX',
  zip          VARCHAR(10)  NOT NULL,
  phone        VARCHAR(20),
  is_default   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_addresses_user (user_id, is_default)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  session_id  VARCHAR(128) NOT NULL PRIMARY KEY,
  expires     INT UNSIGNED NOT NULL,
  data        MEDIUMTEXT,
  KEY idx_sessions_expires (expires)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     CHAR(36)        NULL,
  action      VARCHAR(64)     NOT NULL,
  entity      VARCHAR(64)     NOT NULL,
  entity_id   VARCHAR(64)     NULL,
  diff        JSON            NULL,
  ip          VARCHAR(45),
  user_agent  VARCHAR(255),
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_admin_logs_user_date (user_id, created_at DESC),
  KEY idx_admin_logs_entity    (entity, entity_id, created_at DESC),
  KEY idx_admin_logs_action    (action, created_at DESC)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. CATÁLOGO DE COMPONENTES
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS component_types (
  id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(32) NOT NULL UNIQUE,
  name        VARCHAR(64) NOT NULL,
  icon        VARCHAR(64),
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_required_in_build TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS brands (
  id    SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(80) NOT NULL UNIQUE,
  slug  VARCHAR(80) NOT NULL UNIQUE,
  logo_url VARCHAR(512)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS components (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku           VARCHAR(64) NOT NULL UNIQUE,
  type_id       SMALLINT UNSIGNED NOT NULL,
  brand_id      SMALLINT UNSIGNED NOT NULL,
  model         VARCHAR(160) NOT NULL,
  slug          VARCHAR(200) NOT NULL UNIQUE,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL,
  cost          DECIMAL(10,2) NULL,
  stock         INT NOT NULL DEFAULT 0,
  stock_alert   INT NOT NULL DEFAULT 5,
  weight_grams  INT UNSIGNED,
  warranty_months SMALLINT UNSIGNED DEFAULT 12,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  specs         JSON,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  FOREIGN KEY (type_id)  REFERENCES component_types(id),
  FOREIGN KEY (brand_id) REFERENCES brands(id),
  KEY idx_components_type_active   (type_id, is_active, deleted_at),
  KEY idx_components_price         (price),
  KEY idx_components_stock_alert   (stock, stock_alert),
  FULLTEXT KEY ft_components_search (model, description)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attribute_definitions (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(48) NOT NULL UNIQUE,
  name          VARCHAR(80) NOT NULL,
  data_type     ENUM('string','int','decimal','bool') NOT NULL,
  unit          VARCHAR(16),
  is_filterable TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS component_attributes (
  component_id   BIGINT UNSIGNED NOT NULL,
  attribute_id   SMALLINT UNSIGNED NOT NULL,
  value_string   VARCHAR(120),
  value_int      INT,
  value_decimal  DECIMAL(12,3),
  value_bool     TINYINT(1),
  PRIMARY KEY (component_id, attribute_id),
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
  FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id),
  KEY idx_attr_filter_string (attribute_id, value_string),
  KEY idx_attr_filter_int    (attribute_id, value_int),
  KEY idx_attr_filter_decimal(attribute_id, value_decimal)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS component_images (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  component_id  BIGINT UNSIGNED NOT NULL,
  url           VARCHAR(512) NOT NULL,
  alt           VARCHAR(255),
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_primary    TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
  KEY idx_component_images (component_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  component_id  BIGINT UNSIGNED NOT NULL,
  qty_delta     INT NOT NULL,
  reason        ENUM('purchase','sale','build_used','return','adjustment','damage') NOT NULL,
  reference_id  VARCHAR(64),
  notes         VARCHAR(255),
  created_by    CHAR(36),
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (component_id) REFERENCES components(id),
  FOREIGN KEY (created_by)   REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_inv_component_date (component_id, created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compatibility_rules (
  id              SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_code       VARCHAR(64) NOT NULL UNIQUE,
  type_a_id       SMALLINT UNSIGNED NOT NULL,
  attribute_a_id  SMALLINT UNSIGNED NOT NULL,
  operator        ENUM('=','<=','>=') NOT NULL,
  type_b_id       SMALLINT UNSIGNED NOT NULL,
  attribute_b_id  SMALLINT UNSIGNED NOT NULL,
  error_message   VARCHAR(255) NOT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (type_a_id)      REFERENCES component_types(id),
  FOREIGN KEY (type_b_id)      REFERENCES component_types(id),
  FOREIGN KEY (attribute_a_id) REFERENCES attribute_definitions(id),
  FOREIGN KEY (attribute_b_id) REFERENCES attribute_definitions(id)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. PRODUCTOS Y ENSAMBLES
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_categories (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id     SMALLINT UNSIGNED NULL,
  name          VARCHAR(80) NOT NULL,
  slug          VARCHAR(80) NOT NULL UNIQUE,
  description   VARCHAR(255),
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku           VARCHAR(64) UNIQUE,
  type          ENUM('product','build','accessory','peripheral') NOT NULL DEFAULT 'product',
  category_id   SMALLINT UNSIGNED,
  title         VARCHAR(180) NOT NULL,
  slug          VARCHAR(200) NOT NULL UNIQUE,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2) NULL,
  cost          DECIMAL(10,2) NULL,
  stock         INT NOT NULL DEFAULT 0,
  stock_alert   INT NOT NULL DEFAULT 3,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  is_featured   TINYINT(1) NOT NULL DEFAULT 0,
  meta_title    VARCHAR(180),
  meta_description VARCHAR(300),
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  FOREIGN KEY (category_id) REFERENCES product_categories(id),
  KEY idx_products_type_active (type, is_active, deleted_at),
  KEY idx_products_category    (category_id, is_active),
  KEY idx_products_featured    (is_featured, is_active),
  FULLTEXT KEY ft_products_search (title, description)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_images (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  BIGINT UNSIGNED NOT NULL,
  url         VARCHAR(512) NOT NULL,
  alt         VARCHAR(255),
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_primary  TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  KEY idx_product_images (product_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS builds (
  id              BIGINT UNSIGNED PRIMARY KEY,
  build_category  ENUM('gaming','office','workstation','streaming','starter','custom') NOT NULL DEFAULT 'gaming',
  performance_tier ENUM('entry','mid','high','enthusiast') NOT NULL DEFAULT 'mid',
  estimated_fps_1080p SMALLINT UNSIGNED,
  estimated_fps_1440p SMALLINT UNSIGNED,
  warranty_months  SMALLINT UNSIGNED DEFAULT 12,
  build_time_days  SMALLINT UNSIGNED DEFAULT 3,
  FOREIGN KEY (id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS build_components (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  build_id      BIGINT UNSIGNED NOT NULL,
  component_id  BIGINT UNSIGNED NOT NULL,
  quantity      SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  is_swappable  TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (build_id)     REFERENCES builds(id) ON DELETE CASCADE,
  FOREIGN KEY (component_id) REFERENCES components(id),
  UNIQUE KEY uq_build_component (build_id, component_id),
  KEY idx_build_components_build (build_id)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. CONSTRUCTOR DE PC (USER-GENERATED)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_builds (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       CHAR(36) NOT NULL,
  name          VARCHAR(120) NOT NULL DEFAULT 'Mi PC',
  is_public     TINYINT(1) NOT NULL DEFAULT 0,
  share_token   CHAR(16) UNIQUE,
  total_price   DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_valid      TINYINT(1) NOT NULL DEFAULT 0,
  validation_errors JSON,
  notes         TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_user_builds_user (user_id, updated_at DESC),
  KEY idx_user_builds_public (is_public, total_price)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_build_components (
  user_build_id  BIGINT UNSIGNED NOT NULL,
  component_id   BIGINT UNSIGNED NOT NULL,
  quantity       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  added_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_build_id, component_id),
  FOREIGN KEY (user_build_id) REFERENCES user_builds(id) ON DELETE CASCADE,
  FOREIGN KEY (component_id)  REFERENCES components(id)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. SERVICIOS Y REPARACIONES
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_categories (
  id    SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code  VARCHAR(32) NOT NULL UNIQUE,
  name  VARCHAR(80) NOT NULL,
  icon  VARCHAR(64)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS services (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id   SMALLINT UNSIGNED NOT NULL,
  code          VARCHAR(64) UNIQUE,
  title         VARCHAR(180) NOT NULL,
  slug          VARCHAR(200) NOT NULL UNIQUE,
  description   TEXT,
  base_price    DECIMAL(10,2) NOT NULL,
  duration_minutes SMALLINT UNSIGNED,
  warranty_days SMALLINT UNSIGNED DEFAULT 30,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES service_categories(id),
  KEY idx_services_active (is_active, category_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS technicians (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     CHAR(36) UNIQUE,
  name        VARCHAR(120) NOT NULL,
  specialty   VARCHAR(120),
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS repairs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_code     VARCHAR(16) NOT NULL UNIQUE,
  user_id         CHAR(36)    NULL,
  service_id      BIGINT UNSIGNED NULL,
  device_type     VARCHAR(40) NOT NULL,
  device_brand    VARCHAR(60),
  device_model    VARCHAR(120),
  serial_number   VARCHAR(80),
  reported_issue  TEXT NOT NULL,
  diagnostic      TEXT,
  status          ENUM('received','diagnosing','quoted','approved','in_progress','waiting_parts','ready','delivered','cancelled')
                  NOT NULL DEFAULT 'received',
  priority        ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  estimated_cost  DECIMAL(10,2),
  final_cost      DECIMAL(10,2),
  appointment_at  DATETIME,
  promised_at     DATETIME,
  delivered_at    DATETIME,
  warranty_until  DATE,
  contact_phone   VARCHAR(20)  NOT NULL,
  contact_email   VARCHAR(190),
  notes_internal  TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (service_id) REFERENCES services(id),
  KEY idx_repairs_status_date (status, created_at DESC),
  KEY idx_repairs_appointment (appointment_at),
  KEY idx_repairs_user        (user_id, created_at DESC),
  KEY idx_repairs_priority    (priority, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS repair_status_history (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_id   BIGINT UNSIGNED NOT NULL,
  old_status  VARCHAR(32),
  new_status  VARCHAR(32) NOT NULL,
  comment     VARCHAR(500),
  changed_by  CHAR(36),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repair_id)  REFERENCES repairs(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_repair_history (repair_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS repair_assignments (
  repair_id     BIGINT UNSIGNED NOT NULL,
  technician_id INT UNSIGNED NOT NULL,
  assigned_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at   TIMESTAMP NULL,
  PRIMARY KEY (repair_id, technician_id, assigned_at),
  FOREIGN KEY (repair_id)     REFERENCES repairs(id) ON DELETE CASCADE,
  FOREIGN KEY (technician_id) REFERENCES technicians(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS repair_parts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_id     BIGINT UNSIGNED NOT NULL,
  component_id  BIGINT UNSIGNED NULL,
  description   VARCHAR(255) NOT NULL,
  quantity      SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price    DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (repair_id)    REFERENCES repairs(id) ON DELETE CASCADE,
  FOREIGN KEY (component_id) REFERENCES components(id),
  KEY idx_repair_parts (repair_id)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. COMERCIO
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cart_items (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         CHAR(36) NULL,
  session_id      VARCHAR(128) NULL,
  item_type       ENUM('product','build','user_build','service') NOT NULL,
  item_id         BIGINT UNSIGNED NOT NULL,
  quantity        SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price      DECIMAL(10,2) NOT NULL,
  added_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_cart_user    (user_id, added_at DESC),
  KEY idx_cart_session (session_id),
  KEY idx_cart_item    (item_type, item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_code           VARCHAR(20) NOT NULL UNIQUE,
  user_id              CHAR(36)    NULL,
  status               ENUM('pending','paid','processing','shipped','delivered','cancelled','refunded')
                       NOT NULL DEFAULT 'pending',
  subtotal             DECIMAL(10,2) NOT NULL,
  discount             DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax                  DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping             DECIMAL(10,2) NOT NULL DEFAULT 0,
  total                DECIMAL(10,2) NOT NULL,
  currency             CHAR(3) NOT NULL DEFAULT 'MXN',
  shipping_address_id  BIGINT UNSIGNED,
  billing_address_id   BIGINT UNSIGNED,
  coupon_id            BIGINT UNSIGNED NULL,
  notes                TEXT,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)             REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (shipping_address_id) REFERENCES addresses(id),
  FOREIGN KEY (billing_address_id)  REFERENCES addresses(id),
  KEY idx_orders_status_date (status, created_at DESC),
  KEY idx_orders_user        (user_id, created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      BIGINT UNSIGNED NOT NULL,
  item_type     ENUM('product','build','user_build','service','component') NOT NULL,
  item_id       BIGINT UNSIGNED NOT NULL,
  title_snapshot VARCHAR(255) NOT NULL,
  quantity      SMALLINT UNSIGNED NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL,
  total         DECIMAL(10,2) AS (quantity * unit_price) STORED,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_item  (item_type, item_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_status_history (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id    BIGINT UNSIGNED NOT NULL,
  old_status  VARCHAR(32),
  new_status  VARCHAR(32) NOT NULL,
  comment     VARCHAR(500),
  changed_by  CHAR(36),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_order_history (order_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        BIGINT UNSIGNED NOT NULL,
  provider        ENUM('stripe','mercadopago','paypal','bank_transfer','cash','oxxo') NOT NULL,
  provider_ref    VARCHAR(128),
  amount          DECIMAL(10,2) NOT NULL,
  currency        CHAR(3) NOT NULL DEFAULT 'MXN',
  status          ENUM('pending','authorized','captured','failed','refunded') NOT NULL DEFAULT 'pending',
  raw_response    JSON,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  KEY idx_payments_order  (order_id),
  KEY idx_payments_status (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shipments (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id        BIGINT UNSIGNED NOT NULL,
  carrier         VARCHAR(40) NOT NULL,
  tracking_number VARCHAR(64),
  shipped_at      TIMESTAMP NULL,
  delivered_at    TIMESTAMP NULL,
  status          ENUM('preparing','shipped','in_transit','delivered','returned') NOT NULL DEFAULT 'preparing',
  cost            DECIMAL(10,2),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  KEY idx_shipments_status (status, shipped_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoices (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      BIGINT UNSIGNED NULL,
  user_id       CHAR(36),
  rfc           VARCHAR(13) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  cfdi_use      VARCHAR(8),
  pdf_url       VARCHAR(512),
  xml_url       VARCHAR(512),
  uuid_sat      VARCHAR(36) UNIQUE,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_invoices_rfc  (rfc),
  KEY idx_invoices_user (user_id)
) ENGINE=InnoDB;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. MARKETING Y CMS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coupons (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(40) NOT NULL UNIQUE,
  description     VARCHAR(255),
  discount_type   ENUM('percent','fixed') NOT NULL,
  discount_value  DECIMAL(10,2) NOT NULL,
  min_subtotal    DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses        INT UNSIGNED,
  uses_count      INT UNSIGNED NOT NULL DEFAULT 0,
  valid_from      DATETIME,
  valid_until     DATETIME,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  KEY idx_coupons_active (is_active, valid_until)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coupon_id   BIGINT UNSIGNED NOT NULL,
  user_id     CHAR(36),
  order_id    BIGINT UNSIGNED,
  redeemed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE SET NULL,
  KEY idx_redemptions_coupon (coupon_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comments (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     CHAR(36) NULL,
  name        VARCHAR(120) NOT NULL,
  stars       TINYINT UNSIGNED NOT NULL CHECK (stars BETWEEN 1 AND 5),
  text        TEXT NOT NULL,
  approved    TINYINT(1) NOT NULL DEFAULT 0,
  user_email  VARCHAR(190),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_comments_approved_date (approved, created_at DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  item_type   ENUM('product','build','service') NOT NULL,
  item_id     BIGINT UNSIGNED NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(180),
  body        TEXT,
  approved    TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_review_per_item (user_id, item_type, item_id),
  KEY idx_reviews_item   (item_type, item_id, approved),
  KEY idx_reviews_rating (rating)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS faqs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category      VARCHAR(80) NOT NULL,
  icon          VARCHAR(64) NOT NULL,
  question      VARCHAR(500) NOT NULL,
  answer        TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_faqs_category (category, display_order),
  FULLTEXT KEY ft_faqs_search (question, answer)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS faq_unanswered (
  query       VARCHAR(255) NOT NULL PRIMARY KEY,
  count       INT UNSIGNED NOT NULL DEFAULT 1,
  first_seen  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_faq_unanswered_count (count DESC)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(190) NOT NULL UNIQUE,
  name          VARCHAR(120),
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  source        VARCHAR(64),
  subscribed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contact_messages (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(190) NOT NULL,
  phone       VARCHAR(20),
  subject     VARCHAR(180),
  message     TEXT NOT NULL,
  status      ENUM('new','read','replied','spam') NOT NULL DEFAULT 'new',
  ip          VARCHAR(45),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_contact_status (status, created_at DESC)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Esquema creado correctamente' AS resultado;
