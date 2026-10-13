// Auditoría de cards en vistas con planes/paquetes: misma altura por fila, títulos/precios/CTA alineados, sin overflow ni clipping.
// Uso: node tools/check-card-alignment.mjs <origin> [dirCapturas]   (sale con código 1 si hay problemas)
import { chromium } from 'playwright';
const BASE = process.argv[2];
const OUT = process.argv[3];
// Sin cards visibles la auditoría no prueba nada: se reporta como fallo.
const targets = [['/paquetes', '.pricing-card'], ['/', '.pricing-card'], ['/mantenimiento-preventivo-computadora', '.mpc-symptom-card'], ['/mantenimiento-pc-laptop-domicilio-cancun', '[class*="card"]:not([class*="__"])']];
const widths = [360, 390, 430, 768, 1024, 1280, 1440, 1920];
const b = await chromium.launch();
for (const [path, sel] of targets) for (const w of widths) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 768, hasTouch: w < 768 });
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  const r = await p.evaluate((sel) => {
    const cards = [...document.querySelectorAll(sel)].filter((c) => c.offsetParent && c.getBoundingClientRect().width > 120);
    const rows = {};
    for (const c of cards) { const t = Math.round(c.getBoundingClientRect().top + scrollY); (rows[Math.round(t / 8)] ||= []).push(c); }
    const issues = [];
    const rel = (c, q) => { const e = c.querySelector(q); return e ? Math.round(e.getBoundingClientRect().top - c.getBoundingClientRect().top) : null; };
    const relB = (c, q) => { const e = [...c.querySelectorAll(q)].pop(); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
    for (const row of Object.values(rows)) {
      if (row.length < 2) continue;
      const hs = row.map((c) => Math.round(c.getBoundingClientRect().height));
      if (Math.max(...hs) - Math.min(...hs) > 2) issues.push('height ' + hs.join('/'));
      for (const [n, q] of [['title', 'h2,h3,h4'], ['price', '.price,[class*="price"]']]) {
        const v = row.map((c) => rel(c, q)).filter((x) => x !== null);
        if (v.length > 1 && Math.max(...v) - Math.min(...v) > 3) issues.push(n + ' ' + v.join('/'));
      }
      const btn = row.map((c) => relB(c, 'a.btn,a[class*="btn"],button,a[class*="cta"]')).filter((x) => x !== null);
      if (btn.length > 1 && Math.max(...btn) - Math.min(...btn) > 3) issues.push('button-bottom ' + btn.join('/'));
    }
    let clip = 0;
    for (const c of cards) for (const e of c.querySelectorAll('*')) {
      const cs = getComputedStyle(e);
      if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && /hidden|clip/.test(cs.overflowX) ) clip++;
      const r = e.getBoundingClientRect(), cr = c.getBoundingClientRect();
      if (r.width && (r.right > cr.right + 1 || r.left < cr.left - 1) && cs.position !== 'absolute') clip++;
    }
    const maxH = Math.max(0, ...cards.map((c) => Math.round(c.getBoundingClientRect().height)));
    return { n: cards.length, rows: Object.values(rows).map((r) => r.length).join(','), maxH, overflow: document.documentElement.scrollWidth - innerWidth, clip, issues };
  }, sel);
  console.log(path, w, JSON.stringify(r));
  if (!r.n || r.issues.length || r.overflow > 0 || r.clip) process.exitCode = 1;
  if (OUT && [390, 1440].includes(w)) { const el = await p.$(sel); if (el) { await el.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/${path.replace(/\//g, '_')}_${w}.png` }); } }
  await ctx.close();
}
await b.close();
