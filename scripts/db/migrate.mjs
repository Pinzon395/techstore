import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'pixon_app', password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pixon_db', multipleStatements: true,
});

try {
  await connection.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
  const dir = path.join(process.cwd(), 'server', 'sql', 'migrations');
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.sql')).sort();
  for (const name of files) {
    const [[applied]] = await connection.query('SELECT name FROM schema_migrations WHERE name = ?', [name]);
    if (applied) continue;
    const sql = await fs.readFile(path.join(dir, name), 'utf8');
    await connection.beginTransaction();
    try {
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [name]);
      await connection.commit();
      console.log(`Migracion aplicada: ${name}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
} finally { await connection.end(); }
