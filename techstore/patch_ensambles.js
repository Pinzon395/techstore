const fs = require('fs');

let content = fs.readFileSync('ensambles.html', 'utf8');

const newSections = `    <!-- ═══════════════════════════════════════════
         SECCIONES SEO Y VALOR AGREGADO (ENSAMBLES)
    ═══════════════════════════════════════════ -->
    <section class="section-padding" style="background:#ffffff; border-top: 1px solid #e2e8f0;">
        <div class="container">
            <div class="section-title text-center" style="margin-bottom: 3rem;">
                <h2>¿Por qué armar tu PC Gamer con nosotros en Cancún?</h2>
                <p>Expertos en hardware de alto rendimiento, cuidando cada detalle de tu ensamble.</p>
            </div>
            
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:30px; margin-bottom: 4rem;">
                <div style="background:#f8fafc; padding:30px; border-radius:16px; border:1px solid #e2e8f0; transition: transform 0.3s ease;" class="hover-lift">
                    <div style="color:var(--primary); font-size:2.5rem; margin-bottom:15px;"><i class="fa-solid fa-microchip"></i></div>
                    <h3 style="font-size:1.2rem; margin-bottom:10px; color:#0f172a;">Componentes de Alta Calidad</h3>
                    <p style="color:#64748b; font-size:0.95rem; line-height:1.6;">Seleccionamos procesadores Intel y AMD de última generación, tarjetas gráficas NVIDIA y Radeon, y memorias RAM de alto rendimiento para garantizar FPS estables en cualquier juego.</p>
                </div>
                <div style="background:#f8fafc; padding:30px; border-radius:16px; border:1px solid #e2e8f0; transition: transform 0.3s ease;" class="hover-lift">
                    <div style="color:var(--primary); font-size:2.5rem; margin-bottom:15px;"><i class="fa-solid fa-screwdriver-wrench"></i></div>
                    <h3 style="font-size:1.2rem; margin-bottom:10px; color:#0f172a;">Gestión de Cables Perfecta</h3>
                    <p style="color:#64748b; font-size:0.95rem; line-height:1.6;">Un cable management impecable no solo mejora la estética de tu PC Gamer, sino que optimiza el flujo de aire, manteniendo los componentes más frescos y alargando su vida útil.</p>
                </div>
                <div style="background:#f8fafc; padding:30px; border-radius:16px; border:1px solid #e2e8f0; transition: transform 0.3s ease;" class="hover-lift">
                    <div style="color:var(--primary); font-size:2.5rem; margin-bottom:15px;"><i class="fa-solid fa-temperature-arrow-down"></i></div>
                    <h3 style="font-size:1.2rem; margin-bottom:10px; color:#0f172a;">Pruebas de Estrés Térmico</h3>
                    <p style="color:#64748b; font-size:0.95rem; line-height:1.6;">En el clima de Cancún, la refrigeración es vital. Sometemos cada ensamble a pruebas de estrés intensivas (Benching) para asegurar que las temperaturas se mantengan óptimas bajo carga pesada.</p>
                </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:40px; background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius:24px; padding:40px; color:#fff;">
                <div style="flex:1; min-width:300px;">
                    <span style="display:inline-block; background:rgba(59,130,246,0.2); color:#93c5fd; padding:6px 14px; border-radius:20px; font-size:0.8rem; font-weight:700; margin-bottom:15px;">ACTUALIZACIÓN Y ESCALABILIDAD</span>
                    <h2 style="font-size:2rem; margin-bottom:15px; color:#fff;">Pensado para el futuro</h2>
                    <p style="color:#cbd5e1; font-size:1.05rem; line-height:1.7; margin-bottom:20px;">
                        A diferencia de las computadoras pre-armadas de tiendas departamentales, nuestros ensambles a la medida utilizan componentes estándar (fuentes ATX reales, motherboards no propietarias). Esto significa que <strong>podrás actualizar tu tarjeta de video, procesador o memoria RAM en los próximos años</strong> sin tener que comprar un equipo completamente nuevo.
                    </p>
                    <ul style="list-style:none; padding:0; margin:0; color:#cbd5e1;">
                        <li style="margin-bottom:10px;"><i class="fa-solid fa-check" style="color:#3b82f6; margin-right:10px;"></i> Placas base con soporte para próximas generaciones</li>
                        <li style="margin-bottom:10px;"><i class="fa-solid fa-check" style="color:#3b82f6; margin-right:10px;"></i> Fuentes de poder con margen para upgrades de GPU</li>
                        <li><i class="fa-solid fa-check" style="color:#3b82f6; margin-right:10px;"></i> Asesoría de compatibilidad continua</li>
                    </ul>
                </div>
                <div style="flex:1; min-width:300px; text-align:center;">
                    <img src="assets/images/FotoMetalLiquido.jpeg" alt="Interior de PC Gamer ensamblada con piezas actualizables" style="width:100%; max-width:400px; border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,0.3); object-fit:cover; height:300px;">
                </div>
            </div>
            
            <div style="margin-top: 5rem;">
                <div class="section-title text-center" style="margin-bottom: 2rem;">
                    <h2>Preguntas frecuentes sobre Ensambles</h2>
                </div>
                <div class="faq-grid" style="max-width: 820px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px;">
                    <div class="faq-item">
                        <button class="faq-question" aria-expanded="false" onclick="toggleFaq(this)">
                            <span>¿Puedo llevar mis propias piezas para que las ensamblen?</span>
                            <i class="fa-solid fa-chevron-down faq-chevron"></i>
                        </button>
                        <div class="faq-answer" aria-hidden="true">
                            <div class="faq-answer-inner">
                                Sí, por supuesto. Si compraste tus componentes en Amazon, Cyberpuerta o DDTech, puedes traerlos a nuestro taller en Cancún. Nosotros nos encargamos del ensamble profesional, actualización de BIOS, instalación de Windows, configuración de drivers y pruebas de estrés. Te cobramos únicamente la mano de obra del armado.
                            </div>
                        </div>
                    </div>
                    <div class="faq-item">
                        <button class="faq-question" aria-expanded="false" onclick="toggleFaq(this)">
                            <span>¿Cuánto tiempo tardan en armar la PC?</span>
                            <i class="fa-solid fa-chevron-down faq-chevron"></i>
                        </button>
                        <div class="faq-answer" aria-hidden="true">
                            <div class="faq-answer-inner">
                                Si tenemos todos los componentes en stock o si tú los traes, el ensamble, instalación del sistema operativo y las pruebas de estrés toman aproximadamente <strong>24 a 48 horas</strong>. Queremos asegurarnos de que el equipo pase todas las pruebas térmicas antes de entregártelo. Si hay que pedir piezas sobre pedido, suele tardar de 3 a 5 días hábiles en llegar a Cancún.
                            </div>
                        </div>
                    </div>
                    <div class="faq-item">
                        <button class="faq-question" aria-expanded="false" onclick="toggleFaq(this)">
                            <span>¿Instalan el sistema operativo y programas?</span>
                            <i class="fa-solid fa-chevron-down faq-chevron"></i>
                        </button>
                        <div class="faq-answer" aria-hidden="true">
                            <div class="faq-answer-inner">
                                Sí. Todos nuestros ensambles completos incluyen la instalación de Windows (10 u 11), actualización de BIOS a la última versión estable, configuración de perfiles XMP/EXPO para la memoria RAM, instalación de los drivers más recientes para tu tarjeta gráfica y procesador, y la paquetería básica necesaria. Te la entregamos lista para conectar y jugar o trabajar.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

`;

if (!content.includes('SECCIONES SEO Y VALOR AGREGADO (ENSAMBLES)')) {
    content = content.replace('    <!-- ═══════════════════════════════════════════\r\n         SECCIÓN DE COMENTARIOS', newSections + '    <!-- ═══════════════════════════════════════════\r\n         SECCIÓN DE COMENTARIOS');
    
    // Fallback if line endings are different
    if (!content.includes('SECCIONES SEO Y VALOR AGREGADO')) {
        content = content.replace('    <!-- ═══════════════════════════════════════════\n         SECCIÓN DE COMENTARIOS', newSections + '    <!-- ═══════════════════════════════════════════\n         SECCIÓN DE COMENTARIOS');
    }
    
    fs.writeFileSync('ensambles.html', content);
    console.log('ensambles.html patched successfully');
} else {
    console.log('ensambles.html already patched');
}
