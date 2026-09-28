const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:4321';

const sampleRoutes = [
  '/',
  '/servicios',
  '/servicios/pc/mantenimiento-preventivo',
  '/servicios/laptop/upgrade',
  '/servicios/telefono/celular-mojado',
  '/servicios/telefono/reparacion-pantalla-iphone',
  '/servicios/telefono/reparacion-microfono-iphone',
  '/servicios/pc/tarjeta-video-gpu',
  '/ensambles',
  '/tienda',
  '/tienda/promociones',
  '/carrito',
  '/checkout',
  '/tickets',
  '/contacto',
  '/b2b',
  '/empresas',
  '/cuenta',
  '/reparaciones',
  '/reparacion-controles',
  '/desbloqueo-icloud-cancun',
  '/blogs',
  '/blogs/reparacion-bisagras-carcasas-laptop-cancun',
  '/blogs/pasta-termica-vs-metal-liquido',
  '/en',
  '/en/computer-repair',
  '/en/laptop-repair',
  '/en/phone-repair',
  '/en/liquid-damage',
  '/en/iphone-battery-replacement',
  '/en/store',
  '/en/tickets'
];

const viewports = [
  { name: 'desktop-1366', width: 1366, height: 768, minGutter: 48 },
  { name: 'desktop-1920', width: 1920, height: 1080, minGutter: 48 },
  { name: 'tablet-768', width: 768, height: 1024, minGutter: 30 },
  { name: 'mobile-390', width: 390, height: 844, minGutter: 18 },
  { name: 'mobile-320', width: 320, height: 568, minGutter: 18 }
];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log(`Auditing key routes across 5 breakpoints...`);
  let totalChecks = 0;
  let failures = [];

  for (const route of sampleRoutes) {
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const resp = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(100);

      const check = await page.evaluate((vp) => {
        const issues = [];
        // 1. Horizontal scroll
        const scrollW = document.documentElement.scrollWidth;
        const clientW = document.documentElement.clientWidth;
        if (scrollW > clientW + 2) {
          issues.push(`Horizontal overflow: scrollWidth (${scrollW}) > clientWidth (${clientW})`);
        }

        // 2. Content Gutter (check content boxes)
        const contentContainers = document.querySelectorAll(
          '.container, .nav-container, .store-shell, .px-container, .builder-container, .business-shell, .hb-shell, .imic-container, .idi-container, .ib-en-shell, .english-service-shell, .cp-shell'
        );

        for (const el of contentContainers) {
          if (!el.offsetParent && el.offsetWidth === 0) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          // Compute inner content position taking padding into account if element spans 100%
          const cs = window.getComputedStyle(el);
          const padL = parseFloat(cs.paddingLeft) || 0;
          const padR = parseFloat(cs.paddingRight) || 0;

          const contentLeft = rect.left + padL;
          const contentRightSpace = window.innerWidth - (rect.right - padR);

          if (contentLeft < vp.minGutter) {
            issues.push(`Left gutter small on ${el.className}: ${Math.round(contentLeft)}px < ${vp.minGutter}px`);
          }
          if (contentRightSpace < vp.minGutter) {
            issues.push(`Right gutter small on ${el.className}: ${Math.round(contentRightSpace)}px < ${vp.minGutter}px`);
          }
        }

        return issues;
      }, vp);

      totalChecks++;
      if (check.length > 0) {
        console.log(`[FAIL] ${route} [${vp.name}]:`, check);
        failures.push({ route, vp: vp.name, check });
      }
    }
    console.log(`[PASS] ${route} on all 5 viewports`);
  }

  console.log(`\n================================`);
  console.log(`Completed ${totalChecks} viewport checks across ${sampleRoutes.length} critical routes.`);
  console.log(`Total failures: ${failures.length}`);
  console.log(`================================`);

  await browser.close();
}

run().catch(console.error);
