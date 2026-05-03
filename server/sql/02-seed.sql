-- ═══════════════════════════════════════════════════════════════════════════
-- Pixon PC — Datos estáticos (seed)
-- Ejecutar después de 01-schema.sql:
--   mysql -u root -p pixon_db < 02-seed.sql
-- ═══════════════════════════════════════════════════════════════════════════

USE pixon_db;

-- Roles ─────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO roles (id, code, name, description, is_staff) VALUES
  (1, 'admin',   'Administrador',          'Acceso total al panel',                1),
  (2, 'tecnico', 'Técnico',                'Gestiona reparaciones y diagnósticos', 1),
  (3, 'editor',  'Editor de contenido',    'Edita FAQs, productos, builds',        1),
  (4, 'cliente', 'Cliente',                'Usuario final',                        0),
  (5, 'guest',   'Invitado',               'Sin sesión',                           0);

-- Tipos de componente ───────────────────────────────────────────────────────
INSERT IGNORE INTO component_types (code, name, icon, display_order, is_required_in_build) VALUES
  ('CPU',     'Procesador',             'fa-microchip',     10, 1),
  ('MOBO',    'Tarjeta madre',          'fa-server',        20, 1),
  ('RAM',     'Memoria RAM',            'fa-memory',        30, 1),
  ('GPU',     'Tarjeta gráfica',        'fa-display',       40, 0),
  ('SSD',     'Disco SSD',              'fa-hard-drive',    50, 1),
  ('HDD',     'Disco duro mecánico',    'fa-hard-drive',    51, 0),
  ('PSU',     'Fuente de poder',        'fa-plug-circle-bolt', 60, 1),
  ('CASE',    'Gabinete',               'fa-cube',          70, 1),
  ('COOLER',  'Disipador CPU',          'fa-snowflake',     80, 0),
  ('FAN',     'Ventilador',             'fa-fan',           81, 0),
  ('MONITOR', 'Monitor',                'fa-tv',            90, 0),
  ('KEYBOARD','Teclado',                'fa-keyboard',     100, 0),
  ('MOUSE',   'Mouse',                  'fa-computer-mouse',110, 0),
  ('HEADSET', 'Audífonos',              'fa-headphones',   120, 0);

-- Definiciones de atributos (clave para compatibilidad y filtros) ──────────
INSERT IGNORE INTO attribute_definitions (code, name, data_type, unit, is_filterable) VALUES
  ('cpu_socket',          'Socket del CPU',           'string', NULL,  1),
  ('mobo_socket',         'Socket de motherboard',    'string', NULL,  1),
  ('ram_type',            'Tipo de memoria',          'string', NULL,  1),     -- DDR4, DDR5
  ('ram_speed_mhz',       'Velocidad RAM',            'int',    'MHz', 1),
  ('mobo_ram_type',       'Tipo de RAM soportado',    'string', NULL,  1),
  ('mobo_max_ram_speed',  'RAM máxima soportada',     'int',    'MHz', 1),
  ('gpu_length_mm',       'Largo de la GPU',          'int',    'mm',  1),
  ('case_max_gpu_length', 'GPU máxima soportada',     'int',    'mm',  1),
  ('psu_watts',           'Watts de la fuente',       'int',    'W',   1),
  ('build_required_watts','Consumo mínimo (TDP)',     'int',    'W',   0),
  ('mobo_form_factor',    'Form factor motherboard',  'string', NULL,  1),     -- ATX, mATX, ITX
  ('case_form_factor',    'Form factor gabinete',     'string', NULL,  1),
  ('storage_interface',   'Interfaz de almacenamiento','string', NULL, 1),     -- SATA, NVMe
  ('cpu_tdp',             'TDP del CPU',              'int',    'W',   0),
  ('cpu_cores',           'Núcleos del CPU',          'int',    NULL,  1),
  ('gpu_vram_gb',         'VRAM de la GPU',           'int',    'GB',  1),
  ('ram_capacity_gb',     'Capacidad RAM',            'int',    'GB',  1),
  ('storage_capacity_gb', 'Capacidad almacenamiento', 'int',    'GB',  1);

-- Reglas de compatibilidad ─────────────────────────────────────────────────
-- Las reglas devuelven error CUANDO el operador NO se cumple entre A y B.
INSERT IGNORE INTO compatibility_rules (rule_code, type_a_id, attribute_a_id, operator, type_b_id, attribute_b_id, error_message)
SELECT 'cpu_socket_matches_mobo',
       (SELECT id FROM component_types WHERE code='CPU'),
       (SELECT id FROM attribute_definitions WHERE code='cpu_socket'),
       '=',
       (SELECT id FROM component_types WHERE code='MOBO'),
       (SELECT id FROM attribute_definitions WHERE code='mobo_socket'),
       'El socket del CPU no coincide con el de la motherboard';

INSERT IGNORE INTO compatibility_rules (rule_code, type_a_id, attribute_a_id, operator, type_b_id, attribute_b_id, error_message)
SELECT 'ram_type_matches_mobo',
       (SELECT id FROM component_types WHERE code='RAM'),
       (SELECT id FROM attribute_definitions WHERE code='ram_type'),
       '=',
       (SELECT id FROM component_types WHERE code='MOBO'),
       (SELECT id FROM attribute_definitions WHERE code='mobo_ram_type'),
       'El tipo de RAM (DDR4/DDR5) no es compatible con la motherboard';

INSERT IGNORE INTO compatibility_rules (rule_code, type_a_id, attribute_a_id, operator, type_b_id, attribute_b_id, error_message)
SELECT 'gpu_fits_in_case',
       (SELECT id FROM component_types WHERE code='GPU'),
       (SELECT id FROM attribute_definitions WHERE code='gpu_length_mm'),
       '<=',
       (SELECT id FROM component_types WHERE code='CASE'),
       (SELECT id FROM attribute_definitions WHERE code='case_max_gpu_length'),
       'La GPU es más larga que el espacio que admite el gabinete';

INSERT IGNORE INTO compatibility_rules (rule_code, type_a_id, attribute_a_id, operator, type_b_id, attribute_b_id, error_message)
SELECT 'mobo_fits_in_case',
       (SELECT id FROM component_types WHERE code='MOBO'),
       (SELECT id FROM attribute_definitions WHERE code='mobo_form_factor'),
       '=',
       (SELECT id FROM component_types WHERE code='CASE'),
       (SELECT id FROM attribute_definitions WHERE code='case_form_factor'),
       'La motherboard no encaja en el form factor del gabinete';

-- Categorías de servicio ───────────────────────────────────────────────────
INSERT IGNORE INTO service_categories (code, name, icon) VALUES
  ('mantenimiento', 'Mantenimiento',           'fa-broom'),
  ('reparacion',    'Reparación',              'fa-screwdriver-wrench'),
  ('formateo',      'Formateo y optimización', 'fa-windows'),
  ('ensamble',      'Ensamble personalizado',  'fa-screwdriver'),
  ('mac',           'Servicio Mac',            'fa-apple'),
  ('moviles',       'Celulares y tablets',     'fa-mobile'),
  ('consolas',      'Consolas',                'fa-gamepad'),
  ('impresoras',    'Impresoras',              'fa-print'),
  ('b2b',           'B2B / Empresarial',       'fa-building');

-- Categorías de producto ───────────────────────────────────────────────────
INSERT IGNORE INTO product_categories (name, slug, display_order) VALUES
  ('Componentes',  'componentes',  10),
  ('Ensambles',    'ensambles',    20),
  ('Periféricos',  'perifericos',  30),
  ('Accesorios',   'accesorios',   40),
  ('Software',     'software',     50);

SELECT 'Seed insertado correctamente' AS resultado,
       (SELECT COUNT(*) FROM roles) AS roles,
       (SELECT COUNT(*) FROM component_types) AS component_types,
       (SELECT COUNT(*) FROM attribute_definitions) AS attribute_definitions,
       (SELECT COUNT(*) FROM compatibility_rules) AS compatibility_rules,
       (SELECT COUNT(*) FROM service_categories) AS service_categories,
       (SELECT COUNT(*) FROM product_categories) AS product_categories;
