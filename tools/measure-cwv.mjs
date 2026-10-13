// Proxy de laboratorio de Core Web Vitals (CLS por ventana de sesión, LCP, TBT) para comparar producción vs local.
// Uso: node tools/measure-cwv.mjs <origin> [mobile|desktop]   (en Git Bash: MSYS_NO_PATHCONV=1 ROUTES=/a,/b ...)
import { chromium } from 'playwright';
const origin = process.argv[2];
const mode = process.argv[3] || 'mobile';
const routes = (process.env.ROUTES || '/,/servicios/telefono,/servicios/pc/tarjeta-video-gpu,/servicios/laptop,/reparaciones,/reparacion-controles,/en/computer-repair,/en/graphics-card-repair,/contacto,/servicios/consola,/ensambles,/limpieza-laptop-liquido,/tienda,/blogs/pasta-termica-vs-metal-liquido').split(',');
const browser = await chromium.launch();
for (const route of routes) {
  const ctx = await browser.newContext(mode === 'mobile'
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (mode === 'mobile') {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  }
  await page.addInitScript(() => {
    window.__cwv = { cls: 0, win: 0, winStart: 0, last: 0, lcp: 0, lcpEl: '', long: 0, shifts: [] };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      if (e.hadRecentInput) return;
      const w = window.__cwv;
      if (e.startTime - w.last > 1000 || e.startTime - w.winStart > 5000) { w.win = 0; w.winStart = e.startTime; }
      w.win += e.value; w.last = e.startTime; w.cls = Math.max(w.cls, w.win);
      if (e.value > 0.01) w.shifts.push(e.value.toFixed(3) + ':' + e.sources.map((s) => s.node ? (s.node.tagName + (s.node.id ? '#' + s.node.id : '') + (typeof s.node.className === 'string' && s.node.className ? '.' + s.node.className.split(/\s+/)[0] : '')) : '?').join('+'));
    })).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => {
      window.__cwv.lcp = e.startTime;
      const n = e.element; window.__cwv.lcpEl = n ? n.tagName + (n.className && typeof n.className === 'string' ? '.' + n.className.split(/\s+/)[0] : '') : '';
    })).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.duration > 50) window.__cwv.long += e.duration - 50; })).observe({ type: 'longtask', buffered: true });
  });
  let status = 0;
  try {
    const res = await page.goto(origin + route, { waitUntil: 'load', timeout: 60_000 });
    status = res?.status() || 0;
    await page.waitForTimeout(2500);
    // Recorre la página como un usuario para capturar CLS fuera de la primera pantalla.
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(350); }
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => window.__cwv);
    console.log(`${route} [${status}] LCP ${(r.lcp / 1000).toFixed(2)}s (${r.lcpEl}) | CLS ${r.cls.toFixed(3)} | TBT~ ${Math.round(r.long)}ms | ${r.shifts.slice(0, 4).join(' ; ')}`);
  } catch (e) { console.log(`${route} ERROR ${e.message.slice(0, 80)}`); }
  await ctx.close();
}
await browser.close();
