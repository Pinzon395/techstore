const TABLE_NAME = 'schema_migrations';

const COLUMN_DEFINITIONS = new Map([
  ['checksum_sha256', 'CHAR(64) NULL'],
  ['checksum_origin', "VARCHAR(32) NOT NULL DEFAULT 'legacy'"],
  ['status', "VARCHAR(32) NOT NULL DEFAULT 'applied'"],
  ['started_at', 'DATETIME(6) NULL'],
  ['applied_at', 'DATETIME(6) NULL'],
  ['finished_at', 'DATETIME(6) NULL'],
  ['duration_ms', 'BIGINT UNSIGNED NULL'],
  ['sql_bytes', 'BIGINT UNSIGNED NULL'],
  ['runner_id', 'VARCHAR(191) NULL'],
  ['attempt_count', 'INT UNSIGNED NOT NULL DEFAULT 1'],
  ['last_error', 'TEXT NULL'],
  ['checksum_recorded_at', 'DATETIME(6) NULL'],
]);

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  name VARCHAR(255) NOT NULL PRIMARY KEY,
  checksum_sha256 CHAR(64) NULL,
  checksum_origin VARCHAR(32) NOT NULL DEFAULT 'runtime',
  status VARCHAR(32) NOT NULL DEFAULT 'applied',
  started_at DATETIME(6) NULL,
  applied_at DATETIME(6) NULL,
  finished_at DATETIME(6) NULL,
  duration_ms BIGINT UNSIGNED NULL,
  sql_bytes BIGINT UNSIGNED NULL,
  runner_id VARCHAR(191) NULL,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 1,
  last_error TEXT NULL,
  checksum_recorded_at DATETIME(6) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

export async function inspectMigrationStore(connection) {
  const [[table]] = await connection.query(
    `SELECT ENGINE
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [TABLE_NAME]
  );
  if (!table) {
    return {
      exists: false,
      engine: null,
      columns: new Map(),
      primaryKeyColumns: [],
      missingColumns: ['name', ...COLUMN_DEFINITIONS.keys()],
      records: [],
    };
  }

  const [columnRows] = await connection.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, CHARACTER_MAXIMUM_LENGTH
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION`,
    [TABLE_NAME]
  );
  const [keyRows] = await connection.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = 'PRIMARY'
      ORDER BY SEQ_IN_INDEX`,
    [TABLE_NAME]
  );
  const columns = new Map(columnRows.map((column) => [column.COLUMN_NAME, column]));
  const [records] = columns.has('name')
    ? await connection.query('SELECT * FROM schema_migrations ORDER BY name')
    : [[]];
  return {
    exists: true,
    engine: table.ENGINE,
    columns,
    primaryKeyColumns: keyRows.map((row) => row.COLUMN_NAME),
    missingColumns: [...COLUMN_DEFINITIONS.keys()].filter((name) => !columns.has(name)),
    records,
  };
}

export function validateMigrationStoreShape(store) {
  if (!store.exists) return;
  if (String(store.engine).toLowerCase() !== 'innodb') {
    throw new Error('schema_migrations debe usar el motor InnoDB.');
  }
  if (!store.columns.has('name')) {
    throw new Error('schema_migrations existe pero no contiene la columna name.');
  }
  if (store.primaryKeyColumns.join(',') !== 'name') {
    throw new Error('schema_migrations debe conservar name como llave primaria unica.');
  }
}

export async function ensureMigrationStore(connection) {
  let store = await inspectMigrationStore(connection);
  validateMigrationStoreShape(store);
  if (!store.exists) {
    await connection.query(CREATE_TABLE_SQL);
    store = await inspectMigrationStore(connection);
    validateMigrationStoreShape(store);
  }

  for (const columnName of store.missingColumns) {
    const definition = COLUMN_DEFINITIONS.get(columnName);
    await connection.query(
      `ALTER TABLE schema_migrations ADD COLUMN \`${columnName}\` ${definition}`
    );
  }

  store = await inspectMigrationStore(connection);
  validateMigrationStoreShape(store);
  if (store.missingColumns.length) {
    throw new Error(`No se pudieron agregar columnas: ${store.missingColumns.join(', ')}.`);
  }
  return store;
}

export async function baselineLegacyMigration(connection, migration) {
  const [result] = await connection.query(
    `UPDATE schema_migrations
        SET checksum_sha256 = ?,
            checksum_origin = 'legacy_baseline',
            checksum_recorded_at = NOW(6),
            sql_bytes = COALESCE(sql_bytes, ?),
            status = 'applied'
      WHERE name = ?
        AND checksum_sha256 IS NULL
        AND status = 'applied'`,
    [migration.checksum, migration.bytes, migration.name]
  );
  if (result.affectedRows !== 1) {
    throw new Error(`No se pudo fijar el checksum legado de ${migration.name}.`);
  }
}

export async function markMigrationRunning(connection, migration, runnerId) {
  await connection.query(
    `INSERT INTO schema_migrations (
       name, checksum_sha256, checksum_origin, status, started_at, finished_at,
       duration_ms, sql_bytes, runner_id, attempt_count, last_error, checksum_recorded_at
     ) VALUES (?, ?, 'runtime', 'running', NOW(6), NULL, NULL, ?, ?, 1, NULL, NOW(6))`,
    [migration.name, migration.checksum, migration.bytes, runnerId]
  );
}

export async function markFailedMigrationRunning(connection, migration, runnerId) {
  const [result] = await connection.query(
    `UPDATE schema_migrations
        SET checksum_sha256 = ?,
            checksum_origin = 'runtime_retry',
            status = 'running',
            started_at = NOW(6),
            finished_at = NULL,
            duration_ms = NULL,
            sql_bytes = ?,
            runner_id = ?,
            attempt_count = attempt_count + 1,
            last_error = NULL,
            checksum_recorded_at = NOW(6)
      WHERE name = ?
        AND status = 'failed'`,
    [migration.checksum, migration.bytes, runnerId, migration.name]
  );
  if (result.affectedRows !== 1) {
    throw new Error(`No se pudo preparar el reintento de ${migration.name}.`);
  }
}

export async function markMigrationApplied(connection, migration, runnerId, durationMs) {
  const [result] = await connection.query(
    `UPDATE schema_migrations
        SET status = 'applied',
            applied_at = NOW(6),
            finished_at = NOW(6),
            duration_ms = ?,
            last_error = NULL
      WHERE name = ?
        AND checksum_sha256 = ?
        AND status = 'running'
        AND runner_id = ?`,
    [durationMs, migration.name, migration.checksum, runnerId]
  );
  if (result.affectedRows !== 1) {
    throw new Error(`No se pudo confirmar el estado aplicado de ${migration.name}.`);
  }
}

export async function markMigrationFailed(connection, migration, runnerId, durationMs, errorMessage) {
  const [result] = await connection.query(
    `UPDATE schema_migrations
        SET status = 'failed',
            finished_at = NOW(6),
            duration_ms = ?,
            last_error = ?
      WHERE name = ?
        AND checksum_sha256 = ?
        AND status = 'running'
        AND runner_id = ?`,
    [durationMs, errorMessage, migration.name, migration.checksum, runnerId]
  );
  if (result.affectedRows !== 1) {
    throw new Error(`No se pudo registrar el fallo de ${migration.name}.`);
  }
}
