import { chromium } from 'playwright';

const baseUrl = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4322';
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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
const problems = [];

for (const route of routes) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });

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
    const count = await page.locator(selector).count();
    if (!count) problems.push(`${route}: falta bloque ${name}`);
  }

  if (metrics.cta?.visible) {
    const footerCovered = metrics.footer && metrics.footer.top < metrics.cta.bottom && metrics.footer.bottom > metrics.cta.top;
    if (footerCovered) problems.push(`${route}: CTA fijo se superpone al footer en viewport inicial`);
    if (metrics.cta.height > 76) problems.push(`${route}: CTA fijo demasiado alto (${metrics.cta.height}px)`);
  }
}

await browser.close();

if (problems.length) {
  console.error(`Mobile service audit fallo: ${problems.length} problema(s)`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Mobile service audit OK: ${routes.length} rutas revisadas en viewport 390x844.`);
