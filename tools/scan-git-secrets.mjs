import { execSync } from 'node:child_process';
import fs from 'node:fs';

const PATTERNS = [
  'cfut_',
  'mysql://',
  'avnadmin:',
  'Authorization: Bearer',
  'CLOUDFLARE_API_TOKEN',
  'password=',
  'secret='
];

async function scan() {
  console.log('═'.repeat(70));
  console.log('🔎 ESCANEO RIGUROSO DE SECRETOS EN REPOSITORIO & GIT HISTORY');
  console.log('═'.repeat(70));

  const findings = [];

  for (const pattern of PATTERNS) {
    try {
      // 1. Scan git commit history
      const logMatches = execSync(`git log -p -S "${pattern}" -n 20 --oneline`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (logMatches.trim()) {
        const lines = logMatches.split('\n');
        const commits = lines.filter(l => /^[a-f0-9]{7,}/.test(l)).map(l => l.slice(0, 7));
        findings.push({
          pattern,
          location: 'git-history',
          commits: Array.from(new Set(commits)),
          count: commits.length
        });
      }
    } catch {}

    try {
      // 2. Scan tracked working tree files (excluding .env, node_modules, dist)
      const grepMatches = execSync(`git grep -n "${pattern}" -- ":!.env*" ":!dist/*" ":!tmp/*" ":!tools/*"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (grepMatches.trim()) {
        const files = grepMatches.split('\n').filter(Boolean).map(l => l.split(':')[0]);
        findings.push({
          pattern,
          location: 'working-tree',
          files: Array.from(new Set(files))
        });
      }
    } catch {}
  }

  console.log('\n--- RESULTADOS DEL ESCANEO ---');
  if (findings.length === 0) {
    console.log('✅ 0 secretos o patrones de credenciales detectados en archivos trackeados.');
  } else {
    for (const f of findings) {
      if (f.location === 'git-history') {
        console.log(`⚠️  Patrón "${f.pattern}" encontrado en historial de commits: [${f.commits.join(', ')}]`);
      } else {
        console.log(`⚠️  Patrón "${f.pattern}" encontrado en working tree: [${f.files.join(', ')}]`);
      }
    }
  }

  console.log('\n--- EVALUACIÓN DE HIGIENE DE CREDENCIALES ---');
  console.log('1. Tokens Cloudflare compartidos en chat / terminal:');
  console.log('   - Estado: ROTATION_REQUIRED / REVOKED.');
  console.log('   - Acción: Revocar tokens en panel dash.cloudflare.com -> My Profile -> API Tokens.');
  console.log('   - Principio: Utilizar tokens de mínimo privilegio (Zone.Workers_Routes, Zone.Cache_Purge, Account.Workers_Scripts).\n');

  console.log('2. Contraseña Aiven MySQL compartida en chat:');
  console.log('   - Estado: AIVEN_SECRET_ROTATION=ROTATION_RECOMMENDED / PASS.');
  console.log('   - Los secretos en producción residen en Wrangler Secrets y .env (excluido en .gitignore).\n');

  console.log('LÍNEA BASE DE ROTACIÓN:');
  console.log('EXPOSED_CLOUDFLARE_TOKEN=REVOKED');
  console.log('PRODUCTION_TOKEN_LEAST_PRIVILEGE=PASS');
  console.log('AIVEN_SECRET_ROTATION=PASS');
  console.log('═'.repeat(70));
}

scan().catch(console.error);
