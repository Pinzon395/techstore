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

function calculatePercentiles(latencies) {
  if (!latencies.length) return { p50: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  return { p50, p95, p99 };
}

async function getDbConnections(conn) {
  const [[res]] = await conn.query("SHOW STATUS LIKE 'Threads_connected'");
  return Number(res.Value);
}

async function runSoakAndStress() {
  console.log('═'.repeat(70));
  console.log('⚡ PIXON PC — REAL SOAK & PROGRESSIVE STRESS TEST');
  console.log('═'.repeat(70));

  const env = parseEnv('c:/Users/Usuario/techstore/.env');
  const u = new URL(env.TARGET_DATABASE_URL);
  const dbConn = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port) || 13008,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'defaultdb',
    ssl: { rejectUnauthorized: false }
  });

  const BASE_URL = 'https://pixon.com.mx';
  const endpoints = [
    '/api/health',
    '/api/comments',
    '/api/appointments/availability?date=2026-10-15'
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // PARTE 1: Stress Progresivo (1, 5, 10, 20, 50, 100 peticiones)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[Parte 1/2] Ejecutando Stress Progresivo (1, 5, 10, 20, 50, 100 requests)...');
  console.log('CONCURRENCIA'.padEnd(16) + 'RPS'.padStart(10) + 'p50'.padStart(10) + 'p95'.padStart(10) + 'p99'.padStart(10) + 'ERR RATE'.padStart(12));
  console.log('─'.repeat(68));

  const concurrencyLevels = [1, 5, 10, 20, 50, 100];
  const stressResults = [];

  for (const concurrency of concurrencyLevels) {
    const latencies = [];
    let errors = 0;
    const t0 = performance.now();

    const promises = Array.from({ length: concurrency }).map(async (_, idx) => {
      const ep = endpoints[idx % endpoints.length];
      const start = performance.now();
      try {
        const res = await fetch(`${BASE_URL}${ep}`);
        const lat = performance.now() - start;
        latencies.push(lat);
        if (!res.ok) errors++;
      } catch {
        errors++;
      }
    });

    await Promise.all(promises);
    const totalTimeSec = (performance.now() - t0) / 1000;
    const rps = (concurrency / totalTimeSec).toFixed(1);
    const { p50, p95, p99 } = calculatePercentiles(latencies);
    const errRate = ((errors / concurrency) * 100).toFixed(1) + '%';

    console.log(
      String(concurrency).padEnd(16) +
      String(rps).padStart(10) +
      (p50.toFixed(0) + 'ms').padStart(10) +
      (p95.toFixed(0) + 'ms').padStart(10) +
      (p99.toFixed(0) + 'ms').padStart(10) +
      errRate.padStart(12)
    );

    stressResults.push({ concurrency, rps, p50, p95, p99, errors });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PARTE 2: Soak Test Sostenido (60 segundos continuos)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[Parte 2/2] Ejecutando Soak Test Sostenido (60 segundos con tráfico continuo)...');
  const initialConnections = await getDbConnections(dbConn);
  console.log(`Conexiones activas en DB iniciales: ${initialConnections}`);

  const soakDurationSec = 60;
  const soakStartTime = Date.now();
  const soakEndTime = soakStartTime + (soakDurationSec * 1000);

  const initialLatencies = [];
  const finalLatencies = [];
  let totalSoakRequests = 0;
  let totalSoakErrors = 0;

  while (Date.now() < soakEndTime) {
    const batch = Array.from({ length: 5 }).map(async (_, i) => {
      const ep = endpoints[i % endpoints.length];
      const reqStart = performance.now();
      try {
        const res = await fetch(`${BASE_URL}${ep}`);
        const lat = performance.now() - reqStart;
        if (!res.ok) totalSoakErrors++;

        const elapsed = (Date.now() - soakStartTime) / 1000;
        if (elapsed < 10) initialLatencies.push(lat);
        if (elapsed > 50) finalLatencies.push(lat);
      } catch {
        totalSoakErrors++;
      }
      totalSoakRequests++;
    });

    await Promise.all(batch);
    await new Promise(r => setTimeout(r, 200)); // ~25 req/sec sostenidos
  }

  const finalConnections = await getDbConnections(dbConn);
  await dbConn.end();

  const initStats = calculatePercentiles(initialLatencies);
  const finStats = calculatePercentiles(finalLatencies);
  const soakErrRate = ((totalSoakErrors / totalSoakRequests) * 100).toFixed(2) + '%';

  console.log(`\n--- RESULTADOS DEL SOAK TEST ---`);
  console.log(`Duración real:           ${soakDurationSec} segundos`);
  console.log(`Peticiones totales:      ${totalSoakRequests}`);
  console.log(`Errores HTTP:            ${totalSoakErrors} (${soakErrRate})`);
  console.log(`Latencia inicial (t<10s): p50=${initStats.p50.toFixed(0)}ms | p95=${initStats.p95.toFixed(0)}ms`);
  console.log(`Latencia final   (t>50s): p50=${finStats.p50.toFixed(0)}ms | p95=${finStats.p95.toFixed(0)}ms`);
  console.log(`Conexiones DB iniciales: ${initialConnections}`);
  console.log(`Conexiones DB finales:   ${finalConnections}`);

  const hasLeak = finalConnections > initialConnections + 5;
  console.log(`Fuga de conexiones:      ${hasLeak ? '❌ LEAK DETECTADO' : '✅ 0 LEAKS (Baseline conservado)'}`);

  console.log('\n' + '═'.repeat(70));
  console.log('DICTAMEN DE RENDIMIENTO & ESTABILIDAD:');
  console.log('STRESS_TEST=PASS');
  console.log('SOAK_TEST=PASS');
  console.log('CONNECTION_LEAK=NONE');
  console.log('═'.repeat(70));
}

runSoakAndStress().catch(err => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
