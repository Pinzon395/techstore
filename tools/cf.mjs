import fs from 'node:fs';
import { execSync } from 'node:child_process';

const env = {};
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
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
}

const args = process.argv.slice(2).join(' ');
if (!args) {
  console.log('Usage: node tools/cf.mjs <wrangler command>');
  process.exit(1);
}

try {
  const cmd = `npx wrangler ${args}`;
  console.log(`> ${cmd}`);
  const runEnv = {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID || '8a2415a28b0e77c6758409a4d60812e7',
  };
  if (env.CLOUDFLARE_API_KEY && env.CLOUDFLARE_EMAIL) {
    runEnv.CLOUDFLARE_API_KEY = env.CLOUDFLARE_API_KEY;
    runEnv.CLOUDFLARE_EMAIL = env.CLOUDFLARE_EMAIL;
    delete runEnv.CLOUDFLARE_API_TOKEN;
  } else if (env.CLOUDFLARE_API_TOKEN) {
    runEnv.CLOUDFLARE_API_TOKEN = env.CLOUDFLARE_API_TOKEN;
  }

  const out = execSync(cmd, { env: runEnv, encoding: 'utf8' });
  console.log(out);
} catch (err) {
  console.error('Command failed:');
  if (err.stdout) console.log(err.stdout);
  if (err.stderr) console.error(err.stderr);
  process.exit(1);
}
