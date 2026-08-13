-- Pixon PC - motor de catalogo central (primer corte)
-- MariaDB 10.11+, InnoDB, utf8mb4.
--
-- Esta migracion es deliberadamente aditiva:
--   * no elimina ni modifica datos de products, services, builds o components;
--   * el backfill es reanudable mediante public_id deterministas y legacy links;
--   * los catalogos de control evitan strings de estado/tipo dispersos;
--   * los costos permanecen en catalog_items.cost_reference y nunca deben salir
--     por un DTO o endpoint publico.
--
-- Nota operativa: MariaDB hace COMMIT implicito alrededor de gran parte del DDL.
-- El runner debe tomar un lock de despliegue y verificar backup/checksum antes de
-- aplicar este archivo. No envolver este archivo manualmente en otra transaccion.

-- ---------------------------------------------------------------------------
-- 1. RBAC normalizado y auditoria compatible con admin_logs legado
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS permissions (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(64)  NOT NULL,
  module        VARCHAR(32)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   VARCHAR(255) NULL,
  is_sensitive  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_permissions_code UNIQUE (code),
  CONSTRAINT chk_permissions_sensitive CHECK (is_sensitive IN (0, 1)),
  KEY idx_permissions_module (module, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       TINYINT UNSIGNED  NOT NULL,
  permission_id SMALLINT UNSIGNED NOT NULL,
  granted_by    CHAR(36)          NULL,
  granted_at    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_granted_by
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_role_permissions_permission (permission_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE admin_logs
  ADD COLUMN IF NOT EXISTS request_id     VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS transaction_id CHAR(36)    NULL,
  ADD COLUMN IF NOT EXISTS before_data    JSON        NULL,
  ADD COLUMN IF NOT EXISTS after_data     JSON        NULL,
  ADD COLUMN IF NOT EXISTS metadata       JSON        NULL;

ALTER TABLE admin_logs
  ADD INDEX IF NOT EXISTS idx_admin_logs_request (request_id),
  ADD INDEX IF NOT EXISTS idx_admin_logs_transaction (transaction_id),
  ADD INDEX IF NOT EXISTS idx_admin_logs_entity_action_date (entity, action, created_at DESC);

INSERT INTO permissions (code, module, name, description, is_sensitive) VALUES
  ('catalog.view',          'catalog',    'Ver catálogo',            'Consultar artículos, categorías, atributos y medios.', 0),
  ('catalog.create',        'catalog',    'Crear publicaciones',     'Crear artículos y publicaciones en borrador.', 0),
  ('catalog.update',        'catalog',    'Editar catálogo',         'Editar artículos, categorías, atributos y badges.', 0),
  ('catalog.publish',       'catalog',    'Publicar catálogo',       'Publicar u ocultar artículos de la tienda.', 1),
  ('catalog.archive',       'catalog',    'Archivar catálogo',       'Archivar artículos sin destruir su historial.', 1),
  ('catalog.delete',        'catalog',    'Eliminar catálogo',       'Ejecutar eliminaciones permitidas por la política comercial.', 1),
  ('catalog.media.manage',  'catalog',    'Administrar multimedia',  'Subir, ordenar y retirar medios del catalogo.', 0),
  ('inventory.view',        'inventory',  'Ver inventario',          'Consultar existencias, unidades y movimientos.', 0),
  ('inventory.adjust',      'inventory',  'Ajustar inventario',      'Crear ajustes y movimientos sensibles de inventario.', 1),
  ('promotions.manage',     'promotions', 'Administrar promociones','Crear y programar promociones y bundles.', 1),
  ('orders.view',           'orders',     'Ver pedidos',             'Consultar pedidos y sus snapshots historicos.', 0),
  ('orders.manage',         'orders',     'Administrar pedidos',     'Cambiar estados validos y operar pedidos.', 1),
  ('payments.view',         'payments',   'Ver pagos',               'Consultar pagos y comprobantes.', 1),
  ('payments.approve',      'payments',   'Aprobar pagos',           'Aprobar o rechazar pagos manuales.', 1),
  ('reports.view',          'reports',    'Ver reportes',            'Consultar métricas comerciales y financieras.', 1),
  ('audit.view',            'audit',      'Ver auditoría',           'Consultar la bitácora de acciones administrativas.', 1)
ON DUPLICATE KEY UPDATE code = VALUES(code);

-- Conserva permisos personalizados existentes aunque aun no formen parte del seed.
INSERT INTO permissions (code, module, name, description, is_sensitive)
SELECT DISTINCT
  up.permission,
  LEFT(SUBSTRING_INDEX(up.permission, '.', 1), 32),
  up.permission,
  'Permiso preexistente importado desde user_permissions.',
  1
FROM user_permissions up
WHERE up.permission IS NOT NULL
  AND up.permission <> ''
ON DUPLICATE KEY UPDATE code = VALUES(code);

-- Admin conserva acceso total. Editor conserva su capacidad historica de operar
-- productos/builds, ahora expresada como permisos granulares.
INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, NULL
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'admin';

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, NULL
FROM roles r
JOIN permissions p
  ON p.code IN (
    'catalog.view', 'catalog.create', 'catalog.update',
    'catalog.publish', 'catalog.archive', 'catalog.media.manage'
  )
WHERE r.code = 'editor';

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT r.id, p.id, NULL
FROM roles r
JOIN permissions p ON p.code = 'inventory.view'
WHERE r.code = 'tecnico';

-- ---------------------------------------------------------------------------
-- 2. Catalogos de control
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS catalog_item_types (
  code          VARCHAR(24) NOT NULL PRIMARY KEY,
  name          VARCHAR(80) NOT NULL,
  sort_order    SMALLINT    NOT NULL DEFAULT 0,
  is_active     TINYINT(1)  NOT NULL DEFAULT 1,
  CONSTRAINT chk_catalog_item_types_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS catalog_item_statuses (
  code          VARCHAR(24) NOT NULL PRIMARY KEY,
  name          VARCHAR(80) NOT NULL,
  is_public     TINYINT(1)  NOT NULL DEFAULT 0,
  is_sellable   TINYINT(1)  NOT NULL DEFAULT 0,
  sort_order    SMALLINT    NOT NULL DEFAULT 0,
  CONSTRAINT chk_catalog_item_status_public CHECK (is_public IN (0, 1)),
  CONSTRAINT chk_catalog_item_status_sellable CHECK (is_sellable IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS catalog_condition_codes (
  code          VARCHAR(24) NOT NULL PRIMARY KEY,
  name          VARCHAR(80) NOT NULL,
  sort_order    SMALLINT    NOT NULL DEFAULT 0,
  is_active     TINYINT(1)  NOT NULL DEFAULT 1,
  CONSTRAINT chk_catalog_conditions_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS catalog_attribute_data_types (
  code          VARCHAR(16) NOT NULL PRIMARY KEY,
  name          VARCHAR(60) NOT NULL,
  sort_order    SMALLINT    NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS catalog_media_types (
  code          VARCHAR(24) NOT NULL PRIMARY KEY,
  name          VARCHAR(60) NOT NULL,
  sort_order    SMALLINT    NOT NULL DEFAULT 0,
  is_active     TINYINT(1)  NOT NULL DEFAULT 1,
  CONSTRAINT chk_catalog_media_types_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO catalog_item_types (code, name, sort_order, is_active) VALUES
  ('PRODUCT',   'Producto',  10, 1),
  ('EQUIPMENT', 'Equipo',    20, 1),
  ('HARDWARE',  'Hardware',  30, 1),
  ('SERVICE',   'Servicio',  40, 1),
  ('BUNDLE',    'Paquete',   50, 1)
ON DUPLICATE KEY UPDATE code = VALUES(code);

INSERT INTO catalog_item_statuses (code, name, is_public, is_sellable, sort_order) VALUES
  ('DRAFT',        'Borrador',          0, 0, 10),
  ('ACTIVE',       'Activo',            1, 1, 20),
  ('RESERVED',     'Reservado',         1, 0, 30),
  ('SOLD',         'Vendido',           1, 0, 40),
  ('OUT_OF_STOCK', 'Agotado',           1, 0, 50),
  ('HIDDEN',       'Oculto',            0, 0, 60),
  ('ARCHIVED',     'Archivado',         0, 0, 70)
ON DUPLICATE KEY UPDATE code = VALUES(code);

INSERT INTO catalog_condition_codes (code, name, sort_order, is_active) VALUES
  ('NEW',            'Nuevo',          10, 1),
  ('OPEN_BOX',       'Caja abierta',   20, 1),
  ('USED',           'Usado',          30, 1),
  ('REFURBISHED',    'Reacondicionado',40, 1),
  ('FOR_PARTS',      'Para piezas',    50, 1),
  ('NOT_APPLICABLE', 'No aplica',      60, 1)
ON DUPLICATE KEY UPDATE code = VALUES(code);

INSERT INTO catalog_attribute_data_types (code, name, sort_order) VALUES
  ('TEXT',    'Texto',    10),
  ('INTEGER', 'Entero',   20),
  ('DECIMAL', 'Decimal',  30),
  ('BOOLEAN', 'Booleano', 40),
  ('DATE',    'Fecha',    50),
  ('JSON',    'JSON',     60)
ON DUPLICATE KEY UPDATE code = VALUES(code);

INSERT INTO catalog_media_types (code, name, sort_order, is_active) VALUES
  ('IMAGE',       'Imagen',             10, 1),
  ('VIDEO',       'Video',              20, 1),
  ('DOCUMENT',    'Documento',          30, 1),
  ('TEST_REPORT', 'Reporte de pruebas', 40, 1)
ON DUPLICATE KEY UPDATE code = VALUES(code);

-- ---------------------------------------------------------------------------
-- 3. Categorias y articulos centrales
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS catalog_categories (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id     BIGINT UNSIGNED NULL,
  name          VARCHAR(100)    NOT NULL,
  slug          VARCHAR(200)    NOT NULL,
  description   VARCHAR(1000)   NULL,
  image_url     VARCHAR(512)    NULL,
  icon          VARCHAR(80)     NULL,
  sort_order    SMALLINT        NOT NULL DEFAULT 0,
  status        VARCHAR(16)     NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP       NULL,
  CONSTRAINT uq_catalog_categories_slug UNIQUE (slug),
  CONSTRAINT fk_catalog_categories_parent
    FOREIGN KEY (parent_id) REFERENCES catalog_categories(id) ON DELETE RESTRICT,
  CONSTRAINT chk_catalog_categories_status
    CHECK (status IN ('ACTIVE', 'HIDDEN', 'ARCHIVED')),
  -- MariaDB no permite referenciar una columna AUTO_INCREMENT dentro de CHECK.
  -- El servicio de catalogo valida auto-referencia y ciclos antes de persistir.
  KEY idx_catalog_categories_parent (parent_id, status, sort_order),
  KEY idx_catalog_categories_status (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS catalog_items (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  public_id            CHAR(36)       NOT NULL,
  sku                  VARCHAR(64)    NULL,
  slug                 VARCHAR(200)   NOT NULL,
  name                 VARCHAR(180)   NOT NULL,
  short_description    VARCHAR(500)   NULL,
  description          MEDIUMTEXT     NULL,
  item_type            VARCHAR(24)    NOT NULL,
  condition_code       VARCHAR(24)    NOT NULL DEFAULT 'NOT_APPLICABLE',
  status               VARCHAR(24)    NOT NULL DEFAULT 'DRAFT',
  base_price           DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  sale_price           DECIMAL(12,2)  NULL,
  cost_reference       DECIMAL(12,2)  NULL,
  currency             CHAR(3)        NOT NULL DEFAULT 'MXN',
  track_stock          TINYINT(1)     NOT NULL DEFAULT 0,
  stock_quantity       INT UNSIGNED   NOT NULL DEFAULT 0,
  reserved_quantity    INT UNSIGNED   NOT NULL DEFAULT 0,
  minimum_stock        INT UNSIGNED   NOT NULL DEFAULT 0,
  featured             TINYINT(1)     NOT NULL DEFAULT 0,
  allow_purchase       TINYINT(1)     NOT NULL DEFAULT 1,
  allow_quote          TINYINT(1)     NOT NULL DEFAULT 0,
  brand                VARCHAR(120)   NULL,
  warranty_text        VARCHAR(500)   NULL,
  seo_title            VARCHAR(180)   NULL,
  seo_description      VARCHAR(320)   NULL,
  seo_canonical_url    VARCHAR(512)   NULL,
  sold_display_mode    VARCHAR(24)    NOT NULL DEFAULT 'KEEP_VISIBLE',
  version              INT UNSIGNED   NOT NULL DEFAULT 1,
  published_at         DATETIME       NULL,
  created_by           CHAR(36)       NULL,
  updated_by           CHAR(36)       NULL,
  created_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at           TIMESTAMP      NULL,
  CONSTRAINT uq_catalog_items_public_id UNIQUE (public_id),
  CONSTRAINT uq_catalog_items_sku UNIQUE (sku),
  CONSTRAINT uq_catalog_items_slug UNIQUE (slug),
  CONSTRAINT fk_catalog_items_type
    FOREIGN KEY (item_type) REFERENCES catalog_item_types(code),
  CONSTRAINT fk_catalog_items_condition
    FOREIGN KEY (condition_code) REFERENCES catalog_condition_codes(code),
  CONSTRAINT fk_catalog_items_status
    FOREIGN KEY (status) REFERENCES catalog_item_statuses(code),
  CONSTRAINT fk_catalog_items_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_catalog_items_updated_by
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_catalog_items_prices CHECK (
    base_price >= 0
    AND (sale_price IS NULL OR (sale_price >= 0 AND sale_price <= base_price))
    AND (cost_reference IS NULL OR cost_reference >= 0)
  ),
  CONSTRAINT chk_catalog_items_stock CHECK (reserved_quantity <= stock_quantity),
  CONSTRAINT chk_catalog_items_flags CHECK (
    track_stock IN (0, 1)
    AND featured IN (0, 1)
    AND allow_purchase IN (0, 1)
    AND allow_quote IN (0, 1)
  ),
  CONSTRAINT chk_catalog_items_currency CHECK (BINARY currency REGEXP '^[A-Z]{3}$'),
  CONSTRAINT chk_catalog_items_sold_display CHECK (
    sold_display_mode IN ('KEEP_VISIBLE', 'HIDE', 'REDIRECT')
  ),
  CONSTRAINT chk_catalog_items_version CHECK (version >= 1),
  KEY idx_catalog_items_type_status (item_type, status, published_at DESC),
  KEY idx_catalog_items_status_price (status, base_price),
  KEY idx_catalog_items_featured (featured, status, published_at DESC),
  KEY idx_catalog_items_brand (brand, status),
  KEY idx_catalog_items_stock (track_stock, status, stock_quantity),
  KEY idx_catalog_items_created (created_at DESC),
  FULLTEXT KEY ft_catalog_items_search (name, short_description, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS catalog_item_categories (
  catalog_item_id BIGINT UNSIGNED NOT NULL,
  category_id     BIGINT UNSIGNED NOT NULL,
  is_primary      TINYINT(1)      NOT NULL DEFAULT 0,
  sort_order      SMALLINT        NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  primary_item_id BIGINT UNSIGNED GENERATED ALWAYS AS (
    CASE WHEN is_primary = 1 THEN catalog_item_id ELSE NULL END
  ) PERSISTENT,
  PRIMARY KEY (catalog_item_id, category_id),
  CONSTRAINT fk_catalog_item_categories_item
    FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_catalog_item_categories_category
    FOREIGN KEY (category_id) REFERENCES catalog_categories(id) ON DELETE RESTRICT,
  CONSTRAINT chk_catalog_item_categories_primary CHECK (is_primary IN (0, 1)),
  UNIQUE KEY uq_catalog_item_primary_category (primary_item_id),
  KEY idx_catalog_item_categories_category (category_id, sort_order, catalog_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------------
-- 4. Atributos tipados
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS catalog_attribute_definitions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attribute_key   VARCHAR(64)  NOT NULL,
  label           VARCHAR(100) NOT NULL,
  description     VARCHAR(500) NULL,
  data_type       VARCHAR(16)  NOT NULL,
  unit            VARCHAR(32)  NULL,
  options_json    JSON         NULL,
  filterable      TINYINT(1)   NOT NULL DEFAULT 0,
  searchable      TINYINT(1)   NOT NULL DEFAULT 0,
  required        TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order      SMALLINT     NOT NULL DEFAULT 0,
  status          VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_catalog_attribute_key UNIQUE (attribute_key),
  CONSTRAINT fk_catalog_attribute_data_type
    FOREIGN KEY (data_type) REFERENCES catalog_attribute_data_types(code),
  CONSTRAINT chk_catalog_attribute_flags CHECK (
    filterable IN (0, 1) AND searchable IN (0, 1) AND required IN (0, 1)
  ),
  CONSTRAINT chk_catalog_attribute_status CHECK (
    status IN ('ACTIVE', 'HIDDEN', 'ARCHIVED')
  ),
  KEY idx_catalog_attributes_status (status, sort_order),
  KEY idx_catalog_attributes_filter (filterable, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS catalog_category_attribute_definitions (
  category_id            BIGINT UNSIGNED NOT NULL,
  attribute_definition_id INT UNSIGNED   NOT NULL,
  is_required            TINYINT(1)      NOT NULL DEFAULT 0,
  sort_order             SMALLINT        NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, attribute_definition_id),
  CONSTRAINT fk_cat_attr_def_category
    FOREIGN KEY (category_id) REFERENCES catalog_categories(id) ON DELETE CASCADE,
  CONSTRAINT fk_cat_attr_def_attribute
    FOREIGN KEY (attribute_definition_id) REFERENCES catalog_attribute_definitions(id) ON DELETE CASCADE,
  CONSTRAINT chk_cat_attr_def_required CHECK (is_required IN (0, 1)),
  KEY idx_cat_attr_def_attribute (attribute_definition_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS catalog_item_attribute_values (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  catalog_item_id         BIGINT UNSIGNED NOT NULL,
  attribute_definition_id INT UNSIGNED    NOT NULL,
  value_text              TEXT            NULL,
  value_number            DECIMAL(20,6)   NULL,
  value_boolean           TINYINT(1)      NULL,
  value_date              DATE            NULL,
  value_json              JSON            NULL,
  sort_order              SMALLINT        NOT NULL DEFAULT 0,
  created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_catalog_item_attribute UNIQUE (catalog_item_id, attribute_definition_id),
  CONSTRAINT fk_catalog_item_attr_item
    FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_catalog_item_attr_definition
    FOREIGN KEY (attribute_definition_id) REFERENCES catalog_attribute_definitions(id) ON DELETE RESTRICT,
  CONSTRAINT chk_catalog_item_attr_boolean CHECK (
    value_boolean IS NULL OR value_boolean IN (0, 1)
  ),
  CONSTRAINT chk_catalog_item_attr_one_value CHECK (
    (value_text IS NOT NULL)
    + (value_number IS NOT NULL)
    + (value_boolean IS NOT NULL)
    + (value_date IS NOT NULL)
    + (value_json IS NOT NULL) = 1
  ),
  KEY idx_catalog_attr_value_text (attribute_definition_id, value_text(120)),
  KEY idx_catalog_attr_value_number (attribute_definition_id, value_number),
  KEY idx_catalog_attr_value_boolean (attribute_definition_id, value_boolean),
  KEY idx_catalog_attr_value_date (attribute_definition_id, value_date),
  FULLTEXT KEY ft_catalog_attr_value_text (value_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------------
-- 5. Multimedia, badges y enlaces con el esquema legado
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS catalog_media (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  catalog_item_id    BIGINT UNSIGNED NOT NULL,
  media_type         VARCHAR(24)     NOT NULL DEFAULT 'IMAGE',
  storage_key        VARCHAR(512)    NULL,
  url                VARCHAR(1024)   NULL,
  mime_type          VARCHAR(100)    NULL,
  size_bytes         BIGINT UNSIGNED NULL,
  checksum_sha256    CHAR(64)        NULL,
  alt_text           VARCHAR(255)    NULL,
  sort_order         SMALLINT        NOT NULL DEFAULT 0,
  is_primary         TINYINT(1)      NOT NULL DEFAULT 0,
  metadata           JSON            NULL,
  legacy_source_type VARCHAR(32)     NULL,
  legacy_source_id   BIGINT UNSIGNED NULL,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at         TIMESTAMP       NULL,
  primary_item_id    BIGINT UNSIGNED GENERATED ALWAYS AS (
    CASE WHEN is_primary = 1 THEN catalog_item_id ELSE NULL END
  ) PERSISTENT,
  CONSTRAINT fk_catalog_media_item
    FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_catalog_media_type
    FOREIGN KEY (media_type) REFERENCES catalog_media_types(code),
  CONSTRAINT chk_catalog_media_primary CHECK (
    is_primary IN (0, 1) AND (is_primary = 0 OR media_type = 'IMAGE')
  ),
  CONSTRAINT chk_catalog_media_location CHECK (
    NULLIF(storage_key, '') IS NOT NULL OR NULLIF(url, '') IS NOT NULL
  ),
  CONSTRAINT chk_catalog_media_legacy_pair CHECK (
    (legacy_source_type IS NULL AND legacy_source_id IS NULL)
    OR (legacy_source_type IS NOT NULL AND legacy_source_id IS NOT NULL)
  ),
  UNIQUE KEY uq_catalog_media_primary (primary_item_id),
  UNIQUE KEY uq_catalog_media_legacy (legacy_source_type, legacy_source_id),
  KEY idx_catalog_media_item (catalog_item_id, deleted_at, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS catalog_badges (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  badge_key     VARCHAR(64)  NOT NULL,
  label         VARCHAR(100) NOT NULL,
  description   VARCHAR(500) NULL,
  style_variant VARCHAR(20)  NOT NULL DEFAULT 'INFO',
  icon          VARCHAR(80)  NULL,
  status        VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
  sort_order    SMALLINT     NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_catalog_badges_key UNIQUE (badge_key),
  CONSTRAINT chk_catalog_badges_style CHECK (
    style_variant IN ('INFO', 'SUCCESS', 'WARNING', 'DANGER', 'ACCENT', 'NEUTRAL')
  ),
  CONSTRAINT chk_catalog_badges_status CHECK (
    status IN ('ACTIVE', 'HIDDEN', 'ARCHIVED')
  ),
  KEY idx_catalog_badges_status (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS catalog_item_badges (
  catalog_item_id BIGINT UNSIGNED   NOT NULL,
  badge_id        SMALLINT UNSIGNED NOT NULL,
  label_override  VARCHAR(100)      NULL,
  starts_at       DATETIME          NULL,
  ends_at         DATETIME          NULL,
  sort_order      SMALLINT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (catalog_item_id, badge_id),
  CONSTRAINT fk_catalog_item_badges_item
    FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_catalog_item_badges_badge
    FOREIGN KEY (badge_id) REFERENCES catalog_badges(id) ON DELETE CASCADE,
  CONSTRAINT chk_catalog_item_badges_dates CHECK (
    ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
  ),
  KEY idx_catalog_item_badges_active (badge_id, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS catalog_legacy_links (
  catalog_item_id   BIGINT UNSIGNED NOT NULL,
  legacy_entity_type VARCHAR(16)    NOT NULL,
  legacy_entity_id BIGINT UNSIGNED  NOT NULL,
  source_snapshot  JSON             NULL,
  synced_at        DATETIME         NULL,
  created_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (legacy_entity_type, legacy_entity_id),
  CONSTRAINT uq_catalog_legacy_item_type UNIQUE (catalog_item_id, legacy_entity_type),
  CONSTRAINT fk_catalog_legacy_item
    FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE CASCADE,
  CONSTRAINT chk_catalog_legacy_type CHECK (
    legacy_entity_type IN ('PRODUCT', 'SERVICE', 'BUILD', 'COMPONENT')
  ),
  KEY idx_catalog_legacy_item (catalog_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ---------------------------------------------------------------------------
-- 6. Seeds idempotentes de categorias, atributos y badges
-- ---------------------------------------------------------------------------

INSERT INTO catalog_categories
  (parent_id, name, slug, description, icon, sort_order, status)
VALUES
  (NULL, 'Productos',   'productos',   'Productos generales, accesorios y software.',         'fa-box',              5, 'ACTIVE'),
  (NULL, 'Equipos',     'equipos',     'Computadoras y equipos completos nuevos o usados.',   'fa-laptop',          10, 'ACTIVE'),
  (NULL, 'Hardware',    'hardware',    'Componentes, almacenamiento y periféricos.',          'fa-microchip',       20, 'ACTIVE'),
  (NULL, 'Servicios',   'servicios',   'Servicios técnicos y soporte especializado.',         'fa-screwdriver-wrench', 30, 'ACTIVE'),
  (NULL, 'Paquetes',    'paquetes',    'Combinaciones de productos y servicios.',             'fa-boxes-stacked',   40, 'ACTIVE'),
  (NULL, 'Promociones', 'promociones', 'Publicaciones y selecciones comerciales temporales.', 'fa-bolt',             50, 'ACTIVE')
ON DUPLICATE KEY UPDATE slug = VALUES(slug);

INSERT INTO catalog_categories
  (parent_id, name, slug, description, icon, sort_order, status)
SELECT p.id, seed.name, seed.slug, seed.description, seed.icon, seed.sort_order, 'ACTIVE'
FROM catalog_categories p
CROSS JOIN (
  SELECT 'Laptops' name, 'laptops' slug, 'Laptops nuevas, usadas y reacondicionadas.' description, 'fa-laptop' icon, 10 sort_order
  UNION ALL SELECT 'PC Gamer', 'pc-gamer', 'Equipos para gaming y alto rendimiento.', 'fa-gamepad', 20
  UNION ALL SELECT 'PC Oficina', 'pc-oficina', 'Computadoras para productividad y operación diaria.', 'fa-desktop', 30
  UNION ALL SELECT 'Mini PC', 'mini-pc', 'Equipos compactos para hogar y empresa.', 'fa-computer', 40
  UNION ALL SELECT 'Consolas', 'consolas', 'Consolas y equipos de entretenimiento.', 'fa-gamepad', 50
) seed
WHERE p.slug = 'equipos'
ON DUPLICATE KEY UPDATE slug = VALUES(slug);

INSERT INTO catalog_categories
  (parent_id, name, slug, description, icon, sort_order, status)
SELECT p.id, seed.name, seed.slug, seed.description, seed.icon, seed.sort_order, 'ACTIVE'
FROM catalog_categories p
CROSS JOIN (
  SELECT 'GPU' name, 'gpu' slug, 'Tarjetas graficas.' description, 'fa-display' icon, 10 sort_order
  UNION ALL SELECT 'CPU', 'cpu', 'Procesadores.', 'fa-microchip', 20
  UNION ALL SELECT 'RAM', 'ram', 'Memoria RAM.', 'fa-memory', 30
  UNION ALL SELECT 'SSD', 'ssd', 'Unidades de estado solido.', 'fa-hard-drive', 40
  UNION ALL SELECT 'HDD', 'hdd', 'Discos duros mecanicos.', 'fa-hard-drive', 50
  UNION ALL SELECT 'Motherboards', 'motherboards', 'Tarjetas madre.', 'fa-server', 60
  UNION ALL SELECT 'Fuentes de poder', 'fuentes', 'Fuentes y alimentacion.', 'fa-plug-circle-bolt', 70
  UNION ALL SELECT 'Refrigeración', 'refrigeracion', 'Disipadores, ventiladores y enfriamiento.', 'fa-snowflake', 80
  UNION ALL SELECT 'Periféricos', 'perifericos', 'Monitores, teclados, mouse y audio.', 'fa-keyboard', 90
  UNION ALL SELECT 'Accesorios', 'accesorios', 'Accesorios para equipos y estaciones de trabajo.', 'fa-plug', 100
) seed
WHERE p.slug = 'hardware'
ON DUPLICATE KEY UPDATE slug = VALUES(slug);

INSERT INTO catalog_categories
  (parent_id, name, slug, description, icon, sort_order, status)
SELECT p.id, seed.name, seed.slug, seed.description, seed.icon, seed.sort_order, 'ACTIVE'
FROM catalog_categories p
CROSS JOIN (
  SELECT 'Software y licencias' name, 'software' slug, 'Software, licencias y productos digitales.' description, 'fa-code' icon, 10 sort_order
) seed
WHERE p.slug = 'productos'
ON DUPLICATE KEY UPDATE slug = VALUES(slug);

INSERT INTO catalog_categories
  (parent_id, name, slug, description, icon, sort_order, status)
SELECT p.id, seed.name, seed.slug, seed.description, seed.icon, seed.sort_order, 'ACTIVE'
FROM catalog_categories p
CROSS JOIN (
  SELECT 'Mantenimiento' name, 'mantenimiento' slug, 'Mantenimiento preventivo y correctivo.' description, 'fa-broom' icon, 10 sort_order
  UNION ALL SELECT 'Reparaciones', 'reparaciones', 'Diagnóstico y reparación de equipos.', 'fa-screwdriver-wrench', 20
  UNION ALL SELECT 'Recuperación de datos', 'recuperacion-datos', 'Evaluación y recuperación de información.', 'fa-database', 30
  UNION ALL SELECT 'Optimización', 'optimizacion', 'Optimización de sistema y rendimiento.', 'fa-gauge-high', 40
  UNION ALL SELECT 'Instalaciones', 'instalaciones', 'Instalación y configuración de hardware o software.', 'fa-download', 50
  UNION ALL SELECT 'Diagnóstico', 'diagnostico', 'Revisión técnica antes de autorizar trabajos.', 'fa-stethoscope', 60
  UNION ALL SELECT 'Servicios empresariales', 'servicios-empresariales', 'Atención B2B y planes para empresas.', 'fa-building', 70
) seed
WHERE p.slug = 'servicios'
ON DUPLICATE KEY UPDATE slug = VALUES(slug);

INSERT INTO catalog_attribute_definitions
  (attribute_key, label, description, data_type, unit, filterable, searchable, required, sort_order, status)
VALUES
  ('cpu_model',                 'Procesador',              'Modelo del procesador.',                    'TEXT',    NULL, 1, 1, 0, 10,  'ACTIVE'),
  ('gpu_model',                 'Tarjeta gráfica',         'Modelo de GPU dedicada o integrada.',       'TEXT',    NULL, 1, 1, 0, 20,  'ACTIVE'),
  ('ram_capacity_gb',           'Memoria RAM',             'Capacidad total de memoria RAM.',           'INTEGER', 'GB', 1, 0, 0, 30,  'ACTIVE'),
  ('storage_capacity_gb',       'Almacenamiento',          'Capacidad total de almacenamiento.',        'INTEGER', 'GB', 1, 0, 0, 40,  'ACTIVE'),
  ('storage_interface',         'Tipo de almacenamiento',  'Interfaz o tecnologia de almacenamiento.',  'TEXT',    NULL, 1, 1, 0, 50,  'ACTIVE'),
  ('screen_size_inches',        'Tamaño de pantalla',      'Diagonal de pantalla.',                     'DECIMAL', 'in', 1, 0, 0, 60,  'ACTIVE'),
  ('screen_refresh_hz',         'Frecuencia de pantalla',  'Frecuencia máxima de actualización.',       'INTEGER', 'Hz', 1, 0, 0, 70,  'ACTIVE'),
  ('battery_health_percent',    'Salud de batería',        'Capacidad estimada respecto a fábrica.',    'DECIMAL', '%',  1, 0, 0, 80,  'ACTIVE'),
  ('operating_system',          'Sistema operativo',       'Sistema operativo incluido.',               'TEXT',    NULL, 1, 1, 0, 90,  'ACTIVE'),
  ('service_duration_minutes',  'Tiempo aproximado',       'Duración estimada del servicio.',           'INTEGER', 'min', 0, 0, 0, 100, 'ACTIVE'),
  ('service_warranty_days',     'Garantía del servicio',   'Días de garantía del servicio.',            'INTEGER', 'días', 0, 0, 0, 110, 'ACTIVE'),
  ('compatible_equipment',      'Equipos compatibles',     'Tipos de equipos compatibles.',             'JSON',    NULL, 1, 0, 0, 120, 'ACTIVE'),
  ('what_is_included',          'Qué incluye',             'Lista estructurada de elementos incluidos.','JSON',    NULL, 0, 0, 0, 130, 'ACTIVE'),
  ('build_category',            'Categoría de ensamble',   'Categoría técnica del build legado.',       'TEXT',    NULL, 1, 0, 0, 140, 'ACTIVE'),
  ('performance_tier',          'Nivel de rendimiento',    'Nivel de rendimiento del build.',           'TEXT',    NULL, 1, 0, 0, 150, 'ACTIVE'),
  ('estimated_fps_1080p',       'FPS estimados 1080p',     'Referencia estimada de rendimiento.',       'INTEGER', 'FPS', 0, 0, 0, 160, 'ACTIVE'),
  ('estimated_fps_1440p',       'FPS estimados 1440p',     'Referencia estimada de rendimiento.',       'INTEGER', 'FPS', 0, 0, 0, 170, 'ACTIVE'),
  ('build_time_days',           'Tiempo de ensamble',      'Días estimados para preparar el ensamble.', 'INTEGER', 'días', 0, 0, 0, 180, 'ACTIVE'),
  ('legacy_specs',              'Especificaciones legado', 'Snapshot estructurado de specs anteriores.','JSON',    NULL, 0, 0, 0, 900, 'HIDDEN')
ON DUPLICATE KEY UPDATE attribute_key = VALUES(attribute_key);

-- Adapta definiciones del armador existente sin renombrarlas ni eliminarlas.
INSERT INTO catalog_attribute_definitions
  (attribute_key, label, data_type, unit, filterable, searchable, required, sort_order, status)
SELECT
  ad.code,
  ad.name,
  CASE ad.data_type
    WHEN 'string'  THEN 'TEXT'
    WHEN 'int'     THEN 'INTEGER'
    WHEN 'decimal' THEN 'DECIMAL'
    WHEN 'bool'    THEN 'BOOLEAN'
  END,
  ad.unit,
  CASE WHEN ad.is_filterable = 1 THEN 1 ELSE 0 END,
  CASE WHEN ad.data_type = 'string' THEN 1 ELSE 0 END,
  0,
  500,
  'ACTIVE'
FROM attribute_definitions ad
ON DUPLICATE KEY UPDATE attribute_key = VALUES(attribute_key);

INSERT INTO catalog_category_attribute_definitions
  (category_id, attribute_definition_id, is_required, sort_order)
SELECT c.id, a.id, seed.is_required, seed.sort_order
FROM (
  SELECT 'laptops' category_slug, 'cpu_model' attribute_key, 0 is_required, 10 sort_order
  UNION ALL SELECT 'laptops', 'gpu_model', 0, 20
  UNION ALL SELECT 'laptops', 'ram_capacity_gb', 0, 30
  UNION ALL SELECT 'laptops', 'storage_capacity_gb', 0, 40
  UNION ALL SELECT 'laptops', 'storage_interface', 0, 50
  UNION ALL SELECT 'laptops', 'screen_size_inches', 0, 60
  UNION ALL SELECT 'laptops', 'screen_refresh_hz', 0, 70
  UNION ALL SELECT 'laptops', 'battery_health_percent', 0, 80
  UNION ALL SELECT 'laptops', 'operating_system', 0, 90
  UNION ALL SELECT 'servicios', 'service_duration_minutes', 0, 10
  UNION ALL SELECT 'servicios', 'service_warranty_days', 0, 20
  UNION ALL SELECT 'servicios', 'compatible_equipment', 0, 30
  UNION ALL SELECT 'servicios', 'what_is_included', 0, 40
  UNION ALL SELECT 'pc-gamer', 'build_category', 0, 100
  UNION ALL SELECT 'pc-gamer', 'performance_tier', 0, 110
  UNION ALL SELECT 'pc-gamer', 'estimated_fps_1080p', 0, 120
  UNION ALL SELECT 'pc-gamer', 'estimated_fps_1440p', 0, 130
  UNION ALL SELECT 'pc-gamer', 'build_time_days', 0, 140
) seed
JOIN catalog_categories c ON c.slug = seed.category_slug
JOIN catalog_attribute_definitions a ON a.attribute_key = seed.attribute_key
ON DUPLICATE KEY UPDATE attribute_definition_id = VALUES(attribute_definition_id);

-- Las definiciones antiguas de componentes quedan disponibles bajo Hardware.
INSERT IGNORE INTO catalog_category_attribute_definitions
  (category_id, attribute_definition_id, is_required, sort_order)
SELECT c.id, a.id, 0, 500
FROM attribute_definitions old_a
JOIN catalog_attribute_definitions a ON a.attribute_key = old_a.code
JOIN catalog_categories c ON c.slug = 'hardware';

INSERT INTO catalog_badges
  (badge_key, label, description, style_variant, icon, status, sort_order)
VALUES
  ('MEGA_OFFER',          'Mega oferta',        'Precio especial destacado.',                  'DANGER',  'fa-bolt',          'ACTIVE', 10),
  ('TAKE_IT_NOW',         'Llévatelo ahora',    'Llamado de compra de disponibilidad corta.', 'ACCENT',  'fa-cart-shopping', 'ACTIVE', 20),
  ('EQUIPMENT_AVAILABLE', 'Equipo disponible',  'Equipo disponible para compra.',              'SUCCESS', 'fa-circle-check',  'ACTIVE', 30),
  ('LAST_UNITS',          'Últimas unidades',   'Existencia limitada.',                        'WARNING', 'fa-box-open',      'ACTIVE', 40),
  ('RECOMMENDED',         'Recomendado',         'Selección destacada por Pixon PC.',            'ACCENT',  'fa-star',          'ACTIVE', 50),
  ('SAVINGS',             'Ahorra',              'Ahorro calculado por el motor de precios.',    'SUCCESS', 'fa-piggy-bank',    'ACTIVE', 60),
  ('BUSINESS_OFFER',      'Oferta empresarial',  'Propuesta dirigida a clientes B2B.',          'INFO',    'fa-building',      'ACTIVE', 70),
  ('OFFER_ENDED',         'Oferta finalizada',   'La vigencia comercial terminó.',              'NEUTRAL', 'fa-clock',         'ACTIVE', 80),
  ('SOLD',                'Vendido',             'Artículo vendido que conserva su historial.', 'NEUTRAL', 'fa-circle-check',  'ACTIVE', 90)
ON DUPLICATE KEY UPDATE badge_key = VALUES(badge_key);

-- ---------------------------------------------------------------------------
-- 7. Backfill seguro: products y builds comparten un solo catalog_item
-- ---------------------------------------------------------------------------

INSERT INTO catalog_items (
  public_id, sku, slug, name, short_description, description,
  item_type, condition_code, status,
  base_price, sale_price, cost_reference, currency,
  track_stock, stock_quantity, reserved_quantity, minimum_stock,
  featured, allow_purchase, allow_quote,
  warranty_text, seo_title, seo_description, sold_display_mode,
  published_at, created_at, updated_at, deleted_at
)
SELECT
  CONCAT(
    SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 1, 8), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 9, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 13, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 17, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 21, 12)
  ),
  CASE
    WHEN NULLIF(TRIM(p.sku), '') IS NULL
      OR EXISTS (SELECT 1 FROM catalog_items sku_ci WHERE sku_ci.sku = p.sku)
      THEN NULL
    ELSE p.sku
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM catalog_items slug_ci WHERE slug_ci.slug = p.slug)
      THEN CONCAT(LEFT(p.slug, 180), '-', LEFT(MD5(CONCAT('product:', p.id)), 12))
    ELSE p.slug
  END,
  p.title,
  LEFT(p.description, 500),
  p.description,
  CASE WHEN b.id IS NOT NULL OR p.type = 'build' THEN 'BUNDLE' ELSE 'PRODUCT' END,
  'NEW',
  CASE
    WHEN p.deleted_at IS NOT NULL THEN 'ARCHIVED'
    WHEN p.is_active = 0 THEN 'HIDDEN'
    WHEN b.id IS NULL AND p.stock <= 0 THEN 'OUT_OF_STOCK'
    ELSE 'ACTIVE'
  END,
  GREATEST(CASE WHEN p.compare_price IS NOT NULL AND p.compare_price > p.price THEN p.compare_price ELSE p.price END, 0),
  CASE
    WHEN p.compare_price IS NOT NULL AND p.compare_price > p.price
      THEN GREATEST(p.price, 0)
    ELSE NULL
  END,
  CASE WHEN p.cost IS NULL OR p.cost < 0 THEN NULL ELSE p.cost END,
  'MXN',
  CASE WHEN b.id IS NOT NULL OR p.type = 'build' THEN 0 ELSE 1 END,
  GREATEST(p.stock, 0),
  0,
  GREATEST(p.stock_alert, 0),
  CASE WHEN p.is_featured = 1 THEN 1 ELSE 0 END,
  CASE
    WHEN p.deleted_at IS NULL AND p.is_active = 1
      AND (b.id IS NOT NULL OR p.type = 'build' OR p.stock > 0) THEN 1
    ELSE 0
  END,
  CASE
    WHEN p.deleted_at IS NULL AND p.is_active = 1
      AND (b.id IS NOT NULL OR p.type = 'build') THEN 1
    ELSE 0
  END,
  CASE WHEN b.warranty_months IS NOT NULL THEN CONCAT(b.warranty_months, ' meses') ELSE NULL END,
  p.meta_title,
  p.meta_description,
  'KEEP_VISIBLE',
  CASE WHEN p.deleted_at IS NULL AND p.is_active = 1 THEN p.created_at ELSE NULL END,
  p.created_at,
  p.updated_at,
  p.deleted_at
FROM products p
LEFT JOIN builds b ON b.id = p.id
LEFT JOIN catalog_legacy_links existing_link
  ON existing_link.legacy_entity_type = 'PRODUCT'
 AND existing_link.legacy_entity_id = p.id
WHERE existing_link.catalog_item_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM catalog_items deterministic_item
    WHERE deterministic_item.public_id = CONCAT(
      SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 1, 8), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 9, 4), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 13, 4), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 17, 4), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 21, 12)
    )
  );

INSERT IGNORE INTO catalog_legacy_links
  (catalog_item_id, legacy_entity_type, legacy_entity_id, source_snapshot)
SELECT
  ci.id,
  'PRODUCT',
  p.id,
  JSON_OBJECT(
    'sku', p.sku,
    'slug', p.slug,
    'type', p.type,
    'category_id', p.category_id,
    'price', p.price,
    'compare_price', p.compare_price,
    'stock', p.stock
  )
FROM products p
JOIN catalog_items ci
  ON ci.public_id = CONCAT(
    SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 1, 8), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 9, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 13, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 17, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:product:', p.id)), 21, 12)
  );

INSERT IGNORE INTO catalog_legacy_links
  (catalog_item_id, legacy_entity_type, legacy_entity_id, source_snapshot)
SELECT
  product_link.catalog_item_id,
  'BUILD',
  b.id,
  JSON_OBJECT(
    'build_category', b.build_category,
    'performance_tier', b.performance_tier,
    'estimated_fps_1080p', b.estimated_fps_1080p,
    'estimated_fps_1440p', b.estimated_fps_1440p,
    'warranty_months', b.warranty_months,
    'build_time_days', b.build_time_days
  )
FROM builds b
JOIN catalog_legacy_links product_link
  ON product_link.legacy_entity_type = 'PRODUCT'
 AND product_link.legacy_entity_id = b.id;

INSERT IGNORE INTO catalog_item_categories
  (catalog_item_id, category_id, is_primary, sort_order)
SELECT
  product_link.catalog_item_id,
  c.id,
  1,
  0
FROM products p
JOIN catalog_legacy_links product_link
  ON product_link.legacy_entity_type = 'PRODUCT'
 AND product_link.legacy_entity_id = p.id
LEFT JOIN builds b ON b.id = p.id
LEFT JOIN product_categories legacy_category ON legacy_category.id = p.category_id
JOIN catalog_categories c
  ON c.slug = CASE
    WHEN b.build_category IN ('gaming', 'streaming') THEN 'pc-gamer'
    WHEN b.build_category IN ('office', 'workstation', 'starter') THEN 'pc-oficina'
    WHEN b.id IS NOT NULL OR p.type = 'build' THEN 'equipos'
    WHEN legacy_category.slug = 'componentes' THEN 'hardware'
    WHEN legacy_category.slug = 'ensambles' THEN 'equipos'
    WHEN legacy_category.slug = 'perifericos' THEN 'perifericos'
    WHEN legacy_category.slug = 'accesorios' THEN 'accesorios'
    WHEN legacy_category.slug = 'software' THEN 'software'
    WHEN p.type = 'accessory' THEN 'accesorios'
    WHEN p.type = 'peripheral' THEN 'perifericos'
    ELSE 'productos'
  END;

INSERT IGNORE INTO catalog_item_badges (catalog_item_id, badge_id, sort_order)
SELECT product_link.catalog_item_id, badge.id, 10
FROM products p
JOIN catalog_legacy_links product_link
  ON product_link.legacy_entity_type = 'PRODUCT'
 AND product_link.legacy_entity_id = p.id
JOIN catalog_badges badge ON badge.badge_key = 'RECOMMENDED'
WHERE p.is_featured = 1;

INSERT IGNORE INTO catalog_item_badges (catalog_item_id, badge_id, sort_order)
SELECT product_link.catalog_item_id, badge.id, 20
FROM products p
JOIN catalog_legacy_links product_link
  ON product_link.legacy_entity_type = 'PRODUCT'
 AND product_link.legacy_entity_id = p.id
JOIN catalog_badges badge ON badge.badge_key = 'MEGA_OFFER'
WHERE p.compare_price IS NOT NULL AND p.compare_price > p.price;

INSERT IGNORE INTO catalog_item_badges (catalog_item_id, badge_id, sort_order)
SELECT product_link.catalog_item_id, badge.id, 30
FROM products p
JOIN catalog_legacy_links product_link
  ON product_link.legacy_entity_type = 'PRODUCT'
 AND product_link.legacy_entity_id = p.id
JOIN catalog_badges badge ON badge.badge_key = 'LAST_UNITS'
LEFT JOIN builds b ON b.id = p.id
WHERE b.id IS NULL AND p.stock = 1;

-- Normaliza multiples flags is_primary legados eligiendo una sola imagen por item.
INSERT IGNORE INTO catalog_media (
  catalog_item_id, media_type, url, alt_text, sort_order, is_primary,
  metadata, legacy_source_type, legacy_source_id, created_at
)
SELECT
  product_link.catalog_item_id,
  'IMAGE',
  image.url,
  image.alt,
  image.sort_order,
  CASE WHEN image.id = (
    SELECT selected_image.id
    FROM product_images selected_image
    WHERE selected_image.product_id = image.product_id
    ORDER BY selected_image.is_primary DESC, selected_image.sort_order ASC, selected_image.id ASC
    LIMIT 1
  ) THEN 1 ELSE 0 END,
  JSON_OBJECT('legacy_product_id', image.product_id),
  'PRODUCT_IMAGE',
  image.id,
  CURRENT_TIMESTAMP
FROM product_images image
JOIN catalog_legacy_links product_link
  ON product_link.legacy_entity_type = 'PRODUCT'
 AND product_link.legacy_entity_id = image.product_id
WHERE NULLIF(TRIM(image.url), '') IS NOT NULL;

-- Atributos estructurados propios de builds.
INSERT IGNORE INTO catalog_item_attribute_values
  (catalog_item_id, attribute_definition_id, value_text)
SELECT link.catalog_item_id, definition.id, b.build_category
FROM builds b
JOIN catalog_legacy_links link
  ON link.legacy_entity_type = 'BUILD' AND link.legacy_entity_id = b.id
JOIN catalog_attribute_definitions definition ON definition.attribute_key = 'build_category'
WHERE b.build_category IS NOT NULL;

INSERT IGNORE INTO catalog_item_attribute_values
  (catalog_item_id, attribute_definition_id, value_text)
SELECT link.catalog_item_id, definition.id, b.performance_tier
FROM builds b
JOIN catalog_legacy_links link
  ON link.legacy_entity_type = 'BUILD' AND link.legacy_entity_id = b.id
JOIN catalog_attribute_definitions definition ON definition.attribute_key = 'performance_tier'
WHERE b.performance_tier IS NOT NULL;

INSERT IGNORE INTO catalog_item_attribute_values
  (catalog_item_id, attribute_definition_id, value_number)
SELECT link.catalog_item_id, definition.id, b.estimated_fps_1080p
FROM builds b
JOIN catalog_legacy_links link
  ON link.legacy_entity_type = 'BUILD' AND link.legacy_entity_id = b.id
JOIN catalog_attribute_definitions definition ON definition.attribute_key = 'estimated_fps_1080p'
WHERE b.estimated_fps_1080p IS NOT NULL;

INSERT IGNORE INTO catalog_item_attribute_values
  (catalog_item_id, attribute_definition_id, value_number)
SELECT link.catalog_item_id, definition.id, b.estimated_fps_1440p
FROM builds b
JOIN catalog_legacy_links link
  ON link.legacy_entity_type = 'BUILD' AND link.legacy_entity_id = b.id
JOIN catalog_attribute_definitions definition ON definition.attribute_key = 'estimated_fps_1440p'
WHERE b.estimated_fps_1440p IS NOT NULL;

INSERT IGNORE INTO catalog_item_attribute_values
  (catalog_item_id, attribute_definition_id, value_number)
SELECT link.catalog_item_id, definition.id, b.build_time_days
FROM builds b
JOIN catalog_legacy_links link
  ON link.legacy_entity_type = 'BUILD' AND link.legacy_entity_id = b.id
JOIN catalog_attribute_definitions definition ON definition.attribute_key = 'build_time_days'
WHERE b.build_time_days IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 8. Backfill seguro: services
-- ---------------------------------------------------------------------------

INSERT INTO catalog_items (
  public_id, sku, slug, name, short_description, description,
  item_type, condition_code, status,
  base_price, currency, track_stock, stock_quantity, reserved_quantity,
  minimum_stock, featured, allow_purchase, allow_quote,
  warranty_text, sold_display_mode, published_at, created_at, updated_at
)
SELECT
  CONCAT(
    SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 1, 8), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 9, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 13, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 17, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 21, 12)
  ),
  CASE
    WHEN NULLIF(TRIM(s.code), '') IS NULL
      OR EXISTS (SELECT 1 FROM catalog_items sku_ci WHERE sku_ci.sku = s.code)
      THEN NULL
    ELSE s.code
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM catalog_items slug_ci WHERE slug_ci.slug = s.slug)
      THEN CONCAT(LEFT(s.slug, 180), '-', LEFT(MD5(CONCAT('service:', s.id)), 12))
    ELSE s.slug
  END,
  s.title,
  LEFT(s.description, 500),
  s.description,
  'SERVICE',
  'NOT_APPLICABLE',
  CASE WHEN s.is_active = 1 THEN 'ACTIVE' ELSE 'HIDDEN' END,
  GREATEST(s.base_price, 0),
  'MXN',
  0,
  0,
  0,
  0,
  0,
  s.is_active,
  s.is_active,
  CASE WHEN s.warranty_days IS NOT NULL THEN CONCAT(s.warranty_days, ' días') ELSE NULL END,
  'KEEP_VISIBLE',
  CASE WHEN s.is_active = 1 THEN s.created_at ELSE NULL END,
  s.created_at,
  s.created_at
FROM services s
LEFT JOIN catalog_legacy_links existing_link
  ON existing_link.legacy_entity_type = 'SERVICE'
 AND existing_link.legacy_entity_id = s.id
WHERE existing_link.catalog_item_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM catalog_items deterministic_item
    WHERE deterministic_item.public_id = CONCAT(
      SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 1, 8), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 9, 4), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 13, 4), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 17, 4), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 21, 12)
    )
  );

INSERT IGNORE INTO catalog_legacy_links
  (catalog_item_id, legacy_entity_type, legacy_entity_id, source_snapshot)
SELECT
  ci.id,
  'SERVICE',
  s.id,
  JSON_OBJECT(
    'code', s.code,
    'slug', s.slug,
    'category_id', s.category_id,
    'base_price', s.base_price,
    'duration_minutes', s.duration_minutes,
    'warranty_days', s.warranty_days
  )
FROM services s
JOIN catalog_items ci
  ON ci.public_id = CONCAT(
    SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 1, 8), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 9, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 13, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 17, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:service:', s.id)), 21, 12)
  );

INSERT IGNORE INTO catalog_item_categories
  (catalog_item_id, category_id, is_primary, sort_order)
SELECT
  service_link.catalog_item_id,
  category.id,
  1,
  0
FROM services service
JOIN service_categories legacy_category ON legacy_category.id = service.category_id
JOIN catalog_legacy_links service_link
  ON service_link.legacy_entity_type = 'SERVICE'
 AND service_link.legacy_entity_id = service.id
JOIN catalog_categories category
  ON category.slug = CASE legacy_category.code
    WHEN 'mantenimiento' THEN 'mantenimiento'
    WHEN 'reparacion' THEN 'reparaciones'
    WHEN 'formateo' THEN 'optimizacion'
    WHEN 'ensamble' THEN 'instalaciones'
    WHEN 'b2b' THEN 'servicios-empresariales'
    ELSE 'reparaciones'
  END;

INSERT IGNORE INTO catalog_item_attribute_values
  (catalog_item_id, attribute_definition_id, value_number)
SELECT service_link.catalog_item_id, definition.id, service.duration_minutes
FROM services service
JOIN catalog_legacy_links service_link
  ON service_link.legacy_entity_type = 'SERVICE'
 AND service_link.legacy_entity_id = service.id
JOIN catalog_attribute_definitions definition
  ON definition.attribute_key = 'service_duration_minutes'
WHERE service.duration_minutes IS NOT NULL;

INSERT IGNORE INTO catalog_item_attribute_values
  (catalog_item_id, attribute_definition_id, value_number)
SELECT service_link.catalog_item_id, definition.id, service.warranty_days
FROM services service
JOIN catalog_legacy_links service_link
  ON service_link.legacy_entity_type = 'SERVICE'
 AND service_link.legacy_entity_id = service.id
JOIN catalog_attribute_definitions definition
  ON definition.attribute_key = 'service_warranty_days'
WHERE service.warranty_days IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 9. Backfill seguro: components, atributos e imagenes
-- ---------------------------------------------------------------------------

INSERT INTO catalog_items (
  public_id, sku, slug, name, short_description, description,
  item_type, condition_code, status,
  base_price, cost_reference, currency,
  track_stock, stock_quantity, reserved_quantity, minimum_stock,
  featured, allow_purchase, allow_quote, brand, warranty_text,
  sold_display_mode, published_at, created_at, updated_at, deleted_at
)
SELECT
  CONCAT(
    SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 1, 8), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 9, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 13, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 17, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 21, 12)
  ),
  CASE
    WHEN NULLIF(TRIM(component.sku), '') IS NULL
      OR EXISTS (SELECT 1 FROM catalog_items sku_ci WHERE sku_ci.sku = component.sku)
      THEN NULL
    ELSE component.sku
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM catalog_items slug_ci WHERE slug_ci.slug = component.slug)
      THEN CONCAT(LEFT(component.slug, 180), '-', LEFT(MD5(CONCAT('component:', component.id)), 12))
    ELSE component.slug
  END,
  component.model,
  LEFT(component.description, 500),
  component.description,
  'HARDWARE',
  'NEW',
  CASE
    WHEN component.deleted_at IS NOT NULL THEN 'ARCHIVED'
    WHEN component.is_active = 0 THEN 'HIDDEN'
    WHEN component.stock <= 0 THEN 'OUT_OF_STOCK'
    ELSE 'ACTIVE'
  END,
  GREATEST(component.price, 0),
  CASE WHEN component.cost IS NULL OR component.cost < 0 THEN NULL ELSE component.cost END,
  'MXN',
  1,
  GREATEST(component.stock, 0),
  0,
  GREATEST(component.stock_alert, 0),
  0,
  CASE
    WHEN component.deleted_at IS NULL AND component.is_active = 1 AND component.stock > 0
      THEN 1 ELSE 0
  END,
  0,
  brand.name,
  CASE WHEN component.warranty_months IS NOT NULL THEN CONCAT(component.warranty_months, ' meses') ELSE NULL END,
  'KEEP_VISIBLE',
  CASE WHEN component.deleted_at IS NULL AND component.is_active = 1 THEN component.created_at ELSE NULL END,
  component.created_at,
  component.updated_at,
  component.deleted_at
FROM components component
JOIN brands brand ON brand.id = component.brand_id
LEFT JOIN catalog_legacy_links existing_link
  ON existing_link.legacy_entity_type = 'COMPONENT'
 AND existing_link.legacy_entity_id = component.id
WHERE existing_link.catalog_item_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM catalog_items deterministic_item
    WHERE deterministic_item.public_id = CONCAT(
      SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 1, 8), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 9, 4), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 13, 4), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 17, 4), '-',
      SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 21, 12)
    )
  );

INSERT IGNORE INTO catalog_legacy_links
  (catalog_item_id, legacy_entity_type, legacy_entity_id, source_snapshot)
SELECT
  ci.id,
  'COMPONENT',
  component.id,
  JSON_OBJECT(
    'sku', component.sku,
    'slug', component.slug,
    'type_id', component.type_id,
    'brand_id', component.brand_id,
    'price', component.price,
    'stock', component.stock
  )
FROM components component
JOIN catalog_items ci
  ON ci.public_id = CONCAT(
    SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 1, 8), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 9, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 13, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 17, 4), '-',
    SUBSTRING(MD5(CONCAT('pixon:catalog:component:', component.id)), 21, 12)
  );

INSERT IGNORE INTO catalog_item_categories
  (catalog_item_id, category_id, is_primary, sort_order)
SELECT
  component_link.catalog_item_id,
  category.id,
  1,
  0
FROM components component
JOIN component_types legacy_type ON legacy_type.id = component.type_id
JOIN catalog_legacy_links component_link
  ON component_link.legacy_entity_type = 'COMPONENT'
 AND component_link.legacy_entity_id = component.id
JOIN catalog_categories category
  ON category.slug = CASE legacy_type.code
    WHEN 'GPU' THEN 'gpu'
    WHEN 'CPU' THEN 'cpu'
    WHEN 'RAM' THEN 'ram'
    WHEN 'SSD' THEN 'ssd'
    WHEN 'HDD' THEN 'hdd'
    WHEN 'MOBO' THEN 'motherboards'
    WHEN 'PSU' THEN 'fuentes'
    WHEN 'COOLER' THEN 'refrigeracion'
    WHEN 'FAN' THEN 'refrigeracion'
    WHEN 'MONITOR' THEN 'perifericos'
    WHEN 'KEYBOARD' THEN 'perifericos'
    WHEN 'MOUSE' THEN 'perifericos'
    WHEN 'HEADSET' THEN 'perifericos'
    ELSE 'hardware'
  END;

INSERT IGNORE INTO catalog_item_badges (catalog_item_id, badge_id, sort_order)
SELECT component_link.catalog_item_id, badge.id, 30
FROM components component
JOIN catalog_legacy_links component_link
  ON component_link.legacy_entity_type = 'COMPONENT'
 AND component_link.legacy_entity_id = component.id
JOIN catalog_badges badge ON badge.badge_key = 'LAST_UNITS'
WHERE component.stock = 1;

INSERT IGNORE INTO catalog_media (
  catalog_item_id, media_type, url, alt_text, sort_order, is_primary,
  metadata, legacy_source_type, legacy_source_id, created_at
)
SELECT
  component_link.catalog_item_id,
  'IMAGE',
  image.url,
  image.alt,
  image.sort_order,
  CASE WHEN image.id = (
    SELECT selected_image.id
    FROM component_images selected_image
    WHERE selected_image.component_id = image.component_id
    ORDER BY selected_image.is_primary DESC, selected_image.sort_order ASC, selected_image.id ASC
    LIMIT 1
  ) THEN 1 ELSE 0 END,
  JSON_OBJECT('legacy_component_id', image.component_id),
  'COMPONENT_IMAGE',
  image.id,
  CURRENT_TIMESTAMP
FROM component_images image
JOIN catalog_legacy_links component_link
  ON component_link.legacy_entity_type = 'COMPONENT'
 AND component_link.legacy_entity_id = image.component_id
WHERE NULLIF(TRIM(image.url), '') IS NOT NULL;

INSERT IGNORE INTO catalog_item_attribute_values (
  catalog_item_id, attribute_definition_id,
  value_text, value_number, value_boolean, value_date, value_json,
  sort_order
)
SELECT
  component_link.catalog_item_id,
  new_definition.id,
  CASE WHEN old_definition.data_type = 'string' THEN component_value.value_string ELSE NULL END,
  CASE
    WHEN old_definition.data_type = 'int' THEN component_value.value_int
    WHEN old_definition.data_type = 'decimal' THEN component_value.value_decimal
    ELSE NULL
  END,
  CASE
    WHEN old_definition.data_type = 'bool'
      THEN CASE WHEN component_value.value_bool = 0 THEN 0 ELSE 1 END
    ELSE NULL
  END,
  NULL,
  NULL,
  0
FROM component_attributes component_value
JOIN attribute_definitions old_definition
  ON old_definition.id = component_value.attribute_id
JOIN catalog_attribute_definitions new_definition
  ON new_definition.attribute_key = old_definition.code
JOIN catalog_legacy_links component_link
  ON component_link.legacy_entity_type = 'COMPONENT'
 AND component_link.legacy_entity_id = component_value.component_id
WHERE
  (old_definition.data_type = 'string' AND component_value.value_string IS NOT NULL)
  OR (old_definition.data_type = 'int' AND component_value.value_int IS NOT NULL)
  OR (old_definition.data_type = 'decimal' AND component_value.value_decimal IS NOT NULL)
  OR (old_definition.data_type = 'bool' AND component_value.value_bool IS NOT NULL);

INSERT IGNORE INTO catalog_item_attribute_values
  (catalog_item_id, attribute_definition_id, value_json)
SELECT component_link.catalog_item_id, definition.id, component.specs
FROM components component
JOIN catalog_legacy_links component_link
  ON component_link.legacy_entity_type = 'COMPONENT'
 AND component_link.legacy_entity_id = component.id
JOIN catalog_attribute_definitions definition ON definition.attribute_key = 'legacy_specs'
WHERE component.specs IS NOT NULL;

-- Fin del primer corte. Las tablas legacy permanecen intactas y pueden seguir
-- atendiendo las rutas actuales durante el despliegue gradual.
