CREATE TABLE IF NOT EXISTS schedule_resources (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  type ENUM('WORKSHOP', 'TECHNICAL_ATTENTION', 'FIELD_SERVICE') NOT NULL DEFAULT 'WORKSHOP',
  capacity INT UNSIGNED NOT NULL DEFAULT 3,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO schedule_resources (id, name, type, capacity, active) VALUES
  ('res-workshop-main', 'Taller / Recepción Principal', 'WORKSHOP', 3, 1),
  ('res-technical-bench', 'Banco Técnico de Taller', 'TECHNICAL_ATTENTION', 2, 1),
  ('res-field-service', 'Servicio a Domicilio / B2B', 'FIELD_SERVICE', 1, 1);

CREATE TABLE IF NOT EXISTS appointment_type_configs (
  appointment_type VARCHAR(64) NOT NULL PRIMARY KEY,
  name_es VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  duration_minutes INT UNSIGNED NOT NULL DEFAULT 30,
  capacity_units INT UNSIGNED NOT NULL DEFAULT 1,
  is_exclusive TINYINT(1) NOT NULL DEFAULT 0,
  buffer_before_minutes INT UNSIGNED NOT NULL DEFAULT 0,
  buffer_after_minutes INT UNSIGNED NOT NULL DEFAULT 0,
  requires_payment TINYINT(1) NOT NULL DEFAULT 0,
  requires_ticket TINYINT(1) NOT NULL DEFAULT 0,
  allows_customer_booking TINYINT(1) NOT NULL DEFAULT 1,
  default_priority ENUM('NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  display_color VARCHAR(32) NOT NULL DEFAULT '#0284c7',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO appointment_type_configs
  (appointment_type, name_es, name_en, duration_minutes, capacity_units, is_exclusive, buffer_before_minutes, buffer_after_minutes, requires_payment, requires_ticket, allows_customer_booking, default_priority, display_color)
VALUES
  ('DROP_OFF', 'Recepción de equipo', 'Equipment Drop-off', 20, 1, 0, 0, 0, 0, 0, 1, 'NORMAL', '#0284c7'),
  ('PICKUP', 'Entrega de equipo', 'Equipment Pickup', 20, 1, 0, 0, 0, 0, 0, 1, 'NORMAL', '#10b981'),
  ('DIAGNOSTIC', 'Diagnóstico técnico', 'Technical Diagnostic', 30, 1, 0, 0, 0, 1, 0, 1, 'NORMAL', '#f59e0b'),
  ('MAINTENANCE', 'Mantenimiento preventivo', 'Maintenance', 60, 1, 0, 0, 0, 0, 0, 1, 'NORMAL', '#06b6d4'),
  ('REPAIR', 'Revisión / Trabajo de reparación', 'Scheduled Repair', 60, 1, 0, 0, 0, 0, 0, 1, 'NORMAL', '#3b82f6'),
  ('LIQUID_DAMAGE', 'Equipo mojado / Daño por líquido', 'Liquid Damage / Moisture', 45, 2, 0, 0, 0, 1, 0, 1, 'URGENT', '#ef4444'),
  ('ON_SITE', 'Servicio a domicilio', 'On-site Service', 120, 3, 1, 30, 30, 0, 0, 1, 'NORMAL', '#8b5cf6'),
  ('BUSINESS', 'Servicio empresa / B2B', 'B2B / Business Support', 180, 3, 1, 30, 30, 0, 0, 1, 'NORMAL', '#6366f1'),
  ('REMOTE', 'Soporte remoto', 'Remote Support', 45, 1, 0, 0, 0, 0, 0, 1, 'NORMAL', '#0ea5e9'),
  ('OTHER', 'Otro motivo / Consulta técnica', 'Other Technical Inquiry', 30, 1, 0, 0, 0, 0, 0, 1, 'NORMAL', '#64748b');

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  ticket_id INT UNSIGNED NULL,
  customer_id VARCHAR(64) NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(160) NULL,
  customer_phone VARCHAR(32) NOT NULL,
  appointment_type VARCHAR(64) NOT NULL,
  service_type VARCHAR(255) NOT NULL DEFAULT 'GENERAL',
  location_type ENUM('WORKSHOP', 'ON_SITE', 'REMOTE') NOT NULL DEFAULT 'WORKSHOP',
  resource_id VARCHAR(64) NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Cancun',
  duration_minutes INT UNSIGNED NOT NULL DEFAULT 30,
  capacity_units INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM(
    'TEMPORARY_HOLD', 'PENDING_PAYMENT', 'CONFIRMED',
    'CHECKED_IN', 'DEVICE_RECEIVED', 'IN_PROGRESS',
    'CUSTOMER_ARRIVED', 'DEVICE_DELIVERED', 'COMPLETED',
    'RESCHEDULED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_ADMIN',
    'NO_SHOW', 'EXPIRED'
  ) NOT NULL DEFAULT 'TEMPORARY_HOLD',
  payment_status ENUM('NOT_REQUIRED', 'PENDING', 'PAID', 'REFUNDED', 'FORFEITED', 'WAIVED') NOT NULL DEFAULT 'NOT_REQUIRED',
  diagnostic_payment_id VARCHAR(64) NULL,
  payment_disposition ENUM('ORIGINAL_PAYMENT_LINKED', 'PAYMENT_REUSED', 'NEW_PAYMENT_REQUIRED', 'FORFEITED', 'REFUNDED', 'NONE') NOT NULL DEFAULT 'NONE',
  reservation_expires_at DATETIME NULL,
  priority ENUM('NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  customer_notes TEXT NULL,
  private_notes TEXT NULL,
  planned_service_summary VARCHAR(255) NULL,
  device_summary VARCHAR(255) NULL,
  address_line VARCHAR(255) NULL,
  idempotency_key VARCHAR(128) NULL UNIQUE,
  admin_override TINYINT(1) NOT NULL DEFAULT 0,
  admin_override_reason VARCHAR(255) NULL,
  checked_in_at DATETIME NULL,
  device_received_at DATETIME NULL,
  completed_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  cancellation_reason VARCHAR(255) NULL,
  rescheduled_from_id VARCHAR(64) NULL,
  rescheduled_to_id VARCHAR(64) NULL,
  created_by VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_appointments_start_status (start_at, status),
  KEY idx_appointments_resource_range (resource_id, start_at, end_at),
  KEY idx_appointments_customer (customer_id),
  KEY idx_appointments_ticket (ticket_id),
  KEY idx_appointments_type (appointment_type),
  KEY idx_appointments_expires (reservation_expires_at, status),
  KEY idx_appointments_rescheduled_from (rescheduled_from_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appointment_audit_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id VARCHAR(64) NOT NULL,
  action ENUM('CREATE', 'HOLD', 'PAYMENT_CONFIRM', 'CHECK_IN', 'DEVICE_RECEIVED', 'RESCHEDULE', 'CANCEL', 'NO_SHOW', 'BLOCK', 'UNBLOCK', 'COMPLETE', 'OVERRIDE', 'EXPIRE') NOT NULL,
  actor_id VARCHAR(64) NULL,
  actor_role VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_appointment_audit_id (appointment_id, created_at)
) ENGINE=InnoDB;

-- Column extensions for existing appointment_settings if not present
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment_settings' AND COLUMN_NAME = 'capacity');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointment_settings ADD COLUMN capacity INT UNSIGNED NOT NULL DEFAULT 3', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment_settings' AND COLUMN_NAME = 'lead_time_hours');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointment_settings ADD COLUMN lead_time_hours INT UNSIGNED NOT NULL DEFAULT 2', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment_settings' AND COLUMN_NAME = 'booking_window_days');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointment_settings ADD COLUMN booking_window_days INT UNSIGNED NOT NULL DEFAULT 30', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment_settings' AND COLUMN_NAME = 'allow_same_day');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointment_settings ADD COLUMN allow_same_day TINYINT(1) NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment_settings' AND COLUMN_NAME = 'hold_duration_minutes');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointment_settings ADD COLUMN hold_duration_minutes INT UNSIGNED NOT NULL DEFAULT 15', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Column extensions for appointment_exceptions
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment_exceptions' AND COLUMN_NAME = 'capacity_override');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointment_exceptions ADD COLUMN capacity_override INT UNSIGNED NULL', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Column extensions for appointment_blocks
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment_blocks' AND COLUMN_NAME = 'category');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointment_blocks ADD COLUMN category ENUM(\'PERSONAL\', \'OUT_OF_SHOP\', \'PARTS_RUN\', \'INTERNAL_WORK\', \'INVENTORY\', \'MEAL\', \'TRAVEL\', \'UNAVAILABLE\', \'OTHER\') NOT NULL DEFAULT \'UNAVAILABLE\'', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment_blocks' AND COLUMN_NAME = 'resource_id');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointment_blocks ADD COLUMN resource_id VARCHAR(64) NULL', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment_blocks' AND COLUMN_NAME = 'is_all_day');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointment_blocks ADD COLUMN is_all_day TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointment_blocks' AND COLUMN_NAME = 'recurrence_rule');
SET @query = IF(@col_exists = 0, 'ALTER TABLE appointment_blocks ADD COLUMN recurrence_rule VARCHAR(128) NULL', 'SELECT 1');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure service_type in appointments is VARCHAR(255)
ALTER TABLE appointments MODIFY COLUMN service_type VARCHAR(255) NOT NULL DEFAULT 'GENERAL';

-- Backfill from repairs where appointment_date is present
INSERT INTO appointments (
  id, ticket_id, customer_id, customer_name, customer_email, customer_phone,
  appointment_type, service_type, location_type, resource_id,
  start_at, end_at, duration_minutes, capacity_units, status, payment_status,
  priority, customer_notes, planned_service_summary, device_summary, created_at
)
SELECT
  CONCAT('legacy-apt-', r.id) as id,
  r.id as ticket_id,
  r.user_id as customer_id,
  COALESCE(u.name, 'Cliente Pixon') as customer_name,
  COALESCE(r.contact_email, u.email) as customer_email,
  COALESCE(r.contact_phone, '9980000000') as customer_phone,
  CASE
    WHEN LOWER(COALESCE(r.appointment_type, '')) LIKE '%diagnost%' THEN 'DIAGNOSTIC'
    WHEN LOWER(COALESCE(r.appointment_type, '')) LIKE '%entrega%' THEN 'PICKUP'
    WHEN LOWER(COALESCE(r.appointment_type, '')) LIKE '%domicilio%' THEN 'ON_SITE'
    WHEN LOWER(COALESCE(r.appointment_type, '')) LIKE '%mantenimiento%' THEN 'MAINTENANCE'
    ELSE 'DROP_OFF'
  END as appointment_type,
  LEFT(COALESCE(r.reported_issue, 'GENERAL'), 250) as service_type,
  CASE WHEN LOWER(COALESCE(r.appointment_type, '')) LIKE '%domicilio%' THEN 'ON_SITE' ELSE 'WORKSHOP' END as location_type,
  CASE WHEN LOWER(COALESCE(r.appointment_type, '')) LIKE '%domicilio%' THEN 'res-field-service' ELSE 'res-workshop-main' END as resource_id,
  STR_TO_DATE(CONCAT(r.appointment_date, ' ', COALESCE(r.appointment_time, '10:00:00')), '%Y-%m-%d %H:%i:%s') as start_at,
  DATE_ADD(STR_TO_DATE(CONCAT(r.appointment_date, ' ', COALESCE(r.appointment_time, '10:00:00')), '%Y-%m-%d %H:%i:%s'), INTERVAL 30 MINUTE) as end_at,
  30 as duration_minutes,
  1 as capacity_units,
  CASE
    WHEN r.appointment_status = 'confirmada' THEN 'CONFIRMED'
    WHEN r.appointment_status = 'cancelada' THEN 'CANCELLED_BY_CUSTOMER'
    WHEN r.appointment_status = 'completada' THEN 'COMPLETED'
    ELSE 'CONFIRMED'
  END as status,
  'NOT_REQUIRED' as payment_status,
  COALESCE(r.priority, 'NORMAL') as priority,
  r.appointment_note as customer_notes,
  LEFT(COALESCE(r.reported_issue, 'GENERAL'), 250) as planned_service_summary,
  CONCAT_WS(' ', r.device_brand, r.device_model) as device_summary,
  r.created_at
FROM repairs r
LEFT JOIN users u ON u.id = r.user_id
WHERE r.appointment_date IS NOT NULL
  AND r.deleted_at IS NULL
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
