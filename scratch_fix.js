const fs = require('fs');
let content = fs.readFileSync('src/pages/limpieza-laptop-liquido.astro', 'utf8');
content = content.replace(/\r\n/g, '\n');
const lines = content.split('\n');
lines.splice(16, 6, '    "answer": "Limpieza estándar desde <strong>$750 MXN</strong>. Si la placa requiere reparación de pistas o reemplazo de teclado, sube a $1,500–$2,500. Diagnóstico es gratuito y te damos presupuesto cerrado antes de empezar."');
fs.writeFileSync('src/pages/limpieza-laptop-liquido.astro', lines.join('\n'));
