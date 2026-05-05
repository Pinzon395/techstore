const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('id="location-placeholder"')) {
        return; 
    }
    
    const targetRegex = /(<\/section>\r?\n\r?\n[ \t]*)(<!-- ═══ FOOTER ═══ -->|<footer)/i;
    
    if (content.match(targetRegex)) {
        content = content.replace(targetRegex, '$1    <div id="location-placeholder"></div>\n\n    $2');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Added placeholder to ' + filePath);
    } else {
        console.log('Could not find footer in ' + filePath);
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
