import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createConnection } from './snapshot-utils.mjs';
import {
  BACKUP_FORMAT,
  atomicWriteFile,
  createBackupManifest,
  encryptBackupPayload,
  schemaDigest,
  verifyBackupFile,
} from './backup-format.mjs';

const secret = process.env.DB_BACKUP_KEY;
if (!secret || secret.length < 20) {
  throw new Error('Define DB_BACKUP_KEY con al menos 20 caracteres. Nunca se guarda en Git.');
}

const databaseName = process.env.DB_NAME || 'pixon_db';

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function serializeValue(value) {
  if (Buffer.isBuffer(value)) return { $binary: value.toString('base64') };
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeValue(nestedValue)])
    );
  }
  return value;
}

const connection = await createConnection();
let transactionOpen = false;
let snapshotCreatedAt = null;
try {
  await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  transactionOpen = true;
  snapshotCreatedAt = new Date().toISOString();

  const [[server]] = await connection.query('SELECT VERSION() AS version');
  const [tables] = await connection.query(
    `SELECT TABLE_NAME, ENGINE
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME`
  );
  const nonTransactionalTables = tables.filter(
    ({ ENGINE: engine }) => String(engine).toLowerCase() !== 'innodb'
  );
  if (nonTransactionalTables.length) {
    throw new Error(
      `El backup consistente requiere InnoDB. Tablas incompatibles: ` +
      nonTransactionalTables.map(({ TABLE_NAME: table }) => table).join(', ')
    );
  }

  const data = {};
  const schema = [];
  for (const { TABLE_NAME: table } of tables) {
    const [[definition]] = await connection.query(`SHOW CREATE TABLE ${quoteIdentifier(table)}`);
    const createSql = definition['Create Table'];
    if (!createSql) throw new Error(`No se pudo obtener el esquema de ${table}.`);
    schema.push({ table, createSql });

    const [rows] = await connection.query(`SELECT * FROM ${quoteIdentifier(table)}`);
    data[table] = rows.map((row) => serializeValue(row));
  }

  await connection.commit();
  transactionOpen = false;

  const payload = {
    format: BACKUP_FORMAT,
    createdAt: snapshotCreatedAt,
    source: {
      database: databaseName,
      engine: 'MariaDB',
      serverVersion: String(server.version || ''),
    },
    schema,
    schemaSha256: schemaDigest(schema),
    data,
  };
  const envelope = encryptBackupPayload(payload, secret);
  const directory = path.join(process.cwd(), 'backups');
  await fs.mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(directory, `pixon-${stamp}.pixonbak`);
  const manifest = createBackupManifest({ envelope, payload, fileName: path.basename(target) });
  const manifestPath = `${target}.manifest.json`;

  await atomicWriteFile(target, envelope);
  await atomicWriteFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8' });

  const verification = await verifyBackupFile(target, {
    secret,
    expectedDatabase: databaseName,
    requireManifest: true,
    minimumFormat: BACKUP_FORMAT,
  });

  console.log(`Backup cifrado y verificado: ${target}`);
  console.log(
    `Formato ${verification.format}; ${verification.tableCount} tablas; ` +
    `${verification.rowCount} filas; ${Math.round(verification.byteLength / 1024)} KB.`
  );
} catch (error) {
  if (transactionOpen) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
  }
  throw error;
} finally {
  await connection.end();
}
