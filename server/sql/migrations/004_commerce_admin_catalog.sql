-- Pixon PC - catalogo administrativo extensible
-- MariaDB 10.11+, InnoDB, utf8mb4. Migracion aditiva y reanudable.

CREATE TABLE IF NOT EXISTS catalog_product_kinds (
  code          VARCHAR(40) NOT NULL PRIMARY KEY,
  item_type     VARCHAR(24) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   VARCHAR(500) NULL,
  icon          VARCHAR(80) NULL,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_catalog_product_kinds_item_type
    FOREIGN KEY (item_type) REFERENCES catalog_item_types(code),
  CONSTRAINT chk_catalog_product_kinds_active CHECK (is_active IN (0, 1)),
  KEY idx_catalog_product_kinds_type (item_type, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO catalog_product_kinds (code, item_type, name, description, icon, sort_order, is_active) VALUES
  ('LAPTOP',       'EQUIPMENT', 'Laptop',                 'Equipo portatil completo.',                    'fa-laptop', 10, 1),
  ('GAMING_PC',    'EQUIPMENT', 'PC Gamer / PC armada',   'Equipo armado y sus componentes.',             'fa-desktop', 20, 1),
  ('PC_COMPONENT', 'HARDWARE',  'Componente de PC',       'Componente sin subtipo mas especifico.',       'fa-microchip', 30, 1),
  ('CPU',          'HARDWARE',  'Procesador',             'Procesador de escritorio o portatil.',         'fa-microchip', 40, 1),
  ('GPU',          'HARDWARE',  'Tarjeta grafica',        'Tarjeta de video dedicada.',                   'fa-display', 50, 1),
  ('RAM',          'HARDWARE',  'Memoria RAM',            'Modulo o kit de memoria.',                     'fa-memory', 60, 1),
  ('STORAGE',      'HARDWARE',  'Almacenamiento',         'SSD, NVMe, disco duro u otra unidad.',         'fa-hard-drive', 70, 1),
  ('MOTHERBOARD',  'HARDWARE',  'Tarjeta madre',          'Placa base para PC.',                          'fa-microchip', 80, 1),
  ('PSU',          'HARDWARE',  'Fuente de poder',        'Fuente y alimentacion electrica.',             'fa-plug', 90, 1),
  ('CASE',         'HARDWARE',  'Gabinete',               'Gabinete para ensamble.',                      'fa-box', 100, 1),
  ('COOLING',      'HARDWARE',  'Refrigeracion',          'Disipador, ventilador o liquida.',             'fa-fan', 110, 1),
  ('PART',         'HARDWARE',  'Pieza / refaccion',      'Pieza con compatibilidad tecnica controlada.', 'fa-screwdriver-wrench', 120, 1),
  ('PERIPHERAL',   'PRODUCT',   'Periferico',             'Mouse, teclado, headset u otro periferico.',   'fa-computer-mouse', 130, 1),
  ('MONITOR',      'PRODUCT',   'Monitor',                'Pantalla o monitor externo.',                  'fa-display', 140, 1),
  ('PHONE',        'EQUIPMENT', 'Celular',                'Telefono movil.',                              'fa-mobile-screen', 150, 1),
  ('CONSOLE',      'EQUIPMENT', 'Consola',                'Consola de videojuegos.',                      'fa-gamepad', 160, 1),
  ('ACCESSORY',    'PRODUCT',   'Accesorio',              'Accesorio de computo o tecnologia.',          'fa-headphones', 170, 1),
  ('PRINTER',      'EQUIPMENT', 'Impresora',              'Impresora o multifuncional.',                  'fa-print', 180, 1),
  ('GENERAL',      'PRODUCT',   'Producto general',       'Producto sin una ficha tecnica especializada.','fa-box', 190, 1),
  ('SERVICE',      'SERVICE',   'Servicio',               'Servicio profesional sin inventario fisico.', 'fa-screwdriver-wrench', 200, 1),
  ('BUNDLE',       'BUNDLE',    'Paquete',                'Conjunto de productos o servicios.',           'fa-boxes-stacked', 210, 1)
ON DUPLICATE KEY UPDATE item_type = VALUES(item_type), name = VALUES(name), description = VALUES(description),
  icon = VALUES(icon), sort_order = VALUES(sort_order);

ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS product_kind_code VARCHAR(40) NULL AFTER item_type,
  ADD COLUMN IF NOT EXISTS internal_code VARCHAR(64) NULL AFTER sku,
  ADD COLUMN IF NOT EXISTS model VARCHAR(120) NULL AFTER brand,
  ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER currency,
  ADD COLUMN IF NOT EXISTS physical_location VARCHAR(120) NULL AFTER minimum_stock,
  ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(180) NULL AFTER physical_location,
  ADD COLUMN IF NOT EXISTS video_url VARCHAR(512) NULL AFTER warranty_text,
  ADD COLUMN IF NOT EXISTS seo_keywords VARCHAR(500) NULL AFTER seo_description;

ALTER TABLE catalog_items
  ADD UNIQUE INDEX IF NOT EXISTS uq_catalog_items_internal_code (internal_code),
  ADD INDEX IF NOT EXISTS idx_catalog_items_product_kind (product_kind_code, status);

-- MariaDB no acepta IF NOT EXISTS entre CONSTRAINT y FOREIGN KEY/CHECK.
-- Estos bloques conservan la migracion reanudable despues de DDL parcial.
SET @pixon_add_product_kind_fk = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'catalog_items'
        AND CONSTRAINT_NAME = 'fk_catalog_items_product_kind'
    ),
    'DO 0',
    'ALTER TABLE catalog_items ADD CONSTRAINT fk_catalog_items_product_kind FOREIGN KEY (product_kind_code) REFERENCES catalog_product_kinds(code)'
  )
);
PREPARE pixon_product_kind_fk_stmt FROM @pixon_add_product_kind_fk;
EXECUTE pixon_product_kind_fk_stmt;
DEALLOCATE PREPARE pixon_product_kind_fk_stmt;

SET @pixon_add_tax_rate_check = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'catalog_items'
        AND CONSTRAINT_NAME = 'chk_catalog_items_tax_rate'
    ),
    'DO 0',
    'ALTER TABLE catalog_items ADD CONSTRAINT chk_catalog_items_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100)'
  )
);
PREPARE pixon_tax_rate_check_stmt FROM @pixon_add_tax_rate_check;
EXECUTE pixon_tax_rate_check_stmt;
DEALLOCATE PREPARE pixon_tax_rate_check_stmt;

INSERT INTO catalog_attribute_definitions
  (attribute_key, label, description, data_type, unit, filterable, searchable, required, sort_order, status)
VALUES
  ('manufacturer', 'Fabricante', 'Fabricante real del articulo.', 'TEXT', NULL, 1, 1, 0, 1000, 'ACTIVE'),
  ('part_number', 'Numero de parte', 'Numero de parte del fabricante.', 'TEXT', NULL, 1, 1, 0, 1010, 'ACTIVE'),
  ('compatibility', 'Compatibilidad', 'Compatibilidad tecnica explicita.', 'TEXT', NULL, 1, 1, 0, 1020, 'ACTIVE'),
  ('compatible_models', 'Modelos compatibles', 'Modelos compatibles separados claramente.', 'TEXT', NULL, 0, 1, 0, 1030, 'ACTIVE'),
  ('processor_generation', 'Generacion del procesador', NULL, 'TEXT', NULL, 1, 1, 0, 1040, 'ACTIVE'),
  ('cpu_cores', 'Nucleos', NULL, 'INTEGER', NULL, 0, 0, 0, 1050, 'ACTIVE'),
  ('cpu_threads', 'Hilos', NULL, 'INTEGER', NULL, 0, 0, 0, 1060, 'ACTIVE'),
  ('cpu_socket', 'Socket', NULL, 'TEXT', NULL, 1, 1, 0, 1070, 'ACTIVE'),
  ('cpu_base_ghz', 'Frecuencia base', NULL, 'DECIMAL', 'GHz', 0, 0, 0, 1080, 'ACTIVE'),
  ('cpu_turbo_ghz', 'Frecuencia turbo', NULL, 'DECIMAL', 'GHz', 0, 0, 0, 1090, 'ACTIVE'),
  ('cpu_cache_mb', 'Cache', NULL, 'DECIMAL', 'MB', 0, 0, 0, 1100, 'ACTIVE'),
  ('tdp_watts', 'TDP', NULL, 'INTEGER', 'W', 0, 0, 0, 1110, 'ACTIVE'),
  ('integrated_graphics', 'Graficos integrados', NULL, 'TEXT', NULL, 0, 1, 0, 1120, 'ACTIVE'),
  ('dedicated_gpu', 'GPU dedicada', NULL, 'BOOLEAN', NULL, 1, 0, 0, 1130, 'ACTIVE'),
  ('vram_gb', 'VRAM', NULL, 'INTEGER', 'GB', 1, 0, 0, 1140, 'ACTIVE'),
  ('vram_type', 'Tipo de VRAM', NULL, 'TEXT', NULL, 1, 0, 0, 1150, 'ACTIVE'),
  ('gpu_ports', 'Puertos de video', NULL, 'TEXT', NULL, 0, 1, 0, 1160, 'ACTIVE'),
  ('gpu_length_mm', 'Longitud', NULL, 'DECIMAL', 'mm', 0, 0, 0, 1170, 'ACTIVE'),
  ('recommended_psu_watts', 'Fuente recomendada', NULL, 'INTEGER', 'W', 0, 0, 0, 1180, 'ACTIVE'),
  ('power_connectors', 'Conectores de energia', NULL, 'TEXT', NULL, 0, 0, 0, 1190, 'ACTIVE'),
  ('ram_type', 'Tipo de RAM', NULL, 'TEXT', NULL, 1, 1, 0, 1200, 'ACTIVE'),
  ('ram_speed_mhz', 'Velocidad RAM', NULL, 'INTEGER', 'MHz', 1, 0, 0, 1210, 'ACTIVE'),
  ('ram_max_gb', 'RAM maxima soportada', NULL, 'INTEGER', 'GB', 0, 0, 0, 1220, 'ACTIVE'),
  ('ram_latency', 'Latencia RAM', NULL, 'TEXT', NULL, 0, 0, 0, 1230, 'ACTIVE'),
  ('ram_modules', 'Modulos RAM', NULL, 'INTEGER', NULL, 0, 0, 0, 1240, 'ACTIVE'),
  ('storage_read_mbps', 'Lectura', NULL, 'INTEGER', 'MB/s', 0, 0, 0, 1250, 'ACTIVE'),
  ('storage_write_mbps', 'Escritura', NULL, 'INTEGER', 'MB/s', 0, 0, 0, 1260, 'ACTIVE'),
  ('storage_tbw', 'Resistencia TBW', NULL, 'INTEGER', 'TBW', 0, 0, 0, 1270, 'ACTIVE'),
  ('storage_form_factor', 'Factor de forma', NULL, 'TEXT', NULL, 1, 0, 0, 1280, 'ACTIVE'),
  ('pcie_generation', 'Generacion PCIe', NULL, 'TEXT', NULL, 1, 0, 0, 1290, 'ACTIVE'),
  ('screen_resolution', 'Resolucion', NULL, 'TEXT', NULL, 1, 1, 0, 1300, 'ACTIVE'),
  ('screen_panel', 'Tipo de panel', NULL, 'TEXT', NULL, 1, 0, 0, 1310, 'ACTIVE'),
  ('touch_screen', 'Pantalla tactil', NULL, 'BOOLEAN', NULL, 1, 0, 0, 1320, 'ACTIVE'),
  ('keyboard_layout', 'Teclado', NULL, 'TEXT', NULL, 0, 1, 0, 1330, 'ACTIVE'),
  ('backlit_keyboard', 'Teclado retroiluminado', NULL, 'BOOLEAN', NULL, 0, 0, 0, 1340, 'ACTIVE'),
  ('webcam', 'Webcam', NULL, 'TEXT', NULL, 0, 0, 0, 1350, 'ACTIVE'),
  ('wifi', 'Wi-Fi', NULL, 'TEXT', NULL, 1, 1, 0, 1360, 'ACTIVE'),
  ('bluetooth', 'Bluetooth', NULL, 'TEXT', NULL, 1, 1, 0, 1370, 'ACTIVE'),
  ('ethernet', 'Ethernet', NULL, 'TEXT', NULL, 0, 0, 0, 1380, 'ACTIVE'),
  ('usb_a_ports', 'Puertos USB-A', NULL, 'INTEGER', NULL, 0, 0, 0, 1390, 'ACTIVE'),
  ('usb_c_ports', 'Puertos USB-C', NULL, 'INTEGER', NULL, 0, 0, 0, 1400, 'ACTIVE'),
  ('thunderbolt', 'Thunderbolt', NULL, 'TEXT', NULL, 0, 0, 0, 1410, 'ACTIVE'),
  ('hdmi', 'HDMI', NULL, 'TEXT', NULL, 0, 0, 0, 1420, 'ACTIVE'),
  ('displayport', 'DisplayPort', NULL, 'TEXT', NULL, 0, 0, 0, 1430, 'ACTIVE'),
  ('sd_reader', 'Lector SD', NULL, 'BOOLEAN', NULL, 0, 0, 0, 1440, 'ACTIVE'),
  ('audio_jack', 'Jack de audio', NULL, 'BOOLEAN', NULL, 0, 0, 0, 1450, 'ACTIVE'),
  ('battery_capacity_wh', 'Capacidad de bateria', NULL, 'DECIMAL', 'Wh', 0, 0, 0, 1460, 'ACTIVE'),
  ('charger_watts', 'Potencia del cargador', NULL, 'INTEGER', 'W', 0, 0, 0, 1470, 'ACTIVE'),
  ('color', 'Color', NULL, 'TEXT', NULL, 1, 0, 0, 1480, 'ACTIVE'),
  ('weight_kg', 'Peso', NULL, 'DECIMAL', 'kg', 0, 0, 0, 1490, 'ACTIVE'),
  ('dimensions', 'Dimensiones', NULL, 'TEXT', NULL, 0, 0, 0, 1500, 'ACTIVE'),
  ('motherboard_model', 'Tarjeta madre', NULL, 'TEXT', NULL, 0, 1, 0, 1510, 'ACTIVE'),
  ('motherboard_chipset', 'Chipset', NULL, 'TEXT', NULL, 1, 1, 0, 1520, 'ACTIVE'),
  ('motherboard_form_factor', 'Tamano de tarjeta madre', NULL, 'TEXT', NULL, 1, 0, 0, 1530, 'ACTIVE'),
  ('ram_slots', 'Ranuras RAM', NULL, 'INTEGER', NULL, 0, 0, 0, 1540, 'ACTIVE'),
  ('m2_slots', 'Ranuras M.2', NULL, 'INTEGER', NULL, 0, 0, 0, 1550, 'ACTIVE'),
  ('sata_ports', 'Puertos SATA', NULL, 'INTEGER', NULL, 0, 0, 0, 1560, 'ACTIVE'),
  ('psu_watts', 'Potencia de fuente', NULL, 'INTEGER', 'W', 0, 0, 0, 1570, 'ACTIVE'),
  ('psu_certification', 'Certificacion PSU', NULL, 'TEXT', NULL, 1, 1, 0, 1580, 'ACTIVE'),
  ('psu_modularity', 'Modularidad', NULL, 'TEXT', NULL, 1, 0, 0, 1590, 'ACTIVE'),
  ('case_model', 'Gabinete', NULL, 'TEXT', NULL, 0, 1, 0, 1600, 'ACTIVE'),
  ('cooling_type', 'Refrigeracion', NULL, 'TEXT', NULL, 1, 1, 0, 1610, 'ACTIVE'),
  ('fan_count', 'Ventiladores', NULL, 'INTEGER', NULL, 0, 0, 0, 1620, 'ACTIVE'),
  ('rgb', 'RGB', NULL, 'BOOLEAN', NULL, 1, 0, 0, 1630, 'ACTIVE'),
  ('recommended_resolution', 'Resolucion recomendada', NULL, 'TEXT', NULL, 0, 0, 0, 1640, 'ACTIVE'),
  ('upgradeable', 'Posibilidad de actualizacion', NULL, 'TEXT', NULL, 0, 0, 0, 1650, 'ACTIVE'),
  ('part_type', 'Tipo de pieza', NULL, 'TEXT', NULL, 1, 1, 0, 1660, 'ACTIVE'),
  ('part_quality', 'Origen de pieza', 'Original, OEM o generico.', 'TEXT', NULL, 1, 1, 0, 1670, 'ACTIVE'),
  ('compatible_device', 'Dispositivo compatible', NULL, 'TEXT', NULL, 0, 1, 0, 1680, 'ACTIVE'),
  ('technical_notes', 'Observaciones tecnicas', NULL, 'TEXT', NULL, 0, 1, 0, 1690, 'ACTIVE'),
  ('peripheral_type', 'Tipo de periferico', NULL, 'TEXT', NULL, 1, 1, 0, 1700, 'ACTIVE'),
  ('connection_type', 'Conexion', NULL, 'TEXT', NULL, 1, 1, 0, 1710, 'ACTIVE'),
  ('dpi', 'DPI', NULL, 'INTEGER', 'DPI', 0, 0, 0, 1720, 'ACTIVE'),
  ('polling_rate_hz', 'Polling rate', NULL, 'INTEGER', 'Hz', 0, 0, 0, 1730, 'ACTIVE'),
  ('switches', 'Switches', NULL, 'TEXT', NULL, 0, 1, 0, 1740, 'ACTIVE'),
  ('battery', 'Bateria', NULL, 'TEXT', NULL, 0, 0, 0, 1750, 'ACTIVE'),
  ('compatible_os', 'Sistemas compatibles', NULL, 'TEXT', NULL, 0, 1, 0, 1760, 'ACTIVE')
ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description), data_type = VALUES(data_type),
  unit = VALUES(unit), filterable = VALUES(filterable), searchable = VALUES(searchable), status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS catalog_product_kind_attributes (
  product_kind_code VARCHAR(40) NOT NULL,
  attribute_definition_id INT UNSIGNED NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  section_name VARCHAR(80) NOT NULL DEFAULT 'Especificaciones',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_kind_code, attribute_definition_id),
  CONSTRAINT fk_product_kind_attributes_kind FOREIGN KEY (product_kind_code)
    REFERENCES catalog_product_kinds(code) ON DELETE CASCADE,
  CONSTRAINT fk_product_kind_attributes_definition FOREIGN KEY (attribute_definition_id)
    REFERENCES catalog_attribute_definitions(id) ON DELETE CASCADE,
  CONSTRAINT chk_product_kind_attributes_required CHECK (is_required IN (0, 1)),
  KEY idx_product_kind_attributes_sort (product_kind_code, section_name, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO catalog_product_kind_attributes
  (product_kind_code, attribute_definition_id, is_required, section_name, sort_order)
SELECT seed.kind, definition.id, seed.required, seed.section_name, seed.sort_order
FROM (
  SELECT 'LAPTOP' kind, 'cpu_model' attr, 1 required, 'Rendimiento' section_name, 10 sort_order
  UNION ALL SELECT 'LAPTOP','processor_generation',0,'Rendimiento',20
  UNION ALL SELECT 'LAPTOP','cpu_cores',0,'Rendimiento',30
  UNION ALL SELECT 'LAPTOP','cpu_threads',0,'Rendimiento',40
  UNION ALL SELECT 'LAPTOP','gpu_model',0,'Rendimiento',50
  UNION ALL SELECT 'LAPTOP','dedicated_gpu',0,'Rendimiento',60
  UNION ALL SELECT 'LAPTOP','vram_gb',0,'Rendimiento',70
  UNION ALL SELECT 'LAPTOP','ram_capacity_gb',1,'Memoria y almacenamiento',80
  UNION ALL SELECT 'LAPTOP','ram_type',0,'Memoria y almacenamiento',90
  UNION ALL SELECT 'LAPTOP','ram_speed_mhz',0,'Memoria y almacenamiento',100
  UNION ALL SELECT 'LAPTOP','ram_max_gb',0,'Memoria y almacenamiento',110
  UNION ALL SELECT 'LAPTOP','storage_capacity_gb',1,'Memoria y almacenamiento',120
  UNION ALL SELECT 'LAPTOP','storage_interface',0,'Memoria y almacenamiento',130
  UNION ALL SELECT 'LAPTOP','screen_size_inches',1,'Pantalla',140
  UNION ALL SELECT 'LAPTOP','screen_resolution',0,'Pantalla',150
  UNION ALL SELECT 'LAPTOP','screen_refresh_hz',0,'Pantalla',160
  UNION ALL SELECT 'LAPTOP','screen_panel',0,'Pantalla',170
  UNION ALL SELECT 'LAPTOP','touch_screen',0,'Pantalla',180
  UNION ALL SELECT 'LAPTOP','operating_system',0,'Sistema y conectividad',190
  UNION ALL SELECT 'LAPTOP','keyboard_layout',0,'Sistema y conectividad',200
  UNION ALL SELECT 'LAPTOP','backlit_keyboard',0,'Sistema y conectividad',210
  UNION ALL SELECT 'LAPTOP','webcam',0,'Sistema y conectividad',220
  UNION ALL SELECT 'LAPTOP','wifi',0,'Sistema y conectividad',230
  UNION ALL SELECT 'LAPTOP','bluetooth',0,'Sistema y conectividad',240
  UNION ALL SELECT 'LAPTOP','ethernet',0,'Puertos',250
  UNION ALL SELECT 'LAPTOP','usb_a_ports',0,'Puertos',260
  UNION ALL SELECT 'LAPTOP','usb_c_ports',0,'Puertos',270
  UNION ALL SELECT 'LAPTOP','thunderbolt',0,'Puertos',280
  UNION ALL SELECT 'LAPTOP','hdmi',0,'Puertos',290
  UNION ALL SELECT 'LAPTOP','displayport',0,'Puertos',300
  UNION ALL SELECT 'LAPTOP','sd_reader',0,'Puertos',310
  UNION ALL SELECT 'LAPTOP','audio_jack',0,'Puertos',320
  UNION ALL SELECT 'LAPTOP','battery_health_percent',0,'Fisico y energia',330
  UNION ALL SELECT 'LAPTOP','battery_capacity_wh',0,'Fisico y energia',340
  UNION ALL SELECT 'LAPTOP','charger_watts',0,'Fisico y energia',350
  UNION ALL SELECT 'LAPTOP','color',0,'Fisico y energia',360
  UNION ALL SELECT 'LAPTOP','weight_kg',0,'Fisico y energia',370
  UNION ALL SELECT 'LAPTOP','dimensions',0,'Fisico y energia',380
  UNION ALL SELECT 'GAMING_PC','cpu_model',1,'Componentes',10
  UNION ALL SELECT 'GAMING_PC','gpu_model',1,'Componentes',20
  UNION ALL SELECT 'GAMING_PC','motherboard_model',0,'Componentes',30
  UNION ALL SELECT 'GAMING_PC','ram_capacity_gb',1,'Componentes',40
  UNION ALL SELECT 'GAMING_PC','ram_speed_mhz',0,'Componentes',50
  UNION ALL SELECT 'GAMING_PC','storage_capacity_gb',1,'Componentes',60
  UNION ALL SELECT 'GAMING_PC','storage_interface',0,'Componentes',70
  UNION ALL SELECT 'GAMING_PC','psu_watts',0,'Componentes',80
  UNION ALL SELECT 'GAMING_PC','psu_certification',0,'Componentes',90
  UNION ALL SELECT 'GAMING_PC','case_model',0,'Componentes',100
  UNION ALL SELECT 'GAMING_PC','cooling_type',0,'Componentes',110
  UNION ALL SELECT 'GAMING_PC','fan_count',0,'Componentes',120
  UNION ALL SELECT 'GAMING_PC','operating_system',0,'Conectividad y experiencia',130
  UNION ALL SELECT 'GAMING_PC','wifi',0,'Conectividad y experiencia',140
  UNION ALL SELECT 'GAMING_PC','bluetooth',0,'Conectividad y experiencia',150
  UNION ALL SELECT 'GAMING_PC','rgb',0,'Conectividad y experiencia',160
  UNION ALL SELECT 'GAMING_PC','recommended_resolution',0,'Rendimiento',170
  UNION ALL SELECT 'GAMING_PC','estimated_fps_1080p',0,'Rendimiento',180
  UNION ALL SELECT 'GAMING_PC','estimated_fps_1440p',0,'Rendimiento',190
  UNION ALL SELECT 'GAMING_PC','upgradeable',0,'Rendimiento',200
  UNION ALL SELECT 'CPU','cpu_socket',1,'Procesador',10
  UNION ALL SELECT 'CPU','cpu_cores',1,'Procesador',20
  UNION ALL SELECT 'CPU','cpu_threads',1,'Procesador',30
  UNION ALL SELECT 'CPU','cpu_base_ghz',0,'Procesador',40
  UNION ALL SELECT 'CPU','cpu_turbo_ghz',0,'Procesador',50
  UNION ALL SELECT 'CPU','cpu_cache_mb',0,'Procesador',60
  UNION ALL SELECT 'CPU','tdp_watts',0,'Procesador',70
  UNION ALL SELECT 'CPU','integrated_graphics',0,'Procesador',80
  UNION ALL SELECT 'CPU','processor_generation',0,'Procesador',90
  UNION ALL SELECT 'GPU','gpu_model',1,'Tarjeta grafica',10
  UNION ALL SELECT 'GPU','vram_gb',1,'Tarjeta grafica',20
  UNION ALL SELECT 'GPU','vram_type',0,'Tarjeta grafica',30
  UNION ALL SELECT 'GPU','gpu_ports',0,'Tarjeta grafica',40
  UNION ALL SELECT 'GPU','gpu_length_mm',0,'Tarjeta grafica',50
  UNION ALL SELECT 'GPU','recommended_psu_watts',0,'Tarjeta grafica',60
  UNION ALL SELECT 'GPU','power_connectors',0,'Tarjeta grafica',70
  UNION ALL SELECT 'RAM','ram_capacity_gb',1,'Memoria RAM',10
  UNION ALL SELECT 'RAM','ram_type',1,'Memoria RAM',20
  UNION ALL SELECT 'RAM','ram_speed_mhz',1,'Memoria RAM',30
  UNION ALL SELECT 'RAM','ram_latency',0,'Memoria RAM',40
  UNION ALL SELECT 'RAM','ram_modules',0,'Memoria RAM',50
  UNION ALL SELECT 'RAM','rgb',0,'Memoria RAM',60
  UNION ALL SELECT 'STORAGE','storage_capacity_gb',1,'Almacenamiento',10
  UNION ALL SELECT 'STORAGE','storage_interface',1,'Almacenamiento',20
  UNION ALL SELECT 'STORAGE','storage_form_factor',0,'Almacenamiento',30
  UNION ALL SELECT 'STORAGE','pcie_generation',0,'Almacenamiento',40
  UNION ALL SELECT 'STORAGE','storage_read_mbps',0,'Almacenamiento',50
  UNION ALL SELECT 'STORAGE','storage_write_mbps',0,'Almacenamiento',60
  UNION ALL SELECT 'STORAGE','storage_tbw',0,'Almacenamiento',70
  UNION ALL SELECT 'MOTHERBOARD','cpu_socket',1,'Tarjeta madre',10
  UNION ALL SELECT 'MOTHERBOARD','motherboard_chipset',1,'Tarjeta madre',20
  UNION ALL SELECT 'MOTHERBOARD','motherboard_form_factor',0,'Tarjeta madre',30
  UNION ALL SELECT 'MOTHERBOARD','ram_type',0,'Tarjeta madre',40
  UNION ALL SELECT 'MOTHERBOARD','ram_slots',0,'Tarjeta madre',50
  UNION ALL SELECT 'MOTHERBOARD','ram_max_gb',0,'Tarjeta madre',60
  UNION ALL SELECT 'MOTHERBOARD','m2_slots',0,'Tarjeta madre',70
  UNION ALL SELECT 'MOTHERBOARD','sata_ports',0,'Tarjeta madre',80
  UNION ALL SELECT 'MOTHERBOARD','wifi',0,'Tarjeta madre',90
  UNION ALL SELECT 'MOTHERBOARD','bluetooth',0,'Tarjeta madre',100
  UNION ALL SELECT 'PSU','psu_watts',1,'Fuente de poder',10
  UNION ALL SELECT 'PSU','psu_certification',0,'Fuente de poder',20
  UNION ALL SELECT 'PSU','psu_modularity',0,'Fuente de poder',30
  UNION ALL SELECT 'PSU','power_connectors',0,'Fuente de poder',40
  UNION ALL SELECT 'PART','part_type',1,'Compatibilidad',10
  UNION ALL SELECT 'PART','manufacturer',0,'Compatibilidad',20
  UNION ALL SELECT 'PART','part_number',1,'Compatibilidad',30
  UNION ALL SELECT 'PART','compatibility',1,'Compatibilidad',40
  UNION ALL SELECT 'PART','compatible_models',0,'Compatibilidad',50
  UNION ALL SELECT 'PART','compatible_device',0,'Compatibilidad',60
  UNION ALL SELECT 'PART','part_quality',0,'Compatibilidad',70
  UNION ALL SELECT 'PART','technical_notes',0,'Compatibilidad',80
  UNION ALL SELECT 'PERIPHERAL','peripheral_type',1,'Periferico',10
  UNION ALL SELECT 'PERIPHERAL','connection_type',1,'Periferico',20
  UNION ALL SELECT 'PERIPHERAL','dpi',0,'Periferico',30
  UNION ALL SELECT 'PERIPHERAL','polling_rate_hz',0,'Periferico',40
  UNION ALL SELECT 'PERIPHERAL','switches',0,'Periferico',50
  UNION ALL SELECT 'PERIPHERAL','rgb',0,'Periferico',60
  UNION ALL SELECT 'PERIPHERAL','battery',0,'Periferico',70
  UNION ALL SELECT 'PERIPHERAL','compatibility',0,'Periferico',80
  UNION ALL SELECT 'PERIPHERAL','compatible_os',0,'Periferico',90
) seed
JOIN catalog_attribute_definitions definition ON definition.attribute_key = seed.attr
ON DUPLICATE KEY UPDATE is_required = VALUES(is_required), section_name = VALUES(section_name), sort_order = VALUES(sort_order);

-- Tipos sin una ficha especifica heredan un conjunto pequeno y pueden ampliarse
-- desde catalog_product_kind_attributes sin cambiar el formulario.
INSERT IGNORE INTO catalog_product_kind_attributes
  (product_kind_code, attribute_definition_id, is_required, section_name, sort_order)
SELECT kind.code, definition.id, 0, 'Especificaciones', definition.sort_order
FROM catalog_product_kinds kind
JOIN catalog_attribute_definitions definition
  ON definition.attribute_key IN ('manufacturer','part_number','compatibility','color','dimensions','what_is_included')
WHERE kind.code IN ('PC_COMPONENT','CASE','COOLING','MONITOR','PHONE','CONSOLE','ACCESSORY','PRINTER','GENERAL','SERVICE','BUNDLE');

ALTER TABLE commerce_inventory_movements
  MODIFY COLUMN reason ENUM('ENTRY','EXIT','SALE','RESERVE','RELEASE','ADJUSTMENT','RETURN','LOSS','DAMAGE','TRANSFER') NOT NULL,
  ADD COLUMN IF NOT EXISTS quantity_before INT NULL AFTER qty_delta,
  ADD COLUMN IF NOT EXISTS quantity_after INT NULL AFTER quantity_before,
  ADD COLUMN IF NOT EXISTS reference_text VARCHAR(120) NULL AFTER reference_order_id;
