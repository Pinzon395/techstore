/**
 * tools/merge-astro-build.mjs
 *
 * Mergea dist-astro/ (output de Astro SSG) en dist/ (output de Vite).
 *
 * Estrategia:
 *  - Las páginas Astro (.html) sobrescriben las de Vite cuando coinciden
 *    de URL, porque ahora la fuente de verdad es src/pages/*.astro.
 *  - Los assets de Astro (_astro/, scripts emitidos) se copian alongside
 *    los de Vite sin pisarlos (hashes distintos).
 *  - Después limpia dist-astro/ para evitar confusión.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir   = path.join(__dirname, '..');
const astroDir  = path.join(rootDir, 'dist-astro');
const distDir   = path.join(rootDir, 'dist');

if (!fs.existsSync(astroDir)) {
  console.warn('[merge-astro] No existe dist-astro/, saltando merge.');
  process.exit(0);
}
if (!fs.existsSync(distDir)) {
  console.warn('[merge-astro] No existe dist/, creándolo.');
  fs.mkdirSync(distDir, { recursive: true });
}

let copied = 0;
let overwritten = 0;

function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
  } else {
    const existed = fs.existsSync(dst);
    fs.copyFileSync(src, dst);
    if (existed) overwritten++; else copied++;
  }
}

copyRecursive(astroDir, distDir);

// Limpia dist-astro/ para no dejar duplicado.
// En Windows a veces hay handles abiertos (esbuild, antivirus); reintentamos.
function tryRm(target, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      return true;
    } catch (err) {
      if (i === attempts - 1) {
        console.warn(`[merge-astro] No se pudo limpiar ${target}: ${err.message}`);
        return false;
      }
    }
  }
}
tryRm(astroDir);

// Copia assets/images y assets/logos sin hashear — las páginas Astro
// referencian /assets/images/foo.jpg directamente (no procesados por vite)
const staticAssetDirs = [
  ['assets/images', 'assets/images'],
  ['assets/logos',  'assets/logos'],
];
for (const [src, dst] of staticAssetDirs) {
  const srcPath = path.join(rootDir, src);
  const dstPath = path.join(distDir, dst);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, dstPath);
  }
}

console.log(`[merge-astro] ${copied} archivos nuevos, ${overwritten} sobrescritos.`);
console.log(`[merge-astro] dist-astro/ limpiado.`);
