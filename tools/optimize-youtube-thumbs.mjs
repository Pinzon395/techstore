import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('public/assets/images/catalogo');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const videos = [
  { id: '8qoePYYRBaI', name: 'video-impresora-b2b' },
  { id: 'jUewdDR4g0A', name: 'video-mantenimiento-laptop' },
  { id: 'y-YJV5JXJdE', name: 'video-limpieza-rtx-4070' },
  { id: '1k70SHGLxuc', name: 'video-pantalla-iphone-11' }
];

for (const v of videos) {
  const url = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;
  try {
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const dest = path.join(outDir, `${v.name}.webp`);
    await sharp(buf).webp({ quality: 80 }).toFile(dest);
    const stat = fs.statSync(dest);
    console.log(`Saved ${v.name}.webp (${(stat.size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error(`Failed ${v.id}:`, err.message);
  }
}
