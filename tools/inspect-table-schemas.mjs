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

async function inspect() {
  const env = parseEnv('C:/Users/Usuario/techstore/.env');
  const u = new URL(env.TARGET_DATABASE_URL);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port) || 13008,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'defaultdb',
    ssl: { rejectUnauthorized: false }
  });

  const tables = ['comments', 'appointments', 'repairs', 'email_outbox', 'job_runs'];
  for (const t of tables) {
    console.log(`\n=== Table: ${t} ===`);
    const [cols] = await conn.query(`DESCRIBE \`${t}\``);
    console.log(cols.map(c => `${c.Field} (${c.Type}) ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${c.Default ? 'DEF:' + c.Default : ''}`).join('\n'));

    const [sample] = await conn.query(`SELECT * FROM \`${t}\` LIMIT 1`);
    if (sample.length > 0) {
      console.log('Sample row keys:', Object.keys(sample[0]));
    } else {
      console.log('0 rows in table');
    }
  }

  await conn.end();
}

inspect().catch(err => {
  console.error('Inspect error:', err);
  process.exit(1);
});
