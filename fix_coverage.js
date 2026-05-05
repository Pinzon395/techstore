
const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Remove location-placeholder and its comment
    const locRegex = /[ \t]*<!-- --- UBICACIÓN.*?--- -->\r?\n[ \t]*<div id="location-placeholder"><\/div>\r?\n/g;
    content = content.replace(locRegex, '');

    // Also just in case it doesn't have the comment:
    content = content.replace(/[ \t]*<div id="location-placeholder"><\/div>\r?\n/g, '');

    // 2. Remove coverage-area block
    const covRegex = /[ \t]*<div class="coverage-area" id="cobertura">[\s\S]*?<\/button>\r?\n[ \t]*<\/div>\r?\n/g;
    content = content.replace(covRegex, '');

    // 3. Insert location-placeholder after the contact section
    // The contact section ends with:
    //         </div>
    //     </section>
    //     <!-- --- FOOTER --- -->
    // We will find </section>\s*<!-- --- FOOTER --- --> and insert the location placeholder right before the footer.
    const footerRegex = /(<\/section>[\s\r\n]*)(<!-- --- FOOTER --- -->)/;
    if (!content.includes('id="location-placeholder"')) {
        content = content.replace(footerRegex, '$1    <div id="location-placeholder"></div>\n\n    $2');
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed ' + filePath);
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
console.log('Done');

