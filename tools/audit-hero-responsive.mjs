import { chromium } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const origin = process.env.HERO_QA_ORIGIN || 'http://localhost:4322';
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
const redirectFiles = new Set(
  (
    await Promise.all(
      files.map(async (file) => {
        const html = await fs.readFile(file, 'utf8');
        return /http-equiv=["']refresh["']/i.test(html) ? file : null;
      })
    )
  ).filter(Boolean)
);
const routes = files
  .filter((f) => !redirectFiles.has(f))
  .map((f) => '/' + path.relative(dist, f).split(path.sep).join('/').replace(/index\.html$/, '').replace(/\.html$/, ''))
  .map((r) => (r === '' ? '/' : r.replace(/\/$/, '')))
  .filter((r) => !r.startsWith('/admin'));

function classifyFamily(route) {
  if (route === '/') return 'HOME';
  if (route.startsWith('/en')) return 'ENGLISH';
  if (route.startsWith('/servicios')) {
    const parts = route.split('/').filter(Boolean);
    if (parts.length <= 2) return 'SERVICIOS_HUB';
    return 'SERVICIOS_DETALLE';
  }
  if (route.startsWith('/blogs')) return 'BLOGS';
  if (route.startsWith('/tienda')) return route === '/tienda' ? 'TIENDA' : 'PRODUCTO';
  if (['/carrito', '/checkout', '/cuenta', '/tickets', '/agenda', '/comentarios', '/preguntas-frecuentes', '/privacidad', '/terminos', '/garantia', '/404', '/pedido/seguimiento'].includes(route)) return 'UTILITY';
  return 'LANDINGS_SEO';
}

const targetFamilies = new Set(['HOME', 'LANDINGS_SEO', 'SERVICIOS_DETALLE']);
const targetRoutes = [...new Set(routes)].filter((r) => targetFamilies.has(classifyFamily(r)));

console.log(`Auditing ${targetRoutes.length} public landing routes at ${origin}`);

const browser = await chromium.launch();
const results = [];

for (const route of targetRoutes) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let status = 0;
  try {
    const resp = await page.goto(origin + route, { waitUntil: 'networkidle', timeout: 20000 });
    status = resp ? resp.status() : 0;
  } catch (e) {
    results.push({ route, category: 'ERROR', detail: e.message });
    await context.close();
    continue;
  }

  const data = await page.evaluate(() => {
    const h1s = [...document.querySelectorAll('h1')];
    if (!h1s.length) return { noH1: true };
    const h1 = h1s[0];
    const h1Box = h1.getBoundingClientRect();

    // Walk forward through the DOM (document order) starting after h1 to find
    // the first meaningful media element and measure accumulated text length before it.
    function isMedia(el) {
      const tag = el.tagName;
      if (tag === 'IMG' || tag === 'PICTURE' || tag === 'VIDEO' || tag === 'CANVAS') return true;
      if (tag === 'SVG') {
        const r = el.getBoundingClientRect();
        return r.width > 80 && r.height > 80;
      }
      return false;
    }
    function isTinyDecorative(el) {
      const r = el.getBoundingClientRect();
      return r.width < 32 && r.height < 32;
    }

    // Scope the search to the actual hero container: the closest ancestor
    // header/section (or a div whose class mentions "hero") of the H1.
    let heroRoot = h1.closest('header, section, [class*="hero" i]') || h1.parentElement;
    // Walk up while the immediate parent is still effectively the same hero block
    // (covers heroes wrapped as <header><div class="hero">...).
    let outer = heroRoot;
    while (outer.parentElement && /hero/i.test(outer.parentElement.className || '')) {
      outer = outer.parentElement;
    }
    heroRoot = outer;

    const scoped = [...heroRoot.querySelectorAll('*')];
    const h1IndexScoped = scoped.indexOf(h1);
    let mediaEl = null;
    let textBefore = 0;
    for (let i = h1IndexScoped + 1; i < scoped.length; i++) {
      const el = scoped[i];
      if (!mediaEl && isMedia(el) && !isTinyDecorative(el)) {
        mediaEl = el;
      }
      if (!mediaEl && el.children.length === 0 && el.textContent && el.textContent.trim().length > 0) {
        textBefore += el.textContent.trim().length;
      }
    }

    // First H2 anywhere in the document (for below-fold distance context only).
    const all = [...document.body.querySelectorAll('*')];
    const h1Index = all.indexOf(h1);
    let firstH2El = null;
    for (let i = h1Index + 1; i < all.length; i++) {
      if (all[i].tagName === 'H2') { firstH2El = all[i]; break; }
    }

    const mediaBox = mediaEl ? mediaEl.getBoundingClientRect() : null;
    const h2Box = firstH2El ? firstH2El.getBoundingClientRect() : null;

    return {
      h1Text: h1.textContent.trim().slice(0, 80),
      h1Top: h1Box.top,
      h1Bottom: h1Box.bottom,
      hasMedia: !!mediaEl,
      mediaTag: mediaEl ? mediaEl.tagName : null,
      mediaTop: mediaBox ? mediaBox.top : null,
      mediaBottom: mediaBox ? mediaBox.bottom : null,
      mediaHeight: mediaBox ? mediaBox.height : null,
      textBeforeMedia: textBefore,
      h2Top: h2Box ? h2Box.top : null,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      h1Count: h1s.length,
      docHeight: document.documentElement.scrollHeight,
    };
  });

  await context.close();

  if (data.noH1) {
    results.push({ route, category: 'NO_H1', detail: data });
    continue;
  }

  let category;
  if (!data.hasMedia) {
    category = 'NO_REPRESENTATIVE_VISUAL';
  } else if (data.mediaTop < data.h1Bottom) {
    // media appears above/overlapping h1 in DOM order weirdness - still fine if close
    category = 'PASS';
  } else if (data.textBeforeMedia > 400) {
    category = 'NEEDS_MOBILE_REORDER';
  } else if (data.mediaTop - data.h1Bottom > 700) {
    category = 'NEEDS_MOBILE_REORDER';
  } else if (data.mediaHeight > 900) {
    category = 'NEEDS_VISUAL_RESIZE';
  } else {
    category = 'PASS';
  }

  if (data.overflow) category = 'OVERFLOW_' + category;
  if (data.h1Count > 1) category = 'DUPLICATE_H1_' + category;

  results.push({ route, category, detail: data, errors });
}

await browser.close();

const out = path.resolve('tmp/hero-audit');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(results, null, 2));

const summary = {};
for (const r of results) summary[r.category] = (summary[r.category] || 0) + 1;
console.table(summary);
console.log('Routes needing reorder:');
console.log(results.filter((r) => r.category.includes('NEEDS_MOBILE_REORDER')).map((r) => r.route));
console.log('Routes with no visual:');
console.log(results.filter((r) => r.category.includes('NO_REPRESENTATIVE_VISUAL')).map((r) => r.route));
console.log('Routes with issues (overflow/dup h1/errors):');
console.log(results.filter((r) => r.category.startsWith('OVERFLOW') || r.category.startsWith('DUPLICATE') || r.errors?.length).map((r) => ({ route: r.route, category: r.category, errors: r.errors })));
