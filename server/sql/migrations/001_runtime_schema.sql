ALTER TABLE comments MODIFY COLUMN stars DECIMAL(2,1) UNSIGNED NOT NULL;

ALTER TABLE repairs MODIFY COLUMN status ENUM(
  'new','received','diagnosing','contacted','quoted','approved','in_progress',
  'waiting_parts','ready','delivered','cancelled','eliminado'
) NOT NULL DEFAULT 'received';

ALTER TABLE repairs ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(60) NULL;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS appointment_date DATE NULL;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS appointment_time TIME NULL;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS appointment_datetime DATETIME NULL;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS appointment_delivery_method VARCHAR(80) NULL;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS appointment_note TEXT NULL;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS appointment_status ENUM('pendiente_confirmacion','confirmada','reagendada','cancelada','completada') NOT NULL DEFAULT 'pendiente_confirmacion';
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
ALTER TABLE repairs ADD COLUMN IF NOT EXISTS deleted_by CHAR(36) NULL;

CREATE TABLE IF NOT EXISTS appointment_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  weekday TINYINT UNSIGNED NOT NULL UNIQUE,
  is_open TINYINT(1) NOT NULL DEFAULT 1,
  start_time TIME NULL,
  end_time TIME NULL,
  slot_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  allowed_types VARCHAR(160) NOT NULL DEFAULT 'recepcion,diagnostico,entrega,otro',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appointment_exceptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  status ENUM('closed','normal','only_pickup','only_dropoff','only_diagnostic','custom_hours') NOT NULL DEFAULT 'normal',
  start_time TIME NULL,
  end_time TIME NULL,
  slot_minutes SMALLINT UNSIGNED NULL,
  allowed_types VARCHAR(160) NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO appointment_settings (weekday, is_open, start_time, end_time, slot_minutes, allowed_types) VALUES
  (0,0,NULL,NULL,30,''),(1,1,'10:00:00','19:00:00',30,'recepcion,diagnostico,entrega,otro'),
  (2,1,'10:00:00','19:00:00',30,'recepcion,diagnostico,entrega,otro'),
  (3,1,'10:00:00','19:00:00',30,'recepcion,diagnostico,entrega,otro'),
  (4,1,'10:00:00','19:00:00',30,'recepcion,diagnostico,entrega,otro'),
  (5,1,'10:00:00','19:00:00',30,'recepcion,diagnostico,entrega,otro'),
  (6,1,'10:00:00','15:00:00',30,'recepcion,diagnostico,entrega,otro')
ON DUPLICATE KEY UPDATE weekday = VALUES(weekday);
