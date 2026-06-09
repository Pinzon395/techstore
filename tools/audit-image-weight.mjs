import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const DIRECT_RASTER_PATTERN = /\/assets\/images\/[A-Za-z0-9_./-]+\.(?:png|jpe?g)/gi;

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

const problems = [];
for (const file of await walk(SRC)) {
  const content = await fs.readFile(file, 'utf8');
  for (const match of content.matchAll(DIRECT_RASTER_PATTERN)) {
    const publicPath = path.join(ROOT, 'public', match[0].slice(1));
    try {
      const stat = await fs.stat(publicPath);
      problems.push(`${path.relative(ROOT, file)} usa ${match[0]} (${Math.round(stat.size / 1024)} KB)`);
    } catch (_error) {
      problems.push(`${path.relative(ROOT, file)} referencia una imagen inexistente: ${match[0]}`);
    }
  }
}

if (problems.length) {
  console.error('Se encontraron referencias directas PNG/JPEG; usa WebP responsive:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('Imagenes OK: no hay referencias directas PNG/JPEG en paginas Astro.');
