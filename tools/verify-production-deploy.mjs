#!/usr/bin/env node
/**
 * verify-production-deploy.mjs
 * Verifica que el deploy de Cloudflare refleje el build local actual.
 *
 * Uso:
 *   node tools/verify-production-deploy.mjs
 *   node tools/verify-production-deploy.mjs --url https://pixon.com.mx
 *
 * Checks:
 *   1. /version.json  → versión local vs producción
 *   2. Headers X-Pixon-Build y X-Build-Timestamp presentes
 *   3. HTML de homepage no viene de caché viejo (Cache-Control)
 *   4. Service Worker se sirve con no-cache
 *   5. Páginas críticas devuelven HTTP 200
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = process.argv[2]?.startsWith('http')
  ? process.argv[2].replace(/\/$/, '')
  : 'https://pixon.com.mx';

// Leer versión local
const versionPath = resolve('dist/version.json');
let localVersion = null;
if (existsSync(versionPath)) {
  try {
    const data = JSON.parse(readFileSync(versionPath, 'utf8'));
    localVersion = data.version;
  } catch {
    localVersion = null;
  }
}

const CRITICAL_PAGES = [
  '/',
  '/servicios/telefono/reparacion-humedad-iphone',
  '/optimizacion',
  '/limpieza-laptop',
  '/reparaciones',
  '/tickets',
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function color(code, text) {
  return `\x1b[${code}m${text}\x1b[0m`;
}
const green = (t) => color('32', t);
const red   = (t) => color('31', t);
const yellow = (t) => color('33', t);
const bold  = (t) => color('1', t);

async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      redirect: 'follow',
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ─── Checks ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(label, detail = '') {
  passed++;
  console.log(`  ${green('✓')} ${label}${detail ? '  ' + yellow(detail) : ''}`);
}

function fail(label, detail = '') {
  failed++;
  console.log(`  ${red('✗')} ${bold(label)}${detail ? '  → ' + detail : ''}`);
}

function warn(label, detail = '') {
  warnings++;
  console.log(`  ${yellow('!')} ${label}${detail ? '  ' + detail : ''}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log(`\n${bold('PIXON DEPLOY VERIFIER')}`);
console.log(`Target: ${BASE_URL}`);
console.log(`Local build: ${localVersion ?? '(no dist/version.json)'}`);
console.log('─'.repeat(60));

// 1. Versión remota
console.log(`\n${bold('[1] Version sync')}`);
try {
  const res = await fetchWithTimeout(`${BASE_URL}/version.json`);
  if (!res.ok) {
    fail(`/version.json → HTTP ${res.status}`);
  } else {
    const data = await res.json();
    const remote = data.version ?? '?';
    if (!localVersion) {
      warn('No hay dist/version.json local. Ejecuta npm run build primero.');
    } else if (remote === localVersion) {
      pass(`Versión sincronizada: ${remote}`);
    } else {
      fail(
        `Versión DESINCRONIZADA`,
        `local=${localVersion}  producción=${remote}`
      );
    }
  }
} catch (e) {
  fail(`/version.json no accesible: ${e.message}`);
}

// 2. Headers de diagnóstico
console.log(`\n${bold('[2] Diagnostic headers')}`);
try {
  const res = await fetchWithTimeout(`${BASE_URL}/`);
  const xBuild = res.headers.get('x-pixon-build') ?? res.headers.get('x-build-id');
  const cf = res.headers.get('cf-cache-status');
  const cacheCtrl = res.headers.get('cache-control');

  if (xBuild) {
    pass(`X-Pixon-Build presente: ${xBuild}`);
  } else {
    warn('X-Pixon-Build header ausente (opcional pero útil para diagnóstico)');
  }

  if (cf) {
    const isHit = cf === 'HIT';
    if (isHit) {
      warn(`CF-Cache-Status: HIT (el HTML está siendo cacheado por Cloudflare)`);
    } else {
      pass(`CF-Cache-Status: ${cf}`);
    }
  }

  if (cacheCtrl) {
    if (cacheCtrl.includes('no-store') || cacheCtrl.includes('no-cache') || cacheCtrl.includes('max-age=0')) {
      pass(`Cache-Control HTML: ${cacheCtrl}`);
    } else if (cacheCtrl.includes('max-age')) {
      const match = cacheCtrl.match(/max-age=(\d+)/);
      const maxAge = match ? parseInt(match[1]) : 0;
      if (maxAge > 60) {
        fail(`Cache-Control HTML tiene max-age=${maxAge}s — riesgo de HTML viejo`, cacheCtrl);
      } else {
        pass(`Cache-Control HTML: ${cacheCtrl}`);
      }
    } else {
      warn(`Cache-Control: ${cacheCtrl}`);
    }
  }
} catch (e) {
  fail(`Error al verificar headers: ${e.message}`);
}

// 3. Service Worker no-cache
console.log(`\n${bold('[3] Service Worker cache headers')}`);
try {
  const res = await fetchWithTimeout(`${BASE_URL}/sw.js`);
  const cc = res.headers.get('cache-control') ?? '';
  if (res.ok) {
    if (cc.includes('no-store') || cc.includes('no-cache') || cc.includes('max-age=0')) {
      pass(`sw.js se sirve con no-cache: ${cc}`);
    } else {
      fail(`sw.js NO tiene cache-control adecuado`, `actual: "${cc}" — riesgo de SW viejo activo`);
    }
  } else {
    warn(`sw.js respondió HTTP ${res.status} (¿PWA desactivada?)`);
  }
} catch (e) {
  fail(`sw.js no accesible: ${e.message}`);
}

// 4. Páginas críticas
console.log(`\n${bold('[4] Critical pages (HTTP 200)')}`);
for (const path of CRITICAL_PAGES) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetchWithTimeout(url);
    if (res.status === 200) {
      pass(`${path}`);
    } else if (res.status === 301 || res.status === 302) {
      warn(`${path} → redirect ${res.status} → ${res.headers.get('location')}`);
    } else {
      fail(`${path} → HTTP ${res.status}`);
    }
  } catch (e) {
    fail(`${path} → ${e.message}`);
  }
}

// 5. Resumen
console.log('\n' + '─'.repeat(60));
console.log(bold('RESULTADO FINAL'));
console.log(`  ${green('PASS')}:     ${passed}`);
console.log(`  ${yellow('WARN')}:     ${warnings}`);
console.log(`  ${red('FAIL')}:     ${failed}`);

if (failed > 0) {
  console.log(`\n${red(bold('⚠ Deploy con problemas — revisar los FAIL anteriores.'))}`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n${yellow('Deploy funcional con advertencias.')}`);
  process.exit(0);
} else {
  console.log(`\n${green(bold('✓ Deploy verificado correctamente.'))}`);
  process.exit(0);
}
