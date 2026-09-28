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
const astroDir = path.join(dist, '_astro');

if (!fs.existsSync(astroDir)) {
  console.log('No _astro dir found, skipping CSS prune.');
  process.exit(0);
}

// Find all view CSS chunks: *View.*.css
const viewChunks = fs.readdirSync(astroDir)
  .filter(f => f.endsWith('.css') && f.includes('View.'))
  .map(f => {
    const viewName = f.split('.')[0];
    return {
      filename: f,
      viewName,
      href: `/_astro/${f}`,
      size: fs.statSync(path.join(astroDir, f)).size
    };
  });

console.log(`Identified ${viewChunks.length} View CSS chunks in _astro.`);

let totalPrunedLinks = 0;
let totalSavedBytes = 0;
let modifiedFiles = 0;

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  let filePruned = 0;
  let fileSaved = 0;

  // Check for active view marker
  const metaMatch = html.match(/<meta\s+name=["']pixon-active-view["']\s+content=["']([^"']+)["'][^>]*>/i);

  if (metaMatch) {
    const activeView = metaMatch[1];

    for (const chunk of viewChunks) {
      if (chunk.viewName !== activeView) {
        // Remove link for this sibling view
        const linkRegex = new RegExp(`\\s*<link[^>]+rel=["']stylesheet["'][^>]+href=["']${chunk.href.replace('.', '\\.')}["'][^>]*>`, 'g');
        if (linkRegex.test(html)) {
          html = html.replace(linkRegex, '');
          filePruned++;
          fileSaved += chunk.size;
        }
      }
    }

    // Clean up marker tag from final HTML
    html = html.replace(/<meta\s+name=["']pixon-active-view["']\s+content=["'][^"']+["'][^>]*>\s*/i, '');
  }

  if (filePruned > 0) {
    fs.writeFileSync(file, html, 'utf8');
    modifiedFiles++;
    totalPrunedLinks += filePruned;
    totalSavedBytes += fileSaved;
  }
}

console.log(`\n=== SIBLING VIEW CSS PRUNING COMPLETE ===`);
console.log(`Modified HTML files: ${modifiedFiles}`);
console.log(`Total unused <link> tags eliminated: ${totalPrunedLinks}`);
console.log(`Total unused CSS eliminated: ${(totalSavedBytes / (1024 * 1024)).toFixed(2)} MB`);
if (modifiedFiles > 0) {
  console.log(`Average CSS saved per page: ${(totalSavedBytes / modifiedFiles / 1024).toFixed(1)} KB`);
  console.log(`Average requests saved per page: ${(totalPrunedLinks / modifiedFiles).toFixed(0)} requests`);
}
