import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const PORT = parseInt(process.env.PORT || '4322', 10);
const BACKEND_PORT = 3001;
const DIST_DIR = path.resolve(process.cwd(), 'dist');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

async function resolveFilePath(pathname) {
  let relative = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (!relative || relative === '') relative = 'index.html';

  let candidate = path.resolve(DIST_DIR, relative);
  try {
    const stat = await fs.stat(candidate);
    if (stat.isDirectory()) {
      candidate = path.join(candidate, 'index.html');
      await fs.access(candidate);
      return candidate;
    }
    return candidate;
  } catch {
    // Try appending .html
    if (!path.extname(relative)) {
      const htmlCandidate = path.resolve(DIST_DIR, `${relative}.html`);
      try {
        await fs.access(htmlCandidate);
        return htmlCandidate;
      } catch {}
    }
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    // API Handling & Proxying
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/me' || url.pathname === '/api/auth/me') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          user: {
            id: 'admin-preview',
            name: 'Admin Pixon',
            role: 'admin',
            email: 'pixonpc@gmail.com',
            avatar: ''
          }
        }));
        return;
      }

      // Proxy API requests to backend on port 3001
      const proxyReq = http.request({
        hostname: '127.0.0.1',
        port: BACKEND_PORT,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: `127.0.0.1:${BACKEND_PORT}`
        }
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend unreachable on port 3001' }));
      });

      req.pipe(proxyReq);
      return;
    }

    const filePath = await resolveFilePath(decodeURIComponent(url.pathname));

    if (!filePath || !filePath.startsWith(DIST_DIR + path.sep)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      'Content-Length': data.byteLength
    });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Internal Error: ${err.message}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Static preview server running at http://127.0.0.1:${PORT}/ with API proxy to port ${BACKEND_PORT}`);
});
