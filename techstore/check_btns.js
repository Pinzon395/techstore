const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
let idx = 0;
const results = [];
while ((idx = h.indexOf('btn-specialty-info', idx + 1)) > -1) {
  results.push(h.substring(idx, idx + 300));
}
results.forEach((r, i) => console.log(i + ':', r, '---'));
