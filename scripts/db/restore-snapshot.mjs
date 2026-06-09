import 'dotenv/config';
import { promises as fs } from 'node:fs';
import { SNAPSHOT_TABLES } from './snapshot-config.mjs';
import { createConnection, decodeValue, SNAPSHOT_PATH } from './snapshot-utils.mjs';

if (!process.argv.includes('--force')) {
  console.error('Restauracion cancelada. Este comando reemplaza datos versionados. Usa: npm run db:restore -- --force');
  process.exit(1);
}

const snapshot = JSON.parse(await fs.readFile(SNAPSHOT_PATH, 'utf8'));
const connection = await createConnection();

try {
  await connection.beginTransaction();

  for (const table of SNAPSHOT_TABLES) {
    for (const row of snapshot.data[table] || []) {
      const columns = Object.keys(row);
      if (!columns.length) continue;
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map((column) => decodeValue(row[column]));
      const updates = columns.map((column) => `\`${column}\` = VALUES(\`${column}\`)`).join(', ');
      await connection.query(
        `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`,
        values
      );
    }
  }

  await connection.commit();
  console.log(`Snapshot fusionado con la base local (${snapshot.digest.slice(0, 12)}).`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
