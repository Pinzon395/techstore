import mysql from 'mysql2/promise';
import fs from 'node:fs';

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

async function dumpSchema() {
  const env = parseEnv('C:/Users/Usuario/techstore/.env');
  const conn = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  });

  const [tables] = await conn.execute(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
    [env.DB_NAME]
  );

  console.log(`Found ${tables.length} base tables in ${env.DB_NAME}`);

  let sqlDump = `-- ═══════════════════════════════════════════════════════════════════════════
-- Pixon PC — Full Production Schema (MySQL 8.0 Compatible)
-- Generated: ${new Date().toISOString()}
-- Source: ${env.DB_NAME} (${tables.length} tables)
-- Target: Aiven MySQL Free / Cloud MySQL 8.0+
-- ═══════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET foreign_key_checks = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

`;

  const tablesWithoutPK = [];
  const foreignKeyStatements = [];

  for (const t of tables) {
    const tableName = t.table_name || t.TABLE_NAME;
    const [createResult] = await conn.execute(`SHOW CREATE TABLE \`${tableName}\``);
    let createSql = createResult[0]['Create Table'] || createResult[0]['CREATE TABLE'];

    // Adapt collation from MariaDB uca1400 to standard MySQL 8 utf8mb4_unicode_ci
    createSql = createSql.replace(/COLLATE=utf8mb4_uca1400_ai_ci/g, 'COLLATE=utf8mb4_unicode_ci');
    createSql = createSql.replace(/utf8mb4_uca1400_ai_ci/g, 'utf8mb4_unicode_ci');
    createSql = createSql.replace(/cast\(`currency` as char charset binary\)/gi, '`currency`');
    createSql = createSql.replace(/(`primary_item_id`[^\n]+)STORED/gi, '$1VIRTUAL');

    // Extract Foreign Keys so tables are created without dependency ordering issues
    let fkIndex = 0;
    const lines = createSql.split('\n');
    const tableLines = [];

    for (let line of lines) {
      if (line.includes('FOREIGN KEY')) {
        fkIndex++;
        let fkClause = line.trim().replace(/,$/, '');
        // Ensure constraint name is unique and < 64 chars
        if (fkClause.includes('CONSTRAINT')) {
          fkClause = fkClause.replace(/CONSTRAINT `[^`]+`/g, `CONSTRAINT \`fk_${tableName.slice(0, 25)}_${fkIndex}\``);
        } else {
          fkClause = `CONSTRAINT \`fk_${tableName.slice(0, 25)}_${fkIndex}\` ${fkClause}`;
        }
        foreignKeyStatements.push(`ALTER TABLE \`${tableName}\` ADD ${fkClause};`);
      } else {
        tableLines.push(line);
      }
    }

    let cleanCreate = tableLines.join('\n');
    // Remove any trailing comma before closing parenthesis
    cleanCreate = cleanCreate.replace(/,\s*(\n\s*\)\s*ENGINE)/g, '$1');

    if (!cleanCreate.includes('PRIMARY KEY')) {
      tablesWithoutPK.push(tableName);
    }

    sqlDump += `-- ─── Table: ${tableName} ───────────────────────────────────────────────────\n`;
    sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
    sqlDump += `${cleanCreate};\n\n`;
  }

  // Ensure job_runs table exists for Guardrail 2 (Idempotency)
  sqlDump += `-- ─── Guardrail 2: Idempotency Tracking Table (job_runs) ─────────────────────\n`;
  sqlDump += `CREATE TABLE IF NOT EXISTS \`job_runs\` (
  \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`run_key\` VARCHAR(100) NOT NULL,
  \`status\` ENUM('running','done','failed') NOT NULL DEFAULT 'running',
  \`started_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`completed_at\` TIMESTAMP NULL,
  \`result\` VARCHAR(255) NULL,
  UNIQUE KEY \`uq_job_runs_run_key\` (\`run_key\`),
  INDEX \`idx_job_runs_status\` (\`status\`, \`started_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  // Append all foreign keys at the end
  sqlDump += `-- ═══════════════════════════════════════════════════════════════════════════\n`;
  sqlDump += `-- Foreign Key Constraints (${foreignKeyStatements.length} constraints)\n`;
  sqlDump += `-- ═══════════════════════════════════════════════════════════════════════════\n\n`;
  for (const fkSql of foreignKeyStatements) {
    sqlDump += `${fkSql}\n`;
  }
  sqlDump += `\nSET foreign_key_checks = 1;\n`;

  fs.mkdirSync('C:/Users/Usuario/techstore/server/sql/schema', { recursive: true });
  fs.writeFileSync('C:/Users/Usuario/techstore/server/sql/schema/schema-mysql8-complete.sql', sqlDump, 'utf8');

  console.log(`Exported complete schema to C:/Users/Usuario/techstore/server/sql/schema/schema-mysql8-complete.sql`);
  console.log(`Foreign keys deferred to end: ${foreignKeyStatements.length}`);
  console.log(`Tables without PK: ${tablesWithoutPK.length ? tablesWithoutPK.join(', ') : 'NONE (all have PK)'}`);

  await conn.end();
}

dumpSchema().catch(err => {
  console.error('Error dumping schema:', err.message);
  process.exit(1);
});
