const fs = require('fs');

let c = fs.readFileSync('index.html', 'utf8');

c = c.replace('<p>Pantalla, batera, teclado, sobrecalentamiento</p>', '<p>Reparacin de laptops en Cancn: pantalla, batera, teclado y problemas de sobrecalentamiento.</p>');
c = c.replace('<p>Pantalla, batería, teclado, sobrecalentamiento</p>', '<p>Reparación de laptops en Cancún: pantalla, batería, teclado y problemas de sobrecalentamiento.</p>');

c = c.replace('<p>Limpieza GPU, diagnstico, ensamble, overclocking</p>', '<p>Mantenimiento de PC gamer en Cancn</p>');
c = c.replace('<p>Limpieza GPU, diagnóstico, ensamble, overclocking</p>', '<p>Mantenimiento de PC gamer en Cancún</p>');

c = c.replace('<p>Pantalla, batera, cǭmara, carga, Android e iPhone</p>', '<p>Reparacin de celulares en Cancn</p>');
c = c.replace('<p>Pantalla, batería, cámara, carga, Android e iPhone</p>', '<p>Reparación de celulares en Cancún</p>');

c = c.replace('<p>Inyeccin, lǭser, cabezal, atasco, conectividad</p>', '<p>Reparacin de impresoras en Cancn</p>');
c = c.replace('<p>Inyección, láser, cabezal, atasco, conectividad</p>', '<p>Reparación de impresoras en Cancún</p>');

c = c.replace('Tu equipo se daa por el clima de Cancn?', 'Por qu las computadoras fallan ms en Cancn?');
c = c.replace('¿Tu equipo se daña por el clima de Cancún?', '¿Por qué las computadoras fallan más en Cancún?');

c = c.replace(/<h2>(?:.Por qu. las computadoras fallan m.s en Canc.n\?|<\/h2>)([^<]*<p>)/, '<h2>¿Por qué las computadoras fallan más en Cancún?</h2>\n                    <p style="font-weight:600; color:#1e293b; margin-bottom:15px;">El clima de Cancún afecta directamente el funcionamiento de laptops, PCs y consolas. La humedad, el salitre y el calor provocan corrosión interna, sobrecalentamiento y fallas en componentes electrónicos.</p>$1');

// Liquid Metal
c = c.replace('El metal lquido es una pasta trmica', '<strong>Servicio de aplicacin de metal lquido en Cancn para laptops y PCs gamer de alto rendimiento.</strong><br>El metal lquido es una pasta trmica');
c = c.replace('El metal líquido es una pasta térmica', '<strong>Servicio de aplicación de metal líquido en Cancún para laptops y PCs gamer de alto rendimiento.</strong><br>El metal líquido es una pasta térmica');

// Headers Mac/Sofware
c = c.replace('<h3>Cuidado Integral para Mac', '<h3>Mantenimiento de Mac en Cancún');
c = c.replace('<h3>Formateo y Optimizacin', '<h3>Formateo y optimizacin de computadoras en Cancn');
c = c.replace('<h3>Formateo y Optimización', '<h3>Formateo y optimización de computadoras en Cancún');

c = c.replace('>Cmo funciona?</h2>', '>Cmo funciona?</h2>\n                <p style="color: #cbd5e1; font-size: 1.1rem; max-width: 600px; margin: 0 auto 20px;">Nuestro proceso de reparacin de computadoras en Cancn est diseado para ser rpido, transparente y confiable.</p>');
c = c.replace('>¿Cómo funciona?</h2>', '>¿Cómo funciona?</h2>\n                <p style="color: #cbd5e1; font-size: 1.1rem; max-width: 600px; margin: 0 auto 20px;">Nuestro proceso de reparación de computadoras en Cancún está diseñado para ser rápido, transparente y confiable.</p>');

// Paquetes
c = c.replace('<h2>Nuestros Paquetes Reales</h2>', '<h2>Nuestros Paquetes Reales</h2>\n                <p style="font-size: 1.1rem; color: #475569; max-width: 600px; margin: 0 auto 30px;">Ofrecemos mantenimiento de computadoras en Cancún para equipos básicos, gamer y de alto rendimiento.</p>');

// Hardware passion (Autoridad)
c = c.replace('Pasin por el hardware,<br>', 'Somos especialistas en reparación de computadoras en Cancún con experiencia en equipos domésticos, gamer y empresariales.<br><br>Pasión por el hardware,<br>');
c = c.replace('Pasión por el hardware,<br>', 'Somos especialistas en reparación de computadoras en Cancún con experiencia en equipos domésticos, gamer y empresariales.<br><br>Pasión por el hardware,<br>');

// Ubicacion
c = c.replace('<p class="description-text">Encuntranos en Cancn, Quintana Roo.</p>', '<p class="description-text">Encuéntranos en Cancún, Quintana Roo.</p>\n                    <p style="color: #64748b; font-size: 0.95rem; max-width: 600px; margin: 10px auto;">Brindamos servicio técnico de computadoras en Cancún con cobertura en Zona Hotelera, Huayacán, Polígono Sur, Puerto Juárez y alrededores.</p>');
c = c.replace('<p class="description-text">Encuéntranos en Cancún, Quintana Roo.</p>', '<p class="description-text">Encuéntranos en Cancún, Quintana Roo.</p>\n                    <p style="color: #64748b; font-size: 0.95rem; max-width: 600px; margin: 10px auto;">Brindamos servicio técnico de computadoras en Cancún con cobertura en Zona Hotelera, Huayacán, Polígono Sur, Puerto Juárez y alrededores.</p>');

const extraFaq = `
                <!-- FAQ SEO 1 -->
                <div class="faq-item">
                    <button class="faq-question" aria-expanded="false" onclick="toggleFaq(this)">
                        <span><i class="fa-solid fa-tag faq-q-icon"></i> ¿Cuánto cuesta reparar una laptop en Cancún?</span>
                        <i class="fa-solid fa-chevron-down faq-chevron"></i>
                    </button>
                    <div class="faq-answer" aria-hidden="true">
                        <div class="faq-answer-inner">
                            El costo varía según la marca y el tipo de reparación (pantalla, teclado, placa base o software). Solicita un diagnóstico sin compromiso de tu equipo y recibe cotización transparente por WhatsApp el mismo día.
                        </div>
                    </div>
                </div>

                <!-- FAQ SEO 2 -->
                <div class="faq-item">
                    <button class="faq-question" aria-expanded="false" onclick="toggleFaq(this)">
                        <span><i class="fa-solid fa-map-pin faq-q-icon"></i> ¿Dónde reparar computadoras en Cancún?</span>
                        <i class="fa-solid fa-chevron-down faq-chevron"></i>
                    </button>
                    <div class="faq-answer" aria-hidden="true">
                        <div class="faq-answer-inner">
                            Pixon PC cuenta con una ubicación central y también servicio de recolección en diferentes áreas de Cancún como Zona Hotelera, Puerto Juárez, Huayacán y Polígono Sur, facilitando al 100% tu reparación sin moverte de casa.
                        </div>
                    </div>
                </div>

                <!-- FAQ SEO 3 -->
                <div class="faq-item">
                    <button class="faq-question" aria-expanded="false" onclick="toggleFaq(this)">
                        <span><i class="fa-solid fa-hourglass-half faq-q-icon"></i> ¿Cuánto tarda un mantenimiento de PC?</span>
                        <i class="fa-solid fa-chevron-down faq-chevron"></i>
                    </button>
                    <div class="faq-answer" aria-hidden="true">
                        <div class="faq-answer-inner">
                            Un verdadero mantenimiento a nivel hardware (cambio de pasta térmica, limpieza química, etc) se realiza típicamente entre 24 y 72 horas para asegurar pruebas de estrés. Sin embargo, tenemos una opción Express si tu equipo lo amerita.
                        </div>
                    </div>
                </div>

                <!-- FAQ SEO 4 -->
                <div class="faq-item">
                    <button class="faq-question" aria-expanded="false" onclick="toggleFaq(this)">
                        <span><i class="fa-solid fa-temperature-arrow-up faq-q-icon"></i> ¿Por qué mi laptop se calienta en Cancún?</span>
                        <i class="fa-solid fa-chevron-down faq-chevron"></i>
                    </button>
                    <div class="faq-answer" aria-hidden="true">
                        <div class="faq-answer-inner">
                            El calor ambiental y principalmente la humedad y salitre extrema de nuestra ciudad degradan en tiempo récord la pasta térmica. Esto hace inevitable que los ventiladores trabajen de más y tu laptop se sienta ardiendo. Necesita mantenimiento térmico local ahora mismo.
                        </div>
                    </div>
                </div>
`;
c = c.replace('            <div class="faq-cta text-center" style="margin-top:2.5rem;">', extraFaq + '\n            <div class="faq-cta text-center" style="margin-top:2.5rem;">');

fs.writeFileSync('index.html', c);
