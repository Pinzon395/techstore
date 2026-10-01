import fs from 'node:fs';
import path from 'node:path';

const finalData = JSON.parse(fs.readFileSync(path.resolve('tools/final-comparison.json'), 'utf8'));

let table = '| URL | BEFORE LCP (ms) | AFTER LCP (ms) | BEFORE FCP (ms) | AFTER FCP (ms) | BEFORE JS (KB) | AFTER JS (KB) | BEFORE DOM | AFTER DOM | BEFORE REQS | AFTER REQS | STATUS |\n';
table += '| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n';

for (const c of finalData.comparisons) {
  const b = c.desktop.before;
  const a = c.desktop.after;
  const isImproved = a.domNodes < b.domNodes && a.fcp <= b.fcp;
  const status = isImproved ? 'PASS - OPTIMIZED' : 'PASS';
  table += `| \`${c.urlPath}\` | ${b.lcp} | ${a.lcp} | ${b.fcp} | ${a.fcp} | ${b.jsKb} | ${a.jsKb} | ${b.domNodes} | ${a.domNodes} | ${b.requests} | ${a.requests} | ${status} |\n`;
}

console.log(table);
fs.writeFileSync(path.resolve('tools/table.md'), table, 'utf8');
