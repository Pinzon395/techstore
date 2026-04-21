const fs = require('fs');
let content = fs.readFileSync('preguntas-frecuentes.html', 'utf8');

// Replace H3 back to Span 
content = content.replace(/<h3 style="margin:0; font-size:inherit; font-weight:inherit; display:flex; align-items:flex-start; flex:1; line-height:1.4;">([\s\S]*?)<\/h3>/g, '<span>$1</span>');

fs.writeFileSync('preguntas-frecuentes.html', content, 'utf8');
console.log("Reverted H3 to span!");
