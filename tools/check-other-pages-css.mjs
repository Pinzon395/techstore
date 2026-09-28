import fs from 'node:fs';

const pages = ['dist/index.html', 'dist/tienda.html', 'dist/blogs.html', 'dist/en/index.html'];
for (const p of pages) {
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf8');
  const links = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["'](\/_astro\/([^.]+)\.[^.]+\.css)["']/g)];
  console.log(`${p}: ${links.length} _astro CSS chunks`);
  const viewChunks = links.filter(l => l[2].includes('View'));
  if (viewChunks.length > 0) {
    console.log(`  WARNING: Has ${viewChunks.length} View chunks:`, viewChunks.map(v => v[2]));
  }
}
