const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const replacements = [
  // Card 1: Laptops 
  {
    to: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20laptops')\"",
    from: "window.location.href='/reparaciones#laptops'\""
  },
  // Card 2: PC Gamer 
  {
    to: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20PC%20Gamer')\"",
    from: "window.location.href='/optimizacion#paquetes-optimizacion'\""
  },
  // Card 3: Celulares
  {
    to: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20celulares')\"",
    from: "window.location.href='/reparaciones#celulares'\""
  },
  // Card 4: Impresoras
  {
    to: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20impresoras')\"",
    from: "window.location.href='/reparaciones#impresoras'\""
  },
  // Card 5: Consolas
  {
    to: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20consolas')\"",
    from: "window.location.href='/reparacion-controles#servicios-control'\""
  },
  // Card 6: B2B
  {
    to: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20soporte%20empresarial')\"",
    from: "window.location.href='/reparaciones#empresas'\""
  },
  // Bisagras card 
  {
    to: "smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparacion%20de%20bisagras')\"",
    from: "window.location.href='/reparacion-bisagras#galeria-bisagras'\""
  }
];

// Revert button text 
const textReplacements = [
  { to: '>Cotizar\n                            ahora <i', from: '>Ver detalles <i' },
];

replacements.forEach(r => {
  if (html.includes(r.from)) {
    html = html.replace(r.from, r.to);
    console.log('Reverted:', r.from.substring(0, 40));
  }
});

// We only replace the button text for the cards that had specific text before, but it's simpler to just replace all "Ver detalles" inside index cards.
html = html.replace(/>Ver detalles <i/g, ">Cotizar ahora <i");

fs.writeFileSync('index.html', html);
console.log('Restored index.html cards to WhatsApp!');
