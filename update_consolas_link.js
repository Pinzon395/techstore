const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.html')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('pages').concat(['index.html']);

let modifiedCount = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('href="/limpieza-consolas"')) {
        content = content.replace(/href="\/limpieza-consolas"/g, 'href="/reparaciones?section=consolas"');
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
        modifiedCount++;
    }
});
console.log('Total files updated: ' + modifiedCount);
