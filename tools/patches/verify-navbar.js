/**
 * tools/patches/verify-navbar.js
 *
 * Test rápido del contrato del navbar unificado:
 *   1) Cada página tiene exactamente UN <div id="nav-placeholder">
 *   2) Cada página carga /components/navbar.js EXACTAMENTE UNA VEZ
 *   3) navbar.js aparece ANTES de /scripts/script.js y /scripts/user-menu.js
 *   4) /components/navbar.js entrega un navbar con:
 *        - 1× id="navbar"
 *        - 1× id="nav-auth-area"
 *        - 1× id="nav-auth-area-mobile"
 *        - 1× clase b2b-btn-premium con href="/b2b"
 *        - estructura idéntica al original (id="mobile-menu", class="nav-menu")
 *
 * Uso:
 *   node tools/patches/verify-navbar.js [origen]
 *   (origen por defecto: http://localhost:5173)
 */

const ORIGIN = process.argv[2] || 'http://localhost:5173';

const PAGES = [
    '/',
    '/404.html',
    '/b2b',
    '/reparaciones',
    '/paquetes',
    '/mantenimiento-mac',
    '/instalacion-windows',
    '/ensambles',
    '/reparacion-bisagras',
    '/reparacion-controles',
    '/optimizacion',
    '/privacidad',
    '/garantia',
    '/contacto',
    '/comentarios',
    '/catalogo',
    '/preguntas-frecuentes',
    '/limpieza-laptop-liquido',
    '/antisulfatacion',
];

let pass = 0;
let fail = 0;
const failures = [];

function check(label, cond, detail = '') {
    if (cond) {
        pass++;
    } else {
        fail++;
        failures.push(`✗ ${label}${detail ? ' — ' + detail : ''}`);
    }
}

function countOf(s, needle) {
    return s.split(needle).length - 1;
}

async function main() {
    // 1. validar el componente
    const navJs = await fetch(`${ORIGIN}/components/navbar.js`).then(r => r.text());
    check('navbar.js: 1× id="navbar"',           countOf(navJs, 'id="navbar"') === 1);
    check('navbar.js: 1× id="nav-auth-area"',    countOf(navJs, 'id="nav-auth-area"') === 1);
    check('navbar.js: 1× id="nav-auth-area-mobile"', countOf(navJs, 'id="nav-auth-area-mobile"') === 1);
    check('navbar.js: 1× id="mobile-menu"',      countOf(navJs, 'id="mobile-menu"') === 1);
    check('navbar.js: 1× class="nav-menu"',      countOf(navJs, 'class="nav-menu"') === 1);
    check('navbar.js: botón B2B premium',         navJs.includes('b2b-btn-premium') && navJs.includes('href="/b2b"'));
    check('navbar.js: enlaces canónicos',         navJs.includes('Reparación General') && navJs.includes('Mantenimiento Mac') && navJs.includes('Ensambles PC Gamer'));

    // 2. validar cada página
    for (const path of PAGES) {
        let html;
        try {
            const res = await fetch(`${ORIGIN}${path}`, { redirect: 'follow' });
            if (!res.ok) {
                check(`GET ${path}`, false, `status ${res.status}`);
                continue;
            }
            html = await res.text();
        } catch (e) {
            check(`GET ${path}`, false, e.message);
            continue;
        }

        // a) un solo placeholder
        check(`${path}: 1× #nav-placeholder`,
            countOf(html, 'id="nav-placeholder"') === 1,
            `encontrados=${countOf(html, 'id="nav-placeholder"')}`);

        // b) navbar.js cargado exactamente 1×
        check(`${path}: 1× navbar.js`,
            countOf(html, '/components/navbar.js') === 1,
            `encontrados=${countOf(html, '/components/navbar.js')}`);

        // c) sin <nav class="navbar" id="navbar"> inline (residuo)
        check(`${path}: sin navbar inline`,
            !/<nav class="navbar" id="navbar">/.test(html));

        // d) navbar.js antes que script.js (si script.js está)
        const idxNav    = html.indexOf('/components/navbar.js');
        const idxScript = html.indexOf('/scripts/script.js');
        const idxUser   = html.indexOf('/scripts/user-menu.js');

        if (idxScript !== -1) {
            check(`${path}: navbar.js antes que script.js`,
                idxNav !== -1 && idxNav < idxScript,
                `nav=${idxNav} script=${idxScript}`);
        }
        if (idxUser !== -1) {
            check(`${path}: navbar.js antes que user-menu.js`,
                idxNav !== -1 && idxNav < idxUser,
                `nav=${idxNav} user=${idxUser}`);
        }
    }

    console.log(`\n──────────────────────────────────────────`);
    if (fail > 0) {
        console.log(`✗ FALLÓ — ${pass} OK, ${fail} errores:\n`);
        for (const f of failures) console.log(f);
        process.exit(1);
    } else {
        console.log(`✓ Todo OK — ${pass} aserciones verdes.`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
