import { promises as fs } from 'node:fs';
import path from 'node:path';

async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const problems = [];
for (const file of await walk(path.join(process.cwd(), 'dist'))) {
  const html = await fs.readFile(file, 'utf8');
  if (/\son[a-z]+\s*=/i.test(html)) problems.push(`${file}: handler inline`);
  if (/<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(html)) {
    problems.push(`${file}: script inline ejecutable`);
  }
}

if (problems.length) {
  console.error(problems.slice(0, 30).join('\n'));
  process.exit(1);
}
console.log('CSP build OK: sin handlers ni scripts ejecutables inline.');
