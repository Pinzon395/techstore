const fs = require('fs');

let content = fs.readFileSync('contacto.html', 'utf8');

const specializedServices = `
                            </div>
                        </div>

                        <div class="form-group mb-3 mt-4">
                            <h4 class="text-center" style="font-size: 1.1rem; margin-bottom: 15px; color: #0f172a;">Servicios Especializados</h4>
                            <div class="device-buttons flex-row">
                                <a href="/optimizacion.html" class="btn btn-outline dev-btn" style="text-decoration: none;">
                                    <i class="fa-solid fa-rocket"></i> Optimización
                                </a>
                                <a href="/reparacion-bisagras.html" class="btn btn-outline dev-btn" style="text-decoration: none;">
                                    <i class="fa-solid fa-tools"></i> Bisagras
                                </a>
                            </div>
                        </div>
`;

if (!content.includes('Servicios Especializados')) {
    content = content.replace('                            </div>\n                        </div>\n                    </div>\n\n                    <div class="coverage-area"', specializedServices + '                    </div>\n\n                    <div class="coverage-area"');
    
    // Fallback for CRLF
    if (!content.includes('Servicios Especializados')) {
        content = content.replace('                            </div>\r\n                        </div>\r\n                    </div>\r\n\r\n                    <div class="coverage-area"', specializedServices + '                    </div>\r\n\r\n                    <div class="coverage-area"');
    }
    
    fs.writeFileSync('contacto.html', content);
    console.log('contacto.html patched successfully');
} else {
    console.log('contacto.html already patched');
}
