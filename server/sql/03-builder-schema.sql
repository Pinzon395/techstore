-- 03-builder-schema.sql: Esquema avanzado para componentes de Hardware (Configurador E-Commerce)

-- 1. Categorías de Componentes (CPU, GPU, RAM, etc.)
CREATE TABLE IF NOT EXISTS hardware_categories (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(50)
);

-- 2. Tabla Principal de Componentes Reales
CREATE TABLE IF NOT EXISTS hardware_components (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id SMALLINT UNSIGNED, 
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(150) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    
    -- Precios y Verificación (Esencial para Google Shopping)
    base_price DECIMAL(10,2) NOT NULL,
    verified_price DECIMAL(10,2) NOT NULL,
    last_verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    source_url VARCHAR(500), 
    
    -- Inventario y Estatus
    stock INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    delivery_type ENUM('inmediato', 'sobre_pedido') DEFAULT 'inmediato',
    
    -- Equivalencias
    equivalent_id BIGINT UNSIGNED NULL, 
    
    -- Metadatos
    image_url VARCHAR(500),
    compatibility_hash VARCHAR(255), 
    
    FOREIGN KEY (category_id) REFERENCES hardware_categories(id),
    FOREIGN KEY (equivalent_id) REFERENCES hardware_components(id) ON DELETE SET NULL
);

-- 3. Historial de Precios (Para alertas si subió/bajó)
CREATE TABLE IF NOT EXISTS price_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    component_id BIGINT UNSIGNED NOT NULL,
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (component_id) REFERENCES hardware_components(id) ON DELETE CASCADE
);

-- Insertar algunas categorías base si no existen
INSERT IGNORE INTO hardware_categories (name, slug, icon) VALUES 
('Procesadores (CPU)', 'cpu', 'fa-microchip'),
('Tarjetas de Video (GPU)', 'gpu', 'fa-display'),
('Memorias RAM', 'ram', 'fa-memory'),
('Tarjetas Madre (Motherboard)', 'motherboard', 'fa-chess-board'),
('Almacenamiento (SSD/HDD)', 'almacenamiento', 'fa-hard-drive'),
('Fuentes de Poder (PSU)', 'psu', 'fa-plug'),
('Gabinetes', 'gabinete', 'fa-box'),
('Enfriamiento', 'enfriamiento', 'fa-fan');
