import 'dotenv/config';
import { promises as fs } from 'node:fs';
import { createConnection, digestData, readSnapshotData, SNAPSHOT_PATH } from './snapshot-utils.mjs';

const snapshot = JSON.parse(await fs.readFile(SNAPSHOT_PATH, 'utf8'));
const connection = await createConnection();

try {
  const digest = digestData(await readSnapshotData(connection));
  if (digest !== snapshot.digest) {
    console.error('El snapshot Git de MariaDB esta desactualizado. Ejecuta: npm run db:snapshot');
    process.exit(1);
  }
  console.log(`Snapshot Git actualizado (${digest.slice(0, 12)}).`);
} finally {
  await connection.end();
}
