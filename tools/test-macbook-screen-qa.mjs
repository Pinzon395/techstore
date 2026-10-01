import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const url = 'http://127.0.0.1:3001/servicios/mac/cambio-pantalla-macbook';
const outDir = 'tmp/macbook-screen-qa';
const viewports = [
  ['390', 390, 844],
  ['768', 768, 1024],
  ['1366', 1366, 768],
  ['1440', 1440, 900],
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { url, viewports: {}, reducedMotion: {}, dark: {}, interaction: {}, failures: [] };

for (const [name, width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: 'light' });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const httpErrors = [];
  await page.addInitScript(() => {
    window.__qaCls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__qaCls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`));
  page.on('response', (response) => { if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('[data-macbook-animation]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3900);
  const metrics = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const svg = document.querySelector('[data-macbook-animation] svg');
    const cta = document.querySelector('.ms-btn--primary');
    const animated = document.querySelector('[data-macbook-animation]');
    const rect = (element) => element ? { top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom, width: element.getBoundingClientRect().width } : null;
    return {
      h1Count: document.querySelectorAll('h1').length,
      h1Text: h1?.textContent?.trim(),
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      animationComplete: animated?.classList.contains('is-complete'),
      h1: rect(h1), svg: rect(svg), cta: rect(cta),
      bodyTextHasOldPrice: document.body.innerText.includes('$3,500'),
      faqCount: document.querySelectorAll('#faq details, #faq .faq-item').length,
      schemaTypes: [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((node) => {
        try { const value = JSON.parse(node.textContent || '{}'); return Array.isArray(value['@type']) ? value['@type'] : [value['@type']]; } catch { return ['INVALID']; }
      }).filter(Boolean),
      cls: window.__qaCls || 0,
    };
  });
  await page.screenshot({ path: `${outDir}/after-${name}x${height}-light-full.png`, fullPage: true });
  report.viewports[name] = { width, height, ...metrics, consoleErrors, failedRequests, httpErrors };
  const localFailures = failedRequests.filter((request) => /^(GET|POST|PUT|PATCH|DELETE) http:\/\/127\.0\.0\.1/.test(request));
  if (metrics.overflow > 1 || consoleErrors.length || localFailures.length || httpErrors.length || !metrics.animationComplete || metrics.cls > .1) report.failures.push(name);
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: 'light' });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  report.reducedMotion = await page.evaluate(() => {
    const visual = document.querySelector('[data-macbook-animation]');
    const path = document.querySelector('.ms-crack--primary path');
    return { complete: visual?.classList.contains('is-complete'), pathOpacity: path ? getComputedStyle(path).opacity : null, replayVisible: !!document.querySelector('[data-animation-replay]') && getComputedStyle(document.querySelector('[data-animation-replay]')).display !== 'none' };
  });
  await page.screenshot({ path: `${outDir}/after-390x844-reduced-motion.png`, fullPage: false });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('[data-macbook-animation]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3900);
  report.dark = await page.evaluate(() => ({ background: getComputedStyle(document.querySelector('.ms-page')).backgroundColor, animationComplete: document.querySelector('[data-macbook-animation]')?.classList.contains('is-complete') }));
  report.dark.consoleErrors = errors;
  await page.screenshot({ path: `${outDir}/after-1440x900-dark-full.png`, fullPage: true });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('[data-macbook-animation]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3900);
  await page.locator('[data-animation-replay]').click();
  await page.waitForTimeout(100);
  const replayStarted = await page.locator('[data-macbook-animation]').evaluate((node) => node.classList.contains('is-playing') && !node.classList.contains('is-complete'));
  await page.waitForTimeout(3700);
  await page.setViewportSize({ width: 390, height: 844 });
  const overflowAfterResize = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.goto('http://127.0.0.1:3001/servicios/mac', { waitUntil: 'domcontentloaded' });
  await page.goBack({ waitUntil: 'networkidle' });
  await page.locator('[data-macbook-animation]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(3900);
  const completeAfterBack = await page.locator('[data-macbook-animation]').evaluate((node) => node.classList.contains('is-complete'));
  report.interaction = { replayStarted, overflowAfterResize, completeAfterBack };
  if (!replayStarted || overflowAfterResize > 1 || !completeAfterBack) report.failures.push('interaction');
  await context.close();
}

await browser.close();
await fs.writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
