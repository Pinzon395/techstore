import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const MIGRATION_FILE_PATTERN = /^(?<version>\d{3,6})_(?<label>[a-z0-9][a-z0-9_-]*)\.sql$/;
export const APPLIED_STATUS = 'applied';
export const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function compareNames(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export async function loadMigrationFiles(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`No existe el directorio de migraciones: ${directory}`);
    }
    throw error;
  }

  const sqlEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith('.sql'));
  const invalidNames = sqlEntries
    .filter((entry) => !MIGRATION_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name);

  if (invalidNames.length) {
    throw new Error(
      `Nombres de migracion invalidos: ${invalidNames.join(', ')}. ` +
      'Usa NNN_nombre_descriptivo.sql con minusculas, numeros, guion o guion bajo.'
    );
  }

  const versions = new Map();
  const migrations = [];
  const realDirectory = await fs.realpath(directory);

  for (const entry of sqlEntries) {
    if (!entry.isFile() || entry.isSymbolicLink()) {
      throw new Error(`La migracion debe ser un archivo regular y no un enlace: ${entry.name}`);
    }

    const match = MIGRATION_FILE_PATTERN.exec(entry.name);
    const version = match.groups.version;
    if (versions.has(version)) {
      throw new Error(
        `Version de migracion duplicada ${version}: ${versions.get(version)} y ${entry.name}`
      );
    }
    versions.set(version, entry.name);

    const filePath = path.join(directory, entry.name);
    const realFilePath = await fs.realpath(filePath);
    const relativePath = path.relative(realDirectory, realFilePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`La migracion sale del directorio permitido: ${entry.name}`);
    }

    const contents = await fs.readFile(realFilePath);
    if (!contents.toString('utf8').trim()) {
      throw new Error(`La migracion esta vacia: ${entry.name}`);
    }

    migrations.push({
      name: entry.name,
      version,
      path: realFilePath,
      sql: contents.toString('utf8'),
      bytes: contents.byteLength,
      checksum: sha256(contents),
    });
  }

  return migrations.sort((left, right) => compareNames(left.name, right.name));
}

function normalizeRecord(record) {
  return {
    ...record,
    name: String(record.name),
    status: record.status ? String(record.status).toLowerCase() : APPLIED_STATUS,
    checksum_sha256: record.checksum_sha256
      ? String(record.checksum_sha256).toLowerCase()
      : null,
  };
}

export function analyzeMigrationState(migrations, rawRecords = []) {
  const records = rawRecords.map(normalizeRecord);
  const recordsByName = new Map(records.map((record) => [record.name, record]));
  const filesByName = new Map(migrations.map((migration) => [migration.name, migration]));
  const entries = [];
  const issues = [];

  for (const migration of migrations) {
    const record = recordsByName.get(migration.name);
    if (!record) {
      entries.push({ ...migration, state: 'pending', record: null });
      continue;
    }

    if (record.status !== APPLIED_STATUS) {
      const state = ['running', 'failed'].includes(record.status)
        ? record.status
        : 'unknown_status';
      entries.push({ ...migration, state, record });
      issues.push({
        type: state,
        name: migration.name,
        message: `La migracion ${migration.name} tiene estado ${record.status}.`,
      });
      if (record.checksum_sha256 && record.checksum_sha256 !== migration.checksum) {
        issues.push({
          type: 'checksum_mismatch',
          name: migration.name,
          message: `El checksum registrado de ${migration.name} no coincide con el archivo.`,
        });
      }
      continue;
    }

    if (!record.checksum_sha256) {
      entries.push({ ...migration, state: 'legacy_checksum_missing', record });
      issues.push({
        type: 'legacy_checksum_missing',
        name: migration.name,
        message: `La migracion legado ${migration.name} aun no tiene checksum base.`,
      });
      continue;
    }

    if (!CHECKSUM_PATTERN.test(record.checksum_sha256) || record.checksum_sha256 !== migration.checksum) {
      entries.push({ ...migration, state: 'checksum_mismatch', record });
      issues.push({
        type: 'checksum_mismatch',
        name: migration.name,
        message: `El checksum registrado de ${migration.name} no coincide con el archivo.`,
      });
      continue;
    }

    entries.push({ ...migration, state: 'applied', record });
  }

  for (const record of records) {
    if (filesByName.has(record.name)) continue;
    entries.push({ name: record.name, state: 'missing_file', record });
    issues.push({
      type: 'missing_file',
      name: record.name,
      message: `La base registra ${record.name}, pero el archivo no existe en el repositorio.`,
    });
  }

  const trackedNames = records.map((record) => record.name).sort(compareNames);
  for (const entry of entries.filter((candidate) => candidate.state === 'pending')) {
    const laterMigrationExists = trackedNames.some((name) => compareNames(name, entry.name) > 0);
    if (!laterMigrationExists) continue;
    entry.outOfOrder = true;
    issues.push({
      type: 'out_of_order',
      name: entry.name,
      message: `La migracion pendiente ${entry.name} es anterior a otra ya registrada.`,
    });
  }

  entries.sort((left, right) => compareNames(left.name, right.name));
  return {
    entries,
    issues,
    pending: entries.filter((entry) => entry.state === 'pending'),
    legacy: entries.filter((entry) => entry.state === 'legacy_checksum_missing'),
    applied: entries.filter((entry) => entry.state === 'applied'),
  };
}

export function blockingIssues(analysis, { allowLegacyBaseline = false } = {}) {
  return analysis.issues.filter((issue) => {
    if (allowLegacyBaseline && issue.type === 'legacy_checksum_missing') return false;
    return true;
  });
}

function readOptionValue(args, index, optionName) {
  const argument = args[index];
  const prefix = `${optionName}=`;
  if (argument.startsWith(prefix)) {
    const value = argument.slice(prefix.length);
    if (!value) throw new Error(`Falta el valor de ${optionName}.`);
    return { value, consumed: 0 };
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Falta el valor de ${optionName}.`);
  return { value, consumed: 1 };
}

function parsePositiveNumber(rawValue, optionName, { integer = false } = {}) {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
    throw new Error(`${optionName} debe ser un numero ${integer ? 'entero ' : ''}mayor que cero.`);
  }
  return value;
}

export function parseMigrationArgs(args, env = process.env) {
  const options = {
    mode: 'apply',
    backupPath: null,
    retryFailedName: null,
    backupMaxAgeHours: parsePositiveNumber(
      env.DB_MIGRATION_BACKUP_MAX_AGE_HOURS || '24',
      'DB_MIGRATION_BACKUP_MAX_AGE_HOURS'
    ),
    lockTimeoutSeconds: parsePositiveNumber(
      env.DB_MIGRATION_LOCK_TIMEOUT_SECONDS || '30',
      'DB_MIGRATION_LOCK_TIMEOUT_SECONDS',
      { integer: true }
    ),
    help: false,
  };
  let selectedReadOnlyMode = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument === '--plan' || argument === '--verify') {
      const mode = argument.slice(2);
      if (selectedReadOnlyMode && selectedReadOnlyMode !== mode) {
        throw new Error('Usa solo uno de --plan o --verify.');
      }
      selectedReadOnlyMode = mode;
      options.mode = mode;
      continue;
    }
    if (argument === '--backup' || argument.startsWith('--backup=')) {
      const { value, consumed } = readOptionValue(args, index, '--backup');
      options.backupPath = value;
      index += consumed;
      continue;
    }
    if (argument === '--retry-failed' || argument.startsWith('--retry-failed=')) {
      const { value, consumed } = readOptionValue(args, index, '--retry-failed');
      if (!MIGRATION_FILE_PATTERN.test(value)) {
        throw new Error('--retry-failed debe recibir el nombre exacto de una migracion valida.');
      }
      options.retryFailedName = value;
      index += consumed;
      continue;
    }
    if (
      argument === '--backup-max-age-hours' ||
      argument.startsWith('--backup-max-age-hours=')
    ) {
      const { value, consumed } = readOptionValue(args, index, '--backup-max-age-hours');
      options.backupMaxAgeHours = parsePositiveNumber(value, '--backup-max-age-hours');
      index += consumed;
      continue;
    }
    if (
      argument === '--lock-timeout-seconds' ||
      argument.startsWith('--lock-timeout-seconds=')
    ) {
      const { value, consumed } = readOptionValue(args, index, '--lock-timeout-seconds');
      options.lockTimeoutSeconds = parsePositiveNumber(value, '--lock-timeout-seconds', {
        integer: true,
      });
      index += consumed;
      continue;
    }
    throw new Error(`Opcion desconocida: ${argument}`);
  }

  if (options.retryFailedName && options.mode !== 'apply') {
    throw new Error('--retry-failed solo puede utilizarse al aplicar migraciones.');
  }

  return options;
}

export function buildAdvisoryLockName(databaseIdentity) {
  return `pixon:migrate:${sha256(databaseIdentity).slice(0, 40)}`;
}

export function sanitizeMigrationError(error) {
  const code = String(error?.code || 'MIGRATION_ERROR').replace(/[^A-Z0-9_]/gi, '').slice(0, 64);
  const sqlState = String(error?.sqlState || '').replace(/[^A-Z0-9]/gi, '').slice(0, 16);
  const message = String(error?.message || 'Error de migracion')
    .replace(/(?:password|pwd)\s*=\s*[^\s;]+/gi, '[REDACTED]')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3500);
  return [code, sqlState, message].filter(Boolean).join(' | ');
}
