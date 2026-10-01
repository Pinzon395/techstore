import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const output = path.resolve('docs/SEO_URL_MAP.csv');
const site = 'https://pixon.com.mx';
const pages = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.html')) pages.push(file);
  }
}

function clean(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, ' ').trim();
}

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] || '';
}

function tagContent(html, tag) {
  return clean(html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]);
}

function meta(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return attr(tags.find((tag) => attr(tag, 'name').toLowerCase() === name) || '', 'content');
}

function routeFor(file) {
  const relative = path.relative(dist, file).replaceAll(path.sep, '/');
  return relative === 'index.html' ? '/' : `/${relative.replace(/\.html$/, '')}`;
}

function family(route) {
  if (route === '/') return 'HOME';
  if (route.startsWith('/en')) return 'ENGLISH';
  if (route.startsWith('/blogs') || route.startsWith('/blog/')) return 'BLOG';
  if (route.startsWith('/tienda')) return 'SHOP';
  if (route.startsWith('/servicios/b2b') || route === '/empresas') return 'B2B';
  if (route.startsWith('/servicios/')) return route.split('/').length > 3 ? 'SERVICE' : 'CATEGORY';
  if (route.startsWith('/admin') || route.startsWith('/cuenta') || route.startsWith('/checkout') || route.startsWith('/carrito') || route.startsWith('/pedido') || route.startsWith('/tickets')) return 'UTILITY';
  return 'LANDING';
}

function csv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

if (!fs.existsSync(dist)) throw new Error('dist/ is missing; run npm run build first.');
walk(dist);
const records = pages.map((file) => {
  const route = routeFor(file);
  const html = fs.readFileSync(file, 'utf8');
  const canonicalTag = (html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i) || [])[0] || '';
  const robots = meta(html, 'robots');
  const hrefs = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
    .map((match) => match[1]).filter((href) => href.startsWith('/') && !href.startsWith('//'))
    .map((href) => href.split(/[?#]/)[0].replace(/\/$/, '') || '/');
  const schemaTypes = new Set();
  for (const [, raw] of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        for (const item of Array.isArray(node?.['@graph']) ? node['@graph'] : [node]) {
          for (const type of Array.isArray(item?.['@type']) ? item['@type'] : [item?.['@type']]) {
            if (type) schemaTypes.add(type);
          }
        }
      }
    } catch { /* validate-jsonld.mjs owns invalid JSON-LD reporting. */ }
  }
  return {
    route,
    family: family(route),
    lang: attr((html.match(/<html\b[^>]*>/i) || [])[0] || '', 'lang'),
    title: tagContent(html, 'title'),
    description: meta(html, 'description'),
    h1: tagContent(html, 'h1'),
    h1Count: (html.match(/<h1\b/gi) || []).length,
    canonical: attr(canonicalTag, 'href'),
    robots,
    indexable: !/noindex/i.test(robots),
    schema: [...schemaTypes].join('; '),
    outgoing: new Set(hrefs).size,
    hrefs,
  };
});

const inbound = new Map(records.map((row) => [row.route, 0]));
for (const row of records) {
  for (const href of new Set(row.hrefs)) {
    if (inbound.has(href)) inbound.set(href, inbound.get(href) + 1);
  }
}

const columns = ['url', 'family', 'lang', 'title', 'description', 'h1', 'h1_count', 'canonical', 'robots', 'indexable', 'schema', 'internal_links_in', 'internal_links_out'];
const lines = [columns.join(',')];
for (const row of records.sort((a, b) => a.route.localeCompare(b.route))) {
  lines.push([
    `${site}${row.route}`, row.family, row.lang, row.title, row.description, row.h1,
    row.h1Count, row.canonical, row.robots, row.indexable, row.schema,
    inbound.get(row.route), row.outgoing,
  ].map(csv).join(','));
}
fs.writeFileSync(output, `${lines.join('\n')}\n`, 'utf8');
console.log(`SEO URL map written: ${records.length} routes to ${path.relative(process.cwd(), output)}`);
