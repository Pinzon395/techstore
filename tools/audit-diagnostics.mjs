import fs from 'node:fs';
import path from 'node:path';

const patterns = [
  /diagn[oó]stico\s+gratis/i,
  /diagn[oó]stico\s+sin\s+costo/i,
  /diagn[oó]stico\s+incluido\s+gratis/i,
  /diagn[oó]stico\s+gratuito/i,
  /revisi[oó]n\s+gratis/i,
  /revisi[oó]n\s+sin\s+costo/i,
  /revisi[oó]n\s+gratuita/i,
  /evaluaci[oó]n\s+gratis/i,
  /evaluaci[oó]n\s+gratuita/i,
  /evaluaci[oó]n\s+sin\s+costo/i,
  /se\s+bonifica/i,
  /bonifica\s+si\s+reparas/i,
  /bonificable/i,
  /abonable/i,
  /gratis\s+si\s+(autorizas|reparas)/i,
  /gratis\s+al\s+reparar/i,
];

const targetDirs = ['src', 'public', 'dist'];
const excludeExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.mp4', '.webm', '.pdf', '.zip'];

let matchCount = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.astro') continue;
      scanDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (excludeExtensions.includes(ext)) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          for (const pattern of patterns) {
            if (pattern.test(line)) {
              console.log(`[MATCH] ${fullPath}:${idx + 1}: ${line.trim()}`);
              matchCount++;
              break;
            }
          }
        });
      } catch (err) {
        // ignore read error
      }
    }
  }
}

for (const dir of targetDirs) {
  scanDir(dir);
}

console.log(`\nScan finished. Total matches: ${matchCount}`);
process.exit(matchCount === 0 ? 0 : 1);
