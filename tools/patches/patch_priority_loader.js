/**
 * patch_priority_loader.js
 * ──────────────────────────────────────────────────────────────
 * Aplica en todas las páginas HTML del proyecto:
 *  1. Font Awesome cargado sin bloquear render (media=print trick)
 *  2. dns-prefetch para dominios externos frecuentes
 *  3. priority-loader.js inyectado antes del closing body tag
 *
 * PÁGINAS objetivo (las que aún no tienen los cambios):
 *   privacidad, preguntas-frecuentes, paquetes, garantia,
 *   formateo-optimizacion-computadoras-cancun, contacto,
 *   comentarios, catalogo, 404
 * ──────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PAGES = [
    'privacidad.html',
    'preguntas-frecuentes.html',
    'paquetes.html',
    'garantia.html',
    'formateo-optimizacion-computadoras-cancun.html',
    'contacto.html',
    'comentarios.html',
    'catalogo.html',
    '404.html',
];

const FA_BLOCKING = `href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">`;
const FA_NON_BLOCKING =
    `href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" media="print" onload="this.media='all'">\n    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></noscript>`;

// DNS-prefetch hints to inject after the last <link rel="preconnect"> block
const DNS_HINTS = `    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>\n    <link rel="dns-prefetch" href="//www.googletagmanager.com">\n    <link rel="dns-prefetch" href="//wa.me">\n    <link rel="dns-prefetch" href="//img.youtube.com">`;

// Script to inject before </body>
const PRIORITY_SCRIPT = `    <!-- ═══ Priority Loader — carga por zona de viewport ═══ -->\n    <script type="module" src="/scripts/priority-loader.js"></script>`;

let patched = 0;
let skipped = 0;

PAGES.forEach(page => {
    const filePath = join(process.cwd(), page);
    let html;
    try {
        html = readFileSync(filePath, 'utf8');
    } catch {
        console.warn(`⚠️  No encontrado: ${page}`);
        skipped++;
        return;
    }

    let changed = false;

    // 1. Font Awesome — cambiar a non-blocking (si no lo está ya)
    if (html.includes(FA_BLOCKING) && !html.includes('media="print"')) {
        html = html.replace(FA_BLOCKING, FA_NON_BLOCKING);
        changed = true;
    }

    // 2. DNS-prefetch — agregar después del último preconnect al CDN de fonts
    //    Buscamos la línea de preconnect a fonts.gstatic.com y añadimos después
    const preconnectFonts = '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
    if (html.includes(preconnectFonts) && !html.includes('dns-prefetch')) {
        html = html.replace(preconnectFonts, `${preconnectFonts}\n${DNS_HINTS}`);
        changed = true;
    }

    // 3. Priority Loader — inyectar antes del cierre de body (si no existe ya)
    if (!html.includes('priority-loader.js')) {
        // Insertar antes de la última etiqueta </body>
        html = html.replace(
            /(\s*<script type="module" src="\/components\/cookies\/CookieBanner\.js"><\/script>)/,
            `\n${PRIORITY_SCRIPT}$1`
        );
        // Fallback si no tiene el banner
        if (!html.includes('priority-loader.js')) {
            html = html.replace('</body>', `${PRIORITY_SCRIPT}\n</body>`);
        }
        changed = true;
    }

    if (changed) {
        writeFileSync(filePath, html, 'utf8');
        console.log(`✅ Parcheado: ${page}`);
        patched++;
    } else {
        console.log(`✔️  Ya OK:    ${page}`);
        skipped++;
    }
});

console.log(`\n📦 Resultado: ${patched} parcheados · ${skipped} sin cambios`);
