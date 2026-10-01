import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

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

async function testR2Backup() {
  console.log('═'.repeat(70));
  console.log('📦 PIXON PC — R2 OFFSITE BACKUP & RESTORE INTEGRITY TEST');
  console.log('═'.repeat(70));

  const env = parseEnv('C:/Users/Usuario/techstore/.env');
  const runEnv = {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID || '8a2415a28b0e77c6758409a4d60812e7',
    CLOUDFLARE_API_KEY: env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_EMAIL: env.CLOUDFLARE_EMAIL
  };

  const backupDir = 'C:/Users/Usuario/techstore/server/sql/backups';
  fs.mkdirSync(backupDir, { recursive: true });

  const backupKey = `backup-test-${Date.now()}.sql`;
  const localBackupPath = path.join(backupDir, backupKey);
  const sampleData = `-- Pixon PC Automated Backup Test\n-- Generated: ${new Date().toISOString()}\nSELECT 1;\n`;
  fs.writeFileSync(localBackupPath, sampleData, 'utf8');

  console.log(`[1/3] Uploading backup to R2 bucket 'pixon-backups': ${backupKey}...`);
  execSync(`npx wrangler r2 object put pixon-backups/${backupKey} --file="${localBackupPath}" --remote`, {
    env: runEnv,
    stdio: 'inherit'
  });
  console.log('✅ Upload to R2 successful!');

  console.log(`\n[2/3] Downloading backup from R2 bucket 'pixon-backups': ${backupKey}...`);
  const restoredPath = path.join(backupDir, `restored-${backupKey}`);
  execSync(`npx wrangler r2 object get pixon-backups/${backupKey} --file="${restoredPath}" --remote`, {
    env: runEnv,
    stdio: 'inherit'
  });
  console.log('✅ Download from R2 successful!');

  console.log('\n[3/3] Validating backup file integrity...');
  const restoredContent = fs.readFileSync(restoredPath, 'utf8');
  if (restoredContent === sampleData) {
    console.log('✅ Integrity check: 100% MATCH!');
  } else {
    throw new Error('Restored backup content does not match original!');
  }

  // Cleanup local test files
  fs.unlinkSync(localBackupPath);
  fs.unlinkSync(restoredPath);

  // Also test uploading full database schema dump to R2
  console.log('\n[4/4] Uploading full database schema to R2 pixon-backups/schema-latest.sql...');
  execSync(`npx wrangler r2 object put pixon-backups/schema-latest.sql --file="C:/Users/Usuario/techstore/server/sql/schema/schema-mysql8-complete.sql" --remote`, {
    env: runEnv,
    stdio: 'inherit'
  });
  console.log('✅ Full schema snapshot saved to R2 pixon-backups/schema-latest.sql!');

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 R2 BACKUP & RESTORE INTEGRITY: VERIFIED PASS!');
  console.log('═'.repeat(70));
}

testR2Backup().catch(err => {
  console.error('R2 backup test failed:', err);
  process.exit(1);
});
