-- 012_appointments_pricing_policy.sql
-- Corrige la politica de precios de la agenda operativa:
--   - LIQUID_DAMAGE ya NO cobra automaticamente el diagnostico de $600 MXN.
--     El equipo mojado inicia con limpieza tecnica / descontaminacion + inspeccion,
--     cuyo costo se cotiza aparte (no es un deposito de reservacion obligatorio).
--   - Se agregan columnas de snapshot de precio en appointments para que:
--       a) el precio mostrado al cliente/admin quede fijo en la cita (no se
--          recalcula retroactivamente si la politica cambia despues), y
--       b) se distinga precio CONFIRMADO vs ESTIMADO vs PENDIENTE DE CONFIRMAR.

UPDATE appointment_type_configs
SET requires_payment = 0
WHERE appointment_type = 'LIQUID_DAMAGE';

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'equipment_value_mxn');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointments ADD COLUMN equipment_value_mxn DECIMAL(10,2) NULL AFTER device_summary', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'price_amount_mxn');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointments ADD COLUMN price_amount_mxn DECIMAL(10,2) NULL AFTER equipment_value_mxn', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'price_mode');
SET @query = IF(@col_exists = 0, "ALTER TABLE appointments ADD COLUMN price_mode ENUM('CONFIRMED','ESTIMATE','PENDING_CONFIRMATION','NOT_APPLICABLE') NOT NULL DEFAULT 'NOT_APPLICABLE' AFTER price_amount_mxn", 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'price_label');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointments ADD COLUMN price_label VARCHAR(180) NULL AFTER price_mode', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;
