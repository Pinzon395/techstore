const fs = require('fs');
let content = fs.readFileSync('src/pages/en/corporate.astro', 'utf8');
content = content.replace(/\r\n/g, '\n');
const lines = content.split('\n');
lines.splice(475, 8);
fs.writeFileSync('src/pages/en/corporate.astro', lines.join('\n'));
