import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const dist = path.resolve('dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1:4327').pathname);
    let relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    let file = path.resolve(dist, relative);
    if (!path.extname(file)) {
      if (await fs.stat(file + '.html').then(() => true).catch(() => false)) {
        file = file + '.html';
      } else if (await fs.stat(path.join(file, 'index.html')).then(() => true).catch(() => false)) {
        file = path.join(file, 'index.html');
      }
    }
    const body = await fs.readFile(file);
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    console.log('[Server 404]:', req.url);
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise((resolve) => server.listen(4327, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const notFounds = [];
page.on('response', (res) => {
  if (res.status() === 404) {
    notFounds.push(res.url());
  }
});

await page.goto('http://127.0.0.1:4327/', { waitUntil: 'networkidle' });

await browser.close();
await new Promise((resolve) => server.close(resolve));

console.log('\nTotal 404s found:', notFounds.length);
for (const u of notFounds) {
  console.log(' -', u);
}
