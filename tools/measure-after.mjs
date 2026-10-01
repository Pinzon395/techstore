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
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

const server = createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1:4328');
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // Mock lightweight API endpoints if requested by frontend so no crashes occur
    if (pathname === '/api/comments') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ ok: true, data: [] }));
    }
    if (pathname.startsWith('/api/appointments/availability/month')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ ok: true, days: {} }));
    }
    if (pathname.startsWith('/api/appointments/availability')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ ok: true, slots: [] }));
    }
    if (pathname === '/api/commerce/catalog') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ ok: true, data: [], meta: { total: 0 } }));
    }

    let relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    let file = path.resolve(dist, relative);
    if (!path.extname(file)) {
      if (await fs.stat(file + '.html').then(() => true).catch(() => false)) {
        file = file + '.html';
      } else if (await fs.stat(path.join(file, 'index.html')).then(() => true).catch(() => false)) {
        file = path.join(file, 'index.html');
      }
    }
    if (!file.startsWith(dist + path.sep) && file !== dist) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    const body = await fs.readFile(file);
    const ext = path.extname(file);
    res.writeHead(200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': ext === '.html' ? 'public, max-age=0' : 'public, max-age=31536000, immutable',
    });
    res.end(body);
  } catch (err) {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise((resolve) => server.listen(4328, '127.0.0.1', resolve));
console.log('Static preview server listening on http://127.0.0.1:4328');

const BASE_URL = 'http://127.0.0.1:4328';

const TARGET_URLS = [
  '/',
  '/servicios',
  '/reparaciones',
  '/instalacion-windows',
  '/empresas',
  '/paquetes',
  '/ensambles',
  '/comentarios',
  '/contacto',
  '/catalogo',
  '/tienda',
  '/tickets',
  '/en',
  '/servicios/laptop/diagnostico',
  '/servicios/laptop/mantenimiento-preventivo',
  '/servicios/laptop/cambio-bateria',
  '/servicios/pc/lentitud',
  '/desarrollo-software-paginas-web-cancun'
];

const DEVICE_PROFILES = [
  {
    name: 'DESKTOP_FAST',
    width: 1920,
    height: 1080,
    isMobile: false,
    cpuThrottle: 1,
    network: null
  },
  {
    name: 'MID_MOBILE',
    width: 390,
    height: 844,
    isMobile: true,
    cpuThrottle: 4,
    network: {
      offline: false,
      downloadThroughput: (4000 * 1024) / 8,
      uploadThroughput: (3000 * 1024) / 8,
      latency: 20
    }
  },
  {
    name: 'LOW_END_MOBILE',
    width: 360,
    height: 800,
    isMobile: true,
    cpuThrottle: 6,
    network: {
      offline: false,
      downloadThroughput: (1600 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 150
    }
  }
];

async function measurePage(browser, urlPath, profile) {
  const url = `${BASE_URL}${urlPath}`;
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    isMobile: profile.isMobile,
    userAgent: profile.isMobile
      ? 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  if (profile.cpuThrottle > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuThrottle });
  }

  if (profile.network) {
    await cdp.send('Network.emulateNetworkConditions', profile.network);
  }

  let requests = [];
  page.on('response', async (res) => {
    try {
      const req = res.request();
      const headers = res.headers();
      const status = res.status();
      const resUrl = res.url();
      let size = 0;
      try {
        const buf = await res.body();
        size = buf.length;
      } catch (_) {
        size = parseInt(headers['content-length'] || '0', 10);
      }

      requests.push({
        url: resUrl,
        type: req.resourceType(),
        status,
        size,
        encoding: headers['content-encoding'] || 'none',
        cacheControl: headers['cache-control'] || 'none',
      });
    } catch (_) {}
  });

  await page.addInitScript(() => {
    window.__perfData = {
      lcp: 0,
      cls: 0,
      longTasksCount: 0,
      longTasksTotalMs: 0,
      layoutShifts: 0
    };

    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          window.__perfData.lcp = entries[entries.length - 1].startTime;
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}

    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__perfData.cls += entry.value;
            window.__perfData.layoutShifts++;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}

    try {
      const ltObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          window.__perfData.longTasksCount++;
          window.__perfData.longTasksTotalMs += entry.duration;
        }
      });
      ltObserver.observe({ type: 'longtask', buffered: true });
    } catch (_) {}
  });

  // 1. COLD RUN
  let coldError = null;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 35000 });
    await page.waitForTimeout(600);
  } catch (err) {
    coldError = err.message;
  }

  const collectMetrics = async () => {
    const clientMetrics = await page.evaluate(() => {
      const navEntries = performance.getEntriesByType('navigation');
      const nav = navEntries.length > 0 ? navEntries[0] : null;
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(p => p.name === 'first-contentful-paint');

      function getMaxDepth(node) {
        let max = 0;
        for (let i = 0; i < node.children.length; i++) {
          max = Math.max(max, getMaxDepth(node.children[i]));
        }
        return 1 + max;
      }

      const allElements = document.querySelectorAll('*');
      const navEl = document.querySelector('nav') || document.querySelector('.navbar');
      const navNodes = navEl ? navEl.querySelectorAll('*').length : 0;
      const navLinks = navEl ? navEl.querySelectorAll('a').length : 0;

      return {
        ttfb: nav ? nav.responseStart - nav.requestStart : 0,
        domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
        loadTime: nav ? nav.loadEventEnd - nav.startTime : 0,
        fcp: fcpEntry ? fcpEntry.startTime : 0,
        domNodes: allElements.length,
        maxDepth: document.body ? getMaxDepth(document.body) : 0,
        navNodes,
        navLinks,
        perfData: window.__perfData || {}
      };
    }).catch(() => ({
      ttfb: 0,
      domContentLoaded: 0,
      loadTime: 0,
      fcp: 0,
      domNodes: 0,
      maxDepth: 0,
      navNodes: 0,
      navLinks: 0,
      perfData: {}
    }));

    const typeBreakdown = {
      htmlBytes: 0,
      cssBytes: 0,
      jsBytes: 0,
      imageBytes: 0,
      fontBytes: 0,
      otherBytes: 0,
      totalBytes: 0,
      requestCount: requests.length,
      thirdPartyCount: requests.filter(r => !r.url.includes('127.0.0.1')).length
    };

    for (const req of requests) {
      typeBreakdown.totalBytes += req.size;
      if (req.type === 'document') typeBreakdown.htmlBytes += req.size;
      else if (req.type === 'stylesheet') typeBreakdown.cssBytes += req.size;
      else if (req.type === 'script') typeBreakdown.jsBytes += req.size;
      else if (req.type === 'image') typeBreakdown.imageBytes += req.size;
      else if (req.type === 'font') typeBreakdown.fontBytes += req.size;
      else typeBreakdown.otherBytes += req.size;
    }

    return {
      ...clientMetrics,
      breakdown: typeBreakdown,
      requestsSample: requests.slice(0, 15)
    };
  };

  const coldMetrics = await collectMetrics();

  // 2. WARM RUN
  requests = [];
  try {
    await page.reload({ waitUntil: 'load', timeout: 35000 });
    await page.waitForTimeout(400);
  } catch (_) {}

  const warmMetrics = await collectMetrics();

  await context.close();

  return {
    urlPath,
    profile: profile.name,
    cold: coldMetrics,
    warm: warmMetrics,
    coldError
  };
}

async function runAfterAudit() {
  console.log('=== STARTING AUDIT AFTER OPTIMIZATIONS ===');
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const urlPath of TARGET_URLS) {
    console.log(`Auditing ${urlPath}...`);
    for (const profile of DEVICE_PROFILES) {
      process.stdout.write(`  - Profile: ${profile.name}... `);
      try {
        const metric = await measurePage(browser, urlPath, profile);
        results.push(metric);
        console.log(`DONE: DOM=${metric.cold.domNodes} (nav=${metric.cold.navNodes}), FCP=${Math.round(metric.cold.fcp)}ms, LCP=${Math.round(metric.cold.perfData?.lcp || 0)}ms`);
      } catch (err) {
        console.log(`ERROR: ${err.message}`);
        results.push({ urlPath, profile: profile.name, error: err.message });
      }
    }
  }

  await browser.close();
  server.close();

  const outPath = path.resolve('tools/after-raw.json');
  await fs.writeFile(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nAudit completed! Raw metrics saved to: ${outPath}`);
}

runAfterAudit().catch(err => {
  console.error('Audit run failed:', err);
  server.close();
  process.exit(1);
});
