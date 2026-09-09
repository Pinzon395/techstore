import { test, expect } from '@playwright/test';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const viewports = [320, 360, 390, 430, 768, 1024, 1280, 1440, 1920];

const pagesToTest = [
  { name: 'home', path: '/' },
  { name: 'service', path: '/servicios/pc/tarjeta-video-gpu' },
  { name: 'store', path: '/tienda' },
  { name: 'cart', path: '/carrito' },
  { name: 'checkout', path: '/checkout' },
  { name: 'account_login', path: '/cuenta' },
  { name: 'ticket', path: '/tickets' },
  { name: 'en_home', path: '/en' },
  { name: 'en_service', path: '/en/graphics-card-repair' },
  { name: 'en_store', path: '/en/store' },
  { name: 'en_cart', path: '/en/cart' },
  { name: 'en_checkout', path: '/en/checkout' },
  { name: 'en_tickets', path: '/en/tickets' },
];

for (const vp of viewports) {
  test.describe(`Viewport ${vp}px`, () => {
    for (const pageInfo of pagesToTest) {
      test(`${pageInfo.name} (${pageInfo.path}) at ${vp}px has no horizontal overflow and CTA visible`, async ({ page }) => {
        await page.setViewportSize({ width: vp, height: 900 });
        const response = await page.goto(`${baseUrl}${pageInfo.path}`, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBeLessThan(400);

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth - window.innerWidth;
        });
        expect(overflow, `Overflow on ${pageInfo.path} at ${vp}px should be <= 1px`).toBeLessThanOrEqual(1);

        // Check that a visible CTA exists (wait slightly if dynamic panel loads)
        if (pageInfo.path.includes('cuenta') || pageInfo.path.includes('account')) {
          await page.waitForTimeout(300);
        }
        const ctaExists = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('a, button, [role="button"]'));
          const keywords = [
            'cotizar', 'ticket', 'whatsapp', 'inquire', 'checkout', 'comprar',
            'order', 'solicitar', 'crear', 'continuar', 'continue', 'google',
            'iniciar', 'sign in', 'login', 'entrar', 'submit', 'enviar', 'pay', 'pagar'
          ];
          return buttons.some(el => {
            const rect = el.getBoundingClientRect();
            const text = (el.textContent || '').trim().toLowerCase();
            const isClickable = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden';
            return isClickable && keywords.some(kw => text.includes(kw));
          });
        });
        expect(ctaExists, `At least one CTA should be visible on ${pageInfo.path} at ${vp}px`).toBeTruthy();
      });
    }
  });
}
