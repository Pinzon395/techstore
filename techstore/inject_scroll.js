const fs = require('fs');
const pages = ['reparaciones.html','optimizacion.html','reparacion-bisagras.html','reparacion-controles.html','ensambles.html'];
const tag = '<script src="/components/smooth-scroll-nav.js"></script>';
pages.forEach(p => {
  let html = fs.readFileSync(p, 'utf8');
  if (!html.includes('smooth-scroll-nav')) {
    html = html.replace('</body>', tag + '\n</body>');
    fs.writeFileSync(p, html);
    console.log('Added to ' + p);
  } else {
    console.log('Already in ' + p);
  }
});
