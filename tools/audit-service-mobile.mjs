import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const requestedBaseUrl = process.env.AUDIT_BASE_URL;
const baseUrl = requestedBaseUrl || 'http://127.0.0.1:4322';
const routes = [
  '/servicios/pc/pantalla-azul',
  '/servicios/telefono/reparacion-samsung',
  '/servicios/telefono/celular-mojado',
  '/servicios/consola/ps5-se-apaga',
  '/servicios/telefono/iphone-sin-senal',
  '/servicios/laptop/cambio-bateria',
  '/servicios/laptop/reparacion-hp',
  '/servicios/laptop/recuperacion-datos',
  '/servicios/impresora/diagnostico',
  '/servicios/impresora/no-imprime',
  '/servicios/b2b/soporte-hoteles',
  '/servicios/mac/diagnostico-mac',
  '/servicios/mac/mantenimiento-macbook',
  '/servicios/redes/wifi-lento',
];

const requiredSelectors = [
  ['hero', 'h1'],
  ['ticket', '#ticket, .service-ticket-section'],
  ['faq', '#faq, .faq-section'],
  ['comentarios', '#comentarios, .comments-section'],
  ['contacto', '#ubicacion, .contact'],
  ['footer', 'footer'],
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch (_error) {
      // El servidor todavia esta iniciando.
    }
    await delay(250);
  }
  throw new Error(`El servidor de auditoria no respondio en ${url} despues de 30 segundos.`);
}

function startAuditServer() {
  if (requestedBaseUrl) return null;
  const dist = path.join(process.cwd(), 'dist');
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.woff2': 'font/woff2',
  };

  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', baseUrl).pathname);
      const relative = pathname === '/'
        ? 'index.html'
        : path.extname(pathname)
          ? pathname.slice(1)
          : `${pathname.slice(1)}.html`;
      const filePath = path.resolve(dist, relative);
      if (!filePath.startsWith(path.resolve(dist) + path.sep)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const body = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch (_error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  });
  server.listen(4322, '127.0.0.1');
  return server;
}

const server = startAuditServer();
let browser;

try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  const auditOrigin = new URL(baseUrl).origin;
  await page.route('**/*', (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin !== auditOrigin) return route.abort();
    return route.continue();
  });
  const problems = [];

  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(250);

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyHeight: document.body.scrollHeight,
      cta: (() => {
        const el = document.querySelector('.sdv-mobile-cta');
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { visible: getComputedStyle(el).display !== 'none', top: rect.top, bottom: rect.bottom, height: rect.height };
      })(),
      footer: (() => {
        const el = document.querySelector('footer');
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      })(),
    }));

    if (metrics.scrollWidth > metrics.clientWidth + 2) {
      problems.push(`${route}: overflow horizontal ${metrics.scrollWidth}px > ${metrics.clientWidth}px`);
    }
    if (metrics.bodyHeight < 1200) {
      problems.push(`${route}: altura inesperadamente baja; posible contenido faltante`);
    }
    for (const [name, selector] of requiredSelectors) {
      if (!(await page.locator(selector).count())) problems.push(`${route}: falta bloque ${name}`);
    }
    if (metrics.cta?.visible) {
      const footerCovered = metrics.footer && metrics.footer.top < metrics.cta.bottom && metrics.footer.bottom > metrics.cta.top;
      if (footerCovered) problems.push(`${route}: CTA fijo se superpone al footer en viewport inicial`);
      if (metrics.cta.height > 76) problems.push(`${route}: CTA fijo demasiado alto (${metrics.cta.height}px)`);
    }
  }

  if (problems.length) {
    console.error(`Mobile service audit fallo: ${problems.length} problema(s)`);
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
  } else {
    console.log(`Mobile service audit OK: ${routes.length} rutas revisadas en viewport 390x844.`);
  }
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
