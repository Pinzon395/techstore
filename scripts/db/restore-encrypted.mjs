import 'dotenv/config';
import path from 'node:path';
import { createConnection, decodeValue } from './snapshot-utils.mjs';
import { verifyBackupFile } from './backup-format.mjs';

const [file] = process.argv.slice(2).filter((arg) => arg !== '--force');
if (!process.argv.includes('--force') || !file) throw new Error('Usa: npm run db:backup:restore -- backups/archivo.pixonbak --force');
const secret = process.env.DB_BACKUP_KEY;
if (!secret) throw new Error('DB_BACKUP_KEY no esta definida.');

const backupPath = path.resolve(file);
const verification = await verifyBackupFile(backupPath, {
  secret,
  expectedDatabase: process.env.DB_NAME || 'pixon_db',
  requireDatabaseIdentity: false,
  minimumFormat: 1,
  includePayload: true,
});
const backup = verification.payload;
const connection = await createConnection();
try {
  await connection.query('SET FOREIGN_KEY_CHECKS=0');
  await connection.beginTransaction();
  for (const table of Object.keys(backup.data).reverse()) await connection.query(`DELETE FROM \`${table}\``);
  for (const [table, rows] of Object.entries(backup.data)) {
    for (const row of rows) {
      const columns = Object.keys(row);
      if (!columns.length) continue;
      await connection.query(`INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(',')}) VALUES (${columns.map(() => '?').join(',')})`, columns.map((c) => decodeValue(row[c])));
    }
  }
  await connection.commit();
  console.log(
    `Backup autenticado y restaurado: ${backupPath} ` +
    `(formato ${verification.format}, SHA-256 ${verification.sha256.slice(0, 12)}...).`
  );
} catch (error) { await connection.rollback(); throw error; }
finally { await connection.query('SET FOREIGN_KEY_CHECKS=1'); await connection.end(); }
