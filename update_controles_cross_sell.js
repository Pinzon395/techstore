const fs = require('fs');

// --- Modify reparacion-controles.html ---
let controlsHtml = fs.readFileSync('reparacion-controles.html', 'utf8');

// Remove transform: translateY on .rel-card:hover
controlsHtml = controlsHtml.replace(
  /\.rel-card:hover\s*\{\s*background:\s*rgba\(255,\s*255,\s*255,\s*0\.13\);\s*transform:\s*translateY\(-4px\);\s*\}/g,
  ".rel-card:hover {\n            background: rgba(255, 255, 255, 0.13);\n            /* transform removed to keep text static */\n        }"
);

// Update Laptops link
controlsHtml = controlsHtml.replace(
  '<a href="/reparaciones" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-screwdriver-wrench"',
  '<a href="/reparaciones#laptops" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-screwdriver-wrench"'
);

// Update Bisagras link
controlsHtml = controlsHtml.replace(
  '<a href="/reparacion-bisagras" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-laptop-medical"',
  '<a href="/reparacion-bisagras#galeria-bisagras" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-laptop-medical"'
);

// Update Optimizacion link
controlsHtml = controlsHtml.replace(
  '<a href="/optimizacion" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-rocket"',
  '<a href="/optimizacion#paquetes-optimizacion" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-rocket"'
);

// Update Consolas link (it will go to /reparaciones#consolas as requested)
controlsHtml = controlsHtml.replace(
  '<a href="/reparaciones" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-microchip"',
  '<a href="/reparaciones#consolas" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-microchip"'
);

// Update Ensambles link
controlsHtml = controlsHtml.replace(
  '<a href="/ensambles" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-desktop"',
  '<a href="/ensambles#ensamble-pc" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-desktop"'
);

// Update Celulares link
controlsHtml = controlsHtml.replace(
  '<a href="/reparaciones" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-mobile-screen"',
  '<a href="/reparaciones#celulares" class="rel-card wave-card" style="max-width:220px;">\n                    <i class="fa-solid fa-mobile-screen"'
);

fs.writeFileSync('reparacion-controles.html', controlsHtml);


// --- Modify ensambles.html to add ID ---
let ensamblesHtml = fs.readFileSync('ensambles.html', 'utf8');
if (!ensamblesHtml.includes('id="ensamble-pc"')) {
  // Let's add it to the first section after header or the main content section
  // Usually there's a <section class="section-padding"> or similar
  ensamblesHtml = ensamblesHtml.replace('<section class="', '<section id="ensamble-pc" class="');
  fs.writeFileSync('ensambles.html', ensamblesHtml);
}

console.log('Modified reparacion-controles cards and ensambles ID.');
