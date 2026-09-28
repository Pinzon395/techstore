import fs from 'node:fs';

const file = process.argv[2] || 'dist/servicios/pc/fuente-poder.html';
const html = fs.readFileSync(file, 'utf8');

const links = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g)].map(m => m[1]);
console.log(`\n=== Inspection of ${file} ===`);
console.log('Total stylesheets:', links.length);
console.log('Stylesheets:\n', links.join('\n'));

const cssFiles = links.filter(l => l.startsWith('/'));
let totalCssBytes = 0;
for (const cssUrl of cssFiles) {
  const localPath = 'dist' + cssUrl.split('?')[0];
  if (fs.existsSync(localPath)) {
    totalCssBytes += fs.statSync(localPath).size;
  }
}
console.log(`Total local CSS bytes: ${(totalCssBytes / 1024).toFixed(1)} KB`);
