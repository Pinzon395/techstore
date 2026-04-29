const fs = require('fs');

let html = fs.readFileSync('reparacion-controles.html', 'utf8');

// Reemplazar todos los # por ?section= en la sección específica
html = html.replace('href="/reparaciones#laptops"', 'href="/reparaciones?section=laptops"');
html = html.replace('href="/reparacion-bisagras#galeria-bisagras"', 'href="/reparacion-bisagras?section=galeria-bisagras"');
html = html.replace('href="/optimizacion#paquetes-optimizacion"', 'href="/optimizacion?section=paquetes-optimizacion"');
html = html.replace('href="/reparaciones#consolas"', 'href="/reparaciones?section=consolas"');
html = html.replace('href="/ensambles#ensamble-pc"', 'href="/ensambles?section=ensamble-pc"');
html = html.replace('href="/reparaciones#celulares"', 'href="/reparaciones?section=celulares"');

fs.writeFileSync('reparacion-controles.html', html);
console.log('Links convertidos a ?section= para evitar el salto nativo.');
