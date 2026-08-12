import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const SITE_URL = 'https://pixon.com.mx';
const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const PUBLIC_SITEMAP = path.join(ROOT, 'public', 'sitemap.xml');
const DIST_SITEMAP = path.join(DIST_DIR, 'sitemap.xml');
const PUBLIC_XSL = path.join(ROOT, 'public', 'sitemap.xsl');

const BLOCKED_PREFIXES = [
  '/admin',
  '/cuenta',
];

const BLOCKED_PATHS = new Set([
  '/404',
  '/404.html',
  '/b2b',
  '/formateo-optimizacion',
  '/servicios/consola/ventilacion',
]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function toRoute(filePath) {
  const relative = path.relative(DIST_DIR, filePath).replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  return `/${relative.replace(/\.html$/, '')}`;
}

function isBlockedRoute(route) {
  if (BLOCKED_PATHS.has(route)) return true;
  if (route.startsWith('/en/')) return true;
  return BLOCKED_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

function getMeta(content, name) {
  const pattern = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  return content.match(pattern)?.[1]?.trim();
}

function getCanonical(content) {
  return content.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1]?.trim();
}

function normalizeCanonical(href, fallbackRoute) {
  if (!href) return `${SITE_URL}${fallbackRoute === '/' ? '/' : fallbackRoute}`;
  if (href.startsWith('http')) return href;
  return `${SITE_URL}${href.startsWith('/') ? href : `/${href}`}`;
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function buildSitemap() {
  const files = await walk(DIST_DIR);
  const xslContents = await fs.readFile(PUBLIC_XSL);
  const xslVersion = createHash('sha256').update(xslContents).digest('hex').slice(0, 12);
  const urls = new Map();

  for (const file of files) {
    const route = toRoute(file);
    if (isBlockedRoute(route)) continue;

    const content = await fs.readFile(file, 'utf8');
    const robots = getMeta(content, 'robots') || '';
    if (/\bnoindex\b/i.test(robots)) continue;

    const canonical = normalizeCanonical(getCanonical(content), route);
    const canonicalPath = new URL(canonical).pathname.replace(/\/$/, '') || '/';
    if (isBlockedRoute(canonicalPath)) continue;
    if (!canonical.startsWith(SITE_URL)) continue;

    const stat = await fs.stat(file);
    urls.set(canonical, stat.mtime.toISOString().slice(0, 10));
  }

  const body = [...urls.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([loc, lastmod]) => [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      '  </url>',
    ].join('\n'))
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl?v=${xslVersion}"?>`,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    '</urlset>',
    '',
  ].join('\n');
}

const sitemap = await buildSitemap();
await fs.writeFile(DIST_SITEMAP, sitemap, 'utf8');
await fs.writeFile(PUBLIC_SITEMAP, sitemap, 'utf8');

const count = (sitemap.match(/<url>/g) || []).length;
console.log(`Sitemap generado: ${count} URLs indexables`);
