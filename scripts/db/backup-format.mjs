import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const BACKUP_MAGIC = Buffer.from('PIXONDB1');
export const BACKUP_FORMAT = 2;
export const MANIFEST_FORMAT = 1;
const HEADER_LENGTH = BACKUP_MAGIC.length + 16 + 12 + 16;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function assertSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 20) {
    throw new Error('DB_BACKUP_KEY debe tener al menos 20 caracteres.');
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function databaseFingerprint(databaseName) {
  return sha256(`pixon-database:${String(databaseName || '')}`);
}

export function schemaDigest(schema) {
  return sha256(Buffer.from(JSON.stringify(schema), 'utf8'));
}

export function encryptBackupPayload(payload, secret, random = crypto.randomBytes) {
  assertSecret(secret);
  const salt = random(16);
  const iv = random(12);
  if (!Buffer.isBuffer(salt) || salt.length !== 16 || !Buffer.isBuffer(iv) || iv.length !== 12) {
    throw new Error('El generador criptografico devolvio longitudes invalidas.');
  }

  const key = crypto.scryptSync(secret, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([BACKUP_MAGIC, salt, iv, cipher.getAuthTag(), encrypted]);
}

export function decryptBackupEnvelope(envelope, secret) {
  assertSecret(secret);
  if (!Buffer.isBuffer(envelope) || envelope.length <= HEADER_LENGTH) {
    throw new Error('El archivo no contiene un backup Pixon valido.');
  }
  if (!envelope.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) {
    throw new Error('La cabecera del backup no es valida.');
  }

  const saltStart = BACKUP_MAGIC.length;
  const ivStart = saltStart + 16;
  const tagStart = ivStart + 12;
  const encryptedStart = tagStart + 16;
  const salt = envelope.subarray(saltStart, ivStart);
  const iv = envelope.subarray(ivStart, tagStart);
  const tag = envelope.subarray(tagStart, encryptedStart);

  try {
    const key = crypto.scryptSync(secret, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(envelope.subarray(encryptedStart)),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {
    throw new Error('No se pudo autenticar el backup. La clave o el archivo no son validos.');
  }
}

export function createBackupManifest({ envelope, payload, fileName }) {
  const sourceDatabase = payload?.source?.database || payload?.database;
  return {
    format: MANIFEST_FORMAT,
    backupFormat: payload.format,
    encrypted: true,
    file: path.basename(fileName),
    createdAt: payload.createdAt,
    byteLength: envelope.byteLength,
    sha256: sha256(envelope),
    databaseFingerprint: databaseFingerprint(sourceDatabase),
    schemaSha256: payload.schemaSha256 || null,
    tableCount: isPlainObject(payload.data) ? Object.keys(payload.data).length : 0,
    rowCount: isPlainObject(payload.data)
      ? Object.values(payload.data).reduce(
          (total, rows) => total + (Array.isArray(rows) ? rows.length : 0),
          0
        )
      : 0,
  };
}

function validateManifest(manifest, expected) {
  if (!isPlainObject(manifest) || manifest.format !== MANIFEST_FORMAT) {
    throw new Error('El manifiesto del backup no es valido.');
  }
  const checks = [
    ['backupFormat', expected.backupFormat],
    ['encrypted', true],
    ['file', expected.file],
    ['createdAt', expected.createdAt],
    ['byteLength', expected.byteLength],
    ['sha256', expected.sha256],
    ['databaseFingerprint', expected.databaseFingerprint],
    ['schemaSha256', expected.schemaSha256],
    ['tableCount', expected.tableCount],
    ['rowCount', expected.rowCount],
  ];
  for (const [field, value] of checks) {
    if (manifest[field] !== value) {
      throw new Error(`El manifiesto no coincide con el backup (${field}).`);
    }
  }
}

export function verifyBackupBuffer(envelope, {
  secret,
  fileName = 'backup.pixonbak',
  expectedDatabase,
  maxAgeHours = Number.POSITIVE_INFINITY,
  now = new Date(),
  manifest = null,
  requireManifest = false,
  requireDatabaseIdentity = true,
  minimumFormat = 1,
  includePayload = false,
} = {}) {
  const payload = decryptBackupEnvelope(envelope, secret);
  if (!isPlainObject(payload) || !Number.isInteger(payload.format) || payload.format < minimumFormat) {
    throw new Error(`El backup no cumple con el formato minimo requerido (${minimumFormat}).`);
  }
  if (!isPlainObject(payload.data)) {
    throw new Error('El backup autenticado no contiene un mapa de tablas valido.');
  }
  const dataTables = Object.keys(payload.data);
  if (!dataTables.length) {
    throw new Error('El backup autenticado no contiene tablas.');
  }

  for (const [table, rows] of Object.entries(payload.data)) {
    if (!table || !Array.isArray(rows)) {
      throw new Error('El backup contiene una tabla o conjunto de filas invalido.');
    }
  }

  const sourceDatabase = payload?.source?.database || payload.database;
  if (!sourceDatabase && requireDatabaseIdentity) {
    throw new Error('El backup no identifica su base de datos de origen.');
  }
  if (sourceDatabase && expectedDatabase && sourceDatabase !== expectedDatabase) {
    throw new Error('El backup pertenece a una base de datos diferente a la configurada.');
  }

  const createdAt = new Date(payload.createdAt);
  const nowDate = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(createdAt.getTime()) || !Number.isFinite(nowDate.getTime())) {
    throw new Error('La fecha del backup no es valida.');
  }
  const ageMilliseconds = nowDate.getTime() - createdAt.getTime();
  if (ageMilliseconds < -5 * 60 * 1000) {
    throw new Error('La fecha del backup esta en el futuro. Revisa el reloj del servidor.');
  }
  if (Number.isFinite(maxAgeHours) && ageMilliseconds > maxAgeHours * 60 * 60 * 1000) {
    throw new Error(`El backup excede la antiguedad maxima de ${maxAgeHours} horas.`);
  }

  if (payload.format >= 2) {
    if (!Array.isArray(payload.schema) || !payload.schemaSha256) {
      throw new Error('El backup no contiene el snapshot de esquema requerido.');
    }
    if (schemaDigest(payload.schema) !== payload.schemaSha256) {
      throw new Error('El snapshot de esquema interno no coincide con su checksum.');
    }
    const schemaTables = payload.schema.map((definition) => definition?.table);
    if (
      schemaTables.some((table) => typeof table !== 'string' || !table) ||
      new Set(schemaTables).size !== schemaTables.length ||
      schemaTables.length !== dataTables.length ||
      schemaTables.some((table) => !Object.hasOwn(payload.data, table))
    ) {
      throw new Error('Las tablas del snapshot de esquema y de datos no coinciden.');
    }
  }

  const expectedManifest = createBackupManifest({ envelope, payload, fileName });
  if (requireManifest && !manifest) {
    throw new Error('Falta el manifiesto .manifest.json requerido para el preflight.');
  }
  if (manifest) validateManifest(manifest, expectedManifest);

  const result = {
    format: payload.format,
    createdAt: createdAt.toISOString(),
    ageHours: Math.max(0, ageMilliseconds / (60 * 60 * 1000)),
    sha256: expectedManifest.sha256,
    byteLength: envelope.byteLength,
    tableCount: expectedManifest.tableCount,
    rowCount: expectedManifest.rowCount,
    schemaSha256: payload.schemaSha256 || null,
    databaseFingerprint: expectedManifest.databaseFingerprint,
    manifestVerified: Boolean(manifest),
  };
  if (includePayload) result.payload = payload;
  return result;
}

export async function readManifestIfPresent(backupPath) {
  const manifestPath = `${backupPath}.manifest.json`;
  try {
    const contents = await fs.readFile(manifestPath, 'utf8');
    return { path: manifestPath, value: JSON.parse(contents) };
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    if (error instanceof SyntaxError) {
      throw new Error(`El manifiesto no contiene JSON valido: ${manifestPath}`);
    }
    throw error;
  }
}

export async function verifyBackupFile(backupPath, options = {}) {
  const resolvedPath = path.resolve(backupPath);
  const envelope = await fs.readFile(resolvedPath);
  const manifestFile = await readManifestIfPresent(resolvedPath);
  const verification = verifyBackupBuffer(envelope, {
    ...options,
    fileName: path.basename(resolvedPath),
    manifest: manifestFile?.value || null,
  });
  return {
    ...verification,
    path: resolvedPath,
    manifestPath: manifestFile?.path || null,
  };
}

export async function findLatestBackup(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.pixonbak'))
      .map(async (entry) => {
        const filePath = path.join(directory, entry.name);
        const stat = await fs.stat(filePath);
        return { path: filePath, modifiedAt: stat.mtimeMs };
      })
  );
  candidates.sort((left, right) => right.modifiedAt - left.modifiedAt);
  return candidates[0]?.path || null;
}

export async function atomicWriteFile(targetPath, contents, options = {}) {
  const temporaryPath = `${targetPath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  await fs.writeFile(temporaryPath, contents, { flag: 'wx', mode: 0o600, ...options });
  try {
    await fs.rename(temporaryPath, targetPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}
