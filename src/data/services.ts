/**
 * Servicios — Single source of truth.
 * Lo consumen tanto Navbar3_0.astro como las landing pages dinámicas
 * /servicios/[categoria]/[servicio].
 *
 * Orden de categorías (Laptop primero porque es lo más vendido):
 *   Laptop → PC → Teléfono → Consola → Impresora
 *
 * Para agregar un nuevo subservicio: añade un objeto a `services[]` de
 * la categoría correspondiente. Astro generará la ruta automáticamente
 * y el navbar lo mostrará en el megamenú.
 */

export interface ServiceItem {
  slug: string;       // segmento URL (ej. 'cambio-pantalla')
  label: string;      // título visible (ej. 'Cambio de pantalla')
  intro?: string;     // descripción 1-2 líneas para el hero de la landing
  bullets?: string[]; // beneficios / qué incluye
  fromPrice?: string; // ej. '$650 MXN'
  eta?: string;       // tiempo estimado
  /** Si está presente, el navbar y los hubs apuntan a esta URL EXISTENTE
   *  en lugar de generar una landing nueva en /servicios/[cat]/[slug].
   *  Útil para reutilizar páginas ya hechas (/reparaciones, /paquetes, etc.). */
  customUrl?: string;

  // ─── Data extendida (opcional, solo en landings premium) ───
  /** Keyword H1 SEO específica si difiere del label */
  seoKeyword?: string;
  /** Subtítulo grande bajo el H1 (gancho emocional / problema que resuelve) */
  hook?: string;
  /** "Por qué nosotros" — 4-6 cards */
  whyUs?: { icon: string; title: string; desc: string }[];
  /** Pasos del proceso paso a paso (timeline) */
  process?: { title: string; desc: string }[];
  /** Bloques educativos (imagen + texto) para enriquecer el contexto */
  educationalBlocks?: { 
    eyebrow: string; 
    title: string; 
    intro: string; 
    imgSrc: string; 
    imgAlt: string; 
    points: { icon: string; title: string; text: string }[]; 
    reverse?: boolean;
  }[];
  /** Problemas comunes que resuelve */
  commonProblems?: { problem: string; solution: string }[];
  /** Marcas/modelos compatibles (chips) */
  compatibleBrands?: string[];
  /** FAQ específica de este servicio */
  faqs?: { question: string; answer: string }[];
  /** Slugs de servicios relacionados de la MISMA categoría a destacar */
  relatedSlugs?: string[];
  /** Links externos a otras vistas relacionadas (paquetes, FAQ general, etc.) */
  relatedExternal?: { label: string; href: string; icon: string; desc: string }[];
  /** Garantía específica (texto corto, ej. "6 meses por escrito") */
  warranty?: string;
  /** Trust Strip - estadísticas de confianza (4 items) */
  trustStats?: { icon: string; value: string; label: string }[];
  /** Sección Especialistas - título + descripción */
  specialistTitle?: string;
  specialistDesc?: string;
  specialistImage?: string;
  /** Galería de tipos de pantalla - badges sobre imágenes */
  screenTypes?: { label: string; desc: string }[];
  /** Antes/Después comparativa */
  beforeAfter?: { before: string[]; after: string[] };
}

export interface ServiceCategory {
  id: string;
  slug: string;       // segmento URL (ej. 'laptop')
  title: string;
  icon: string;       // clase Font Awesome (sin 'fa-solid ')
  blurb: string;      // descripción corta para navbar
  heroBg?: string;    // gradiente o color para hero
  services: ServiceItem[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'laptop',
    slug: 'laptop',
    title: 'Laptop',
    icon: 'fa-laptop',
    blurb: 'Windows / MacBook',
    heroBg: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    services: [
      { slug: 'reparacion-general',   label: 'Reparación General',      customUrl: '/reparaciones' },

      // ─── Cambio de pantalla (extendida 12 secciones) ───────────────────
      {
        slug: 'cambio-pantalla',
        label: 'Cambio de pantalla',
        seoKeyword: 'Cambio de pantalla de laptop en Cancún',
        hook: '¿Pantalla rota, con líneas, manchas o sin imagen? Te la cambiamos en 2 a 5 días con pieza certificada y garantía por escrito.',
        intro: 'Reemplazo de display LCD o LED para laptops Windows y MacBook con piezas originales o equivalentes certificadas.',
        bullets: ['Diagnóstico previo gratis', 'Pieza original o equivalente certificada', 'Calibración de color y brillo', 'Garantía 6 meses por escrito', 'Recolección a domicilio en Cancún'],
        fromPrice: '$1,800 MXN', eta: '2-5 días', warranty: '6 meses por escrito',
        whyUs: [
          { icon: 'fa-shield-halved',     title: 'Pieza certificada',   desc: 'Pantallas originales o de calidad equivalente — nunca refurbished sin avisar.' },
          { icon: 'fa-magnifying-glass',  title: 'Diagnóstico GRATIS',  desc: 'Identificamos si es pantalla, flex o GPU antes de cobrar nada.' },
          { icon: 'fa-clock',             title: 'Mismo día en stock',  desc: 'Modelos comunes (HP, Dell, Lenovo) los entregamos en 24 h.' },
          { icon: 'fa-truck',             title: 'Recolección gratis',  desc: 'En Cancún para servicios desde $800 MXN. Cero estrés de traslado.' },
        ],
        process: [
          { title: '1. Diagnóstico',     desc: 'Confirmamos si la falla es pantalla, flex de video o tarjeta de video. Cotización clara antes de tocar.' },
          { title: '2. Cotización',      desc: 'Te enviamos por WhatsApp el costo exacto de la pieza + mano de obra. Tú decides.' },
          { title: '3. Reemplazo',       desc: 'Desarmamos la laptop, retiramos el panel dañado y montamos el nuevo con cinta y tornillería original.' },
          { title: '4. Calibración',     desc: 'Calibramos color, brillo y revisamos pixeles muertos. Test de video continuo 30 min.' },
          { title: '5. Entrega',         desc: 'Te avisamos por WhatsApp. Recoges o entregamos a domicilio. Garantía por escrito en mano.' },
        ],
        educationalBlocks: [
          {
            eyebrow: 'Cuidado y Limpieza',
            title: '¿Cómo cuidar tu nueva pantalla?',
            intro: 'Evita volver a dañarla siguiendo estas recomendaciones sencillas para limpieza y transporte.',
            imgSrc: '/assets/images/reparacion-mac-cancun.jpeg',
            imgAlt: 'Limpieza de pantalla de laptop',
            reverse: false,
            points: [
              { icon: 'fa-spray-can', title: 'Cero químicos fuertes', text: 'Nunca uses Windex, alcohol o amoníaco. Destruyen la capa anti-reflejante del display.' },
              { icon: 'fa-hand-holding-water', title: 'Paño de microfibra', text: 'Limpia solo con paño de microfibra seco o ligeramente humedecido con agua destilada.' },
              { icon: 'fa-briefcase', title: 'Cuidado al cerrar', text: 'Revisa que no haya plumas, clips o audífonos sobre el teclado antes de cerrar la tapa.' }
            ]
          }
        ],
        commonProblems: [
          { problem: 'Pantalla rota o estrellada por golpe',  solution: 'Reemplazo del panel completo. Recuperas tu laptop sin comprar otra.' },
          { problem: 'Líneas verticales o de colores',         solution: 'Suele ser flex de video o panel. Diagnóstico gratis define cuál.' },
          { problem: 'Pantalla negra pero la laptop enciende', solution: 'Si responde a monitor externo, es pantalla o inverter. Lo cambiamos.' },
          { problem: 'Manchas, halos o píxeles muertos',       solution: 'Si son más de 5 pixeles muertos o manchas, se justifica el cambio.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Toshiba', 'MSI', 'Samsung', 'MacBook Pro', 'MacBook Air', 'Huawei', 'Xiaomi'],
        faqs: [
          { question: '¿Cuánto cuesta cambiar la pantalla de mi laptop?',  answer: 'Va de <strong>$1,800 a $4,500 MXN</strong> según modelo y tipo de panel (HD, FHD, 4K, táctil). Cotización exacta gratis tras el diagnóstico.' },
          { question: '¿Cuánto se tarda el cambio?',                       answer: 'Modelos comunes (HP, Dell, Lenovo): <strong>24-48 horas</strong>. Modelos premium o que requieren importación: <strong>3-7 días</strong>.' },
          { question: '¿La pantalla nueva es original?',                   answer: 'Te ofrecemos las dos opciones: <strong>original</strong> (más cara, idéntica al fabricante) o <strong>equivalente certificada</strong> (calidad equivalente, garantía 6 meses).' },
          { question: '¿Qué garantía dan?',                                answer: '<strong>6 meses por escrito</strong> sobre la pantalla. Si presenta defecto cubierto, la cambiamos sin costo.' },
          { question: '¿Pueden hacerlo a domicilio?',                      answer: 'Recolectamos y entregamos sin costo en Cancún para servicios desde $800 MXN. La reparación se hace en taller para asegurar las condiciones.' },
        ],
        relatedSlugs: ['cambio-bateria', 'cambio-teclado', 'pasta-termica', 'diagnostico'],
        relatedExternal: [
          { label: 'Limpieza por líquido derramado', href: '/limpieza-laptop-liquido', icon: 'fa-droplet', desc: 'Si tu laptop sufrió derrame, atender ambas cosas a la vez.' },
          { label: 'Paquetes de mantenimiento',     href: '/paquetes',                 icon: 'fa-box',     desc: 'Aprovecha el desarmado para limpieza completa.' },
        ],
        // ─── NUEVAS SECCIONES para cambio-pantalla ────────────────────────
        trustStats: [
          { icon: 'fa-stethoscope', value: '100%', label: 'Diagnóstico preciso' },
          { icon: 'fa-shield-halved', value: '6 meses', label: 'Garantía por escrito' },
          { icon: 'fa-truck', value: 'Gratis', label: 'Recolección en Cancún' },
          { icon: 'fa-clock', value: '24-48h', label: 'Entrega modelos comunes' },
        ],
        specialistTitle: 'Especialistas en Cambio de Pantalla en Cancún',
        specialistDesc: 'En Pixon PC, llevamos años cambiando pantallas de laptops y MacBooks en Cancún. No improvisamos — verificamos modelo exacto, tipo de panel (HD/FHD/4K/táctil), conectores y compatibilidad antes de cotizar. Trabajamos solo con paneles de calidad verificada para que no vuelvas a reemplazar en 6 meses.',
        specialistImage: '/assets/images/reparacion-mac-cancun.jpeg',
        screenTypes: [
          { label: 'HD (1366x768)', desc: 'Panel estándar para laptops de entrada' },
          { label: 'FHD (1920x1080)', desc: 'La resolución más común y recomendada' },
          { label: '4K UHD', desc: 'Para laptops premium y workstation' },
          { label: 'Táctil', desc: 'Paneles con digitizer capacitivo' },
          { label: 'OLED', desc: 'Pantallas con negros perfectos y colores vibrantes' },
        ],
        beforeAfter: {
          before: ['Pantalla rota o con fracturas', 'Manchas oscuras y halos de luz', 'Líneas verticales o píxeles muertos', 'Pantalla negra sin imagen'],
          after: ['Display nuevo con colores exactos de fábrica', 'Brillo y contraste calibrado al 100%', 'Sin líneas, sin pixeles y sin manchas', 'Tu laptop funcionando como nueva'],
        },
      },

      // ─── Cambio de teclado (extendida) ──────────────────────────────────
      {
        slug: 'cambio-teclado',
        label: 'Cambio de teclado',
        seoKeyword: 'Cambio de teclado de laptop en Cancún',
        hook: 'Teclas pegadas, atascadas o que ya no responden. Te lo cambiamos en 24-72 h con teclado en español latino o US.',
        intro: 'Sustitución completa de teclado por desgaste, líquido derramado o teclas pegadas. Latín americano (LA-ESP) o US.',
        bullets: ['Teclado ISO/ANSI según modelo', 'Iluminación restaurada si aplica', 'Garantía 3 meses', 'Distribución en español o US'],
        fromPrice: '$850 MXN', eta: '24-72 h', warranty: '3 meses por escrito',
        whyUs: [
          { icon: 'fa-keyboard',     title: 'En español latino',   desc: 'Teclado con Ñ y acentos como debe ser, no US sin Ñ.' },
          { icon: 'fa-lightbulb',    title: 'Backlit restaurado',  desc: 'Si tu modelo trae iluminación, la respetamos al cambiar.' },
          { icon: 'fa-shield-halved',title: 'Pieza compatible',    desc: 'Mismo molde y conector que el original — encaja perfecto.' },
          { icon: 'fa-clock',        title: 'Mismo día posible',   desc: 'Si tenemos tu modelo en stock, te lo entregamos en horas.' },
        ],
        process: [
          { title: '1. Diagnóstico',  desc: 'Verificamos si es teclado, flex o teclas individuales. Algunas teclas se reparan sin cambiar todo.' },
          { title: '2. Cotización',   desc: 'Cotización exacta por WhatsApp con costo de pieza + mano de obra.' },
          { title: '3. Cambio',       desc: 'Desarmado, retiro del teclado dañado, instalación del nuevo y prueba tecla por tecla.' },
          { title: '4. Entrega',      desc: 'Pruebas con typing test de 100 palabras antes de entregarte la laptop.' },
        ],
        commonProblems: [
          { problem: 'Teclas que no responden',          solution: 'Reemplazo del teclado completo o reparación de teclas individuales si es viable.' },
          { problem: 'Teclas pegadas por líquido',       solution: 'Limpieza profunda + reemplazo. También checamos placa por daño de líquido.' },
          { problem: 'Letras borradas por desgaste',     solution: 'Cambio de teclado nuevo. También vendemos protectores para evitar repetir.' },
          { problem: 'Iluminación que ya no funciona',   solution: 'Cambio por teclado backlit con flex completo.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Toshiba', 'MSI', 'MacBook Pro', 'MacBook Air'],
        faqs: [
          { question: '¿Vale la pena cambiar el teclado o conviene una laptop nueva?',  answer: 'Si tu laptop tiene menos de 5 años y el resto funciona, <strong>casi siempre vale la pena</strong>. Un teclado nuevo cuesta 5-12% del precio de una laptop nueva.' },
          { question: '¿Qué pasa con las teclas individuales?',                          answer: 'Si solo son 1-3 teclas y no hay daño en placa, podemos repararlas individualmente desde $250 MXN.' },
          { question: '¿Tienen teclados con distribución US?',                            answer: 'Sí. Te preguntamos antes de comprar la pieza para que elijas LA-ESP (con Ñ) o US (sin Ñ).' },
          { question: '¿Cuánto dura un teclado nuevo?',                                   answer: 'Un teclado de buena calidad dura 5-7 años con uso normal. Garantía nuestra: 3 meses por escrito.' },
        ],
        relatedSlugs: ['cambio-pantalla', 'diagnostico', 'pasta-termica'],
        relatedExternal: [
          { label: 'Limpieza por líquido derramado', href: '/limpieza-laptop-liquido', icon: 'fa-droplet', desc: 'Si el teclado falla por líquido, atender daño en placa también.' },
          { label: 'Paquetes de mantenimiento',     href: '/paquetes',                 icon: 'fa-box',     desc: 'Aprovecha desarmado para limpieza interna.' },
        ],
      },

      // ─── Cambio de batería (extendida) ──────────────────────────────────
      {
        slug: 'cambio-bateria',
        label: 'Cambio de batería',
        seoKeyword: 'Cambio de batería de laptop en Cancún',
        hook: '¿Tu laptop dura 30 minutos desconectada o ya no carga? Recupera 4-8 horas de autonomía con batería nueva certificada.',
        intro: 'Reemplazo de batería interna por una nueva. Recuperas autonomía completa y ciclos de carga frescos.',
        bullets: ['Batería con celdas nuevas', 'Calibración de carga después del cambio', 'Reciclaje de batería vieja sin costo', 'Garantía 6 meses', 'Capacidad mayor o igual al original'],
        fromPrice: '$950 MXN', eta: '24-48 h', warranty: '6 meses por escrito',
        whyUs: [
          { icon: 'fa-battery-half', title: 'Capacidad real',      desc: 'mAh igual o superior al original. Sin trampas de "compatible barata".' },
          { icon: 'fa-recycle',      title: 'Reciclaje gratis',    desc: 'Tu batería vieja se desecha de forma segura, sin costo.' },
          { icon: 'fa-bolt',         title: 'Calibración incluida',desc: 'Calibramos los ciclos de carga del SO para máxima vida útil.' },
          { icon: 'fa-shield-halved',title: '6 meses garantía',    desc: 'Si baja la capacidad anormalmente, la cambiamos sin costo.' },
        ],
        process: [
          { title: '1. Test de batería', desc: 'Medimos ciclos, capacidad real y desgaste antes de recomendar.' },
          { title: '2. Cotización',      desc: 'Te ofrecemos opciones: pieza original (más caro) o equivalente certificada (mejor relación precio/calidad).' },
          { title: '3. Reemplazo',       desc: 'Desarmado, intercambio de batería, conexión segura del flex y reensamble.' },
          { title: '4. Calibración',     desc: 'Carga al 100%, descarga al 0% y recarga completa para calibrar el SO.' },
          { title: '5. Entrega',         desc: 'Reporte de ciclos nuevos + tip de uso para alargar vida útil.' },
        ],
        educationalBlocks: [
          {
            eyebrow: 'Cuidado y Rendimiento',
            title: '¿Cómo alargar la vida útil de tu nueva batería?',
            intro: 'Una vez instalada tu nueva batería, seguir estas recomendaciones de nuestros ingenieros garantizará que te dure años con excelente rendimiento.',
            imgSrc: '/assets/images/reparacion-mac-cancun.jpeg',
            imgAlt: 'Mantenimiento de baterías',
            reverse: false,
            points: [
              { icon: 'fa-plug-circle-check', title: 'Regla del 20-80', text: 'Intenta mantener la carga entre el 20% y el 80%. Evita descargas completas constantes.' },
              { icon: 'fa-temperature-low', title: 'Evita el calor extremo', text: 'No dejes tu laptop bajo el sol. El calor degrada la química interna permanentemente.' },
              { icon: 'fa-calendar-check', title: 'Ciclos de calibración', text: 'Una vez al mes, cárgala al 100%, úsala hasta que se apague y recárgala al máximo.' }
            ]
          }
        ],
        commonProblems: [
          { problem: 'Laptop dura menos de 1 hora',           solution: 'Batería con desgaste >30%. Cambio recupera autonomía original.' },
          { problem: 'No carga aunque conectada',             solution: 'Puede ser batería, cargador o flex de carga. Diagnóstico gratis lo define.' },
          { problem: 'Batería inflamada o hinchada',          solution: 'PELIGROSO. Apaga la laptop y tráela de inmediato — riesgo de daño a placa.' },
          { problem: 'Windows reporta "considere reemplazar"',solution: 'El sistema detectó desgaste >50%. Es buen momento para cambiar.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MSI', 'MacBook Pro', 'MacBook Air', 'Toshiba', 'Samsung'],
        faqs: [
          { question: '¿Cuánto cuesta cambiar la batería de mi laptop?',         answer: 'Entre <strong>$950 y $2,800 MXN</strong> dependiendo del modelo. Las MacBook y modelos premium cuestan más por la pieza.' },
          { question: '¿Cuánto dura una batería nueva?',                          answer: 'Con uso normal, <strong>3-5 años</strong> manteniendo más del 80% de capacidad. Calibrar y no descargar al 0% siempre alarga la vida.' },
          { question: '¿La batería nueva es original?',                            answer: 'Te damos a elegir: original del fabricante (más caro, capacidad idéntica) o equivalente certificada (capacidad igual o mayor, garantía 6 meses).' },
          { question: '¿Puedo seguir usando mi laptop conectada mientras espero?',answer: 'Sí, pero la batería puede empeorar si está hinchada. <strong>Si está hinchada, NO la uses</strong> — es riesgo de daño a placa.' },
          { question: '¿Reciclan mi batería vieja?',                               answer: 'Sí, sin costo. Es importante NO tirarla a la basura común — contamina y es peligrosa.' },
        ],
        relatedSlugs: ['cambio-pantalla', 'cambio-teclado', 'pasta-termica', 'diagnostico'],
        relatedExternal: [
          { label: 'Optimización del Sistema', href: '/optimizacion', icon: 'fa-bolt',    desc: 'Una laptop optimizada gasta menos batería.' },
          { label: 'Mantenimiento Mac',         href: '/mantenimiento-mac', icon: 'fa-apple',  desc: 'Para MacBook hacemos servicio especializado.' },
        ],
      },

      { slug: 'reparacion-bisagras',  label: 'Reparación Bisagras',     customUrl: '/reparacion-bisagras', intro: 'Sustitución de bisagras flojas o rotas y refuerzo de carcasa agrietada.', bullets: ['Bisagras nuevas + tornillería', 'Reforzado de chasis', 'Prueba 100 ciclos apertura/cierre', 'Garantía 6 meses'], fromPrice: '$650 MXN', eta: '2-5 días' },
      { slug: 'mantenimiento-interno',label: 'Mantenimiento Preventivo',customUrl: '/paquetes' },

      // ─── Cambio de pasta térmica (extendida) ────────────────────────────
      {
        slug: 'pasta-termica',
        label: 'Cambio de pasta térmica',
        seoKeyword: 'Cambio de pasta térmica para laptop en Cancún',
        hook: '¿Tu laptop quema, hace ruido o se apaga sola? La pasta térmica seca es la causa #1. La cambiamos y bajan las temperaturas hasta 25°C.',
        intro: 'Reemplazo de pasta térmica del CPU/GPU con compuesto premium. Bajan las temperaturas hasta 25°C y desaparece el ruido del ventilador.',
        bullets: ['Pasta Arctic MX-4 o equivalente premium', 'Limpieza de disipadores y ventiladores', 'Stress test post-reemplazo con datos antes/después', 'Garantía 3 meses'],
        fromPrice: '$550 MXN', eta: '24-48 h', warranty: '3 meses por escrito',
        whyUs: [
          { icon: 'fa-temperature-arrow-down', title: 'Bajan temperaturas',  desc: 'En promedio 15-25°C menos en CPU bajo carga. Tu laptop deja de quemarse.' },
          { icon: 'fa-volume-low',             title: 'Adiós al ruido',     desc: 'El ventilador deja de girar al máximo todo el tiempo.' },
          { icon: 'fa-flask',                  title: 'Pasta premium',      desc: 'Arctic MX-4 o equivalente, no la pasta gris barata que dura 3 meses.' },
          { icon: 'fa-chart-line',             title: 'Reporte antes/después',desc: 'Te enviamos screenshots de temperaturas antes y después.' },
        ],
        process: [
          { title: '1. Test térmico',  desc: 'Medimos temperaturas iniciales con HWMonitor. Capturamos lectura de CPU/GPU en idle y carga.' },
          { title: '2. Desarmado',     desc: 'Desarmamos hasta acceder al disipador. Limpiamos pasta vieja con alcohol isopropílico.' },
          { title: '3. Limpieza',      desc: 'Aire comprimido en ventiladores y disipadores. Limpieza completa del sistema de refrigeración.' },
          { title: '4. Aplicación',    desc: 'Aplicamos pasta nueva con técnica de "pea size" o "spread" según diseño del disipador.' },
          { title: '5. Stress test',   desc: 'Cinebench R23 + FurMark 15 min. Te enviamos comparativa antes/después.' },
        ],
        educationalBlocks: [
          {
            eyebrow: 'Mantenimiento Óptimo',
            title: 'Mantén tu laptop fresca',
            intro: 'La pasta térmica nueva hace maravillas, pero el entorno y tus hábitos son clave para que la temperatura no vuelva a subir.',
            imgSrc: '/assets/images/reparacion-mac-cancun.jpeg',
            imgAlt: 'Pasta térmica en laptop',
            reverse: true,
            points: [
              { icon: 'fa-bed', title: 'No uses la cama', text: 'Usar la laptop sobre sábanas o almohadas bloquea la ventilación y la ahoga térmicamente.' },
              { icon: 'fa-wind', title: 'Superficie dura', text: 'Úsala siempre sobre un escritorio, mesa o base enfriadora para garantizar flujo de aire.' },
              { icon: 'fa-calendar', title: 'Limpieza periódica', text: 'La pasta seca en 18 meses. Prográmate para hacerle limpieza antes de que el ventilador empiece a sonar.' }
            ]
          }
        ],
        commonProblems: [
          { problem: 'Laptop quema y se siente caliente al tacto', solution: 'Pasta seca + polvo. Cambio bajará 15-25°C inmediatamente.' },
          { problem: 'Ventilador a máxima velocidad siempre',      solution: 'Sistema térmico saturado. Limpieza + pasta nueva soluciona.' },
          { problem: 'Apagados aleatorios al jugar o renderizar',  solution: 'Throttling térmico. Pasta nueva evita apagados por temperatura.' },
          { problem: 'Rendimiento bajo aunque hardware es bueno',  solution: 'CPU bajando frecuencia por calor. Solucionando temp, recuperas FPS.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MSI', 'MacBook Pro', 'MacBook Air', 'Razer', 'Alienware', 'Gigabyte'],
        faqs: [
          { question: '¿Cada cuánto debo cambiar la pasta térmica?',  answer: 'En climas calientes como Cancún recomendamos <strong>cada 18-24 meses</strong>. Si usas la laptop para gaming o video, mejor cada 12-18 meses.' },
          { question: '¿Qué pasta usan?',                              answer: 'Por defecto Arctic MX-4 (premium, dura 8 años). Si quieres metal líquido (top performance), se cotiza aparte porque es delicado de aplicar.' },
          { question: '¿Cuánto bajan las temperaturas?',                answer: 'Depende del estado inicial. Promedio: <strong>15-25°C menos en CPU</strong> bajo carga. En MacBooks Intel suele bajar 30°C.' },
          { question: '¿Es seguro abrir mi laptop para esto?',          answer: 'Sí, lo hacemos cientos al año. Usamos antiestáticas, herramientas correctas y conocemos los puntos críticos de cada modelo.' },
          { question: '¿Vale la pena en una laptop vieja?',             answer: 'Sí, es el upgrade con mejor relación costo-beneficio. Por $550 MXN extiendes vida útil 2-3 años más.' },
        ],
        relatedSlugs: ['cambio-bateria', 'upgrade', 'diagnostico'],
        relatedExternal: [
          { label: 'Mantenimiento Mac',         href: '/mantenimiento-mac',         icon: 'fa-apple',   desc: 'Servicio especializado para MacBook con metal líquido opcional.' },
          { label: 'Limpieza por líquido',     href: '/limpieza-laptop-liquido',   icon: 'fa-droplet', desc: 'Si tu laptop calienta tras un derrame, hay que atender ambas cosas.' },
          { label: 'Paquetes de mantenimiento', href: '/paquetes',                  icon: 'fa-box',     desc: 'Servicio recurrente con descuentos.' },
        ],
      },

      // ─── Upgrade SSD / RAM (extendida) ──────────────────────────────────
      {
        slug: 'upgrade',
        label: 'Upgrade SSD / RAM',
        seoKeyword: 'Upgrade de SSD y RAM para laptop en Cancún',
        hook: 'Tu laptop puede ser hasta 5x más rápida. Migración a SSD NVMe + ampliación de RAM con clonado de tu Windows actual — sin perder NADA.',
        intro: 'Migración a SSD NVMe/SATA y/o ampliación de memoria RAM. Tu equipo arranca en segundos y multiplica su rendimiento.',
        bullets: ['Clonado de Windows sin reinstalar nada', 'SSD desde 240 GB hasta 2 TB', 'Hasta 64 GB RAM según modelo', 'Backup completo antes de tocar nada', 'Asesoría: te decimos qué upgrade vale más la pena'],
        fromPrice: '$800 MXN + pieza', eta: '24-48 h', warranty: 'SSD: 3 años fabricante | RAM: 5 años fabricante',
        featuredImage: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&q=80',
        sectionImages: {
          whyUs:    'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&q=80',
          process:  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
        },
        whyUs: [
          { icon: 'fa-rocket',     title: 'Hasta 5x más rápida',   desc: 'Boot de 3 min a 15 segundos. Apps abren al instante.' },
          { icon: 'fa-clone',      title: 'Sin reinstalar nada',  desc: 'Clonamos tu sistema actual. Conservas TODO: programas, archivos, configuraciones.' },
          { icon: 'fa-shield-halved',title: 'Backup previo',      desc: 'Imagen completa de tu disco antes de iniciar. Cero riesgo de pérdida.' },
          { icon: 'fa-microchip',  title: 'Asesoría experta',     desc: 'Te decimos si conviene SSD, RAM o ambos según tu uso real.' },
        ],
        process: [
          { title: '1. Diagnóstico',     desc: 'Identificamos cuello de botella: ¿es disco lento, poca RAM o ambos? Recomendación basada en datos.' },
          { title: '2. Cotización piezas',desc: 'Cotización transparente: precio de pieza por separado + mano de obra. Tú apruebas el modelo exacto.' },
          { title: '3. Backup completo', desc: 'Imagen del disco actual antes de cualquier cambio. Si algo sale mal (no pasa), restauramos en 30 min.' },
          { title: '4. Instalación',     desc: 'Físicamente instalamos SSD/RAM. Clonado del SO actual al SSD nuevo (sin reinstalar Windows).' },
          { title: '5. Optimización',    desc: 'Ajustes del SO para aprovechar SSD (TRIM, alineación). Benchmarks finales para confirmar mejora.' },
          { title: '6. Entrega',         desc: 'Reporte con benchmarks antes/después + el disco viejo regresa contigo (no lo desechamos).' },
        ],
        commonProblems: [
          { problem: 'Windows tarda 3+ minutos en arrancar',     solution: 'SSD reduce a 10-20 segundos. Mejora más notoria del upgrade.' },
          { problem: 'Apps tardan en abrir / RAM siempre llena', solution: 'Más RAM (16/32 GB) elimina swap a disco. Mejor multitasking.' },
          { problem: 'Disco mecánico haciendo ruido',            solution: 'HDD a punto de fallar. Migrar a SSD ANTES de que muera.' },
          { problem: 'Sin espacio para fotos/videos',            solution: 'SSD de 1 TB o 2 TB resuelve por años.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MSI', 'MacBook Pro (Intel)', 'Toshiba', 'Samsung'],
        faqs: [
          { question: '¿SSD o más RAM, qué da más mejora?',                            answer: 'En equipos sin SSD, el SSD da el salto más grande (5x velocidad). En equipos con SSD pero <8 GB RAM, ampliar RAM es el siguiente. <strong>Te asesoramos sin compromiso.</strong>' },
          { question: '¿Qué SSD recomiendan?',                                         answer: 'Para uso normal: <strong>Kingston NV2 o Crucial P3 NVMe</strong> (excelente precio/rendimiento). Para gaming/profesional: <strong>Samsung 980 Pro o Crucial T500</strong>.' },
          { question: '¿Pierdo mis programas y archivos?',                              answer: 'NO. Clonamos tu sistema actual al SSD nuevo. Conservas <strong>todo</strong> exactamente igual: Windows, programas, archivos, configuraciones.' },
          { question: '¿Cuánta RAM máxima soporta mi laptop?',                          answer: 'Depende del modelo y del chipset. La verificamos en el diagnóstico. La mayoría soporta 16 o 32 GB; modelos premium hasta 64 GB.' },
          { question: '¿Pueden migrar mi MacBook a SSD?',                                answer: 'Sí, MacBooks Intel (hasta 2018-2019) son fácilmente actualizables. <strong>Apple Silicon (M1/M2/M3) tiene SSD soldado</strong> y no es upgradeable.' },
          { question: '¿Cuánto cuesta el upgrade completo?',                              answer: 'Mano de obra: $800 MXN. Piezas separadas: SSD 480 GB ~$700-900, SSD 1 TB ~$1,400-1,800, RAM 16 GB ~$900-1,300. Te lo cotizamos exacto.' },
        ],
        relatedSlugs: ['cambio-bateria', 'pasta-termica', 'diagnostico'],
        relatedExternal: [
          { label: 'Optimización del Sistema',  href: '/optimizacion',          icon: 'fa-bolt',     desc: 'Tras el upgrade, optimización exprime aún más el equipo.' },
          { label: 'Instalación de Windows',     href: '/instalacion-windows',   icon: 'fa-windows',  desc: 'Si prefieres reinstalación limpia en lugar de clonado.' },
          { label: 'Ensambles PC Gamer',         href: '/ensambles',             icon: 'fa-microchip',desc: 'Si tu laptop ya no da para más, te armamos PC desde cero.' },
        ],
      },

      // ─── Diagnóstico (extendida) ────────────────────────────────────────
      {
        slug: 'diagnostico',
        label: 'Diagnóstico',
        seoKeyword: 'Diagnóstico gratis de laptop en Cancún',
        hook: '¿Tu laptop tiene una falla que no entiendes? Diagnóstico profesional con reporte por escrito. GRATIS si autorizas la reparación.',
        intro: 'Revisión profesional para identificar la falla y darte presupuesto sin compromiso. Te explicamos qué tiene y qué cuesta arreglarlo.',
        bullets: ['Test eléctrico, software y hardware', 'Revisión de placa, RAM, disco, ventilación', 'Reporte por escrito con fotos', 'GRATIS si autorizas la reparación', 'Sin compromiso de continuar'],
        fromPrice: 'GRATIS', eta: '1-2 h', warranty: 'Reporte por escrito',
        whyUs: [
          { icon: 'fa-magnifying-glass', title: 'Diagnóstico completo', desc: 'Eléctrico, mecánico y de software. No te decimos "es la placa" sin pruebas.' },
          { icon: 'fa-file-contract',    title: 'Reporte por escrito',  desc: 'Lo recibes por WhatsApp con fotos y explicación clara, no jerga técnica.' },
          { icon: 'fa-handshake',        title: 'Sin compromiso',       desc: 'Te decimos qué tiene; tú decides si arreglas con nosotros o no.' },
          { icon: 'fa-piggy-bank',       title: 'GRATIS al reparar',    desc: 'Si autorizas la reparación, el diagnóstico no se cobra.' },
        ],
        process: [
          { title: '1. Recepción',      desc: 'Tomamos nota de la falla reportada y datos de contacto.' },
          { title: '2. Test eléctrico', desc: 'Verificamos cargador, batería, encendido y voltajes con multímetro.' },
          { title: '3. Test software',  desc: 'Boot a Windows/Linux, lectura de logs, SMART del disco, memtest si aplica.' },
          { title: '4. Test mecánico',  desc: 'Pantalla, teclado, touchpad, puertos, ventilación, bisagras.' },
          { title: '5. Reporte',        desc: 'Por WhatsApp: qué tiene, qué cuesta arreglarlo, qué tan urgente es.' },
        ],
        commonProblems: [
          { problem: '"No sé qué tiene mi laptop"',           solution: 'Para eso es el diagnóstico. Te decimos exactamente qué falla.' },
          { problem: 'Otro técnico me dijo X — quiero 2da opinión', solution: 'Te damos diagnóstico independiente sin presión de venta.' },
          { problem: 'Antes de comprar laptop usada quiero saber estado', solution: 'Inspección de equipo previo a compra: $200 MXN, te ahorra meterte en problemas.' },
          { problem: 'Quiero saber si vale la pena arreglar o comprar nueva', solution: 'Diagnóstico + recomendación honesta. Si la reparación supera 50% del valor, te decimos.' },
        ],
        compatibleBrands: ['Cualquier marca', 'Cualquier modelo', 'Cualquier antigüedad'],
        faqs: [
          { question: '¿Qué tan rápido me dan el diagnóstico?',          answer: 'Normalmente <strong>en 1-2 horas</strong>. Si tenemos cola, máximo 24 h. Te avisamos por WhatsApp en cuanto está.' },
          { question: '¿Realmente es GRATIS?',                            answer: 'Sí, <strong>si autorizas la reparación con nosotros</strong>. Si decides no arreglar o llevarte el equipo a otro lado, cobramos $200-300 MXN por el tiempo invertido.' },
          { question: '¿Qué incluye el reporte?',                          answer: 'Fallas detectadas (con fotos si es físico), causa probable, costo estimado de reparación, tiempo aproximado, y recomendación honesta sobre si vale la pena.' },
          { question: '¿Y si descubren más fallas?',                       answer: 'Te avisamos antes de tocar nada. Tú decides qué reparar. <strong>Cero sorpresas en la cuenta final.</strong>' },
          { question: '¿Hacen diagnóstico a domicilio?',                   answer: 'Sí en Cancún, con costo de visita ($300-500 según zona). Para diagnósticos profundos siempre recomendamos taller (mejores herramientas).' },
        ],
        relatedSlugs: ['cambio-pantalla', 'cambio-teclado', 'cambio-bateria', 'pasta-termica', 'upgrade'],
        relatedExternal: [
          { label: 'Reparación general',       href: '/reparaciones',         icon: 'fa-screwdriver-wrench', desc: 'Si ya sabes qué tiene, ve directo a reparar.' },
          { label: 'Mantenimiento preventivo', href: '/paquetes',             icon: 'fa-box',                desc: 'Si está sano pero quieres prevenir, paquete preventivo.' },
        ],
      },
      { slug: 'optimizacion',         label: 'Optimización del Sistema',customUrl: '/optimizacion' },
      { slug: 'instalacion-windows',  label: 'Instalación de Windows',  customUrl: '/instalacion-windows' },
      { slug: 'mantenimiento-mac',    label: 'Mantenimiento Mac',       customUrl: '/mantenimiento-mac' },
      { slug: 'limpieza-liquido',     label: 'Limpieza por Líquido',    customUrl: '/limpieza-laptop-liquido' },
    ],
  },
  {
    id: 'pc',
    slug: 'pc',
    title: 'PC',
    icon: 'fa-desktop',
    blurb: 'Escritorio / Gamer / Oficina',
    heroBg: 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)',
    services: [
      { slug: 'reparacion-general',      label: 'Reparación General',      customUrl: '/reparaciones' },
      { slug: 'ensambles',               label: 'Ensambles PC Gamer',      customUrl: '/ensambles' },
      { slug: 'mantenimiento-preventivo',label: 'Mantenimiento Preventivo',customUrl: '/paquetes' },

      // ─── Mantenimiento correctivo (extendida) ─────────────────────────
      {
        slug: 'mantenimiento-correctivo',
        label: 'Mantenimiento correctivo',
        seoKeyword: 'Mantenimiento correctivo de PC en Cancún',
        hook: '¿No enciende, pantalla azul, ruidos extraños o se reinicia sola? Diagnóstico + reparación con garantía y cotización clara antes de tocar.',
        intro: 'Diagnóstico y reparación de fallas: no enciende, pantalla azul, ruidos, lentitud severa. Cotización clara antes de empezar.',
        bullets: ['Diagnóstico hardware y software incluido', 'Reemplazo de componentes con tu autorización previa', 'Pruebas de estabilidad 24h', 'Garantía 30 días sobre la reparación', 'Backup antes de tocar el disco'],
        fromPrice: '$650 MXN', eta: '24-72 h', warranty: '30 días por escrito',
        whyUs: [
          { icon: 'fa-magnifying-glass', title: 'Diagnóstico real', desc: 'No "es la placa" sin pruebas. Test eléctrico + lógico antes de cobrar.' },
          { icon: 'fa-handshake',        title: 'Cotización antes', desc: 'Te cotizamos pieza por pieza. Tú decides qué cambiar.' },
          { icon: 'fa-shield-halved',    title: 'Garantía 30 días', desc: 'Si la falla cubierta reaparece, lo corregimos sin costo.' },
          { icon: 'fa-database',         title: 'Backup primero',   desc: 'Imagen de tu disco antes de cualquier intervención que lo toque.' },
        ],
        process: [
          { title: 'Diagnóstico',  desc: 'Test de fuente, RAM, disco, GPU y placa. Identificamos componente fallido.' },
          { title: 'Cotización',   desc: 'Por WhatsApp con foto del componente y precio de la pieza + mano de obra.' },
          { title: 'Backup',       desc: 'Imagen completa del disco antes de tocar nada que pueda afectarlo.' },
          { title: 'Reparación',   desc: 'Reemplazo de componente fallado con pieza nueva o equivalente.' },
          { title: 'Stress test',  desc: '24h de pruebas (Cinebench + Prime95 + memtest) antes de entregar.' },
        ],
        commonProblems: [
          { problem: 'PC no enciende (sin LED, sin beep)',         solution: 'Diagnóstico de fuente y placa base. Reparación o reemplazo según resultado.' },
          { problem: 'Pantalla azul (BSOD) frecuente',             solution: 'Test de RAM con memtest86 + revisión SMART del disco. Identificamos causa exacta.' },
          { problem: 'Reinicios aleatorios bajo carga',            solution: 'Suele ser fuente de poder degradada o sobrecalentamiento. Lo determinamos.' },
          { problem: 'Ruidos del disco o ventilador',              solution: 'Disco mecánico próximo a fallar — migrar a SSD ya. Ventiladores se cambian.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'PCs ensambladas', 'Workstations', 'Servidores pequeños'],
        faqs: [
          { question: '¿Cuánto cuesta una reparación correctiva?',  answer: 'Mano de obra desde <strong>$650 MXN</strong>. Las piezas se cotizan por separado tras diagnóstico. Cero sorpresas en la factura.' },
          { question: '¿Y si el costo de la reparación es muy alto?',answer: 'Te avisamos antes de tocar nada. Si la reparación supera el 50% del valor de la PC, te recomendamos opciones.' },
          { question: '¿Cuánto tarda?',                              answer: 'De <strong>24 a 72 horas</strong> según pieza. Si requerimos importar componente, hasta 7 días.' },
          { question: '¿Qué cubre la garantía?',                     answer: 'La pieza reemplazada y nuestra mano de obra por 30 días. No cubre fallas en componentes que NO reemplazamos.' },
        ],
        relatedSlugs: ['formateo', 'limpieza-profunda', 'upgrade', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación General',         href: '/reparaciones',   icon: 'fa-screwdriver-wrench', desc: 'Si ya tienes problemas con celular, laptop o PC.' },
          { label: 'Ensambles PC Gamer',         href: '/ensambles',      icon: 'fa-microchip',          desc: 'Si tu PC ya no da más, te armamos una nueva.' },
        ],
      },

      // ─── Formateo (extendida) ────────────────────────────────────────
      {
        slug: 'formateo',
        label: 'Formateo',
        seoKeyword: 'Formateo de PC en Cancún',
        hook: 'PC lenta, llena de virus o quieres empezar de cero. Borrado seguro + Windows limpio + drivers + tu paquetería favorita en 2-4 horas.',
        intro: 'Borrado seguro y reinstalación limpia del sistema operativo. Tu PC vuelve a sentirse como nueva en pocas horas.',
        bullets: ['Respaldo de tus archivos incluido', 'Windows + drivers + paquetería básica', 'Activación legal de licencia', 'Optimización post-instalación', 'Antivirus básico instalado'],
        fromPrice: '$450 MXN', eta: '2-4 h', warranty: 'Reinstalación gratis si falla en 30 días',
        whyUs: [
          { icon: 'fa-database', title: 'Backup primero',   desc: 'Tus archivos a salvo en disco externo antes de borrar nada.' },
          { icon: 'fa-windows',  title: 'Windows legal',    desc: 'Licencia activada o asesoría para conseguirla.' },
          { icon: 'fa-rocket',   title: 'Drivers + apps',   desc: 'Drivers oficiales del fabricante + paquetería esencial.' },
          { icon: 'fa-shield-halved', title: 'Antivirus',   desc: 'Protección básica activa desde el primer arranque.' },
        ],
        process: [
          { title: 'Backup',       desc: 'Copia completa de Documentos, Escritorio, Descargas, fotos y configuración del navegador.' },
          { title: 'Borrado seguro', desc: 'Formateo de bajo nivel del disco. Sin restos del sistema anterior.' },
          { title: 'Instalación',  desc: 'Windows 10 u 11 según compatibilidad + activación + actualizaciones críticas.' },
          { title: 'Drivers',      desc: 'Drivers oficiales del fabricante: chipset, video, audio, red, lector de huellas.' },
          { title: 'Paquetería',   desc: 'Office o LibreOffice, navegador, lector PDF, antivirus, paquetes que uses.' },
          { title: 'Restauración', desc: 'Devolvemos tus archivos al lugar correcto. Listo para usar.' },
        ],
        commonProblems: [
          { problem: 'PC con virus que vuelve sola',         solution: 'Formateo limpio elimina rootkits y malware persistente.' },
          { problem: 'Windows lento aunque tengas SSD',      solution: 'Acumulación de software basura. Reinstalación devuelve velocidad.' },
          { problem: 'Errores que no se solucionan',         solution: 'Si llevas semanas con el mismo error, formateo es la cura.' },
          { problem: 'Voy a vender la PC',                   solution: 'Borrado seguro + sistema limpio para entregarla lista.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'PCs ensambladas', 'PCs gamer', 'Mini PCs'],
        faqs: [
          { question: '¿Pierdo mis archivos?',                     answer: 'NO. <strong>Hacemos backup completo antes</strong> y los restauramos al final. Cero pérdida si autorizas el respaldo.' },
          { question: '¿Cuánto tarda?',                            answer: '<strong>2 a 4 horas</strong> en la mayoría de casos. Mismo día para SSD; HDD puede tardar 6h.' },
          { question: '¿Qué versión de Windows instalan?',         answer: 'Windows 10 LTSC (estable) o Windows 11 si tu equipo cumple TPM 2.0 + Secure Boot. Te asesoramos.' },
          { question: '¿La licencia es legal?',                    answer: 'Sí. Si ya tenías licencia digital, se reactiva automáticamente. Si no, podemos cotizar OEM legal con factura.' },
          { question: '¿Incluye paquetería de Office?',            answer: 'LibreOffice gratis incluido. Si quieres Microsoft Office original, lo cotizamos por separado.' },
        ],
        relatedSlugs: ['mantenimiento-correctivo', 'limpieza-profunda', 'upgrade', 'diagnostico'],
        relatedExternal: [
          { label: 'Instalación de Windows',  href: '/instalacion-windows', icon: 'fa-windows', desc: 'Página dedicada con más opciones de licencia y versiones.' },
          { label: 'Optimización del Sistema',href: '/optimizacion',         icon: 'fa-bolt',    desc: 'Ya con Windows limpio, optimización avanzada exprime más.' },
        ],
      },

      { slug: 'instalacion-sistema',     label: 'Instalación de Windows',  customUrl: '/instalacion-windows' },

      // ─── Upgrade RAM/SSD PC (extendida) ──────────────────────────────
      {
        slug: 'upgrade',
        label: 'Upgrade RAM / SSD',
        seoKeyword: 'Upgrade de RAM y SSD para PC en Cancún',
        hook: 'Mejoramos tu PC sin cambiarla. Más RAM, SSD NVMe, o tarjeta gráfica nueva — con clonado de tu Windows actual y benchmark antes/después.',
        intro: 'Mejoramos tu PC sin cambiarla: más RAM, SSD NVMe o tarjeta gráfica nueva. Asesoría experta para no gastar de más.',
        bullets: ['Análisis de cuello de botella real', 'Recomendación con cotización transparente', 'Instalación + pruebas + benchmark', 'Clonado de Windows sin reinstalar', 'Garantía del fabricante en cada pieza'],
        fromPrice: '$300 MXN + pieza', eta: '24-48 h', warranty: 'Pieza: garantía fabricante (1-3 años) | Mano de obra: 30 días',
        whyUs: [
          { icon: 'fa-magnifying-glass-chart', title: 'Identificamos cuello', desc: 'Te decimos si es disco, RAM o GPU lo que limita tu PC.' },
          { icon: 'fa-piggy-bank',             title: 'Sin gastar de más',  desc: 'Recomendación honesta: solo cambias lo que de verdad importa.' },
          { icon: 'fa-clone',                  title: 'Clonado del SO',     desc: 'Conservas Windows + apps + archivos exactamente igual.' },
          { icon: 'fa-chart-line',             title: 'Benchmarks',         desc: 'Antes/después con CrystalDisk + 3DMark para que veas la mejora.' },
        ],
        process: [
          { title: 'Diagnóstico de bottleneck', desc: 'Medimos uso real de CPU/RAM/disco/GPU para identificar qué frena tu PC.' },
          { title: 'Cotización piezas',    desc: 'Lista con precios actualizados. Tú apruebas modelo exacto.' },
          { title: 'Backup',               desc: 'Imagen completa antes de tocar disco. Cero riesgo de pérdida.' },
          { title: 'Instalación',          desc: 'Físico + clonado del SO al SSD nuevo (sin reinstalar Windows).' },
          { title: 'Benchmarks',           desc: 'CrystalDiskMark, Cinebench, 3DMark. Reporte antes/después.' },
        ],
        commonProblems: [
          { problem: 'PC arranca lentísima',           solution: 'SSD NVMe te lleva de 3 min a 15 segundos. La mejora más impactante.' },
          { problem: 'Apps tardan en abrir',           solution: 'Más RAM (16 o 32 GB) elimina el swap a disco. Multitasking real.' },
          { problem: 'No corre juegos modernos',       solution: 'GPU dedicada o ampliación de RAM. Te decimos cuál cambia el juego.' },
          { problem: 'Sin espacio para fotos/videos',  solution: 'SSD de 1 TB o 2 TB resuelve por años.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'PCs ensambladas', 'Workstations', 'Mini PCs'],
        faqs: [
          { question: '¿SSD o más RAM, qué da más mejora?',        answer: 'Sin SSD, el SSD da el salto más grande (5x velocidad). Si ya tienes SSD pero <8 GB RAM, ampliar RAM es lo siguiente.' },
          { question: '¿Pierdo mis programas?',                     answer: 'NO. Clonamos tu sistema actual. Conservas <strong>todo</strong> exactamente igual.' },
          { question: '¿Qué SSD recomiendan?',                       answer: 'Para uso normal: <strong>Kingston NV2 o Crucial P3 NVMe</strong>. Para gaming: <strong>Samsung 980 Pro</strong>.' },
          { question: '¿Cuánta RAM máxima soporta mi PC?',           answer: 'Depende del chipset. La verificamos en el diagnóstico. La mayoría soporta 32 o 64 GB.' },
          { question: '¿Pueden poner GPU nueva?',                    answer: 'Sí. Verificamos compatibilidad de fuente, espacio y ranura PCIe antes de cotizar.' },
        ],
        relatedSlugs: ['formateo', 'mantenimiento-correctivo', 'limpieza-profunda', 'diagnostico'],
        relatedExternal: [
          { label: 'Ensambles PC Gamer',         href: '/ensambles',     icon: 'fa-microchip', desc: 'Si conviene armar PC nueva en lugar de actualizar.' },
          { label: 'Optimización del Sistema',   href: '/optimizacion',  icon: 'fa-bolt',      desc: 'Saca aún más provecho del hardware nuevo.' },
        ],
      },

      // ─── Limpieza profunda PC (extendida) ─────────────────────────────
      {
        slug: 'limpieza-profunda',
        label: 'Limpieza profunda',
        seoKeyword: 'Limpieza profunda de PC en Cancún',
        hook: 'PC con polvo de años, ventiladores que rugen y temperaturas insanas. Desarmamos todo, limpiamos cada componente y aplicamos pasta nueva.',
        intro: 'Desarmado total, limpieza de cada componente con químicos especializados, cambio de pasta térmica y reensamble.',
        bullets: ['Limpieza ultrasónica de placa si aplica', 'Cambio de pasta térmica incluido', 'Reorganización de cableado', 'Test térmico antes/después', 'Limpieza de fuente y disipadores'],
        fromPrice: '$600 MXN', eta: '24-48 h', warranty: '60 días',
        whyUs: [
          { icon: 'fa-spray-can-sparkles', title: 'Limpieza nivel pro',   desc: 'Aire comprimido + alcohol isopropílico + ultrasonidos. No solo soplar.' },
          { icon: 'fa-temperature-arrow-down', title: 'Bajan temperaturas', desc: 'Tu PC vuelve a temperaturas de fábrica. Ventiladores en silencio.' },
          { icon: 'fa-flask',              title: 'Pasta térmica nueva',  desc: 'Arctic MX-4 incluida. Bajan otros 10-15°C extra del CPU.' },
          { icon: 'fa-list-check',         title: 'Cableado pro',         desc: 'Reorganizamos cables para mejor flujo de aire post-limpieza.' },
        ],
        process: [
          { title: 'Test térmico inicial', desc: 'Medimos temperaturas en idle y bajo carga (HWMonitor + Cinebench).' },
          { title: 'Desarmado total',  desc: 'Cada componente sale para limpieza individual. Foto del cableado para reensamble exacto.' },
          { title: 'Limpieza',         desc: 'Ventiladores, disipadores, RAM, slots, fuente. Químicos seguros para electrónica.' },
          { title: 'Pasta térmica',    desc: 'Limpieza de pasta vieja del CPU/GPU + aplicación de pasta nueva premium.' },
          { title: 'Reensamble',       desc: 'Cableado limpio + verificación de cada conexión.' },
          { title: 'Test térmico final', desc: 'Mismas pruebas que al inicio. Reporte comparativo antes/después.' },
        ],
        commonProblems: [
          { problem: 'PC quema y los ventiladores rugen',        solution: 'Polvo + pasta seca. Limpieza profunda baja 20-30°C inmediatamente.' },
          { problem: 'Apagados aleatorios bajo carga',            solution: 'Throttling térmico por temperatura. Limpieza lo soluciona.' },
          { problem: 'PC con años sin servicio',                  solution: 'Acumulación crítica de polvo. Necesita limpieza profunda urgente.' },
          { problem: 'Olor extraño o quemado al encender',        solution: 'PARA YA. Tráela de inmediato — riesgo de daño a fuente o placa.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'PCs ensambladas', 'PCs gamer', 'Workstations'],
        faqs: [
          { question: '¿Cada cuánto necesito una limpieza profunda?',  answer: 'En Cancún (humedad + polvo) recomendamos <strong>cada 12-18 meses</strong>. Si tu PC está cerca de ventana o nunca se ha limpiado, urge.' },
          { question: '¿Cuánto cuesta?',                                answer: 'Desde <strong>$600 MXN</strong>. Si requiere limpieza ultrasónica de placa por sulfatación, se cotiza extra ($300-500).' },
          { question: '¿Qué tanto bajan las temperaturas?',              answer: 'En PCs muy sucias: <strong>20-30°C menos</strong>. En PCs con polvo moderado: 10-15°C. Reporte real al final.' },
          { question: '¿Es seguro abrir mi PC?',                         answer: 'Sí. Antiestática, herramientas correctas, fotos del cableado. Lo hacemos cientos de veces al año.' },
          { question: '¿Vale la pena en una PC vieja?',                   answer: 'Mucho. Por $600 MXN extiendes vida útil 2-3 años más y la temperatura vuelve a normal.' },
        ],
        relatedSlugs: ['formateo', 'mantenimiento-correctivo', 'upgrade', 'diagnostico'],
        relatedExternal: [
          { label: 'Paquetes de mantenimiento', href: '/paquetes',     icon: 'fa-box',     desc: 'Servicio recurrente con descuento.' },
          { label: 'Antisulfatación',           href: '/antisulfatacion', icon: 'fa-droplet-slash', desc: 'Si vives cerca del mar, atender corrosión también.' },
        ],
      },

      // ─── Diagnóstico PC (extendida) ──────────────────────────────────
      {
        slug: 'diagnostico',
        label: 'Diagnóstico',
        seoKeyword: 'Diagnóstico gratis de PC en Cancún',
        hook: 'Tu PC tiene una falla y no sabes qué es. Diagnóstico técnico real con reporte por escrito. GRATIS si autorizas la reparación.',
        intro: 'Revisamos tu PC y te decimos exactamente qué tiene, sin compromiso. Reporte detallado por WhatsApp.',
        bullets: ['Test eléctrico, RAM, disco, GPU', 'Revisión térmica con HWMonitor', 'Reporte por escrito con fotos', 'GRATIS si autorizas la reparación', 'Sin presión de venta'],
        fromPrice: 'GRATIS', eta: '1-2 h', warranty: 'Reporte por escrito',
        whyUs: [
          { icon: 'fa-magnifying-glass', title: 'Diagnóstico real', desc: 'No "es la placa" sin pruebas. Test profesional de cada componente.' },
          { icon: 'fa-file-contract',    title: 'Reporte por escrito', desc: 'Por WhatsApp con fotos y explicación clara, no jerga técnica.' },
          { icon: 'fa-handshake',        title: 'Sin compromiso', desc: 'Te decimos qué tiene; tú decides si arreglas con nosotros o no.' },
          { icon: 'fa-piggy-bank',       title: 'GRATIS al reparar', desc: 'Si autorizas la reparación, el diagnóstico no se cobra.' },
        ],
        process: [
          { title: 'Recepción',     desc: 'Anotamos la falla reportada y datos de contacto.' },
          { title: 'Test eléctrico',desc: 'Verificamos fuente de poder, voltajes y amperaje con multímetro.' },
          { title: 'Test software', desc: 'Lectura SMART del disco, memtest, monitoreo térmico, logs de Windows.' },
          { title: 'Test mecánico', desc: 'Conexiones, slots, puertos, ventilación y limpieza interna preliminar.' },
          { title: 'Reporte',       desc: 'Por WhatsApp: qué tiene, qué cuesta arreglarlo, qué tan urgente es.' },
        ],
        commonProblems: [
          { problem: '"No sé qué tiene mi PC"',                solution: 'Para eso es el diagnóstico. Te decimos exactamente qué falla.' },
          { problem: 'Otro técnico me dijo X — quiero 2da opinión', solution: 'Te damos diagnóstico independiente sin presión de venta.' },
          { problem: 'Voy a comprar una PC usada — quiero saber estado', solution: 'Inspección pre-compra: $200 MXN, te ahorra meterte en problemas.' },
          { problem: 'Conviene reparar o comprar nueva?',       solution: 'Diagnóstico + recomendación honesta. Si supera 50% del valor, te decimos.' },
        ],
        compatibleBrands: ['Cualquier marca', 'Cualquier modelo', 'Cualquier antigüedad'],
        faqs: [
          { question: '¿Qué tan rápido me dan el diagnóstico?',        answer: 'Normalmente <strong>1-2 horas</strong>. Si tenemos cola, máximo 24 h. Te avisamos por WhatsApp en cuanto está.' },
          { question: '¿Es realmente GRATIS?',                          answer: 'Sí, si autorizas la reparación con nosotros. Si decides no arreglar o llevarte el equipo, cobramos $200-300 por el tiempo invertido.' },
          { question: '¿Qué incluye el reporte?',                       answer: 'Fallas detectadas (con fotos si es físico), causa probable, costo estimado, tiempo aproximado, y recomendación honesta sobre si vale la pena.' },
          { question: '¿Hacen diagnóstico a domicilio?',                answer: 'Sí en Cancún, con costo de visita ($300-500 según zona). Para diagnósticos profundos siempre recomendamos taller.' },
        ],
        relatedSlugs: ['mantenimiento-correctivo', 'formateo', 'upgrade', 'limpieza-profunda'],
        relatedExternal: [
          { label: 'Reparación general',   href: '/reparaciones',  icon: 'fa-screwdriver-wrench', desc: 'Si ya sabes qué tiene, ve directo a reparar.' },
          { label: 'Paquetes de mantenimiento', href: '/paquetes', icon: 'fa-box',                desc: 'Servicio preventivo recurrente.' },
        ],
      },

      { slug: 'optimizacion',            label: 'Optimización del Sistema',customUrl: '/optimizacion' },
    ],
  },
  {
    id: 'consola',
    slug: 'consola',
    title: 'Consola',
    icon: 'fa-gamepad',
    blurb: 'PS5 / Xbox / Switch',
    heroBg: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)',
    services: [
      { slug: 'reparacion-general',label: 'Reparación General',       customUrl: '/reparaciones' },
      { slug: 'limpieza-consolas', label: 'Limpieza de Consolas',     customUrl: '/paquetes' },
      { slug: 'reparacion-controles',label: 'Reparación Controles',   customUrl: '/reparacion-controles' },

      // ─── Limpieza interna consola (extendida) ────────────────────────
      {
        slug: 'limpieza-interna',
        label: 'Limpieza interna',
        seoKeyword: 'Limpieza interna de consolas en Cancún',
        hook: '¿PS5, Xbox o Switch que parece avión despegando? Polvo + pasta seca = sobrecalentamiento. Limpieza profunda + pasta nueva.',
        intro: 'Eliminamos polvo acumulado en PS5, Xbox y Switch. Adiós a sobrecalentamiento, ruido del ventilador y reinicios aleatorios.',
        bullets: ['Desarmado total profesional', 'Limpieza de ventiladores y disipadores', 'Cambio de pasta térmica incluido', 'Test acústico antes/después', 'Garantía 3 meses'],
        fromPrice: '$500 MXN', eta: '24-48 h', warranty: '3 meses por escrito',
        whyUs: [
          { icon: 'fa-volume-low',       title: 'Adiós al ruido',        desc: 'Tu consola deja de sonar como turbina. Vuelve al silencio de fábrica.' },
          { icon: 'fa-temperature-arrow-down', title: 'Baja temperatura', desc: '15-25°C menos en el APU. Sin throttling ni reinicios.' },
          { icon: 'fa-flask',            title: 'Pasta premium',         desc: 'Arctic MX-4 o equivalente. No la pasta gris barata.' },
          { icon: 'fa-shield-halved',    title: 'Sin daños a sellos',    desc: 'Desarmamos sin dañar sellos críticos. Trabajo limpio.' },
        ],
        process: [
          { title: 'Test acústico',      desc: 'Grabamos el ruido inicial del ventilador para comparar al final.' },
          { title: 'Desarmado',          desc: 'Desarmado completo respetando guías OEM. Foto de cada paso.' },
          { title: 'Limpieza',           desc: 'Aire comprimido + alcohol isopropílico en disipadores, ventilador y placa.' },
          { title: 'Pasta térmica',      desc: 'Limpieza de pasta vieja + aplicación premium en CPU/APU/GPU.' },
          { title: 'Reensamble + test',  desc: 'Reensamble + test térmico jugando 30 min (Spider-Man o MonHun).' },
        ],
        educationalBlocks: [
          {
            eyebrow: 'Prevención de Daños',
            title: 'Cómo evitar que tu consola se llene de polvo',
            intro: 'Tu PS5 o Xbox es una aspiradora de polvo. Si la ubicas bien, el mantenimiento te durará el doble.',
            imgSrc: '/assets/images/reparacion-mac-cancun.jpeg',
            imgAlt: 'Limpieza de polvo consola PS5',
            reverse: false,
            points: [
              { icon: 'fa-box', title: 'Fuera de muebles cerrados', text: 'Los muebles de TV cerrados o nichos estrechos reciclan aire caliente. Dale espacio para respirar.' },
              { icon: 'fa-arrow-up', title: 'Aléjala del suelo', text: 'No pongas la consola en el piso. Es donde hay más polvo, pelos de mascota y humedad.' },
              { icon: 'fa-broom', title: 'Limpia tu entorno', text: 'Mantener limpia la mesa o repisa reduce en 50% el polvo que aspira el ventilador de la consola.' }
            ]
          }
        ],
        commonProblems: [
          { problem: 'Ventilador como avión despegando',     solution: 'Polvo crítico + pasta seca. Limpieza profunda lo soluciona.' },
          { problem: 'Consola se apaga sola al jugar',       solution: 'Sobrecalentamiento del APU. Pasta nueva + limpieza evita apagados.' },
          { problem: 'Reinicios al ver Netflix o jugar',     solution: 'Termal throttling. Servicio completo soluciona.' },
          { problem: 'Consola que parece quemar al tacto',   solution: 'Disipadores saturados. Limpieza baja temperaturas drásticamente.' },
        ],
        compatibleBrands: ['PlayStation 5', 'PS4 / Pro / Slim', 'Xbox Series X / S', 'Xbox One / X / S', 'Nintendo Switch', 'Switch OLED', 'Switch Lite'],
        faqs: [
          { question: '¿Cada cuánto debo limpiar mi consola?',          answer: 'En Cancún (humedad + polvo) recomendamos <strong>cada 12-18 meses</strong>. Si juegas mucho o nunca se ha limpiado, urge.' },
          { question: '¿Pierdo la garantía oficial?',                    answer: 'Si tu consola está en garantía oficial, sí (al abrir). Pero si tu garantía ya venció, NO hay riesgo — la consola es tuya.' },
          { question: '¿Qué tanto baja el ruido?',                       answer: 'En consolas muy sucias el ruido baja al 30-40%. Vuelves a escuchar el juego sin auriculares.' },
          { question: '¿Cuánto tarda?',                                  answer: '<strong>24-48 horas</strong>. Si requiere ventilador adicional, 3-5 días.' },
          { question: '¿Es seguro abrir mi PS5/Xbox?',                   answer: 'Sí. Tenemos las herramientas correctas (TR8, T9, etc.) y conocemos cada modelo. Cero daños a sellos críticos.' },
        ],
        relatedSlugs: ['pasta-termica', 'ventilacion', 'fuente', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación de Controles',   href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Joystick drift, gatillos, botones — lo arreglamos.' },
          { label: 'Paquetes de mantenimiento', href: '/paquetes',             icon: 'fa-box',     desc: 'Servicio recurrente con descuento.' },
        ],
      },

      // ─── Pasta térmica consola (extendida) ───────────────────────────
      {
        slug: 'pasta-termica',
        label: 'Cambio de pasta térmica',
        seoKeyword: 'Cambio de pasta térmica para PS5, Xbox y Switch en Cancún',
        hook: 'La pasta de fábrica de PS5/Xbox seca rápido en climas calientes. La cambiamos por premium y bajan las temperaturas hasta 25°C.',
        intro: 'Reemplazo de pasta térmica del APU en PS5, Xbox y Switch. Bajan temperaturas, vuelve el silencio y se acaban los reinicios.',
        bullets: ['Pasta de alto rendimiento (Arctic MX-4 o Thermal Grizzly)', 'Stress test con MonHun, Spider-Man o juego intensivo', 'Limpieza de disipador incluida', 'Garantía 3 meses', 'Reporte de temperaturas antes/después'],
        fromPrice: '$450 MXN', eta: '24-48 h', warranty: '3 meses por escrito',
        whyUs: [
          { icon: 'fa-temperature-arrow-down', title: 'Bajan 15-25°C',  desc: 'En APU bajo carga. Tu consola deja de calentar como horno.' },
          { icon: 'fa-volume-low',             title: 'Adiós al ruido', desc: 'Ventilador deja de girar al máximo todo el tiempo.' },
          { icon: 'fa-flask',                  title: 'Pasta premium',  desc: 'Arctic MX-4 (8 años) o Thermal Grizzly Kryonaut (top performance).' },
          { icon: 'fa-chart-line',             title: 'Reporte real',   desc: 'Screenshots de temperaturas antes/después. Mejora medible.' },
        ],
        process: [
          { title: 'Test térmico',     desc: 'Encendemos consola, jugamos 15 min y medimos temperatura del APU.' },
          { title: 'Desarmado',        desc: 'Apertura completa hasta acceder al disipador. Sin daños a sellos.' },
          { title: 'Limpieza',         desc: 'Pasta vieja con alcohol isopropílico. Limpieza fina del cobre.' },
          { title: 'Aplicación',       desc: 'Aplicación de pasta nueva con técnica correcta para el tamaño del die.' },
          { title: 'Reensamble + test',desc: '30 min de juego intensivo. Reporte de temperaturas comparativo.' },
        ],
        commonProblems: [
          { problem: 'PS5/Xbox con ventilador a tope siempre',     solution: 'Pasta seca = throttling térmico. Pasta nueva soluciona.' },
          { problem: 'Reinicios aleatorios al jugar',              solution: 'Sobrecalentamiento extremo. Pasta nueva evita apagados.' },
          { problem: 'Consola con +3 años sin servicio',           solution: 'Pasta original ya secó. Es momento de cambiar.' },
          { problem: 'Quiero metal líquido para máximo rendimiento',solution: 'Lo cotizamos aparte. Es delicado pero baja 8-12°C extra.' },
        ],
        compatibleBrands: ['PlayStation 5', 'PS4 / Pro / Slim', 'Xbox Series X / S', 'Xbox One / X / S', 'Nintendo Switch', 'Switch OLED'],
        faqs: [
          { question: '¿Vale la pena en mi consola?',                  answer: 'Si tiene <strong>+2 años o calienta mucho</strong>, MUCHO. Por $450 MXN evitas daño térmico permanente al APU.' },
          { question: '¿Qué pasta usan?',                              answer: 'Por defecto Arctic MX-4 (premium, dura 8 años). Si quieres metal líquido, se cotiza aparte ($150-200 extra) por delicadeza.' },
          { question: '¿Cuánto bajan las temperaturas?',                answer: '<strong>15-25°C en el APU bajo carga</strong>. Reporte real con HWMonitor antes y después.' },
          { question: '¿Cuánto tarda?',                                answer: '<strong>24-48 horas</strong>. Tienes consola de vuelta el fin de semana.' },
          { question: '¿Mi PS5 con sticker de garantía Sony?',         answer: 'Si la garantía oficial sigue activa, sí afecta. Si ya pasó (la mayoría) no hay impacto. Te asesoramos.' },
        ],
        relatedSlugs: ['limpieza-interna', 'ventilacion', 'fuente', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación de Controles',  href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Aprovecha visita para arreglar el control con drift.' },
          { label: 'Paquetes de mantenimiento',href: '/paquetes',             icon: 'fa-box',     desc: 'Plan anual con descuento.' },
        ],
      },

      // ─── HDMI consola (extendida) ─────────────────────────────────────
      {
        slug: 'hdmi',
        label: 'Reparación de HDMI',
        seoKeyword: 'Reparación de puerto HDMI de consolas en Cancún',
        hook: '¿Tu PS5/Xbox no da imagen, parpadea o tiene puerto HDMI roto? Soldadura BGA profesional con puerto nuevo. La salvamos.',
        intro: 'Puerto HDMI doblado, sin video o sin audio. Lo cambiamos a nivel de placa con técnica BGA profesional.',
        bullets: ['Soldadura BGA profesional con horno reflow', 'Puerto HDMI nuevo OEM', 'Prueba 4K HDR + audio + variable refresh', 'Garantía 3 meses', 'Reparamos lo que otros descartan'],
        fromPrice: '$1,200 MXN', eta: '3-7 días', warranty: '3 meses por escrito',
        whyUs: [
          { icon: 'fa-microchip',     title: 'Soldadura BGA real',   desc: 'Horno reflow profesional, no pistolas de aire caseras.' },
          { icon: 'fa-plug',          title: 'Puerto OEM nuevo',     desc: 'Mismo conector que el de fábrica. Cero compatibilidad rara.' },
          { icon: 'fa-video',         title: 'Test 4K HDR',          desc: 'Probamos con Spider-Man o The Last of Us en 4K HDR.' },
          { icon: 'fa-shield-halved', title: 'Donde otros rinden',   desc: 'Si te dijeron "no se puede", traela. La mayoría se reparan.' },
        ],
        process: [
          { title: 'Diagnóstico eléctrico', desc: 'Verificamos si el daño es solo puerto, o si afectó IC adyacente.' },
          { title: 'Cotización',           desc: 'Si es solo puerto: cotización fija. Si afecta IC: te avisamos antes de continuar.' },
          { title: 'Desoldado',            desc: 'Retiramos puerto dañado con estación de aire caliente y técnica BGA.' },
          { title: 'Soldado nuevo',        desc: 'Aplicación de flux + posicionamiento + horneado a temperatura controlada.' },
          { title: 'Test',                 desc: 'Encendido, 4K, HDR, audio, variable refresh. Garantía si pasa.' },
        ],
        commonProblems: [
          { problem: 'PS5/Xbox sin imagen pero enciende',     solution: 'Puerto HDMI dañado. Reparación BGA recupera salida de video.' },
          { problem: 'Imagen entrecortada o con líneas',      solution: 'Pines doblados o IC afectado. Lo determinamos al diagnóstico.' },
          { problem: 'Pin del HDMI quebrado/doblado',         solution: 'Cambio de puerto completo. Cero opción a "enderezar".' },
          { problem: 'Audio sí, video no',                    solution: 'Suele ser pin de video específico. Reparación posible.' },
        ],
        compatibleBrands: ['PlayStation 5', 'PS5 Slim', 'PS4 / Pro', 'Xbox Series X / S', 'Xbox One / X / S', 'Nintendo Switch (dock)'],
        faqs: [
          { question: '¿Cuánto cuesta reparar el HDMI?',           answer: 'Desde <strong>$1,200 MXN</strong> si es solo puerto. Si el daño afectó IC adyacentes, hasta $2,500.' },
          { question: '¿Cuánto tarda la reparación?',              answer: '<strong>3 a 7 días</strong> dependiendo de stock del puerto OEM y complejidad.' },
          { question: '¿Mi consola dice "señal débil" — es HDMI?', answer: 'Puede ser. También puede ser cable o TV. Diagnóstico gratis lo determina.' },
          { question: '¿Vale la pena vs comprar nueva?',           answer: 'PS5 nueva: $12,000 MXN. Reparar HDMI: $1,200-2,500. <strong>Casi siempre vale la pena</strong>.' },
          { question: '¿Qué garantía dan?',                        answer: '<strong>3 meses por escrito</strong>. Si el puerto reemplazado falla por defecto, lo cambiamos sin costo.' },
        ],
        relatedSlugs: ['fuente', 'ventilacion', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación de Controles', href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Si también tienes drift en el control.' },
        ],
      },

      // ─── Fuente consola (extendida) ───────────────────────────────────
      {
        slug: 'fuente',
        label: 'Reparación de fuente',
        seoKeyword: 'Reparación de fuente de consolas en Cancún',
        hook: '¿Tu consola no enciende, beep de error o se reinicia sola? Suele ser la fuente. La reparamos a nivel componente.',
        intro: 'Consola que no enciende, beep de error o reinicios aleatorios — fuente de poder dañada. Reparación a nivel de placa.',
        bullets: ['Diagnóstico eléctrico con multímetro', 'Reparación o reemplazo de fuente OEM', 'Cambio de capacitores hinchados', 'Garantía 3 meses', 'Pruebas de carga 24h'],
        fromPrice: '$800 MXN', eta: '3-5 días', warranty: '3 meses por escrito',
        whyUs: [
          { icon: 'fa-bolt',          title: 'Diagnóstico eléctrico', desc: 'Multímetro + osciloscopio. Identificamos componente exacto.' },
          { icon: 'fa-microchip',     title: 'Reparación a nivel componente', desc: 'No reemplazamos toda la fuente si solo es un capacitor.' },
          { icon: 'fa-clock',         title: '24h stress test',       desc: 'Encendidos repetidos + carga máxima antes de entregar.' },
          { icon: 'fa-shield-halved', title: '3 meses garantía',      desc: 'Si vuelve a fallar la fuente reparada, cambio sin costo.' },
        ],
        process: [
          { title: 'Test eléctrico',  desc: 'Voltajes de salida con multímetro. Identificación de fallo exacto.' },
          { title: 'Cotización',      desc: 'Si es capacitor: barato. Si requiere fuente nueva: costo de pieza separado.' },
          { title: 'Reparación',      desc: 'Soldadura de componentes nuevos o reemplazo de la fuente completa.' },
          { title: 'Stress test 24h', desc: 'Encendidos cada hora + carga máxima 24 horas continuas.' },
          { title: 'Entrega',         desc: 'Reporte de pruebas + garantía por escrito.' },
        ],
        commonProblems: [
          { problem: 'Consola no enciende (sin LED ni sonido)',     solution: 'Fuente caída. Test eléctrico determina si es reparable.' },
          { problem: 'Beep de error al encender',                   solution: 'Suele ser fuente entregando voltaje incorrecto. Reparación posible.' },
          { problem: 'Se reinicia sola al jugar',                   solution: 'Fuente que pierde carga bajo demanda. Reparación o reemplazo.' },
          { problem: 'Capacitores hinchados visibles',              solution: 'Cambio de capacitores. Es lo más común y barato de reparar.' },
        ],
        compatibleBrands: ['PlayStation 5', 'PS4 / Pro / Slim', 'Xbox Series X / S', 'Xbox One / X / S', 'Nintendo Switch (dock)'],
        faqs: [
          { question: '¿Cuánto cuesta reparar la fuente?',           answer: 'De <strong>$800 a $2,500 MXN</strong> según si es solo capacitor (barato) o fuente completa.' },
          { question: '¿Por qué se daña la fuente?',                  answer: 'Variaciones de voltaje (Cancún tiene picos), capacitores envejecidos, o líquido derramado.' },
          { question: '¿Vale la pena vs comprar nueva?',              answer: 'PS5 nueva: $12,000. Reparar fuente: $800-2,500. <strong>Siempre vale la pena</strong> si el resto funciona.' },
          { question: '¿Cuánto tarda?',                                answer: 'De 3 a 5 días incluyendo stress test 24h. No queremos entregarte algo que falle al día siguiente.' },
        ],
        relatedSlugs: ['hdmi', 'limpieza-interna', 'ventilacion', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación de Controles', href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Si también tienes drift.' },
        ],
      },

      // ─── Ventilación consola (extendida) ──────────────────────────────
      {
        slug: 'ventilacion',
        label: 'Cambio de ventilador',
        seoKeyword: 'Cambio de Ventilador y Reparación de Enfriamiento para Consolas PS5 y Xbox en Cancún',
        hook: '¿Tu consola suena como turbina de avión o se apaga a los 10 minutos por sobrecalentamiento? Reemplazamos el ventilador dañado por refacciones OEM originales. Adiós ruido, adiós apagones.',
        intro: 'Servicio experto en refrigeración de consolas en Cancún. Si el ventilador de tu PlayStation o Xbox presenta ruidos anómalos, está obstruido o dejó de girar, realizamos el cambio preciso para evitar la pérdida total del procesador.',
        bullets: ['Ventilador OEM (Original Equipment Manufacturer)', 'Análisis de ruido e impedancia', 'Limpieza profunda de disipadores', 'Reemplazo de metal líquido o pasta térmica', 'Garantía extendida por escrito'],
        fromPrice: '$700 MXN', eta: '24-72 h', warranty: '6 meses por escrito',
        whyUs: [
          { icon: 'fa-fan',                title: 'Refacciones Originales', desc: 'No instalamos ventiladores genéricos ruidosos. Usamos piezas Nidec o Delta, idénticas a las de fábrica para mantener el flujo de aire exacto.' },
          { icon: 'fa-microchip',          title: 'Protección al Procesador',desc: 'Un ventilador dañado quema tu APU. Nuestro servicio previene el fatal daño de "Luz Roja" o "Luz Azul" asegurando la refrigeración correcta.' },
          { icon: 'fa-spray-can-sparkles', title: 'Limpieza Nivel Quirúrgico',desc: 'Al desarmar la consola para cambiar el ventilador, te incluimos totalmente gratis la limpieza del sistema térmico, eliminando cuervos de polvo.' },
          { icon: 'fa-flask',              title: 'Nueva Pasta Térmica',    desc: 'Cerramos el ensamble aplicando pasta térmica premium (Arctic MX-4) o re-aplicando Metal Líquido en el caso de la PS5 para 0 Throttling.' },
        ],
        process: [
          { title: '1. Diagnóstico Térmico', desc: 'Sometemos la consola a estrés térmico midiendo RPM del ventilador y picos de temperatura del procesador.' },
          { title: '2. Cotización Transparente', desc: 'Confirmamos si el problema requiere un cambio de pieza o si los rodamientos solo necesitaban lubricación técnica. Cero cobros ocultos.' },
          { title: '3. Sustitución Segura', desc: 'Utilizando pulseras antiestáticas, retiramos el blindaje, cambiamos el ventilador y aplicamos la nueva transferencia térmica.' },
          { title: '4. Pruebas de Estrés',  desc: 'Validamos el flujo de aire jugando un título exigente durante 45 minutos continuos.' },
          { title: '5. Entrega y Garantía', desc: 'Te devolvemos una consola silenciosa como el primer día, con nuestro sello de garantía de 6 meses.' },
        ],
        educationalBlocks: [
          {
            eyebrow: 'Refrigeración Avanzada',
            title: 'Entendiendo el sistema de enfriamiento de tu consola',
            intro: 'A diferencia de las computadoras, las consolas modernas como la PlayStation 5 y Xbox Series X operan al límite térmico por diseño. El ventilador es el corazón de la supervivencia de la máquina.',
            imgSrc: '/assets/images/reparacion-controles-xbox.jpeg',
            imgAlt: 'Mantenimiento de sistema térmico PS5',
            reverse: false,
            points: [
              { icon: 'fa-bolt', title: 'Estrés Térmico (Throttling)', text: 'Cuando el ventilador falla, la consola reduce su velocidad (bajan los FPS) para no quemarse. Eventualmente, se apaga sola.' },
              { icon: 'fa-layer-group', title: 'Rodamientos Dañados', text: 'El sonido de "matraca" o clic rápido significa que los baleros magnéticos del ventilador perdieron su eje. No es reparable, requiere cambio.' },
              { icon: 'fa-droplet-slash', title: 'Evaporación de Pastas', text: 'Un ventilador lento hace que la pasta térmica y el metal líquido se degraden un 40% más rápido por exceso de calor.' }
            ]
          },
          {
            eyebrow: 'Prevención y Hábitos',
            title: '¿Por qué se dañan los ventiladores?',
            intro: 'Un reemplazo de ventilador no sirve de mucho si el entorno de juego sigue siendo el mismo. Aquí están los factores que más destruyen este componente.',
            imgSrc: '/assets/images/reparacion-mac-cancun.jpeg',
            imgAlt: 'Daños por polvo en consolas de videojuegos',
            reverse: true,
            points: [
              { icon: 'fa-dog', title: 'Pelos de Mascotas y Pelusa', text: 'El pelo de perros y gatos se enreda en el motor del ventilador, creando fricción que eventualmente quema el rotor magnético.' },
              { icon: 'fa-smoking', title: 'Humo y Humedad', text: 'Fumar cerca de la consola o la humedad de Cancún crea una costra pegajosa en las hélices que desbalancea el ventilador.' },
              { icon: 'fa-box-open', title: 'Falta de Flujo de Aire', text: 'Encerrar la consola dentro de un mueble obliga al ventilador a girar a máximas RPM constantes, agotando su vida útil en meses en lugar de años.' }
            ]
          }
        ],
        commonProblems: [
          { problem: 'Ruido metálico o zumbido insoportable (Ruido de Matraca)', solution: 'Desgaste severo en los rodamientos. Requiere sustitución inmediata del módulo del ventilador.' },
          { problem: 'Aviso de "Tu consola está demasiado caliente"',          solution: 'Fallo crítico de refrigeración. El ventilador no está extrayendo calor. Apaga la consola para evitar daños en la placa madre.' },
          { problem: 'Ventilador gira muy fuerte desde el primer segundo',     solution: 'Puede indicar un disipador bloqueado por polvo extremo, forzando al ventilador. Evaluaremos si necesita cambio o limpieza profunda.' },
          { problem: 'La consola enciende pero el ventilador no gira',         solution: 'Falla de alimentación en placa (Pines) o motor del ventilador quemado. Hacemos medición de voltaje para determinar.' },
        ],
        compatibleBrands: ['PlayStation 5', 'PlayStation 4 (Fat, Slim, Pro)', 'Xbox Series X / Series S', 'Xbox One (Fat, S, X)', 'Nintendo Switch (Lite, OLED)'],
        faqs: [
          { question: '¿Si cambio el ventilador pierdo los datos o mis juegos?',        answer: 'Absolutamente no. <strong>Tus partidas y cuentas están a salvo</strong>, el trabajo es meramente en el chasis térmico, no tocamos el almacenamiento.' },
          { question: '¿Mi ventilador puede ser reparado en vez de cambiado?',          answer: 'Normalmente no. Cuando el rodamiento de un ventilador se desgasta, no hay forma de re-centrarlo correctamente a las RPM que exige una consola.' },
          { question: '¿Instalan refacciones genéricas que suenan más fuerte?',         answer: 'De ninguna manera. Usamos exclusivamente repuestos <strong>Originales (Nidec, Delta o equivalentes OEM)</strong> para garantizar el silencio que la consola tenía cuando la compraste.' },
          { question: '¿Tienen los ventiladores en stock en Cancún?',                   answer: 'Tenemos el 80% de los ventiladores de consolas modernas en stock. Para modelos raros, el tiempo de importación es de 4 a 5 días hábiles.' },
        ],
        relatedSlugs: ['limpieza-interna', 'pasta-termica', 'fuente', 'reparacion-controles'],
        relatedExternal: [
          { label: 'Soporte vía WhatsApp', href: 'https://wa.me/message/MZNOMU6W34PBD1', icon: 'fa-whatsapp', desc: 'Envíanos un video o audio con el ruido de tu ventilador para una asesoría rápida.' },
        ],
      },

      // ─── Diagnóstico consola (extendida) ──────────────────────────────
      {
        slug: 'diagnostico',
        label: 'Diagnóstico',
        seoKeyword: 'Diagnóstico gratis de consolas en Cancún',
        hook: 'Tu PS5/Xbox/Switch tiene un problema y no entiendes qué es. Diagnóstico técnico real con reporte por escrito. GRATIS si reparas con nosotros.',
        intro: 'Revisión completa para identificar el problema sin costo. Te decimos exactamente qué tiene tu consola.',
        bullets: ['Test de encendido, video, audio, conectividad', 'Revisión térmica', 'Reporte por escrito con fotos', 'GRATIS si autorizas reparación', 'Sin compromiso'],
        fromPrice: 'GRATIS', eta: '1-2 h', warranty: 'Reporte por escrito',
        whyUs: [
          { icon: 'fa-magnifying-glass', title: 'Diagnóstico real',  desc: 'No "es la placa" sin pruebas. Test sistemático.' },
          { icon: 'fa-file-contract',    title: 'Reporte por escrito',desc: 'Por WhatsApp con fotos y explicación clara.' },
          { icon: 'fa-handshake',        title: 'Sin compromiso',     desc: 'Te decimos qué tiene; tú decides si reparas.' },
          { icon: 'fa-piggy-bank',       title: 'GRATIS al reparar',  desc: 'Si autorizas la reparación, el diagnóstico no se cobra.' },
        ],
        process: [
          { title: 'Recepción',     desc: 'Anotamos la falla reportada y datos de contacto.' },
          { title: 'Test eléctrico',desc: 'Verificamos fuente, voltajes y encendido con multímetro.' },
          { title: 'Test funcional',desc: 'Video, audio, lectura de disco, controles, conectividad.' },
          { title: 'Test térmico',  desc: 'Si la consola enciende, medimos temperaturas y comportamiento del ventilador.' },
          { title: 'Reporte',       desc: 'Por WhatsApp: qué tiene, qué cuesta arreglarlo, qué tan urgente es.' },
        ],
        commonProblems: [
          { problem: '"No sé qué tiene mi consola"',          solution: 'Para eso es el diagnóstico. Te decimos exactamente qué falla.' },
          { problem: 'Voy a comprar consola usada',           solution: 'Inspección pre-compra: $200 MXN, evita meterte en problemas.' },
          { problem: 'Otro técnico me dijo X — quiero 2da opinión', solution: 'Diagnóstico independiente sin presión de venta.' },
          { problem: '¿Conviene reparar o comprar nueva?',    solution: 'Diagnóstico + recomendación honesta. Casi siempre conviene reparar.' },
        ],
        compatibleBrands: ['Cualquier PlayStation', 'Cualquier Xbox', 'Cualquier Nintendo Switch', 'Consolas retro'],
        faqs: [
          { question: '¿Realmente es GRATIS?',                  answer: 'Sí, <strong>si autorizas la reparación con nosotros</strong>. Si no reparas, cobramos $200-300 por el tiempo invertido.' },
          { question: '¿Qué tan rápido?',                        answer: 'Normalmente <strong>1-2 horas</strong>. Si tenemos cola, máximo 24 h.' },
          { question: '¿Qué incluye el reporte?',               answer: 'Fallas detectadas (con fotos), causa probable, costo estimado, tiempo, y recomendación honesta.' },
          { question: '¿Hacen diagnóstico a domicilio?',        answer: 'Para consolas casi siempre recomendamos taller (mejor equipo). En Cancún hacemos visita con costo ($300).' },
        ],
        relatedSlugs: ['limpieza-interna', 'pasta-termica', 'hdmi', 'fuente'],
        relatedExternal: [
          { label: 'Reparación general',     href: '/reparaciones',         icon: 'fa-screwdriver-wrench', desc: 'Si ya sabes qué tiene tu consola.' },
          { label: 'Reparación de Controles',href: '/reparacion-controles', icon: 'fa-gamepad',             desc: 'Para joystick drift y fallas de control.' },
        ],
      },
    ],
  },
  {
    id: 'telefono',
    slug: 'telefono',
    title: 'Teléfono',
    icon: 'fa-mobile-screen-button',
    blurb: 'iPhone, Samsung y más',
    heroBg: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
    services: [
      { slug: 'reparacion-general',  label: 'Reparación General',     customUrl: '/reparaciones' },
      { slug: 'cambio-pantalla',     label: 'Cambio de pantalla',     intro: 'Reemplazo de pantalla completa para iPhone, Samsung, Xiaomi y más marcas.',                                  bullets: ['Pantalla original o calidad OEM', 'Calibración de touch y color', 'Garantía 3 meses', 'Mismo día en muchos modelos'],            fromPrice: '$1,200 MXN', eta: 'Mismo día' },
      { slug: 'cambio-bateria',      label: 'Cambio de batería',      intro: 'Recuperas autonomía completa con batería nueva certificada.',                                                bullets: ['Batería con celdas nuevas', 'Sello de impermeabilidad restaurado (iPhone)', 'Garantía 6 meses'],                                   fromPrice: '$700 MXN',   eta: 'Mismo día' },
      { slug: 'reparacion-carga',    label: 'Reparación de carga',    intro: 'Sustitución de puerto de carga lightning, USB-C o micro-USB. Solucionamos cargas intermitentes.',           bullets: ['Limpieza ultrasónica del puerto', 'Reemplazo de flex o conector', 'Prueba con cable original'],                                   fromPrice: '$450 MXN',   eta: '24-48 h' },
      { slug: 'reparacion-bocina',   label: 'Reparación de bocina',   intro: 'Bocina principal, auricular o vibrador. Si no escuchas o no te escuchan, lo arreglamos.',                  bullets: ['Limpieza o reemplazo de bocina', 'Prueba de llamada y multimedia', 'Garantía 3 meses'],                                          fromPrice: '$400 MXN',   eta: '24-48 h' },
      { slug: 'cambio-flex-botones', label: 'Cambio de flex / botones',intro: 'Botón de power, volumen, home o flex de carga rotos. Restauramos funcionalidad.',                          bullets: ['Flex con piezas certificadas', 'Sellado contra polvo', 'Prueba completa'],                                                          fromPrice: '$350 MXN',   eta: '24-48 h' },
        // 🌟 Liberación / Software (extendida) 🌟
        { 
          slug: 'liberacion-software', 
          label: 'Liberación / software',  
          seoKeyword: 'Liberación y software para celulares en Cancún',
          hook: '¿Tu equipo viene de otro país o red? ¿Olvidaste tu contraseña o se quedó en el logo? Lo solucionamos de forma rápida y 100% segura.',
          intro: 'Servicio especializado de software: liberación de red (Unlock), bypass, flasheo, actualización de iOS/Android y eliminación de cuentas.',                  
          bullets: ['Liberación por IMEI o caja', 'Restauración de sistema (Flasheo)', 'Backup previo si es posible', 'Garantía de no pérdida de IMEI'],                                    
          fromPrice: '$300 MXN',   eta: '1-3 h', warranty: 'Garantía por escrito',
          whyUs: [
            { icon: 'fa-lock-open',      title: 'Liberación permanente', desc: 'Desbloqueos de red oficiales por IMEI o servidor. Puedes actualizar sin perder la red.' },
            { icon: 'fa-shield-halved',  title: 'Cero riesgos',          desc: 'Usamos herramientas oficiales (Z3X, Octopus, Sigma, etc). No matamos equipos.' },
            { icon: 'fa-user-secret',    title: 'Privacidad total',      desc: 'Tus fotos, chats y cuentas están a salvo. Si hacemos bypass o flasheo, borramos datos de forma segura.' },
            { icon: 'fa-bolt',           title: 'Mismo día',             desc: 'El 90% de los trabajos de software quedan listos el mismo día.' },
          ],
          process: [
            { title: '1. Verificación de Estatus', desc: 'Checamos el IMEI en lista negra global (Blacklist) para confirmar viabilidad.' },
            { title: '2. Cotización y Método',     desc: 'Determinamos si requiere código, servidor, o caja de liberación y cotizamos.' },
            { title: '3. Ejecución Segura',        desc: 'Conectamos al servidor o herramienta especializada para aplicar el desbloqueo o flasheo.' },
            { title: '4. Pruebas y Entrega',       desc: 'Probamos señal con chips Telcel, AT&T y Movistar, y verificamos funciones.' },
          ],
          educationalBlocks: [
            {
              eyebrow: 'Cuidado y Rendimiento',
              title: '¿Cómo alargar la vida útil de tu nueva batería?',
              intro: 'Una vez instalada tu nueva batería, seguir estas recomendaciones de nuestros ingenieros garantizará que te dure años con excelente rendimiento.',
              imgSrc: '/assets/images/reparacion-mac-cancun.jpeg', // Fallback a una imagen de laptop reparandose
              imgAlt: 'Mantenimiento y cuidado de baterías en Cancún',
              reverse: false,
              points: [
                { icon: 'fa-plug-circle-check', title: 'Regla del 20-80', text: 'Intenta mantener la carga entre el 20% y el 80%. No dejes que baje a 0% con frecuencia, ya que estresa las celdas de litio.' },
                { icon: 'fa-temperature-low', title: 'Evita el calor extremo', text: 'No dejes tu laptop en el auto bajo el sol de Cancún. El calor degrada la química interna permanentemente.' },
                { icon: 'fa-calendar-check', title: 'Ciclos de calibración', text: 'Una vez al mes, cárgala al 100%, úsala hasta que se apague y recárgala al máximo. Esto mantiene al sistema calibrado.' }
              ]
            }
          ],
          commonProblems: [
            { problem: 'Equipo "Atrapado en el logo" (Bootloop)', solution: 'Flasheo de firmware oficial original para revivir el dispositivo.' },
            { problem: 'Red no disponible / SIM inválida',        solution: 'Liberación de red para uso con cualquier compañía telefónica.' },
            { problem: 'Olvidé mi PIN, Patrón o Contraseña',      solution: 'Hard reset + Bypass o eliminación de cuenta Google (FRP) o iCloud.' },
            { problem: 'Errores constantes de aplicaciones',      solution: 'Restauración profunda de fábrica y actualización a la última versión limpia.' },
          ],
          compatibleBrands: ['Apple / iPhone', 'Samsung Galaxy', 'Motorola', 'Xiaomi', 'Huawei', 'Oppo', 'Honor', 'ZTE'],
          faqs: [
            { question: '¿La liberación de red se pierde si actualizo mi celular?', answer: 'Si la liberación es de fábrica (por IMEI o servidor oficial), <strong>es permanente</strong> y puedes actualizar sin problema. Te avisaremos el método exacto antes de proceder.' },
            { question: '¿Pueden desbloquear un celular con reporte de robo (Blacklist)?', answer: 'Hacemos verificación previa. No realizamos trabajos que infrinjan normativas legales sobre equipos reportados por hurto o extravío.' },
            { question: '¿Se borran mis datos al hacer una liberación?', answer: 'Generalmente no. Para liberación de red los datos se conservan. Si el trabajo requiere un flasheo o Bypass (FRP), entonces sí se formatea el equipo.' },
            { question: '¿Cuánto tiempo tarda?', answer: 'La mayoría de cuentas Google o flasheos toman de 1 a 3 horas. Las liberaciones por código o servidor internacional pueden tardar desde 15 minutos hasta 5 días hábiles, dependiendo de la compañía original.' },
          ],
          relatedSlugs: ['reparacion-general', 'cambio-pantalla', 'cambio-bateria', 'diagnostico'],
          relatedExternal: [
            { label: 'Servicio en Laptops', href: '/servicios/laptop', icon: 'fa-laptop', desc: 'También reparamos laptops y MacBooks con problemas de software.' },
            { label: 'Visítanos', href: '/contacto', icon: 'fa-location-dot', desc: 'Ven a nuestra sucursal para una revisión rápida.' },
          ],
        },
      { slug: 'diagnostico',         label: 'Diagnóstico',            intro: 'Revisión completa para identificar fallas y cotizar sin compromiso.',                                       bullets: ['Test de pantalla, batería, carga, bocinas, cámaras', 'Reporte detallado', 'GRATIS si autorizas reparación'],                       fromPrice: 'GRATIS',      eta: '1 h' },
    ],
  },
  {
    id: 'impresora',
    slug: 'impresora',
    title: 'Impresora',
    icon: 'fa-print',
    blurb: 'Tinta, láser, multifunción',
    heroBg: 'linear-gradient(135deg, #115e59 0%, #14b8a6 100%)',
    services: [
      { slug: 'reparacion-general', label: 'Reparación General', customUrl: '/reparaciones' },
      { slug: 'mantenimiento',      label: 'Mantenimiento',                intro: 'Servicio integral preventivo: limpieza, lubricación y calibración de cabezales.',                       bullets: ['Calibración de cabezales', 'Limpieza de bandeja y rodillos', 'Test de impresión', 'Reporte de estado'], fromPrice: '$450 MXN', eta: '24-48 h' },
      { slug: 'limpieza-interna',   label: 'Limpieza interna',             intro: 'Polvo, restos de tinta seca y papel atorado: limpieza completa para evitar fallas.',                   bullets: ['Desarmado parcial', 'Limpieza con aire y solventes seguros', 'Lubricación de partes móviles'],         fromPrice: '$400 MXN', eta: 'Mismo día' },
      { slug: 'cambio-tinta-toner', label: 'Cambio de tinta / tóner',      intro: 'Recarga, instalación de cartuchos originales o sistema de tinta continua.',                            bullets: ['Tinta original o equivalente', 'Reseteo de chips si aplica', 'Prueba de impresión'],                    fromPrice: '$200 MXN + insumo', eta: 'Mismo día' },
      { slug: 'atascos',            label: 'Reparación de atascos',        intro: 'Papel atascado, sensores rotos o rodillos sucios — solucionamos para que vuelva a alimentar.',         bullets: ['Limpieza/sustitución de rodillos', 'Calibración de sensores', 'Test continuo 50 hojas'],                fromPrice: '$350 MXN', eta: '24-48 h' },
      { slug: 'rodillos',           label: 'Rodillos / alimentación',      intro: 'Rodillos gastados que ya no agarran el papel. Los cambiamos por nuevos.',                              bullets: ['Rodillos OEM', 'Limpieza del trayecto del papel', 'Garantía 3 meses'],                                    fromPrice: '$450 MXN', eta: '2-4 días' },
      { slug: 'conectividad',       label: 'Conectividad / configuración', intro: 'Configuramos tu impresora WiFi, Ethernet o USB en cualquier dispositivo.',                              bullets: ['Configuración WiFi / IP fija', 'Drivers en PC, Mac o móvil', 'Pruebas con cada dispositivo'],            fromPrice: '$250 MXN', eta: '1-2 h' },
      { slug: 'diagnostico',        label: 'Diagnóstico',                  intro: 'Revisamos qué tiene tu impresora y te damos cotización sin costo.',                                     bullets: ['Test eléctrico y mecánico', 'Revisión de cabezales y software', 'Reporte por escrito'],                  fromPrice: 'GRATIS',    eta: '1 h' },
    ],
  },
];

/** Helper para obtener una categoría por slug */
export function getCategory(slug: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((c) => c.slug === slug);
}

/** Helper para obtener un servicio dentro de una categoría */
export function getService(categorySlug: string, serviceSlug: string): { category: ServiceCategory; service: ServiceItem } | undefined {
  const category = getCategory(categorySlug);
  if (!category) return undefined;
  const service = category.services.find((s) => s.slug === serviceSlug);
  if (!service) return undefined;
  return { category, service };
}
