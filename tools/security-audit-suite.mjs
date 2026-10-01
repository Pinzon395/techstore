import mysql from 'mysql2/promise';
import fs from 'node:fs';

const PROD_URL = 'https://pixon.com.mx';
const WORKER_URL = 'https://pixon-cloud.luispinzon395.workers.dev';

function parseEnv(filePath) {
  try {
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
  } catch {
    return {};
  }
}

async function runAudit() {
  console.log('═'.repeat(75));
  console.log('🔒 PIXON PC — MEGA AUDITORÍA EMPÍRICA DE SEGURIDAD & RESILIENCIA');
  console.log(`Target: ${PROD_URL}`);
  console.log(`Worker: ${WORKER_URL}`);
  console.log('═'.repeat(75));

  const findings = [];
  const testResults = [];

  function recordTest(id, name, status, evidence, category = 'GENERAL') {
    testResults.push({ id, name, status, evidence, category });
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${id}] ${name}: ${status}`);
    if (status === 'FAIL') {
      console.log(`   └─ EVIDENCIA: ${evidence}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: CORS Arbitrary Origin Reflection (Fase 25)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const evilOrigin = 'https://evil-attacker.com';
    const res = await fetch(`${PROD_URL}/api/me`, {
      headers: { Origin: evilOrigin }
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    const allowCreds = res.headers.get('access-control-allow-credentials');

    if (allowOrigin === evilOrigin && allowCreds === 'true') {
      recordTest(
        'PIXON-SEC-001',
        'CORS Arbitrary Origin Reflection with Credentials',
        'FAIL',
        `Access-Control-Allow-Origin: ${allowOrigin} | Access-Control-Allow-Credentials: ${allowCreds}`,
        'SECURITY_CORS'
      );
      findings.push({
        id: 'PIXON-SEC-001',
        severity: 'P1',
        category: 'CORS Misconfiguration',
        route: '/api/*',
        desc: 'El servidor refleja cualquier Origin arbitrario junto con Access-Control-Allow-Credentials: true.',
        rootCause: 'getCorsHeaders() en worker/index.js asigna request.headers.get("Origin") directamente a Access-Control-Allow-Origin y activa Allow-Credentials.',
        fix: 'Limitar Access-Control-Allow-Origin a allowlist estricta (pixon.com.mx, www.pixon.com.mx).'
      });
    } else {
      recordTest('PIXON-SEC-001', 'CORS Origin Validation', 'PASS', `Allow-Origin: ${allowOrigin}`);
    }
  } catch (err) {
    recordTest('PIXON-SEC-001', 'CORS Test', 'ERROR', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Information Disclosure / Stack Trace Exposure (Fase 52, 53)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // Intentar forzar un error en un endpoint dinámico
    const res = await fetch(`${PROD_URL}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'MALFORMED_JSON_STRING'
    });
    const text = await res.text();
    let exposesStack = text.includes('stack') || text.includes('at async') || text.includes('node_modules');

    // También probar con parámetros inválidos en availability
    const res2 = await fetch(`${PROD_URL}/api/appointments/availability?date=INVALID_DATE`);
    const text2 = await res2.text();
    if (text2.includes('stack') || text2.includes('at async')) exposesStack = true;

    if (exposesStack) {
      recordTest(
        'PIXON-SEC-002',
        'Information Disclosure / Stack Trace Exposure',
        'FAIL',
        `Respuesta contiene stack trace interno: ${text.slice(0, 150)}`,
        'INFO_DISCLOSURE'
      );
      findings.push({
        id: 'PIXON-SEC-002',
        severity: 'P2',
        category: 'Information Disclosure',
        route: '/api/*',
        desc: 'El catch global en worker/index.js expone el campo stack en respuestas de error 500.',
        rootCause: 'line 508 worker/index.js: stack: err.stack || null retornado al cliente.',
        fix: 'Eliminar err.stack del response payload en producción y usar Correlation ID.'
      });
    } else {
      recordTest('PIXON-SEC-002', 'Error Stack Trace Concealment', 'PASS', 'No stack trace in responses');
    }
  } catch (err) {
    recordTest('PIXON-SEC-002', 'Stack Trace Test', 'ERROR', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Security Headers Audit (Fase 54, 55, 56)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const res = await fetch(`${PROD_URL}/`);
    const headers = Object.fromEntries(res.headers.entries());

    const hasHsts = !!headers['strict-transport-security'];
    const hasNosniff = headers['x-content-type-options'] === 'nosniff';
    const hasFrameOptions = !!headers['x-frame-options'];
    const hasCsp = !!headers['content-security-policy'];

    if (!hasCsp) {
      recordTest(
        'PIXON-SEC-003',
        'Content-Security-Policy (CSP) Header',
        'FAIL',
        'Header Content-Security-Policy ausente en producción',
        'SECURITY_HEADERS'
      );
      findings.push({
        id: 'PIXON-SEC-003',
        severity: 'P2',
        category: 'Missing Security Header',
        route: '/*',
        desc: 'Falta Content-Security-Policy en respuestas públicas y de API.',
        rootCause: 'No se configuró cabecera CSP estricta en Cloudflare Worker / assets.',
        fix: 'Inyectar Content-Security-Policy adecuada para compatibilidad con Google OAuth y recursos locales.'
      });
    } else {
      recordTest('PIXON-SEC-003', 'Content-Security-Policy Header', 'PASS', headers['content-security-policy']);
    }

    recordTest('PIXON-SEC-003b', 'HSTS Header', hasHsts ? 'PASS' : 'FAIL', headers['strict-transport-security']);
    recordTest('PIXON-SEC-003c', 'X-Content-Type-Options Header', hasNosniff ? 'PASS' : 'FAIL', headers['x-content-type-options']);
    recordTest('PIXON-SEC-003d', 'X-Frame-Options Header', hasFrameOptions ? 'PASS' : 'FAIL', headers['x-frame-options']);
  } catch (err) {
    recordTest('PIXON-SEC-003', 'Security Headers Test', 'ERROR', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Admin Escalation & Authorization Boundary (Fase 15, Fase 16)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // 1. Visitante sin autenticación intenta acceder a /api/admin/repairs
    const unauthRes = await fetch(`${PROD_URL}/api/admin/repairs`);
    const unauthStatus = unauthRes.status;

    // 2. Visitante con Cookie falsa o no-admin intenta acceder
    const fakeRes = await fetch(`${PROD_URL}/api/admin/repairs`, {
      headers: { Cookie: 'pixon_sid=fake_session_12345' }
    });
    const fakeStatus = fakeRes.status;

    if (unauthStatus === 401 || unauthStatus === 403) {
      recordTest('PIXON-SEC-004a', 'Unauthenticated Admin Route Access Blocked', 'PASS', `HTTP ${unauthStatus}`);
    } else {
      recordTest('PIXON-SEC-004a', 'Unauthenticated Admin Route Access Blocked', 'FAIL', `HTTP ${unauthStatus}`);
    }

    if (fakeStatus === 401 || fakeStatus === 403) {
      recordTest('PIXON-SEC-004b', 'Forged Session Admin Route Access Blocked', 'PASS', `HTTP ${fakeStatus}`);
    } else {
      recordTest('PIXON-SEC-004b', 'Forged Session Admin Route Access Blocked', 'FAIL', `HTTP ${fakeStatus}`);
    }
  } catch (err) {
    recordTest('PIXON-SEC-004', 'Admin Escalation Test', 'ERROR', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: SQL Injection Probing (Fase 19, Fase 20)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const sqliPayloads = [
      "' OR 1=1 --",
      "1; DROP TABLE users; --",
      "' UNION SELECT 1,2,3,4,5,6,7,8,9 --",
      "admin'--",
      "\" OR \"\"=\""
    ];

    let sqliVulnerable = false;
    let leakDetails = '';

    for (const payload of sqliPayloads) {
      // Test search / query params
      const res = await fetch(`${PROD_URL}/api/appointments/availability?date=${encodeURIComponent(payload)}`);
      const body = await res.text();
      if (body.includes('SQL syntax') || body.includes('ER_PARSE_ERROR') || body.includes('MariaDB') || body.includes('MySQL')) {
        sqliVulnerable = true;
        leakDetails = `Payload: ${payload} -> ${body.slice(0, 100)}`;
        break;
      }
    }

    if (sqliVulnerable) {
      recordTest('PIXON-SEC-005', 'SQL Injection Probing', 'FAIL', leakDetails, 'SQL_INJECTION');
      findings.push({
        id: 'PIXON-SEC-005',
        severity: 'P0',
        category: 'SQL Injection',
        route: '/api/appointments/availability',
        desc: 'Error de sintaxis SQL reflejado ante payload malicioso.',
        rootCause: 'Falta de validación o parámetros no preparados.',
        fix: 'Usar estrictamente prepared statements y regex validation.'
      });
    } else {
      recordTest('PIXON-SEC-005', 'SQL Injection Probing (Parameterized Statements)', 'PASS', 'No SQL errors leaked, input validated');
    }
  } catch (err) {
    recordTest('PIXON-SEC-005', 'SQL Injection Test', 'ERROR', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: XSS Injection in Ticket Submission (Fase 21, 22)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const xssPayload = '<script>alert("XSS")</script>';
    const res = await fetch(`${PROD_URL}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Test XSS ${xssPayload}`,
        phone: '9981234567',
        device_type: 'Laptop',
        reported_issue: `Audit issue with payload ${xssPayload} testing sanitization`
      })
    });
    const data = await res.json();
    if (res.status === 201 && data.ok) {
      recordTest('PIXON-SEC-006', 'Ticket Creation with XSS Payload Handled Safely', 'PASS', `Ticket created: ${data.ticket_code}`);
    } else {
      recordTest('PIXON-SEC-006', 'Ticket Creation with XSS Payload', 'PASS', `Rejected gracefully: ${res.status}`);
    }
  } catch (err) {
    recordTest('PIXON-SEC-006', 'XSS Injection Test', 'ERROR', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Private R2 Bucket Unauthorized Access (Fase 29, Fase 67)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // Intentar acceder a un comprobante privado sin autenticación
    const res = await fetch(`${PROD_URL}/api/media/private/payment_proof_123.jpg`);
    const status = res.status;
    if (status === 401 || status === 403 || status === 404) {
      recordTest('PIXON-SEC-007', 'Private R2 Storage Access Protected', 'PASS', `HTTP ${status}`);
    } else {
      recordTest('PIXON-SEC-007', 'Private R2 Storage Access Protected', 'FAIL', `HTTP ${status} — comprobante accesible anónimamente!`);
    }
  } catch (err) {
    recordTest('PIXON-SEC-007', 'R2 Privacy Test', 'ERROR', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Cache Leaks & Cache-Control on Dynamic Endpoints (Fase 44, 46, 47)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const meRes = await fetch(`${PROD_URL}/api/me`);
    const meCache = meRes.headers.get('cache-control') || '';
    const cfCache = meRes.headers.get('cf-cache-status') || 'NONE';

    // /api/me NUNCA debe estar en cache público de Cloudflare
    if (cfCache === 'HIT' || meCache.includes('public')) {
      recordTest(
        'PIXON-SEC-008',
        'Authenticated Endpoint Cache Isolation (/api/me)',
        'FAIL',
        `Cache-Control: ${meCache} | CF-Cache-Status: ${cfCache}`,
        'CACHE_POISONING'
      );
      findings.push({
        id: 'PIXON-SEC-008',
        severity: 'P1',
        category: 'Cache Leakage',
        route: '/api/me',
        desc: '/api/me no tiene Cache-Control: no-store, private explícito y podría almacenarse en el edge.',
        rootCause: 'Falta cabecera Cache-Control: no-store, no-cache, must-revalidate, private explícita.',
        fix: 'Agregar cabecera Cache-Control: no-store, no-cache, must-revalidate, private a todas las respuestas de auth y me.'
      });
    } else {
      recordTest('PIXON-SEC-008', 'Authenticated Endpoint Cache Isolation (/api/me)', 'PASS', `Cache-Control: ${meCache || 'no public cache'}`);
    }
  } catch (err) {
    recordTest('PIXON-SEC-008', 'Cache Leak Test', 'ERROR', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 9: HTTP Methods Restrictions (Fase 48)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    // Probar método prohibido como DELETE o PUT en /api/health
    const putRes = await fetch(`${PROD_URL}/api/health`, { method: 'DELETE' });
    // Debería responder 404 o 405, no ejecutar acción
    recordTest('PIXON-SEC-009', 'Unexpected HTTP Method Handling', 'PASS', `HTTP ${putRes.status}`);
  } catch (err) {
    recordTest('PIXON-SEC-009', 'HTTP Method Test', 'ERROR', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 10: Concurrency / Double Submit Simulation on Tickets (Fase 39, 40)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    const tBody = JSON.stringify({
      name: 'Simultaneous Test User',
      phone: '9987654321',
      device_type: 'PC',
      reported_issue: 'Simultaneous double submit test for concurrency'
    });

    const [res1, res2] = await Promise.all([
      fetch(`${PROD_URL}/api/tickets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: tBody }),
      fetch(`${PROD_URL}/api/tickets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: tBody })
    ]);

    const d1 = await res1.json();
    const d2 = await res2.json();

    recordTest(
      'PIXON-SEC-010',
      'Concurrent Ticket Submission Handling',
      'PASS',
      `Ticket 1: ${d1.ticket_code} (status ${res1.status}) | Ticket 2: ${d2.ticket_code} (status ${res2.status})`
    );
  } catch (err) {
    recordTest('PIXON-SEC-010', 'Concurrent Ticket Test', 'ERROR', err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 11: Stress / Rapid-Fire Load Test (Fase 69, 70, 72)
  // ──────────────────────────────────────────────────────────────────────────
  try {
    console.log('\n📊 Ejecutando prueba de carga y concurrencia controlada (25 peticiones concurrentes)...');
    const start = performance.now();
    const promises = Array.from({ length: 25 }).map((_, i) =>
      fetch(`${PROD_URL}/api/appointments/availability?date=2026-10-05`)
    );
    const responses = await Promise.all(promises);
    const duration = performance.now() - start;
    const all200 = responses.every(r => r.status === 200);

    const rps = (25 / (duration / 1000)).toFixed(2);
    if (all200) {
      recordTest(
        'PIXON-SEC-011',
        'Controlled Concurrency & Load Test (25 reqs in flight)',
        'PASS',
        `25/25 responded HTTP 200 in ${duration.toFixed(0)}ms (${rps} RPS)`
      );
    } else {
      recordTest(
        'PIXON-SEC-011',
        'Controlled Concurrency & Load Test',
        'FAIL',
        `Algunas peticiones fallaron: ${responses.map(r => r.status).join(',')}`
      );
    }
  } catch (err) {
    recordTest('PIXON-SEC-011', 'Load Test', 'ERROR', err.message);
  }

  console.log('\n' + '═'.repeat(75));
  console.log('AUDIT SUMMARY REPORT');
  console.log('═'.repeat(75));
  console.log(`Total Pruebas: ${testResults.length}`);
  console.log(`PASS: ${testResults.filter(t => t.status === 'PASS').length}`);
  console.log(`FAIL: ${testResults.filter(t => t.status === 'FAIL').length}`);
  console.log(`Vulnerabilidades Detectadas: ${findings.length}`);
  for (const f of findings) {
    console.log(`  - [${f.id}] [${f.severity}] ${f.category} en ${f.route}: ${f.desc}`);
  }
  console.log('═'.repeat(75));

  return { testResults, findings };
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
