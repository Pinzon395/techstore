import { chromium } from 'playwright';

const origin = process.env.PIXON_PERF_ORIGIN || 'http://127.0.0.1:3000';
const routes = ['/','/carrito','/en','/en/phone-repair'];
const browser = await chromium.launch({ headless: true });
for (const route of routes) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__pixonCls = [];
    new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
      if (!entry.hadRecentInput) window.__pixonCls.push({ value: entry.value, sources: entry.sources.map((source) => {
        const node = source.node;
        return node ? `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${node.className && typeof node.className === 'string' ? `.${node.className.split(/\s+/).slice(0, 2).join('.')}` : ''}` : 'unknown';
      }) });
    })).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(`${origin}${route}`, { waitUntil: 'networkidle', timeout: 20_000 });
  await page.waitForTimeout(1200);
  const entries = await page.evaluate(() => window.__pixonCls);
  const cls = entries.reduce((total, entry) => total + entry.value, 0);
  const sources = [...new Set(entries.flatMap((entry) => entry.sources))].join(', ') || '-';
  console.log(`${route}: CLS ${cls.toFixed(5)} | ${sources}`);
  await context.close();
}
await browser.close();
