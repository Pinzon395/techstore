import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const outDir = path.join(rootDir, 'public', 'assets', 'icons');
const spritePath = path.join(outDir, 'sprite.svg');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Map of Font Awesome icons we use -> FA category
const icons = {
  // solid
  'desktop': 'solid',
  'mobile-screen': 'solid',
  'mobile': 'solid',
  'mobile-screen-button': 'solid',
  'print': 'solid',
  'gamepad': 'solid',
  'building': 'solid',
  'laptop': 'solid',
  'arrow-right': 'solid',
  'droplet': 'solid',
  'droplet-slash': 'solid',
  'wind': 'solid',
  'temperature-high': 'solid',
  'shield-halved': 'solid',
  'check': 'solid',
  'fire-flame-curved': 'solid',
  'piggy-bank': 'solid',
  'eye': 'solid',
  'circle-dot': 'solid',
  'spray-can-sparkles': 'solid',
  'screwdriver-wrench': 'solid',
  'gear': 'solid',
  'user': 'solid',
  'circle': 'solid',
  'circle-check': 'solid',
  'circle-info': 'solid',
  'triangle-exclamation': 'solid',
  'file-contract': 'solid',
  'magnifying-glass-chart': 'solid',
  'location-dot': 'solid',
  'hotel': 'solid',
  'utensils': 'solid',
  'plane-departure': 'solid',
  'house-laptop': 'solid',
  'truck': 'solid',
  'map-location-dot': 'solid',
  'circle-question': 'solid',
  'clock': 'regular',
  'building-shield': 'solid',
  // brands
  'whatsapp': 'brands',
  'playstation': 'brands',
  'xbox': 'brands',
  'apple': 'brands',
  'facebook-f': 'brands',
  'instagram': 'brands',
  'tiktok': 'brands',
};

async function main() {
  let symbols = '';

  for (const [name, type] of Object.entries(icons)) {
    const url = `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/svgs/${type}/${name}.svg`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(`⚠️  ${name}: HTTP ${resp.status}`);
        continue;
      }
      const svg = await resp.text();
      // Extract viewBox and path content
      const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] || '0 0 512 512';
      const paths = svg.match(/<path[^>]*\/>/g)?.join('') || '';
      symbols += `  <symbol id="fa-${name}" viewBox="${viewBox}">${paths}</symbol>\n`;
      console.log(`✅ fa-${name}`);
    } catch (err) {
      console.warn(`⚠️  ${name}: ${err.message}`);
    }
  }

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols}</svg>\n`;
  fs.writeFileSync(spritePath, sprite, 'utf-8');
  console.log(`\n📦 Sprite creado: ${spritePath}`);
  console.log(`📊 Tamaño: ${(Buffer.byteLength(sprite) / 1024).toFixed(1)}KB`);
  console.log(`🎯 Icons: ${Object.keys(icons).length}`);
}

main().catch(console.error);
