import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

test('Capture mobile iPhone repair menu', async ({ page }) => {
  // Configurar viewport móvil
  await page.setViewportSize({ width: 375, height: 812 });

  console.log('Navigating to:', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  // 1. Abrir menú hamburguesa
  const menuToggle = page.locator('#mobile-menu');
  await expect(menuToggle).toBeVisible();
  await menuToggle.click();
  await page.waitForTimeout(500);
  console.log('Opened mobile menu');

  // 2. Click en Servicios para desplegar categorías L1
  const serviciosTrigger = page.locator('#dd-servicios-trigger');
  await expect(serviciosTrigger).toBeVisible();
  await serviciosTrigger.click();
  await page.waitForTimeout(500);
  console.log('Clicked Servicios');

  // 3. Click en Celular (categoría L2) para desplegar sus subservicios
  // Celular es la categoría con id 'dd-cat-telefono' o similar. Let's find it.
  const celularLink = page.locator('.cascade-cat-link', { hasText: 'Celular' });
  await expect(celularLink).toBeVisible();
  await celularLink.click();
  await page.waitForTimeout(500);
  console.log('Clicked Celular');

  // Tomar screenshot intermedio
  await page.screenshot({ path: 'tests/screenshots/debug-mobile-celular-open.png' });

  // 4. Click en Reparación de iPhone (L3 trigger)
  const iphoneTrigger = page.locator('.v3-sub-trigger', { hasText: 'Reparación de iPhone' });
  await expect(iphoneTrigger).toBeVisible();
  await iphoneTrigger.click();
  await page.waitForTimeout(800);
  console.log('Clicked Reparación de iPhone');

  // Tomar screenshot del menú L3 abierto
  await page.screenshot({ path: 'tests/screenshots/debug-mobile-iphone-open.png' });
  console.log('Screenshot saved to tests/screenshots/debug-mobile-iphone-open.png');

  // Evaluar alturas y estilos
  const layoutInfo = await page.evaluate(() => {
    const activeL2 = document.querySelector('.cascade-item.open .v3-cascade-l2');
    const l3 = document.querySelector('.v3-cascade-l3');
    const subItem = document.querySelector('.v3-sub-item.has-l3');
    const navMenu = document.querySelector('#nav-menu');

    return {
      navMenu: navMenu ? {
        height: navMenu.clientHeight,
        scrollHeight: navMenu.scrollHeight,
        overflowY: window.getComputedStyle(navMenu).overflowY
      } : null,
      l2: activeL2 ? {
        height: activeL2.clientHeight,
        scrollHeight: activeL2.scrollHeight,
        maxHeight: activeL2.style.maxHeight,
        computedMaxHeight: window.getComputedStyle(activeL2).maxHeight,
        overflow: window.getComputedStyle(activeL2).overflow
      } : null,
      subItem: subItem ? {
        height: subItem.clientHeight,
        scrollHeight: subItem.scrollHeight,
        overflow: window.getComputedStyle(subItem).overflow
      } : null,
      l3: l3 ? {
        height: l3.clientHeight,
        scrollHeight: l3.scrollHeight,
        maxHeight: l3.style.maxHeight,
        computedMaxHeight: window.getComputedStyle(l3).maxHeight,
        overflow: window.getComputedStyle(l3).overflow
      } : null
    };
  });


  console.log('LAYOUT INFO:', JSON.stringify(layoutInfo, null, 2));
});

