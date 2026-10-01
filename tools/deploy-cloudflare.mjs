#!/usr/bin/env node
/**
 * deploy-cloudflare.mjs
 * Pipeline de deploy atómico: BUILD → CLOUDFLARE → VERIFY
 *
 * Uso:
 *   node tools/deploy-cloudflare.mjs
 *   node tools/deploy-cloudflare.mjs --skip-verify   (solo build+deploy)
 *   node tools/deploy-cloudflare.mjs --dry-run        (solo build, no deploy)
 *
 * Prerrequisitos:
 *   - wrangler autenticado (npx wrangler login)
 *   - Variables de entorno en Cloudflare correctamente configuradas
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_VERIFY = process.argv.includes('--skip-verify');

function color(code, text) { return `\x1b[${code}m${text}\x1b[0m`; }
const green  = (t) => color('32', t);
const red    = (t) => color('31', t);
const yellow = (t) => color('33', t);
const bold   = (t) => color('1', t);
const cyan   = (t) => color('36', t);

function step(n, title) {
  console.log(`\n${cyan(bold(`[STEP ${n}]`))} ${bold(title)}`);
}

function run(cmd, args = [], opts = {}) {
  const fullCmd = [cmd, ...args].join(' ');
  console.log(`  $ ${fullCmd}`);
  try {
    execSync(fullCmd, {
      stdio: 'inherit',
      shell: true,
      ...opts,
    });
  } catch (e) {
    console.error(red(`\n✗ Comando falló: ${fullCmd}`));
    throw e;
  }
}

// ─── Verificaciones previas ─────────────────────────────────────────────────

console.log(`\n${bold('PIXON CLOUDFLARE DEPLOY PIPELINE')}`);
if (DRY_RUN) console.log(yellow('  Modo DRY-RUN: no se ejecutará wrangler deploy'));
console.log('═'.repeat(60));

step(1, 'Pre-flight checks');

// Git: no debe haber cambios sin commitear
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (status) {
    console.error(red('\n✗ Hay cambios sin commitear en el repositorio.'));
    console.error('  Haz git commit o git stash antes de desplegar.');
    console.error(status.split('\n').slice(0, 10).map(l => `  ${l}`).join('\n'));
    process.exit(1);
  }
  console.log(green('  ✓ Working tree limpio'));
} catch {
  console.log(yellow('  ! No se pudo verificar git status — continuando'));
}

// wrangler.toml debe existir
if (!existsSync('wrangler.toml')) {
  console.error(red('✗ No se encontró wrangler.toml'));
  process.exit(1);
}
console.log(green('  ✓ wrangler.toml presente'));

// worker/index.js debe existir
if (!existsSync('worker/index.js')) {
  console.error(red('✗ No se encontró worker/index.js'));
  process.exit(1);
}
console.log(green('  ✓ worker/index.js presente'));

// ─── Build ──────────────────────────────────────────────────────────────────

step(2, 'Build (npm run build)');
run('npm', ['run', 'build']);

// Leer versión generada
let version = 'unknown';
const vp = resolve('dist/version.json');
if (existsSync(vp)) {
  try {
    version = JSON.parse(readFileSync(vp, 'utf8')).version;
    console.log(green(`  ✓ Build completado. Versión: ${version}`));
  } catch { /* ignore */ }
}

// Verificar que dist/ tenga contenido
const distOk = existsSync('dist/index.html');
if (!distOk) {
  console.error(red('✗ dist/index.html no existe — el build falló'));
  process.exit(1);
}

// ─── Deploy ─────────────────────────────────────────────────────────────────

if (DRY_RUN) {
  step(3, 'Deploy [OMITIDO — modo dry-run]');
  console.log(yellow('  Ejecuta sin --dry-run para desplegar a Cloudflare'));
} else {
  step(3, 'Deploy → Cloudflare Workers (wrangler deploy)');
  run('npx', ['wrangler', 'deploy', '--env', 'production'].filter(Boolean));
  console.log(green(`  ✓ Deploy enviado a Cloudflare. Build: ${version}`));
}

// ─── Verify ─────────────────────────────────────────────────────────────────

if (!SKIP_VERIFY && !DRY_RUN) {
  step(4, 'Post-deploy verification');
  // Esperar unos segundos para propagación de Cloudflare
  console.log('  Esperando 5 segundos para propagación de CDN...');
  await new Promise((r) => setTimeout(r, 5000));
  run('node', ['tools/verify-production-deploy.mjs']);
} else {
  step(4, 'Verification [OMITIDA]');
  console.log(yellow('  Ejecuta manualmente: node tools/verify-production-deploy.mjs'));
}

// ─── Resumen ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
if (DRY_RUN) {
  console.log(yellow(bold('DRY RUN completado. Build local OK. No se desplegó nada.')));
} else {
  console.log(green(bold(`✓ DEPLOY COMPLETADO — Build: ${version}`)));
}
