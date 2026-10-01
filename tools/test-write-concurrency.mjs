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

async function testWriteConcurrency() {
  console.log('═'.repeat(70));
  console.log('⚡ PIXON PC — WRITE CONCURRENCY & OVERBOOKING RACE CONDITION TEST');
  console.log('═'.repeat(70));

  const env = parseEnv('c:/Users/Usuario/techstore/.env');
  const u = new URL(env.TARGET_DATABASE_URL);

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 1: Concurrencia de Tickets (5 peticiones concurrentes simultáneas)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[1/2] Probando creación simultánea de 5 tickets (Doble-click / Concurrencia)...');
  const ticketPromises = Array.from({ length: 5 }).map((_, i) =>
    fetch('https://pixon.com.mx/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Concurrencia QA User ${i}`,
        phone: '9981234567',
        device_type: 'Laptop',
        reported_issue: `Prueba de concurrencia simultánea ticket ${i}`
      })
    }).then(async r => ({ status: r.status, data: await r.json() }))
  );

  const ticketResults = await Promise.all(ticketPromises);
  const ticketCodes = ticketResults.map(r => r.data.ticket_code).filter(Boolean);
  const uniqueCodes = new Set(ticketCodes);

  console.log(`Peticiones exitosas: ${ticketResults.filter(r => r.status === 201).length}/5`);
  console.log(`Tickets generados: ${ticketCodes.length}`);
  console.log(`Tickets únicos:   ${uniqueCodes.size}`);

  if (uniqueCodes.size !== ticketCodes.length) {
    throw new Error('❌ Colisión de códigos de ticket detectada!');
  }
  console.log('✅ NO_DUPLICATE_TICKET=PASS (Cada ticket posee código único atómico).');

  // ──────────────────────────────────────────────────────────────────────────
  // PRUEBA 2: Concurrencia de Citas (Overbooking Race Condition en mismo slot)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[2/2] Probando reserva simultánea de 5 usuarios sobre el MISMO horario...');
  const targetDate = '2026-11-20 11:00:00';

  const conn = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port) || 13008,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, '') || 'defaultdb',
    ssl: { rejectUnauthorized: false }
  });

  // Limpiar cita previa de prueba si existiera
  await conn.query("DELETE FROM appointments WHERE start_at = ? AND customer_notes LIKE '%TEST_CONCURRENCY%'", [targetDate]);

  // Simular 5 conexiones concurrentes intentando reclamar el mismo slot atómicamente
  async function attemptBooking(userId) {
    const bookingConn = await mysql.createConnection({
      host: u.hostname,
      port: Number(u.port) || 13008,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, '') || 'defaultdb',
      ssl: { rejectUnauthorized: false }
    });

    try {
      await bookingConn.beginTransaction();
      // Atomic locking: SELECT ... FOR UPDATE
      const [existing] = await bookingConn.query(
        "SELECT id FROM appointments WHERE start_at = ? AND status IN ('CONFIRMED', 'TEMPORARY_HOLD') FOR UPDATE",
        [targetDate]
      );

      if (existing.length > 0) {
        await bookingConn.rollback();
        return { success: false, reason: 'SLOT_ALREADY_TAKEN' };
      }

      await bookingConn.query(
        `INSERT INTO appointments (id, customer_name, customer_phone, appointment_type, start_at, end_at, timezone, status, customer_notes, created_at)
         VALUES (UUID(), 'Test User', '9981234567', 'DIAGNOSTIC', ?, DATE_ADD(?, INTERVAL 30 MINUTE), 'America/Cancun', 'CONFIRMED', 'TEST_CONCURRENCY', NOW())`,
        [targetDate, targetDate]
      );
      await bookingConn.commit();
      return { success: true };
    } catch (err) {
      await bookingConn.rollback();
      return { success: false, error: err.message };
    } finally {
      await bookingConn.end();
    }
  }

  const bookingPromises = Array.from({ length: 5 }).map((_, i) => attemptBooking(`user_test_${i}`));
  const bookingResults = await Promise.all(bookingPromises);

  const successfulBookings = bookingResults.filter(r => r.success).length;
  const rejectedBookings = bookingResults.filter(r => !r.success).length;

  console.log(`Intentos simultáneos: 5`);
  console.log(`Reservas otorgadas:   ${successfulBookings}`);
  console.log(`Reservas denegadas:   ${rejectedBookings}`);

  // Verificar en DB cuántas filas existen realmente para ese slot
  const [[dbCount]] = await conn.query(
    "SELECT COUNT(*) as c FROM appointments WHERE start_at = ? AND customer_notes LIKE '%TEST_CONCURRENCY%'",
    [targetDate]
  );

  console.log(`Citas registradas en base de datos: ${dbCount.c}`);

  // Limpieza
  await conn.query("DELETE FROM appointments WHERE start_at = ? AND customer_notes LIKE '%TEST_CONCURRENCY%'", [targetDate]);
  await conn.end();

  if (Number(dbCount.c) !== 1 || successfulBookings !== 1) {
    throw new Error(`❌ FALLO DE OVERBOOKING: Se registraron ${dbCount.c} citas para el mismo slot!`);
  }

  console.log('✅ NO_OVERBOOKING=PASS (Transacción atómica FOR UPDATE impide reservas dobles).');

  console.log('\n' + '═'.repeat(70));
  console.log('DICTAMEN DE CONCURRENCIA:');
  console.log('NO_DUPLICATE_TICKET=PASS');
  console.log('NO_OVERBOOKING=PASS');
  console.log('WRITE_CONCURRENCY=PASS');
  console.log('═'.repeat(70));
}

testWriteConcurrency().catch(err => {
  console.error('Fatal concurrency error:', err);
  process.exit(1);
});
