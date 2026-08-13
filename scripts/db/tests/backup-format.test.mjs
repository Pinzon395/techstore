import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBackupManifest,
  encryptBackupPayload,
  schemaDigest,
  verifyBackupBuffer,
} from '../backup-format.mjs';

const secret = 'clave-de-prueba-muy-larga-1234567890';
const schema = [
  { table: 'schema_migrations', createSql: 'CREATE TABLE schema_migrations (name TEXT)' },
];
const payload = {
  format: 2,
  createdAt: '2026-08-12T12:00:00.000Z',
  source: { database: 'pixon_test', engine: 'MariaDB', serverVersion: 'test' },
  schema,
  schemaSha256: schemaDigest(schema),
  data: { schema_migrations: [{ name: '001_base.sql' }] },
};

function deterministicRandom(size) {
  return Buffer.alloc(size, size);
}

function fixture() {
  const envelope = encryptBackupPayload(payload, secret, deterministicRandom);
  const manifest = createBackupManifest({
    envelope,
    payload,
    fileName: 'prueba.pixonbak',
  });
  return { envelope, manifest };
}

test('verifica cifrado autenticado, SHA-256, manifiesto, esquema y origen', () => {
  const { envelope, manifest } = fixture();
  const result = verifyBackupBuffer(envelope, {
    secret,
    fileName: 'prueba.pixonbak',
    expectedDatabase: 'pixon_test',
    maxAgeHours: 24,
    now: new Date('2026-08-12T13:00:00.000Z'),
    manifest,
    requireManifest: true,
    minimumFormat: 2,
  });
  assert.equal(result.manifestVerified, true);
  assert.equal(result.tableCount, 1);
  assert.equal(result.rowCount, 1);
  assert.equal(result.ageHours, 1);
});

test('rechaza alteracion del backup y clave incorrecta', () => {
  const { envelope, manifest } = fixture();
  const tampered = Buffer.from(envelope);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(
    () =>
      verifyBackupBuffer(tampered, {
        secret,
        fileName: 'prueba.pixonbak',
        manifest,
        requireManifest: true,
      }),
    /autenticar/
  );
  assert.throws(
    () => verifyBackupBuffer(envelope, { secret: `${secret}-otra` }),
    /autenticar/
  );
});

test('rechaza manifiesto modificado, base distinta y backup vencido', () => {
  const { envelope, manifest } = fixture();
  assert.throws(
    () =>
      verifyBackupBuffer(envelope, {
        secret,
        fileName: 'prueba.pixonbak',
        manifest: { ...manifest, byteLength: manifest.byteLength + 1 },
        now: new Date('2026-08-12T13:00:00.000Z'),
      }),
    /byteLength/
  );
  assert.throws(
    () =>
      verifyBackupBuffer(envelope, {
        secret,
        expectedDatabase: 'otra_base',
        now: new Date('2026-08-12T13:00:00.000Z'),
      }),
    /base de datos diferente/
  );
  assert.throws(
    () =>
      verifyBackupBuffer(envelope, {
        secret,
        maxAgeHours: 1,
        now: new Date('2026-08-12T14:00:00.000Z'),
      }),
    /antiguedad maxima/
  );
});

test('permite restaurar un sobre legado sin identidad solo de forma explicita', () => {
  const legacyPayload = {
    format: 1,
    createdAt: '2026-08-12T12:00:00.000Z',
    data: { users: [] },
  };
  const envelope = encryptBackupPayload(legacyPayload, secret, deterministicRandom);
  assert.throws(
    () =>
      verifyBackupBuffer(envelope, {
        secret,
        now: new Date('2026-08-12T13:00:00.000Z'),
      }),
    /no identifica/
  );
  const result = verifyBackupBuffer(envelope, {
    secret,
    expectedDatabase: 'pixon_test',
    requireDatabaseIdentity: false,
    now: new Date('2026-08-12T13:00:00.000Z'),
  });
  assert.equal(result.format, 1);
});
