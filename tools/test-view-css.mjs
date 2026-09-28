import fs from 'node:fs';

const html = fs.readFileSync('dist/servicios/telefono/reparacion-pantalla-iphone.html', 'utf8');

// Check what CSS files are in head
const links = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["'](\/_astro\/([^.]+)\.[^.]+\.css)["']/g)];
console.log(`Found ${links.length} _astro CSS chunks in head:`);
for (const m of links) {
  const fullHref = m[1];
  const chunkName = m[2];
  console.log(`- ${chunkName}`);
}
