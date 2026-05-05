/**
 * tools/patches/visual-verify.spec.mjs
 *
 * Verificación visual headless con Playwright (chromium).
 * Recorre las 20 páginas en 2 viewports y comprueba:
 *   - #navbar visible
 *   - #navbar-logo cargado (naturalWidth > 0) y visible
 *   - en desktop: .nav-menu visible
 *   - en móvil: .menu-toggle visible
 *   - en páginas con placeholder de ubicación: aparece el link a maps.app.goo.gl
 *   - auto-hide al scroll: aparece y desaparece la clase .is-hidden
 *
 * Uso:
 *   node tools/patches/visual-verify.spec.mjs
 *   (requiere vite dev server en http://localhost:5173)
 */

import { chromium } from 'playwright';

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

const VIEWPORTS = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile',  width: 390,  height: 844 },
];

// Páginas que deben tener la sección de ubicación inyectada
const LOCATION_PAGES = new Set([
    '/',
    '/reparaciones',
    '/paquetes',
    '/mantenimiento-mac',
    '/ensambles',
    '/reparacion-bisagras',
    '/reparacion-controles',
    '/limpieza-laptop-liquido',
    '/contacto',
    '/comentarios',
    '/catalogo',
]);

let pass = 0;
let fail = 0;
const failures = [];

function assert(cond, label) {
    if (cond) pass++;
    else { fail++; failures.push(`✗ ${label}`); }
}

async function main() {
    const browser = await chromium.launch();

    for (const vp of VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await context.newPage();

        // Capturar errores de consola
        const consoleErrors = [];
        page.on('pageerror', err => consoleErrors.push(err.message));

        for (const path of PAGES) {
            consoleErrors.length = 0;
            try {
                await page.goto(`${ORIGIN}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            } catch (e) {
                assert(false, `[${vp.name}] ${path} carga: ${e.message}`);
                continue;
            }

            // Esperar a que el navbar se inyecte (component IIFE corre tras parse)
            try {
                await page.waitForSelector('#navbar', { timeout: 5000 });
            } catch (e) {
                assert(false, `[${vp.name}] ${path}: #navbar nunca apareció`);
                continue;
            }

            // 1) #navbar visible
            const navbarVisible = await page.locator('#navbar').isVisible();
            assert(navbarVisible, `[${vp.name}] ${path}: #navbar visible`);

            // 2) Logo presente, cargado y con tamaño > 0
            const logoOk = await page.evaluate(() => {
                const img = document.getElementById('navbar-logo');
                if (!img) return { ok: false, reason: 'no-element' };
                if (!img.complete) return { ok: false, reason: 'not-loaded' };
                if (img.naturalWidth === 0) return { ok: false, reason: 'naturalWidth=0' };
                const box = img.getBoundingClientRect();
                if (box.width === 0 || box.height === 0) return { ok: false, reason: `bbox=${box.width}x${box.height}` };
                return { ok: true, src: img.src, height: box.height };
            });
            assert(logoOk.ok, `[${vp.name}] ${path}: logo OK ${JSON.stringify(logoOk)}`);

            // 3) Layout: desktop muestra .nav-menu; móvil muestra .menu-toggle
            if (vp.name === 'desktop') {
                const menuVisible = await page.locator('.nav-menu').isVisible();
                assert(menuVisible, `[${vp.name}] ${path}: .nav-menu visible en desktop`);
            } else {
                const toggleVisible = await page.locator('#mobile-menu').isVisible();
                assert(toggleVisible, `[${vp.name}] ${path}: hamburger visible en móvil`);
            }

            // 4) Sección de ubicación inyectada (solo en desktop para no duplicar checks)
            if (vp.name === 'desktop' && LOCATION_PAGES.has(path)) {
                try {
                    await page.waitForSelector('#ubicacion', { timeout: 4000 });
                    const linkHref = await page.locator('#ubicacion a[href*="maps.app.goo.gl"]').first().getAttribute('href');
                    assert(linkHref && linkHref.includes('aLrP9whG5R1Wn2kq9'),
                        `[${vp.name}] ${path}: link goo.gl correcto (${linkHref})`);
                } catch (e) {
                    assert(false, `[${vp.name}] ${path}: sección #ubicacion ausente`);
                }
            }

            // 5) Auto-hide al scroll (solo desktop, una vez por página, para no eternizar)
            if (vp.name === 'desktop') {
                // Scroll a 400px
                await page.evaluate(() => window.scrollTo(0, 400));
                // Esperar a que termine la animación + handler rAF
                await page.waitForTimeout(450);
                let hiddenAfterDown = await page.evaluate(() => document.getElementById('navbar').classList.contains('is-hidden'));

                // Algunas páginas son cortas y no hay 400px para scroll → tolerar si la altura es chica
                const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
                if (docHeight > 1200) {
                    assert(hiddenAfterDown, `[${vp.name}] ${path}: navbar se oculta al bajar (docHeight=${docHeight})`);

                    // Scroll up
                    await page.evaluate(() => window.scrollTo(0, 50));
                    await page.waitForTimeout(450);
                    const hiddenAfterUp = await page.evaluate(() => document.getElementById('navbar').classList.contains('is-hidden'));
                    assert(!hiddenAfterUp, `[${vp.name}] ${path}: navbar reaparece al subir`);
                }
            }

            // 6) Sin errores JS en consola
            if (consoleErrors.length > 0) {
                assert(false, `[${vp.name}] ${path}: errores JS — ${consoleErrors.slice(0, 2).join(' | ')}`);
            }
        }

        await context.close();
    }

    await browser.close();

    console.log(`\n──────────────────────────────────────────`);
    if (fail > 0) {
        console.log(`✗ FALLÓ — ${pass} OK, ${fail} errores:\n`);
        for (const f of failures.slice(0, 50)) console.log(f);
        if (failures.length > 50) console.log(`… y ${failures.length - 50} más`);
        process.exit(1);
    } else {
        console.log(`✓ Todo OK — ${pass} aserciones verdes (desktop+móvil).`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
