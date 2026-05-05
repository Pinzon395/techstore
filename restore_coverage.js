const fs = require('fs');
const path = require('path');

const coverageHtml = `
                    <div class="coverage-area" id="cobertura">
                        <p class="coverage-title" style="font-weight:700; font-size:1.1rem;">
                            <i class="fa-solid fa-map-location-dot"></i> Zonas que Cubrimos
                        </p>
                        <p class="coverage-subtitle">Recolección y entrega a tu puerta en Cancún y alrededores.</p>
                        <div class="coverage-zones">
                            <span class="coverage-zone coverage-zone--primary">
                                <i class="fa-solid fa-circle-check"></i> Zona Hotelera
                            </span>
                            <span class="coverage-zone coverage-zone--primary">
                                <i class="fa-solid fa-circle-check"></i> Haciendas
                            </span>
                            <span class="coverage-zone coverage-zone--primary">
                                <i class="fa-solid fa-circle-check"></i> Supermanzanas
                            </span>
                            <span class="coverage-zone">
                                <i class="fa-solid fa-circle-check"></i> Polígono Sur
                            </span>
                            <span class="coverage-zone">
                                <i class="fa-solid fa-circle-check"></i> Huayacán
                            </span>
                            <span class="coverage-zone">
                                <i class="fa-solid fa-circle-check"></i> Puerto Morelos
                            </span>
                            <span class="coverage-zone">
                                <i class="fa-solid fa-circle-check"></i> Puerto Juárez
                            </span>
                            <span class="coverage-zone coverage-zone--ask">
                                <i class="fa-solid fa-circle-question"></i> ¿Otra zona? ¡Pregunta!
                            </span>
                        </div>
                        <button
                            onclick="smartWaRedirect('https://wa.me/529986690777?text=Quiero%20que%20recojan%20mi%20equipo%20a%20domicilio%20en%20Canc%C3%BAn')"
                            class="btn btn-outline coverage-cta-btn" id="btn-cobertura-pickup">
                            <i class="fa-solid fa-truck"></i> Pedir Recolección a Domicilio
                        </button>
                    </div>`;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Look for the end of the device buttons in contact-right
    const targetRegex = /([ \t]*<i class="fa-solid fa-building"><\/i> B2B\r?\n[ \t]*<\/button>\r?\n[ \t]*<\/div>\r?\n[ \t]*<\/div>\r?\n[ \t]*<\/div>)(?![\s\S]*<div class="coverage-area" id="cobertura">)/g;
    
    if (content.match(targetRegex)) {
        content = content.replace(targetRegex, '$1\n' + coverageHtml);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Restored in ' + filePath);
    }
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.html')) {
            processFile(fullPath);
        }
    }
}

processFile('index.html');
walkDir('pages');
console.log('Done');
