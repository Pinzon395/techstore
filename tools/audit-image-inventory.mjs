import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const imageRoot = path.join(root, 'public', 'assets', 'images');
const scanRoots = ['src', 'public'].map((dir) => path.join(root, dir));
const maxRows = Number(process.env.IMAGE_AUDIT_ROWS || 40);
const heavyThreshold = Number(process.env.IMAGE_AUDIT_HEAVY_KB || 300) * 1024;
const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

async function walk(dir, out = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const sourceFiles = await Promise.all(scanRoots.map((dir) => walk(dir)));
const searchable = [];
for (const file of sourceFiles.flat()) {
  if (/\.(png|jpe?g|webp|avif|astro|ts|js|css|json|html)$/i.test(file)) {
    try {
      searchable.push([file, await fs.readFile(file, 'utf8')]);
    } catch {
      // Binary files are intentionally skipped.
    }
  }
}

const images = [];
for (const file of await walk(imageRoot)) {
  const ext = path.extname(file).toLowerCase();
  if (!imageExts.has(ext)) continue;
  const stat = await fs.stat(file);
  const rel = path.relative(path.join(root, 'public'), file).replaceAll(path.sep, '/');
  const publicPath = `/${rel}`;
  const basename = publicPath.replace(/\.(jpe?g|png|webp|avif)$/i, '');
  const webpPath = path.join(path.dirname(file), `${path.basename(file, ext)}.webp`);
  const refs = searchable
    .filter(([source, content]) => source !== file && (content.includes(publicPath) || content.includes(path.basename(file))))
    .map(([source]) => path.relative(root, source).replaceAll(path.sep, '/'));

  images.push({
    path: publicPath,
    kb: Math.round(stat.size / 1024),
    ext,
    hasWebp: ext === '.webp' || await fs.access(webpPath).then(() => true, () => false),
    references: [...new Set(refs)].slice(0, 6),
    referenceCount: new Set(refs).size,
    family: basename,
  });
}

images.sort((a, b) => b.kb - a.kb);

const heavy = images.filter((image) => image.kb * 1024 >= heavyThreshold);
const report = [
  '# Image Inventory',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Images scanned: ${images.length}`,
  `Heavy threshold: ${Math.round(heavyThreshold / 1024)} KB`,
  '',
  '## Largest Images',
  '',
  '| KB | Path | WebP | References |',
  '|---:|---|---|---:|',
  ...images.slice(0, maxRows).map((image) =>
    `| ${image.kb} | ${image.path} | ${image.hasWebp ? 'yes' : 'no'} | ${image.referenceCount} |`
  ),
  '',
  '## Heavy Images With No WebP Equivalent',
  '',
  ...heavy
    .filter((image) => !image.hasWebp)
    .map((image) => `- ${image.path} (${image.kb} KB, references: ${image.referenceCount})`),
  '',
  '## Heavy Referenced Images',
  '',
  ...heavy
    .filter((image) => image.referenceCount > 0)
    .slice(0, maxRows)
    .map((image) => `- ${image.path} (${image.kb} KB) referenced by ${image.references.join(', ')}`),
  '',
  '## Inventario Oficial de Imágenes Reales (Pixon PC Real Work)',
  '',
  '| File | Subject | Source | Owned | Routes | Alt | Dimensions | WebP KB | Usage | Status |',
  '|---|---|---|---|---|---|---|---:|---|---|',
  '| cambio-pasta-termica-premium-laptop-pc-pixon.webp | Die de silicio con aplicación de pasta térmica | Pixon PC Real Work | Sí | /blogs/pasta-termica-vs-metal-liquido, /limpieza-laptop | Compuesto térmico aplicado profesionalmente sobre die de silicio | 1280x1280 | 194 | Par Antes / Después (Después) | Activo |',
  '| hardware-ram-ventilacion-pc-diagnostico.webp | Hardware interno: ranuras de RAM y disipador de cobre | Pixon PC Real Work | Sí | /ensambles, /optimizacion, /en/pc-optimization | Arquitectura interna con ranuras de memoria RAM y disipador de cobre | 960x1280 | 167 | Arquitectura de hardware y memoria RAM | Activo |',
  '| laptop-gaming-alienware-mantenimiento-reparacion.webp | Laptop gamer sobre superficie de trabajo | Pixon PC Real Work | Sí | /limpieza-laptop, /optimizacion, /en/pc-optimization | Laptop gamer sobre superficie de trabajo durante verificación | 960x1178 | 124 | Validación y estrés térmico en gaming | Activo |',
  '| microcomponentes-tarjeta-madre-microscopio.webp | Microcomponentes y pistas de circuito bajo microscopio | Pixon PC Real Work | Sí | /reparaciones | Inspección de microcomponentes y pistas de circuito bajo microscopio | 960x1280 | 147 | Microsoldadura a nivel componente | Activo |',
  '| iphone-sulfatado-dano-liquido-microsoldadura.webp | Corrosión y sulfatación en componentes bajo microscopio | Pixon PC Real Work | Sí | /servicios/telefono/celular-mojado, /en/liquid-damage, /blogs/humedad-salitre-calor-cancun | Corrosión y sulfatación sobre componentes observados bajo microscopio | 960x1280 | 158 | Inspección de daños por líquido | Activo |',
  '| diagnostico-tarjeta-madre-laptop-microscopio.webp | Banco de trabajo con microscopio estéreo profesional | Pixon PC Real Work | Sí | /, /reparaciones | Banco de trabajo con microscopio estéreo e inspección de tarjeta madre | 960x1280 | 118 | Banco de diagnóstico especializado | Activo |',
  '| microsoldadura-componente-quemado-corto-circuito.webp | Componente SMD carbonizado con cortocircuito al microscopio | Pixon PC Real Work | Sí | /servicios/pc/no-enciende, /blogs/humedad-salitre-calor-cancun | Componente SMD carbonizado con signos de cortocircuito observado bajo microscopio | 960x1280 | 182 | Diagnóstico de corto; no cambiar placa | Activo |',
  '| motherboard-iphone-microcomponentes-reparacion.webp | Capa separada de placa tipo sandwich con microcomponentes | Pixon PC Real Work | Sí | /servicios/telefono/celular-mojado, /en/liquid-damage | Placa lógica separada para diagnóstico de líneas de alimentación | 960x1280 | 89 | Diagnóstico a nivel componente y líneas de alimentación | Activo |',
  '| pasta-termica-seca-laptop-sobrecalentamiento.webp | Procesador con pasta térmica petrificada y agrietada | Pixon PC Real Work | Sí | /blogs/pasta-termica-vs-metal-liquido, /limpieza-laptop | Pasta térmica seca y agrietada sobre procesador | 960x1280 | 154 | Par Antes / Después (Antes) | Activo |',
  '',
];

await fs.mkdir(path.join(root, 'docs'), { recursive: true });
await fs.writeFile(path.join(root, 'docs', 'IMAGE_INVENTORY.md'), `${report.join('\n')}\n`);

const missingWebp = heavy.filter((image) => !image.hasWebp);
console.log(`Image inventory OK: ${images.length} images scanned, ${heavy.length} heavy, ${missingWebp.length} heavy without WebP.`);
console.log('Report: docs/IMAGE_INVENTORY.md');
