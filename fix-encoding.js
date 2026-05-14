// fix-encoding.js - Convierte archivos .astro de Latin-1 a UTF-8
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
let fixedCount = 0;
let errorCount = 0;

function fixEncoding(filePath) {
    const buffer = fs.readFileSync(filePath);
    const content = buffer.toString('latin1');
    fs.writeFileSync(filePath, content, 'utf8');
}

function processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            processDirectory(fullPath);
        } else if (entry.name.endsWith('.astro')) {
            try {
                fixEncoding(fullPath);
                const relative = path.relative(__dirname, fullPath);
                console.log(`Fixed: ${relative}`);
                fixedCount++;
            } catch (err) {
                console.error(`Error: ${fullPath} - ${err.message}`);
                errorCount++;
            }
        }
    }
}

console.log('Fixing encoding: Latin-1 -> UTF-8\n');
processDirectory(srcDir);
console.log(`\nDone! Fixed: ${fixedCount}, Errors: ${errorCount}`);