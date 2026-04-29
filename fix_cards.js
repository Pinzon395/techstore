const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const replacements = [
  // Card 1: Laptops → /reparaciones#laptops
  {
    from: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20laptops')\"",
    to: "window.location.href='/reparaciones#laptops'\""
  },
  // Card 2: PC Gamer → /optimizacion#paquetes-optimizacion  
  {
    from: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20PC%20Gamer')\"",
    to: "window.location.href='/optimizacion#paquetes-optimizacion'\""
  },
  // Card 3: Celulares → /reparaciones#celulares
  {
    from: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20celulares')\"",
    to: "window.location.href='/reparaciones#celulares'\""
  },
  // Card 4: Impresoras → /reparaciones#impresoras
  {
    from: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20impresoras')\"",
    to: "window.location.href='/reparaciones#impresoras'\""
  },
  // Card 5: Consolas → /reparacion-controles#servicios-control
  {
    from: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20consolas')\"",
    to: "window.location.href='/reparacion-controles#servicios-control'\""
  },
  // Card 6: B2B → /reparaciones#empresas
  {
    from: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20soporte%20empresarial')\"",
    to: "window.location.href='/reparaciones#empresas'\""
  }
];

// Also fix the button text (remove multi-line "Cotizar\n ahora", "Ver\n más...")
const textReplacements = [
  { from: '>Cotizar\r\n                            ahora <i', to: '>Ver detalles <i' },
  { from: '>Cotizar\n                            ahora <i', to: '>Ver detalles <i' },
  { from: '>Ver\r\n                            más información <i', to: '>Ver detalles <i' },
  { from: '>Ver\n                            más información <i', to: '>Ver detalles <i' },
  { from: '>Solicitar\r\n                            servicio <i', to: '>Ver detalles <i' },
  { from: '>Solicitar\n                            servicio <i', to: '>Ver detalles <i' },
  { from: '>Enviar\r\n                            mensaje <i', to: '>Ver detalles <i' },
  { from: '>Enviar\n                            mensaje <i', to: '>Ver detalles <i' },
];

replacements.forEach(r => {
  if (html.includes(r.from)) {
    html = html.replace(r.from, r.to);
    console.log('Replaced:', r.from.substring(0, 60));
  } else {
    console.log('NOT FOUND:', r.from.substring(0, 60));
  }
});

textReplacements.forEach(r => {
  if (html.includes(r.from)) {
    html = html.replace(r.from, r.to);
    console.log('Text replaced OK');
  }
});

fs.writeFileSync('index.html', html);
console.log('Done!');
