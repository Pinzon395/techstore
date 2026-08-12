import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const SITE_URL = 'https://pixon.com.mx';

const DYNAMIC_PREFIXES = [
  '/admin',
  '/api',
  '/auth',
  '/cuenta',
];

const DYNAMIC_PATHS = new Set([
  '/logout',
  '/login/google',
]);

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

function isDynamicPath(pathname) {
  if (DYNAMIC_PATHS.has(pathname)) return true;
  return DYNAMIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function routeExists(pathname, routes) {
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  return routes.has(normalized) || routes.has(`${normalized}/index`);
}

function isSkippableHref(href) {
  return (
    !href ||
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('sms:') ||
    href.startsWith('javascript:') ||
    href.startsWith('whatsapp:') ||
    href.startsWith('https://wa.me/') ||
    href.startsWith('https://api.whatsapp.com/')
  );
}

if (!await exists(DIST_DIR)) {
  console.error('No existe dist/. Ejecuta npm run build antes de auditar enlaces.');
  process.exit(1);
}

const files = await walk(DIST_DIR);
const routes = new Set(files.map(routeForFile));
const broken = [];
let checked = 0;

for (const file of files) {
  const html = await fs.readFile(file, 'utf8');
  const sourceRoute = routeForFile(file);
  const matches = html.matchAll(/<a\b[^>]*\shref\s*=\s*["']([^"']+)["'][^>]*>/gi);

  for (const match of matches) {
    const href = match[1].trim();
    if (isSkippableHref(href)) continue;

    let url;
    try {
      url = new URL(href, `${SITE_URL}${sourceRoute === '/' ? '/' : sourceRoute}`);
    } catch {
      broken.push(`${sourceRoute}: href invalido "${href}"`);
      continue;
    }

    if (url.origin !== SITE_URL) continue;

    const pathname = decodeURIComponent(url.pathname);
    if (isDynamicPath(pathname)) continue;

    checked += 1;
    if (!routeExists(pathname, routes)) {
      broken.push(`${sourceRoute}: ${href} -> sin ruta estatica`);
    }
  }
}

if (broken.length > 0) {
  console.error(`Auditoria de enlaces internos fallo: ${broken.length} enlace(s) roto(s).`);
  for (const item of broken.slice(0, 100)) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`Auditoria de enlaces internos OK: ${checked} enlace(s) internos verificados en ${files.length} paginas.`);
