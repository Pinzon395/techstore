import { chromium } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const origin = process.env.QA_ORIGIN || 'http://localhost:4322';
const routes = [
  '/servicios/laptop/upgrade',
  '/servicios/mac/diagnostico-mac',
  '/servicios/mac/macbook-no-enciende',
  '/servicios/mac/reparacion-macbook',
  '/servicios/mac/mantenimiento-macbook',
  '/servicios/b2b/wifi-empresarial',
  '/servicios/b2b/polizas-mantenimiento',
  '/servicios/pc/fuente-poder',
  '/servicios/pc/mantenimiento-correctivo',
  '/servicios/pc/no-enciende',
  '/servicios/telefono/reparacion-carga-iphone',
];
const sizes = [[320,568],[360,800],[375,812],[390,844],[412,915],[430,932],[768,1024],[820,1180],[1024,768],[1366,768],[1440,900],[1920,1080]];

const out = path.resolve('tmp/hero-fixed-qa');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const report = [];

for (const route of routes) {
  for (const [w, h] of sizes) {
    const context = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (e) => { if (e.type() === 'error') errors.push(e.text()); });
    const httpErrors = [];
    page.on('response', (r) => { if (r.status() >= 400) httpErrors.push(r.status() + ' ' + r.url()); });
    const resp = await page.goto(origin + route, { waitUntil: 'networkidle', timeout: 20000 });
    const data = await page.evaluate(() => {
      const h1s = [...document.querySelectorAll('h1')];
      const h1 = h1s[0];
      const heroRoot = h1.closest('section, header') || h1.parentElement;
      const box = (e) => (e ? e.getBoundingClientRect() : null);
      const head = heroRoot.querySelector('[class*="hero-head"], [class*="hero-copy"]');
      const visual = heroRoot.querySelector('[class*="hero-visual" i], [class*="hero-card" i], [class*="hero-media" i], [class*="hero-collage" i], [class*="hero-panel" i]');
      return {
        h1Count: h1s.length,
        h1Top: box(h1)?.top,
        visualTop: box(visual)?.top,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    report.push({ route, w, h, status: resp?.status(), errors, httpErrors, ...data });
    await context.close();
  }
}
await browser.close();
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));

const failures = report.filter((r) => r.overflow || r.h1Count !== 1 || r.status !== 200 || r.errors.length || r.httpErrors.length);
console.log('Total checks:', report.length, 'Failures:', failures.length);
if (failures.length) console.log(JSON.stringify(failures, null, 2));
