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

await new Promise((r) => server.listen(4329, r));
console.log('Test server ready at http://localhost:4329');

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
  const consoleErrors = [];
  mobilePage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  mobilePage.on('pageerror', (err) => consoleErrors.push(err.message));

  await mobilePage.goto('http://localhost:4329/servicios/telefono/reparacion-iphone', { waitUntil: 'networkidle' });

  const mobileMetrics = await mobilePage.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const h1Elements = Array.from(document.querySelectorAll('h1')).map((h) => h.textContent.trim());

    // Check headings hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map((h) => ({
      tag: h.tagName,
      text: h.textContent.trim().slice(0, 50),
    }));

    // Check outside-hero text colors
    const nonHeroTexts = Array.from(document.querySelectorAll('.iar-sintomas p, .iar-proceso p, .iar-cobertura p, .iar-route-banner p')).map((el) => {
      const style = window.getComputedStyle(el);
      return { tag: el.tagName, color: style.color, text: el.textContent.trim().slice(0, 30) };
    });

    // Check elements overflowing viewport width
    const overflowing = [];
    document.querySelectorAll('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > clientWidth + 1) {
        overflowing.push({ tag: el.tagName, class: el.className, right: rect.right, width: rect.width });
      }
    });

    // Check CTAs
    const waBtns = Array.from(document.querySelectorAll('a[href*="wa.me"]')).map((b) => ({
      text: b.textContent.trim(),
      href: b.href,
      visible: b.offsetWidth > 0 && b.offsetHeight > 0,
    }));

    const ticketBtns = Array.from(document.querySelectorAll('a[href*="ticket"], button[type="submit"]')).map((b) => ({
      text: b.textContent.trim(),
      visible: b.offsetWidth > 0 && b.offsetHeight > 0,
    }));

    const iconDebug = Array.from(document.querySelectorAll('.iar-route-icon i, .iar-cov-icon i')).map((i) => {
      const s = window.getComputedStyle(i);
      return {
        className: i.className,
        color: s.color,
        fontSize: s.fontSize,
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        fontFamily: s.fontFamily,
        width: i.offsetWidth,
        height: i.offsetHeight,
        parentClass: i.parentElement?.className,
      };
    });

    return {
      scrollWidth,
      clientWidth,
      hasHorizontalOverflow: scrollWidth > clientWidth,
      h1Count: h1Elements.length,
      h1Elements,
      headingsCount: headings.length,
      overflowing,
      sampleColors: nonHeroTexts.slice(0, 8),
      waBtns,
      ticketBtns,
      iconDebug,
    };
  });

  console.log('--- MOBILE (390x844) METRICS ---');
  console.log(JSON.stringify(mobileMetrics, null, 2));

  await mobilePage.evaluate(() => document.fonts.ready);
  await fs.mkdir('tmp', { recursive: true });
  await mobilePage.screenshot({ path: 'tmp/iphone-mobile.png', fullPage: true });
  const sintElM = await mobilePage.$('.iar-sintomas');
  if (sintElM) await sintElM.screenshot({ path: 'tmp/sintomas-mobile.png' });
  const procElM = await mobilePage.$('.iar-proceso');
  if (procElM) await procElM.screenshot({ path: 'tmp/proceso-mobile.png' });
  const heroElM = await mobilePage.$('.iar-hero');
  if (heroElM) await heroElM.screenshot({ path: 'tmp/hero-mobile.png' });
  const routeElM = await mobilePage.$('.iar-route-banner');
  if (routeElM) await routeElM.screenshot({ path: 'tmp/route-mobile.png' });
  const cobElM = await mobilePage.$('.iar-cobertura');
  if (cobElM) await cobElM.screenshot({ path: 'tmp/cobertura-mobile.png' });

  // 2. Desktop (1366x768)
  const desktopContext = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:4329/servicios/telefono/reparacion-iphone', { waitUntil: 'networkidle' });
  await desktopPage.evaluate(() => document.fonts.ready);

  const desktopMetrics = await desktopPage.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    return {
      scrollWidth,
      clientWidth,
      hasHorizontalOverflow: scrollWidth > clientWidth,
    };
  });

  console.log('--- DESKTOP (1366x768) METRICS ---');
  console.log(JSON.stringify(desktopMetrics, null, 2));

  await desktopPage.screenshot({ path: 'tmp/iphone-desktop.png', fullPage: true });
  const heroElD = await desktopPage.$('.iar-hero');
  if (heroElD) await heroElD.screenshot({ path: 'tmp/hero-desktop.png' });
  const routeElD = await desktopPage.$('.iar-route-banner');
  if (routeElD) await routeElD.screenshot({ path: 'tmp/route-desktop.png' });
  const sintElD = await desktopPage.$('.iar-sintomas');
  if (sintElD) await sintElD.screenshot({ path: 'tmp/sintomas-desktop.png' });
  const procElD = await desktopPage.$('.iar-proceso');
  if (procElD) await procElD.screenshot({ path: 'tmp/proceso-desktop.png' });
  const cobElD = await desktopPage.$('.iar-cobertura');
  if (cobElD) await cobElD.screenshot({ path: 'tmp/cobertura-desktop.png' });

  console.log('Console errors found:', consoleErrors.length);
  if (consoleErrors.length) console.log(consoleErrors);
} finally {
  await browser.close();
  server.close();
}
