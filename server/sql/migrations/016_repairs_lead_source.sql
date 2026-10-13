-- 016_repairs_lead_source.sql
-- Atribución comercial mínima en tickets (sin CRM aparte):
--   lead_source  ¿de dónde llegó el cliente? (se captura en admin al recibir/atender)
--   lost_reason  motivo opcional cuando una cotización no se autoriza (ticket cancelado)
-- Valores permitidos validados en server/database.js (LEAD_SOURCE_VALUES / LOST_REASON_VALUES).
-- Idempotente: solo agrega columnas e índice si no existen.

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repairs' AND COLUMN_NAME = 'lead_source');
SET @query = IF(@col_exists = 0, 'ALTER TABLE repairs ADD COLUMN lead_source VARCHAR(32) NULL AFTER priority', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repairs' AND COLUMN_NAME = 'lost_reason');
SET @query = IF(@col_exists = 0, 'ALTER TABLE repairs ADD COLUMN lost_reason VARCHAR(32) NULL AFTER lead_source', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repairs' AND INDEX_NAME = 'idx_repairs_lead_source');
SET @query = IF(@idx_exists = 0, 'ALTER TABLE repairs ADD KEY idx_repairs_lead_source (lead_source, created_at)', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;
