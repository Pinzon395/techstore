/**
 * Reemplaza Font Awesome CDN por sprite SVG inline en todos los HTML.
 * Uso: node tools/replace-fa-with-svg.mjs
 *
 * Cambios:
 * 1. Elimina el <link> de Font Awesome CDN
 * 2. Añade el sprite SVG (inline o referenciado)
 * 3. Convierte <i class="fa-* fa-{name}"> a <svg><use href="..."/></svg>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const htmlFiles = [
  ...fs.readdirSync(rootDir).filter(f => f.endsWith('.html')).map(f => path.join(rootDir, f)),
  ...walkDir(path.join(rootDir, 'pages')),
];

function walkDir(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(fullPath));
    else if (entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

// Read sprite content for inline injection
const spritePath = path.join(rootDir, 'public', 'assets', 'icons', 'sprite.svg');
const spriteContent = fs.readFileSync(spritePath, 'utf-8');

// Replacement regex patterns
const faClassRegex = /<i\s+class="(fa-solid|fa-brands|fa-regular)\s+fa-([a-zA-Z0-9-]+)"([^>]*)><\/i>/g;
const faCdnRegex = /<link[^>]*font-awesome[^>]*\/?>/gi;
const faCdnRegex2 = /<link[^>]*cdnjs\.cloudflare\.com[^>]*font-awesome[^>]*\/?>/gi;
const faNoscriptRegex = /<noscript>[\s\S]*?font-awesome[\s\S]*?<\/noscript>/gi;
const faPreconnectCdnjs = /<link[^>]*cdnjs\.cloudflare\.com[^>]*>/gi;

function replaceIcon(match, type, name, rest) {
  // Extract inline style if any
  const styleMatch = rest.match(/style="([^"]+)"/);
  const style = styleMatch ? ` style="${styleMatch[1]}"` : '';
  // Extract onclick or other attrs
  const otherAttrs = rest.replace(/style="[^"]*"/, '').trim();

  const svgStyle = style || '';

  // Map FA style classes to equivalent SVG styles
  const extraClass = type === 'fa-brands' ? ' fa-brands' : '';

  return `<svg class="fa-icon${extraClass}" aria-hidden="true"${svgStyle}><use href="/assets/icons/sprite.svg#fa-${name}"/></svg>`;
}

let totalFiles = 0;
let totalReplaced = 0;

for (const filePath of htmlFiles) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 1. Remove Font Awesome CDN link (all variants)
  const newContent = content
    // Remove preconnect to cdnjs for FA
    .replace(/<link[^>]*preconnect[^>]*cdnjs[^>]*>/gi, '')
    // Remove FA CDN stylesheet link
    .replace(faCdnRegex2, '')
    .replace(faCdnRegex, '')
    // Remove noscript fallback for FA
    .replace(faNoscriptRegex, '');

  if (newContent !== content) {
    content = newContent;
    modified = true;
  }

  // 2. Replace <i class="fa-*"> with SVGs
  const iconCount = (content.match(faClassRegex) || []).length;
  if (iconCount > 0) {
    content = content.replace(faClassRegex, replaceIcon);
    modified = true;
    totalReplaced += iconCount;
  }

  if (modified) {
    // Add sprite reference before </body> if not present
    if (!content.includes('sprite.svg')) {
      content = content.replace('</body>', `  ${spriteContent}\n</body>`);
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    totalFiles++;
    console.log(`✏️  ${path.relative(rootDir, filePath)} (${iconCount} icons)`);
  }
}

console.log(`\n✅ Archivos modificados: ${totalFiles}`);
console.log(`✅ Iconos reemplazados: ${totalReplaced}`);
