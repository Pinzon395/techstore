-- 014_google_reviews.sql
-- Reseñas reales de Google Business Profile (accounts.locations.reviews.list),
-- sincronizadas en servidor y publicadas solo tras aprobación en admin.
-- No sustituye a `comments` (testimonios locales propios); es una fuente
-- separada porque su ciclo de vida es distinto: el contenido pertenece a
-- Google (no editable), puede actualizarse o desaparecer del lado de Google,
-- y "ocultar" nunca debe borrar la fila (a diferencia de comments.DELETE).

-- Un solo negocio, una sola credencial: fila singleton (id=1).
-- El refresh_token vive únicamente aquí (server-side); nunca se expone en
-- ninguna respuesta JSON ni se referencia desde el frontend.
CREATE TABLE IF NOT EXISTS google_oauth_credentials (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  scope VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMP NOT NULL,
  authorized_by VARCHAR(190) DEFAULT NULL,
  authorized_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_google_oauth_singleton CHECK (id = 1)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS google_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  google_review_id VARCHAR(255) NOT NULL,
  location_id VARCHAR(255) NOT NULL,
  reviewer_display_name VARCHAR(255) NOT NULL,
  star_rating TINYINT UNSIGNED NOT NULL,
  comment TEXT DEFAULT NULL,
  google_create_time TIMESTAMP NOT NULL,
  google_update_time TIMESTAMP NOT NULL,
  review_reply_comment TEXT DEFAULT NULL,
  review_reply_time TIMESTAMP NULL DEFAULT NULL,
  review_url VARCHAR(500) DEFAULT NULL,
  media JSON DEFAULT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'GOOGLE',
  moderation_status ENUM('PENDING','APPROVED','HIDDEN','REMOVED') NOT NULL DEFAULT 'PENDING',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  approved_by VARCHAR(190) DEFAULT NULL,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  hidden_by VARCHAR(190) DEFAULT NULL,
  hidden_at TIMESTAMP NULL DEFAULT NULL,
  last_synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_google_review_id (google_review_id),
  KEY idx_google_reviews_moderation (moderation_status, google_create_time DESC),
  KEY idx_google_reviews_location (location_id)
) ENGINE=InnoDB;

-- Estado de sincronización + rating agregado que Google reporta (distinto del
-- promedio de lo que aprobamos: mostrar el real de Google, no uno propio).
CREATE TABLE IF NOT EXISTS google_reviews_sync_state (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  account_id VARCHAR(255) DEFAULT NULL,
  location_id VARCHAR(255) DEFAULT NULL,
  average_rating DECIMAL(2,1) DEFAULT NULL,
  total_review_count INT UNSIGNED DEFAULT NULL,
  google_maps_uri VARCHAR(500) DEFAULT NULL,
  write_review_url VARCHAR(500) DEFAULT NULL,
  last_synced_at TIMESTAMP NULL DEFAULT NULL,
  last_sync_trigger VARCHAR(20) DEFAULT NULL,
  last_sync_status ENUM('NEVER','OK','ERROR') NOT NULL DEFAULT 'NEVER',
  last_error TEXT DEFAULT NULL,
  last_pubsub_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_google_sync_state_singleton CHECK (id = 1)
) ENGINE=InnoDB;

INSERT INTO google_reviews_sync_state (id) VALUES (1)
  ON DUPLICATE KEY UPDATE id = id;
