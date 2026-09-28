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
  '.mp4': 'video/mp4',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1:4328').pathname);
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
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise((resolve) => server.listen(4328, '127.0.0.1', resolve));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const downloads = [];
page.on('response', async (res) => {
  try {
    let size = 0;
    const headers = res.headers();
    if (headers['content-length']) {
      size = parseInt(headers['content-length'], 10);
    } else {
      const buffer = await res.body().catch(() => Buffer.alloc(0));
      size = buffer.length;
    }
    downloads.push({ url: res.url(), size, type: res.request().resourceType() });
  } catch {}
});

await page.goto('http://127.0.0.1:4328/', { waitUntil: 'networkidle' });

await browser.close();
await new Promise((resolve) => server.close(resolve));

downloads.sort((a, b) => b.size - a.size);

console.log('=== TOP 15 LARGEST DOWNLOADS ON HOMEPAGE ===');
for (const d of downloads.slice(0, 15)) {
  console.log(`${(d.size / 1024).toFixed(1)} KB | ${d.type} | ${d.url}`);
}
