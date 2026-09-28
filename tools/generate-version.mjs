import fs from 'fs';
import path from 'path';

// Genera una version unica basada en fecha/hora actual (ej: 20260912-034500)
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const version = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

console.log(`[version] Generando nueva versión del sitio: ${version}`);

// 1. Escribir version.json en public/ y dist/
const versionData = JSON.stringify({ version, builtAt: now.toISOString() }, null, 2);
fs.writeFileSync(path.resolve('public/version.json'), versionData, 'utf8');
if (fs.existsSync(path.resolve('dist'))) {
  fs.writeFileSync(path.resolve('dist/version.json'), versionData, 'utf8');
}

// 2. Actualizar public/cache-buster.js
const cacheBusterPath = path.resolve('public/cache-buster.js');
if (fs.existsSync(cacheBusterPath)) {
  let cb = fs.readFileSync(cacheBusterPath, 'utf8');
  cb = cb.replace(/var CURRENT_VERSION = '[^']+';/, `var CURRENT_VERSION = '${version}';`);
  fs.writeFileSync(cacheBusterPath, cb, 'utf8');
  console.log(`[version] Actualizado public/cache-buster.js -> ${version}`);
}

// 3. Actualizar public/sw.js
const swPath = path.resolve('public/sw.js');
if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, 'utf8');
  sw = sw.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'pixon-${version}';`);
  fs.writeFileSync(swPath, sw, 'utf8');
  console.log(`[version] Actualizado public/sw.js -> pixon-${version}`);
}

// 4. Actualizar public/scripts/pwa-register.js
const pwaPath = path.resolve('public/scripts/pwa-register.js');
if (fs.existsSync(pwaPath)) {
  let pwa = fs.readFileSync(pwaPath, 'utf8');
  pwa = pwa.replace(/\/sw\.js\?v=[^']+'/, `/sw.js?v=${version}'`);
  fs.writeFileSync(pwaPath, pwa, 'utf8');
  console.log(`[version] Actualizado public/scripts/pwa-register.js -> /sw.js?v=${version}`);
}

// 5. Actualizar src/layouts/Base.astro
const basePath = path.resolve('src/layouts/Base.astro');
if (fs.existsSync(basePath)) {
  let base = fs.readFileSync(basePath, 'utf8');
  base = base.replace(/\/cache-buster\.js\?v=[^"]+"/, `/cache-buster.js?v=${version}"`);
  base = base.replace(/\/scripts\/pwa-register\.js\?v=[^"]+"/, `/scripts/pwa-register.js?v=${version}"`);
  fs.writeFileSync(basePath, base, 'utf8');
  console.log(`[version] Actualizado src/layouts/Base.astro -> v=${version}`);
}

console.log(`[version] Versionado automatico completado con exito.`);
