import mysql from 'mysql2/promise';
import fs from 'node:fs';
import readline from 'node:readline';
import { compareDatabases } from './verify-row-counts.mjs';

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

async function executeSqlContent(conn, sqlText, label) {
  console.log(`Executing ${label}...`);
  const lines = sqlText.split('\n');
  let currentQuery = '';
  let count = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;

    currentQuery += line + '\n';
    if (trimmed.endsWith(';')) {
      try {
        await conn.query(currentQuery);
        count++;
        if (count % 200 === 0) {
          process.stdout.write(`\r[${label}] Executed ${count} queries...`);
        }
      } catch (err) {
        if (!err.message?.includes('already exists')) {
          console.error(`\nError in query: ${currentQuery.slice(0, 100)}...`);
          console.error(`Message: ${err.message}`);
          throw err;
        }
      }
      currentQuery = '';
    }
  }

  if (currentQuery.trim()) {
    await conn.query(currentQuery);
  }
  console.log(`\n✅ ${label} completed (${count} statements).`);
}

async function executeSqlFileStream(conn, filePath, label) {
  console.log(`Streaming ${label} from ${filePath}...`);
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentQuery = '';
  let queryCount = 0;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;

    currentQuery += line + '\n';
    if (trimmed.endsWith(';')) {
      try {
        await conn.query(currentQuery);
        queryCount++;
        if (queryCount % 100 === 0) {
          process.stdout.write(`\r[${label}] Executed ${queryCount} statements...`);
        }
      } catch (err) {
        if (!err.message?.includes('already exists')) {
          console.error(`\nError in query: ${currentQuery.slice(0, 100)}...`);
          console.error(`Message: ${err.message}`);
          throw err;
        }
      }
      currentQuery = '';
    }
  }

  if (currentQuery.trim()) {
    await conn.query(currentQuery);
  }

  console.log(`\n✅ Finished ${label} (${queryCount} statements).`);
}

async function migrate() {
  const env = parseEnv('C:/Users/Usuario/techstore/.env');
  const u = new URL(env.TARGET_DATABASE_URL);

  const targetConfig = {
    host: u.hostname,
    port: Number(u.port) || 13008,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'defaultdb',
    multipleStatements: true,
    ssl: { rejectUnauthorized: false }
  };

  const sourceConfig = {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  };

  console.log('═'.repeat(70));
  console.log('🚀 PIXON PC — END-TO-END MIGRATION TO AIVEN MYSQL 8.4');
  console.log('═'.repeat(70));
  console.log(`Connecting to Target: ${u.hostname}:${u.port}/${targetConfig.database}...`);

  const conn = await mysql.createConnection(targetConfig);
  console.log('✅ Connected to Aiven MySQL successfully!');

  await conn.query('SET foreign_key_checks = 0;');
  await conn.query('SET sql_mode = "STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION";');

  const fullSchema = fs.readFileSync('C:/Users/Usuario/techstore/server/sql/schema/schema-mysql8-complete.sql', 'utf8');
  const fkSplitIndex = fullSchema.indexOf('-- Foreign Key Constraints');
  const tablesDdl = (fkSplitIndex !== -1) ? fullSchema.slice(0, fkSplitIndex) : fullSchema;
  const fksDdl = (fkSplitIndex !== -1) ? fullSchema.slice(fkSplitIndex) : '';

  // 1. Create all 98 tables and indexes
  console.log('\n[1/4] Creating all 98 tables and indexes (FK-independent)...');
  await executeSqlContent(conn, tablesDdl, 'Tables DDL');

  // 2. Import Data (16,563 rows)
  console.log('\n[2/4] Importing data into 98 tables (16,563 rows)...');
  await executeSqlFileStream(conn, 'C:/Users/Usuario/techstore/server/sql/schema/data-dump.sql', 'Data Dump');

  // 3. Apply Foreign Key constraints
  if (fksDdl.trim()) {
    console.log('\n[3/4] Applying 116 Foreign Key constraints...');
    await executeSqlContent(conn, fksDdl, 'Foreign Keys');
  }

  await conn.query('SET foreign_key_checks = 1;');
  await conn.end();

  // 4. Verify Row Counts table by table
  console.log('\n[4/4] Running source vs target row count verification...');
  const verifyResult = await compareDatabases(sourceConfig, targetConfig);

  console.log('\n' + '═'.repeat(70));
  if (verifyResult.pass) {
    console.log('🎉 DATABASE MIGRATION: 100% COMPLETE & VERIFIED!');
    console.log(`   Source tables: ${verifyResult.sourceTables} | Target tables: ${verifyResult.targetTables}`);
    console.log(`   Mismatches: ${verifyResult.mismatches}`);
  } else {
    console.error(`❌ MIGRATION WARNING: ${verifyResult.mismatches} mismatches found.`);
    process.exit(1);
  }
  console.log('═'.repeat(70) + '\n');
}

migrate().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
