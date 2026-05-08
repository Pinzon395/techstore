import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const imagesDir = path.join(rootDir, 'assets', 'images');
const outDir = path.join(rootDir, 'assets', 'images', 'responsive');

const sizes = [
  { width: 320, suffix: 'sm' },
  { width: 640, suffix: 'md' },
  { width: 960, suffix: 'lg' },
  { width: 1200, suffix: 'xl' },
];

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;

  const basename = path.basename(filePath, ext);
  const stats = fs.statSync(filePath);

  console.log(`\n📷 ${basename}${ext} (${(stats.size / 1024).toFixed(0)}KB)`);

  // Generate WebP at original size
  const webpPath = path.join(outDir, `${basename}.webp`);
  if (!fs.existsSync(webpPath) || fs.statSync(webpPath).mtimeMs < stats.mtimeMs) {
    await sharp(filePath)
      .webp({ quality: 75, effort: 4 })
      .toFile(webpPath);
    const webpStats = fs.statSync(webpPath);
    const saved = ((1 - webpStats.size / stats.size) * 100).toFixed(0);
    console.log(`  → ${basename}.webp (${(webpStats.size / 1024).toFixed(0)}KB, ahorró ${saved}%)`);
  }

  // Generate responsive sizes
  for (const size of sizes) {
    const outName = `${basename}-${size.suffix}.webp`;
    const outPath = path.join(outDir, outName);

    if (fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs >= stats.mtimeMs) continue;

    await sharp(filePath)
      .resize(size.width, null, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70, effort: 4 })
      .toFile(outPath);

    const sizeStats = fs.statSync(outPath);
    console.log(`  → ${outName} (${(sizeStats.size / 1024).toFixed(0)}KB)`);
  }
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(imagesDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });

  console.log(`Optimizando ${files.length} imágenes...`);

  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    if (fs.statSync(filePath).isFile()) {
      await optimizeImage(filePath);
    }
  }

  console.log('\n✅ Optimización completada');
}

main().catch(console.error);
