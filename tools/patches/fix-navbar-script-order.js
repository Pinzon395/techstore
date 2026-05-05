/**
 * tools/patches/fix-navbar-script-order.js
 *
 * Asegura que <script type="module" src="/components/navbar.js"> ejecute
 * ANTES de /scripts/script.js y /scripts/user-menu.js. Como type="module"
 * ejecuta en orden de aparición, basta con que el tag de navbar.js sea el
 * primero entre esos tres en cada página HTML.
 *
 * Bug que arregla:
 *   - El navbar se inyecta por JS. Si navbar.js corre AL FINAL, los scripts
 *     que vienen antes (script.js, user-menu.js) llaman getElementById('navbar')
 *     y obtienen null, por lo que:
 *        · auto-hide al scroll no funciona
 *        · hamburguesa móvil no responde
 *        · botón de Google nunca se pinta para usuarios anónimos
 *
 * Estrategia:
 *   - Quita cualquier <script type="module" src="/components/navbar.js"> existente
 *   - Inserta uno nuevo justo ANTES del primer <script type="module" src="/scripts/...">
 *
 * Uso: node tools/patches/fix-navbar-script-order.js
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const PAGES = [
    'index.html',
    '404.html',
    'pages/_template.html',
    'pages/servicios/b2b.html',
    'pages/servicios/reparaciones.html',
    'pages/servicios/paquetes.html',
    'pages/servicios/mantenimiento-mac.html',
    'pages/servicios/instalacion-windows.html',
    'pages/servicios/ensambles.html',
    'pages/servicios/reparacion-bisagras.html',
    'pages/servicios/reparacion-controles.html',
    'pages/servicios/optimizacion.html',
    'pages/legal/privacidad.html',
    'pages/legal/garantia.html',
    'pages/info/contacto.html',
    'pages/info/comentarios.html',
    'pages/info/catalogo.html',
    'pages/info/preguntas-frecuentes.html',
    'pages/servicios/limpieza-laptop-liquido.html',
    'pages/servicios/antisulfatacion.html',
];

// Tag canónico (sin defer/extra atributos para ser idempotente)
const NAVBAR_TAG = '<script type="module" src="/components/navbar.js"></script>';

// Cualquier <script ... src="/components/navbar.js" ...></script> existente
const NAVBAR_TAG_RE = /[ \t]*<script\s+[^>]*src=["']\/components\/navbar\.js["'][^>]*>\s*<\/script>\s*\n?/g;

// El primer <script ... src="/scripts/..."> (o user-menu) será el ancla
const ANCHOR_RE = /([ \t]*)<script\s+type=["']module["']\s+src=["']\/scripts\/[^"']+["'][^>]*>\s*<\/script>/;

let changed = 0;
let skipped = 0;

for (const rel of PAGES) {
    const file = resolve(ROOT, rel);
    let html;
    try {
        html = readFileSync(file, 'utf8');
    } catch (e) {
        console.log(`  ✗ ${rel}: ${e.message}`);
        continue;
    }

    // 1) eliminar tags existentes de navbar.js
    const cleaned = html.replace(NAVBAR_TAG_RE, '');

    // 2) insertar navbar.js antes del primer /scripts/* module
    const m = cleaned.match(ANCHOR_RE);
    if (!m) {
        console.log(`  · ${rel} (sin ancla /scripts/, salto)`);
        skipped++;
        continue;
    }
    const indent = m[1] || '    ';
    const insert = `${indent}${NAVBAR_TAG}\n${m[0]}`;
    const next = cleaned.replace(m[0], insert);

    if (next === html) {
        console.log(`  · ${rel} (sin cambios)`);
        skipped++;
        continue;
    }

    writeFileSync(file, next, 'utf8');
    console.log(`  ✓ ${rel}`);
    changed++;
}

console.log(`\nListo: ${changed} archivos arreglados, ${skipped} sin cambios.`);
