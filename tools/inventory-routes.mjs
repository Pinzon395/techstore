import { promises as fs } from 'node:fs';
import path from 'node:path';

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
const redirectFiles = new Set((await Promise.all(files.map(async (file) => {
  const html = await fs.readFile(file, 'utf8');
  return /http-equiv=["']refresh["']/i.test(html) ? file : null;
}))).filter(Boolean));

const publicRoutes = files
  .filter((f) => !redirectFiles.has(f))
  .map((f) => '/' + path.relative(dist, f).split(path.sep).join('/').replace(/index\.html$/, '').replace(/\.html$/, ''))
  .map((r) => r === '' ? '/' : r.replace(/\/$/, ''))
  .filter((r) => !r.startsWith('/admin'));

const sitemapXml = await fs.readFile('public/sitemap.xml', 'utf8');
const sitemapUrls = new Set([...sitemapXml.matchAll(/<loc>https:\/\/pixon\.com\.mx([^<]*)<\/loc>/g)].map(m => m[1] || '/'));

function classifyFamily(route) {
  if (route === '/') return 'HOME';
  if (route.startsWith('/en')) return 'ENGLISH';
  if (route.startsWith('/servicios')) {
    const parts = route.split('/').filter(Boolean);
    if (parts.length === 1) return 'SERVICIOS_HUB';
    if (parts.length === 2) return 'SERVICIOS_HUB'; // /servicios/pc, /servicios/laptop, etc.
    return 'SERVICIOS_DETALLE';
  }
  if (route.startsWith('/blogs')) return 'BLOGS';
  if (route.startsWith('/tienda')) {
    if (route === '/tienda') return 'TIENDA';
    return 'PRODUCTO';
  }
  if (route === '/carrito') return 'CARRITO';
  if (route === '/checkout') return 'CHECKOUT';
  if (route === '/cuenta') return 'CUENTA';
  if (route === '/tickets') return 'TICKETS';
  if (route === '/agenda') return 'AGENDA';
  if (route === '/comentarios') return 'COMENTARIOS';
  if (route === '/preguntas-frecuentes') return 'FAQ';
  if (route === '/privacidad' || route === '/terminos' || route === '/garantia') return 'LEGAL';
  if (route === '/404') return 'ERROR_404';
  return 'LANDINGS_SEO';
}

const classified = publicRoutes.map(route => ({
  route,
  family: classifyFamily(route),
  inSitemap: sitemapUrls.has(route)
}));

console.log(`Total public routes in dist: ${classified.length}`);
console.log(`In sitemap: ${classified.filter(c => c.inSitemap).length}`);
console.log(`Not in sitemap: ${classified.filter(c => !c.inSitemap).length}`);

const familyCounts = {};
for (const item of classified) {
  familyCounts[item.family] = (familyCounts[item.family] || 0) + 1;
}
console.table(familyCounts);

const notInSitemap = classified.filter(c => !c.inSitemap);
if (notInSitemap.length) {
  console.log('Routes not in sitemap:', notInSitemap.map(c => c.route));
}
