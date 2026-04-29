const fs = require('fs');

let html = fs.readFileSync('reparacion-controles.html', 'utf8');

// Update the IntersectionObserver JS
html = html.replace(
    /document\.querySelectorAll\('\.card-services, \.console-grid, \.rel-card'\)\.forEach\(el => \{/g,
    "document.querySelectorAll('.card-services, .console-grid, .rel-card, .card-servicio').forEach(el => {"
);

html = html.replace(
    /if\(el\.classList\.contains\('rel-card'\)\) \{/g,
    "if(el.classList.contains('rel-card') || el.classList.contains('card-servicio')) {"
);

fs.writeFileSync('reparacion-controles.html', html);
console.log('Fixed IntersectionObserver logic for .card-servicio.');
