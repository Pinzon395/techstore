/**
 * Falla si alguna página o script pide un icono que no existe en public/assets/icons/sprite.svg.
 * Origen: auditoría 2026-10 encontró 13 iconos vacíos (`<use href="…sprite.svg#fa-x">` sin <symbol>).
 * Revisa el HTML compilado (dist/, resuelve los alias de LocalSpriteIcon) y los scripts públicos.
 */
import fs from 'node:fs';
import path from 'node:path';

const sprite = fs.readFileSync('public/assets/icons/sprite.svg', 'utf8');
const symbols = new Set([...sprite.matchAll(/<symbol\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]));

function walk(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full, exts);
    return exts.includes(path.extname(e.name)) ? [full] : [];
  });
}

const files = [...walk('dist', ['.html', '.js']), ...walk('public/scripts', ['.js'])];
if (!files.some((f) => f.startsWith('dist'))) {
  console.error('check:icons requiere dist/ (ejecuta npm run build primero).');
  process.exit(2);
}

const missing = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  // Ignora plantillas dinámicas (`#fa-${name}`): solo se pueden validar ids literales.
  for (const m of text.matchAll(/sprite\.svg#([A-Za-z0-9_-]+)(?![A-Za-z0-9_-]|\$\{)/g)) {
    if (symbols.has(m[1])) continue;
    if (!missing.has(m[1])) missing.set(m[1], new Set());
    missing.get(m[1]).add(file.replaceAll('\\', '/'));
  }
}

if (missing.size) {
  console.error(`Iconos inexistentes en sprite.svg (${missing.size}):`);
  for (const [id, where] of missing) console.error(`  #${id} ← ${[...where].slice(0, 3).join(', ')}${where.size > 3 ? ` (+${where.size - 3})` : ''}`);
  process.exit(1);
}
console.log(`check:icons OK · ${symbols.size} símbolos · ${files.length} archivos revisados`);
