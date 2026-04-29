const fs = require('fs');
let content = fs.readFileSync('preguntas-frecuentes.html', 'utf8');

// The script output used:
// <div class="faq-category-title"[optional styles]>
//    <i class="..."></i> Title
// </div>

// We can just regex replace: <div class="faq-category-title" to <h2 class="faq-category-title"
// But we must also close the </h2>.
// Since each category title is followed by <div class="faq-page-grid">, we can detect the closing div.

content = content.replace(/<div class="faq-category-title"(.*?)>([\s\S]*?)<\/div>\s*<div class="faq-page-grid">/g, 
                          '<h2 class="faq-category-title"$1>$2</h2>\n        <div class="faq-page-grid">');

fs.writeFileSync('preguntas-frecuentes.html', content, 'utf8');
console.log("H2 tags patched for SEO!");
