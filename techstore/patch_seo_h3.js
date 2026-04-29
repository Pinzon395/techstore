const fs = require('fs');
let content = fs.readFileSync('preguntas-frecuentes.html', 'utf8');

// The output generated:
// <button class="faq-question" aria-expanded="false" onclick="toggleFaq(this)">
//     <span>¿Cuestion...?</span>
//     <i class="fa-solid fa-chevron-down faq-chevron"></i>
// </button>

// Regex replace span with h3, keeping content.
content = content.replace(/<button class="faq-question"(.*?)>\s*<span>(.*?)<\/span>/g,
    '<button class="faq-question"$1>\n                    <h3 style="margin:0; font-size:inherit; font-weight:inherit; display:flex; align-items:flex-start; flex:1; line-height:1.4;">$2</h3>');

fs.writeFileSync('preguntas-frecuentes.html', content, 'utf8');
console.log("H3 tags patched for SEO!");
