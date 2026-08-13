import 'dotenv/config';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import mysql from 'mysql2/promise';
import { findLatestBackup, verifyBackupFile } from './backup-format.mjs';
import {
  analyzeMigrationState,
  blockingIssues,
  buildAdvisoryLockName,
  loadMigrationFiles,
  parseMigrationArgs,
  sanitizeMigrationError,
  sha256,
} from './migration-core.mjs';
import {
  baselineLegacyMigration,
  ensureMigrationStore,
  inspectMigrationStore,
  markMigrationApplied,
  markMigrationFailed,
  markMigrationRunning,
  markFailedMigrationRunning,
  validateMigrationStoreShape,
} from './migration-store.mjs';

const MIGRATIONS_DIRECTORY = path.join(process.cwd(), 'server', 'sql', 'migrations');

function usage() {
  console.log(`Uso:
  npm run db:migrate:plan
  npm run db:migrate:verify
  npm run db:migrate -- --backup backups/archivo.pixonbak
  npm run db:migrate -- --retry-failed 002_migracion.sql

Modos:
  --plan                     Solo consulta y muestra el plan; no modifica MariaDB.
  --verify                   Solo verifica estado y checksums; no modifica MariaDB.
  (sin modo)                 Aplica migraciones pendientes.

Opciones de aplicacion:
  --backup RUTA              Backup cifrado verificado. Si se omite, usa el mas reciente.
  --retry-failed ARCHIVO     Reintenta explicitamente una migracion FAILED idempotente.
  --backup-max-age-hours N   Antiguedad maxima del backup (predeterminado: 24).
  --lock-timeout-seconds N   Espera de GET_LOCK (predeterminado: 30).`);
}

function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'pixon_app',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pixon_db',
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: true,
    multipleStatements: true,
  });
}

function runnerId() {
  const hostHash = sha256(os.hostname()).slice(0, 12);
  return `deploy-${hostHash}-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
}

function stateLabel(entry) {
  const labels = {
    applied: 'APLICADA',
    pending: entry.outOfOrder ? 'PENDIENTE/FUERA_DE_ORDEN' : 'PENDIENTE',
    legacy_checksum_missing: 'LEGADO/SIN_CHECKSUM',
    checksum_mismatch: 'CHECKSUM_MODIFICADO',
    running: 'EN_EJECUCION',
    failed: 'FALLIDA',
    unknown_status: 'ESTADO_DESCONOCIDO',
    missing_file: 'ARCHIVO_FALTANTE',
  };
  return labels[entry.state] || entry.state.toUpperCase();
}

function printAnalysis(analysis) {
  if (!analysis.entries.length) {
    console.log('No hay migraciones SQL registradas ni disponibles.');
    return;
  }
  const nameWidth = Math.max(10, ...analysis.entries.map((entry) => entry.name.length));
  console.log(`${'MIGRACION'.padEnd(nameWidth)}  ESTADO                         SHA-256`);
  for (const entry of analysis.entries) {
    const fileChecksum = entry.checksum?.slice(0, 12) || '-';
    const recordedChecksum = entry.record?.checksum_sha256?.slice(0, 12) || '-';
    const checksum = entry.state === 'checksum_mismatch'
      ? `${recordedChecksum} != ${fileChecksum}`
      : fileChecksum !== '-'
        ? fileChecksum
        : recordedChecksum;
    console.log(
      `${entry.name.padEnd(nameWidth)}  ${stateLabel(entry).padEnd(29)}  ${checksum}`
    );
  }
}

async function readOnlyState(connection, migrations) {
  const store = await inspectMigrationStore(connection);
  validateMigrationStoreShape(store);
  return { store, analysis: analyzeMigrationState(migrations, store.records) };
}

async function verifyBackupPreflight(options) {
  const secret = process.env.DB_BACKUP_KEY;
  if (!secret || secret.length < 20) {
    throw new Error('DB_BACKUP_KEY debe tener al menos 20 caracteres para validar el backup.');
  }
  const backupPath = options.backupPath
    ? path.resolve(options.backupPath)
    : await findLatestBackup(path.join(process.cwd(), 'backups'));
  if (!backupPath) {
    throw new Error(
      'No existe un backup elegible. Ejecuta db:backup:encrypted y vuelve a intentarlo.'
    );
  }
  const verification = await verifyBackupFile(backupPath, {
    secret,
    expectedDatabase: process.env.DB_NAME || 'pixon_db',
    maxAgeHours: options.backupMaxAgeHours,
    requireManifest: true,
    minimumFormat: 2,
  });
  console.log(
    `Preflight de backup correcto: ${verification.path} ` +
    `(${verification.ageHours.toFixed(2)} h, SHA-256 ${verification.sha256.slice(0, 12)}...).`
  );
  return verification;
}

async function acquireLock(connection, timeoutSeconds) {
  const identity = [
    process.env.DB_HOST || '127.0.0.1',
    process.env.DB_PORT || '3306',
    process.env.DB_NAME || 'pixon_db',
  ].join(':');
  const lockName = buildAdvisoryLockName(identity);
  const [[row]] = await connection.query('SELECT GET_LOCK(?, ?) AS acquired', [
    lockName,
    timeoutSeconds,
  ]);
  if (Number(row.acquired) !== 1) {
    throw new Error(
      `No se obtuvo el lock de despliegue en ${timeoutSeconds} segundos. Hay otra migracion activa.`
    );
  }
  return lockName;
}

async function releaseLock(connection, lockName) {
  const [[row]] = await connection.query('SELECT RELEASE_LOCK(?) AS released', [lockName]);
  if (Number(row.released) !== 1) {
    throw new Error('MariaDB no confirmo la liberacion del lock de despliegue.');
  }
}

async function runMigration(connection, migration, currentRunnerId, { retry = false } = {}) {
  if (retry) {
    await markFailedMigrationRunning(connection, migration, currentRunnerId);
  } else {
    await markMigrationRunning(connection, migration, currentRunnerId);
  }
  const startedAt = performance.now();
  try {
    // MariaDB puede confirmar DDL implicitamente. El estado se registra antes y despues;
    // no se promete un rollback transaccional que el motor no puede garantizar.
    await connection.query(migration.sql);
    const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
    await markMigrationApplied(connection, migration, currentRunnerId, durationMs);
    console.log(`Migracion aplicada: ${migration.name} (${durationMs} ms).`);
  } catch (error) {
    const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
    const safeError = sanitizeMigrationError(error);
    try {
      await markMigrationFailed(
        connection,
        migration,
        currentRunnerId,
        durationMs,
        safeError
      );
    } catch (trackingError) {
      throw new AggregateError(
        [error, trackingError],
        `Fallo ${migration.name} y no se pudo persistir completamente su estado.`
      );
    }
    throw new Error(
      `${migration.name} fallo. Puede existir DDL parcial; no se reintentara automaticamente.`,
      { cause: error }
    );
  }
}

async function main() {
  const options = parseMigrationArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  const migrations = await loadMigrationFiles(MIGRATIONS_DIRECTORY);

  if (options.mode === 'apply') await verifyBackupPreflight(options);

  const connection = await createConnection();
  let lockName = null;
  let primaryError = null;
  let releaseError = null;
  let closeError = null;
  try {
    if (options.mode === 'plan' || options.mode === 'verify') {
      const { store, analysis } = await readOnlyState(connection, migrations);
      console.log(
        store.exists
          ? `schema_migrations: ${store.missingColumns.length ? 'requiere actualizacion' : 'compatible'}.`
          : 'schema_migrations: aun no existe.'
      );
      printAnalysis(analysis);

      if (options.mode === 'plan') {
        const hardProblems = blockingIssues(analysis, { allowLegacyBaseline: true });
        if (hardProblems.length) {
          for (const issue of hardProblems) console.error(`- ${issue.message}`);
          process.exitCode = 2;
        }
        console.log(
          `Plan: ${analysis.pending.length} pendiente(s), ${analysis.legacy.length} checksum(s) ` +
          `legado por fijar; sin escrituras.`
        );
        return;
      }

      const verificationProblems = [
        ...analysis.issues,
        ...analysis.pending.map((entry) => ({
          message: `La migracion ${entry.name} sigue pendiente.`,
        })),
      ];
      if (!store.exists || store.missingColumns.length || verificationProblems.length) {
        for (const issue of verificationProblems) console.error(`- ${issue.message}`);
        console.error('Verificacion fallida; no se realizaron escrituras.');
        process.exitCode = 2;
        return;
      }
      console.log('Verificacion correcta: esquema de control y checksums integros; sin escrituras.');
      return;
    }

    lockName = await acquireLock(connection, options.lockTimeoutSeconds);
    const store = await ensureMigrationStore(connection);
    let analysis = analyzeMigrationState(migrations, store.records);
    const retryEntry = options.retryFailedName
      ? analysis.entries.find((entry) => entry.name === options.retryFailedName)
      : null;
    if (options.retryFailedName && retryEntry?.state !== 'failed') {
      throw new Error(
        `--retry-failed requiere una migracion en estado failed: ${options.retryFailedName}.`
      );
    }
    const hardProblems = blockingIssues(analysis, { allowLegacyBaseline: true }).filter(
      (issue) => !retryEntry || issue.name !== retryEntry.name
    );
    if (hardProblems.length) {
      throw new Error(hardProblems.map((issue) => issue.message).join(' '));
    }

    for (const migration of analysis.legacy) {
      await baselineLegacyMigration(connection, migration);
      console.log(
        `Checksum base fijado para migracion legado: ${migration.name} ` +
        '(origen legacy_baseline).'
      );
    }

    const refreshedStore = await inspectMigrationStore(connection);
    analysis = analyzeMigrationState(migrations, refreshedStore.records);
    const postBaselineProblems = blockingIssues(analysis).filter(
      (issue) => !retryEntry || issue.name !== retryEntry.name
    );
    if (postBaselineProblems.length) {
      throw new Error(postBaselineProblems.map((issue) => issue.message).join(' '));
    }

    const currentRunnerId = runnerId();
    if (retryEntry) {
      await runMigration(connection, retryEntry, currentRunnerId, { retry: true });
      console.log(`Reintento controlado completado: ${retryEntry.name}.`);
      const retriedStore = await inspectMigrationStore(connection);
      analysis = analyzeMigrationState(migrations, retriedStore.records);
      const retryProblems = blockingIssues(analysis);
      if (retryProblems.length) {
        throw new Error(retryProblems.map((issue) => issue.message).join(' '));
      }
    }
    for (const migration of analysis.pending) {
      await runMigration(connection, migration, currentRunnerId);
    }

    const finalStore = await inspectMigrationStore(connection);
    const finalAnalysis = analyzeMigrationState(migrations, finalStore.records);
    const finalProblems = blockingIssues(finalAnalysis);
    if (finalProblems.length || finalAnalysis.pending.length) {
      throw new Error('La verificacion posterior detecto un estado de migraciones inconsistente.');
    }
    console.log(`Migraciones listas: ${finalAnalysis.applied.length} aplicada(s), 0 pendientes.`);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (lockName) {
      try {
        await releaseLock(connection, lockName);
      } catch (error) {
        releaseError = error;
      }
    }
    try {
      await connection.end();
    } catch (error) {
      closeError = error;
    }
    if (primaryError && releaseError) {
      console.error(`Advertencia al liberar lock: ${releaseError.message}`);
    }
    if (primaryError && closeError) {
      console.error(`Advertencia al cerrar conexion: ${closeError.message}`);
    }
    if (!primaryError && releaseError) throw releaseError;
    if (!primaryError && closeError) throw closeError;
  }
}

main().catch((error) => {
  console.error(`Error de migracion: ${error.message}`);
  process.exitCode = 1;
});
