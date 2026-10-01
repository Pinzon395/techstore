const BASE_URL = process.argv[2] || 'https://pixon-cloud.luispinzon395.workers.dev';

async function runTestSuite() {
  console.log('═'.repeat(70));
  console.log('🧪 PIXON PC — AUTOMATED CLOUD QA & GUARDRAIL VALIDATION SUITE');
  console.log(`Endpoint: ${BASE_URL}`);
  console.log('═'.repeat(70));

  let passed = 0;
  let failed = 0;

  async function assertTest(name, fn) {
    try {
      process.stdout.write(`Testing: ${name}... `);
      await fn();
      console.log('✅ PASS');
      passed++;
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      failed++;
    }
  }

  // Helper for fetch with detailed error reporting
  async function checkedFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return res;
  }

  // 1. Health check
  await assertTest('Health check (/api/health)', async () => {
    const res = await checkedFetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (!data.ok || data.service !== 'pixon-api') throw new Error(`Unexpected payload: ${JSON.stringify(data)}`);
  });

  // 2. Hyperdrive Dual Pool (Fresh vs Cached)
  await assertTest('Dual Hyperdrive Connection (Fresh vs Cached)', async () => {
    const res = await checkedFetch(`${BASE_URL}/api/qa/fresh-vs-cached`);
    const data = await res.json();
    if (!data.ok || data.status !== 'PASS') throw new Error(`Hyperdrive test failed: ${JSON.stringify(data)}`);
    console.log(`\n   [Fresh Latency: ${data.fresh.latency_ms}ms | Cached Latency: ${data.cached.latency_ms}ms]`);
  });

  // 3. Comments read (via HYPERDRIVE_CACHED)
  await assertTest('Comments catalog read (/api/comments)', async () => {
    const res = await checkedFetch(`${BASE_URL}/api/comments?limit=5`);
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.data)) throw new Error('Invalid comments payload');
  });

  // 4. Appointments availability (via HYPERDRIVE_FRESH)
  await assertTest('Appointment availability (/api/appointments/availability)', async () => {
    const res = await checkedFetch(`${BASE_URL}/api/appointments/availability?date=2026-10-05`);
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.slots) || data.slots.length === 0) {
      throw new Error('Availability slots invalid');
    }
  });

  // 5. Ticket creation & Read-After-Write (via HYPERDRIVE_FRESH)
  let generatedTicketCode = null;
  await assertTest('Ticket Write & Immediate Read-After-Write (/api/tickets)', async () => {
    const payload = {
      name: 'QA Cloud Test User',
      email: 'qa.test@pixon.com.mx',
      phone: '9981234567',
      device_type: 'laptop',
      device_brand: 'Lenovo',
      device_model: 'ThinkPad T14',
      reported_issue: 'Test ticket for Cloudflare Hyperdrive migration validation',
    };
    const res = await checkedFetch(`${BASE_URL}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok || !data.ticket_code || !data.ticket) throw new Error(`Invalid ticket response: ${JSON.stringify(data)}`);
    generatedTicketCode = data.ticket_code;
    console.log(`\n   [Created Ticket: ${generatedTicketCode} | Status: ${data.ticket.status}]`);
  });

  // 6. Cron Atomic Idempotency & CPU measurement (<10ms)
  await assertTest('Cron Idempotency & CPU Bound (<10ms)', async () => {
    const testKey = `qa_cron_test_${Date.now()}`;
    // Call 1: Must execute and succeed
    const res1 = await checkedFetch(`${BASE_URL}/api/qa/trigger-email-outbox?key=${testKey}`, { method: 'POST' });
    const data1 = await res1.json();
    console.log(`\n   [Call 1: Result = ${JSON.stringify(data1.result)}]`);
    if (!data1.result?.success) throw new Error(`Call 1 did not execute: ${JSON.stringify(data1)}`);
    const cpuMs = parseFloat(data1.result.result?.cpuTimeMs || '0');
    if (cpuMs > 10) throw new Error(`CPU time ${cpuMs}ms exceeds 10ms budget!`);

    // Call 2 with identical key: Must be rejected by atomic claim in job_runs
    const res2 = await checkedFetch(`${BASE_URL}/api/qa/trigger-email-outbox?key=${testKey}`, { method: 'POST' });
    const data2 = await res2.json();
    console.log(`   [Call 2 (Idempotency): ${JSON.stringify(data2.result)}]`);

    if (!data2.result?.skipped || data2.result?.reason !== 'ALREADY_CLAIMED') {
      throw new Error(`Expected ALREADY_CLAIMED atomic idempotency, got: ${JSON.stringify(data2)}`);
    }
  });

  console.log('\n' + '═'.repeat(70));
  console.log(`QA RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('═'.repeat(70));

  if (failed > 0) process.exit(1);
}

runTestSuite().catch(err => {
  console.error('QA Suite unexpected error:', err);
  process.exit(1);
});
