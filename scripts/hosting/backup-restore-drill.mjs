import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import mysql from 'mysql2/promise';
import { findLatestBackup } from '../db/backup-format.mjs';
import { backupDirectory } from '../db/runtime-paths.mjs';

const database = String(process.env.DB_NAME || '').trim();
if (process.env.NODE_ENV !== 'test' || !/(?:^|[_-])test(?:[_-]|$)/i.test(database)) {
  throw new Error('Restore drill bloqueado: requiere NODE_ENV=test y DB_NAME con token "test".');
}

function run(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(), env: process.env, stdio: 'inherit'
  });
  if (result.status !== 0) throw new Error(`Fallo ${script}`);
}

async function tableCounts(connection) {
  const [tables] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
      ORDER BY TABLE_NAME`
  );
  const counts = {};
  for (const { TABLE_NAME: table } of tables) {
    const [[row]] = await connection.query(`SELECT COUNT(*) AS total FROM \`${table.replace(/`/g, '``')}\``);
    counts[table] = Number(row.total);
  }
  return counts;
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'pixon_app',
  password: process.env.DB_PASSWORD || '',
  database,
});

try {
  const before = await tableCounts(connection);
  run('scripts/db/backup-encrypted.mjs');
  const backup = await findLatestBackup(backupDirectory);
  if (!backup) throw new Error('No se creó backup para el drill.');
  run('scripts/db/restore-encrypted.mjs', [backup, '--force']);
  const after = await tableCounts(connection);
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error('Restore drill falló: los conteos de tablas cambiaron.');
  }
  console.log(`PASS restore drill: ${Object.keys(after).length} tablas restauradas desde ${backup}`);
} finally {
  await connection.end();
}
