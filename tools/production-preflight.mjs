#!/usr/bin/env node
// Preflight de producción (Hostinger Node.js). Uso:
//   node tools/production-preflight.mjs            → valida el árbol versionado (git ls-files)
//   node tools/production-preflight.mjs --dir <x>  → valida una carpeta extraída del ZIP
//   node tools/production-preflight.mjs --env-file <f> → además valida el esquema de variables
// Sale con código 1 si algún check falla. Nunca imprime valores secretos.
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { listFiles, scanFiles, loadLocalSecretValues } from './lib/secret-scan.mjs';

const args = process.argv.slice(2);
const argValue = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const root = path.resolve(argValue('--dir') || repoRoot);
const fromGit = !argValue('--dir');

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });

// 1. Archivos requeridos
const files = fromGit
    ? execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean)
    : listFiles(root);
const fileSet = new Set(files);
const required = ['package.json', 'package-lock.json', '.nvmrc', '.env.example', 'astro.config.ts',
    'server/server.js', 'server/database.js', 'server/db/connection.js', 'server/routes/health.routes.js',
    'tools/generate-version.mjs', '.release-commit'];
const missing = required.filter((f) => !fileSet.has(f));
check('required-files', !missing.length, missing.join(', '));
check('runtime-dirs', ['src/', 'public/', 'server/'].every((d) => files.some((f) => f.startsWith(d))));

// 2. Scripts + engines
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
check('script-build', /astro build/.test(pkg.scripts?.build || ''), pkg.scripts?.build ? '' : 'falta scripts.build');
check('script-start', pkg.scripts?.start === 'node server/server.js', pkg.scripts?.start || 'falta scripts.start');
const nvmrc = existsSync(path.join(root, '.nvmrc')) ? readFileSync(path.join(root, '.nvmrc'), 'utf8').trim() : '';
const major = Number(nvmrc.split('.')[0]);
check('node-engine', /^>=20/.test(pkg.engines?.node || '') && [20, 22].includes(major), `engines=${pkg.engines?.node} .nvmrc=${nvmrc}`);
check('lockfile-version', JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8')).lockfileVersion >= 2);

// 3. Contenido prohibido en el release
const prohibited = files.filter((f) =>
    /(^|\/)node_modules\//.test(f) ||
    (/(^|\/)\.env(\.[^/]*)?$/.test(f) && !/\.example$/.test(f)) ||
    (/\.sql$/i.test(f) && !/^server\/sql\//.test(f)) ||
    /\.(pixonbak|zip|tar\.gz|tgz|log|pem|key|p12|sqlite3?|db)$/i.test(f) ||
    /^(backups|logs|tmp|test-results|scratch|dist)\//.test(f) ||
    /^server\/storage\/(?!\.gitkeep$)/.test(f)
);
check('no-prohibited-files', !prohibited.length, prohibited.slice(0, 10).join(', ') + (prohibited.length > 10 ? ` (+${prohibited.length - 10})` : ''));

// 4. URLs no productivas en código runtime servidor/cliente
const runtimeFiles = files.filter((f) => /^(src|server|public)\//.test(f) && /\.(m?js|cjs|ts|astro|json|html)$/.test(f) && !/(\/tests?\/|\.test\.|monitor\.js$|_legacy_sqlite|migrate-to-mariadb)/.test(f));
const badUrl = /(https?:\/\/(?:127\.0\.0\.1|192\.168\.\d+\.\d+)[:/]|[a-z0-9-]+\.workers\.dev|trycloudflare\.com|aivencloud\.com|\bhyperdrive\b)/i;
const urlHits = runtimeFiles.filter((f) => { try { return badUrl.test(readFileSync(path.join(root, f), 'utf8')); } catch { return false; } });
check('no-prohibited-urls', !urlHits.length, urlHits.join(', '));
const winPath = runtimeFiles.filter((f) => f.startsWith('server/') && /['"`][A-Za-z]:\\\\/.test(readFileSync(path.join(root, f), 'utf8')));
check('no-windows-paths', !winPath.length, winPath.join(', '));

// 5. Secretos
const findings = scanFiles(root, files, {
    literalValues: loadLocalSecretValues(repoRoot),
    ignore: [/^tools\/lib\/secret-scan\.mjs$/]
});
check('no-secrets', !findings.length, findings.map((f) => `${f.file}:${f.type}`).join(', '));

// 6. Esquema de variables (.env.example documenta las críticas)
const REQUIRED_ENV = ['NODE_ENV', 'PORT', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SESSION_SECRET',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL', 'RESEND_API_KEY', 'APP_URL', 'PUBLIC_SITE_URL', 'DATA_DIR'];
const example = readFileSync(path.join(root, '.env.example'), 'utf8');
const undocumented = REQUIRED_ENV.filter((k) => !new RegExp(`^#?\\s*${k}=`, 'm').test(example));
check('env-schema-documented', !undocumented.length, undocumented.join(', '));
const envFile = argValue('--env-file');
if (envFile) {
    const env = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/)
        .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
    const missingEnv = REQUIRED_ENV.filter((k) => !env[k]);
    check('env-file-complete', !missingEnv.length, missingEnv.join(', '));
    check('env-session-secret-length', (env.SESSION_SECRET || '').length >= 32, 'SESSION_SECRET < 32');
    check('env-callback-production', /^https:\/\/pixon\.com\.mx\/auth\/google\/callback$/.test(env.GOOGLE_CALLBACK_URL || ''), 'GOOGLE_CALLBACK_URL');
    check('env-node-env', env.NODE_ENV === 'production', `NODE_ENV=${env.NODE_ENV}`);
}

// 7. Build readiness (opcional tras npm run build)
if (args.includes('--require-dist')) {
    const need = ['dist/index.html', 'dist/404.html', 'dist/sitemap.xml', 'dist/version.json', 'dist/optimizacion.html',
        'dist/servicios/telefono/celular-mojado.html', 'dist/servicios/telefono/reparacion-humedad-iphone.html'];
    const absent = need.filter((f) => !existsSync(path.join(root, f)));
    check('dist-ready', !absent.length, absent.join(', '));
}

let failed = 0;
for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok || !r.detail ? '' : `  → ${r.detail}`}`);
}
console.log(`\nPREFLIGHT=${failed ? 'FAIL' : 'PASS'} (${results.length - failed}/${results.length})`);
process.exit(failed ? 1 : 0);
