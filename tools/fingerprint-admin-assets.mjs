import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlPath = path.join(root, 'dist', 'admin', 'admin.html');
const outputDir = path.join(root, 'dist', 'assets', 'admin');
const allowed = new Set([
  'ticket-options.js',
  'admin-dashboard.js',
  'admin.js',
  'admin-agenda.js',
  'admin-commerce.js',
  'admin-marketplace.js',
  'user-menu.js',
]);

const digest = (content) => crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
let html = await fs.readFile(htmlPath, 'utf8');
await fs.mkdir(outputDir, { recursive: true });

const references = [...html.matchAll(/src=(['"])\/scripts\/([^?'"\s]+\.js)(?:\?[^'"\s]*)?\1/g)];
const written = new Map();

for (const match of references) {
  const fileName = match[2];
  if (!allowed.has(fileName)) continue;
  let targetName = written.get(fileName);
  if (!targetName) {
    const source = await fs.readFile(path.join(root, 'dist', 'scripts', fileName));
    const base = path.basename(fileName, '.js');
    targetName = `${base}-${digest(source)}.js`;
    await fs.writeFile(path.join(outputDir, targetName), source);
    written.set(fileName, targetName);
  }
  html = html.replace(match[0], `src=${match[1]}/assets/admin/${targetName}${match[1]}`);
}

await fs.writeFile(htmlPath, html, 'utf8');
if (written.size !== allowed.size) {
  const missing = [...allowed].filter((name) => !written.has(name));
  throw new Error(`Admin asset references missing from build: ${missing.join(', ')}`);
}
console.log(`Admin assets fingerprinted: ${[...written.values()].join(', ')}`);
