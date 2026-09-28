import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.MAINTENANCE_QA_ORIGIN || 'http://localhost:4321';
const out = path.resolve('tmp/maintenance-intent');
await fs.mkdir(out, { recursive: true });
const routes = { generic: '/mantenimiento-preventivo-computadora', domicilio: '/mantenimiento-pc-laptop-domicilio-cancun' };
const sizes = [[1366,768],[1440,900],[768,1024],[430,932],[390,844],[360,800],[1920,1080]];
const browser = await chromium.launch({ headless: process.env.HEADED === 'true' ? false : true });
const report = { origin, pages: [], interactions: {}, failures: [] };
for (const [name, route] of Object.entries(routes)) {
  for (const [width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem('pixon_cookie_consent', 'essential');
      window.__qa = { cls: 0, lcp: 0 };
      new PerformanceObserver(list => list.getEntries().forEach(e => { if (!e.hadRecentInput) window.__qa.cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(e => { window.__qa.lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    const page = await context.newPage();
    const errors = [], httpErrors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    page.on('response', r => { if (r.status() >= 400) httpErrors.push({ url: r.url(), status: r.status() }); });
    const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const data = await page.evaluate(() => {
      const hero = document.querySelector('.mpc-hero, .homevisit-hero');
      const box = e => e?.getBoundingClientRect().toJSON();
      const copy = document.querySelector('.mpc-hero__copy');
      const media = document.querySelector('.mpc-hero__media');
      return {
        title: document.title, h1: [...document.querySelectorAll('h1')].map(e => e.textContent.trim()),
        meta: document.querySelector('meta[name="description"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        robots: document.querySelector('meta[name="robots"]')?.content,
        schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].map(e => JSON.parse(e.textContent)),
        heroText: hero?.innerText, hero: box(hero), copy: box(copy), media: box(media),
        h1Box: box(document.querySelector('h1')), buttons: [...(hero?.querySelectorAll('a') || [])].map(e => ({ text: e.innerText, href: e.getAttribute('href'), box: box(e) })),
        firstH2: document.querySelector('main h2')?.textContent,
        overflow: document.documentElement.scrollWidth > innerWidth,
        brokenImages: [...document.images].filter(e => e.complete && !e.naturalWidth).map(e => e.src),
        crosslinks: [...document.querySelectorAll('main a')].filter(e => /mantenimiento-(preventivo-computadora|pc-laptop-domicilio-cancun)$/.test(e.pathname)).map(e => e.pathname),
        metrics: window.__qa,
        transfer: performance.getEntriesByType('resource').reduce((sum, e) => sum + e.transferSize, 0),
      };
    });
    const row = { name, width, height, status: response.status(), url: page.url(), ...data, errors, httpErrors };
    report.pages.push(row);
    if (data.overflow || data.h1.length !== 1 || response.status() !== 200 || data.brokenImages.length) report.failures.push({ name, width, reason: 'overflow, H1, response or image', details: row });
    if (name === 'generic' && /domicilio|residencial|hotel|Puerto Cancún|Cumbres|Huayacán/i.test(data.heroText)) report.failures.push({ name, width, reason: 'hero intent' });
    await page.screenshot({ path: path.join(out, `${name}-${width}.png`) });
    if (name === 'generic' && width === 1366) {
      await page.evaluate(() => { window.__events = []; window.pixonTrackEvent = e => window.__events.push(e); });
      const primary = page.locator('[data-maintenance-event="maintenance_preventive_quote_click"]');
      await primary.focus();
      await page.keyboard.press('Tab');
      report.interactions.tabToInclude = await page.locator('[data-maintenance-event="maintenance_preventive_include_click"]').evaluate(e => e === document.activeElement);
      await page.keyboard.press('Shift+Tab');
      report.interactions.shiftTabToQuote = await primary.evaluate(e => e === document.activeElement);
      report.interactions.focusOutline = await primary.evaluate(e => getComputedStyle(e).outlineStyle);
      const popupPromise = context.waitForEvent('page');
      await page.keyboard.press('Enter');
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      report.interactions.whatsappUrl = popup.url();
      await popup.close();
      await page.locator('[data-maintenance-event="maintenance_preventive_include_click"]').focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(350);
      report.interactions.includeHash = new URL(page.url()).hash;
      report.interactions.includeTop = await page.locator('#que-incluye').evaluate(e => e.getBoundingClientRect().top);
      await page.screenshot({ path: path.join(out, 'generic-includes.png') });
      await page.evaluate(() => document.querySelector('[data-maintenance-event="maintenance_preventive_home_crosslink"]').addEventListener('click', e => e.preventDefault(), { once: true }));
      await page.locator('[data-maintenance-event="maintenance_preventive_home_crosslink"]').click();
      report.interactions.events = await page.evaluate(() => window.__events);
      await page.locator('[data-maintenance-event="maintenance_preventive_home_crosslink"]').click();
      await page.waitForURL('**/mantenimiento-pc-laptop-domicilio-cancun');
      report.interactions.crosslinkTarget = page.url();
    }
    if (name === 'generic' && width === 390) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      report.interactions.reducedMotion = await page.locator('.mpc-hero a').first().evaluate(e => ({ animation: getComputedStyle(e).animationName, transition: getComputedStyle(e).transitionDuration }));
      await page.locator('.mpc-hero__media').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, 'generic-mobile-visual.png') });
    }
    console.log(name, width, JSON.stringify({ h1: data.h1.length, overflow: data.overflow, cls: data.metrics.cls, lcp: data.metrics.lcp, errors: errors.length, httpErrors: httpErrors.length }));
    await context.close();
  }
}
await browser.close();
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
if (report.failures.length) process.exitCode = 1;
