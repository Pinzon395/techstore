const fs = require('fs');
const checks = [
  ['reparaciones.html', 'laptops'],
  ['reparaciones.html', 'celulares'],
  ['reparaciones.html', 'consolas'],
  ['reparaciones.html', 'impresoras'],
  ['reparaciones.html', 'empresas'],
  ['reparacion-bisagras.html', 'galeria-bisagras'],
  ['reparacion-controles.html', 'servicios-control'],
  ['optimizacion.html', 'paquetes-optimizacion'],
];
checks.forEach(([page, id]) => {
  const html = fs.readFileSync(page, 'utf8');
  const found = html.includes('id="' + id + '"');
  console.log((found ? 'OK' : 'MISSING') + ' | ' + page + ' | #' + id);
});
