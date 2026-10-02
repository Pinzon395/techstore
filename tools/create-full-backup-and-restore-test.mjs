import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[trimmed.slice(0, eqIdx).trim()] = val;
    }
  }
  return env;
}

async function main() {
  console.log('═'.repeat(75));
  console.log('📦 PIXON PC — FULL DATABASE BACKUP & RESTORE TEST (ALL 98 TABLES)');
  console.log('═'.repeat(75));

  const env = parseEnv('c:/Users/Usuario/techstore/.env');
  const connConfig = {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true
  };

  const conn = await mysql.createConnection(connConfig);

  // 1. Get all tables
  const [tables] = await conn.execute(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
    [env.DB_NAME]
  );

  const tableList = tables.map(t => t.table_name || t.TABLE_NAME);
  console.log(`\n[1/6] Base tables identificadas en ${env.DB_NAME}: ${tableList.length}`);

  // Count source rows
  let sourceTotalRows = 0;
  const sourceTableCounts = {};
  for (const tbl of tableList) {
    const [cRes] = await conn.execute(`SELECT COUNT(*) AS c FROM \`${tbl}\``);
    const count = Number(cRes[0].c);
    sourceTableCounts[tbl] = count;
    sourceTotalRows += count;
  }
  console.log(`Total filas en origen: ${sourceTotalRows} en ${tableList.length} tablas.`);

  // 2. Generate Native MariaDB raw dump
  const mariadbDumpPath = 'C:\\Program Files\\MariaDB 12.2\\bin\\mariadb-dump.exe';
  const nativeBackupFile = path.resolve('backups/pixon_mariadb_native_raw.sql');
  if (fs.existsSync(mariadbDumpPath)) {
    console.log(`\n[2/6] Ejecutando mariadb-dump nativo a ${nativeBackupFile}...`);
    try {
      const dumpArgs = [
        `-h${connConfig.host}`,
        `-P${connConfig.port}`,
        `-u${connConfig.user}`,
        `-p${connConfig.password}`,
        '--routines',
        '--triggers',
        '--single-transaction',
        '--hex-blob',
        '--complete-insert',
        '--extended-insert',
        env.DB_NAME
      ];
      const dumpOutput = execFileSync(mariadbDumpPath, dumpArgs, { maxBuffer: 100 * 1024 * 1024 });
      fs.writeFileSync(nativeBackupFile, dumpOutput);
      const nativeSize = fs.statSync(nativeBackupFile).size;
      const nativeSha = crypto.createHash('sha256').update(dumpOutput).digest('hex');
      console.log(`✅ Native dump exitoso: ${(nativeSize / 1024 / 1024).toFixed(2)} MB (SHA256: ${nativeSha.slice(0, 16)}...)`);
    } catch (e) {
      console.warn(`⚠️ Advertencia en mariadb-dump nativo: ${e.message}`);
    }
  }

  // 3. Generate MySQL 8.0 Compatible Full Backup (Schema + Data + Constraints)
  const fullBackupFile = path.resolve('backups/pixon_full_production_backup_mysql8.sql');
  console.log(`\n[3/6] Generando backup completo MySQL 8.0 en ${fullBackupFile}...`);

  const stream = fs.createWriteStream(fullBackupFile, { encoding: 'utf8' });
  stream.write(`-- ═══════════════════════════════════════════════════════════════════════════
-- Pixon PC — Full Production Database Backup (MySQL 8.0 & Hostinger Compatible)
-- Generated: ${new Date().toISOString()}
-- Source: ${env.DB_NAME} (${tableList.length} tables, ${sourceTotalRows} rows)
-- ═══════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET foreign_key_checks = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

`);

  const foreignKeyStatements = [];

  // Schema creation for all tables
  for (const tbl of tableList) {
    const [createResult] = await conn.execute(`SHOW CREATE TABLE \`${tbl}\``);
    let createSql = createResult[0]['Create Table'] || createResult[0]['CREATE TABLE'];

    createSql = createSql.replace(/COLLATE=utf8mb4_uca1400_ai_ci/g, 'COLLATE=utf8mb4_unicode_ci');
    createSql = createSql.replace(/utf8mb4_uca1400_ai_ci/g, 'utf8mb4_unicode_ci');
    createSql = createSql.replace(/cast\(`currency` as char charset binary\)/gi, '`currency`');
    createSql = createSql.replace(/(`primary_item_id`[^\n]+)STORED/gi, '$1VIRTUAL');

    let fkIndex = 0;
    const lines = createSql.split('\n');
    const tableLines = [];

    for (let line of lines) {
      if (line.includes('FOREIGN KEY')) {
        fkIndex++;
        let fkClause = line.trim().replace(/,$/, '');
        if (fkClause.includes('CONSTRAINT')) {
          fkClause = fkClause.replace(/CONSTRAINT `[^`]+`/g, `CONSTRAINT \`fk_${tbl.slice(0, 25)}_${fkIndex}\``);
        } else {
          fkClause = `CONSTRAINT \`fk_${tbl.slice(0, 25)}_${fkIndex}\` ${fkClause}`;
        }
        foreignKeyStatements.push(`ALTER TABLE \`${tbl}\` ADD ${fkClause};`);
      } else {
        tableLines.push(line);
      }
    }

    let cleanCreate = tableLines.join('\n');
    cleanCreate = cleanCreate.replace(/,\s*(\n\s*\)\s*ENGINE)/g, '$1');

    stream.write(`DROP TABLE IF EXISTS \`${tbl}\`;\n`);
    stream.write(`${cleanCreate};\n\n`);
  }

  // Idempotency table
  stream.write(`-- ─── Guardrail: Idempotency Tracking Table (job_runs) ─────────────────────\n`);
  stream.write(`CREATE TABLE IF NOT EXISTS \`job_runs\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`run_key\` VARCHAR(100) NOT NULL,
  \`status\` ENUM('running','done','failed') NOT NULL DEFAULT 'running',
  \`started_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`completed_at\` TIMESTAMP NULL,
  \`result\` VARCHAR(255) NULL,
  UNIQUE KEY \`uq_job_runs_run_key\` (\`run_key\`),
  INDEX \`idx_job_runs_status\` (\`status\`, \`started_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`);

  // Data dumping for all tables
  console.log('[4/6] Exportando datos de todas las tablas...');
  for (const tbl of tableList) {
    const count = sourceTableCounts[tbl];
    if (count === 0) continue;

    stream.write(`-- ─── Data: ${tbl} (${count} rows) ───\n`);

    const [allCols] = await conn.execute(
      "SELECT column_name, data_type, extra, generation_expression FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position",
      [env.DB_NAME, tbl]
    );
    const cols = allCols.filter(c => {
      const extra = String(c.extra || c.EXTRA || '').toUpperCase();
      const genExpr = c.generation_expression || c.GENERATION_EXPRESSION;
      return !extra.includes('GENERATED') && !extra.includes('VIRTUAL') && !extra.includes('STORED') && !genExpr;
    });
    const colNames = cols.map(c => `\`${c.column_name || c.COLUMN_NAME}\``).join(', ');

    const pageSize = 500;
    for (let offset = 0; offset < count; offset += pageSize) {
      const [rows] = await conn.execute(`SELECT * FROM \`${tbl}\` LIMIT ${pageSize} OFFSET ${offset}`);
      if (rows.length === 0) break;

      const values = rows.map(r => {
        const rowVals = cols.map(col => {
          const colName = col.column_name || col.COLUMN_NAME;
          const val = r[colName];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return String(val);
          if (typeof val === 'boolean') return val ? '1' : '0';
          if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
          if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
          return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
        });
        return `(${rowVals.join(', ')})`;
      });

      stream.write(`INSERT INTO \`${tbl}\` (${colNames}) VALUES\n${values.join(',\n')};\n`);
    }
    stream.write('\n');
  }

  // Append foreign keys
  stream.write(`-- ═══════════════════════════════════════════════════════════════════════════\n`);
  stream.write(`-- Foreign Key Constraints (${foreignKeyStatements.length} constraints)\n`);
  stream.write(`-- ═══════════════════════════════════════════════════════════════════════════\n\n`);
  for (const fkSql of foreignKeyStatements) {
    stream.write(`${fkSql}\n`);
  }
  stream.write(`\nSET foreign_key_checks = 1;\n`);

  await new Promise(resolve => stream.end(resolve));

  // Compute file size and sha256
  const fullBackupBuffer = fs.readFileSync(fullBackupFile);
  const fullBackupSize = fullBackupBuffer.length;
  const fullBackupSha256 = crypto.createHash('sha256').update(fullBackupBuffer).digest('hex');

  console.log(`\n✅ FULL BACKUP GENERADO:`);
  console.log(`   SOURCE_TABLE_COUNT=${tableList.length}`);
  console.log(`   SOURCE_ROWS=${sourceTotalRows}`);
  console.log(`   SOURCE_SIZE=${fullBackupSize} bytes (${(fullBackupSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   BACKUP_FILE=${fullBackupFile}`);
  console.log(`   SHA256=${fullBackupSha256}`);

  // 4. RESTORE TEST in temporary database 'test'
  console.log(`\n[5/6] Ejecutando RESTORE TEST en base de datos temporal 'test'...`);
  const TEST_DB = 'test';

  const testConn = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: TEST_DB,
    multipleStatements: true
  });

  await testConn.query('SET FOREIGN_KEY_CHECKS = 0');
  const [existingInTest] = await testConn.query("SHOW TABLES");
  for (const row of existingInTest) {
    const tName = Object.values(row)[0];
    await testConn.query(`DROP TABLE IF EXISTS \`${tName}\``);
  }

  // Execute backup file
  console.log('Restaurando contenido del backup SQL en database `test`...');
  const sqlStatements = fullBackupBuffer.toString('utf8');
  await testConn.query(sqlStatements);
  console.log('✅ Restauración de backup SQL completada sin errores.');

  // Validate tables and counts
  console.log(`\n[6/6] Validando recuento tabla por tabla contra el origen...`);
  const [restoredTables] = await testConn.execute(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
    [TEST_DB]
  );
  const restoredTableList = restoredTables.map(t => t.table_name || t.TABLE_NAME);

  let mismatches = 0;
  let restoredTotalRows = 0;

  for (const tbl of tableList) {
    if (!restoredTableList.includes(tbl)) {
      console.log(`❌ TABLA FALTANTE EN RESTORE: ${tbl}`);
      mismatches++;
      continue;
    }
    const [rcRes] = await testConn.execute(`SELECT COUNT(*) AS c FROM \`${TEST_DB}\`.\`${tbl}\``);
    const rCount = Number(rcRes[0].c);
    const sCount = sourceTableCounts[tbl];
    restoredTotalRows += rCount;

    if (rCount !== sCount) {
      console.log(`❌ Discrepancia en ${tbl}: origen=${sCount}, restaurado=${rCount}`);
      mismatches++;
    }
  }

  // Spot check sample critical rows
  console.log('\n--- VERIFICACIÓN DE REGISTROS CRÍTICOS (CAMPOS SEGUROS) ---');
  const [origUser] = await conn.query(`SELECT id, role_id FROM \`${env.DB_NAME}\`.users ORDER BY id ASC LIMIT 1`);
  const [restUser] = await testConn.query(`SELECT id, role_id FROM \`${TEST_DB}\`.users ORDER BY id ASC LIMIT 1`);
  const userMatch = JSON.stringify(origUser[0]) === JSON.stringify(restUser[0]);
  console.log(`User ID ${origUser[0]?.id}: ${userMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

  const [origTicket] = await conn.query(`SELECT ticket_code, status, device_type FROM \`${env.DB_NAME}\`.repairs ORDER BY id ASC LIMIT 1`);
  const [restTicket] = await testConn.query(`SELECT ticket_code, status, device_type FROM \`${TEST_DB}\`.repairs ORDER BY id ASC LIMIT 1`);
  const ticketMatch = JSON.stringify(origTicket[0]) === JSON.stringify(restTicket[0]);
  console.log(`Ticket Code ${origTicket[0]?.ticket_code}: ${ticketMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

  const [origAppt] = await conn.query(`SELECT id, status FROM \`${env.DB_NAME}\`.appointments ORDER BY id ASC LIMIT 1`);
  const [restAppt] = await testConn.query(`SELECT id, status FROM \`${TEST_DB}\`.appointments ORDER BY id ASC LIMIT 1`);
  const apptMatch = JSON.stringify(origAppt[0]) === JSON.stringify(restAppt[0]);
  console.log(`Appointment ID ${origAppt[0]?.id}: ${apptMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

  const [origComment] = await conn.query(`SELECT id, stars FROM \`${env.DB_NAME}\`.comments ORDER BY id ASC LIMIT 1`);
  const [restComment] = await testConn.query(`SELECT id, stars FROM \`${TEST_DB}\`.comments ORDER BY id ASC LIMIT 1`);
  const commentMatch = JSON.stringify(origComment[0]) === JSON.stringify(restComment[0]);
  console.log(`Comment ID ${origComment[0]?.id}: ${commentMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

  // Clean up test DB
  await testConn.query('SET FOREIGN_KEY_CHECKS = 0');
  const [cleanupTables] = await testConn.query("SHOW TABLES");
  for (const row of cleanupTables) {
    const tName = Object.values(row)[0];
    await testConn.query(`DROP TABLE IF EXISTS \`${tName}\``);
  }
  await testConn.query('SET FOREIGN_KEY_CHECKS = 1');
  await testConn.end();
  await conn.end();
  console.log(`\nBase de datos temporal \`${TEST_DB}\` limpiada.`);

  console.log('\n' + '═'.repeat(75));
  console.log('RESULTADO FINAL RESTORE TEST:');
  console.log(`TABLE_COUNT_MATCH=${restoredTableList.length >= tableList.length ? 'YES' : 'NO'} (${restoredTableList.length} vs ${tableList.length})`);
  console.log(`SOURCE_ROWS=${sourceTotalRows}`);
  console.log(`RESTORED_ROWS=${restoredTotalRows}`);
  console.log(`ROW_COUNT_MISMATCHES=${mismatches}`);
  console.log(`CRITICAL_SAMPLES_MATCH=${userMatch && ticketMatch && apptMatch && commentMatch ? 'YES' : 'NO'}`);
  console.log(`FULL_BACKUP_VALIDATED=${mismatches === 0 ? 'PASS' : 'FAIL'}`);
  console.log('═'.repeat(75));

  if (mismatches > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error during backup and restore:', err);
  process.exit(1);
});
