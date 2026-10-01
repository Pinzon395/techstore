import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
if (!fs.existsSync(dist)) {
  console.error('FAIL: dist directory does not exist. Run npm run build first.');
  process.exit(1);
}

async function walk(dir, out = []) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const htmlFiles = await walk(dist);
let failed = false;

// 1. Guardrail: No sibling view CSS leak (max 15 stylesheets per page, was 58!)
const MAX_STYLESHEETS = 15;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const links = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g)];
  if (links.length > MAX_STYLESHEETS) {
    console.error(`FAIL Guardrail [Stylesheet explosion]: ${path.relative(dist, file)} has ${links.length} stylesheets (limit: ${MAX_STYLESHEETS})`);
    failed = true;
  }
}

// 2. Guardrail: Max local CSS payload per page <= 350 KB uncompressed (was 1,142 KB!)
const MAX_CSS_KB = 350;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const cssLinks = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["'](\/_astro\/[^"']+)["']/g)].map(m => m[1]);
  let totalCssBytes = 0;
  for (const href of cssLinks) {
    const local = path.join(dist, href.split('?')[0]);
    if (fs.existsSync(local)) totalCssBytes += fs.statSync(local).size;
  }
  if (totalCssBytes > MAX_CSS_KB * 1024) {
    console.error(`FAIL Guardrail [CSS size budget]: ${path.relative(dist, file)} has ${(totalCssBytes / 1024).toFixed(1)} KB CSS (limit: ${MAX_CSS_KB} KB)`);
    failed = true;
  }
}

// 3. Guardrail: No image referenced in public HTML exceeds 400 KB
const referencedImages = new Set();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<img[^>]+src=["'](\/assets\/[^"']+)["']/g)) {
    referencedImages.add(match[1].split('?')[0]);
  }
}

for (const imgUrl of referencedImages) {
  const local = path.join(dist, imgUrl.replace(/^\//, ''));
  if (fs.existsSync(local)) {
    const sz = fs.statSync(local).size;
    if (sz > 400 * 1024) {
      console.error(`FAIL Guardrail [Delivered image weight]: ${imgUrl} is ${(sz / 1024).toFixed(1)} KB (limit: 400 KB)`);
      failed = true;
    }
  }
}

// 4. Guardrail: floating-dock.js debe cargarse deferido en todas las páginas
//    (bloquea el parseo del HTML si se quita `defer`; ver src/layouts/Base.astro).
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const match = html.match(/<script[^>]*floating-dock\.js[^>]*>/);
  if (match && !/\bdefer\b/.test(match[0])) {
    console.error(`FAIL Guardrail [floating-dock defer]: ${path.relative(dist, file)} loads floating-dock.js without defer`);
    failed = true;
  }
}

// 5. Guardrail: floating-dock.js no debe volver a observar document.body completo
//    con subtree+attributes (forced-reflow en cada mutación de clase/estilo de la página).
{
  const dockJsPath = path.join(dist, 'scripts', 'floating-dock.js');
  if (fs.existsSync(dockJsPath)) {
    const dockJs = fs.readFileSync(dockJsPath, 'utf8');
    const observesBodySubtree = /observe\(\s*document\.body\s*,\s*\{[^}]*subtree:\s*true[^}]*attributes:\s*true/s.test(dockJs);
    if (observesBodySubtree) {
      console.error('FAIL Guardrail [floating-dock observer scope]: floating-dock.js observes document.body with subtree+attributes (whole-page forced reflow)');
      failed = true;
    }
  }
}

// 6. Guardrail: el hero video (YouTube) debe seguir gateado por low-end-mode/save-data/2g-3g.
//    Si `scheduleHeroVideo()` se llama sin ninguna condición, se rompe el ahorro de datos en hardware bajo.
{
  const homeJsPath = path.join(dist, 'scripts', 'home.js');
  if (fs.existsSync(homeJsPath)) {
    const homeJs = fs.readFileSync(homeJsPath, 'utf8');
    const hasGate = /low-end-mode/.test(homeJs) && /saveData/.test(homeJs);
    if (!hasGate) {
      console.error('FAIL Guardrail [hero video network gate]: home.js no condiciona scheduleHeroVideo() a low-end-mode/saveData/2g-3g');
      failed = true;
    }
  }
}

// 7. Guardrail: el umbral de low-end-mode debe cubrir el hardware objetivo (2-4GB RAM),
//    no solo <2GB (deja fuera la mayoría de los Android económicos reales).
//    El script inline se externaliza con nombre hasheado por página, así que se
//    busca en TODO dist/, no solo en index.html.
{
  async function walkAll(dir, out = []) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walkAll(full, out);
      else if (e.isFile() && (e.name.endsWith('.js') || e.name.endsWith('.html'))) out.push(full);
    }
    return out;
  }
  const allFiles = await walkAll(dist);
  let sawNarrowThreshold = false;
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (/deviceMemory\s*<\s*2\b/.test(content)) {
      sawNarrowThreshold = true;
      console.error(`FAIL Guardrail [low-end-mode threshold]: ${path.relative(dist, file)} usa deviceMemory<2; el umbral debe ser <=4 para cubrir 2-4GB RAM`);
    }
  }
  if (sawNarrowThreshold) failed = true;
}

if (failed) {
  console.error('\nPerformance guardrail checks FAILED.');
  process.exit(1);
} else {
  console.log(`Performance guardrail checks OK: all ${htmlFiles.length} pages respect stylesheet count, CSS size, asset weight, and low-end-mode regression guards.`);
}
