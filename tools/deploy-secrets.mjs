import fs from 'node:fs';
import { spawn } from 'node:child_process';

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

function putSecret(key, val, runEnv) {
  return new Promise((resolve, reject) => {
    console.log(`Setting secret: ${key}...`);
    const proc = spawn('npx', ['wrangler', 'secret', 'put', key], {
      env: runEnv,
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: true
    });

    proc.stdin.write(val);
    proc.stdin.end();

    proc.on('close', code => {
      if (code === 0) {
        console.log(`✅ Secret ${key} set successfully!`);
        resolve();
      } else {
        reject(new Error(`Failed to set secret ${key} (code ${code})`));
      }
    });
  });
}

async function uploadSecrets() {
  const env = parseEnv('C:/Users/Usuario/techstore/.env');
  const runEnv = {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID || '8a2415a28b0e77c6758409a4d60812e7',
    CLOUDFLARE_API_KEY: env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_EMAIL: env.CLOUDFLARE_EMAIL
  };

  const secretsToSync = ['SESSION_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'RESEND_API_KEY'];
  for (const key of secretsToSync) {
    if (env[key]) {
      await putSecret(key, env[key], runEnv);
    } else {
      console.log(`⚠️ Secret ${key} not found in .env, skipping.`);
    }
  }
  console.log('All secrets configured.');
}

uploadSecrets().catch(err => {
  console.error('Upload secrets failed:', err.message);
  process.exit(1);
});
