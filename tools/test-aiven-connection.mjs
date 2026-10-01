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

async function testConnection() {
  const env = parseEnv('C:/Users/Usuario/techstore/.env');
  if (!env.TARGET_DATABASE_URL) {
    throw new Error('TARGET_DATABASE_URL missing in .env');
  }

  const u = new URL(env.TARGET_DATABASE_URL);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port) || 13008,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'defaultdb',
    ssl: { rejectUnauthorized: false }
  });

  const [rows] = await conn.execute('SELECT VERSION() AS ver, NOW() AS srv_time, USER() AS curr_user');
  console.log('AIVEN_MYSQL_CONNECTED: SUCCESS');
  console.log('Version:', rows[0].ver);
  console.log('Server Time:', rows[0].srv_time);
  console.log('User:', rows[0].curr_user);

  await conn.end();
}

testConnection().catch(err => {
  console.error('AIVEN_CONNECT_ERROR:', err.message);
  process.exit(1);
});
