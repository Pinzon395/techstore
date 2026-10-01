async function testEndpoints() {
  const base = 'https://pixon-cloud.luispinzon395.workers.dev';

  console.log('--- 1. Testing /api/comments ---');
  const r1 = await fetch(`${base}/api/comments`);
  console.log('Comments status:', r1.status);
  console.log('Comments body:', await r1.text());

  console.log('\n--- 2. Testing /api/tickets ---');
  const payload = {
    name: 'QA Cloud Test User',
    email: 'qa.test@pixon.com.mx',
    phone: '9981234567',
    device_type: 'laptop',
    device_brand: 'Lenovo',
    device_model: 'ThinkPad T14',
    reported_issue: 'Test ticket for Cloudflare Hyperdrive migration validation',
  };
  const r2 = await fetch(`${base}/api/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  console.log('Tickets status:', r2.status);
  console.log('Tickets body:', await r2.text());

  console.log('\n--- 3. Testing /api/qa/trigger-email-outbox ---');
  const r3 = await fetch(`${base}/api/qa/trigger-email-outbox`, { method: 'POST' });
  console.log('Cron status:', r3.status);
  console.log('Cron body:', await r3.text());
}

testEndpoints().catch(console.error);
