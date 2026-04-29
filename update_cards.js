const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Card 1: Reparación de Laptops → /reparaciones#laptops
html = html.replace(
  `onclick="event.stopPropagation(); window.location.href='/reparaciones'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`,
  `onclick="event.stopPropagation(); window.location.href='/reparaciones#laptops'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`
);

// Card 2: PC Gamer → /optimizacion#paquetes-optimizacion
html = html.replace(
  `onclick="event.stopPropagation(); window.location.href='/optimizacion'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`,
  `onclick="event.stopPropagation(); window.location.href='/optimizacion#paquetes-optimizacion'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`
);

// Card 3: Celulares → WhatsApp (no dedicated page, keep as is or go to reparaciones#celulares)
html = html.replace(
  `onclick="event.stopPropagation(); smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20celulares')">Cotizar\n                            ahora <i class="fa-solid fa-arrow-right"></i></button>`,
  `onclick="event.stopPropagation(); window.location.href='/reparaciones#celulares'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`
);

// Card 4: Impresoras → /reparaciones#impresoras
html = html.replace(
  `onclick="event.stopPropagation(); smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20impresoras')">Solicitar\n                            servicio <i class="fa-solid fa-arrow-right"></i></button>`,
  `onclick="event.stopPropagation(); window.location.href='/reparaciones#impresoras'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`
);

// Card 5: Consolas → /reparacion-controles#servicios-control
html = html.replace(
  `onclick="event.stopPropagation(); window.location.href='/reparacion-controles'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`,
  `onclick="event.stopPropagation(); window.location.href='/reparacion-controles#servicios-control'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`
);

// Card 6: B2B → /reparaciones#empresas
html = html.replace(
  `onclick="event.stopPropagation(); smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20soporte%20empresarial')">Cotizar\n                            ahora <i class="fa-solid fa-arrow-right"></i></button>`,
  `onclick="event.stopPropagation(); window.location.href='/reparaciones#empresas'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`
);

// Bisagras card (new one we added) → /reparacion-bisagras#galeria-bisagras
html = html.replace(
  `onclick="event.stopPropagation(); window.location.href='/reparacion-bisagras'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`,
  `onclick="event.stopPropagation(); window.location.href='/reparacion-bisagras#galeria-bisagras'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`
);

fs.writeFileSync('index.html', html);
console.log('Done! Cards updated with section hashes.');
