/**
 * scripts/migrate-navbar.js
 *
 * Reemplaza el navbar inline (<nav class="navbar" id="navbar">…</nav>) en cada
 * página HTML del sitio por el placeholder del componente compartido:
 *
 *   <!-- ═══ NAVBAR (cargado desde componente compartido) ═══ -->
 *   <div id="nav-placeholder"></div>
 *
 * También garantiza que cada página cargue /components/navbar.js (lo inserta
 * justo antes de </body> si no está presente).
 *
 * Uso:
 *   node scripts/migrate-navbar.js
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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
];

const PLACEHOLDER = '    <!-- ═══ NAVBAR (cargado desde componente compartido) ═══ -->\n    <div id="nav-placeholder"></div>';
const NAV_RE = /[ \t]*<nav class="navbar" id="navbar">[\s\S]*?<\/nav>\s*\n/;
const SCRIPT_TAG = '    <script type="module" src="/components/navbar.js"></script>';

let totalChanged = 0;
let totalSkipped = 0;

for (const rel of PAGES) {
    const file = resolve(ROOT, rel);
    let html;
    try {
        html = readFileSync(file, 'utf8');
    } catch (e) {
        console.log(`  ✗ no se pudo leer ${rel}: ${e.message}`);
        continue;
    }

    let changed = false;

    // 1) Reemplazar navbar inline por placeholder
    if (NAV_RE.test(html)) {
        html = html.replace(NAV_RE, PLACEHOLDER + '\n\n');
        changed = true;
    }

    // 2) Asegurar el <script type="module" src="/components/navbar.js">
    if (!html.includes('/components/navbar.js')) {
        if (html.includes('</body>')) {
            html = html.replace('</body>', `${SCRIPT_TAG}\n</body>`);
            changed = true;
        }
    }

    if (changed) {
        writeFileSync(file, html, 'utf8');
        console.log(`  ✓ ${rel}`);
        totalChanged++;
    } else {
        console.log(`  · ${rel} (sin cambios)`);
        totalSkipped++;
    }
}

console.log(`\nListo: ${totalChanged} archivos modificados, ${totalSkipped} sin cambios.`);
