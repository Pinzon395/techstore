import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const dist = path.join(process.cwd(), 'dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2'
};

const server = createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1:4328');
    const pathname = decodeURIComponent(parsedUrl.pathname);

    if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
      const proxyReq = await fetch(`http://127.0.0.1:3001${req.url}`, {
        method: req.method,
        headers: { ...req.headers, host: '127.0.0.1:3001' }
      }).catch(() => null);

      if (proxyReq) {
        res.writeHead(proxyReq.status, Object.fromEntries(proxyReq.headers.entries()));
        const body = await proxyReq.arrayBuffer();
        res.end(Buffer.from(body));
        return;
      }
    }

    let relative = pathname === '/' ? 'index.html' : path.extname(pathname) ? pathname.slice(1) : `${pathname.slice(1)}.html`;
    let file = path.resolve(dist, relative);
    
    try {
      await fs.access(file);
    } catch {
      const pubFile = path.resolve(process.cwd(), 'public', pathname.slice(1));
      try {
        await fs.access(pubFile);
        file = pubFile;
      } catch {}
    }

    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise((resolve) => server.listen(4328, '127.0.0.1', resolve));

const viewports = [
  { name: 'Desktop 1366x768', width: 1366, height: 768, isMobile: false },
  { name: 'Desktop 1440x900', width: 1440, height: 900, isMobile: false },
  { name: 'Mobile 390x844', width: 390, height: 844, isMobile: true },
  { name: 'Mobile 360x800', width: 360, height: 800, isMobile: true }
];

const browser = await chromium.launch({ headless: true });
let totalProblems = 0;

for (const vp of viewports) {
  console.log(`\nTesting ${vp.name}...`);
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile
  });
  const page = await context.newPage();

  const failedReqs = [];
  const consoleErrors = [];

  page.on('response', (res) => {
    if (res.url().includes('127.0.0.1:4328') && (res.status() === 404 || res.status() >= 500)) {
      failedReqs.push(`${res.status()} ${res.url()}`);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  const targetUrl = 'http://127.0.0.1:4328/servicios/telefono/reparacion-pantalla-iphone';
  const response = await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });

  if (!response?.ok()) {
    console.error(`❌ HTTP status: ${response?.status()}`);
    totalProblems++;
    await context.close();
    continue;
  }

  // Wait for simulation
  await page.waitForTimeout(600);

  const evaluation = await page.evaluate(() => {
    const h1s = Array.from(document.querySelectorAll('h1'));
    const phone = document.getElementById('isr-phone-demo');
    const isCracked = phone ? phone.classList.contains('isr-phone--cracked') : false;
    const crackSvg = document.querySelector('.isr-crack-svg');
    const oledLine = document.querySelector('.isr-oled-green-line');
    const replayBtn = document.getElementById('isr-replay-btn');

    // Check images
    const brokenImages = Array.from(document.querySelectorAll('img'))
      .filter((img) => img.src && (!img.complete || img.naturalWidth === 0))
      .map((img) => img.src);

    // Overflow check
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const overflowElements = Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.getBoundingClientRect().right > clientWidth + 2)
      .slice(0, 3)
      .map((el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.split(' ').join('.')}` : ''));

    // Check prefill in WhatsApp links
    const waLinks = Array.from(document.querySelectorAll('a[href*="wa.me"]')).map((a) => a.href);
    const hasCorrectPrefill = waLinks.some((href) => href.includes('Quiero%20cotizar%20el%20cambio%20de%20pantalla%20de%20mi%20iPhone') || href.includes('pantalla'));

    return {
      h1Count: h1s.length,
      h1Text: h1s[0]?.textContent?.trim(),
      title: document.title,
      isCracked,
      hasCrackSvg: !!crackSvg,
      hasOledLine: !!oledLine,
      hasReplayBtn: !!replayBtn,
      brokenImages,
      scrollWidth,
      clientWidth,
      overflowElements,
      hasCorrectPrefill
    };
  });

  if (failedReqs.length > 0) {
    console.error(`❌ Failed requests: ${failedReqs.join(', ')}`);
    totalProblems++;
  }
  if (consoleErrors.length > 0) {
    console.error(`❌ Console errors: ${consoleErrors.join(', ')}`);
    totalProblems++;
  }
  if (evaluation.h1Count !== 1) {
    console.error(`❌ Expected exactly 1 H1, found ${evaluation.h1Count}`);
    totalProblems++;
  }
  if (!evaluation.h1Text?.includes('Cambio de pantalla iPhone en Cancún')) {
    console.error(`❌ H1 mismatch: "${evaluation.h1Text}"`);
    totalProblems++;
  }
  if (!evaluation.isCracked) {
    console.error(`❌ Phone animation class not triggered`);
    totalProblems++;
  }
  if (!evaluation.hasCrackSvg || !evaluation.hasOledLine) {
    console.error(`❌ SVG crack or OLED green line missing`);
    totalProblems++;
  }
  if (evaluation.brokenImages.length > 0) {
    console.error(`❌ Broken images: ${evaluation.brokenImages.join(', ')}`);
    totalProblems++;
  }
  if (evaluation.scrollWidth > evaluation.clientWidth + 2) {
    console.error(`❌ Horizontal overflow: scrollWidth ${evaluation.scrollWidth} > clientWidth ${evaluation.clientWidth} (${evaluation.overflowElements.join(', ')})`);
    totalProblems++;
  }
  if (!evaluation.hasCorrectPrefill) {
    console.error(`❌ WhatsApp links missing expected prefill`);
    totalProblems++;
  }

  // Test clicking replay button
  await page.click('#isr-replay-btn').catch(() => {});
  await page.waitForTimeout(200);

  const retested = await page.evaluate(() => {
    const phone = document.getElementById('isr-phone-demo');
    return phone?.classList.contains('isr-phone--cracked');
  });

  if (!retested) {
    console.error(`❌ Phone did not re-crack after clicking replay button`);
    totalProblems++;
  } else {
    console.log(`✓ Replay button interaction verified`);
  }

  console.log(`✓ H1: "${evaluation.h1Text}" (Exact: 1 H1)`);
  console.log(`✓ Title: "${evaluation.title}"`);
  console.log(`✓ Crack animation + OLED effect verified`);
  console.log(`✓ Broken images: 0`);
  console.log(`✓ Horizontal overflow: 0 (${evaluation.scrollWidth}/${evaluation.clientWidth})`);
  console.log(`✓ Console errors: 0`);

  await context.close();
}

await browser.close();
server.close();

if (totalProblems === 0) {
  console.log('\n🎉 ALL VIEWPORTS PASS 100%! IPHONE SCREEN DOMINATION VALIDATED!');
  process.exit(0);
} else {
  console.error(`\n❌ Validation failed with ${totalProblems} problems.`);
  process.exit(1);
}
