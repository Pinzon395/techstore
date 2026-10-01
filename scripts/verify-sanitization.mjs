import fs from 'node:fs';
import path from 'node:path';

const targetSlugs = [
  'servicios/mac/cambio-pantalla-macbook',
  'servicios/mac/cambio-bateria-macbook',
  'servicios/mac/teclado-macbook',
  'servicios/telefono/cambio-pantalla-samsung',
  'servicios/telefono/cambio-bateria-samsung',
  'servicios/telefono/reparacion-tapa-trasera-iphone',
  'servicios/telefono/cambio-pantalla',
  'servicios/telefono/cambio-flex-botones',
  'servicios/laptop/cambio-pantalla',
  'servicios/laptop/cambio-teclado',
  'servicios/laptop/cambio-bateria',
  'servicios/impresora/rodillos',
  'servicios/consola/fuente',
  'limpieza-laptop-liquido',
  'reparacion-bisagras',
  'blogs/reparacion-bisagras-carcasas-laptop-cancun'
];

const quoteOnlySlugs = [
  'servicios/mac/cambio-pantalla-macbook',
  'servicios/mac/cambio-bateria-macbook',
  'servicios/mac/teclado-macbook',
  'servicios/telefono/cambio-pantalla-samsung',
  'servicios/telefono/cambio-bateria-samsung',
  'servicios/telefono/reparacion-tapa-trasera-iphone',
  'servicios/telefono/cambio-pantalla',
  'servicios/telefono/cambio-flex-botones',
  'servicios/laptop/cambio-pantalla',
  'servicios/laptop/cambio-teclado',
  'servicios/laptop/cambio-bateria'
];

const forbiddenPatterns = [
  'Desde $1,200 MXN',
  '1,850 MXN',
  '$1,800 MXN',
  '$1,550 MXN',
  '$950 y $2,800 MXN',
  '$3,500+ en componentes',
  '$3,500 - $6,000+',
  'display de $2,000+ MXN',
  'de $800 a más de $3,000 MXN',
  'Costoso ($2,500 a $4,500+ MXN)',
  '(hasta 80% de ahorro)',
  'Ahorro del 60% al 80%'
];

let issues = 0;

for (const slug of targetSlugs) {
  let file = path.join('dist', slug + '.html');
  if (!fs.existsSync(file)) {
    file = path.join('dist', slug, 'index.html');
  }
  if (!fs.existsSync(file)) {
    console.error('FILE NOT FOUND:', slug);
    issues++;
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');

  // Check 1: Offer in JSON-LD for quote-only
  if (quoteOnlySlugs.includes(slug)) {
    const scripts = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
    for (const s of scripts) {
      if (s.includes('"offers"') && s.includes('"Service"')) {
        console.error('FAIL: Offer schema still present in quote-only service:', slug);
        issues++;
      }
    }
  }

  // Check 2: forbidden specific strings
  for (const pat of forbiddenPatterns) {
    if (html.includes(pat)) {
      console.error(`FAIL: Found forbidden pattern "${pat}" in ${slug}`);
      issues++;
    }
  }

  // Check 3: dangling empty Desde
  if (/<span>\s*Desde\s*<\/span>\s*<strong>\s*<\/strong>/i.test(html)) {
    console.error('FAIL: Dangling empty Desde in ' + slug);
    issues++;
  }
}

if (issues === 0) {
  console.log(`PASS: All ${targetSlugs.length} target surfaces verified. 0 issues found.`);
  process.exit(0);
} else {
  console.error(`FAIL: Found ${issues} issues during verification.`);
  process.exit(1);
}
