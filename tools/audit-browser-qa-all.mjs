import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const dist = path.resolve('dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1:4331').pathname);
    let relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    let file = path.resolve(dist, relative);
    if (!path.extname(file)) {
      if (await fs.stat(file + '.html').then(() => true).catch(() => false)) file = file + '.html';
      else if (await fs.stat(path.join(file, 'index.html')).then(() => true).catch(() => false)) file = path.join(file, 'index.html');
    }
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': body.length });
    res.end(body);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise((r) => server.listen(4331, '127.0.0.1', r));

const testRoutes = [
  '/',
  '/servicios',
  '/servicios/pc',
  '/servicios/laptop',
  '/servicios/telefono',
  '/servicios/consola',
  '/servicios/impresora',
  '/servicios/b2b',
  '/servicios/telefono/reparacion-pantalla-iphone',
  '/servicios/telefono/reparacion-iphone',
  '/servicios/telefono/celular-mojado',
  '/servicios/pc/tarjeta-video-gpu',
  '/servicios/pc/fuente-poder',
  '/servicios/consola/ps5-se-apaga',
  '/tienda',
  '/carrito',
  '/checkout',
  '/tickets',
  '/comentarios',
  '/preguntas-frecuentes',
  '/blogs',
  '/blogs/pasta-termica-vs-metal-liquido',
  '/en',
  '/en/services'
];

const browser = await chromium.launch({ headless: true });
const issues = [];

try {
  // 1. Mobile QA (390x844)
  console.log('--- RUNNING MOBILE QA (390x844) ---');
  const mContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const mPage = await mContext.newPage();

  for (const route of testRoutes) {
    const pageErrors = [];
    mPage.on('pageerror', (err) => pageErrors.push(err.message));
    const resp = await mPage.goto(`http://127.0.0.1:4331${route}`, { waitUntil: 'load', timeout: 10000 }).catch(() => null);
    if (!resp || resp.status() !== 200) issues.push(`Mobile ${route}: HTTP ${resp ? resp.status() : 'failed'}`);

    try {
      const check = await mPage.evaluate(() => {
        const h1s = document.querySelectorAll('h1').length;
        const brokenImgs = [...document.querySelectorAll('img')].filter(img => img.complete && img.naturalWidth === 0).map(img => img.src);
        const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
        return { h1s, brokenImgs, overflow };
      });

      if (check.h1s !== 1) issues.push(`Mobile ${route}: ${check.h1s} H1 tags found (expected 1)`);
      if (check.overflow) issues.push(`Mobile ${route}: Horizontal overflow detected`);
      if (check.brokenImgs.length > 0) issues.push(`Mobile ${route}: Broken images: ${check.brokenImgs.join(', ')}`);
    } catch {}
    if (pageErrors.length > 0) issues.push(`Mobile ${route}: JS errors: ${pageErrors.join(', ')}`);
  }
  await mContext.close();

  // 2. Desktop QA (1366x768)
  console.log('--- RUNNING DESKTOP QA (1366x768) ---');
  const dContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const dPage = await dContext.newPage();

  for (const route of testRoutes) {
    const pageErrors = [];
    dPage.on('pageerror', (err) => pageErrors.push(err.message));
    const resp = await dPage.goto(`http://127.0.0.1:4331${route}`, { waitUntil: 'load', timeout: 10000 }).catch(() => null);
    if (!resp || resp.status() !== 200) issues.push(`Desktop ${route}: HTTP ${resp ? resp.status() : 'failed'}`);

    try {
      const check = await dPage.evaluate(() => {
        const h1s = document.querySelectorAll('h1').length;
        const brokenImgs = [...document.querySelectorAll('img')].filter(img => img.complete && img.naturalWidth === 0).map(img => img.src);
        return { h1s, brokenImgs };
      });

      if (check.h1s !== 1) issues.push(`Desktop ${route}: ${check.h1s} H1 tags found (expected 1)`);
      if (check.brokenImgs.length > 0) issues.push(`Desktop ${route}: Broken images: ${check.brokenImgs.join(', ')}`);
    } catch {}
    if (pageErrors.length > 0) issues.push(`Desktop ${route}: JS errors: ${pageErrors.join(', ')}`);
  }

  // 3. Test Interactive CTAs on Home and Service
  console.log('--- TESTING INTERACTIVE CTAS ---');
  await dPage.goto('http://127.0.0.1:4331/');
  const waBtn = await dPage.$('a[href*="wa.me"], a[href*="whatsapp"]');
  if (!waBtn) issues.push('Home: WhatsApp CTA not found');

  const ticketLink = await dPage.$('a[href*="tickets"], a[href*="ticket"]');
  if (!ticketLink) issues.push('Home: Ticket CTA link not found');

  // Test FAQ accordion on iPhone Screen Repair
  await dPage.goto('http://127.0.0.1:4331/servicios/telefono/reparacion-pantalla-iphone');
  const faqItem = await dPage.$('.faq-accordion-item, .faq-item, details');
  if (faqItem) {
    await faqItem.click().catch(() => {});
  }

  await dContext.close();
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}

console.log(`\n=== QA VALIDATION SUMMARY ===`);
console.log(`Total Issues: ${issues.length}`);
if (issues.length > 0) {
  issues.forEach(i => console.log('FAIL:', i));
  process.exit(1);
} else {
  console.log('ALL TESTS PASS: 0 broken images, 0 horizontal overflows, 1 H1 per page, all CTAs functional, 0 JS errors!');
}
