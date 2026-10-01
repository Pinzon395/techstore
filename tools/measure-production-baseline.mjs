import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'https://pixon.com.mx';

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
        cfCache: headers['cf-cache-status'] || 'NONE',
        cacheControl: headers['cache-control'] || 'none',
      });
    } catch (_) {}
  });

  // Inject observer for LCP, CLS, Long Tasks before document starts
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
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1000);
  } catch (err) {
    coldError = err.message;
  }

  const collectMetrics = async (isWarm) => {
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

    let htmlKb = 0;
    let cssKb = 0;
    let jsKb = 0;
    let imageKb = 0;
    let fontKb = 0;
    let totalKb = 0;
    let thirdPartyCount = 0;
    let errorCount = 0;

    for (const r of requests) {
      const kb = r.size / 1024;
      totalKb += kb;
      if (r.type === 'document') htmlKb += kb;
      else if (r.type === 'stylesheet') cssKb += kb;
      else if (r.type === 'script') jsKb += kb;
      else if (r.type === 'image') imageKb += kb;
      else if (r.type === 'font') fontKb += kb;

      if (!r.url.startsWith('https://pixon.com.mx') && !r.url.startsWith('https://www.pixon.com.mx')) {
        thirdPartyCount++;
      }
      if (r.status >= 400) {
        errorCount++;
      }
    }

    return {
      urlPath,
      profile: profile.name,
      isWarm,
      ttfbMs: Math.round(clientMetrics.ttfb),
      fcpMs: Math.round(clientMetrics.fcp),
      lcpMs: Math.round(clientMetrics.perfData?.lcp || clientMetrics.fcp),
      cls: parseFloat((clientMetrics.perfData?.cls || 0).toFixed(4)),
      domContentLoadedMs: Math.round(clientMetrics.domContentLoaded),
      loadMs: Math.round(clientMetrics.loadTime),
      longTasksCount: clientMetrics.perfData?.longTasksCount || 0,
      longTasksTotalMs: Math.round(clientMetrics.perfData?.longTasksTotalMs || 0),
      domNodes: clientMetrics.domNodes,
      maxDepth: clientMetrics.maxDepth,
      navNodes: clientMetrics.navNodes,
      navLinks: clientMetrics.navLinks,
      totalRequests: requests.length,
      thirdPartyRequests: thirdPartyCount,
      errorResponses: errorCount,
      htmlKb: parseFloat(htmlKb.toFixed(1)),
      cssKb: parseFloat(cssKb.toFixed(1)),
      jsKb: parseFloat(jsKb.toFixed(1)),
      imageKb: parseFloat(imageKb.toFixed(1)),
      fontKb: parseFloat(fontKb.toFixed(1)),
      totalKb: parseFloat(totalKb.toFixed(1))
    };
  };

  const coldRes = await collectMetrics(false);
  coldRes.error = coldError;

  // 2. WARM RUN
  requests = [];
  let warmError = null;
  try {
    await page.reload({ waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(1000);
  } catch (err) {
    warmError = err.message;
  }
  const warmRes = await collectMetrics(true);
  warmRes.error = warmError;

  await context.close();
  return { coldRes, warmRes };
}

async function runAudit() {
  console.log('═'.repeat(70));
  console.log('🏁 PIXON PC — RUNNING PRODUCTION PERFORMANCE AUDIT BASELINE');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Routes: ${TARGET_URLS.length}`);
  console.log(`Profiles: ${DEVICE_PROFILES.map(p => p.name).join(', ')}`);
  console.log('═'.repeat(70));

  const browser = await chromium.launch({ headless: true });
  const allResults = [];

  for (const urlPath of TARGET_URLS) {
    console.log(`\nAuditing URL: ${urlPath}`);
    for (const profile of DEVICE_PROFILES) {
      process.stdout.write(`  [${profile.name}] COLD... `);
      const { coldRes, warmRes } = await measurePage(browser, urlPath, profile);
      console.log(`LCP: ${coldRes.lcpMs}ms | DOM: ${coldRes.domNodes} | Transferred: ${coldRes.totalKb}KB`);
      allResults.push(coldRes);

      console.log(`  [${profile.name}] WARM... LCP: ${warmRes.lcpMs}ms | DOM: ${warmRes.domNodes} | Transferred: ${warmRes.totalKb}KB`);
      allResults.push(warmRes);
    }
  }

  await browser.close();

  // Save raw JSON
  const rawPath = path.resolve('tools/baseline-raw.json');
  fs.writeFileSync(rawPath, JSON.stringify(allResults, null, 2), 'utf8');
  console.log(`\nRaw results saved to ${rawPath}`);

  return allResults;
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
