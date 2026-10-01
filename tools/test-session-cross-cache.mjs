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

async function testSessionIsolation() {
  console.log('═'.repeat(70));
  console.log('👥 PIXON PC — SESSION CROSS-USER CACHE & DATA ISOLATION TEST');
  console.log('═'.repeat(70));

  const env = parseEnv('c:/Users/Usuario/techstore/.env');
  const u = new URL(env.TARGET_DATABASE_URL);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port) || 13008,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'defaultdb',
    ssl: { rejectUnauthorized: false }
  });

  const SESS_ALPHA = 'test_sid_alpha_qa_' + Date.now();
  const SESS_BETA = 'test_sid_beta_qa_' + Date.now();

  const USER_ALPHA_ID = 'usr_qa_alpha_991';
  const USER_BETA_ID = 'usr_qa_beta_992';

  // 1. Setup Test Users and Sessions in Aiven MySQL
  console.log('\n[1/3] Aprovisionando usuarios y sesiones de prueba en Aiven MySQL...');
  await conn.query('DELETE FROM users WHERE id IN (?, ?)', [USER_ALPHA_ID, USER_BETA_ID]);
  await conn.query(
    "INSERT INTO users (id, name, email, role_id, created_at) VALUES (?, 'Alpha Customer', 'alpha@pixon.local', 2, NOW())",
    [USER_ALPHA_ID]
  );
  await conn.query(
    "INSERT INTO users (id, name, email, role_id, created_at) VALUES (?, 'Beta Customer', 'beta@pixon.local', 2, NOW())",
    [USER_BETA_ID]
  );

  const expiresTimestamp = Math.floor(Date.now() / 1000) + 3600;
  await conn.query('DELETE FROM sessions WHERE session_id IN (?, ?)', [SESS_ALPHA, SESS_BETA]);
  await conn.query(
    'INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)',
    [SESS_ALPHA, expiresTimestamp, JSON.stringify({ passport: { user: { id: USER_ALPHA_ID, name: 'Alpha Customer', email: 'alpha@pixon.local', role: 'client' } } })]
  );
  await conn.query(
    'INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)',
    [SESS_BETA, expiresTimestamp, JSON.stringify({ passport: { user: { id: USER_BETA_ID, name: 'Beta Customer', email: 'beta@pixon.local', role: 'client' } } })]
  );

  // Setup distinct test repairs
  const TICKET_ALPHA = 'TK-QA-ALPHA-' + Date.now().toString().slice(-4);
  const TICKET_BETA = 'TK-QA-BETA-' + Date.now().toString().slice(-4);

  await conn.query(
    `INSERT INTO repairs (ticket_code, user_id, device_type, device_brand, device_model, reported_issue, status, priority, contact_phone, contact_email)
     VALUES (?, ?, 'Laptop Alpha', 'Dell', 'XPS', 'Issue Alpha', 'received', 'normal', '9981111111', 'alpha@pixon.local')`,
    [TICKET_ALPHA, USER_ALPHA_ID]
  );
  await conn.query(
    `INSERT INTO repairs (ticket_code, user_id, device_type, device_brand, device_model, reported_issue, status, priority, contact_phone, contact_email)
     VALUES (?, ?, 'PC Beta', 'HP', 'Omen', 'Issue Beta', 'received', 'normal', '9982222222', 'beta@pixon.local')`,
    [TICKET_BETA, USER_BETA_ID]
  );

  console.log('✅ Usuarios, sesiones y tickets de prueba inicializados.');

  // 2. Interleaved API requests testing cache isolation
  console.log('\n[2/3] Ejecutando peticiones intercaladas contra producción (https://pixon.com.mx)...');

  // Test 1: User Alpha /api/me
  const resAlpha1 = await fetch('https://pixon.com.mx/api/me', {
    headers: { Cookie: `pixon_sid=${SESS_ALPHA}` }
  });
  const dataAlpha1 = await resAlpha1.json();
  const cacheAlpha1 = resAlpha1.headers.get('cache-control') || '';
  const cfAlpha1 = resAlpha1.headers.get('cf-cache-status') || 'NONE';

  console.log(`Req 1 (User Alpha /api/me): email=${dataAlpha1.user?.email} | CF-Cache=${cfAlpha1} | Cache-Control=${cacheAlpha1}`);

  // Test 2: User Beta /api/me (Immediately after Alpha)
  const resBeta1 = await fetch('https://pixon.com.mx/api/me', {
    headers: { Cookie: `pixon_sid=${SESS_BETA}` }
  });
  const dataBeta1 = await resBeta1.json();
  const cfBeta1 = resBeta1.headers.get('cf-cache-status') || 'NONE';

  console.log(`Req 2 (User Beta  /api/me): email=${dataBeta1.user?.email} | CF-Cache=${cfBeta1}`);

  if (dataBeta1.user?.email === 'alpha@pixon.local') {
    throw new Error('❌ FUGA CRÍTICA DE CACHÉ: User Beta recibió datos de User Alpha!');
  }

  // Test 3: User Alpha /api/mis-tickets
  const resTicketsAlpha = await fetch('https://pixon.com.mx/api/mis-tickets', {
    headers: { Cookie: `pixon_sid=${SESS_ALPHA}` }
  });
  const dataTicketsAlpha = await resTicketsAlpha.json();
  const ticketsAlpha = dataTicketsAlpha.repairs || [];
  console.log(`Req 3 (Alpha /api/mis-tickets): ${ticketsAlpha.map(t => t.ticket_code).join(', ')}`);

  // Test 4: User Beta /api/mis-tickets
  const resTicketsBeta = await fetch('https://pixon.com.mx/api/mis-tickets', {
    headers: { Cookie: `pixon_sid=${SESS_BETA}` }
  });
  const dataTicketsBeta = await resTicketsBeta.json();
  const ticketsBeta = dataTicketsBeta.repairs || [];
  console.log(`Req 4 (Beta  /api/mis-tickets): ${ticketsBeta.map(t => t.ticket_code).join(', ')}`);

  const alphaHasBetaTicket = ticketsAlpha.some(t => t.ticket_code === TICKET_BETA);
  const betaHasAlphaTicket = ticketsBeta.some(t => t.ticket_code === TICKET_ALPHA);

  if (alphaHasBetaTicket || betaHasAlphaTicket) {
    throw new Error('❌ IDOR / CACHE CONTAMINATION: Tickets cruzados entre usuarios!');
  }

  // Test 5: Re-verify Alpha after Beta calls
  const resAlpha2 = await fetch('https://pixon.com.mx/api/me', {
    headers: { Cookie: `pixon_sid=${SESS_ALPHA}` }
  });
  const dataAlpha2 = await resAlpha2.json();
  if (dataAlpha2.user?.email !== 'alpha@pixon.local') {
    throw new Error('❌ Sesión de Alpha corrupta tras petición de Beta!');
  }

  console.log('\n[3/3] Limpiando datos de prueba en Aiven MySQL...');
  await conn.query('DELETE FROM sessions WHERE session_id IN (?, ?)', [SESS_ALPHA, SESS_BETA]);
  await conn.query('DELETE FROM repairs WHERE ticket_code IN (?, ?)', [TICKET_ALPHA, TICKET_BETA]);
  await conn.query('DELETE FROM users WHERE id IN (?, ?)', [USER_ALPHA_ID, USER_BETA_ID]);
  await conn.end();
  console.log('✅ Datos de prueba eliminados.');

  console.log('\n' + '═'.repeat(70));
  console.log('DICTAMEN DE AISLAMIENTO DE SESIÓN:');
  console.log('CROSS_USER_CACHE_LEAK=NONE');
  console.log('SESSION_ISOLATION=PASS');
  console.log('TICKET_IDOR_PREVENTION=PASS');
  console.log('═'.repeat(70));
}

testSessionIsolation().catch(err => {
  console.error('Fatal isolation error:', err);
  process.exit(1);
});
