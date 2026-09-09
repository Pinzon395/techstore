import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { dataDirectory, backupDirectory } from '../db/runtime-paths.mjs';

async function directoryStats(directory) {
  let files = 0;
  let bytes = 0;
  async function walk(current) {
    let entries = [];
    try { entries = await fs.readdir(current, { withFileTypes: true }); } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile()) {
        const stat = await fs.stat(target);
        files += 1;
        bytes += stat.size;
      }
    }
  }
  await walk(directory);
  return { files, bytes };
}

function formatBytes(value) {
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

const directories = {
  data: dataDirectory,
  media: path.resolve(process.env.MEDIA_DIR || path.join(dataDirectory, 'commerce-media')),
  uploads: path.resolve(process.env.UPLOAD_DIR || path.join(dataDirectory, 'commerce-payment-proofs')),
  cache: path.resolve(process.env.CACHE_DIR || path.join(dataDirectory, 'cache')),
  backups: backupDirectory,
};

for (const [name, directory] of Object.entries(directories)) {
  const stats = await directoryStats(directory);
  console.log(`${name}: ${stats.files} files, ${formatBytes(stats.bytes)} (${directory})`);
}

if (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });
  try {
    const [[database]] = await connection.query(
      `SELECT COUNT(*) AS tables_count, COALESCE(SUM(data_length + index_length), 0) AS bytes
       FROM information_schema.tables WHERE table_schema = DATABASE()`
    );
    console.log(`database: ${database.tables_count} tables, ${formatBytes(Number(database.bytes || 0))}`);
  } finally {
    await connection.end();
  }
} else {
  console.log('database: N/D (faltan variables DB para consulta de solo lectura)');
}
