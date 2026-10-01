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

async function updateHyperdrive() {
  const env = parseEnv('C:/Users/Usuario/techstore/.env');
  const targetUrl = env.TARGET_DATABASE_URL;
  if (!targetUrl) throw new Error('TARGET_DATABASE_URL missing');

  const u = new URL(targetUrl);
  const cleanConnStr = `mysql://${encodeURIComponent(u.username)}:${encodeURIComponent(u.password)}@${u.hostname}:${u.port || 13008}/${u.pathname.replace(/^\//, '') || 'defaultdb'}`;

  const runEnv = {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID || '8a2415a28b0e77c6758409a4d60812e7',
    CLOUDFLARE_API_KEY: env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_EMAIL: env.CLOUDFLARE_EMAIL
  };

  const freshId = env.HYPERDRIVE_FRESH_ID || '60f7f7cf1586446f8282986fb9d265c6';
  const cachedId = env.HYPERDRIVE_CACHED_ID || 'e5532c69dec94e09bfee0c814c057c72';

  console.log(`Updating HYPERDRIVE_FRESH (${freshId})...`);
  execSync(`npx wrangler hyperdrive update ${freshId} --connection-string="${cleanConnStr}" --caching-disabled --sslmode REQUIRED`, { env: runEnv, stdio: 'inherit' });

  console.log(`Updating HYPERDRIVE_CACHED (${cachedId})...`);
  execSync(`npx wrangler hyperdrive update ${cachedId} --connection-string="${cleanConnStr}" --max-age 60 --swr 30 --sslmode REQUIRED`, { env: runEnv, stdio: 'inherit' });

  console.log('✅ BOTH HYPERDRIVE CONFIGURATIONS UPDATED SUCCESSFULLY!');
}

updateHyperdrive().catch(err => {
  console.error('Update failed:', err.message);
  process.exit(1);
});
