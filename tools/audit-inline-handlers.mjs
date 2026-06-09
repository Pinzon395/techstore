import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const MAX_PUBLIC_INLINE_HANDLERS = 170;
const EVENT_PATTERN = /\son(?:click|mouseover|mouseout|change|submit)\s*=/gi;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.astro')) files.push(fullPath);
  }
  return files;
}

const files = await walk(SRC);
let count = 0;

for (const file of files) {
  const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (relative.startsWith('src/pages/en/') || relative.startsWith('src/pages/admin/')) continue;
  const content = await fs.readFile(file, 'utf8');
  count += (content.match(EVENT_PATTERN) || []).length;
}

if (count > MAX_PUBLIC_INLINE_HANDLERS) {
  console.error(`Handlers inline publicos: ${count}. Presupuesto maximo: ${MAX_PUBLIC_INLINE_HANDLERS}.`);
  process.exit(1);
}

console.log(`Handlers inline publicos: ${count}/${MAX_PUBLIC_INLINE_HANDLERS}. Los componentes compartidos ya no agregan handlers inline.`);
