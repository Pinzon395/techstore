import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distServices = path.join(root, 'dist', 'servicios');

const requiredSchemas = ['Service', 'FAQPage', 'BreadcrumbList', 'LocalBusiness'];
const privateSlugs = new Set(['admin', 'cuenta']);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      walk(full, files);
      continue;
    }
    if (name.endsWith('.html')) files.push(full);
  }
  return files;
}

function textBetween(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function extractJsonLd(html) {
  const blocks = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      blocks.push({ _invalidJsonLd: true });
    }
  }
  return blocks;
}

function flattenSchemas(value, out = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenSchemas(item, out));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  out.push(value);
  if (Array.isArray(value['@graph'])) flattenSchemas(value['@graph'], out);
  return out;
}

function hasSchema(all, typeName) {
  return all.some((item) => {
    const type = item['@type'];
    const types = Array.isArray(type) ? type : [type];
    return types.includes(typeName);
  });
}

const files = walk(distServices)
  .filter((file) => {
    const rel = path.relative(distServices, file).replace(/\\/g, '/');
    const parts = rel.split('/');
    if (parts.length < 2) return false;
    return !parts.some((part) => privateSlugs.has(part.replace(/\.html$/, '')));
  });

const problems = [];
const seen = {
  title: new Map(),
  description: new Map(),
  h1: new Map(),
  canonical: new Map(),
};

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = `/${path.relative(path.join(root, 'dist'), file).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, '')}`;
  if (/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html)) continue;

  const title = textBetween(html, /<title>([\s\S]*?)<\/title>/i);
  const description = textBetween(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const canonical = textBetween(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((item) => item[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const jsonLd = extractJsonLd(html);
  const allSchemas = flattenSchemas(jsonLd);

  if (!title) problems.push(`${rel}: falta <title>`);
  if (!description) problems.push(`${rel}: falta meta description`);
  if (!canonical) problems.push(`${rel}: falta canonical`);
  if (h1s.length !== 1) problems.push(`${rel}: debe tener 1 H1, tiene ${h1s.length}`);
  if (jsonLd.some((item) => item._invalidJsonLd)) problems.push(`${rel}: JSON-LD invalido`);

  for (const schemaName of requiredSchemas) {
    if (!hasSchema(allSchemas, schemaName)) problems.push(`${rel}: falta schema ${schemaName}`);
  }

  for (const [key, value] of Object.entries({ title, description, h1: h1s[0], canonical })) {
    if (!value) continue;
    const previous = seen[key].get(value);
    if (previous) problems.push(`${rel}: ${key} duplicado con ${previous}`);
    else seen[key].set(value, rel);
  }
}

if (problems.length) {
  console.error(`SEO service audit fallo: ${problems.length} problema(s)`);
  for (const problem of problems.slice(0, 80)) console.error(`- ${problem}`);
  if (problems.length > 80) console.error(`... ${problems.length - 80} mas`);
  process.exit(1);
}

console.log(`SEO service audit OK: ${files.length} paginas de servicio revisadas.`);
