import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const base = process.env.BASE_URL || 'http://localhost:3001';
const visit = (page, route) => page.goto(base + route, { waitUntil: 'networkidle' });
const toggle = (page, lang) => page.locator('#navbar [data-locale-switch="' + lang + '"]:visible');

test('cases 1–5: URL wins over browser and saved language; logo always returns Spanish', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: 'preferredLocale', value: 'en', url: base }]);
  await context.addInitScript(() => localStorage.setItem('preferredLocale', 'en'));
  const page = await context.newPage();
  await visit(page, '/');
  await expect(page).toHaveURL(base + '/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-MX');
  await toggle(page, 'en').click();
  await expect(page).toHaveURL(base + '/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(toggle(page, 'en')).toHaveAttribute('aria-current', 'true');
  await page.locator('#navbar .logo').click();
  await expect(page).toHaveURL(base + '/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-MX');
  await visit(page, '/en');
  await toggle(page, 'es').click();
  await expect(page).toHaveURL(base + '/');
  await visit(page, '/en');
  await visit(page, '/');
  await expect(page).toHaveURL(base + '/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-MX');
  await context.close();
});

for (const [es, en] of [['/servicios', '/en/services'], ['/contacto', '/en/contact'], ['/servicios/laptop', '/en/laptop-repair'], ['/tienda', '/en/store'], ['/cuenta', '/en/account']]) {
  test('equivalent pages and language: ' + es, async ({ page }) => {
    await visit(page, es);
    await toggle(page, 'en').click();
    await expect(page).toHaveURL(base + en);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://pixon.com.mx' + en);
    await expect(toggle(page, 'en')).toHaveAttribute('aria-current', 'true');
    await toggle(page, 'es').click();
    await expect(page).toHaveURL(base + es);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-MX');
  });
}

test('case 8: missing translation falls back to the proper home', async ({ page }) => {
  for (const route of ['/privacidad', '/servicios/pc/diagnostico']) {
    await visit(page, route);
    await toggle(page, 'en').click();
    await expect(page).toHaveURL(base + '/en');
  }
  await visit(page, '/en/404');
  await toggle(page, 'es').click();
  await expect(page).toHaveURL(base + '/');
});

test('footer, keyboard and links without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await visit(page, '/en/services');
  await page.locator('footer [data-locale-switch="es"]').click();
  await expect(page).toHaveURL(base + '/servicios');
  await toggle(page, 'en').focus();
  await expect(toggle(page, 'en')).toBeFocused();
  expect(await toggle(page, 'en').evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(base + '/en/services');
  await page.locator('footer .logo').click();
  await expect(page).toHaveURL(base + '/');
  await context.close();
});

for (const width of [320, 390, 750, 768, 1024, 1101, 1200, 1280, 1440]) {
  for (const route of ['/', '/en']) {
    test('header layout and mobile interaction ' + route + ' ' + width, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await visit(page, route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width <= 1100) {
        await expect(page.locator('.nav-actions .language-switcher')).not.toBeVisible();
        await page.locator('#mobile-menu').click();
        await expect(page.locator('.language-mobile .language-switcher')).toBeVisible();
        await expect(page.locator('#nav-menu')).toHaveCSS('left', '0px');
      } else {
        const boxes = await page.locator('#navbar .logo, #nav-menu, #navbar .nav-actions').evaluateAll(els => els.map(el => {
          const { left, right } = el.getBoundingClientRect(); return { left, right };
        }));
        expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].left);
        expect(boxes[1].right).toBeLessThanOrEqual(boxes[2].left);
        expect(boxes[2].right).toBeLessThanOrEqual(width);
      }
      await page.screenshot({ path: 'artifacts/i18n/header-' + (route === '/' ? 'es' : 'en') + '-' + width + '.png' });
      await toggle(page, route === '/' ? 'en' : 'es').click();
      await expect(page).toHaveURL(base + (route === '/' ? '/en' : '/'));
    });
  }
}

test('all translation pairs: 200, own canonical, reciprocal hreflang and sitemap', async ({ request }) => {
  const source = fs.readFileSync('src/lib/english-routes.ts', 'utf8');
  const pairs = [...source.matchAll(/\{ es: '([^']+)', en: '([^']+)'/g)].map(m => [m[1], m[2]]);
  const sitemap = await (await request.get(base + '/sitemap.xml')).text();
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  expect(new Set(locations).size).toBe(locations.length);
  for (const [es, en] of pairs) {
    for (const [route, lang] of [[es, 'es-MX'], [en, 'en']]) {
      const response = await request.get(base + route);
      expect(response.status(), route).toBe(200);
      const html = await response.text();
      expect(html).toContain('lang="' + lang + '"');
      expect(html).toContain('rel="canonical" href="https://pixon.com.mx' + route + '"');
      for (const [locale, path] of [['es-MX', es], ['en', en], ['x-default', es]]) {
        expect(html, route).toContain('hreflang="' + locale + '" href="https://pixon.com.mx' + path + '"');
      }
      if (!/name="robots" content="[^"]*noindex/.test(html)) expect(locations).toContain('https://pixon.com.mx' + route);
    }
  }
});
