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

async function inspectDns() {
  const env = parseEnv('C:/Users/Usuario/techstore/.env');
  const headers = {
    'X-Auth-Email': env.CLOUDFLARE_EMAIL,
    'X-Auth-Key': env.CLOUDFLARE_API_KEY,
    'Content-Type': 'application/json'
  };

  // 1. Get Zone ID for pixon.com.mx
  const zRes = await fetch('https://api.cloudflare.com/client/v4/zones?name=pixon.com.mx', { headers });
  const zData = await zRes.json();
  if (!zData.success || !zData.result?.length) {
    console.log('No zone found for pixon.com.mx or not accessible.');
    return;
  }

  const zone = zData.result[0];
  console.log(`Zone: ${zone.name} (ID: ${zone.id}, Status: ${zone.status})`);

  // 2. List DNS records
  const dRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records`, { headers });
  const dData = await dRes.json();
  if (dData.success) {
    console.log('\nDNS Records:');
    for (const r of dData.result) {
      console.log(`- ${r.type.padEnd(6)} ${r.name.padEnd(30)} -> ${r.content} (proxied: ${r.proxied})`);
    }
  }

  // 3. List Worker routes
  const rRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/workers/routes`, { headers });
  const rData = await rRes.json();
  console.log('\nWorker Routes:');
  if (rData.success && rData.result?.length) {
    for (const route of rData.result) {
      console.log(`- Pattern: ${route.pattern} -> Script: ${route.script || '(none)'} (ID: ${route.id})`);
    }
  } else {
    console.log('No worker routes found.');
  }
}

inspectDns().catch(console.error);
