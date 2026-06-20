import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const outDir = path.join(root, 'test-results', 'service-css-audit');
const prefix = process.argv[2] || 'baseline';
const port = Number(process.env.AUDIT_PORT || 49321);

const routes = [
  ['home', '/'],
  ['b2b-office', '/servicios/b2b/soporte-oficinas.html'],
  ['phone-no-power', '/servicios/telefono/celular-no-prende.html'],
  ['laptop-diagnostic', '/servicios/laptop/diagnostico.html'],
  ['pc-maintenance', '/servicios/pc/mantenimiento-preventivo.html'],
];

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function resolveRequest(url) {
  const parsed = new URL(url, `http://127.0.0.1:${port}`);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const candidate = path.normalize(path.join(distDir, pathname));
  if (!candidate.startsWith(distDir)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  const htmlCandidate = `${candidate}.html`;
  if (existsSync(htmlCandidate) && statSync(htmlCandidate).isFile()) return htmlCandidate;
  return null;
}

async function measureCss() {
  const astroDir = path.join(distDir, '_astro');
  const entries = await readdir(astroDir, { withFileTypes: true });
  const css = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry) => {
      const fullPath = path.join(astroDir, entry.name);
      return { name: entry.name, bytes: statSync(fullPath).size };
    })
    .sort((a, b) => b.bytes - a.bytes);
  return css;
}

function startServer() {
  const server = createServer((req, res) => {
    const filePath = resolveRequest(req.url || '/');
    if (!filePath) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
    });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

await mkdir(outDir, { recursive: true });
const css = await measureCss();
const server = await startServer();
const browser = await chromium.launch();

try {
  for (const [name, route] of routes) {
    for (const [viewportName, viewport] of [
      ['desktop', { width: 1365, height: 900 }],
      ['mobile', { width: 390, height: 844 }],
    ]) {
      const page = await browser.newPage({ viewport });
      await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' });
      await page.screenshot({
        path: path.join(outDir, `${prefix}-${name}-${viewportName}.png`),
        fullPage: true,
      });
      await page.close();
    }
  }
  await writeFile(
    path.join(outDir, `${prefix}-css.json`),
    `${JSON.stringify({ prefix, css: css.slice(0, 20) }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ prefix, largestCss: css[0], screenshots: routes.length * 2 }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
