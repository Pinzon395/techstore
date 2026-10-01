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

async function exportData() {
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

  console.log(`Starting data export for ${tables.length} tables from ${env.DB_NAME}...`);
  const dumpPath = 'C:/Users/Usuario/techstore/server/sql/schema/data-dump.sql';
  fs.mkdirSync('C:/Users/Usuario/techstore/server/sql/schema', { recursive: true });

  const stream = fs.createWriteStream(dumpPath, { encoding: 'utf8' });
  stream.write('-- Pixon PC — Full Data Export for Cloud Migration\n');
  stream.write(`-- Generated: ${new Date().toISOString()}\n`);
  stream.write('SET NAMES utf8mb4;\n');
  stream.write('SET foreign_key_checks = 0;\n\n');

  let totalRows = 0;
  for (const t of tables) {
    const table = t.table_name || t.TABLE_NAME;
    const [cnt] = await conn.execute(`SELECT COUNT(*) AS c FROM \`${table}\``);
    const count = cnt[0].c;

    if (count === 0) continue;

    console.log(`Exporting ${table}: ${count} rows...`);
    totalRows += count;
    stream.write(`-- ─── Data: ${table} (${count} rows) ───\n`);

    // Fetch columns (excluding generated / virtual columns)
    const [allCols] = await conn.execute(
      "SELECT column_name, data_type, extra, generation_expression FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position",
      [env.DB_NAME, table]
    );
    const cols = allCols.filter(c => {
      const extra = String(c.extra || c.EXTRA || '').toUpperCase();
      const genExpr = c.generation_expression || c.GENERATION_EXPRESSION;
      return !extra.includes('GENERATED') && !extra.includes('VIRTUAL') && !extra.includes('STORED') && !genExpr;
    });
    const colNames = cols.map(c => `\`${c.column_name || c.COLUMN_NAME}\``).join(', ');

    const pageSize = 500;
    for (let offset = 0; offset < count; offset += pageSize) {
      const [rows] = await conn.execute(`SELECT * FROM \`${table}\` LIMIT ${pageSize} OFFSET ${offset}`);
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

      stream.write(`INSERT INTO \`${table}\` (${colNames}) VALUES\n${values.join(',\n')};\n`);
    }
    stream.write('\n');
  }

  stream.write('SET foreign_key_checks = 1;\n');
  stream.end();

  console.log(`Export finished! Total rows exported: ${totalRows} into ${dumpPath}`);
  await conn.end();
}

exportData().catch(err => {
  console.error('Export error:', err.message);
  process.exit(1);
});
