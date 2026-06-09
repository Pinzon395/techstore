import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createConnection, digestData, readSnapshotData, SNAPSHOT_PATH, stableStringify } from './snapshot-utils.mjs';
import { SENSITIVE_TABLES, SNAPSHOT_TABLES } from './snapshot-config.mjs';

const connection = await createConnection();

try {
  const data = await readSnapshotData(connection);
  const digest = digestData(data);
  let previousDigest = '';

  try {
    previousDigest = JSON.parse(await fs.readFile(SNAPSHOT_PATH, 'utf8')).digest || '';
  } catch (_error) {
    // Primer snapshot.
  }

  if (previousDigest === digest) {
    console.log(`Snapshot Git sin cambios (${digest.slice(0, 12)}).`);
    process.exit(0);
  }

  const snapshot = {
    format: 1,
    generatedAt: new Date().toISOString(),
    database: process.env.DB_NAME || 'pixon_db',
    digest,
    includedTables: SNAPSHOT_TABLES,
    excludedSensitiveTables: SENSITIVE_TABLES,
    data,
  };

  await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
  await fs.writeFile(SNAPSHOT_PATH, stableStringify(snapshot), 'utf8');
  console.log(`Snapshot Git actualizado: ${path.relative(process.cwd(), SNAPSHOT_PATH)} (${digest.slice(0, 12)}).`);
} finally {
  await connection.end();
}
