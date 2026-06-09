import 'dotenv/config';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createConnection } from './snapshot-utils.mjs';

const secret = process.env.DB_BACKUP_KEY;
if (!secret || secret.length < 20) {
  throw new Error('Define DB_BACKUP_KEY con al menos 20 caracteres en .env. No se guarda en Git.');
}

const connection = await createConnection();
try {
  const [tables] = await connection.query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME');
  const data = {};
  for (const { TABLE_NAME: table } of tables) {
    const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
    data[table] = rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Buffer.isBuffer(value) ? { $binary: value.toString('base64') } : value])));
  }

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(secret, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.from(JSON.stringify({ format: 1, createdAt: new Date().toISOString(), database: process.env.DB_NAME, data }));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const envelope = Buffer.concat([Buffer.from('PIXONDB1'), salt, iv, cipher.getAuthTag(), encrypted]);
  const dir = path.join(process.cwd(), 'backups');
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(dir, `pixon-${stamp}.pixonbak`);
  await fs.writeFile(target, envelope);
  console.log(`Backup cifrado creado: ${target} (${Math.round(envelope.length / 1024)} KB).`);
} finally { await connection.end(); }
