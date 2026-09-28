import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const dist = path.resolve('dist');

async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = await walk(dist);
const redirectFiles = new Set((await Promise.all(files.map(async (file) => {
  const html = await fs.readFile(file, 'utf8');
  return /http-equiv=["']refresh["']/i.test(html) ? file : null;
}))).filter(Boolean));

const publicRoutes = files
  .filter((f) => !redirectFiles.has(f))
  .map((f) => {
    const rel = path.relative(dist, f).split(path.sep).join('/');
    const r = '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '');
    return r === '/' ? '/' : r.replace(/\/$/, '');
  })
  .filter((r) => !r.startsWith('/admin') && r !== '/404' && r !== '/en/404');

function getRouteWeight(r) {
  if (r === '/') return 0;
  if (r === '/servicios') return 1;
  if (r.startsWith('/servicios') && r.split('/').length === 3) return 2;
  if (r.startsWith('/servicios')) return 3;
  if (r.startsWith('/blogs')) return 4;
  if (r.startsWith('/tienda')) return 5;
  if (r === '/carrito' || r === '/checkout') return 6;
  if (r.startsWith('/en')) return 8;
  return 7;
}

const sortedRoutes = [...new Set(publicRoutes)].sort((a, b) => {
  const wa = getRouteWeight(a);
  const wb = getRouteWeight(b);
  if (wa !== wb) return wa - wb;
  return a.localeCompare(b);
});

console.log(`Starting AFTER measurement of ${sortedRoutes.length} public routes...`);

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
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1:4326').pathname);
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
    });
    res.end(body);
  } catch (err) {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise((resolve) => server.listen(4326, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  // Mobile viewport (390x844)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();

  for (let i = 0; i < sortedRoutes.length; i++) {
    const route = sortedRoutes[i];
    const reqs = [];
    const consoleErrors = [];
    const pageErrors = [];

    const onConsole = (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    };
    const onPageError = (err) => pageErrors.push(err.message);
    const onRequest = (req) => {
      reqs.push({
        url: req.url(),
        resourceType: req.resourceType(),
        method: req.method()
      });
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('request', onRequest);

    const responses = new Map();
    const onResponse = async (res) => {
      try {
        const u = res.url();
        const status = res.status();
        let size = 0;
        const headers = res.headers();
        if (headers['content-length']) {
          size = parseInt(headers['content-length'], 10);
        } else {
          const buffer = await res.body().catch(() => Buffer.alloc(0));
          size = buffer.length;
        }
        responses.set(u, { status, size, type: res.request().resourceType() });
      } catch {}
    };
    page.on('response', onResponse);

    let navStatus = 0;
    let timing = {};
    let domCount = 0;
    let lcp = null;

    try {
      const resp = await page.goto(`http://127.0.0.1:4326${route}`, {
        waitUntil: 'networkidle',
        timeout: 15_000
      });
      navStatus = resp ? resp.status() : 0;

      const metrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0] || {};
        const domNodes = document.querySelectorAll('*').length;

        let lcpVal = 0;
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) {
          lcpVal = lcpEntries[lcpEntries.length - 1].startTime;
        }

        return {
          domCount: domNodes,
          domContentLoaded: perf.domContentLoadedEventEnd || 0,
          load: perf.loadEventEnd || 0,
          lcp: lcpVal
        };
      });

      domCount = metrics.domCount;
      timing = {
        domContentLoaded: Math.round(metrics.domContentLoaded),
        load: Math.round(metrics.load)
      };
      lcp = Math.round(metrics.lcp);
    } catch (err) {
      consoleErrors.push(`Navigation error: ${err.message}`);
    }

    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('request', onRequest);
    page.off('response', onResponse);

    let htmlBytes = 0;
    let cssBytes = 0;
    let jsBytes = 0;
    let imageBytes = 0;
    let fontBytes = 0;
    let otherBytes = 0;

    for (const [url, info] of responses.entries()) {
      const sz = info.size;
      const t = info.type;
      if (t === 'document') htmlBytes += sz;
      else if (t === 'stylesheet') cssBytes += sz;
      else if (t === 'script') jsBytes += sz;
      else if (t === 'image') imageBytes += sz;
      else if (t === 'font') fontBytes += sz;
      else otherBytes += sz;
    }

    const totalBytes = htmlBytes + cssBytes + jsBytes + imageBytes + fontBytes + otherBytes;

    const result = {
      route,
      status: navStatus,
      requests: responses.size,
      totalBytes,
      htmlBytes,
      cssBytes,
      jsBytes,
      imageBytes,
      fontBytes,
      domCount,
      lcp,
      timing,
      errors: [...consoleErrors, ...pageErrors]
    };

    results.push(result);

    if ((i + 1) % 25 === 0 || i === sortedRoutes.length - 1) {
      console.log(`[${i + 1}/${sortedRoutes.length}] Audited: ${route} (${(totalBytes / 1024).toFixed(1)} KB, ${responses.size} reqs, CSS: ${(cssBytes / 1024).toFixed(1)} KB)`);
    }
  }

  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

await fs.writeFile('tmp/baseline-after.json', JSON.stringify(results, null, 2));

// Load before baseline
const beforeRaw = await fs.readFile('tmp/baseline-mobile.json', 'utf8').catch(() => '[]');
const beforeResults = JSON.parse(beforeRaw);
const beforeMap = new Map(beforeResults.map(r => [r.route, r]));

// Compare Before vs After
const totalRoutes = results.length;
const sortedAfterBytes = [...results].sort((a, b) => a.totalBytes - b.totalBytes);
const sortedAfterReqs = [...results].sort((a, b) => a.requests - b.requests);
const sortedAfterDom = [...results].sort((a, b) => a.domCount - b.domCount);

const medianAfterTransfer = Math.round(sortedAfterBytes[Math.floor(totalRoutes / 2)].totalBytes / 1024);
const p75AfterTransfer = Math.round(sortedAfterBytes[Math.floor(totalRoutes * 0.75)].totalBytes / 1024);
const medianAfterRequests = sortedAfterReqs[Math.floor(totalRoutes / 2)].requests;
const medianAfterDom = sortedAfterDom[Math.floor(totalRoutes / 2)].domCount;

const sortedBeforeBytes = [...beforeResults].sort((a, b) => a.totalBytes - b.totalBytes);
const sortedBeforeReqs = [...beforeResults].sort((a, b) => a.requests - b.requests);
const sortedBeforeDom = [...beforeResults].sort((a, b) => a.domCount - b.domCount);

const medianBeforeTransfer = Math.round(sortedBeforeBytes[Math.floor(beforeResults.length / 2)].totalBytes / 1024);
const p75BeforeTransfer = Math.round(sortedBeforeBytes[Math.floor(beforeResults.length * 0.75)].totalBytes / 1024);
const medianBeforeRequests = sortedBeforeReqs[Math.floor(beforeResults.length / 2)].requests;
const medianBeforeDom = sortedBeforeDom[Math.floor(beforeResults.length / 2)].domCount;

console.log('\n======================================================');
console.log('            BEFORE VS AFTER COMPARISON (MOBILE 390x844) ');
console.log('======================================================');
console.log(`Routes Audited:     ${totalRoutes}`);
console.log(`Median Transfer:    ${medianBeforeTransfer} KB  →  ${medianAfterTransfer} KB   (-${medianBeforeTransfer - medianAfterTransfer} KB, -${(((medianBeforeTransfer - medianAfterTransfer) / medianBeforeTransfer) * 100).toFixed(1)}%)`);
console.log(`P75 Transfer:       ${p75BeforeTransfer} KB  →  ${p75AfterTransfer} KB   (-${p75BeforeTransfer - p75AfterTransfer} KB, -${(((p75BeforeTransfer - p75AfterTransfer) / p75BeforeTransfer) * 100).toFixed(1)}%)`);
console.log(`Median Requests:    ${medianBeforeRequests} reqs  →  ${medianAfterRequests} reqs   (-${medianBeforeRequests - medianAfterRequests} reqs, -${(((medianBeforeRequests - medianAfterRequests) / medianBeforeRequests) * 100).toFixed(1)}%)`);
console.log(`Median DOM Nodes:   ${medianBeforeDom} nodes  →  ${medianAfterDom} nodes`);

// Top 5 biggest wins
const wins = [];
for (const after of results) {
  const before = beforeMap.get(after.route);
  if (before) {
    const savedBytes = before.totalBytes - after.totalBytes;
    const savedReqs = before.requests - after.requests;
    const savedCss = before.cssBytes - after.cssBytes;
    wins.push({
      route: after.route,
      savedBytes,
      savedReqs,
      savedCss,
      beforeBytes: before.totalBytes,
      afterBytes: after.totalBytes
    });
  }
}

wins.sort((a, b) => b.savedBytes - a.savedBytes);

console.log('\n--- TOP 5 BIGGEST WINS ---');
wins.slice(0, 5).forEach((w, i) => {
  console.log(`${i + 1}. ${w.route}: -${(w.savedBytes / 1024).toFixed(1)} KB (-${(w.savedCss / 1024).toFixed(1)} KB CSS, -${w.savedReqs} reqs) | ${(w.beforeBytes / 1024).toFixed(1)}KB → ${(w.afterBytes / 1024).toFixed(1)}KB`);
});

// Worst remaining
console.log('\n--- TOP 5 WORST REMAINING ROUTES ---');
const worstAfter = [...results].sort((a, b) => b.totalBytes - a.totalBytes).slice(0, 5);
for (const r of worstAfter) {
  console.log(`${r.route}: ${(r.totalBytes / 1024).toFixed(1)} KB | ${r.requests} reqs | CSS: ${(r.cssBytes/1024).toFixed(1)}KB | JS: ${(r.jsBytes/1024).toFixed(1)}KB | IMG: ${(r.imageBytes/1024).toFixed(1)}KB | DOM: ${r.domCount}`);
}

// Errors check
const errors = results.flatMap(r => r.errors.map(e => `${r.route}: ${e}`));
console.log(`\nTotal console/page errors across 199 routes: ${errors.length}`);
if (errors.length) {
  errors.slice(0, 10).forEach(e => console.log('  -', e));
}
