const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Remove all existing location-placeholders
    const placeholderRegex = /[ \t]*<div id="location-placeholder"><\/div>\r?\n?/g;
    content = content.replace(placeholderRegex, '');

    // 2. Insert it back inside contact-left right after the </ul>
    // The structure is:
    //                     </ul>
    // 
    //     <!-- ═══ UBICACIÓN (cargada desde componente compartido) ═══ -->
    //                 </div>
    //                 <div class="contact-right">

    const insertRegex = /(<ul class="contact-details mt-4">[\s\S]*?<\/ul>)/;
    
    if (content.match(insertRegex)) {
        content = content.replace(insertRegex, '$1\n\n                    <!-- ═══ MAPA ═══ -->\n                    <div id="location-placeholder"></div>');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed layout in ' + filePath);
    } else {
        console.log('Could not find contact-left ul in ' + filePath);
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.html')) {
            processFile(fullPath);
        }
    }
}

processFile('index.html');
walkDir('pages');
console.log('Done moving map');
