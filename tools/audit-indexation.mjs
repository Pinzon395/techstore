import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const sitemapFile = path.join(root, 'public', 'sitemap.xml');
const robotsFile = path.join(root, 'public', 'robots.txt');
const siteUrl = 'https://pixon.com.mx';

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

function routeFromFile(file) {
  const relative = path.relative(dist, file).replaceAll(path.sep, '/');
  return relative === 'index.html' ? '/' : `/${relative.replace(/\.html$/, '')}`;
}

function normalizePath(value) {
  return new URL(value, siteUrl).pathname.replace(/\/$/, '') || '/';
}

function findMeta(html, name) {
  return html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] || '';
}

function findCanonical(html) {
  return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || '';
}

if (!fs.existsSync(dist) || !fs.existsSync(sitemapFile) || !fs.existsSync(robotsFile)) {
  console.error('Falta dist/, public/sitemap.xml o public/robots.txt. Ejecuta pnpm build primero.');
  process.exit(1);
}

const sitemap = new Set([...fs.readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
const robots = fs.readFileSync(robotsFile, 'utf8');
const sitemapDirective = robots.match(/^Sitemap:\s*(\S+)$/mi)?.[1];
const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)$/gmi)].map((match) => match[1]);
const pages = [];
const problems = [];

for (const file of walk(dist)) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeFromFile(file);
  const robotsMeta = findMeta(html, 'robots').toLowerCase();
  const isNoindex = robotsMeta.includes('noindex');
  const canonical = findCanonical(html);
  const canonicalUrl = canonical.startsWith('http') ? canonical : `${siteUrl}${canonical.startsWith('/') ? canonical : `/${canonical}`}`;
  pages.push({ route, isNoindex, canonicalUrl });

  if (isNoindex) continue;
  if (!/<title>[^<]+<\/title>/i.test(html)) problems.push(`${route}: falta title`);
  if (!findMeta(html, 'description')) problems.push(`${route}: falta meta description`);
  if (!canonical) problems.push(`${route}: falta canonical`);
  if ((html.match(/<h1\b/gi) || []).length !== 1) problems.push(`${route}: debe tener un H1`);
  if (canonical && normalizePath(canonicalUrl) !== normalizePath(route)) problems.push(`${route}: canonical no coincide con la URL indexable`);
  if (!sitemap.has(canonicalUrl)) problems.push(`${route}: falta en sitemap`);
}

const indexableCanonicals = new Set(pages.filter((page) => !page.isNoindex).map((page) => page.canonicalUrl));
for (const url of sitemap) {
  if (!indexableCanonicals.has(url)) problems.push(`${url}: aparece en sitemap sin una vista indexable generada`);
}

if (sitemapDirective !== `${siteUrl}/sitemap.xml`) problems.push('robots.txt debe declarar https://pixon.com.mx/sitemap.xml');
for (const page of pages.filter((page) => !page.isNoindex)) {
  if (disallowed.some((prefix) => prefix !== '/' && (page.route === prefix || page.route.startsWith(`${prefix}/`)))) {
    problems.push(`${page.route}: es indexable pero robots.txt la bloquea`);
  }
}

if (problems.length) {
  console.error(`Auditoria de indexacion fallo: ${problems.length} problema(s)`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Indexacion OK: ${indexableCanonicals.size} vistas indexables, ${pages.length - indexableCanonicals.size} excluidas por noindex y sitemap sincronizado.`);
