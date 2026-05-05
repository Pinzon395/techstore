import { test, expect } from '@playwright/test';

/**
 * Multi-Page Navbar Logo Verification
 * Verifica que el logo carga correctamente en TODAS las páginas del sitio
 */

const BASE_URL = 'http://localhost:5174';

// Mapa de todas las páginas disponibles
const PAGES_TO_TEST = [
  // Home & English
  { url: '/', name: 'Home (Español)' },
  { url: '/en/', name: 'Home (English)' },

  // Servicios
  { url: '/reparaciones', name: 'Reparaciones' },
  { url: '/optimizacion', name: 'Optimización' },
  { url: '/paquetes', name: 'Paquetes' },
  { url: '/ensambles', name: 'Ensambles' },
  { url: '/b2b', name: 'B2B' },
  { url: '/reparacion-bisagras', name: 'Reparación Bisagras' },
  { url: '/reparacion-controles', name: 'Reparación Controles' },
  { url: '/instalacion-windows', name: 'Instalación Windows' },
  { url: '/mantenimiento-mac', name: 'Mantenimiento Mac' },
  { url: '/limpieza-laptop-liquido', name: 'Limpieza Laptop Líquido' },
  { url: '/antisulfatacion', name: 'Antisulfatación' },

  // Información
  { url: '/preguntas-frecuentes', name: 'Preguntas Frecuentes' },
  { url: '/comentarios', name: 'Comentarios/Reseñas' },
  { url: '/contacto', name: 'Contacto' },
  { url: '/catalogo', name: 'Catálogo' },

  // Legal
  { url: '/privacidad', name: 'Privacidad' },
  { url: '/garantia', name: 'Garantía' },

  // Admin
  { url: '/admin', name: 'Admin' },
];

test.describe('Navbar Logo Multi-Page Verification', () => {
  test('Check logo loading on all pages', async ({ page }) => {
    const results = {
      success: [],
      failed: [],
      errorDetails: [],
    };

    for (const pageConfig of PAGES_TO_TEST) {
      const fullUrl = `${BASE_URL}${pageConfig.url}`;

      try {
        await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(1000);

        // Casos especiales
        if (pageConfig.url === '/admin') {
          // Admin tiene su propio navbar (.admin-navbar)
          const adminLogo = page.locator('.admin-navbar .admin-logo img');
          const logoCount = await adminLogo.count();
          if (logoCount > 0) {
            const src = await adminLogo.getAttribute('src');
            results.success.push({
              name: pageConfig.name,
              url: pageConfig.url,
              src: src,
              alt: 'Admin Logo',
              dimensions: { width: 40, height: 40 },
              note: 'Uses admin-navbar (not standard navbar)',
            });
            console.log(`✓ ${pageConfig.name} (${pageConfig.url}) - Admin Logo OK`);
          } else {
            results.failed.push(pageConfig.name);
            results.errorDetails.push({
              page: pageConfig.name,
              url: pageConfig.url,
              error: 'Admin logo NOT FOUND',
            });
          }
          continue;
        }

        // Esperar hasta 3 segundos para que el navbar.js se inyecte (especialmente en /en/)
        let navbarLogo = page.locator('#navbar .logo img[alt="Pixon PC Logo"]');
        let logoCount = await navbarLogo.count();
        let waitTime = 1000;

        while (logoCount === 0 && waitTime < 3000) {
          await page.waitForTimeout(500);
          logoCount = await navbarLogo.count();
          waitTime += 500;
        }

        if (logoCount === 0) {
          results.failed.push(pageConfig.name);
          results.errorDetails.push({
            page: pageConfig.name,
            url: pageConfig.url,
            error: 'Logo element NOT FOUND in navbar (waited 3s)',
            logoCount: 0,
          });
          continue;
        }

        // Verificar si el logo está visible
        const isVisible = await navbarLogo.isVisible();

        if (!isVisible) {
          results.failed.push(pageConfig.name);
          results.errorDetails.push({
            page: pageConfig.name,
            url: pageConfig.url,
            error: 'Logo element found but NOT VISIBLE',
            logoCount: logoCount,
          });
          continue;
        }

        // Obtener la imagen del logo y verificar su src
        const logoImg = await navbarLogo.first();
        const src = await logoImg.getAttribute('src');
        const alt = await logoImg.getAttribute('alt');

        // Verificar que la imagen esté cargada
        const isImageLoaded = await page.evaluate(() => {
          const img = document.querySelector('#navbar .logo img[alt="Pixon PC Logo"]');
          return img && img.complete && img.naturalHeight > 0;
        });

        if (!isImageLoaded) {
          results.failed.push(pageConfig.name);
          results.errorDetails.push({
            page: pageConfig.name,
            url: pageConfig.url,
            error: 'Logo image NOT LOADED (src may be broken or 404)',
            src: src,
            isImageLoaded: false,
          });
          continue;
        }

        // Obtener dimensiones
        const boundingBox = await logoImg.boundingBox();

        results.success.push({
          name: pageConfig.name,
          url: pageConfig.url,
          src: src,
          alt: alt,
          dimensions: boundingBox,
        });

        console.log(`✓ ${pageConfig.name} (${pageConfig.url}) - Logo OK`);
      } catch (error) {
        results.failed.push(pageConfig.name);
        results.errorDetails.push({
          page: pageConfig.name,
          url: pageConfig.url,
          error: error.message,
        });
        console.log(`✗ ${pageConfig.name} (${pageConfig.url}) - ERROR: ${error.message}`);
      }
    }

    // Generar reporte detallado
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('MULTI-PAGE NAVBAR LOGO VERIFICATION REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`✓ PAGES WITH WORKING LOGO: ${results.success.length}/${PAGES_TO_TEST.length}\n`);
    results.success.forEach((r) => {
      console.log(`  ✓ ${r.name}`);
      console.log(`    URL: ${r.url}`);
      console.log(`    Src: ${r.src}`);
      console.log(`    Size: ${r.dimensions.width}x${r.dimensions.height}px\n`);
    });

    if (results.failed.length > 0) {
      console.log(`\n✗ PAGES WITH BROKEN LOGO: ${results.failed.length}/${PAGES_TO_TEST.length}\n`);
      results.errorDetails.forEach((e) => {
        console.log(`  ✗ ${e.page}`);
        console.log(`    URL: ${e.url}`);
        console.log(`    Problem: ${e.error}`);
        if (e.src) console.log(`    Src: ${e.src}`);
        console.log();
      });
    }

    console.log('═══════════════════════════════════════════════════════════\n');

    // Tomar screenshots de páginas fallidas para debug
    if (results.failed.length > 0) {
      console.log('Taking screenshots of failed pages for debugging...\n');
      for (const failedPage of results.failed) {
        const pageConfig = PAGES_TO_TEST.find((p) => p.name === failedPage);
        if (pageConfig) {
          try {
            const fullUrl = `${BASE_URL}${pageConfig.url}`;
            await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 10000 });
            await page.waitForTimeout(500);

            const safeFileName = pageConfig.url.replace(/\//g, '_').replace(/^_/, '');
            await page.screenshot({
              path: `tests/screenshots/failed-page_${safeFileName}.png`,
              fullPage: true,
            });
            console.log(`  Screenshot: failed-page_${safeFileName}.png`);
          } catch (e) {
            console.log(`  Could not screenshot ${failedPage}`);
          }
        }
      }
    }

    // Assertion: todas las páginas deben tener el logo
    expect(results.failed.length).toBe(0);
  });

  test('Inspect navbar HTML structure on home page', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Inspeccionar la estructura del navbar
    const navbarHtml = await page.locator('#navbar').evaluate((el) => el.outerHTML.substring(0, 500));
    console.log('\nNavbar HTML structure (first 500 chars):\n');
    console.log(navbarHtml);

    // Inspeccionar todos los logos en la página
    const allLogos = await page.locator('.logo img').count();
    console.log(`\nTotal logo images in page: ${allLogos}`);

    for (let i = 0; i < allLogos; i++) {
      const logo = page.locator('.logo img').nth(i);
      const src = await logo.getAttribute('src');
      const alt = await logo.getAttribute('alt');
      const parent = await logo.evaluate((el) => {
        let p = el.parentElement;
        let classes = [];
        while (p && p.tagName !== 'BODY') {
          classes.push(p.className || p.tagName);
          p = p.parentElement;
        }
        return classes.reverse().join(' > ');
      });

      console.log(`\n  Logo ${i + 1}:`);
      console.log(`    Src: ${src}`);
      console.log(`    Alt: ${alt}`);
      console.log(`    Parent chain: ${parent}`);
    }
  });

  test('Check if logo path resolution is correct', async ({ page }) => {
    // Test varios path variants
    const pathVariants = [
      '/assets/logos/Logo.svg',
      'assets/logos/Logo.svg',
      '../assets/logos/Logo.svg',
      '/Logo.svg',
    ];

    console.log('\nChecking path resolution:\n');

    for (const path of pathVariants) {
      const exists = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'load' }).then(
        () => true,
        () => false
      );
      console.log(`  ${path}: ${exists ? '✓ EXISTS' : '✗ NOT FOUND'}`);
    }
  });

  test('Verify logo src attribute and network requests', async ({ page }) => {
    const networkLogs = [];

    // Escuchar requests
    page.on('response', (response) => {
      if (response.url().includes('Logo') || response.url().includes('logo')) {
        networkLogs.push({
          url: response.url(),
          status: response.status(),
          ok: response.ok(),
        });
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    console.log('\nNetwork requests for logo files:\n');
    if (networkLogs.length === 0) {
      console.log('  No logo requests detected!');
    } else {
      networkLogs.forEach((log) => {
        console.log(`  ${log.url}`);
        console.log(`    Status: ${log.status} ${log.ok ? '✓' : '✗'}`);
      });
    }

    // Verificar el src del logo en el HTML
    const logoSrc = await page.locator('#navbar .logo img').first().getAttribute('src');
    console.log(`\n  Logo src attribute: ${logoSrc}`);

    // Intentar acceder directamente a ese path
    if (logoSrc) {
      const logoUrl = `${BASE_URL}${logoSrc}`;
      const logoResponse = await page.evaluate(async (url) => {
        try {
          const res = await fetch(url);
          return { ok: res.ok, status: res.status };
        } catch (e) {
          return { ok: false, error: e.message };
        }
      }, logoUrl);
      console.log(`\n  Direct fetch of "${logoSrc}":`);
      console.log(`    Result: ${JSON.stringify(logoResponse)}`);
    }
  });
});
