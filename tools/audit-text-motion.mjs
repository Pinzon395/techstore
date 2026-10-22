// Auditoría en navegador real de todas las páginas públicas de dist/:
//  - Texto invisible o casi invisible (color de letra ≈ color del fondo real debajo de él).
//  - Texto que se queda oculto porque una animación de entrada nunca se dispara.
//  - Animaciones: duración, bucles rápidos y si respetan prefers-reduced-motion.
//  - CLS durante el scroll.
// Uso: npm run build && node tools/audit-text-motion.mjs [--routes=/a,/b] [--json=ruta.json]
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const dist = path.resolve('dist');
const PORT = 4339;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', `http://127.0.0.1:${PORT}`).pathname);
    if (pathname.startsWith('/api/')) { res.writeHead(503, { 'Content-Type': 'application/json' }); return res.end('{}'); }
    let file = path.resolve(dist, pathname === '/' ? 'index.html' : pathname.slice(1));
    if (!path.extname(file)) {
      if (await fs.stat(file + '.html').then(() => true, () => false)) file += '.html';
      else file = path.join(file, 'index.html');
    }
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

async function listRoutes() {
  const out = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'admin' && entry.name !== '_astro') await walk(full); continue; }
      if (!entry.name.endsWith('.html') || /admin/.test(entry.name)) continue;
      if (/http-equiv=["']?refresh/i.test(await fs.readFile(full, 'utf8'))) continue; // redirecciones
      const rel = '/' + path.relative(dist, full).replace(/\\/g, '/').replace(/(index)?\.html$/, '');
      out.push(rel === '/' ? '/' : rel.replace(/\/$/, ''));
    }
  }
  await walk(dist);
  return out.sort();
}

// Se ejecuta dentro de la página: revisa los textos visibles del viewport actual.
function inspectViewport() {
  const parse = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (top, bottom) => {
    const a = top.a + bottom.a * (1 - top.a);
    if (!a) return { r: 255, g: 255, b: 255, a: 0 };
    const mix = (k) => (top[k] * top.a + bottom[k] * bottom.a * (1 - top.a)) / a;
    return { r: mix('r'), g: mix('g'), b: mix('b'), a };
  };
  const gradientColors = (img) => (img.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
  const label = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    if (cls) s += '.' + cls;
    const parent = el.parentElement;
    if (parent && parent !== document.body) {
      const pc = typeof parent.className === 'string' ? parent.className.trim().split(/\s+/)[0] : '';
      s = (parent.tagName.toLowerCase() + (pc ? '.' + pc : '')) + ' > ' + s;
    }
    return s;
  };
  const hiddenByDesign = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      if (n.hidden || n.getAttribute('aria-hidden') === 'true' || n.inert) return true;
      if (n.tagName === 'DIALOG' && !n.open) return true;
      if (n.tagName === 'DETAILS' && !n.open && n !== el && !n.querySelector(':scope > summary')?.contains(el)) return true;
      const cs = getComputedStyle(n);
      if (cs.display === 'none') return true;
      if (cs.position === 'absolute' && (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)')) return true;
      if ((parseFloat(cs.width) <= 1 || parseFloat(cs.height) <= 1) && cs.overflow === 'hidden') return true;
    }
    return false;
  };

  const vh = innerHeight, vw = innerWidth;
  const contrast = [], hidden = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (t) => (t.nodeValue.trim().length > 1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (!el || seen.has(el) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION|TITLE)$/.test(el.tagName)) continue;
    seen.add(el);
    const range = document.createRange();
    range.selectNodeContents(t);
    const rect = [...range.getClientRects()].find((r) => r.width > 2 && r.height > 2);
    if (!rect) continue;
    const cx = Math.min(Math.max(rect.left + Math.min(rect.width, 40) / 2, 1), vw - 1);
    const cy = rect.top + rect.height / 2;
    if (cy < 0 || cy > vh || rect.right < 0 || rect.left > vw) continue;
    if (hiddenByDesign(el)) continue;
    const text = t.nodeValue.trim().replace(/\s+/g, ' ').slice(0, 70);
    const cs = getComputedStyle(el);

    // Opacidad acumulada / visibilidad: texto que una animación dejó escondido.
    let opacity = 1;
    for (let n = el; n; n = n.parentElement) opacity *= parseFloat(getComputedStyle(n).opacity);
    if (cs.visibility === 'hidden' || opacity < 0.15) {
      let cycling = false;
      for (let n = el; n && !cycling; n = n.parentElement) {
        cycling = n.getAnimations().some((a) => a.effect?.getTiming?.().iterations === Infinity);
      }
      if (!cycling) hidden.push({ el: label(el), text, opacity: +opacity.toFixed(2), visibility: cs.visibility });
      continue;
    }

    // Color de letra (incluye texto con degradado recortado).
    let fgList = [];
    const fill = cs.webkitTextFillColor;
    const clipText = (cs.webkitBackgroundClip || cs.backgroundClip) === 'text';
    if (clipText && cs.backgroundImage !== 'none') fgList = gradientColors(cs.backgroundImage);
    else fgList = [parse(fill && !/^rgba\(0, 0, 0, 0\)$/.test(fill) ? fill : cs.color)];
    fgList = fgList.filter(Boolean);
    if (!fgList.length) continue;

    // Fondo real debajo del texto: capas en ese punto, de arriba hacia abajo.
    const stack = document.elementsFromPoint(cx, cy);
    // Tapado por otro elemento (barra fija, botón flotante, banner): no es problema de color.
    const topHit = stack.find((n) => getComputedStyle(n).pointerEvents !== 'none');
    if (topHit && !el.contains(topHit) && !topHit.contains(el)) continue;
    const layers = [];
    let media = false, gradient = null;
    for (const node of stack) {
      if (node === el && clipText) continue;
      if (/^(IMG|VIDEO|CANVAS|IFRAME|PICTURE)$/.test(node.tagName) || (node instanceof SVGElement && node.tagName.toLowerCase() === 'svg' && !node.contains(el))) {
        if (!node.contains(el)) { media = true; break; }
      }
      const ns = getComputedStyle(node);
      if (ns.backgroundImage && ns.backgroundImage !== 'none' && !(node === el && clipText)) {
        if (/url\(/.test(ns.backgroundImage)) { media = true; break; }
        const cols = gradientColors(ns.backgroundImage);
        if (cols.length) { gradient = cols; break; }
      }
      const bg = parse(ns.backgroundColor);
      if (bg && bg.a > 0) {
        let nodeOpacity = 1;
        for (let n = node; n; n = n.parentElement) nodeOpacity *= parseFloat(getComputedStyle(n).opacity);
        layers.push({ ...bg, a: bg.a * nodeOpacity });
        if (bg.a * nodeOpacity >= 0.999) break;
      }
    }
    const id = String(window.__auditSeq = (window.__auditSeq || 0) + 1);
    const candidate = () => contrast.push({
      id, el: label(el), text, size: parseFloat(cs.fontSize), color: cs.color, fg: fgList,
      rect: { x: Math.max(rect.left, 0), y: Math.max(rect.top, 0), width: Math.min(rect.width, vw - Math.max(rect.left, 0)), height: Math.min(rect.height, vh - Math.max(rect.top, 0)) },
    });
    if (media || gradient) { el.setAttribute('data-audit-id', id); candidate(); continue; }
    const base = { r: 255, g: 255, b: 255, a: 1 };
    const composeOn = (bottom) => layers.reduceRight((acc, l) => over(l, acc), bottom);
    const bgs = [composeOn(base)];
    let worst = Infinity;
    for (const fg of fgList) for (const bg of bgs) {
      const solidFg = over({ ...fg, a: fg.a * Math.min(opacity, 1) }, bg);
      worst = Math.min(worst, ratio(solidFg, bg));
    }
    if (worst < 3) { el.setAttribute('data-audit-id', id); candidate(); }
  }
  return { contrast, hidden };
}

const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratioOf = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// Mide el fondo real: oculta la letra de ese elemento, toma captura del área del texto y compara
// el color de la letra contra los píxeles de fondo (mediana). Funciona sobre degradados e imágenes.
async function measureCandidate(page, c) {
  if (c.rect.width < 2 || c.rect.height < 2) return null;
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-audit-id="${id}"]`);
    if (!el) return;
    el.dataset.auditStyle = el.getAttribute('style') || '';
    el.style.setProperty('color', 'transparent', 'important');
    el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
    el.style.setProperty('text-shadow', 'none', 'important');
  }, c.id);
  let buf;
  try {
    buf = await page.screenshot({ clip: c.rect, animations: 'allow' });
  } finally {
    await page.evaluate((id) => {
      const el = document.querySelector(`[data-audit-id="${id}"]`);
      if (!el) return;
      if (el.dataset.auditStyle) el.setAttribute('style', el.dataset.auditStyle); else el.removeAttribute('style');
      delete el.dataset.auditStyle;
    }, c.id);
  }
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const ratios = [];
  for (const fg of c.fg) {
    for (let i = 0; i < data.length; i += info.channels * 7) {
      const px = [data[i], data[i + 1], data[i + 2]];
      const a = fg.a ?? 1;
      const solid = [0, 1, 2].map((k) => [fg.r, fg.g, fg.b][k] * a + px[k] * (1 - a));
      ratios.push(ratioOf(solid, px));
    }
  }
  ratios.sort((a, b) => a - b);
  return ratios.length ? +ratios[Math.floor(ratios.length / 2)].toFixed(2) : null;
}

async function auditPage(page, route, reduced) {
  const errors = [];
  page.removeAllListeners('pageerror');
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'load', timeout: 45000 });
  await page.evaluate(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; })
      .observe({ type: 'layout-shift', buffered: false });
    document.getElementById('printer-notice')?.querySelector('[data-pnotice-close]')?.click();
    [...document.querySelectorAll('button')].find((b) => /solo esenciales|essential/i.test(b.textContent))?.click();
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /solo esenciales|essential/i.test(b.textContent))?.click());

  const contrast = new Map(), hidden = new Map();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize().height;
  for (let y = 0; y < height; y += Math.round(vh * 0.8)) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(reduced ? 150 : 500); // deja terminar animaciones de entrada
    const r = await page.evaluate(inspectViewport);
    for (const c of r.contrast) {
      const key = c.el + '|' + c.text;
      if (contrast.has(key)) continue;
      const ratio = await measureCandidate(page, c);
      if (ratio !== null && ratio < 3) contrast.set(key, { el: c.el, text: c.text, ratio, size: c.size, color: c.color, y: Math.round(y + c.rect.y) });
    }
    for (const h of r.hidden) hidden.set(h.el + '|' + h.text, h);
  }
  // Un texto "oculto" que reaparece en otra posición del scroll no es bug: se vuelve a revisar al final.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  const motion = await page.evaluate(() => {
    const items = [];
    for (const a of document.getAnimations()) {
      const t = a.effect?.getTiming?.() || {};
      const target = a.effect?.target;
      const name = a.animationName || a.transitionProperty || 'web-animation';
      items.push({
        name, type: a.constructor.name, duration: Number(t.duration) || 0, iterations: t.iterations,
        state: a.playState,
        target: target ? target.tagName.toLowerCase() + (typeof target.className === 'string' && target.className ? '.' + target.className.trim().split(/\s+/)[0] : '') : '',
      });
    }
    return { items, cls: +window.__cls.toFixed(3) };
  });
  return { route, errors, contrast: [...contrast.values()], hidden: [...hidden.values()], motion };
}

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const routes = args.routes ? args.routes.split(',') : await listRoutes();
const browser = await chromium.launch();
const viewports = (args.viewports || 'mobile,desktop').split(',');
const results = [];
const jobs = viewports.flatMap((vp) => routes.map((route) => ({ vp, route })));
const workers = Number(args.workers || 6);
let done = 0;
await Promise.all(Array.from({ length: workers }, async () => {
  const contexts = {};
  for (let job = jobs.shift(); job; job = jobs.shift()) {
    const { vp, route } = job;
    if (!contexts[vp]) {
      const size = vp === 'mobile' ? { width: 390, height: 844 } : { width: 1366, height: 900 };
      const context = await browser.newContext({ viewport: size, reducedMotion: args.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
      contexts[vp] = await context.newPage();
    }
    try {
      const r = await auditPage(contexts[vp], route, Boolean(args.reduced));
      results.push({ vp, ...r });
      console.log(`[${++done}] ${vp} ${route}: contraste<3=${r.contrast.length} ocultos=${r.hidden.length} errores=${r.errors.length} cls=${r.motion.cls}`);
    } catch (e) {
      results.push({ vp, route, fatal: String(e.message).slice(0, 200) });
      console.log(`[${++done}] ${vp} ${route}: FALLO ${String(e.message).slice(0, 120)}`);
    }
  }
  for (const page of Object.values(contexts)) await page.context().close();
}));
await browser.close();
server.close();
const outFile = args.json || 'audit-text-motion.json';
await fs.writeFile(outFile, JSON.stringify(results, null, 1));
const total = (k, f = () => true) => results.reduce((n, r) => n + (r[k] || []).filter(f).length, 0);
console.log(`\nPáginas×vista: ${results.length} · texto invisible (<1.6): ${total('contrast', (c) => c.ratio < 1.6)} · contraste <3: ${total('contrast', (c) => c.ratio < 3)} · <4.5: ${total('contrast')} · ocultos por animación: ${total('hidden')}`);
console.log(`Reporte: ${outFile}`);
