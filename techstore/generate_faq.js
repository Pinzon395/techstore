const fs = require('fs');

const faqData = [
  {
    title: "Diagnóstico, Reparación y Restauración",
    icon: "fa-solid fa-stethoscope",
    questions: [
      {
        q: "¿Dónde revisar o reparar computadoras en Cancún?",
        a: "En Pixon PC. Estamos en una ubicación céntrica y segura, pero no tienes que moverte: ofrecemos servicio de recolección y entrega a domicilio o a tu hotel/oficina en Cancún. Revisamos tu equipo donde nos necesites."
      },
      {
        q: "¿Cuánto cuesta reparar una laptop en Cancún?",
        a: "Depende exclusivamente del componente dañado (pantalla, teclado, SSD) o si es problema de placa base. Nuestras reparaciones inician desde $600 MXN para problemas de software y van escalando según la refacción. Lo más importante: nuestro diagnóstico no tiene costo y no gastas un centavo hasta conocer y aceptar nuestro presupuesto final."
      },
      {
        q: "¿Hacen diagnóstico avanzado de laptops y PC gamer?",
        a: "Sí. No abrimos equipos a 'ojímetro'. Utilizamos multímetros de banco, cámaras térmicas y esquemáticos electrónicos para medir voltajes en tu motherboard. Si tienes una PC Gamer, realizamos pruebas de estrés severo (Benching) para encontrar qué componente exacto falla."
      },
      {
        q: "¿Qué revisan exactamente en un diagnóstico técnico?",
        a: "Puntos clave: Salud de la batería y desgaste, sectores defectuosos en el disco duro, picos de temperatura en procesador y gráfica, cortos circuitos en línea de voltaje, y estado de la pasta térmica. Es un examen físico y lógico profundo."
      },
      {
        q: "¿Pueden reparar una computadora que simplemente no enciende?",
        a: "¡Totalmente! Cuando un equipo está \"muerto\", en el 80% de los casos se debe a un corto en la línea de poder o fallo de la fuente/pin de carga. Rastreamos el micro-componente (mosfet o capacitor) dañado en la tarjeta madre y lo soldamos."
      },
      {
        q: "¿Laptops súper lentas o con fallas de rendimiento tienen solución?",
        a: "Reparamos esa lentitud crónica en minutos. Usualmente se arregla cambiando el disco mecánico (HDD) viejo por un almacenamiento de Estado Sólido (SSD) de alta velocidad, aumentando RAM y depurando el disco. Tu laptop revivirá siendo 10 veces más rápida."
      },
      {
        q: "¿Pueden recuperar equipos que se apagan solos por calor?",
        a: "Claro. Cuando un equipo se apaga solo de repente, es un mecanismo de defensa interno llamado 'Thermal Throttling' para no incendiarse. Requiere limpieza química urgente, liberación de ductos y cambio de pasta térmica de alto rendimiento (o metal líquido)."
      },
      {
        q: "¿Atienden fallas complejas de motherboard o tarjeta madre?",
        a: "Sí, la microelectrónica es nuestra especialidad. En lugar de decirte 'tienes que comprar otra tarjeta madre' (que suele costar lo mismo que una laptop nueva), reparamos los integrados quemados, ahorrándote hasta un 70%."
      },
      {
        q: "¿Cambian pantallas, teclados y baterías?",
        a: "Sustituimos pantallas estrelladas o con líneas muertas, teclados donde fallan las teclas (muy común por humedad de Cancún) y baterías infladas o que no retienen carga. Todas las piezas cuentan con garantía de distribuidor oficial."
      },
      {
        q: "¿Reparan puertos USB, HDMI, Jack de audio o pines de carga?",
        a: "Reemplazamos soldaduras desoldadas de los puertos que tienen falso contacto, HDMI que ya no da video o conectores de carga rotos para que dejen de bailar."
      }
    ]
  },
  {
    title: "Mantenimiento y Prevención Térmica",
    icon: "fa-solid fa-fan",
    questions: [
      {
        q: "¿Cada cuánto se debe dar mantenimiento a una laptop?",
        a: "En zonas secas, 1 vez al año es suficiente. Sin embargo, en Cancún o Riviera Maya debido a la salinidad, recomendamos fuertemente realizarlo cada 6 a 8 meses, dependiendo del uso."
      },
      {
        q: "¿Cada cuánto necesita mantenimiento una PC gamer?",
        a: "Si el equipo está en piso o en ambientes con mascotas y clima, cada 6 meses (ideal). Si está en un entorno muy limpio, se estira máximo a 9 meses. El polvo actúa como un abrigo que ahoga y asfixia los componentes."
      },
      {
        q: "¿Qué incluye un verdadero mantenimiento preventivo?",
        a: "No usamos sopladoras y ya. Desarmamos cada capa, limpiamos la placa libre de polvillo y sulfato, lubricamos bujes de ventiladores, removemos pasta petrificada en CPU/GPU, instalamos pasta térmica de grado industrial de +10 W/m-k y realizamos un test sintético final de estrés eléctrico."
      },
      {
        q: "¿Hacen limpieza interna de computadoras en Cancún?",
        a: "Sí, usamos alcohol isopropílico de máxima pureza, limpiadores dieléctricos y cepillos antiestáticos. Eliminamos cualquier telaraña, pelusa densa o nidos de insectos (extremadamente común aquí) que pudieran crear corto circuito."
      },
      {
        q: "¿También limpian ventiladores y disipadores de calor cerrados?",
        a: "Los disipadores los lavamos a presión en solitario para liberar el radiador atascado por el clima, y los ventiladores son desensamblados de ser posible para limpieza profunda de las hélices, no solo soplados por encima."
      },
      {
        q: "¿Cambian pasta térmica en laptops y PC? ¿Por qué es importante?",
        a: "Vital. La pasta térmica transfiere el calor hirviendo del procesador al disipador. Con el tiempo se hace cemento. Si no se cambia, el procesador se cocinará a +95°C y acabará muriendo irreparablemente."
      },
      {
        q: "¿Usan pasta térmica premium o de mercado libre?",
        a: "Únicamente usamos mezclas importadas de grado entusiasta, como Arctic MX-6, Thermal Grizzly Kryonaut, Hydronaut, o aleaciones especiales para gaming bruto, nunca silicios genéricos blancos de tiendas de electrónica que se secan en semanas."
      },
      {
        q: "¿Qué pasa inevitablemente si no le doy mantenimiento a mi equipo?",
        a: "Primero notarás lentitud en juegos y tareas (ahorcamiento). Luego ruidos como avión de los ventiladores al 100%. Después congelamientos, pantallas azules y reinicios, hasta que la placa colapsa y no enciende jamás por soldadura fracturada."
      },
      {
        q: "¿El mantenimiento mejora el rendimiento de mi computadora?",
        a: "Sí, recuperarás la velocidad del día que la sacaste de la caja. Un procesador fresco corre a su velocidad base real (Turbo Boost), mientras que uno caliente baja sus revoluciones para no incendiarse."
      },
      {
        q: "¿Pueden bajar permanentemente la temperatura límite de mi laptop?",
        a: "Logramos dropear temperaturas entre 15°C y hasta 30°C grados con un buen mantenimiento térmico, dependiendo del daño acumulado, devolviéndola a un rango completamente seguro (50°c - 75°c bajo carga prudente)."
      }
    ]
  },
  {
    title: "Cancún y el Clima Extremo (Humedad & Salitre)",
    icon: "fa-solid fa-cloud-sun-rain",
    questions: [
      {
        q: "¿Por qué exactamente la humedad daña más las computadoras en Cancún?",
        a: "Mucha gente usa la laptop con el aire acondicionado muy frío y luego sale a la calle a 35°C, o al revés. Ese cambio brutal genera micro-condensación (gotitas invisibles de agua) que terminan atrapadas dentro, en la tarjeta madre."
      },
      {
        q: "¿El infame salitre afecta laptops y PCs si vivo cerca de playa o laguna?",
        a: "Sí, el salitre actúa como un acelerador de oxidación. Los puertos plateados USB y el cobre del disipador de calor terminan color verde y oxidados rápidamente si el ambiente circundante no está climatizado."
      },
      {
        q: "¿Qué es la sulfatación en equipos electrónicos y por qué es mortal?",
        a: "Es ese 'polvo blanco o verdoso' que ves en las pilas cuando se chorrean. Cuando el polvo de la casa + la humedad + electricidad se juntan, la placa crea sarro eléctrico. Ese sarro empieza carcomiendo las pistas de comunicación."
      },
      {
        q: "¿Cómo afecta el calor infernal de Cancún a mi computadora?",
        a: "El diseño de túnel de aire de tu laptop asume que juegas en tu sala a 20°C promedio de laboratorios americanos. A los 35°C de ambiente en Cancún tropical, los ventiladores nunca descansan, absorbiendo mucha más basura y desgastando sus motores."
      },
      {
        q: "¿Cómo puedo prevenir daños graves por humedad estando en la costa?",
        a: "Evita cambios super drásticos de A/C. Compra bolsas desecantes (sílica gel) y guárdalas dentro de tu mochila donde mueves la laptop. Acude a limpiezas preventivas profesionales semestrales contra el sarro."
      },
      {
        q: "¿Pueden revisar y salvar daños por corrosión, salitre o la sulfatación en la placa?",
        a: "Sí. Hacemos lavados ultrasónicos químicos. Si la placa se nos entrega 'fresca' (tiempo cercano desde que empezó a fallar) las probabilidades de salvar el equipo para que encienda aumentan arriba del 85%."
      }
    ]
  },
  {
    title: "Gamer, Escalabilidad y Alto Rendimiento",
    icon: "fa-solid fa-gamepad",
    questions: [
      {
        q: "¿Pueden mejorar drásticamente los FPS de la gráfica en mi PC gamer?",
        a: "Totalmente. Ofrecemos nuestro servicio de 'Debloat & Tuning'. Limpiamos apps basura de Windows 11, calibramos curva de ventiladores (Afterburner), habilitamos XMP/EXPO en BIOS, Resizable BAR al máximo y undervolt al proce, logrando hasta 30% más FPS estables sin tocar piezas."
      },
      {
        q: "¿Qué diferencia hay entre un mantenimiento estándar y uno Gamer?",
        a: "El Gaming es 'Heavy Duty' (uso pesado industrial constante). A diferencia de cambiar la simple pasta a una laptop de oficina, un equipo gamer lleva Thermal Pads en las memorias (VRAM), necesita pulición de placa fría de la GPU y una atención maniaca al flujo de presión positiva interior."
      },
      {
        q: "¿Cambian los Thermal Pads y masillas de mi tarjeta de Video (GPU)?",
        a: "Sí, y esto es crucial y muy delicado. Removimos los pads chiclosos que ya están duros tipo piedra y aplicamos pads térmicos especiales de la medida milimétrica requerida o masilla k5pro de alta gama. Bajarán tus HotSpots radicalmente y por ende los ventiladores."
      },
      {
        q: "¿Recomiendan aplicar Metal Líquido para laptops gamer en esta zona?",
        a: "Solo para procesadores extremos empaquetados herméticamente. Disipa x4 veces mejor que la pasta, pero su aplicación es quirúrgica: una sola gota mal colocada frita la motherboard por su aleación de Galio ultra conductor. Lo hacemos y garantizamos con protección Kapton."
      },
      {
        q: "¿Qué hacer si mi PC gamer se calienta mucho o hace ruido ensordecedor?",
        a: "Tráela inmediatamente, antes de que frías el silicio. Necesita reacondicionamiento del AIO (Enfriamiento Líquido) evaporado o corrección del ensamble general. Un equipo bien balanceado nunca debe sonar como turbina, punto."
      },
      {
        q: "¿Hacen ensambles o armados personalizados garantizados en Cancún?",
        a: "Sí. Tu compras los componentes que soñaste de Amazon o Cyberpuerta a tu nombre y garantía directa, los traes al taller y nosotros montamos todo el rompecabezas como verdaderos entusiastas puristas, sin esconderte márgenes ocultos en la compra y cableándolo perfecto."
      },
      {
        q: "¿Arman PCs gamer de 0 basados en mi presupuesto para jugar algo específico?",
        a: "Te asesoramos pieza por pieza. Si tu sueño es jugar Warzone o Valorant en 144Hz en un presupuesto de $12 mil pesos, nos sentamos contigo a diseñar en un Excel la máquina perfecta. En Cancún tenemos la fama de no sobrevender componentes inútiles."
      }
    ]
  },
  {
    title: "Soporte Mac Apple y Alta Precisión",
    icon: "fa-brands fa-apple",
    questions: [
      {
        q: "¿Hacen mantenimiento a equipos MacBook o iMac en Cancún?",
        a: "Sí, damos soporte para equipos Mac Pro, MacBook Air y equipos todo-en-uno iMac desde hace años. Conocemos sus tornillerías propietarias pentalobe y la delicadeza con que se trata uno de estos de aluminios premium."
      },
      {
        q: "¿Reparan equipos Apple descontinuados con fallas de placa o video?",
        a: "Ofrecemos microsoldadura de componentes smd a equipos que Apple declaró 'Vintage' y que sus centros oficiales ya no tocan, dándoles otra vitalidad. También ampliamos memorias en modelos soportados, recuperando el clásico estilo de la marca pero modernos."
      },
      {
        q: "¿Mi Mac se calienta brutalmente al usar Premiere o Logic Pro, la pueden revisar?",
        a: "Al ser tan delgadas, las MacBooks son muy propensas a tapar su minusculo disipador lateral. Procedemos a destaparla milimétricamente, pulir su disipador estancado, y usar pastas sintéticas no abrasivas. Cuidamos cada puerto tipo flex con antiestática."
      },
      {
        q: "¿Atienden equipos Apple por cita rápida?",
        a: "Escríbenos y coordinaremos tu recepción prioritaria. Entendemos que tu Mac suele ser equipo indispensable para tus freelances y clientes; siempre te hablaremos claro de tiempos estimados sin jugar a asustarte con el ecosistema Apple."
      }
    ]
  },
  {
    title: "Garantía, Metódica y Servicio Técnico Empresarial",
    icon: "fa-solid fa-handshake",
    questions: [
      {
        q: "¿Dan garantía seria y por escrito en sus reparaciones?",
        a: "Totalmente. Entregamos un ticket virtual del servicio atado a la folio que te ampara. Las condiciones son simples: si vuelve a fallar por nuestra negligencia te devolvemos tu equipo andando de nuevo por todo o reembolsamos. Transparencia total, cero sorpresas."
      },
      {
        q: "¿Hacen recolección y entrega a domicilio real para todos sus servicios?",
        a: "Pixon lo simplificó. Un repartidor certificado recolecta en tu puerta. Diagnósticamos mandando un reporte con video por nuestro taller, autorizas o cancelas, arreglamos, y volvemos a despachar a la misma puerta del inicio. Literalmente Cancún de frontera a frontera cubierto."
      },
      {
        q: "¿Se puede cotizar por WhatsApp de inmediato con fotos o video de mi falla?",
        a: "Es nuestro canal favorito principal, ágil e interactivo. Nos mandas un video de cómo suena el problema o nos escribes los pitidos de error y te resolvemos o guiamos para un pronóstico altamente seguro; es asincrónico por lo que jamás esperarás al otro lado de un teléfono."
      },
      {
        q: "¿Atienden empresas o dan soporte técnico B2B (Agencias de viajes en Cancún, restaurantes)?",
        a: "Contamos con una división de tickets exclusiva, donde tu hotel, centro de reservas, notaría o agencia podrá contar con reportes de incidencias fijos semanales. Hacemos mantenimientos preventivos masivos y reparaciones para redes de oficina completas, emitiendo factura mensual fiscal por outsourcing."
      }
    ]
  }
];

let generatedHTML = `
<!-- MAIN FAQ CONTENT -->
<section class="faq-page-content" id="preguntas-frecuentes-content">
    <div class="container" style="max-width: 900px;">
`;

let faqIdCounter = 1;

faqData.forEach((section) => {
  generatedHTML += `
        <!-- Category: ${section.title} -->
        <div class="faq-category-title" ${faqIdCounter === 1 ? 'style="margin-top:0;"' : ''}>
            <i class="${section.icon}"></i> ${section.title}
        </div>
        <div class="faq-page-grid">
`;

  section.questions.forEach((qObj) => {
    generatedHTML += `
            <div class="faq-item" id="faq-x${faqIdCounter}">
                <button class="faq-question" aria-expanded="false" onclick="toggleFaq(this)">
                    <span>${qObj.q}</span>
                    <i class="fa-solid fa-chevron-down faq-chevron"></i>
                </button>
                <div class="faq-answer" aria-hidden="true">
                    <div class="faq-answer-inner">
                        ${qObj.a}
                    </div>
                </div>
            </div>`;
    faqIdCounter++;
  });

  generatedHTML += `
        </div>
`;
});

generatedHTML += `
        <!-- CTA Final -->
        <div class="epic-cta-box" style="margin-top: 5rem;">
            <h2 style="font-weight: 800; font-size: 2rem; color: #020617; margin-bottom: 10px;">Tu equipo en manos expertas.</h2>
            <p style="color: #64748b; font-size: 1.1rem; margin-bottom: 30px;">Garantía por escrito, pago con tarjeta, entrega y recolección a domicilio ágil en Cancún.</p>
            <button onclick="smartWaRedirect('https://wa.me/529986690777?text=Hola%2C%20leí%20las%20preguntas%20frecuentes%20y%20quiero%20agendar%20hoy')" class="btn btn-primary btn-large pulse" style="display:inline-flex; align-items:center;">
                <i class="fa-brands fa-whatsapp" style="margin-right:8px; font-size:1.2rem;"></i> Agendar Diagnóstico Hoy
            </button>
        </div>
        
    </div>
</section>
`;

let fileContent = fs.readFileSync('preguntas-frecuentes.html', 'utf8');

// Replace everything between <!-- MAIN FAQ CONTENT --> and <!-- ═══ FOOTER ═══ -->
const startMarker = '<!-- MAIN FAQ CONTENT -->';
const endMarker = '<!-- ═══ FOOTER ═══ -->';

const startIndex = fileContent.indexOf(startMarker);
const endIndex = fileContent.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const header = fileContent.substring(0, startIndex);
    const footer = fileContent.substring(endIndex);
    
    fs.writeFileSync('preguntas-frecuentes.html', header + generatedHTML + '\n    ' + footer, 'utf8');
    console.log("FAQ page updated successfully!");
} else {
    console.log("Could not find markers!");
}
