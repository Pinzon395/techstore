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
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

export async function getTableCounts(connectionConfig) {
  const conn = await mysql.createConnection(connectionConfig);
  const [tables] = await conn.execute(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
    [connectionConfig.database]
  );

  const counts = {};
  for (const t of tables) {
    const tableName = t.table_name || t.TABLE_NAME;
    const [cnt] = await conn.execute(`SELECT COUNT(*) AS c FROM \`${tableName}\``);
    counts[tableName] = cnt[0].c;
  }

  await conn.end();
  return counts;
}

export async function compareDatabases(sourceConfig, targetConfig) {
  console.log(`\n🔍 Verificando recuento de filas entre Source (${sourceConfig.database}) y Target (${targetConfig.database})...\n`);

  const sourceCounts = await getTableCounts(sourceConfig);
  const targetCounts = await getTableCounts(targetConfig);

  const sourceTables = Object.keys(sourceCounts);
  const targetTables = Object.keys(targetCounts);

  let mismatches = 0;
  let missingInTarget = 0;
  let missingInSource = 0;

  console.log('Tabla'.padEnd(40) + 'Source'.padStart(10) + 'Target'.padStart(10) + '  Estado');
  console.log('─'.repeat(70));

  for (const table of sourceTables) {
    const sCount = sourceCounts[table];
    const tCount = targetCounts[table];

    if (tCount === undefined) {
      console.log(`${table.padEnd(40)}${String(sCount).padStart(10)}${'MISSING'.padStart(10)}  ❌ Falta en Target`);
      missingInTarget++;
      mismatches++;
    } else if (sCount !== tCount) {
      console.log(`${table.padEnd(40)}${String(sCount).padStart(10)}${String(tCount).padStart(10)}  ❌ Discrepancia`);
      mismatches++;
    } else {
      console.log(`${table.padEnd(40)}${String(sCount).padStart(10)}${String(tCount).padStart(10)}  ✅ OK`);
    }
  }

  for (const table of targetTables) {
    if (sourceCounts[table] === undefined) {
      console.log(`${table.padEnd(40)}${'MISSING'.padStart(10)}${String(targetCounts[table]).padStart(10)}  ⚠️  Extra en Target`);
      missingInSource++;
    }
  }

  console.log('─'.repeat(70));
  console.log(`Total tablas Source: ${sourceTables.length} | Target: ${targetTables.length}`);
  console.log(`Discrepancias: ${mismatches}`);

  return {
    pass: mismatches === 0,
    sourceTables: sourceTables.length,
    targetTables: targetTables.length,
    mismatches
  };
}

// Auto-run if called directly
if (process.argv[1]?.endsWith('verify-row-counts.mjs')) {
  const env = parseEnv('C:/Users/Usuario/techstore/.env');
  const sourceConfig = {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  };

  const targetUri = env.TARGET_DATABASE_URL || process.env.TARGET_DATABASE_URL || process.argv[2];
  if (!targetUri) {
    console.log('ℹ️  Ejecución en modo auto-auditoría Source (no se proporcionó TARGET_DATABASE_URL):');
    getTableCounts(sourceConfig).then(counts => {
      console.log(`Total tablas en Source (${sourceConfig.database}): ${Object.keys(counts).length}`);
      const nonZero = Object.entries(counts).filter(([_, c]) => c > 0);
      console.log(`Tablas con datos (>0 filas): ${nonZero.length}`);
      nonZero.slice(0, 15).forEach(([t, c]) => console.log(`  - ${t}: ${c} filas`));
      console.log('\nPara comparar con Target:\n  node tools/verify-row-counts.mjs "mysql://user:pass@host:port/dbname?ssl-mode=REQUIRED"\n');
    });
  } else {
    // Parse target uri and compare
    // mysql://user:password@host:port/dbname
    const u = new URL(targetUri);
    const targetConfig = {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
      ssl: { rejectUnauthorized: false }
    };
    compareDatabases(sourceConfig, targetConfig).then(res => {
      if (!res.pass) process.exit(1);
    });
  }
}
