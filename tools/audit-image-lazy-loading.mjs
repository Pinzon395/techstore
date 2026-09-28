import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve('src');

async function walk(dir, out = []) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (e.isFile() && e.name.endsWith('.astro')) out.push(full);
  }
  return out;
}

const astroFiles = await walk(srcDir);
console.log(`Found ${astroFiles.length} .astro files in src.`);

let missingLazyCount = 0;
const missingFiles = [];

for (const file of astroFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(srcDir, file).replaceAll(path.sep, '/');
  // Match <img> tags that are not hero LCP images
  const imgs = [...content.matchAll(/<img\b([^>]+)>/gi)];
  const unlazy = [];
  for (const m of imgs) {
    const tag = m[0];
    const attrs = m[1];
    // Check if hero image or explicit eager or logo
    const isLazy = attrs.includes('loading="lazy"') || attrs.includes("loading='lazy'");
    const isEager = attrs.includes('loading="eager"') || attrs.includes("loading='eager'");
    const isHero = attrs.includes('fetchpriority="high"') || /hero/i.test(attrs) || /logo/i.test(attrs);
    if (!isLazy && !isHero && !isEager) {
      const src = attrs.match(/src=["']([^"']+)["']/)?.[1] || '';
      unlazy.push({ tag, src });
    }
  }
  if (unlazy.length > 0) {
    missingFiles.push({ file: rel, count: unlazy.length, samples: unlazy.slice(0, 3) });
    missingLazyCount += unlazy.length;
  }
}

console.log(`\n=== AUDIT: IMAGES MISSING LAZY LOADING ===`);
console.log(`Total images missing lazy loading (non-hero): ${missingLazyCount}`);
console.log(`Total files with missing lazy loading: ${missingFiles.length}`);
console.table(missingFiles.map(f => ({ file: f.file, count: f.count, sampleSrc: f.samples[0]?.src })));
