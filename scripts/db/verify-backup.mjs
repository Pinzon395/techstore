import 'dotenv/config';
import path from 'node:path';
import { findLatestBackup, verifyBackupFile } from './backup-format.mjs';
import { backupDirectory } from './runtime-paths.mjs';

function usage() {
  console.log(`Uso:
  npm run db:backup:verify -- [backups/archivo.pixonbak] [--max-age-hours 24]

Verifica SHA-256, manifiesto, autenticidad AES-256-GCM, formato, fecha,
base de datos de origen y checksum del esquema. No escribe en MariaDB.`);
}

function parseArgs(args) {
  let file = null;
  let maxAgeHours = Number(process.env.DB_MIGRATION_BACKUP_MAX_AGE_HOURS || 24);
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
    throw new Error('DB_MIGRATION_BACKUP_MAX_AGE_HOURS debe ser mayor que cero.');
  }
  let help = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      help = true;
      continue;
    }
    if (argument === '--max-age-hours' || argument.startsWith('--max-age-hours=')) {
      const inlineValue = argument.startsWith('--max-age-hours=')
        ? argument.slice('--max-age-hours='.length)
        : args[++index];
      maxAgeHours = Number(inlineValue);
      if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
        throw new Error('--max-age-hours debe ser mayor que cero.');
      }
      continue;
    }
    if (argument.startsWith('--')) throw new Error(`Opcion desconocida: ${argument}`);
    if (file) throw new Error('Solo se puede verificar un backup por ejecucion.');
    file = argument;
  }
  return { file, maxAgeHours, help };
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  usage();
  process.exitCode = 0;
} else {
  const secret = process.env.DB_BACKUP_KEY;
  if (!secret || secret.length < 20) {
    throw new Error('Define DB_BACKUP_KEY con al menos 20 caracteres.');
  }

  const file = options.file
    ? path.resolve(options.file)
    : await findLatestBackup(backupDirectory);
  if (!file) {
    throw new Error('No se encontro un backup .pixonbak. Crea uno antes del preflight.');
  }

  const result = await verifyBackupFile(file, {
    secret,
    expectedDatabase: process.env.DB_NAME || 'pixon_db',
    maxAgeHours: options.maxAgeHours,
    requireManifest: true,
    minimumFormat: 2,
  });

  console.log(`Backup verificado: ${result.path}`);
  console.log(`Manifiesto: ${result.manifestPath}`);
  console.log(`Creado: ${result.createdAt}; antiguedad: ${result.ageHours.toFixed(2)} horas.`);
  console.log(
    `SHA-256: ${result.sha256}; ${result.tableCount} tablas; ${result.rowCount} filas; ` +
    `formato ${result.format}.`
  );
}
