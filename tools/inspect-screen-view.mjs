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
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
    return;
  }
  let filePath = path.join(dist, urlPath === '/' ? 'index.html' : urlPath);
  try {
    let stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    if (!path.extname(filePath)) filePath += '.html';
  }
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

await new Promise((r) => server.listen(4330, r));
console.log('Test server ready at http://localhost:4330');

const browser = await chromium.launch();

try {
  // 1. Mobile (390x844)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:4330/servicios/telefono/reparacion-pantalla-iphone', { waitUntil: 'networkidle' });
  await mobilePage.evaluate(() => document.fonts.ready);

  await fs.mkdir('tmp', { recursive: true });
  await mobilePage.screenshot({ path: 'tmp/screen-mobile.png', fullPage: true });
  const phoneElM = await mobilePage.$('.isr-phone-container');
  if (phoneElM) await phoneElM.screenshot({ path: 'tmp/phone-mobile.png' });
  const heroElM = await mobilePage.$('.isr-hero');
  if (heroElM) await heroElM.screenshot({ path: 'tmp/screen-hero-mobile.png' });

  // 2. Desktop (1366x768)
  const desktopContext = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:4330/servicios/telefono/reparacion-pantalla-iphone', { waitUntil: 'networkidle' });
  await desktopPage.evaluate(() => document.fonts.ready);

  await desktopPage.screenshot({ path: 'tmp/screen-desktop.png', fullPage: true });
  const phoneElD = await desktopPage.$('.isr-phone-container');
  if (phoneElD) await phoneElD.screenshot({ path: 'tmp/phone-desktop.png' });
  const heroElD = await desktopPage.$('.isr-hero');
  if (heroElD) await heroElD.screenshot({ path: 'tmp/screen-hero-desktop.png' });

  const metrics = await desktopPage.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const clock = document.querySelector('.isr-lock-clock');
    const clockRect = clock ? clock.getBoundingClientRect() : null;
    const phone = document.querySelector('.isr-phone-screen-glass');
    const phoneRect = phone ? phone.getBoundingClientRect() : null;
    return {
      scrollWidth,
      clientWidth,
      clockRelativeTop: clockRect && phoneRect ? clockRect.top - phoneRect.top : null,
      phoneHeight: phoneRect ? phoneRect.height : null,
    };
  });

  console.log('Metrics:', JSON.stringify(metrics, null, 2));
} finally {
  await browser.close();
  server.close();
}
