import 'dotenv/config';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createConnection, decodeValue } from './snapshot-utils.mjs';

const [file] = process.argv.slice(2).filter((arg) => arg !== '--force');
if (!process.argv.includes('--force') || !file) throw new Error('Usa: npm run db:backup:restore -- backups/archivo.pixonbak --force');
const secret = process.env.DB_BACKUP_KEY;
if (!secret) throw new Error('DB_BACKUP_KEY no esta definida.');

const envelope = await fs.readFile(path.resolve(file));
if (envelope.subarray(0, 8).toString() !== 'PIXONDB1') throw new Error('Formato de backup invalido.');
const salt = envelope.subarray(8, 24), iv = envelope.subarray(24, 36), tag = envelope.subarray(36, 52);
const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.scryptSync(secret, salt, 32), iv);
decipher.setAuthTag(tag);
const backup = JSON.parse(Buffer.concat([decipher.update(envelope.subarray(52)), decipher.final()]).toString('utf8'));
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
  console.log(`Backup restaurado: ${path.resolve(file)}`);
} catch (error) { await connection.rollback(); throw error; }
finally { await connection.query('SET FOREIGN_KEY_CHECKS=1'); await connection.end(); }
