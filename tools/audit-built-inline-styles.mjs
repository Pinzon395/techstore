import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const failOnInline = process.argv.includes('--fail');

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

if (!await exists(DIST_DIR)) {
  console.error('No existe dist/. Ejecuta npm run build antes de auditar estilos inline.');
  process.exit(1);
}

const files = await walk(DIST_DIR);
const results = [];

for (const file of files) {
  const html = await fs.readFile(file, 'utf8');
  const styleAttrs = html.match(/\sstyle\s*=\s*["'][\s\S]*?["']/gi) || [];
  const styleTags = html.match(/<style\b[\s\S]*?<\/style>/gi) || [];
  const total = styleAttrs.length + styleTags.length;

  if (total > 0) {
    results.push({
      route: '/' + path.relative(DIST_DIR, file).replaceAll(path.sep, '/'),
      styleAttrs: styleAttrs.length,
      styleTags: styleTags.length,
      total,
    });
  }
}

const totals = results.reduce((acc, item) => {
  acc.styleAttrs += item.styleAttrs;
  acc.styleTags += item.styleTags;
  acc.total += item.total;
  return acc;
}, { styleAttrs: 0, styleTags: 0, total: 0 });

console.log(`Auditoria de estilos inline: ${files.length} paginas HTML.`);
console.log(`style=\"\": ${totals.styleAttrs}`);
console.log(`<style>: ${totals.styleTags}`);
console.log(`Total inline CSS: ${totals.total}`);

if (results.length > 0) {
  console.log('Rutas con mas inline CSS:');
  for (const item of results.sort((a, b) => b.total - a.total).slice(0, 20)) {
    console.log(`- ${item.route}: ${item.total} (${item.styleAttrs} attrs, ${item.styleTags} tags)`);
  }
}

if (failOnInline && totals.total > 0) {
  process.exit(1);
}
