import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const html = fs.readFileSync(path.resolve('dist/index.html'));
const htmlBrotli = zlib.brotliCompressSync(html);
console.log(`dist/index.html: uncompressed = ${(html.length/1024).toFixed(1)} KB, brotli = ${(htmlBrotli.length/1024).toFixed(1)} KB`);

const astroFiles = fs.readdirSync(path.resolve('dist/_astro')).filter(f => f.endsWith('.js'));
let totalJs = 0;
let totalJsBrotli = 0;
for (const file of astroFiles) {
  const buf = fs.readFileSync(path.resolve('dist/_astro', file));
  totalJs += buf.length;
  totalJsBrotli += zlib.brotliCompressSync(buf).length;
}
console.log(`Total _astro JS (${astroFiles.length} files): uncompressed = ${(totalJs/1024).toFixed(1)} KB, brotli = ${(totalJsBrotli/1024).toFixed(1)} KB`);
