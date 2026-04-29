/**
 * inject-smooth-scroll.js
 * Inyecta:
 *  1. Script bloqueador de hash en <head> (inline para que ejecute primero)
 *  2. Script de scroll suave antes de </body>
 */
const fs = require('fs');

const pages = [
    'reparaciones.html',
    'optimizacion.html',
    'reparacion-bisagras.html',
    'reparacion-controles.html',
    'ensambles.html',
];

// Script inline mínimo para el <head> — bloquea el scroll nativo inmediatamente
const headScript = `
    <!-- Pixon: bloquea scroll nativo al hash, para transición suave -->
    <script>if(location.hash){'scrollRestoration'in history&&(history.scrollRestoration='manual');scrollTo(0,0);}</script>`;

// Script al final del body
const bodyScript = `<script src="/components/smooth-scroll-nav.js"></script>`;

pages.forEach(pageName => {
    let html = fs.readFileSync(pageName, 'utf8');
    let changed = false;

    // 1. Agregar script en <head> (justo antes de </head>) si no existe
    if (!html.includes('bloquea scroll nativo al hash')) {
        html = html.replace('</head>', headScript + '\n</head>');
        changed = true;
        console.log(`[${pageName}] Head script injected`);
    } else {
        console.log(`[${pageName}] Head script already present`);
    }

    // 2. Verificar que el script del body esté (ya lo agregamos antes)
    if (!html.includes('smooth-scroll-nav.js')) {
        html = html.replace('</body>', bodyScript + '\n</body>');
        changed = true;
        console.log(`[${pageName}] Body script injected`);
    } else {
        console.log(`[${pageName}] Body script already present`);
    }

    if (changed) {
        fs.writeFileSync(pageName, html);
    }
});

console.log('\nDone! All pages updated.');
