const fs = require('fs');
const path = require('path');

function fixLinks(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
        if (fs.statSync(fullPath).isDirectory()) {
            fixLinks(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const original = content;
            content = content.replace(/\/instalacion-windows#paquetes-optimizacion/g, '/optimizacion?section=paquetes-optimizacion');
            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Fixed optimization links in:', fullPath);
            }
        }
    }
}

fixLinks('.');
console.log('Done fixing optimization links.');
