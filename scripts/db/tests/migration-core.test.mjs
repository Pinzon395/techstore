import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  analyzeMigrationState,
  blockingIssues,
  loadMigrationFiles,
  parseMigrationArgs,
  sanitizeMigrationError,
  sha256,
} from '../migration-core.mjs';
import { baselineLegacyMigration, ensureMigrationStore } from '../migration-store.mjs';

async function withTemporaryDirectory(callback) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pixon-migrations-test-'));
  try {
    return await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('carga migraciones en orden y calcula SHA-256 sobre los bytes exactos', async () => {
  await withTemporaryDirectory(async (directory) => {
    await fs.writeFile(path.join(directory, '002_segunda.sql'), 'SELECT 2;\n');
    await fs.writeFile(path.join(directory, '001_primera.sql'), 'SELECT 1;\n');

    const migrations = await loadMigrationFiles(directory);
    assert.deepEqual(migrations.map((migration) => migration.name), [
      '001_primera.sql',
      '002_segunda.sql',
    ]);
    assert.equal(migrations[0].checksum, sha256(Buffer.from('SELECT 1;\n')));

    const originalChecksum = migrations[0].checksum;
    await fs.writeFile(path.join(directory, '001_primera.sql'), 'SELECT 1; -- cambio\n');
    const changed = await loadMigrationFiles(directory);
    assert.notEqual(changed[0].checksum, originalChecksum);
  });
});

test('rechaza nombres y versiones duplicadas', async () => {
  await withTemporaryDirectory(async (directory) => {
    await fs.writeFile(path.join(directory, 'mala.sql'), 'SELECT 1;');
    await assert.rejects(() => loadMigrationFiles(directory), /Nombres de migracion invalidos/);
  });

  await withTemporaryDirectory(async (directory) => {
    await fs.writeFile(path.join(directory, '001_uno.sql'), 'SELECT 1;');
    await fs.writeFile(path.join(directory, '001_dos.sql'), 'SELECT 2;');
    await assert.rejects(() => loadMigrationFiles(directory), /Version de migracion duplicada/);
  });
});

test('detecta pendientes, checksums modificados, legado, fallos y archivos faltantes', () => {
  const migrations = [
    { name: '001_uno.sql', checksum: 'a'.repeat(64), bytes: 1 },
    { name: '002_dos.sql', checksum: 'b'.repeat(64), bytes: 1 },
    { name: '003_tres.sql', checksum: 'c'.repeat(64), bytes: 1 },
    { name: '004_cuatro.sql', checksum: 'd'.repeat(64), bytes: 1 },
  ];
  const records = [
    { name: '001_uno.sql', status: 'applied', checksum_sha256: 'a'.repeat(64) },
    { name: '002_dos.sql', status: 'applied', checksum_sha256: null },
    { name: '003_tres.sql', status: 'applied', checksum_sha256: 'f'.repeat(64) },
    { name: '005_fallida.sql', status: 'failed', checksum_sha256: 'e'.repeat(64) },
  ];

  const analysis = analyzeMigrationState(migrations, records);
  assert.equal(analysis.entries.find((entry) => entry.name === '001_uno.sql').state, 'applied');
  assert.equal(
    analysis.entries.find((entry) => entry.name === '002_dos.sql').state,
    'legacy_checksum_missing'
  );
  assert.equal(
    analysis.entries.find((entry) => entry.name === '003_tres.sql').state,
    'checksum_mismatch'
  );
  assert.equal(analysis.entries.find((entry) => entry.name === '004_cuatro.sql').state, 'pending');
  assert.equal(
    analysis.entries.find((entry) => entry.name === '005_fallida.sql').state,
    'missing_file'
  );
  assert.ok(blockingIssues(analysis, { allowLegacyBaseline: true }).length >= 2);
});

test('bloquea una migracion agregada fuera de orden', () => {
  const analysis = analyzeMigrationState(
    [
      { name: '001_antes.sql', checksum: 'a'.repeat(64), bytes: 1 },
      { name: '002_despues.sql', checksum: 'b'.repeat(64), bytes: 1 },
    ],
    [{ name: '002_despues.sql', status: 'applied', checksum_sha256: 'b'.repeat(64) }]
  );
  assert.equal(analysis.pending[0].outOfOrder, true);
  assert.ok(analysis.issues.some((issue) => issue.type === 'out_of_order'));
});

test('parsea modos de solo lectura y limites operativos', () => {
  assert.deepEqual(
    parseMigrationArgs(
      ['--plan', '--backup-max-age-hours=6', '--lock-timeout-seconds', '12'],
      {}
    ),
    {
      mode: 'plan',
      backupPath: null,
      retryFailedName: null,
      backupMaxAgeHours: 6,
      lockTimeoutSeconds: 12,
      help: false,
    }
  );
  assert.throws(() => parseMigrationArgs(['--plan', '--verify'], {}), /solo uno/);
  assert.equal(
    parseMigrationArgs(['--retry-failed', '002_commerce_catalog.sql'], {}).retryFailedName,
    '002_commerce_catalog.sql'
  );
  assert.throws(
    () => parseMigrationArgs(['--plan', '--retry-failed', '002_commerce_catalog.sql'], {}),
    /solo puede utilizarse al aplicar/
  );
  assert.throws(() => parseMigrationArgs(['--desconocida'], {}), /Opcion desconocida/);
});

test('limita y redacta el error persistido', () => {
  const safe = sanitizeMigrationError({
    code: 'ER_TEST',
    sqlState: '42000',
    message: 'password=secreto\nfallo controlado',
  });
  assert.match(safe, /ER_TEST/);
  assert.match(safe, /\[REDACTED\]/);
  assert.doesNotMatch(safe, /secreto/);
});

test('evoluciona de forma aditiva la tabla legado y fija su checksum base', async () => {
  const columns = new Set(['name', 'applied_at']);
  const records = [{ name: '001_base.sql', applied_at: '2026-01-01 00:00:00' }];
  const mutations = [];
  const connection = {
    async query(sql, params = []) {
      if (sql.includes('FROM INFORMATION_SCHEMA.TABLES')) {
        return [[{ ENGINE: 'InnoDB' }], []];
      }
      if (sql.includes('FROM INFORMATION_SCHEMA.COLUMNS')) {
        return [
          [...columns].map((name) => ({
            COLUMN_NAME: name,
            COLUMN_TYPE: 'varchar(255)',
            IS_NULLABLE: name === 'name' ? 'NO' : 'YES',
            COLUMN_DEFAULT: null,
            CHARACTER_MAXIMUM_LENGTH: name === 'name' ? 255 : null,
          })),
          [],
        ];
      }
      if (sql.includes('FROM INFORMATION_SCHEMA.STATISTICS')) {
        return [[{ COLUMN_NAME: 'name' }], []];
      }
      if (sql.startsWith('SELECT * FROM schema_migrations')) return [records, []];
      if (sql.startsWith('ALTER TABLE schema_migrations ADD COLUMN')) {
        const [, name] = /ADD COLUMN `([^`]+)`/.exec(sql);
        columns.add(name);
        mutations.push(sql);
        return [{ affectedRows: 0 }, []];
      }
      if (sql.startsWith('UPDATE schema_migrations')) {
        const record = records.find((candidate) => candidate.name === params[2]);
        record.checksum_sha256 = params[0];
        record.status = 'applied';
        mutations.push(sql);
        return [{ affectedRows: 1 }, []];
      }
      throw new Error(`SQL inesperado en prueba: ${sql}`);
    },
  };

  const store = await ensureMigrationStore(connection);
  assert.equal(store.missingColumns.length, 0);
  assert.ok(mutations.every((sql) => !/DROP|DELETE|TRUNCATE/i.test(sql)));

  await baselineLegacyMigration(connection, {
    name: '001_base.sql',
    checksum: 'a'.repeat(64),
    bytes: 100,
  });
  assert.equal(records[0].checksum_sha256, 'a'.repeat(64));
});
