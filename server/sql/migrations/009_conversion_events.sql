CREATE TABLE IF NOT EXISTS conversion_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_name VARCHAR(48) NOT NULL,
  path VARCHAR(300) NOT NULL,
  locale CHAR(2) NOT NULL,
  referrer VARCHAR(500) NULL,
  utm_source VARCHAR(120) NULL,
  utm_medium VARCHAR(120) NULL,
  utm_campaign VARCHAR(120) NULL,
  session_id VARCHAR(128) NULL,
  user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversion_events_name_created (event_name, created_at),
  KEY idx_conversion_events_path_locale_created (path, locale, created_at),
  KEY idx_conversion_events_session_created (session_id, created_at)
);
