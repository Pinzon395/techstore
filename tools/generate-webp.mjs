import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distAssets = path.join(__dirname, '..', 'dist', 'assets');

async function generateWebp(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      count += await generateWebp(fullPath);
      continue;
    }

    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

    const webpPath = fullPath.replace(ext, '.webp');
    if (fs.existsSync(webpPath)) continue;

    try {
      const img = sharp(fullPath);
      const meta = await img.metadata();

      // Brillo/arreglo, no ampliar
      await img
        .resize(meta.width, meta.height, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75, effort: 4 })
        .toFile(webpPath);

      const origSize = fs.statSync(fullPath).size;
      const webpSize = fs.statSync(webpPath).size;
      const saved = ((1 - webpSize / origSize) * 100).toFixed(0);
      console.log(`  WebP: ${path.basename(file)} → ${path.basename(webpPath)} (${saved}% ahorro)`);
      count++;
    } catch (err) {
      console.warn(`  ⚠️  ${file}: ${err.message}`);
    }
  }
  return count;
}

const total = await generateWebp(distAssets);
console.log(`\n✅ ${total} WebP generados en dist/assets/`);
