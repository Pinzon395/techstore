const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Fix remaining button texts that didn't get cleaned
html = html.replace(
  "window.location.href='/reparaciones#celulares'\">Cotizar\r\n                            ahora <i",
  "window.location.href='/reparaciones#celulares'\">Ver detalles <i"
);
html = html.replace(
  "window.location.href='/reparaciones#celulares'\">\nCotizar\n                            ahora <i",
  "window.location.href='/reparaciones#celulares'\">Ver detalles <i"
);
html = html.replace(
  "window.location.href='/reparaciones#empresas'\">Cotizar\r\n                            ahora <i",
  "window.location.href='/reparaciones#empresas'\">Ver detalles <i"
);
html = html.replace(
  "window.location.href='/reparaciones#empresas'\">\nCotizar\n                            ahora <i",
  "window.location.href='/reparaciones#empresas'\">Ver detalles <i"
);

fs.writeFileSync('index.html', html);
console.log('Text fixed!');
