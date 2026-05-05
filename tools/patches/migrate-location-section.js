/**
 * tools/patches/migrate-location-section.js
 *
 * Reemplaza las secciones de ubicación dispersas (varios formatos) por un
 * único placeholder <div id="location-placeholder"></div> y carga el
 * componente compartido components/location-section.js.
 *
 * Patrones que reconoce y reemplaza (en este orden):
 *   1. <section ... id="ubicacion-*">…</section>            (estandalone)
 *   2. <div class="map-container">…</div>                   (anidado en contact)
 *   3. <div class="map-wrapper">…</div>  + iframe Google Maps (forma libre)
 *
 * Uso: node tools/patches/migrate-location-section.js
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const PAGES = [
    'index.html',
    'pages/info/catalogo.html',
    'pages/info/comentarios.html',
    'pages/info/contacto.html',
    'pages/servicios/mantenimiento-mac.html',
    'pages/servicios/ensambles.html',
    'pages/servicios/paquetes.html',
    'pages/servicios/reparacion-bisagras.html',
    'pages/servicios/reparacion-controles.html',
    'pages/servicios/reparaciones.html',
    'pages/servicios/limpieza-laptop-liquido.html',
];

const PLACEHOLDER = '    <!-- ═══ UBICACIÓN (cargada desde componente compartido) ═══ -->\n    <div id="location-placeholder"></div>';
const SCRIPT_TAG = '    <script type="module" src="/components/location-section.js"></script>';

// 1) Sección estandalone <section ... id="ubicacion-*">…</section>
const SECTION_RE = /[ \t]*<!--[^\n]*UBICACI[ÓO]N[^\n]*-->\s*\n\s*<section[^>]*id="ubicacion-[^"]+"[\s\S]*?<\/section>\s*\n/i;
const SECTION_RE_NO_COMMENT = /[ \t]*<section[^>]*id="ubicacion-[^"]+"[\s\S]*?<\/section>\s*\n/;

// 2) Bloque <div class="map-container"> con iframe maps
const MAP_CONTAINER_RE = /[ \t]*<!--[^\n]*ÁREA DE COBERTURA[^\n]*-->\s*\n\s*<div class="map-container">[\s\S]*?<\/div>\s*<\/div>\s*\n/i;
const MAP_CONTAINER_RE_NO_COMMENT = /[ \t]*<div class="map-container">[\s\S]*?<iframe[\s\S]*?google\.com\/maps[\s\S]*?<\/iframe>\s*<\/div>\s*<\/div>\s*\n/;

let totalChanged = 0;
let totalSkipped = 0;

for (const rel of PAGES) {
    const file = resolve(ROOT, rel);
    let html;
    try {
        html = readFileSync(file, 'utf8');
    } catch (e) {
        console.log(`  ✗ ${rel}: ${e.message}`);
        continue;
    }

    let changed = false;
    let pattern = '';

    // Skip pages que ya tienen placeholder
    if (html.includes('id="location-placeholder"')) {
        console.log(`  · ${rel} (ya tiene placeholder)`);
        totalSkipped++;
        continue;
    }

    // Intento 1: sección estandalone con comentario
    if (SECTION_RE.test(html)) {
        html = html.replace(SECTION_RE, PLACEHOLDER + '\n\n');
        pattern = 'section+comment';
        changed = true;
    }
    // Intento 2: sección estandalone sin comentario
    else if (SECTION_RE_NO_COMMENT.test(html)) {
        html = html.replace(SECTION_RE_NO_COMMENT, PLACEHOLDER + '\n\n');
        pattern = 'section';
        changed = true;
    }
    // Intento 3: map-container con comentario
    else if (MAP_CONTAINER_RE.test(html)) {
        html = html.replace(MAP_CONTAINER_RE, PLACEHOLDER + '\n');
        pattern = 'map-container+comment';
        changed = true;
    }
    // Intento 4: map-container sin comentario
    else if (MAP_CONTAINER_RE_NO_COMMENT.test(html)) {
        html = html.replace(MAP_CONTAINER_RE_NO_COMMENT, PLACEHOLDER + '\n');
        pattern = 'map-container';
        changed = true;
    }

    // Asegurar que el script del componente esté cargado
    if (changed && !html.includes('/components/location-section.js')) {
        if (html.includes('</body>')) {
            html = html.replace('</body>', `${SCRIPT_TAG}\n</body>`);
        }
    }

    if (changed) {
        writeFileSync(file, html, 'utf8');
        console.log(`  ✓ ${rel} (${pattern})`);
        totalChanged++;
    } else {
        console.log(`  ⚠ ${rel} (no se encontró patrón conocido — revisa manual)`);
        totalSkipped++;
    }
}

console.log(`\nListo: ${totalChanged} archivos migrados, ${totalSkipped} sin cambios.`);
