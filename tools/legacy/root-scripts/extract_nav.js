const fs = require('fs');
const data = fs.readFileSync('temp_nav.html', 'utf8');
const start = data.indexOf('<nav ');
const end = data.indexOf('</nav>') + 6;
if (start !== -1 && end > start) {
    const navHtml = data.substring(start, end);
    let content = fs.readFileSync('components/navbar.js', 'utf8');
    content = content.replace(/const NAVBAR_HTML = \`[\s\S]*?\`;/, 'const NAVBAR_HTML = \`\\n' + navHtml.replace(/\`/g, '\\\`').replace(/\$/g, '$$$$') + '\\n\`;');
    fs.writeFileSync('components/navbar.js', content);
    console.log('Successfully updated navbar.js');
} else {
    console.log('Could not find <nav> tag');
}
