import { test, expect } from '@playwright/test';

/**
 * Quick Navbar Logo Check - Páginas clave
 * Verificación rápida sin esperas innecesarias
 */

const BASE_URL = 'http://localhost:5174';

const PAGES_TO_TEST = [
  { url: '/', name: 'Home Español' },
  { url: '/en/', name: 'Home English' },
  { url: '/reparaciones', name: 'Reparaciones' },
  { url: '/contacto', name: 'Contacto' },
  { url: '/limpieza-laptop-liquido', name: 'Limpieza Laptop' },
];

test.describe('Quick Navbar Logo Verification', () => {
  test('Verify logo in key pages', async ({ page }) => {
    const results = [];

    for (const pageConfig of PAGES_TO_TEST) {
      console.log(`\nChecking: ${pageConfig.name}`);
      const fullUrl = `${BASE_URL}${pageConfig.url}`;

      try {
        // Timeout más corto
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
        await page.waitForTimeout(800);

        // Buscar el navbar logo
        const navbarLogo = page.locator('#navbar .logo img[alt="Pixon PC Logo"]');
        const count = await navbarLogo.count();

        if (count > 0) {
          const isVisible = await navbarLogo.isVisible();
          const src = await navbarLogo.getAttribute('src');
          const box = await navbarLogo.first().boundingBox();

          results.push({
            page: pageConfig.name,
            url: pageConfig.url,
            status: 'OK',
            visible: isVisible,
            src: src,
            dimensions: box,
          });

          console.log(`  ✓ Logo found (${isVisible ? 'visible' : 'hidden'}) - ${src}`);
        } else {
          results.push({
            page: pageConfig.name,
            url: pageConfig.url,
            status: 'MISSING',
            error: 'No navbar logo found',
          });
          console.log(`  ✗ No logo found`);
        }
      } catch (error) {
        results.push({
          page: pageConfig.name,
          url: pageConfig.url,
          status: 'ERROR',
          error: error.message.substring(0, 100),
        });
        console.log(`  ✗ Error: ${error.message.substring(0, 80)}`);
      }
    }

    // Resumen
    console.log('\n═══════════════════════════════════════');
    console.log('SUMMARY:');
    console.log('═══════════════════════════════════════\n');

    const successful = results.filter((r) => r.status === 'OK').length;
    const failed = results.filter((r) => r.status !== 'OK').length;

    console.log(`✓ ${successful}/${PAGES_TO_TEST.length} pages with logo\n`);

    results.forEach((r) => {
      if (r.status === 'OK') {
        console.log(`✓ ${r.page.padEnd(20)} - ${r.src}`);
      } else {
        console.log(`✗ ${r.page.padEnd(20)} - ${r.status}: ${r.error || 'Unknown'}`);
      }
    });

    console.log('\n═══════════════════════════════════════\n');

    // Assert all OK
    expect(failed).toBe(0);
  });
});
