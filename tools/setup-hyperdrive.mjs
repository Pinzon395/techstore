import fs from 'node:fs';
import { execSync } from 'node:child_process';

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

async function setupHyperdrive() {
  const env = parseEnv('C:/Users/Usuario/techstore/.env');
  const targetUrl = env.TARGET_DATABASE_URL;
  if (!targetUrl) throw new Error('TARGET_DATABASE_URL missing');

  const u = new URL(targetUrl);
  // Construct clean connection string without query params for Hyperdrive
  const cleanConnStr = `mysql://${encodeURIComponent(u.username)}:${encodeURIComponent(u.password)}@${u.hostname}:${u.port || 13008}/${u.pathname.replace(/^\//, '') || 'defaultdb'}`;

  const runEnv = {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID || '8a2415a28b0e77c6758409a4d60812e7',
    CLOUDFLARE_API_KEY: env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_EMAIL: env.CLOUDFLARE_EMAIL
  };

  console.log('═'.repeat(70));
  console.log('🚀 PIXON PC — CREATING DUAL HYPERDRIVE CONFIGURATIONS');
  console.log('═'.repeat(70));

  // Check existing configs
  const listOut = execSync('npx wrangler hyperdrive list', { env: runEnv, encoding: 'utf8' });
  console.log('Current Hyperdrive configs:\n', listOut);

  // 1. Create HYPERDRIVE_FRESH (Caching completely disabled)
  let freshId = null;
  if (listOut.includes('pixon-fresh')) {
    console.log('ℹ️  pixon-fresh already exists.');
    const match = listOut.match(/([a-f0-9]{32})\s+pixon-fresh/);
    if (match) freshId = match[1];
  } else {
    console.log('\nCreating HYPERDRIVE_FRESH (caching disabled)...');
    const cmd = `npx wrangler hyperdrive create pixon-fresh --connection-string="${cleanConnStr}" --caching-disabled --sslmode REQUIRED`;
    const out = execSync(cmd, { env: runEnv, encoding: 'utf8' });
    console.log(out);
    const match = out.match(/([a-f0-9]{32})/);
    if (match) freshId = match[1];
  }

  // 2. Create HYPERDRIVE_CACHED (60s max-age, 30s swr)
  let cachedId = null;
  if (listOut.includes('pixon-cached')) {
    console.log('ℹ️  pixon-cached already exists.');
    const match = listOut.match(/([a-f0-9]{32})\s+pixon-cached/);
    if (match) cachedId = match[1];
  } else {
    console.log('\nCreating HYPERDRIVE_CACHED (max-age 60s, swr 30s)...');
    const cmd = `npx wrangler hyperdrive create pixon-cached --connection-string="${cleanConnStr}" --max-age 60 --swr 30 --sslmode REQUIRED`;
    const out = execSync(cmd, { env: runEnv, encoding: 'utf8' });
    console.log(out);
    const match = out.match(/([a-f0-9]{32})/);
    if (match) cachedId = match[1];
  }

  // If not parsed from output, list again to get exact IDs
  const finalList = execSync('npx wrangler hyperdrive list', { env: runEnv, encoding: 'utf8' });
  for (const line of finalList.split('\n')) {
    if (line.includes('pixon-fresh')) {
      const parts = line.trim().split(/\s+/);
      const idMatch = line.match(/[a-f0-9]{32}/);
      if (idMatch) freshId = idMatch[0];
    }
    if (line.includes('pixon-cached')) {
      const idMatch = line.match(/[a-f0-9]{32}/);
      if (idMatch) cachedId = idMatch[0];
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`HYPERDRIVE_FRESH ID:  ${freshId}`);
  console.log(`HYPERDRIVE_CACHED ID: ${cachedId}`);
  console.log('─'.repeat(70));

  // Save IDs to .env
  let envFile = fs.readFileSync('C:/Users/Usuario/techstore/.env', 'utf8');
  if (freshId && !envFile.includes('HYPERDRIVE_FRESH_ID=')) {
    envFile += `\nHYPERDRIVE_FRESH_ID="${freshId}"\n`;
  }
  if (cachedId && !envFile.includes('HYPERDRIVE_CACHED_ID=')) {
    envFile += `HYPERDRIVE_CACHED_ID="${cachedId}"\n`;
  }
  fs.writeFileSync('C:/Users/Usuario/techstore/.env', envFile, 'utf8');

  return { freshId, cachedId };
}

setupHyperdrive().catch(err => {
  console.error('Hyperdrive setup failed:', err.message);
  process.exit(1);
});
