const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Change margin: 10px auto to margin: 5px 0
    content = content.replace(/margin:\s*10px\s*auto;/g, 'margin: 5px 0;');

    // 2. Change mt-4 on contact-details to mt-2
    content = content.replace(/class="contact-details mt-4"/g, 'class="contact-details mt-2"');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed spacing in ' + filePath);
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
console.log('Done fixing spacing');
