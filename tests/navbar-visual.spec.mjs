import { test, expect } from '@playwright/test';

/**
 * Navbar Visual Verification Tests
 * Verifica el navbar en desktop y móvil, incluyendo:
 * - Presencia y dimensiones del logo
 * - Layout y espaciado
 * - Overflow/sobrantes visuales
 * - Funcionalidad en ambos viewports
 */

const BASE_URL = 'http://localhost:5174'; // Vite dev server

// Configuraciones de viewport
const VIEWPORTS = {
  desktop: { width: 1280, height: 720, name: 'Desktop 1280x720' },
  tablet: { width: 768, height: 1024, name: 'Tablet 768x1024' },
  mobile: { width: 375, height: 667, name: 'Mobile iPhone 375x667' },
};

test.describe('Navbar Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Esperar a que la página esté completamente cargada
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
  });

  test('Desktop: Navbar layout and logo visibility', async ({ page }) => {
    await page.setViewportSize({ width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height });
    await page.waitForTimeout(500); // Esperar renderizado

    // Verificar que el navbar existe
    const navbar = page.locator('#navbar');
    await expect(navbar).toBeVisible();

    // Verificar que el logo existe y es visible (específico del navbar)
    const logo = page.locator('#navbar .logo img[alt="Pixon PC Logo"]');
    await expect(logo).toBeVisible();

    // Obtener dimensiones del logo
    const logoBoundingBox = await logo.boundingBox();
    console.log('Desktop - Logo dimensions:', logoBoundingBox);

    // Verificar que el logo tiene dimensiones razonables
    expect(logoBoundingBox.height).toBeGreaterThanOrEqual(50);
    expect(logoBoundingBox.height).toBeLessThanOrEqual(70);

    // Tomar screenshot del navbar (desktop)
    await page.screenshot({
      path: 'tests/screenshots/navbar-desktop.png',
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: VIEWPORTS.desktop.width,
        height: 100,
      },
    });

    console.log('✓ Desktop navbar screenshot saved');
  });

  test('Desktop: Navbar no overflow/sobrantes', async ({ page }) => {
    await page.setViewportSize({ width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height });
    await page.waitForTimeout(500);

    // Obtener el contenedor del navbar
    const navContainer = page.locator('#navbar .nav-container');
    const containerBoundingBox = await navContainer.boundingBox();

    // Verificar que no hay overflow horizontal
    const navbarWidth = await page.evaluate(() => {
      const navbar = document.querySelector('#navbar');
      return navbar.offsetWidth;
    });

    const windowWidth = VIEWPORTS.desktop.width;
    console.log(`Desktop - Navbar width: ${navbarWidth}, Window width: ${windowWidth}`);
    expect(navbarWidth).toBeLessThanOrEqual(windowWidth);

    // Verificar elementos del navbar
    const navMenu = page.locator('#navbar .nav-menu');
    await expect(navMenu).toBeVisible();

    // Verificar que los links están visibles (solo los del navbar)
    const navLinks = page.locator('#navbar .nav-menu .nav-links:not(.nav-login-mobile)');
    const linkCount = await navLinks.count();
    console.log(`Desktop - Number of nav links: ${linkCount}`);
    expect(linkCount).toBeGreaterThan(0);

    // Cada link del navbar debe ser visible
    for (let i = 0; i < linkCount && i < 5; i++) {
      const link = navLinks.nth(i);
      await expect(link).toBeVisible();
    }
  });

  test('Desktop: Logo click navigation', async ({ page }) => {
    await page.setViewportSize({ width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height });
    await page.waitForTimeout(500);

    const logoLink = page.locator('#navbar .logo');
    await expect(logoLink).toBeVisible();

    // Hacer click en el logo
    await logoLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Verificar que navegó a home
    const currentUrl = page.url();
    console.log(`Desktop - After logo click, URL: ${currentUrl}`);
    expect(currentUrl).toContain(BASE_URL);
  });

  test('Mobile: Navbar layout and logo visibility', async ({ page }) => {
    await page.setViewportSize({ width: VIEWPORTS.mobile.width, height: VIEWPORTS.mobile.height });
    await page.waitForTimeout(500);

    // Verificar que el navbar existe
    const navbar = page.locator('#navbar');
    await expect(navbar).toBeVisible();

    // Verificar que el logo existe y es visible (específico del navbar)
    const logo = page.locator('#navbar .logo img[alt="Pixon PC Logo"]');
    await expect(logo).toBeVisible();

    // Obtener dimensiones del logo
    const logoBoundingBox = await logo.boundingBox();
    console.log('Mobile - Logo dimensions:', logoBoundingBox);

    // El logo debe ser más pequeño en móvil pero aún visible
    expect(logoBoundingBox.height).toBeGreaterThanOrEqual(40);
    expect(logoBoundingBox.height).toBeLessThanOrEqual(65);

    // Tomar screenshot del navbar (mobile)
    await page.screenshot({
      path: 'tests/screenshots/navbar-mobile.png',
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: VIEWPORTS.mobile.width,
        height: 90,
      },
    });

    console.log('✓ Mobile navbar screenshot saved');
  });

  test('Mobile: Menu toggle button functionality', async ({ page }) => {
    await page.setViewportSize({ width: VIEWPORTS.mobile.width, height: VIEWPORTS.mobile.height });
    await page.waitForTimeout(500);

    // Verificar que el menu toggle existe
    const menuToggle = page.locator('#navbar .menu-toggle');
    await expect(menuToggle).toBeVisible();

    // Verificar que tiene 3 barras
    const bars = page.locator('#navbar .bar');
    expect(await bars.count()).toBe(3);

    // Click en el toggle
    await menuToggle.click();
    await page.waitForTimeout(300); // Esperar animación

    // Tomar screenshot con el menú abierto
    await page.screenshot({
      path: 'tests/screenshots/navbar-mobile-menu-open.png',
      fullPage: false,
    });

    console.log('✓ Mobile menu toggle screenshot saved');
  });

  test('Mobile: No navbar overflow', async ({ page }) => {
    await page.setViewportSize({ width: VIEWPORTS.mobile.width, height: VIEWPORTS.mobile.height });
    await page.waitForTimeout(500);

    // Verificar que no hay overflow horizontal
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    console.log(`Mobile - Has horizontal scroll: ${hasHorizontalScroll}`);

    // Obtener dimensiones del navbar
    const navbarWidth = await page.evaluate(() => {
      const navbar = document.querySelector('#navbar');
      return navbar ? navbar.offsetWidth : 0;
    });

    console.log(`Mobile - Navbar width: ${navbarWidth}, Window width: ${VIEWPORTS.mobile.width}`);
    expect(navbarWidth).toBeLessThanOrEqual(VIEWPORTS.mobile.width);
  });

  test('Tablet: Navbar responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: VIEWPORTS.tablet.width, height: VIEWPORTS.tablet.height });
    await page.waitForTimeout(500);

    // Verificar navbar
    const navbar = page.locator('#navbar');
    await expect(navbar).toBeVisible();

    // Verificar logo
    const logo = page.locator('#navbar .logo img[alt="Pixon PC Logo"]');
    await expect(logo).toBeVisible();

    // Tomar screenshot
    await page.screenshot({
      path: 'tests/screenshots/navbar-tablet.png',
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: VIEWPORTS.tablet.width,
        height: 100,
      },
    });

    console.log('✓ Tablet navbar screenshot saved');
  });

  test('Logo: Image integrity (no broken src)', async ({ page }) => {
    await page.setViewportSize({ width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height });

    const logo = page.locator('#navbar .logo img[alt="Pixon PC Logo"]');
    
    // Verificar src del logo
    const src = await logo.getAttribute('src');
    console.log('Logo src:', src);
    expect(src).toBeTruthy();
    expect(src).toBe('/assets/logos/Logo.svg');

    // Esperar a que la imagen esté cargada
    await page.waitForFunction(() => {
      const img = document.querySelector('#navbar .logo img[alt="Pixon PC Logo"]');
      return img && img.complete && img.naturalHeight !== 0;
    });

    console.log('✓ Logo loaded successfully');
  });

  test('Visual comparison: All viewports side-by-side analysis', async ({ page }) => {
    const results = [];

    for (const [key, viewport] of Object.entries(VIEWPORTS)) {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);

      const navbar = page.locator('#navbar');
      const logo = page.locator('#navbar .logo img');

      const navbarBox = await navbar.boundingBox();
      const logoBox = await logo.boundingBox();

      results.push({
        viewport: viewport.name,
        navbar: navbarBox,
        logo: logoBox,
      });

      console.log(`${key.toUpperCase()} - Navbar: ${JSON.stringify(navbarBox)}`);
      console.log(`${key.toUpperCase()} - Logo: ${JSON.stringify(logoBox)}`);
    }

    // Generar reporte
    console.log('\n=== NAVBAR VISUAL VERIFICATION REPORT ===');
    results.forEach((r) => {
      console.log(`\n${r.viewport}:`);
      console.log(`  Navbar height: ${r.navbar.height}px`);
      console.log(`  Logo height: ${r.logo.height}px`);
      console.log(`  Logo position: x=${r.logo.x}, y=${r.logo.y}`);
    });
  });

  test('Logo overflow detection', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const logoOverflow = await page.evaluate(() => {
      const logo = document.querySelector('.logo');
      const logoImg = document.querySelector('.logo img');
      
      if (!logo || !logoImg) return null;

      const logoRect = logo.getBoundingClientRect();
      const logoImgRect = logoImg.getBoundingClientRect();
      const navbar = document.querySelector('.navbar');
      const navbarRect = navbar.getBoundingClientRect();

      return {
        logo: {
          top: logoRect.top,
          bottom: logoRect.bottom,
          left: logoRect.left,
          right: logoRect.right,
          height: logoRect.height,
          width: logoRect.width,
        },
        logoImg: {
          top: logoImgRect.top,
          bottom: logoImgRect.bottom,
          left: logoImgRect.left,
          right: logoImgRect.right,
          height: logoImgRect.height,
        },
        navbar: {
          height: navbarRect.height,
          top: navbarRect.top,
          bottom: navbarRect.bottom,
        },
        isContained: logoImgRect.bottom <= navbarRect.bottom,
        overflow: Math.max(0, logoImgRect.bottom - navbarRect.bottom),
      };
    });

    console.log('\nLogo Overflow Analysis (Desktop):');
    console.log(JSON.stringify(logoOverflow, null, 2));

    if (logoOverflow.overflow > 0) {
      console.warn(
        `⚠️  WARNING: Logo overflow detected! ${logoOverflow.overflow}px outside navbar bounds`
      );
    } else {
      console.log('✓ Logo properly contained within navbar');
    }

    expect(logoOverflow.overflow).toBeLessThanOrEqual(0);

    // Mobile
    await page.setViewportSize({ width: VIEWPORTS.mobile.width, height: VIEWPORTS.mobile.height });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const logoOverflowMobile = await page.evaluate(() => {
      const logo = document.querySelector('.logo');
      const logoImg = document.querySelector('.logo img');
      const navbar = document.querySelector('.navbar');
      
      if (!logo || !logoImg || !navbar) return null;

      const logoRect = logo.getBoundingClientRect();
      const logoImgRect = logoImg.getBoundingClientRect();
      const navbarRect = navbar.getBoundingClientRect();

      return {
        logo: {
          height: logoRect.height,
          width: logoRect.width,
        },
        logoImg: {
          height: logoImgRect.height,
          bottom: logoImgRect.bottom,
        },
        navbar: {
          height: navbarRect.height,
          bottom: navbarRect.bottom,
        },
        isContained: logoImgRect.bottom <= navbarRect.bottom,
        overflow: Math.max(0, logoImgRect.bottom - navbarRect.bottom),
      };
    });

    console.log('\nLogo Overflow Analysis (Mobile):');
    console.log(JSON.stringify(logoOverflowMobile, null, 2));

    if (logoOverflowMobile.overflow > 0) {
      console.warn(
        `⚠️  WARNING: Logo overflow detected on mobile! ${logoOverflowMobile.overflow}px outside navbar`
      );
    } else {
      console.log('✓ Logo properly contained on mobile');
    }

    expect(logoOverflowMobile.overflow).toBeLessThanOrEqual(0);
  });
});
