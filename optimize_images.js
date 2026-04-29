const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'assets', 'images');

const imagesToOptimize = [
  { name: 'image.png', maxWidth: 1200 },
  { name: 'FotoParaSeccionAntiSulfatacion.jpeg', maxWidth: 800 },
  { name: 'FotoMetalLiquido.jpeg', maxWidth: 800 },
  { name: 'DespuesBisagra.jpg', maxWidth: 800 },
  { name: 'AntesBisagra.jpg', maxWidth: 800 },
  { name: 'celularcuadrado.jpeg', maxWidth: 800 },
  { name: 'Pc.jpeg', maxWidth: 800 }
];

async function optimizeImages() {
  for (const img of imagesToOptimize) {
    const imgPath = path.join(imagesDir, img.name);
    if (!fs.existsSync(imgPath)) continue;
    
    console.log(`Optimizing ${img.name}...`);
    const tempPath = imgPath + '.tmp';
    
    try {
      await sharp(imgPath)
        .resize({ width: img.maxWidth, withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true }) // Convert to progressive JPEG for better LCP
        .toFile(tempPath);
        
      fs.renameSync(tempPath, imgPath);
      console.log(`Successfully optimized ${img.name}`);
    } catch (e) {
      console.error(`Error optimizing ${img.name}:`, e);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }
}

optimizeImages();
