import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  atomicWriteFile,
  createBackupManifest,
  encryptBackupPayload,
  verifyBackupFile,
} from './backup-format.mjs';

const [sourceArgument, targetArgument] = process.argv.slice(2);
if (!sourceArgument || !targetArgument) {
  throw new Error('Uso: node scripts/db/rekey-backup.mjs ORIGEN.pixonbak DESTINO.pixonbak');
}

const oldSecret = process.env.DB_BACKUP_OLD_KEY;
const newSecret = process.env.DB_BACKUP_KEY;
if (!oldSecret || oldSecret.length < 20) {
  throw new Error('DB_BACKUP_OLD_KEY debe contener la clave vigente del backup de origen.');
}
if (!newSecret || newSecret.length < 20 || newSecret === oldSecret) {
  throw new Error('DB_BACKUP_KEY debe ser una clave nueva y diferente de al menos 20 caracteres.');
}

const source = path.resolve(sourceArgument);
const target = path.resolve(targetArgument);
if (source === target) throw new Error('El destino debe ser distinto del backup de origen.');

await fs.access(source);
try {
  await fs.access(target);
  throw new Error(`El destino ya existe: ${target}`);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const expectedDatabase = process.env.DB_NAME || 'pixon_db';
const original = await verifyBackupFile(source, {
  secret: oldSecret,
  expectedDatabase,
  requireManifest: true,
  minimumFormat: 2,
  includePayload: true,
});
const envelope = encryptBackupPayload(original.payload, newSecret);
const manifest = createBackupManifest({
  envelope,
  payload: original.payload,
  fileName: path.basename(target),
});

await atomicWriteFile(target, envelope);
await atomicWriteFile(`${target}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, {
  encoding: 'utf8',
});

const verification = await verifyBackupFile(target, {
  secret: newSecret,
  expectedDatabase,
  requireManifest: true,
  minimumFormat: 2,
});
console.log(
  `Backup re-cifrado y verificado: ${verification.path}; ` +
  `${verification.tableCount} tablas; ${verification.rowCount} filas.`
);
