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

if (failed) {
  console.error('\nPerformance guardrail checks FAILED.');
  process.exit(1);
} else {
  console.log(`Performance guardrail checks OK: all ${htmlFiles.length} pages respect stylesheet count, CSS size, and asset weight limits.`);
}
