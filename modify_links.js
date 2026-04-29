const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target1 = `                <li><a href="/" class="nav-links active-link">Inicio</a></li>
                <li><a href="/paquetes" class="nav-links ">Paquetes</a></li>`;
                
const replacement1 = `                <li><a href="/" class="nav-links active-link">Inicio</a></li>
                <li class="nav-item-dropdown" style="position: relative; margin-right: 15px;" onmouseenter="this.querySelector('.dropdown-menu').style.display='block'" onmouseleave="this.querySelector('.dropdown-menu').style.display='none'">
                    <a href="/reparaciones" class="nav-links">Servicios ▼</a>
                    <ul class="dropdown-menu" style="display: none; position: absolute; background: white; list-style: none; padding: 10px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 220px; z-index: 100;">
                        <li><a href="/reparaciones" style="display: block; padding: 8px 12px; color: #334155; text-decoration: none;">Reparación General</a></li>
                        <li><a href="/reparacion-bisagras" style="display: block; padding: 8px 12px; color: #334155; text-decoration: none;">Reparación de Bisagras</a></li>
                        <li><a href="/reparacion-controles" style="display: block; padding: 8px 12px; color: #334155; text-decoration: none;">Reparación de Controles</a></li>
                        <li><a href="/optimizacion" style="display: block; padding: 8px 12px; color: #334155; text-decoration: none;">Mantenimiento y Optimización</a></li>
                    </ul>
                </li>
                <li><a href="/paquetes" class="nav-links ">Paquetes</a></li>`;

html = html.replace(target1, replacement1);

const target2 = `onclick="event.stopPropagation(); smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20laptops')">Cotizar
                            ahora <i class="fa-solid fa-arrow-right"></i></button>`;
const replacement2 = `onclick="event.stopPropagation(); window.location.href='/reparaciones'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`;
html = html.replace(target2, replacement2);

const target3 = `onclick="event.stopPropagation(); smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20PC%20Gamer')">Ver
                            más información <i class="fa-solid fa-arrow-right"></i></button>`;
const replacement3 = `onclick="event.stopPropagation(); window.location.href='/optimizacion'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`;
html = html.replace(target3, replacement3);

const target4 = `onclick="event.stopPropagation(); smartWaRedirect('https://wa.me/529986690777?text=Quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20reparaci%C3%B3n%20de%20consolas')">Enviar
                            mensaje <i class="fa-solid fa-arrow-right"></i></button>`;
const replacement4 = `onclick="event.stopPropagation(); window.location.href='/reparacion-controles'">Ver detalles <i class="fa-solid fa-arrow-right"></i></button>`;
html = html.replace(target4, replacement4);

fs.writeFileSync('index.html', html);
