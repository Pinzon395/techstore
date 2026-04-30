const fs = require('fs');
const path = require('path');

// 1. Get the target block from index.html
const indexHtml = fs.readFileSync('index.html', 'utf8');
const navMatch = indexHtml.match(/<ul class=\"nav-menu\">[\s\S]*?<\/ul>/);
if (!navMatch) {
    console.error('nav-menu not found in index.html');
    process.exit(1);
}
const newNavMenu = navMatch[0];

// 2. Walk directories
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist') && !file.includes('en')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.html') && file !== 'index.html') {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('pages');

let modifiedCount = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // We replace the existing nav-menu block
    const existingNavMatch = content.match(/<ul class=\"nav-menu\">[\s\S]*?<\/ul>/);
    if (existingNavMatch) {
        content = content.replace(existingNavMatch[0], newNavMenu);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
        modifiedCount++;
    }
});
console.log('Total files updated: ' + modifiedCount);
