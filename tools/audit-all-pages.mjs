import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const dist = path.join(process.cwd(), 'dist');
async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = await walk(dist);
const redirectFiles = new Set((await Promise.all(files.map(async (file) => {
  const html = await fs.readFile(file, 'utf8');
  return /http-equiv=["']refresh["']/i.test(html) ? file : null;
}))).filter(Boolean));
const routes = files
  .filter((file) => !redirectFiles.has(file))
  .map((file) => '/' + path.relative(dist, file).replaceAll(path.sep, '/').replace(/index\.html$/, '').replace(/\.html$/, ''))
  .map((route) => route === '/' ? '/' : route.replace(/\/$/, ''))
  .filter((route) => !route.startsWith('/admin') && route !== '/404');

const types = { '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json; charset=utf-8','.woff2':'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1:4323').pathname);
    const relative = pathname === '/' ? 'index.html' : path.extname(pathname) ? pathname.slice(1) : `${pathname.slice(1)}.html`;
    const file = path.resolve(dist, relative);
    if (!file.startsWith(path.resolve(dist) + path.sep)) throw new Error('forbidden');
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});
await new Promise((resolve) => server.listen(4323, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
await page.route('**/*', (route) => new URL(route.request().url()).origin === 'http://127.0.0.1:4323' ? route.continue() : route.abort());
const problems = [];

try {
  for (const route of routes) {
    const errors = [];
    const onError = (error) => errors.push(error.message);
    page.on('pageerror', onError);
    const response = await page.goto(`http://127.0.0.1:4323${route}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForSelector('h1', { timeout: 1500 }).catch(() => {});
    const metrics = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflowElements: [...document.querySelectorAll('body *')]
        .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 2)
        .slice(0, 5)
        .map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.classList.length ? `.${[...element.classList].join('.')}` : ''}`),
    }));
    page.off('pageerror', onError);
    if (!response?.ok()) problems.push(`${route}: HTTP ${response?.status()}`);
    if (metrics.h1 !== 1) problems.push(`${route}: ${metrics.h1} H1`);
    if (metrics.scrollWidth > metrics.clientWidth + 2) problems.push(`${route}: overflow ${metrics.scrollWidth}/${metrics.clientWidth} (${metrics.overflowElements.join(', ')})`);
    for (const error of errors) problems.push(`${route}: JS ${error}`);
  }
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }

if (problems.length) {
  console.error(`Auditoria global fallo: ${problems.length} problema(s)`);
  problems.slice(0, 100).forEach((problem) => console.error(`- ${problem}`));
  process.exit(1);
}
console.log(`Auditoria global OK: ${routes.length} paginas.`);
