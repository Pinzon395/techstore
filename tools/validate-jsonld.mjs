import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const SITE_URL = 'https://pixon.com.mx';
const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(fullPath);
    }
  }
  return out;
}

function routeForFile(filePath) {
  const relative = path.relative(DIST_DIR, filePath).replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  return `/${relative.replace(/\.html$/, '')}`;
}

function schemaItems(schema) {
  if (Array.isArray(schema)) return schema.flatMap(schemaItems);
  if (schema?.['@graph']) return schema['@graph'].flatMap(schemaItems);
  return schema ? [schema] : [];
}

function schemaTypes(schema) {
  const type = schema?.['@type'];
  return (Array.isArray(type) ? type : [type]).filter(Boolean);
}

function stripHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,:;'"()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function checkEmptyValues(value, pointer, problems) {
  if (value === null) {
    problems.push(`${pointer}: valor null en JSON-LD`);
    return;
  }
  if (typeof value === 'string' && value.trim() === '') {
    problems.push(`${pointer}: string vacio en JSON-LD`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) problems.push(`${pointer}: arreglo vacio en JSON-LD`);
    value.forEach((item, index) => checkEmptyValues(item, `${pointer}[${index}]`, problems));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      checkEmptyValues(child, `${pointer}.${key}`, problems);
    }
  }
}

function checkProductionUrls(value, pointer, problems) {
  if (typeof value === 'string' && value.startsWith('http://pixon.com.mx')) {
    problems.push(`${pointer}: URL usa http en vez de https`);
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      checkProductionUrls(child, `${pointer}.${key}`, problems);
    }
  }
}

function validateFaq(schema, html, visibleText, route, problems, warnings) {
  const items = Array.isArray(schema.mainEntity) ? schema.mainEntity : [];
  if (items.length === 0) {
    problems.push(`${route}: FAQPage sin mainEntity`);
    return;
  }

  if (!/\bfaq-question\b|\bdata-faq-question\b|<summary\b/i.test(html)) {
    problems.push(`${route}: FAQPage sin preguntas visibles detectables`);
  }

  for (const [index, item] of items.entries()) {
    const question = normalizeText(item?.name);
    const answer = normalizeText(item?.acceptedAnswer?.text);
    if (!question || !answer) {
      problems.push(`${route}: FAQ ${index + 1} sin pregunta o respuesta`);
      continue;
    }
    if (!visibleText.includes(question)) {
      warnings.push(`${route}: FAQ "${question}" no coincide literalmente con el texto visible`);
    }
  }
}

function validateBreadcrumb(schema, route, problems) {
  const items = Array.isArray(schema.itemListElement) ? schema.itemListElement : [];
  if (items.length === 0) {
    problems.push(`${route}: BreadcrumbList sin itemListElement`);
    return;
  }

  for (const [index, item] of items.entries()) {
    if (item.position !== index + 1) {
      problems.push(`${route}: BreadcrumbList posicion ${item.position} esperada ${index + 1}`);
    }
    if (!item.name) {
      problems.push(`${route}: BreadcrumbList item ${index + 1} sin name`);
    }
    if (item.item && !String(item.item).startsWith(SITE_URL)) {
      problems.push(`${route}: BreadcrumbList item ${index + 1} no usa dominio de produccion`);
    }
  }
}

if (!await exists(DIST_DIR)) {
  console.error('No existe dist/. Ejecuta npm run build antes de validar JSON-LD.');
  process.exit(1);
}

const files = await walk(DIST_DIR);
const problems = [];
const typeCounts = new Map();
const warnings = [];
let schemaCount = 0;
let pagesWithSchema = 0;
let faqPages = 0;

for (const file of files) {
  const route = routeForFile(file);
  const html = await fs.readFile(file, 'utf8');
  const visibleText = normalizeText(stripHtml(html));
  const matches = [...html.matchAll(scriptPattern)];
  if (matches.length > 0) pagesWithSchema += 1;

  for (const [blockIndex, match] of matches.entries()) {
    let parsed;
    try {
      parsed = JSON.parse(match[1]);
    } catch (error) {
      problems.push(`${route}: JSON-LD ${blockIndex + 1} invalido (${error.message})`);
      continue;
    }

    for (const schema of schemaItems(parsed)) {
      schemaCount += 1;
      checkEmptyValues(schema, `${route} JSON-LD ${blockIndex + 1}`, problems);
      checkProductionUrls(schema, `${route} JSON-LD ${blockIndex + 1}`, problems);

      for (const type of schemaTypes(schema)) {
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }

      if (schemaTypes(schema).includes('FAQPage')) {
        faqPages += 1;
        validateFaq(schema, html, visibleText, route, problems, warnings);
      }
      if (schemaTypes(schema).includes('BreadcrumbList')) {
        validateBreadcrumb(schema, route, problems);
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`JSON-LD invalido: ${problems.length} problema(s).`);
  for (const problem of problems.slice(0, 100)) console.error(`- ${problem}`);
  process.exit(1);
}

const typesSummary = [...typeCounts.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([type, count]) => `${type}=${count}`)
  .join(', ');

console.log(`JSON-LD OK: ${schemaCount} esquema(s) en ${pagesWithSchema}/${files.length} paginas.`);
console.log(`FAQPage validas: ${faqPages}`);
console.log(`Tipos: ${typesSummary}`);
if (warnings.length > 0) {
  console.log(`Advertencias FAQ texto/schema: ${warnings.length}`);
  for (const warning of warnings.slice(0, 30)) console.log(`- ${warning}`);
}
