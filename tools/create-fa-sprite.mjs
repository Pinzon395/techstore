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
  // === solid (originales) ===
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
  'paper-plane': 'solid',
  'play': 'solid',
  'star': 'solid',
  // === solid (faltantes detectados en HTML) ===
  'arrow-down': 'solid',
  'arrow-trend-up': 'solid',
  'arrows-up-down': 'solid',
  'award': 'solid',
  'battery-half': 'solid',
  'battery-quarter': 'solid',
  'battery-slash': 'solid',
  'beer-mug-empty': 'solid',
  'bolt': 'solid',
  'bottle-water': 'solid',
  'bowl-rice': 'solid',
  'box': 'solid',
  'briefcase': 'solid',
  'broom': 'solid',
  'calendar-check': 'solid',
  'camera-retro': 'solid',
  'cart-plus': 'solid',
  'cart-shopping': 'solid',
  'certificate': 'solid',
  'check-circle': 'solid',
  'check-double': 'solid',
  'chevron-down': 'solid',
  'circle-half-stroke': 'solid',
  'circle-xmark': 'solid',
  'clipboard-check': 'solid',
  'code-branch': 'solid',
  'coins': 'solid',
  'comments': 'solid',
  'couch': 'solid',
  'crown': 'solid',
  'database': 'solid',
  'display': 'solid',
  'face-smile': 'solid',
  'fan': 'solid',
  'file-invoice': 'solid',
  'file-signature': 'solid',
  'fire': 'solid',
  'fire-flame-simple': 'solid',
  'flag-usa': 'solid',
  'flask': 'solid',
  'gauge-high': 'solid',
  'gift': 'solid',
  'glass-water': 'solid',
  'globe': 'solid',
  'gun': 'solid',
  'hand-holding-dollar': 'solid',
  'handshake': 'solid',
  'handshake-angle': 'solid',
  'hard-drive': 'solid',
  'headset': 'solid',
  'heart-crack': 'solid',
  'hourglass-start': 'solid',
  'house': 'solid',
  'keyboard': 'solid',
  'laptop-medical': 'solid',
  'layer-group': 'solid',
  'lightbulb': 'solid',
  'link': 'solid',
  'list-check': 'solid',
  'lock': 'solid',
  'magnifying-glass': 'solid',
  'map-marker-alt': 'solid',
  'memory': 'solid',
  'microchip': 'solid',
  'microscope': 'solid',
  'mug-hot': 'solid',
  'mug-saucer': 'solid',
  'n': 'solid',
  'network-wired': 'solid',
  'phone': 'solid',
  'plug': 'solid',
  'plug-circle-xmark': 'solid',
  'plus': 'solid',
  'circle-plus': 'solid',
  'power-off': 'solid',
  'radiation': 'solid',
  'receipt': 'solid',
  'rocket': 'solid',
  'rotate-left': 'solid',
  'shield-check': 'solid',
  'shield-heart': 'solid',
  'shield-virus': 'solid',
  'skull-crossbones': 'solid',
  'sliders': 'solid',
  'stethoscope': 'solid',
  'stopwatch': 'solid',
  'sun': 'solid',
  'table': 'solid',
  'tag': 'solid',
  'temperature-arrow-down': 'solid',
  'temperature-full': 'solid',
  'ticket': 'solid',
  'tools': 'solid',
  'trash': 'solid',
  'truck-fast': 'solid',
  'user-tie': 'solid',
  'users-gear': 'solid',
  'video': 'solid',
  'virus': 'solid',
  'volume-high': 'solid',
  'volume-low': 'solid',
  'water': 'solid',
  'wine-bottle': 'solid',
  'wrench': 'solid',
  'xmark': 'solid',
  // === brands (originales) ===
  'whatsapp': 'brands',
  'playstation': 'brands',
  'xbox': 'brands',
  'apple': 'brands',
  'facebook-f': 'brands',
  'instagram': 'brands',
  'tiktok': 'brands',
  // === brands (faltantes) ===
  'google': 'brands',
  'windows': 'brands',
};

// Aliases FA5 -> FA6 (nombres viejos en HTML que apuntan al icono renombrado)
const aliases = {
  'check-circle': 'circle-check',
  'map-marker-alt': 'location-dot',
  'plus-circle': 'circle-plus',
  'shield-check': 'shield-halved',
  'tools': 'screwdriver-wrench',
  'battery-slash': 'battery-quarter',
};

async function main() {
  let symbols = '';
  const fetched = {}; // name -> { viewBox, paths }

  for (const [name, type] of Object.entries(icons)) {
    const url = `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/svgs/${type}/${name}.svg`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(`⚠️  ${name}: HTTP ${resp.status}`);
        continue;
      }
      const svg = await resp.text();
      const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] || '0 0 512 512';
      const paths = svg.match(/<path[^>]*\/>/g)?.join('') || '';
      fetched[name] = { viewBox, paths };
      symbols += `  <symbol id="fa-${name}" viewBox="${viewBox}">${paths}</symbol>\n`;
      console.log(`✅ fa-${name}`);
    } catch (err) {
      console.warn(`⚠️  ${name}: ${err.message}`);
    }
  }

  // Inyectar aliases reutilizando el path del icono renombrado
  for (const [oldName, newName] of Object.entries(aliases)) {
    const target = fetched[newName];
    if (!target) {
      console.warn(`⚠️  alias ${oldName} -> ${newName}: target no fetched`);
      continue;
    }
    symbols += `  <symbol id="fa-${oldName}" viewBox="${target.viewBox}">${target.paths}</symbol>\n`;
    console.log(`🔗 fa-${oldName} (alias -> fa-${newName})`);
  }

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols}</svg>\n`;
  fs.writeFileSync(spritePath, sprite, 'utf-8');
  console.log(`\n📦 Sprite creado: ${spritePath}`);
  console.log(`📊 Tamaño: ${(Buffer.byteLength(sprite) / 1024).toFixed(1)}KB`);
  console.log(`🎯 Icons: ${Object.keys(icons).length}`);
}

main().catch(console.error);
