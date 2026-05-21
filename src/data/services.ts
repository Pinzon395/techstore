/**
 * Servicios  -  Single source of truth.
 * Lo consumen tanto Navbar3_0.astro como las landing pages dinámicas
 * /servicios/[categoria]/[servicio].
 *
 * Orden de categorías (Laptop primero porque es lo más vendido):
 *   Laptop → PC → Teléfono → Consola → Impresora
 *
 * Para agregar un nuevo subservicio: añade un objeto a `services[]` de
 * la categoría correspondiente. Astro generará la ruta automáticamente
 * y el navbar lo mostrará en el megamenú.
 *
 * PRECAUCION PRECAUCIÓN  -  REGLAS DE ESTE ARCHIVO:
 *
 * 1. RUTAS GENERADAS DINÁMICAMENTE:
 *    - Categorías: /servicios/{category.slug}  → [categoria]/index.astro
 *    - Subservicios: /servicios/{cat.slug}/{s.slug} → [categoria]/[servicio].astro
 *    Si cambias un 'slug' en este archivo, la URL cambia → enlaces rotos + pérdida SEO.
 *    Para renombrar un slug, añade un redirect 301 en astro.config.ts ANTES de cambiar.
 *
 * 2. customUrl  -  USO CORRECTO:
 *    Si un servicio ya tiene su propia página dedicada (ej. /reparaciones, /paquetes),
 *    usa customUrl para apuntar a ella. Esto hace que:
 *      a) El navbar enlace directamente a esa página en lugar de generar una nueva.
 *      b) [servicio].astro NO genera esa ruta (la omite en getStaticPaths).
 *      c) El hub de categoría (/servicios/laptop) la muestra como "Servicio dedicado".
 *
 * 3. RUTAS CON PÁGINAS ESTÁTICAS DEDICADAS (sobrescriben la dinámica):
 *    - /servicios/laptop/upgrade   → src/pages/servicios/laptop/upgrade.astro
 *    - /servicios/laptop/cambio-bateria → src/pages/servicios/laptop/cambio-bateria.astro
 *    Estas páginas tienen PRIORIDAD sobre [servicio].astro para esas rutas.
 *    Si agregas 'customUrl' a esos servicios en este archivo, el navbar
 *    ya no apuntará a /servicios/laptop/upgrade sino al customUrl.
 *
 * 4. SLUGS DUPLICADOS entre categorías están permitidos (cada uno tiene su propia
 *    ruta porque incluyen la categoría en la URL: /servicios/laptop/diagnostico
 *    vs /servicios/pc/diagnostico). Son páginas separadas con contexto diferente.
 *
 * 5. NAVBAR 3.0: Este archivo es la ÚNICA fuente de verdad para las rutas
 *    del megamenú de Navbar3_0.astro. No codifiques rutas manualmente allá.
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

  // --- Data extendida (opcional, solo en landings premium) ---
  /** Keyword H1 SEO específica si difiere del label */
  seoKeyword?: string;
  /** Subtítulo grande bajo el H1 (gancho emocional / problema que resuelve) */
  hook?: string;
  /** "Por qué nosotros"  -  4-6 cards */
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
  /** Imagen destacada para hero de upgrade u otros */
  featuredImage?: string;
  /** Imágenes por sección */
  sectionImages?: {
    whyUs?: string;
    process?: string;
    [key: string]: string | undefined;
  };
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

      // --- Cambio de pantalla (extendida 12 secciones) -------------------
      {
        slug: 'cambio-pantalla',
        label: 'Cambio de pantalla',
        seoKeyword: 'Cambio de pantalla de laptop en Cancún',
        hook: '¿Pantalla rota, con líneas, manchas, parpadeo o sin imagen? Diagnosticamos si la falla es panel, flex o video antes de cotizar.',
        intro: 'Reemplazo de display LCD, LED, FHD, táctil u OLED para laptops Windows y MacBook con piezas originales o equivalentes certificadas.',
        bullets: ['Diagnóstico previo gratis en Cancún', 'Panel original o equivalente certificado', 'Validación de flex, bisagras y tarjeta de video', 'Calibración de brillo, color y pixeles', 'Garantía 6 meses por escrito'],
        fromPrice: '$1,800 MXN', eta: '2-5 días', warranty: '6 meses por escrito',
        whyUs: [
          { icon: 'fa-shield-halved',     title: 'Pantalla certificada',   desc: 'Instalamos panel original o equivalente certificado; si es refurbished, te lo avisamos antes.' },
          { icon: 'fa-magnifying-glass',  title: 'Diagnóstico real',  desc: 'Confirmamos si el daño está en pantalla, flex de video, bisagra o tarjeta de video.' },
          { icon: 'fa-clock',             title: 'Entrega ágil',  desc: 'Modelos comunes de HP, Dell, Lenovo, Asus y Acer pueden resolverse en 24 a 48 horas si hay stock.' },
          { icon: 'fa-truck',             title: 'Servicio local en Cancún',  desc: 'Podemos coordinar recolección y entrega en zonas de Cancún según disponibilidad.' },
        ],
        process: [
          { title: 'Diagnóstico de pantalla',     desc: 'Revisamos panel, flex de video, bisagras, retroiluminación y salida a monitor externo para confirmar la falla real.' },
          { title: 'Cotización por modelo',      desc: 'Te enviamos por WhatsApp el costo exacto del panel compatible y la mano de obra antes de comprar la pieza.' },
          { title: 'Reemplazo controlado',       desc: 'Desarmamos el marco, retiramos el display dañado e instalamos el nuevo panel con adhesivo, conectores y tornillería correctos.' },
          { title: 'Prueba de imagen',     desc: 'Validamos brillo, color, pixeles muertos, parpadeos, apertura de tapa y video continuo antes de entregar.' },
          { title: 'Entrega con garantía',         desc: 'Te avisamos por WhatsApp y entregamos tu laptop con garantía por escrito sobre la pantalla instalada.' },
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
          { problem: 'Líneas verticales o de colores',         solution: 'Puede ser flex de video o panel. El diagnóstico define cuál pieza se cambia.' },
          { problem: 'Pantalla negra pero la laptop enciende', solution: 'Probamos monitor externo y retroiluminación para separar falla de pantalla, flex o video.' },
          { problem: 'Manchas, halos o píxeles muertos',       solution: 'Si son más de 5 pixeles muertos o manchas, se justifica el cambio.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Toshiba', 'MSI', 'Samsung', 'MacBook Pro', 'MacBook Air', 'Huawei', 'Xiaomi'],
        faqs: [
          { question: `¿Cuánto cuesta el cambio de pantalla de laptop en Cancún?`, answer: `El precio depende del modelo, tamaño, resolución, tipo de panel y disponibilidad. Un cambio estándar suele iniciar desde <strong>$1,800 MXN</strong>, pero primero confirmamos número de parte, conector, acabado y compatibilidad para evitar pedir una pantalla incorrecta.` },
          { question: `¿Cómo sé si necesito pantalla nueva o solo flex de video?`, answer: `Hacemos prueba con monitor externo, revisión de flex, bisagras, retroiluminación y comportamiento al mover la tapa. Si la imagen externa funciona bien, puede ser panel o flex; si también falla afuera, revisamos video o placa antes de cotizar pantalla.` },
          { question: `¿Cuánto tarda cambiar una pantalla de laptop?`, answer: `Si el panel está disponible para modelos comunes HP, Dell, Lenovo, Asus o Acer, normalmente toma <strong>24 a 48 horas</strong>. Modelos táctiles, MacBook, OLED o importados pueden tomar de <strong>3 a 7 días</strong>, según disponibilidad.` },
          { question: `¿La pantalla queda igual que la original?`, answer: `Buscamos el panel compatible correcto por resolución, conector, tamaño, acabado y tipo de montaje. Cuando existe opción original o equivalente certificada, te explicamos diferencia de precio y calidad antes de comprar la pieza.` },
          { question: `¿Qué garantía tiene la pantalla instalada?`, answer: `Entregamos <strong>6 meses de garantía por escrito</strong> sobre defecto del panel instalado y mano de obra. No aplica por golpes, presión en la tapa, humedad, derrames o manipulación externa después de entregar el equipo.` },
          { question: `¿Tienen recolección y entrega en Cancún?`, answer: `Sí, podemos coordinar recolección y entrega según zona y disponibilidad. La instalación se realiza en taller porque requiere cuidado con marco, flex, adhesivos, bisagras y pruebas de imagen antes de cerrar el equipo.` },
        ],
        relatedSlugs: ['cambio-bateria', 'cambio-teclado', 'pasta-termica', 'diagnostico'],
        relatedExternal: [
          { label: 'Limpieza por líquido derramado', href: '/limpieza-laptop-liquido', icon: 'fa-droplet', desc: 'Si tu laptop sufrió derrame, atender ambas cosas a la vez.' },
          { label: 'Paquetes de mantenimiento',     href: '/paquetes',                 icon: 'fa-box',     desc: 'Aprovecha el desarmado para limpieza completa.' },
        ],
        // --- NUEVAS SECCIONES para cambio-pantalla ------------------------
        trustStats: [
          { icon: 'fa-stethoscope', value: '100%', label: 'Diagnóstico de pantalla, flex y video' },
          { icon: 'fa-shield-halved', value: '6 meses', label: 'Garantía por escrito' },
          { icon: 'fa-truck', value: 'Local', label: 'Recolección en Cancún por zona' },
          { icon: 'fa-clock', value: '4 días', label: 'Entrega hábil si la pieza está en Cancún' },
        ],
        specialistTitle: 'Especialistas en cambio de pantalla de laptop en Cancún',
        specialistDesc: 'En Pixon PC verificamos modelo exacto, tamaño, resolución, tipo de conector, acabado del panel y compatibilidad antes de cotizar. Trabajamos con pantallas de calidad verificada para laptops Windows y MacBook, con garantía clara y pruebas de imagen antes de entregar.',
        specialistImage: '/assets/images/reparacion-mac-cancun.jpeg',
        screenTypes: [
          { label: 'HD (1366x768)', desc: 'Panel estándar para laptops de entrada y oficina' },
          { label: 'FHD (1920x1080)', desc: 'La resolución más común para laptop de trabajo, escuela y gaming' },
          { label: '4K UHD', desc: 'Paneles para laptops premium, diseño, edición y workstation' },
          { label: 'Táctil', desc: 'Pantallas con digitizer capacitivo y conector específico' },
          { label: 'OLED', desc: 'Paneles premium con alto contraste y colores intensos' },
        ],
        beforeAfter: {
          before: ['Pantalla rota o con fracturas', 'Manchas oscuras y halos de luz', 'Líneas verticales o píxeles muertos', 'Pantalla negra sin imagen'],
          after: ['Display nuevo con colores exactos de fábrica', 'Brillo y contraste calibrado al 100%', 'Sin líneas, sin pixeles y sin manchas', 'Tu laptop funcionando como nueva'],
        },
      },

      // --- Cambio de teclado (extendida) ----------------------------------
      {
        slug: 'cambio-teclado',
        label: 'Cambio de teclado',
        seoKeyword: 'Cambio de teclado de laptop en Cancún',
        hook: '¿Tu teclado no responde, escribe doble, tiene teclas pegadas o se mojó? Revisamos teclado, flex, conector y posible daño por líquido antes de cotizar.',
        intro: 'Servicio local de cambio y reparación de teclado de laptop en Cancún para HP, Dell, Lenovo, Asus, Acer, MSI y MacBook. Instalamos teclado español latino, US o retroiluminado según modelo, con prueba tecla por tecla y garantía por escrito.',
        bullets: ['Diagnóstico de teclado, flex, conector y placa', 'Teclado LA-ESP con Ñ, US o backlit según modelo', 'Prueba tecla por tecla antes de entregar', 'Garantía 3 meses por escrito', 'Cotización clara por WhatsApp'],
          fromPrice: '$1,550 MXN', eta: '24-72 h', warranty: '3 meses por escrito',
        whyUs: [
          { icon: 'fa-keyboard',     title: 'Distribución correcta', desc: 'Confirmamos si tu laptop usa teclado español latino con Ñ, US, retroiluminado o molde especial antes de pedir la pieza.' },
          { icon: 'fa-lightbulb',    title: 'Backlit respetado',     desc: 'Si tu equipo trae iluminación, buscamos teclado backlit compatible con su flex para conservar esa función.' },
          { icon: 'fa-shield-halved',title: 'Pieza compatible',      desc: 'Validamos número de parte, molde, idioma, conector, tornillería y palmrest para evitar adaptaciones improvisadas.' },
          { icon: 'fa-clock',        title: 'Entrega clara',         desc: 'Te decimos si hay stock en Cancún o si la pieza debe pedirse fuera. Sin prometer tiempos falsos.' },
          { icon: 'fa-file-shield',   title: 'Garantía por escrito',  desc: 'La garantía se entrega por escrito sobre la pieza instalada y la mano de obra correspondiente.' },
          { icon: 'fa-comment-dots', title: 'Comunicación por WhatsApp', desc: 'Te explicamos costo, tiempo y compatibilidad antes de autorizar la compra de refacción.' },
        ],
        process: [
          { title: '1. Diagnóstico',  desc: 'Probamos teclas, flex, conector, BIOS y señales de líquido para saber si conviene cambiar teclado o corregir otra falla.' },
          { title: '2. Cotización',   desc: 'Te mandamos por WhatsApp costo de pieza, mano de obra, distribución disponible y tiempo estimado antes de pedir refacción.' },
          { title: '3. Reemplazo',    desc: 'Desarmamos el equipo, retiramos teclado o palmrest según modelo e instalamos la pieza compatible sin forzar conectores.' },
          { title: '4. Prueba final', desc: 'Validamos tecla por tecla, atajos, retroiluminación, touchpad y encendido antes de entregarte la laptop.' },
        ],
        commonProblems: [
          { problem: 'Teclas que no responden o escriben doble',          solution: 'Revisamos matriz, flex y conector. Si el daño es del teclado, cotizamos pieza compatible; si es contacto o configuración, te lo decimos.' },
          { problem: 'Teclas pegadas por líquido o humedad',       solution: 'No basta con cambiar teclado. Revisamos corrosión en flex, conector y placa para evitar que el teclado nuevo vuelva a fallar.' },
          { problem: 'Letras borradas o distribución incorrecta',     solution: 'Instalamos teclado español latino con Ñ, US o el molde correcto según modelo. Validamos idioma antes de pedir la pieza.' },
          { problem: 'Backlit, flex o falla intermitente',   solution: 'Probamos retroiluminación, flex y conector. Si tu laptop usa teclado backlit, buscamos refacción compatible con esa función.' },
          { problem: 'Teclado escribe caracteres incorrectos', solution: 'Revisamos configuración, idioma del sistema, BIOS y teclado físico para confirmar si es falla de software o hardware.' },
          { problem: 'Algunas teclas funcionan y otras no', solution: 'Cuando solo falla una zona del teclado, puede tratarse de matriz dañada, humedad, flex flojo o desgaste interno.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Toshiba', 'MSI', 'MacBook Pro', 'MacBook Air'],
        faqs: [
          { question: `¿Cuánto cuesta cambiar el teclado de una laptop en Cancún?`, answer: `El cambio inicia desde <strong>$1,550 MXN</strong>, pero el precio final depende del modelo, distribución, retroiluminación, si viene integrado al palmrest y disponibilidad. Antes de cotizar revisamos número de parte, flex, conector y señales de líquido.` },
          { question: `¿Cuánto tarda el cambio de teclado de laptop?`, answer: `Si el teclado está disponible, normalmente toma de <strong>24 a 72 horas</strong>. En modelos especiales, MacBook o equipos con palmrest integrado, el tiempo puede cambiar porque primero confirmamos pieza, compatibilidad y forma de instalación.` },
          { question: `¿Se puede cambiar solo una tecla?`, answer: `Depende del modelo y del daño. A veces se puede revisar mecanismo o tecla suelta, pero si la matriz está dañada, hay líquido o varias teclas fallan, suele convenir reemplazar el teclado completo para que no regrese la falla.` },
          { question: `¿Tienen teclado español latino con Ñ o teclado US?`, answer: `Sí. Validamos si tu laptop requiere español latino con Ñ, distribución US, backlit o molde especial. También revisamos número de parte y flex para evitar instalar un teclado que no coincida con símbolos, tamaño o retroiluminación.` },
          { question: `¿Mi laptop necesita teclado nuevo o puede ser flex?`, answer: `Lo confirmamos con diagnóstico. Algunas fallas vienen de flex, conector flojo, humedad, BIOS, idioma del sistema o placa. Primero probamos zonas del teclado y conexión interna; si no requiere pieza nueva, te lo decimos.` },
          { question: `¿Cambian teclado de MacBook?`, answer: `Sí, revisamos MacBook Pro y MacBook Air según generación, distribución, top case y compatibilidad. En algunos modelos no se cambia solo el teclado; puede requerir top case completo o desmontaje más delicado, por eso confirmamos modelo exacto antes.` },
        ],
        relatedSlugs: ['cambio-pantalla', 'diagnostico', 'pasta-termica', 'cambio-bateria'],
        relatedExternal: [
          { label: 'Limpieza por líquido derramado', href: '/limpieza-laptop-liquido', icon: 'fa-droplet', desc: 'Si cayó agua, café o refresco, revisamos placa, flex y corrosión antes de instalar teclado nuevo.' },
          { label: 'Paquetes de mantenimiento',      href: '/paquetes',                icon: 'fa-box',     desc: 'Aprovecha que la laptop se abre para limpieza interna, ventilador y revisión térmica.' },
        ],
        trustStats: [
          { icon: 'fa-stethoscope', value: '100%', label: 'Revisión de teclado, flex y placa' },
          { icon: 'fa-keyboard', value: 'LA/US', label: 'Teclado según modelo' },
          { icon: 'fa-shield-halved', value: '3 meses', label: 'Garantía por escrito' },
          { icon: 'fa-clock', value: '24-72 h', label: 'Si la pieza está disponible' },
        ],
      },

      // --- Cambio de batería (extendida) ----------------------------------
      {
        slug: 'cambio-bateria',
        label: 'Cambio de batería',
        // PRECAUCION customUrl REQUERIDO: la página dedicada está en
        //   src/pages/servicios/laptop/cambio-bateria.astro
        //   (importa CambioBateriaView con diseño premium).
        //   Sin este customUrl, [servicio].astro genera un conflicto de ruta
        //   y la página dinámica gana con un título incorrecto.
        customUrl: '/servicios/laptop/cambio-bateria',
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
          { problem: 'Batería inflamada o hinchada',          solution: 'PELIGROSO. Apaga la laptop y tráela de inmediato  -  riesgo de daño a placa.' },
          { problem: 'Windows reporta "considere reemplazar"',solution: 'El sistema detectó desgaste >50%. Es buen momento para cambiar.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MSI', 'MacBook Pro', 'MacBook Air', 'Toshiba', 'Samsung'],
        faqs: [
          { question: `¿Cuánto cuesta cambiar la batería de mi laptop?`, answer: `Normalmente queda entre <strong>$950 y $2,800 MXN</strong>, dependiendo del modelo, capacidad, disponibilidad y si es una laptop premium o MacBook. Antes revisamos ciclos, desgaste, si está inflada y compatibilidad para no instalar una batería incorrecta.` },
          { question: `¿Cuánto dura una batería nueva?`, answer: `Una batería nueva suele durar <strong>3 a 5 años</strong> con uso normal. El calor de Cancún, descargas al 0% y temperaturas altas reducen su vida útil, por eso también revisamos ventilación interna si la laptop se calienta mucho.` },
          { question: `¿La batería nueva es original?`, answer: `Te explicamos si existe opción original del fabricante o equivalente certificada. Revisamos voltaje, conector, forma física y protección interna antes de instalar, porque una batería incorrecta puede dañar placa, carcasa o sistema de carga.` },
          { question: `¿Puedo seguir usando mi laptop conectada mientras espero?`, answer: `Puedes usarla conectada si solo dura poco, pero no si está inflada, se calienta demasiado o levanta touchpad/carcasa. En esos casos conviene apagarla y traerla al taller para evitar daño en placa, flex o teclado.` },
          { question: `?Reciclan mi batería vieja?`, answer: `Sí, retiramos la batería vieja y la manejamos como residuo especial sin costo adicional. No conviene tirarla a la basura común porque puede contaminar, calentarse o inflarse más con el tiempo.` },
        ],
        relatedSlugs: ['cambio-pantalla', 'cambio-teclado', 'pasta-termica', 'diagnostico'],
        relatedExternal: [
          { label: 'Optimización del Sistema', href: '/optimizacion', icon: 'fa-bolt',    desc: 'Una laptop optimizada gasta menos batería.' },
          { label: 'Mantenimiento Mac',         href: '/mantenimiento-mac', icon: 'fa-apple',  desc: 'Para MacBook hacemos servicio especializado.' },
        ],
      },

      { slug: 'reparacion-bisagras',  label: 'Reparación Bisagras',     customUrl: '/reparacion-bisagras', intro: 'Sustitución de bisagras flojas o rotas y refuerzo de carcasa agrietada.', bullets: ['Bisagras nuevas + tornillería', 'Reforzado de chasis', 'Prueba 100 ciclos apertura/cierre', 'Garantía 6 meses'], fromPrice: '$650 MXN', eta: '2-5 días' },
      { slug: 'mantenimiento-interno',label: 'Mantenimiento Preventivo',customUrl: '/paquetes' },

      // --- Cambio de pasta térmica (extendida) ----------------------------
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
          { question: `¿Cada cuánto debo cambiar la pasta térmica?`, answer: `En Cancún recomendamos cada <strong>18 a 24 meses</strong> por calor, humedad y polvo. Si usas la laptop para gaming, edición o render, puede convenir cada 12 a 18 meses. También revisamos ventilador y disipador.` },
          { question: `¿Qué pasta usan?`, answer: `Usamos pasta térmica premium tipo Arctic MX-4 o equivalente confiable según disponibilidad y equipo. Si el modelo requiere metal líquido o compuesto especial, lo cotizamos aparte porque exige aislamiento y aplicación precisa para no poner en riesgo la placa.` },
          { question: `¿Cuánto bajan las temperaturas?`, answer: `Depende del estado inicial, polvo y diseño del disipador. En equipos saturados es común ver mejoras de <strong>15 a 25°C</strong> bajo carga, pero lo validamos con prueba térmica antes y después. Si el problema es ventilador, te lo indicamos.` },
          { question: `¿Es seguro abrir mi laptop para esto?`, answer: `Sí, siempre que se use herramienta correcta y cuidado antiestático. Revisamos tornillería, flex, disipador y conectores para evitar daños. Si la carcasa está frágil o hay bisagras dañadas, te avisamos antes de forzar el desarmado.` },
          { question: `¿Vale la pena en una laptop vieja?`, answer: `Sí puede valer la pena si aún cumple tus necesidades. Bajar temperatura ayuda a evitar apagados, ruido y pérdida de rendimiento. También te decimos si conviene combinarlo con SSD, RAM o si el costo ya no justifica la inversión.` },
        ],
        relatedSlugs: ['cambio-bateria', 'upgrade', 'diagnostico'],
        relatedExternal: [
          { label: 'Mantenimiento Mac',         href: '/mantenimiento-mac',         icon: 'fa-apple',   desc: 'Servicio especializado para MacBook con metal líquido opcional.' },
          { label: 'Limpieza por líquido',     href: '/limpieza-laptop-liquido',   icon: 'fa-droplet', desc: 'Si tu laptop calienta tras un derrame, hay que atender ambas cosas.' },
          { label: 'Paquetes de mantenimiento', href: '/paquetes',                  icon: 'fa-box',     desc: 'Servicio recurrente con descuentos.' },
        ],
      },

      // --- Upgrade SSD / RAM (extendida) ----------------------------------
      {
        slug: 'upgrade',
        label: 'Upgrade SSD / RAM',
        // PRECAUCION customUrl REQUERIDO: la página dedicada está en
        //   src/pages/servicios/laptop/upgrade.astro
        //   (diseño premium con planes de upgrade y galeria).
        //   Sin este customUrl, [servicio].astro genera un conflicto de ruta.
        customUrl: '/servicios/laptop/upgrade',
        seoKeyword: 'Upgrade de SSD y RAM para laptop en Cancún',
        hook: 'Tu laptop puede ser hasta 5x más rápida. Migración a SSD NVMe + ampliación de RAM con clonado de tu Windows actual  -  sin perder NADA.',
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
          { question: `¿SSD o más RAM, qué da más mejora?`, answer: `Si el equipo usa disco duro mecánico, el SSD suele dar la mejora más visible: arranque, programas y respuesta general. Si ya tiene SSD pero se satura con varias pestañas o programas, la RAM puede ser el siguiente cuello de botella.` },
          { question: `¿Qué SSD recomiendan?`, answer: `Recomendamos SSD según compatibilidad y uso: SATA para equipos limitados, NVMe para modelos compatibles y opciones de mayor rendimiento para gaming o trabajo pesado. Validamos formato, generación, capacidad, temperatura y presupuesto antes de comprar.` },
          { question: `¿Pierdo mis programas y archivos?`, answer: `No, si el disco actual está sano podemos clonar Windows, programas, archivos y configuración al SSD nuevo. Antes hacemos respaldo y revisamos estado SMART del disco; si está dañado, puede convenir instalación limpia o recuperación.` },
          { question: `¿Cuánta RAM máxima soporta mi laptop?`, answer: `Depende del modelo, chipset, procesador y ranuras disponibles. Revisamos ficha técnica, módulos instalados y límite real de la placa. También confirmamos tipo de RAM y frecuencia para evitar inestabilidad o memoria no reconocida.` },
          { question: `¿Pueden migrar mi MacBook a SSD?`, answer: `Sí en MacBook Intel compatibles donde el SSD no está soldado. En Apple Silicon M1, M2 o M3 el almacenamiento viene integrado a placa y no se amplía de forma convencional. Te confirmamos por modelo antes de prometer upgrade.` },
          { question: `¿Cuánto cuesta el upgrade completo?`, answer: `La mano de obra inicia desde $800 MXN y las piezas se cotizan por separado según capacidad, marca y compatibilidad. Te damos opciones claras de SSD, RAM o ambos, explicando qué mejora notarás en tu uso real.` },
        ],
        relatedSlugs: ['cambio-bateria', 'pasta-termica', 'diagnostico'],
        relatedExternal: [
          { label: 'Optimización del Sistema',  href: '/optimizacion',          icon: 'fa-bolt',     desc: 'Tras el upgrade, optimización exprime aún más el equipo.' },
          { label: 'Instalación de Windows',     href: '/instalacion-windows',   icon: 'fa-windows',  desc: 'Si prefieres reinstalación limpia en lugar de clonado.' },
          { label: 'Ensambles PC Gamer',         href: '/ensambles',             icon: 'fa-microchip',desc: 'Si tu laptop ya no da para más, te armamos PC desde cero.' },
        ],
      },

      // --- Diagnóstico (extendida) ----------------------------------------
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
          { problem: 'Otro técnico me dijo X  -  quiero 2da opinión', solution: 'Te damos diagnóstico independiente sin presión de venta.' },
          { problem: 'Antes de comprar laptop usada quiero saber estado', solution: 'Inspección de equipo previo a compra: $200 MXN, te ahorra meterte en problemas.' },
          { problem: 'Quiero saber si vale la pena arreglar o comprar nueva', solution: 'Diagnóstico + recomendación honesta. Si la reparación supera 50% del valor, te decimos.' },
        ],
        compatibleBrands: ['Cualquier marca', 'Cualquier modelo', 'Cualquier antigüedad'],
        faqs: [
          { question: `¿Qué tan rápido me dan el diagnóstico?`, answer: `Normalmente entregamos diagnóstico en <strong>1 a 2 horas</strong> si la falla es evidente y hay disponibilidad. Cuando requiere pruebas de disco, memoria, temperatura, pantalla o placa puede tomar hasta 24 horas. Te avisamos por WhatsApp con hallazgos, costo y recomendación antes de reparar.` },
          { question: `¿El diagnóstico realmente es gratis?`, answer: `El diagnóstico se bonifica si autorizas la reparación con nosotros. Si decides no reparar o retirar el equipo, cobramos una cuota razonable por el tiempo técnico invertido. Así podemos hacer pruebas reales y darte una causa clara, no solo una opinión rápida.` },
          { question: `¿Qué incluye el reporte técnico?`, answer: `Incluye fallas detectadas, causa probable, evidencia cuando aplica, costo estimado, tiempo de reparación y recomendación honesta. Si el equipo no conviene repararlo por costo, antigüedad o riesgo, también te lo decimos antes de que inviertas de más.` },
          { question: `¿Qué pasa si descubren más fallas durante la revisión?`, answer: `Si aparece una falla adicional, detenemos el trabajo y te avisamos antes de cambiar piezas o aumentar costo. Tú decides qué se repara y qué se deja pendiente. No cerramos el equipo ni cobramos extras sin autorización previa.` },
          { question: `¿Hacen diagnóstico a domicilio en Cancún?`, answer: `Podemos hacer revisión a domicilio con costo de visita, pero los diagnósticos profundos conviene hacerlos en taller. Ahí tenemos multímetro, piezas de prueba, herramientas antiestáticas y condiciones para abrir el equipo sin riesgo.` },
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

      // --- Mantenimiento correctivo (extendida) -------------------------
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
          { problem: 'Ruidos del disco o ventilador',              solution: 'Disco mecánico próximo a fallar  -  migrar a SSD ya. Ventiladores se cambian.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'PCs ensambladas', 'Workstations', 'Servidores pequeños'],
        faqs: [
          { question: `¿Cuánto cuesta una reparación correctiva?`, answer: `La mano de obra inicia desde <strong>$650 MXN</strong>, pero el costo final depende de la falla y piezas necesarias. Primero diagnosticamos fuente, RAM, disco, GPU, placa y temperatura; después te enviamos cotización clara para autorizar.` },
          { question: `¿Y si el costo de la reparación es muy alto?`, answer: `Si el costo se acerca demasiado al valor real de la PC, te lo decimos antes de avanzar. A veces conviene cambiar solo una pieza, hacer upgrade o considerar otro equipo. La recomendación depende de edad, uso y disponibilidad de refacciones.` },
          { question: `¿Cuánto tarda una reparación correctiva?`, answer: `Suele tomar de <strong>24 a 72 horas</strong> si la pieza está disponible. Si hay que pedir componente, probar estabilidad o revisar fallas intermitentes, puede tomar más. Te damos tiempo estimado después del diagnóstico.` },
          { question: `¿Qué cubre la garantía?`, answer: `La garantía cubre la pieza reemplazada y la mano de obra relacionada con esa reparación durante el periodo indicado. No cubre componentes distintos que ya venían dañados, variaciones eléctricas, humedad, golpes o modificaciones externas posteriores.` },
        ],
        relatedSlugs: ['formateo', 'limpieza-profunda', 'upgrade', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación General',         href: '/reparaciones',   icon: 'fa-screwdriver-wrench', desc: 'Si ya tienes problemas con celular, laptop o PC.' },
          { label: 'Ensambles PC Gamer',         href: '/ensambles',      icon: 'fa-microchip',          desc: 'Si tu PC ya no da más, te armamos una nueva.' },
        ],
      },

      // --- Formateo (extendida) ----------------------------------------
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
          { question: `¿Pierdo mis archivos al formatear?`, answer: `No necesariamente. Antes de formatear respaldamos documentos, escritorio, descargas, fotos y carpetas importantes que nos indiques. Si el disco está dañado o Windows no permite acceso normal, primero te avisamos porque puede requerirse recuperación.` },
          { question: `¿Cuánto tarda el formateo de una PC?`, answer: `Normalmente tarda de <strong>2 a 4 horas</strong> en equipos con SSD y respaldo ligero. Si usa disco mecánico, tiene muchos archivos, requiere actualizaciones largas o drivers especiales, puede tomar más. Te damos tiempo real al revisar el equipo.` },
          { question: `¿Qué versión de Windows instalan?`, answer: `Instalamos Windows 10 o Windows 11 según compatibilidad, requisitos de seguridad y uso que le darás. No forzamos Windows 11 en equipos que trabajarán peor; si conviene Windows 10 por estabilidad o rendimiento, te lo explicamos.` },
          { question: `¿La licencia es legal?`, answer: `Sí. Si tu equipo ya tiene licencia digital, normalmente se reactiva al conectarse a internet. Si no cuenta con licencia válida, te orientamos para adquirir una opción legal; evitamos activadores dudosos que causen alertas.` },
          { question: `?Incluye paquetería de Office?`, answer: `Incluimos paquetería básica como navegador, lector PDF, compresor y alternativa tipo LibreOffice si la necesitas. Microsoft Office original se instala solo si cuentas con licencia o autorizas cotizarla, para evitar software pirata.` },
        ],
        relatedSlugs: ['mantenimiento-correctivo', 'limpieza-profunda', 'upgrade', 'diagnostico'],
        relatedExternal: [
          { label: 'Instalación de Windows',  href: '/instalacion-windows', icon: 'fa-windows', desc: 'Página dedicada con más opciones de licencia y versiones.' },
          { label: 'Optimización del Sistema',href: '/optimizacion',         icon: 'fa-bolt',    desc: 'Ya con Windows limpio, optimización avanzada exprime más.' },
        ],
      },

      { slug: 'instalacion-sistema',     label: 'Instalación de Windows',  customUrl: '/instalacion-windows' },

      // --- Upgrade RAM/SSD PC (extendida) ------------------------------
      {
        slug: 'upgrade',
        label: 'Upgrade RAM / SSD',
        seoKeyword: 'Upgrade de RAM y SSD para PC en Cancún',
        hook: 'Mejoramos tu PC sin cambiarla. Más RAM, SSD NVMe, o tarjeta gráfica nueva  -  con clonado de tu Windows actual y benchmark antes/después.',
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
          { question: `¿SSD o más RAM, qué da más mejora?`, answer: `Si tu PC usa disco duro mecánico, el SSD casi siempre da la mejora más grande. Si ya tiene SSD pero trabaja con muchas pestañas, juegos o programas pesados, la RAM puede ser prioridad. Revisamos uso real antes de recomendar.` },
          { question: `¿Pierdo mis programas?`, answer: `No, cuando el disco está sano podemos clonar el sistema actual para conservar programas, archivos, sesiones y configuración. Si detectamos errores en el disco o Windows está muy dañado, te explicamos si conviene clonación o instalación limpia.` },
          { question: `¿Qué SSD recomiendan?`, answer: `Recomendamos el SSD según tu placa, presupuesto y uso. Para oficina puede bastar un SATA o NVMe confiable; para gaming, edición o cargas pesadas conviene uno con mejor rendimiento sostenido. Validamos compatibilidad antes de comprar.` },
          { question: `¿Cuánta RAM máxima soporta mi PC?`, answer: `Depende del chipset, procesador, placa madre y ranuras disponibles. Revisamos modelo exacto, tipo de memoria, frecuencia y capacidad máxima estable. No instalamos RAM al azar porque puede provocar reinicios o memoria no detectada.` },
          { question: `¿Pueden poner GPU nueva?`, answer: `Sí, pero antes revisamos fuente de poder, espacio del gabinete, ranura PCIe, consumo, cuello de botella y ventilación. Una GPU nueva sin fuente adecuada o sin flujo de aire puede causar apagados o bajo rendimiento.` },
        ],
        relatedSlugs: ['formateo', 'mantenimiento-correctivo', 'limpieza-profunda', 'diagnostico'],
        relatedExternal: [
          { label: 'Ensambles PC Gamer',         href: '/ensambles',     icon: 'fa-microchip', desc: 'Si conviene armar PC nueva en lugar de actualizar.' },
          { label: 'Optimización del Sistema',   href: '/optimizacion',  icon: 'fa-bolt',      desc: 'Saca aún más provecho del hardware nuevo.' },
        ],
      },

      // --- Limpieza profunda PC (extendida) -----------------------------
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
          { problem: 'Olor extraño o quemado al encender',        solution: 'PARA YA. Tráela de inmediato  -  riesgo de daño a fuente o placa.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'PCs ensambladas', 'PCs gamer', 'Workstations'],
        faqs: [
          { question: `¿Cada cuánto necesito una limpieza profunda?`, answer: `En Cancún recomendamos cada <strong>12 a 18 meses</strong> por polvo, humedad y salitre. Si la PC está cerca de ventana, piso, mascotas o nunca se ha abierto, puede necesitarse antes para evitar temperaturas altas y ruido.` },
          { question: `¿Cuánto cuesta la limpieza profunda?`, answer: `La limpieza profunda inicia desde <strong>$600 MXN</strong>. Puede cambiar si requiere desmontaje complejo, pasta térmica especial, limpieza de fuente o tratamiento por sulfatación. Antes de hacer extras te mostramos el estado interno y cotizamos.` },
          { question: `¿Qué tanto bajan las temperaturas?`, answer: `En PCs muy sucias puede bajar de <strong>20 a 30°C</strong>; en casos moderados suele mejorar de 10 a 15°C. La cifra real depende de polvo, pasta térmica, flujo de aire y ventiladores, por eso comparamos antes/después.` },
          { question: `¿Es seguro abrir mi PC?`, answer: `Sí, se hace con pulsera antiestática, herramientas correctas y registro del cableado antes de desmontar. Revisamos conectores, ventiladores y tornillería para no forzar piezas. Si vemos humedad u óxido, te avisamos.` },
          { question: `¿Vale la pena en una PC vieja?`, answer: `Sí vale la pena si el equipo aún cumple su función. Una limpieza puede reducir calor, ruido y apagados, además de alargar la vida de fuente, placa y GPU. Si conviene más un upgrade, te lo diremos.` },
        ],
        relatedSlugs: ['formateo', 'mantenimiento-correctivo', 'upgrade', 'diagnostico'],
        relatedExternal: [
          { label: 'Paquetes de mantenimiento', href: '/paquetes',     icon: 'fa-box',     desc: 'Servicio recurrente con descuento.' },
          { label: 'Antisulfatación',           href: '/antisulfatacion', icon: 'fa-droplet-slash', desc: 'Si vives cerca del mar, atender corrosión también.' },
        ],
      },

      // --- Diagnóstico PC (extendida) ----------------------------------
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
          { problem: 'Otro técnico me dijo X  -  quiero 2da opinión', solution: 'Te damos diagnóstico independiente sin presión de venta.' },
          { problem: 'Voy a comprar una PC usada  -  quiero saber estado', solution: 'Inspección pre-compra: $200 MXN, te ahorra meterte en problemas.' },
          { problem: 'Conviene reparar o comprar nueva?',       solution: 'Diagnóstico + recomendación honesta. Si supera 50% del valor, te decimos.' },
        ],
        compatibleBrands: ['Cualquier marca', 'Cualquier modelo', 'Cualquier antigüedad'],
        faqs: [
          { question: `¿Qué tan rápido me dan el diagnóstico?`, answer: `Normalmente entregamos diagnóstico en <strong>1 a 2 horas</strong> si la falla es clara. Si hay que probar fuente, RAM, disco, GPU o temperaturas bajo carga, puede tomar hasta 24 horas. Te avisamos por WhatsApp.` },
          { question: `¿Es realmente gratis?`, answer: `Sí, se bonifica si autorizas la reparación con nosotros. Si decides no reparar, cobramos una cuota de revisión por el tiempo técnico invertido. Esto permite hacer pruebas reales y no solo una opinión rápida.` },
          { question: `¿Qué incluye el reporte?`, answer: `Incluye fallas detectadas, evidencia cuando aplica, causa probable, costo estimado, tiempo de reparación y recomendación honesta. Si la PC no conviene repararla por antigüedad, costo o disponibilidad de piezas, también te lo explicamos.` },
          { question: `?Hacen diagnóstico a domicilio?`, answer: `Podemos hacer visita en Cancún con costo, pero para diagnóstico profundo recomendamos taller. Ah? podemos medir voltajes, probar piezas, revisar temperatura y abrir el equipo con seguridad. A domicilio resolvemos casos simples.` },
        ],
        relatedSlugs: ['mantenimiento-correctivo', 'formateo', 'upgrade', 'limpieza-profunda'],
        relatedExternal: [
          { label: 'Reparación general',   href: '/reparaciones',  icon: 'fa-screwdriver-wrench', desc: 'Si ya sabes qué tiene, ve directo a reparar.' },
          { label: 'Paquetes de mantenimiento', href: '/paquetes', icon: 'fa-box',                desc: 'Servicio preventivo recurrente.' },
        ],
      },

      { slug: 'optimizacion',            label: 'Optimización del Sistema',customUrl: '/optimizacion' },
      { slug: 'antisulfatacion',         label: 'Antisulfatación',         customUrl: '/antisulfatacion' },
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

      // --- Limpieza interna consola (extendida) ------------------------
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
          { question: `¿Cada cuánto debo limpiar mi consola?`, answer: `En Cancún recomendamos limpieza cada <strong>12 a 18 meses</strong> por polvo, humedad y calor. Si juegas muchas horas, está cerca del piso, hay mascotas o el ventilador ya suena fuerte, conviene hacerlo antes para evitar apagados.` },
          { question: `¿Pierdo la garantía oficial?`, answer: `Si la consola aún tiene garantía oficial vigente, abrirla puede afectarla. Si ya venci?, no hay problema por realizar mantenimiento profesional. Antes de abrir revisamos modelo, sellos y síntoma para que decidas con información.` },
          { question: `¿Qué tanto baja el ruido?`, answer: `Cuando el ruido viene de polvo y temperatura, la limpieza puede reducirlo bastante porque el ventilador deja de trabajar al máximo. Si el ruido es mecánico, como zumbido o roce, puede requerir cambio de ventilador.` },
          { question: `¿Cuánto tarda la limpieza de consola?`, answer: `El mantenimiento normalmente toma de <strong>24 a 48 horas</strong>. Si encontramos ventilador dañado, pasta térmica degradada, metal líquido mal distribuido o piezas por pedir, puede tomar más. Te avisamos antes.` },
          { question: `¿Es seguro abrir mi PS5 o Xbox?`, answer: `Sí, usamos herramientas adecuadas para cada modelo y cuidamos flex, tornillos, clips y disipador. También revisamos humedad, polvo pegado o señales de sobrecalentamiento. No abrimos a la fuerza ni improvisamos.` },
        ],
        relatedSlugs: ['pasta-termica', 'ventilacion', 'fuente', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación de Controles',   href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Joystick drift, gatillos, botones  -  lo arreglamos.' },
          { label: 'Paquetes de mantenimiento', href: '/paquetes',             icon: 'fa-box',     desc: 'Servicio recurrente con descuento.' },
        ],
      },

      // --- Pasta térmica consola (extendida) ---------------------------
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
          { question: `¿Vale la pena cambiar la pasta térmica de mi consola?`, answer: `Sí vale la pena si tiene más de 2 años, se calienta, hace mucho ruido o se apaga al jugar. Cambiar pasta y limpiar disipador ayuda a proteger el APU. Si el problema viene de ventilador o fuente, te lo indicamos.` },
          { question: `¿Qué pasta usan?`, answer: `Usamos pasta premium tipo Arctic MX-4 o equivalente; en PS5 también revisamos si aplica metal líquido según modelo y estado. El metal líquido se cotiza aparte porque requiere aislamiento y manejo cuidadoso para evitar riesgo en placa.` },
          { question: `¿Cuánto bajan las temperaturas?`, answer: `La mejora puede estar entre <strong>15 y 25°C</strong> bajo carga cuando la pasta está seca o el disipador está sucio. La cifra real depende del modelo y estado interno, por eso revisamos ventilación antes de prometer resultados.` },
          { question: `¿Cuánto tarda el cambio de pasta en consola?`, answer: `El servicio normalmente toma de <strong>24 a 48 horas</strong>. Si requiere limpieza profunda adicional, revisión de ventilador, metal líquido o pruebas extendidas por apagados, puede tardar más. Te confirmamos al revisar la consola.` },
          { question: `¿Mi PS5 con sticker de garantía Sony puede abrirse?`, answer: `Si tu PS5 aún conserva garantía oficial vigente, abrirla puede afectarla. Si ya venció, el mantenimiento profesional no debería representar problema. Te explicamos el riesgo antes de abrir para que decidas si conviene hacerlo.` },
        ],
        relatedSlugs: ['limpieza-interna', 'ventilacion', 'fuente', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación de Controles',  href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Aprovecha visita para arreglar el control con drift.' },
          { label: 'Paquetes de mantenimiento',href: '/paquetes',             icon: 'fa-box',     desc: 'Plan anual con descuento.' },
        ],
      },

      // --- HDMI consola (extendida) -------------------------------------
      {
        slug: 'hdmi',
        label: 'Reparación de HDMI',
        seoKeyword: 'Reparación de puerto HDMI de consolas en Cancún',
        hook: 'Cambio de HDMI para PS5, PS4, Xbox y Nintendo Switch con diagnóstico técnico',
        intro: '¿Tu consola enciende pero no da imagen, parpadea, no detecta señal o tiene el puerto HDMI roto? Revisamos el puerto, pines, soldadura, placa e IC de video antes de cotizar la reparación.',
        bullets: ['Puerto HDMI doblado o roto', 'Consola enciende pero no da imagen', 'Imagen parpadea o se corta', 'Audio sin video', 'Pines dañados o flojos', 'Revisión de IC si aplica'],
        fromPrice: 'Cotización según diagnóstico', eta: '3-7 días según daño', warranty: 'Garantía por escrito',
        whyUs: [
          { icon: 'fa-magnifying-glass-chart', title: 'Diagnóstico antes de cambiar', desc: 'Revisamos puerto, pines, soldadura, placa y circuito de video antes de cotizar.' },
          { icon: 'fa-plug-circle-bolt', title: 'Cambio de puerto HDMI', desc: 'Reemplazamos el conector cuando está quebrado, flojo, doblado o con pines dañados.' },
          { icon: 'fa-tv', title: 'Prueba de video y audio', desc: 'Validamos señal, audio, resolución y estabilidad antes de entregar la consola.' },
          { icon: 'fa-shield-halved', title: 'Garantía por escrito', desc: 'La garantía aplica sobre el trabajo realizado y se entrega con condiciones claras.' },
        ],
        process: [],
        commonProblems: [
          { problem: 'PS5 o Xbox enciende pero no da imagen', solution: 'Si la consola prende, se escucha o prende el control, pero la pantalla no recibe señal, puede haber daño en el puerto HDMI o en la línea de video.' },
          { problem: 'Imagen entrecortada, parpadeos o líneas', solution: 'Cuando la señal aparece y desaparece, revisamos pines doblados, soldadura floja, cable, configuración de resolución y posible daño en placa.' },
          { problem: 'Puerto HDMI quebrado, flojo o doblado', solution: 'Si el conector está físico dañado, normalmente se reemplaza completo. No recomendamos enderezarlo porque puede volver a fallar o dañar la placa.' },
          { problem: 'Hay audio pero no video', solution: 'Puede estar fallando una línea específica del HDMI, el conector, soldadura o circuito de video. Se confirma con diagnóstico técnico.' },
          { problem: 'La consola no detecta la TV', solution: 'Revisamos puerto, cable, pantalla, configuración de salida de video y estado del conector antes de abrir la consola.' },
          { problem: 'El HDMI se dañó por jalón o caída', solution: 'Un golpe o jalón puede levantar pistas o dañar soldadura. En ese caso se revisa si solo requiere puerto nuevo o reparación a nivel placa.' },
        ],
        compatibleBrands: ['PlayStation 5', 'PS5 Slim', 'PS4 / Pro', 'Xbox Series X / S', 'Xbox One / X / S', 'Nintendo Switch (dock)'],
        faqs: [
          { question: `¿Cuánto cuesta reparar el puerto HDMI de una consola en Cancún?`, answer: `El costo depende del modelo de consola y del tipo de daño. No cuesta igual cambiar solo el puerto que reparar pistas, placa o IC de video. Primero diagnosticamos para darte cotización clara y evitar cambiar piezas innecesarias.` },
          { question: `¿Cuánto tarda la reparación de HDMI?`, answer: `Normalmente toma de <strong>3 a 7 días</strong> según modelo, disponibilidad y nivel de daño. Si solo es puerto HDMI puede ser más rápido; si hay pistas levantadas o IC afectado, te avisamos antes de continuar.` },
          { question: `¿Qué pasa si mi consola prende pero no da imagen?`, answer: `Puede ser puerto HDMI dañado, pines doblados, soldadura floja, cable, configuración de resolución o circuito de video. Revisamos señal, puerto y placa antes de cambiar piezas para evitar gastos innecesarios.` },
          { question: `¿Se puede reparar un puerto HDMI doblado?`, answer: `Cuando el puerto está doblado o flojo, lo más seguro suele ser reemplazarlo completo. Enderezarlo rara vez queda confiable y puede levantar pistas o dañar más la placa. Primero revisamos si el daño llegó a soldadura o líneas de video.` },
          { question: `¿Reparan HDMI de PS5 y Xbox Series?`, answer: `Sí, revisamos y reparamos HDMI en PS5, PS4, Xbox Series X, Series S y Xbox One. También revisamos Nintendo Switch cuando la falla se relaciona con salida de video, dock o señal.` },
          { question: `¿La reparación tiene garantía?`, answer: `Sí, cuenta con garantía por escrito sobre el trabajo realizado. La garantía no aplica si el puerto vuelve a dañarse por golpe, jalón, humedad o manipulación externa, pero sí cubre la intervención realizada bajo condiciones normales.` },
        ],
        relatedSlugs: ['fuente', 'ventilacion', 'diagnostico', 'limpieza-interna', 'pasta-termica'],
        relatedExternal: [
          { label: 'Reparación de controles', href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Si también tienes drift, botones fallando o problemas de conexión en el control.' },
          { label: 'Mantenimiento de consola', href: '/paquetes', icon: 'fa-box', desc: 'Limpieza interna, revisión térmica y mantenimiento preventivo para consolas de alto uso.' },
        ],
      },

      // --- Fuente consola (extendida) -----------------------------------
      {
        slug: 'fuente',
        label: 'Reparación de fuente',
        seoKeyword: 'Reparación de fuente de consolas en Cancún',
        hook: '¿Tu consola no enciende, beep de error o se reinicia sola? Suele ser la fuente. La reparamos a nivel componente.',
        intro: 'Consola que no enciende, beep de error o reinicios aleatorios  -  fuente de poder dañada. Reparación a nivel de placa.',
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
          { question: `¿Cuánto cuesta reparar la fuente?`, answer: `La reparación de fuente suele ir de <strong>$800 a $2,500 MXN</strong>, dependiendo del modelo y daño. No cuesta igual cambiar capacitores que reemplazar una fuente completa. Primero medimos voltajes y carga para cotizar claro.` },
          { question: `¿Por qué se daña la fuente?`, answer: `Puede dañarse por variaciones de voltaje, calor acumulado, capacitores envejecidos, humedad, salitre o derrames. En Cancún también influyen picos eléctricos y ambientes húmedos. Revisamos si el daño quedó en fuente o alcanzó placa.` },
          { question: `¿Vale la pena reparar la fuente en vez de comprar consola nueva?`, answer: `Si el resto de la consola está en buen estado, casi siempre conviene reparar la fuente frente a comprar una nueva. Aun as?, revisamos placa, encendido y consumo antes de recomendarlo, porque no tiene sentido si existe daño mayor.` },
          { question: `¿Cuánto tarda la reparación de fuente?`, answer: `Normalmente tarda de <strong>3 a 5 días</strong> porque hacemos diagnóstico eléctrico y pruebas de carga. No entregamos una fuente solo porque encienda; la dejamos trabajando bajo demanda para confirmar estabilidad al jugar.` },
        ],
        relatedSlugs: ['hdmi', 'limpieza-interna', 'ventilacion', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación de Controles', href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Si también tienes drift.' },
        ],
      },

      // --- Ventilación consola (extendida) ------------------------------
      {
        slug: 'ventilacion',
        label: 'Sobrecalentamiento',
        seoKeyword: 'Sobrecalentamiento de consola en Cancún',
        hook: '¿Tu PS5, Xbox, Nintendo Switch o consola portátil se calienta, suena fuerte o se apaga al jugar? Revisamos polvo, ventilador, disipador, pasta térmica, metal líquido en PS5 y flujo de aire antes de cotizar.',
        intro: 'Servicio técnico en Cancún para consolas con sobrecalentamiento, ruido de ventilador, apagados por temperatura o bajo rendimiento. Diagnosticamos la causa real antes de cambiar piezas.',
        bullets: ['Diagnóstico térmico de consola', 'Revisión de ventilador y disipador', 'Pasta térmica o metal líquido según modelo', 'Limpieza interna y flujo de aire', 'Garantía por escrito'],
        fromPrice: 'Desde $700 MXN', eta: '24-72 h', warranty: 'Garantía por escrito',
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
          { question: `¿Si cambio el ventilador pierdo los datos o mis juegos?`, answer: `No. El cambio de ventilador trabaja sobre el sistema térmico y no toca almacenamiento, cuentas ni partidas. Aun así, recomendamos tener datos sincronizados en la nube cuando sea posible, como buena práctica antes de cualquier servicio técnico.` },
          { question: `¿Mi ventilador puede repararse en vez de cambiarse?`, answer: `Normalmente no conviene repararlo. Cuando el rodamiento se desgasta, el ventilador pierde centro, hace ruido o no mantiene RPM estables. Podemos limpiarlo si solo está obstruido, pero si falla motor o rodamiento, se reemplaza.` },
          { question: `¿Instalan refacciones genéricas que suenan más fuerte?`, answer: `No instalamos piezas genéricas sin avisarte. Buscamos ventiladores OEM o equivalentes confiables, cuidando flujo de aire, conector, tamaño y nivel de ruido. Una pieza barata puede enfriar mal o provocar apagados.` },
          { question: `¿Tienen ventiladores en stock en Cancún?`, answer: `Tenemos stock frecuente para modelos comunes, pero depende de consola y versión. Si no está disponible en Cancún, te damos tiempo real de pedido antes de abrir o cobrar. También revisamos si el problema es ventilador o solo limpieza.` },
        ],
        relatedSlugs: ['limpieza-interna', 'pasta-termica', 'fuente', 'reparacion-controles'],
        relatedExternal: [
          { label: 'Soporte vía WhatsApp', href: 'https://wa.me/message/MZNOMU6W34PBD1', icon: 'fa-whatsapp', desc: 'Envíanos un video o audio con el ruido de tu ventilador para una asesoría rápida.' },
        ],
      },

      // --- Diagnóstico consola (extendida) ------------------------------
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
          { problem: 'Otro técnico me dijo X  -  quiero 2da opinión', solution: 'Diagnóstico independiente sin presión de venta.' },
          { problem: '¿Conviene reparar o comprar nueva?',    solution: 'Diagnóstico + recomendación honesta. Casi siempre conviene reparar.' },
        ],
        compatibleBrands: ['Cualquier PlayStation', 'Cualquier Xbox', 'Cualquier Nintendo Switch', 'Consolas retro'],
        faqs: [
          { question: `¿El diagnóstico de consola realmente es gratis?`, answer: `Sí, se bonifica si autorizas la reparación con nosotros. Si decides no reparar, cobramos una cuota de revisión por el tiempo técnico invertido. El objetivo es darte una causa real con pruebas, no solo decirte que cambies piezas.` },
          { question: `¿Qué tan rápido entregan el diagnóstico?`, answer: `Una revisión básica puede tomar de <strong>1 a 2 horas</strong>, pero fallas intermitentes, apagados o problemas de video pueden requerir pruebas más largas. Si hay cola de trabajo, normalmente queda dentro de 24 horas con reporte por WhatsApp.` },
          { question: `¿Qué incluye el reporte?`, answer: `Incluye síntoma confirmado, pruebas realizadas, causa probable, fotos si aplica, costo estimado, tiempo de reparación y recomendación honesta. Si conviene no reparar por costo o riesgo, también te lo decimos antes de que gastes.` },
          { question: `?Hacen diagnóstico a domicilio?`, answer: `Para consolas casi siempre recomendamos taller porque ah? podemos probar fuente, video, HDMI, temperatura y controles con mejor equipo. Podemos hacer visita en Cancún con costo para revisión inicial, pero abrir y reparar se hace con más seguridad en taller.` },
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
    title: 'Celular',
    icon: 'fa-mobile-screen-button',
    blurb: 'iPhone, Samsung y más',
    heroBg: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
    services: [
      { slug: 'reparacion-general',  label: 'Reparación General',     customUrl: '/reparaciones' },
      { slug: 'cambio-pantalla',     label: 'Cambio de pantalla',     intro: 'Reemplazo de pantalla completa para iPhone, Samsung, Xiaomi y más marcas.',                                  bullets: ['Pantalla original o calidad OEM', 'Calibración de touch y color', 'Garantía 3 meses', 'Mismo día en muchos modelos'],            fromPrice: '$1,200 MXN', eta: 'Mismo día' },
      { slug: 'cambio-bateria',      label: 'Cambio de batería',      intro: 'Recuperas autonomía completa con batería nueva certificada.',                                                bullets: ['Batería con celdas nuevas', 'Sello de impermeabilidad restaurado (iPhone)', 'Garantía 6 meses'],                                   fromPrice: '$700 MXN',   eta: 'Mismo día' },
      { slug: 'reparacion-carga',    label: 'Reparación de carga',    intro: 'Sustitución de puerto de carga lightning, USB-C o micro-USB. Solucionamos cargas intermitentes.',           bullets: ['Limpieza ultrasónica del puerto', 'Reemplazo de flex o conector', 'Prueba con cable original'],                                   fromPrice: '$450 MXN',   eta: '24-48 h' },
      { slug: 'reparacion-bocina',   label: 'Reparación de bocina', seoKeyword: 'Reparación de bocina de celular en Cancún', hook: 'Recupera llamadas claras, audio multimedia y volumen real sin cambiar piezas innecesarias.', intro: 'Reparamos fallas de audio en celulares: bocina principal, auricular de llamada, micrófono, vibrador, flex, rejilla obstruida o daño por humedad.', bullets: ['Diagnóstico de bocina, auricular y micrófono', 'Limpieza de rejilla o reemplazo si aplica', 'Prueba de llamada, grabación y multimedia', 'Garantía por escrito'], fromPrice: '$400 MXN', eta: '24-48 h', warranty: 'Garantía por escrito' },
      { slug: 'cambio-flex-botones', label: 'Cambio de flex / botones',intro: 'Botón de power, volumen, home o flex de carga rotos. Restauramos funcionalidad.',                          bullets: ['Flex con piezas certificadas', 'Sellado contra polvo', 'Prueba completa'],                                                          fromPrice: '$450 MXN',   eta: '24-48 h' },
        // ðŸŒŸ Liberación / Software (extendida) ðŸŒŸ
        { 
          slug: 'liberacion-software', 
          label: 'Liberación / software',  
          seoKeyword: 'Liberación y software para celulares en Cancún',
          hook: '¿Tu equipo viene de otro país o red? ¿Olvidaste tu contraseña o se quedó en el logo? Lo solucionamos de forma rápida y 100% segura.',
          intro: 'Servicio especializado de software: liberación de red (Unlock), bypass, flasheo, actualización de iOS/Android y eliminación de cuentas.',                  
          bullets: ['Liberación por IMEI o caja', 'Restauración de sistema (Flasheo)', 'Backup previo si es posible', 'Garantía de no pérdida de IMEI'],                                    
          fromPrice: '$650 MXN',   eta: '1-3 h', warranty: 'Garantía por escrito',
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
          { question: `¿La liberación de red se pierde si actualizo mi celular?`, answer: `Si la liberación es de fábrica, por IMEI o servidor oficial, suele ser permanente y puedes actualizar sin perder señal. Antes de trabajar te explicamos el método, riesgo y compatibilidad con tu compañía para que sepas qué esperar después de actualizar.` },
          { question: `¿Pueden desbloquear un celular con reporte de robo o blacklist?`, answer: `Hacemos verificación previa del estatus, pero no realizamos trabajos que infrinjan normativas legales sobre equipos reportados por robo, hurto o extravío. Si el problema es cuenta, red o software legítimo, te explicamos opciones permitidas.` },
          { question: `¿Se borran mis datos al hacer una liberación?`, answer: `Generalmente no se borran en una liberación de red, pero depende del método. Si requiere flasheo, bypass FRP o restauración profunda, sí puede formatearse. Antes de iniciar te avisamos si existe riesgo para fotos, chats, cuentas o archivos.` },
          { question: `¿Cuánto tiempo tarda?`, answer: `La mayoría de cuentas Google o flasheos toman de 1 a 3 horas. Las liberaciones por código o servidor internacional pueden tardar desde 15 minutos hasta 5 días hábiles, dependiendo de la compañía original y disponibilidad del servicio.` },
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
      { slug: 'mantenimiento',      label: 'Mantenimiento',                intro: 'Servicio integral preventivo: limpieza, lubricación y calibración de cabezales.',                       bullets: ['Calibración de cabezales', 'Limpieza de bandeja y rodillos', 'Test de impresión', 'Reporte de estado'], fromPrice: '$750 MXN', eta: '24-48 h' },
      {
        slug: 'cambio-tinta-toner',
        label: 'Cambio de tinta / tóner',
        seoKeyword: 'Cambio de tinta y tóner para impresoras en Cancún',
        hook: 'Recarga, instalación y prueba de impresión para que tu equipo vuelva a imprimir claro, limpio y sin manchas.',
        intro: 'Recarga, instalación de cartuchos originales o sistema de tinta continua.',
        bullets: ['Instalación de tinta, tóner o cartucho', 'Revisión de niveles y reconocimiento', 'Limpieza básica de cabezal si aplica', 'Reseteo de chip si aplica', 'Prueba de impresión'],
        fromPrice: '$650 MXN + insumo',
        eta: 'Mismo día',
        faqs: [
          { question: `¿Cuánto cuesta cambiar tinta o tóner en Cancún?`, answer: `La inversión inicia desde $650 MXN + insumo. El precio final depende del modelo de impresora, tipo de cartucho, tóner, tinta o sistema continuo. Antes de instalar revisamos compatibilidad y reconocimiento para evitar desperdiciar insumos.` },
          { question: `¿Cambian cartuchos originales y compatibles?`, answer: `Sí, instalamos cartuchos originales o compatibles según disponibilidad, pero primero validamos que el modelo los reconozca correctamente. También revisamos chip, contactos y configuración para evitar que compres un insumo que la impresora no acepte.` },
          { question: `¿Recargan tóner?`, answer: `Sí, dependiendo del cartucho, estado del tóner y desgaste de piezas internas. Primero revisamos si conviene recargar o reemplazar, porque un cartucho dañado puede provocar manchas, fugas o mala calidad aunque tenga tóner nuevo.` },
          { question: `¿Por qué mi impresora imprime con rayas?`, answer: `Puede deberse a tinta baja, cabezal tapado, cartucho dañado, mala calidad de tinta, tóner irregular o falta de mantenimiento. Revisamos patrón de impresión, niveles y estado del cabezal antes de recomendar cambio de insumo.` },
          { question: `¿Qué pasa si mi impresora no reconoce el cartucho?`, answer: `Revisamos chip, contactos, compatibilidad, instalación, firmware y configuración antes de recomendar comprar otro cartucho. A veces se corrige limpiando contactos o reinstalando correctamente; otras veces sí requiere insumo compatible distinto.` },
          { question: `¿Atienden impresoras para oficina o negocio?`, answer: `Sí, atendemos impresoras domásticas, escolares, de oficina y negocios en Cancún. En equipos de alto uso también revisamos volumen de impresión, tipo de insumo y mantenimiento preventivo para reducir atascos, manchas y fallas recurrentes.` },
        ],
        relatedSlugs: ['mantenimiento', 'atascos', 'conectividad', 'diagnostico'],
      },
      { slug: 'atascos',            label: 'Reparación de atascos',        intro: 'Papel atascado, sensores rotos o rodillos sucios  -  solucionamos para que vuelva a alimentar.',         bullets: ['Limpieza/sustitución de rodillos', 'Calibración de sensores', 'Test continuo 50 hojas'],                fromPrice: '$450 MXN', eta: '24-48 h' },
      { slug: 'rodillos',           label: 'Rodillos / alimentación',      intro: 'Rodillos gastados que ya no agarran el papel. Los cambiamos por nuevos.',                              bullets: ['Rodillos OEM', 'Limpieza del trayecto del papel', 'Garantía 3 meses'],                                    fromPrice: '$750 MXN', eta: '2-4 días' },
      { slug: 'conectividad',       label: 'Conectividad / configuración', intro: 'Configuramos tu impresora WiFi, Ethernet o USB en cualquier dispositivo.',                              bullets: ['Configuración WiFi / IP fija', 'Drivers en PC, Mac o móvil', 'Pruebas con cada dispositivo'],            fromPrice: '$550 MXN', eta: '1-2 h' },
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
