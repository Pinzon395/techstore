#!/usr/bin/env node
/**
 * deploy-cloudflare.mjs
 * Pipeline de deploy atómico: BUILD → VERSION COMMIT → CLOUDFLARE → VERIFY
 *
 * Uso:
 *   node tools/deploy-cloudflare.mjs
 *   node tools/deploy-cloudflare.mjs --skip-verify   (build+deploy sin verify post)
 *   node tools/deploy-cloudflare.mjs --dry-run        (solo build, no deploy ni commit)
 *
 * Prerrequisitos:
 *   - wrangler autenticado (npx wrangler login)
 *   - Variables de entorno en Cloudflare configuradas
 *
 * Arquitectura de versioning:
 *   npm run build ejecuta generate-version.mjs, que modifica:
 *     public/sw.js, public/version.json, public/cache-buster.js,
 *     public/scripts/pwa-register.js, src/layouts/Base.astro
 *   Estos cambios son artefactos de versión esperados. El pipeline los
 *   commitea automáticamente como "chore: version bump vXXX" antes del deploy.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const DRY_RUN    = process.argv.includes('--dry-run');
const SKIP_VERIFY = process.argv.includes('--skip-verify');

// Archivos modificados por generate-version.mjs — permitidos como "dirty" pre-build
// porque son artefactos del build anterior, no cambios de código del desarrollador.
const VERSION_FILES = [
  'public/sw.js',
  'public/version.json',
  'public/cache-buster.js',
  'public/scripts/pwa-register.js',
  'src/layouts/Base.astro',
];

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
    execSync(fullCmd, { stdio: 'inherit', shell: true, ...opts });
  } catch (e) {
    console.error(red(`\n✗ Comando falló: ${fullCmd}`));
    throw e;
  }
}

// ─── Inicio ─────────────────────────────────────────────────────────────────

console.log(`\n${bold('PIXON CLOUDFLARE DEPLOY PIPELINE')}`);
if (DRY_RUN) console.log(yellow('  Modo DRY-RUN: no se commitearán ni deployarán cambios'));
console.log('═'.repeat(60));

step(1, 'Pre-flight checks');

// Git: detectar cambios que NO sean archivos de versión generados por el build
try {
  const rawStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (rawStatus) {
    const lines = rawStatus.split('\n');
    const nonVersionChanges = lines.filter((line) => {
      // Formato: "XY filepath" — extraer la ruta (puede tener espacios iniciales)
      const filePath = line.slice(3).trim().replace(/^"(.*)"$/, '$1');
      return !VERSION_FILES.some((vf) => filePath === vf || filePath.endsWith(vf.replace(/\//g, '\\')));
    });

    if (nonVersionChanges.length > 0) {
      console.error(red('\n✗ Hay cambios de código sin commitear:'));
      console.error('  Haz git commit o git stash antes de desplegar.');
      console.error(nonVersionChanges.slice(0, 10).map((l) => `  ${l}`).join('\n'));
      process.exit(1);
    }

    if (lines.length > 0) {
      console.log(yellow(`  ! Archivos de versión del build anterior detectados (${lines.length} archivos) — se re-generarán`));
    }
  }
  console.log(green('  ✓ Working tree OK para deploy'));
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
if (!existsSync('dist/index.html')) {
  console.error(red('✗ dist/index.html no existe — el build falló'));
  process.exit(1);
}

// ─── Version bump commit ─────────────────────────────────────────────────────

step(3, 'Version bump commit');
if (DRY_RUN) {
  console.log(yellow('  [dry-run] Se omitiría: git add <version files> && git commit'));
} else {
  try {
    // Stagear solo los archivos de versión generados por el build
    const toStage = VERSION_FILES.filter((f) => existsSync(f));
    if (toStage.length > 0) {
      execSync(`git add ${toStage.map((f) => `"${f}"`).join(' ')}`, { shell: true });
      // Verificar si hay algo staged antes de commitear
      const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
      if (staged) {
        execSync(`git commit -m "chore: version bump ${version}"`, { shell: true, stdio: 'inherit' });
        console.log(green(`  ✓ Version bump commiteado: ${version}`));
      } else {
        console.log(yellow('  ! No hay cambios de versión que commitear (ya estaban staged o no cambiaron)'));
      }
    }
  } catch (e) {
    console.error(red(`  ✗ Error al commitear version bump: ${e.message}`));
    throw e;
  }
}

// ─── Deploy ─────────────────────────────────────────────────────────────────

if (DRY_RUN) {
  step(4, 'Deploy [OMITIDO — modo dry-run]');
  console.log(yellow('  Ejecuta sin --dry-run para desplegar a Cloudflare'));
} else {
  step(4, 'Deploy → Cloudflare Workers (wrangler deploy)');
  run('npx', ['wrangler', 'deploy']);
  console.log(green(`  ✓ Deploy enviado a Cloudflare. Build: ${version}`));
}

// ─── Verify ─────────────────────────────────────────────────────────────────

if (!SKIP_VERIFY && !DRY_RUN) {
  step(5, 'Post-deploy verification');
  console.log('  Esperando 5 segundos para propagación de CDN...');
  await new Promise((r) => setTimeout(r, 5000));
  run('node', ['tools/verify-production-deploy.mjs']);
} else {
  step(DRY_RUN ? 4 : 5, 'Verification [OMITIDA]');
  console.log(yellow('  Ejecuta manualmente: node tools/verify-production-deploy.mjs'));
}

// ─── Resumen ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
if (DRY_RUN) {
  console.log(yellow(bold('DRY RUN completado. Build local OK. No se desplegó nada.')));
} else {
  console.log(green(bold(`✓ DEPLOY COMPLETADO — Build: ${version}`)));
}
