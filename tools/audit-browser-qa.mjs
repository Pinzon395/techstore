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
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

const server = createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1:4325');
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // Proxy API and auth requests to Express backend on port 3001
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
    
    // Fallback check if html directly exists
    try {
      await fs.access(file);
    } catch {
      // Check public folder if not copied to dist
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

await new Promise((resolve) => server.listen(4325, '127.0.0.1', resolve));

const criticalRoutes = [
  '/',
  '/servicios',
  '/tienda',
  '/contacto',
  '/cuenta',
  '/tickets',
  '/servicios/pc',
  '/servicios/laptop',
  '/servicios/telefono',
  '/servicios/telefono/reparacion-iphone',
  '/servicios/telefono/reparacion-pantalla-iphone',
  '/servicios/consola',
  '/servicios/b2b',
  '/en/computer-repair'
];

const viewports = [
  { name: 'Desktop (1366x768)', width: 1366, height: 768, isMobile: false },
  { name: 'Mobile (390x844)', width: 390, height: 844, isMobile: true }
];

const browser = await chromium.launch({ headless: true });
let totalFailures = 0;

for (const vp of viewports) {
  console.log(`\n--- Testing Viewport: ${vp.name} ---`);
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile
  });
  const page = await context.newPage();

  for (const route of criticalRoutes) {
    const failed404or500 = [];
    const consoleErrors = [];

    page.on('response', (res) => {
      const status = res.status();
      const url = res.url();
      if (status === 404 || status >= 500) {
        // Ignore external trackers if any
        if (url.includes('127.0.0.1:4325')) {
          failed404or500.push(`${status} ${url}`);
        }
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    try {
      const response = await page.goto(`http://127.0.0.1:4325${route}`, {
        waitUntil: 'networkidle',
        timeout: 10000
      });

      if (!response?.ok()) {
        console.error(`❌ [${vp.name}] ${route}: Status ${response?.status()}`);
        totalFailures++;
        continue;
      }

      // Check for broken images in DOM
      const brokenImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs
          .filter((img) => {
            // If lazy loaded, check if visible or has src
            return img.src && (!img.complete || img.naturalWidth === 0);
          })
          .map((img) => img.src);
      });

      // Verify key visual elements
      const elementsCheck = await page.evaluate(() => {
        return {
          hasH1: !!document.querySelector('h1'),
          hasHeader: !!document.querySelector('header') || !!document.querySelector('nav'),
          hasFooter: !!document.querySelector('footer')
        };
      });

      let routeOk = true;
      if (failed404or500.length > 0) {
        console.error(`❌ [${vp.name}] ${route}: Failed requests: ${failed404or500.join(', ')}`);
        routeOk = false;
      }
      if (brokenImages.length > 0) {
        console.error(`❌ [${vp.name}] ${route}: Broken images: ${brokenImages.join(', ')}`);
        routeOk = false;
      }
      if (consoleErrors.length > 0) {
        console.error(`❌ [${vp.name}] ${route}: Console errors: ${consoleErrors.join(', ')}`);
        routeOk = false;
      }
      if (!elementsCheck.hasH1 || !elementsCheck.hasFooter) {
        console.error(`❌ [${vp.name}] ${route}: Missing layout elements (H1: ${elementsCheck.hasH1}, Footer: ${elementsCheck.hasFooter})`);
        routeOk = false;
      }

      if (routeOk) {
        console.log(`✓ [${vp.name}] ${route} OK`);
      } else {
        totalFailures++;
      }
    } catch (e) {
      console.error(`❌ [${vp.name}] ${route}: Exception: ${e.message}`);
      totalFailures++;
    }
  }
  await context.close();
}

await browser.close();
server.close();

if (totalFailures === 0) {
  console.log('\n🎉 BROWSER QA PASSED: 100% CLEAN (0 broken images, 0 404/500, 0 console errors)!');
  process.exit(0);
} else {
  console.error(`\n❌ BROWSER QA FAILED with ${totalFailures} errors.`);
  process.exit(1);
}
