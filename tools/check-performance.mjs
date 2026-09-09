import fs from 'node:fs';
import path from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

const root = path.resolve('dist');
const pages = [
  ['index.html', 185 * 1024, 45, 75 * 1024],
  ['servicios/telefono/celular-mojado.html', 170 * 1024, 45, 75 * 1024],
  ['servicios/pc/tarjeta-video-gpu.html', 170 * 1024, 45, 75 * 1024],
  ['tienda.html', 250 * 1024, 45, 75 * 1024],
];
const assetBytes = (url) => {
  const clean = url.split('?')[0].replace(/^\//, '');
  if (!clean || /^https?:/.test(clean)) return 0;
  const candidate = path.join(root, clean);
  if (!fs.existsSync(candidate)) return 0;
  return brotliCompressSync(fs.readFileSync(candidate), {
    params: { [constants.BROTLI_PARAM_QUALITY]: 5 }
  }).length;
};
let failed = false;
for (const [relative, budget, requestBudget, cssBudget] of pages) {
  const file = path.join(root, relative);
  const html = fs.readFileSync(file, 'utf8');
  const urls = [
    ...html.matchAll(/<link[^>]+rel=["'](?:stylesheet|preload)["'][^>]+href=["']([^"']+)["']/g),
    ...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g),
  ].map((match) => match[1]);
  const localAssets = [...new Set(urls.filter((url) => url.startsWith('/')))];
  const cssAssets = localAssets.filter((url) => /\.css(?:\?|$)/.test(url));
  const cssBytes = cssAssets.reduce((total, url) => total + assetBytes(url), 0);
  const bytes = brotliCompressSync(fs.readFileSync(file), {
    params: { [constants.BROTLI_PARAM_QUALITY]: 5 }
  }).length + localAssets.reduce((total, url) => total + assetBytes(url), 0);
  const requests = localAssets.length;
  const navLinks = relative === 'index.html'
    ? (html.match(/<nav\b[\s\S]*?<\/nav>/i)?.[0].match(/\shref=/g) || []).length
    : 0;
  const storeCardVariant = relative === 'tienda.html'
    ? /cardMediaUrl[\s\S]*variant["']?,\s*["']card|variant=card/.test(fs.readFileSync(path.join(root, 'scripts/store.js'), 'utf8'))
    : true;
  const ok = bytes <= budget && requests <= requestBudget && cssBytes <= cssBudget
    && (relative !== 'index.html' || navLinks <= 80) && storeCardVariant;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${relative}: ${(bytes / 1024).toFixed(1)} KB brotli-est., ${requests} critical local assets, ${(cssBytes / 1024).toFixed(1)} KB CSS${relative === 'index.html' ? `, ${navLinks} navbar links` : ''}`);
  if (!ok) failed = true;
}
if (failed) process.exitCode = 1;
