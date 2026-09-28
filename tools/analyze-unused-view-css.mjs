import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');

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
console.log(`Found ${htmlFiles.length} HTML files.`);

// Find all view CSS chunks
const astroDir = path.join(dist, '_astro');
const commonClasses = new Set(['container', 'btn', 'active', 'open', 'show', 'hide', 'dark', 'light', 'row', 'col', 'title', 'subtitle', 'text', 'card', 'icon', 'header', 'footer', 'section', 'grid', 'flex', 'wrapper', 'content', 'item', 'list', 'box', 'panel', 'inner', 'actions', 'body', 'badge', 'link', 'desc', 'label']);

const viewCssChunks = fs.readdirSync(astroDir)
  .filter(f => f.endsWith('.css') && f.includes('View.'))
  .map(f => {
    const name = f.split('.')[0];
    const cssContent = fs.readFileSync(path.join(astroDir, f), 'utf8');
    // Extract real class names (.abc-def)
    const classes = [...new Set([...cssContent.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]{2,})/g)].map(m => m[1]))]
      .filter(c => !commonClasses.has(c));
    return { filename: f, name, href: `/_astro/${f}`, classes, size: fs.statSync(path.join(astroDir, f)).size };
  });

console.log(`Identified ${viewCssChunks.length} View CSS chunks in _astro.`);

let totalWastedBytes = 0;
let totalWastedLinks = 0;
let affectedFiles = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  let fileWastedBytes = 0;
  let fileWastedLinks = 0;

  for (const chunk of viewCssChunks) {
    if (html.includes(chunk.href)) {
      // Check if any of chunk's specific classes exist in html
      // At least 1 characteristic class must be in the HTML
      const used = chunk.classes.some(cls => html.includes(cls));
      if (!used) {
        fileWastedBytes += chunk.size;
        fileWastedLinks++;
      }
    }
  }

  if (fileWastedLinks > 0) {
    affectedFiles++;
    totalWastedBytes += fileWastedBytes;
    totalWastedLinks += fileWastedLinks;
  }
}

console.log(`\n=== UNUSED SIBLING VIEW CSS ANALYSIS ===`);
console.log(`Affected HTML files: ${affectedFiles}`);
console.log(`Total wasted <link> tags across pages: ${totalWastedLinks}`);
console.log(`Total wasted CSS bytes (uncompressed) downloaded: ${(totalWastedBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log(`Average wasted CSS per affected page: ${(totalWastedBytes / affectedFiles / 1024).toFixed(1)} KB`);
console.log(`Average wasted requests per affected page: ${(totalWastedLinks / affectedFiles).toFixed(0)} requests`);
