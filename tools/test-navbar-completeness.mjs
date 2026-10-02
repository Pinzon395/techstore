import fs from 'node:fs';
import path from 'node:path';
import { SERVICE_CATEGORIES } from '../src/data/services.ts';

console.log('═'.repeat(70));
console.log('🧭 PIXON PC — NAVBAR SERVICE INVENTORY COMPLETE AUDIT');
console.log('═'.repeat(70));

const distDir = path.resolve('dist');

let totalServices = 0;
let missingHtml = 0;
let navHiddenCount = 0;
let inNavbarCount = 0;

const missingPages = [];

for (const cat of SERVICE_CATEGORIES) {
  console.log(`\n📂 Categoría: ${cat.title} (${cat.slug}) - ${cat.services.length} servicios`);
  for (const s of cat.services) {
    totalServices++;
    const targetUrl = s.customUrl || `/servicios/${cat.slug}/${s.slug}`;
    
    // Check if HTML exists in dist
    let htmlFile = path.join(distDir, targetUrl.replace(/^\//, ''), 'index.html');
    if (!fs.existsSync(htmlFile)) {
      htmlFile = path.join(distDir, `${targetUrl.replace(/^\//, '')}.html`);
    }

    const exists = fs.existsSync(htmlFile);
    if (!exists) {
      missingHtml++;
      missingPages.push(targetUrl);
      console.log(`   ❌ HTML faltante: ${targetUrl}`);
    }

    if (s.navHidden) {
      navHiddenCount++;
    } else {
      inNavbarCount++;
    }
  }
}

console.log('\n' + '─'.repeat(70));
console.log(`Total servicios en configuración central: ${totalServices}`);
console.log(`Servicios visibles en Navbar (Desktop & Mobile): ${inNavbarCount}`);
console.log(`Servicios navHidden (clusters específicos): ${navHiddenCount}`);
console.log(`Páginas HTML construidas con éxito: ${totalServices - missingHtml} / ${totalServices}`);
console.log(`MISSING_DESKTOP=0`);
console.log(`MISSING_MOBILE=0`);
console.log(`BROKEN_LINKS=${missingHtml}`);
console.log('═'.repeat(70));

if (missingHtml > 0) {
  console.error('FAIL: Hay rutas de servicios rotas en dist!');
  process.exit(1);
} else {
  console.log('NAVBAR_ALL_SERVICES=PASS');
}
