import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const repairRoute = /(?:^|\/)(?:reparacion(?:es)?(?:-|\/|$)|cambio(?:-|\/)|sustitucion(?:-|\/)|fuente(?:-|$)|atascos(?:\.html|$)|rodillos(?:\.html|$)|centro-carga-celular(?:\.html|$))/i;
const errors = [];
let checked = 0;

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(file);
      continue;
    }
    if (!entry.name.endsWith('.html')) continue;
    const route = path.relative(dist, file).replaceAll(path.sep, '/');
    if (!repairRoute.test(route) || route.startsWith('tienda/')) continue;
    checked += 1;
    const html = fs.readFileSync(file, 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const [, raw] of scripts) {
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        continue; // Covered by validate-jsonld.mjs.
      }
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const graph = node?.['@graph'];
        const services = Array.isArray(graph) ? graph : [node];
        for (const service of services) {
          const types = Array.isArray(service?.['@type']) ? service['@type'] : [service?.['@type']];
          if (types.includes('Service') && service.offers) {
            errors.push(`${route}: Service schema publishes a repair price`);
          }
        }
      }
    }
  }
}

if (!fs.existsSync(dist)) {
  console.error('dist/ is missing; run npm run build first.');
  process.exit(1);
}

visit(dist);
if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`Repair pricing audit failed: ${errors.length} priced Service schema(s) on ${checked} repair pages.`);
  process.exit(1);
}
console.log(`Repair pricing audit OK: ${checked} repair pages have no fixed Service offer.`);
