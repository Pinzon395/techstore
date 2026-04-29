const fs = require('fs');

let content = fs.readFileSync('mantenimiento-mac.html', 'utf8');

// 1. Meta Tags Update
content = content.replace(
    'Mantenimiento interno premium para Mac y PC en Cancún. Cambio de pasta térmica, limpieza ultrasónica y pulido de disipador (Efecto Espejo).',
    'Mantenimiento interno profesional para Mac en Cancún. Limpieza técnica de precisión, revisión de tarjeta madre y aplicación de pasta térmica premium.'
);
content = content.replace(
    'mantenimiento mac Cancún, pasta térmica premium, limpieza macbook, efecto espejo procesador, mantenimiento pc gamer Cancún',
    'mantenimiento mac Cancún, pasta térmica premium, limpieza macbook, limpieza interna profesional, mantenimiento apple Cancún'
);
content = content.replace(
    'Protege tu inversión con un mantenimiento a nivel componente. Implementamos efecto espejo, metales líquidos y limpieza ultrasónica.',
    'Protege tu inversión de Apple con un mantenimiento a nivel componente. Implementamos limpieza interna profesional y revisión técnica de precisión.'
);

// 2. Hero Text Update
content = content.replace(
    '<p>La humedad, el polvo y el uso continuo pueden afectar el rendimiento de tu Mac sin que lo notes de inmediato. Nuestro servicio está pensado para devolverle estabilidad, temperatura adecuada y mejor respuesta al equipo mediante un mantenimiento técnico detallado.</p>',
    '<p>La humedad, el polvo y el uso continuo pueden afectar el rendimiento de tu Mac sin que lo notes de inmediato. Nuestro servicio de mantenimiento de Mac en Cancún está pensado para devolverle estabilidad, temperatura adecuada y mejor respuesta al equipo mediante una limpieza interna profesional y una revisión técnica detallada.</p>'
);

// 3. Feature Points update
// Point 2
content = content.replace(
    /<h3>2\. Limpieza interna de precisión<\/h3>\s*<p>Desarmamos el equipo con cuidado para limpiar zonas críticas donde se acumula suciedad y se reduce el rendimiento térmico\.<\/p>/s,
    '<h3>2. Limpieza interna de precisión</h3>\n                                <p>Desarmamos el equipo con cuidado para limpiar las zonas críticas donde se acumula suciedad y donde se compromete la disipación térmica.</p>'
);

// Insert Point 3 and move 3->4, 4->5
// By replacing the block starting from <div class="feature-point"> down to </div> right before point 3.
// Actually, it's safer to use regex to replace point 3 and 4 with 3, 4, and 5.
const currentPoints3and4 = `<div class="feature-point">
                            <div class="feature-icon-lg"><i class="fa-solid fa-temperature-arrow-down"></i></div>
                            <div>
                                <h3>3. Optimización térmica</h3>
                                <p>Aplicamos materiales adecuados para mejorar la transferencia de calor y ayudar a que tu Mac trabaje con mayor estabilidad.</p>
                            </div>
                        </div>

                        <div class="feature-point">
                            <div class="feature-icon-lg"><i class="fa-solid fa-shield-heart"></i></div>
                            <div>
                                <h3>4. Cuidado preventivo</h3>
                                <p>Un mantenimiento a tiempo ayuda a evitar apagados inesperados, calentamiento excesivo y desgaste prematuro de componentes.</p>
                            </div>
                        </div>`;

const newPoints3_4_5 = `<div class="feature-point">
                            <div class="feature-icon-lg"><i class="fa-solid fa-microchip"></i></div>
                            <div>
                                <h3>3. Revisión y limpieza de componentes</h3>
                                <p>Inspeccionamos los componentes internos, ventiladores, disipadores y zonas sensibles para asegurar un mantenimiento completo y ordenado.</p>
                            </div>
                        </div>

                        <div class="feature-point">
                            <div class="feature-icon-lg"><i class="fa-solid fa-temperature-arrow-down"></i></div>
                            <div>
                                <h3>4. Optimización térmica</h3>
                                <p>Aplicamos pasta térmica de alta calidad para mejorar la transferencia de calor y ayudar a que tu Mac trabaje con mayor estabilidad.</p>
                            </div>
                        </div>

                        <div class="feature-point">
                            <div class="feature-icon-lg"><i class="fa-solid fa-shield-heart"></i></div>
                            <div>
                                <h3>5. Cuidado preventivo</h3>
                                <p>Un mantenimiento a tiempo ayuda a evitar apagados inesperados, calentamiento excesivo y desgaste prematuro de componentes.</p>
                            </div>
                        </div>`;

content = content.replace(currentPoints3and4, newPoints3_4_5);

// 4. Update the Incluye List
const oldIncluye = `<li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Limpieza interna completa.
                            </li>
                            <li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Revisión de componentes.
                            </li>
                            <li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Pasta térmica de desempeño.
                            </li>
                            <li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Limpieza de ventilación.
                            </li>
                            <li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Optimización del flujo de aire.
                            </li>
                            <li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Control de temperatura.
                            </li>`;

const newIncluye = `<li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Limpieza interna completa
                            </li>
                            <li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Revisión de componentes
                            </li>
                            <li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Cambio de pasta térmica de alto desempeño
                            </li>
                            <li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Limpieza de ventilación y disipación
                            </li>
                            <li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Optimización del flujo de aire
                            </li>
                            <li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Control de temperatura
                            </li>
                            <li style="display: flex; align-items: start; gap: 10px; color: #cbd5e1;">
                                <i class="fa-solid fa-check" style="color: #38bdf8; margin-top: 4px;"></i> Diagnóstico preventivo
                            </li>`;

content = content.replace(oldIncluye, newIncluye);

// 5. SEO Block injection before photos
const oldPhotosStart = `<!-- FOTOS ESTÉTICAS ASIMÉTRICAS -->`;
const additionalSEOText = `<div style="background: rgba(14, 165, 233, 0.03); border: 1px solid rgba(14, 165, 233, 0.1); border-radius: 24px; padding: 30px; margin-bottom: 40px;">
                        <h3 style="color: #ffffff; font-size: 1.4rem; margin-bottom: 15px;">Servicio técnico especializado para MacBook e iMac</h3>
                        <p style="color: #94a3b8; line-height: 1.7; margin: 0;">Realizamos mantenimiento de Mac con enfoque profesional, ideal para equipos que presentan calentamiento, lentitud, ruido en ventiladores o pérdida de rendimiento. Nuestro proceso está pensado para cuidar tu equipo Apple con precisión, limpieza y materiales de calidad.</p>
                    </div>\n\n                    <!-- FOTOS ESTÉTICAS ASIMÉTRICAS -->`;

content = content.replace(oldPhotosStart, additionalSEOText);

fs.writeFileSync('mantenimiento-mac.html', content, 'utf8');
console.log("SEO MAC content injected successfully.");
