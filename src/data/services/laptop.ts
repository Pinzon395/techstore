import type { ServiceCategory } from './types';

const laptopBrandFaqs = (brand: string) => [
  { question: `¿Reparan laptops ${brand} en Cancún?`, answer: `Sí. Revisamos laptops ${brand} por modelo, síntoma y disponibilidad de piezas antes de cotizar pantalla, batería, teclado, carga, placa, SSD, RAM o mantenimiento.` },
  { question: `¿Cuánto cuesta reparar una laptop ${brand}?`, answer: 'Depende de la falla real, refacción y tiempo de diagnóstico. Primero confirmamos si conviene reparar, actualizar o detener la inversión.' },
  { question: '¿Mis archivos están seguros?', answer: 'En reparaciones físicas normales no borramos datos. Si el disco está en riesgo, priorizamos respaldo o recuperación antes de formatear.' },
  { question: '¿Atienden a domicilio en Cancún?', answer: 'Podemos coordinar recolección o visita según zona y tipo de falla. Para placa, pantalla, carga o humedad recomendamos taller.' },
  { question: '¿Dan garantía?', answer: 'Sí, por escrito sobre la reparación o pieza instalada, según condiciones del equipo y tipo de servicio.' },
];

const laptopBrandService = (slug: string, brand: string, models: string[]) => ({
  slug,
  label: `Reparación laptop ${brand}`,
  seoKeyword: `Reparación laptop ${brand} en Cancún`,
  hook: `Diagnóstico y reparación de laptops ${brand} que no encienden, se calientan, van lentas, no cargan, tienen pantalla rota, teclado fallando o daño por líquido.`,
  intro: `Servicio técnico ${brand} en Cancún con revisión por modelo para pantalla, batería, teclado, centro de carga, placa, SSD, RAM, ventilación y software.`,
  bullets: ['Diagnóstico por modelo exacto', 'Revisión de pantalla, carga, batería, teclado y placa', 'SSD/RAM y mantenimiento térmico si conviene', 'Garantía por escrito'],
  fromPrice: '$550 MXN',
  eta: '24-72 h',
  warranty: 'Garantía por escrito según reparación',
  whyUs: [
    { icon: 'fa-laptop-medical', title: 'Modelo exacto', desc: `Confirmamos serie, generación y compatibilidad de ${brand} antes de pedir piezas.` },
    { icon: 'fa-stethoscope', title: 'Diagnóstico real', desc: 'Separamos falla de cargador, batería, placa, pantalla, flex, Windows o almacenamiento.' },
    { icon: 'fa-microchip', title: 'Hardware y software', desc: 'Podemos resolver fallas físicas, Windows, drivers, rendimiento, SSD, RAM y temperatura.' },
    { icon: 'fa-location-dot', title: 'Servicio local Cancún', desc: 'Atendemos Centro, Zona Hotelera, Huayacán, Cumbres, Bonampak, Puerto Cancún y alrededores.' },
  ],
  process: [
    { title: 'Recepción y síntomas', desc: 'Registramos modelo, falla, cargador, golpes, líquidos, temperatura, ruido y reparaciones previas.' },
    { title: 'Pruebas por módulo', desc: 'Revisamos energía, carga, batería, pantalla, teclado, RAM, SSD/HDD, ventilador, Windows y placa.' },
    { title: 'Cotización clara', desc: 'Te explicamos causa probable, pieza, tiempo, garantía y si conviene reparar o actualizar.' },
    { title: 'Reparación y pruebas', desc: 'Validamos encendido, carga, rendimiento, temperatura, pantalla, teclado y estabilidad antes de entregar.' },
  ],
  commonProblems: [
    { problem: `${brand} no enciende o no carga`, solution: 'Probamos cargador, jack USB-C/DC, batería, consumo, placa y botón antes de cambiar piezas.' },
    { problem: 'Pantalla rota, negra o con líneas', solution: 'Revisamos panel, flex, bisagras y salida externa para cotizar la pieza correcta.' },
    { problem: 'Va lenta o se congela', solution: 'Evaluamos SSD, RAM, Windows, virus, temperatura y disco antes de recomendar upgrade.' },
    { problem: 'Se calienta o suena fuerte', solution: 'Revisamos ventilador, disipador, pasta térmica, polvo y temperatura bajo carga.' },
  ],
  compatibleBrands: models,
  faqs: laptopBrandFaqs(brand),
  relatedSlugs: ['diagnostico', 'cambio-pantalla', 'cambio-bateria', 'pasta-termica', 'upgrade'],
});

const laptopDataRecoveryService = {
  slug: 'recuperacion-datos',
  label: 'Recuperación de datos laptop',
  seoKeyword: 'Recuperación de datos de laptop en Cancún',
  hook: 'Rescatamos archivos de laptops que no prenden, Windows no inicia, disco duro hace ruido, SSD falla o hubo daño por líquido.',
  intro: 'Recuperación de documentos, fotos, trabajo y respaldos desde HDD, SSD, NVMe y laptops dañadas, priorizando no empeorar el medio.',
  bullets: ['Diagnóstico de HDD, SSD y NVMe', 'Respaldo antes de formatear', 'Extracción desde laptop que no enciende', 'Ruta clara según riesgo del disco'],
  fromPrice: '$650 MXN',
  eta: '24 h a 7 días',
  warranty: 'Reporte por escrito',
  whyUs: [
    { icon: 'fa-hard-drive', title: 'Datos primero', desc: 'No formateamos ni reinstalamos antes de revisar el estado del disco y tus archivos importantes.' },
    { icon: 'fa-triangle-exclamation', title: 'Riesgo controlado', desc: 'Si el disco hace ruido, se calienta o se desconecta, evitamos pruebas que lo deterioren.' },
    { icon: 'fa-file-shield', title: 'Respaldo ordenado', desc: 'Priorizamos documentos, escritorio, descargas, fotos, contabilidad, escuela y trabajo.' },
    { icon: 'fa-location-dot', title: 'Cancún local', desc: 'Atendemos equipos de oficina, estudiantes, hoteles, negocios y particulares en Cancún.' },
  ],
  process: [
    { title: 'Evaluación del medio', desc: 'Revisamos si es HDD, SSD SATA, NVMe, daño lógico, físico, líquido o falla de Windows.' },
    { title: 'Lectura segura', desc: 'Intentamos acceso controlado sin escribir sobre el disco ni forzar arranques innecesarios.' },
    { title: 'Respaldo prioritario', desc: 'Extraemos primero carpetas críticas y luego el resto según estado del medio.' },
    { title: 'Entrega y recomendación', desc: 'Entregamos archivos en medio externo y te explicamos si conviene cambiar disco, clonar o reinstalar.' },
  ],
  commonProblems: [
    { problem: 'Windows no inicia y necesito mis archivos', solution: 'Extraemos el disco o arrancamos entorno seguro para respaldar si el medio lo permite.' },
    { problem: 'Disco hace clic o ruido', solution: 'No conviene seguir encendiendo. Evaluamos riesgo y posibilidades antes de manipular.' },
    { problem: 'Laptop se mojó', solution: 'Primero estabilizamos placa y disco antes de energizar para proteger datos.' },
    { problem: 'Borré archivos importantes', solution: 'Evita guardar más datos. Revisamos posibilidades de recuperación lógica.' },
  ],
  compatibleBrands: ['HDD', 'SSD SATA', 'SSD NVMe', 'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MacBook'],
  faqs: [
    { question: '¿Se pueden recuperar archivos si la laptop no prende?', answer: 'Sí, muchas veces los datos están intactos aunque la laptop no encienda. Extraemos o revisamos el medio de almacenamiento antes de reparar.' },
    { question: '¿Qué hago si el disco hace ruido?', answer: 'Apaga la laptop y no insistas. Cada encendido puede empeorar el daño físico del disco.' },
    { question: '¿Recuperar datos borra información?', answer: 'No debería. El proceso busca leer y copiar, no escribir sobre el medio original.' },
    { question: '¿Cuánto tarda?', answer: 'Puede tomar desde 24 horas hasta varios días según daño, capacidad y estabilidad del disco.' },
    { question: '¿También cambian el disco después?', answer: 'Sí. Si el disco está fallando, podemos instalar SSD nuevo, clonar si es viable o reinstalar Windows.' },
  ],
  relatedSlugs: ['diagnostico', 'upgrade', 'limpieza-liquido', 'instalacion-windows'],
};

export const laptopCategory: ServiceCategory = {
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
            imgSrc: '/assets/images/responsive/reparacion-mac-cancun.webp',
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
        specialistImage: '/assets/images/responsive/reparacion-mac-cancun.webp',
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
            imgSrc: '/assets/images/responsive/reparacion-mac-cancun.webp',
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
      {
        slug: 'mantenimiento-preventivo',
        label: 'Mantenimiento preventivo',
        seoKeyword: 'Mantenimiento preventivo de laptop en Cancún',
        h1: 'Mantenimiento preventivo de laptop en Cancún',
        metaTitle: 'Mantenimiento de laptop en Cancún | Limpieza interna',
        metaDescription: 'Mantenimiento preventivo de laptop en Cancún desde $650 MXN: limpieza interna, revisión térmica, pasta térmica y diagnóstico. Garantía por escrito.',
        hook: 'Servicio preventivo para laptops en Cancún que se calientan, suenan fuerte, trabajan lento o llevan más de un año sin limpieza interna. Revisamos ventilación, pasta térmica, batería, disco y sistema antes de que la falla se vuelva cara.',
        intro: 'Limpieza interna, revisión térmica y pruebas de batería, disco, ventilador y sistema para laptops de trabajo, escuela, oficina y gaming en Cancún.',
        bullets: ['Limpieza interna de ventilador, disipador y carcasa', 'Revisión de pasta térmica y cambio si aplica', 'Prueba de temperatura antes y después', 'Revisión de batería, cargador, SSD/HDD y RAM', 'Reporte claro por WhatsApp con recomendaciones', 'Servicio local en Cancún Centro, Huayacán, Cumbres, Bonampak y Zona Hotelera'],
        fromPrice: '$650 MXN', eta: '24-48 h', warranty: '3 meses por escrito',
        featuredImage: '/assets/images/laptop-feliz-limpia.webp',
        sectionImages: {
          whyUs: '/assets/images/mantenimiento-pastaternima-thermalpads.webp',
          process: '/assets/images/laptop-gamer-rogstrix.webp',
        },
        trustStats: [
          { icon: 'fa-temperature-arrow-down', value: '12-18 meses', label: 'Frecuencia recomendada en Cancún' },
          { icon: 'fa-fan', value: 'Ventilación', label: 'Limpieza de ventilador y disipador' },
          { icon: 'fa-flask', value: 'Pasta térmica', label: 'Revisión y cambio si aplica' },
          { icon: 'fa-location-dot', value: 'Cancún', label: 'Servicio local con reporte' },
        ],
        whyUs: [
          { icon: 'fa-fan', title: 'Menos ruido y temperatura', desc: 'Retiramos polvo de ventilador y disipador para recuperar flujo de aire real.' },
          { icon: 'fa-temperature-arrow-down', title: 'Prevención térmica', desc: 'Revisamos si la pasta térmica ya está seca antes de que cause apagados o throttling.' },
          { icon: 'fa-hard-drive', title: 'Salud del equipo', desc: 'Validamos disco, RAM, batería y cargador para detectar desgaste antes de una falla mayor.' },
          { icon: 'fa-file-shield', title: 'Reporte útil', desc: 'Te decimos qué se hizo, qué conviene corregir y qué puede esperar.' },
        ],
        process: [
          { title: 'Recepción y síntomas', desc: 'Registramos modelo, uso, ruido, temperatura, batería y cualquier falla previa.' },
          { title: 'Diagnóstico preventivo', desc: 'Medimos temperaturas, salud de disco, batería, RAM, cargador y estado general.' },
          { title: 'Limpieza interna', desc: 'Abrimos con herramienta adecuada, limpiamos ventilador, disipador, rejillas y polvo acumulado.' },
          { title: 'Servicio térmico', desc: 'Revisamos pasta térmica y la reemplazamos si está seca o el equipo lo requiere.' },
          { title: 'Pruebas y reporte', desc: 'Probamos temperatura, arranque, carga, teclado, puertos y estabilidad antes de entregar.' },
        ],
        educationalBlocks: [
          {
            eyebrow: 'Limpieza interna de laptop en Cancún',
            title: 'Quitamos polvo de ventilador, disipador y rejillas sin improvisar',
            intro: 'En Cancún el polvo, la humedad y el calor saturan la ventilación más rápido. Abrimos el equipo con herramienta adecuada, limpiamos el flujo de aire y revisamos si el ventilador sigue trabajando bien.',
            imgSrc: '/assets/images/laptop-feliz-limpia.webp',
            imgAlt: 'Mantenimiento preventivo de laptop limpia en Cancún',
            points: [
              { icon: 'fa-fan', title: 'Ventilador y disipador', text: 'Retiramos polvo acumulado para que el aire vuelva a circular sin forzar el motor.' },
              { icon: 'fa-wind', title: 'Rejillas y carcasa', text: 'Limpiamos entradas y salidas de aire donde se forman tapones de polvo.' },
              { icon: 'fa-screwdriver-wrench', title: 'Desarmado correcto', text: 'Cuidamos flex, tornillos, clips, bisagras y conectores internos.' },
              { icon: 'fa-camera', title: 'Evidencia del servicio', text: 'Podemos enviarte fotos o reporte por WhatsApp con lo encontrado.' },
            ],
          },
          {
            eyebrow: 'Pasta térmica y temperatura',
            title: 'Revisión térmica para evitar apagados, lentitud y ruido excesivo',
            intro: 'No toda laptop necesita pasta nueva en cada visita, pero sí debe revisarse. Si está seca o el equipo trabaja caliente, limpiamos el compuesto viejo y aplicamos pasta adecuada para CPU/GPU según modelo.',
            imgSrc: '/assets/images/mantenimiento-pastaternima-thermalpads.webp',
            imgAlt: 'Cambio de pasta térmica de laptop durante mantenimiento preventivo',
            reverse: true,
            points: [
              { icon: 'fa-temperature-high', title: 'Temperatura antes/después', text: 'Comparamos comportamiento térmico para validar si el servicio realmente ayudó.' },
              { icon: 'fa-flask', title: 'Compuesto correcto', text: 'Usamos pasta térmica confiable y evitamos aplicaciones excesivas o de baja duración.' },
              { icon: 'fa-gauge-high', title: 'Rendimiento estable', text: 'Reducir calor ayuda a evitar throttling, apagados y ventilador al máximo.' },
              { icon: 'fa-triangle-exclamation', title: 'Alertas reales', text: 'Si el problema es ventilador, sensor o placa, te lo decimos antes de prometer limpieza milagrosa.' },
            ],
          },
          {
            eyebrow: 'Laptop de oficina, escuela y gaming',
            title: 'Mantenimiento preventivo para uso real en Cancún, no solo una soplada rápida',
            intro: 'El servicio cambia según el uso: una laptop escolar no acumula el mismo desgaste que una gamer ROG Strix, MSI, Alienware o una laptop de oficina encendida todo el día.',
            imgSrc: '/assets/images/laptop-gamer-rogstrix.webp',
            imgAlt: 'Laptop gamer ROG Strix para mantenimiento preventivo en Cancún',
            points: [
              { icon: 'fa-briefcase', title: 'Trabajo y oficina', text: 'Revisamos batería, cargador, disco, teclado, puertos y estabilidad diaria.' },
              { icon: 'fa-gamepad', title: 'Gaming y alto rendimiento', text: 'Ponemos atención a CPU, GPU, ventiladores, pasta térmica y temperaturas bajo carga.' },
              { icon: 'fa-graduation-cap', title: 'Escuela y universidad', text: 'Prevenimos fallas antes de clases, entregas, exámenes o viajes.' },
              { icon: 'fa-map-location-dot', title: 'Zonas de Cancún', text: 'Atendemos Cancún Centro, Cumbres, Huayacán, Bonampak, Puerto Cancún y alrededores.' },
            ],
          },
        ],
        commonProblems: [
          { problem: 'La laptop se calienta aunque no esté haciendo mucho', solution: 'Suele ser polvo en el disipador, pasta seca o ventilación bloqueada. El mantenimiento lo corrige antes de que se apague.' },
          { problem: 'Ventilador fuerte todo el tiempo', solution: 'Limpiamos el sistema de enfriamiento y revisamos si el ventilador está sano o requiere cambio.' },
          { problem: 'Equipo lento por temperatura', solution: 'Cuando el procesador se protege por calor, baja rendimiento. Medimos antes y después para validar mejora.' },
          { problem: 'Laptop de escuela o trabajo sin servicio por años', solution: 'El mantenimiento reduce riesgo de apagados, daño en batería, fallas de disco y reparaciones caras.' },
        ],
        beforeAfter: {
          before: ['Ventilador sonando fuerte aunque no haya programas pesados', 'Temperatura alta por polvo, pasta seca o rejillas bloqueadas', 'Arranque lento por disco, Windows saturado o falta de revisión', 'Riesgo de apagados en clases, trabajo, videollamadas o juegos'],
          after: ['Sistema de enfriamiento limpio y con mejor flujo de aire', 'Temperaturas revisadas con recomendación clara si requiere pasta o ventilador', 'Batería, cargador, RAM y disco revisados antes de fallas mayores', 'Reporte de mantenimiento con próximos pasos y garantía por escrito'],
        },
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Alienware', 'ROG Strix', 'MacBook Intel', 'Huawei', 'Samsung'],
        risks: [
          { icon: 'fa-temperature-high', title: 'No ignores calor constante', text: 'Si la laptop quema, se apaga o baja rendimiento, seguir usándola puede afectar batería, placa, ventilador o procesador.' },
          { icon: 'fa-bed', title: 'Evita cama, cobijas y almohadas', text: 'Superficies blandas bloquean la ventilación inferior y hacen que el polvo se compacte más rápido.' },
          { icon: 'fa-droplet', title: 'Humedad y salitre de Cancún', text: 'La humedad acelera corrosión y polvo pegado. Si hay manchas, olor o derrame, conviene diagnóstico antes de encenderla.' },
        ],
        warrantyPoints: [
          'Garantía por escrito sobre la intervención realizada y piezas instaladas cuando aplique.',
          'Reporte claro con limpieza, revisión térmica, estado de batería, disco, RAM y cargador.',
          'Si detectamos falla de ventilador, batería, cargador, disco o placa, se cotiza aparte antes de cambiar piezas.',
        ],
        faqs: [
          { question: `¿Cada cuánto conviene hacer mantenimiento preventivo a una laptop en Cancún?`, answer: `Recomendamos cada <strong>12 a 18 meses</strong> por calor, humedad y polvo. Si es laptop gamer, se usa en cama, viaja mucho o el ventilador ya suena fuerte, puede convenir antes.` },
          { question: `¿Incluye cambio de pasta térmica?`, answer: `Incluye revisión del estado térmico. Si la pasta está seca o el equipo lo requiere, se reemplaza con pasta adecuada y te lo confirmamos antes de cerrar el servicio.` },
          { question: `¿Se borra mi información?`, answer: `No. El mantenimiento preventivo trabaja sobre limpieza, ventilación y revisión del equipo. No borramos archivos ni reinstalamos Windows sin autorización.` },
          { question: `¿Cuánto tarda el mantenimiento?`, answer: `Normalmente toma de <strong>24 a 48 horas</strong>, según carga de trabajo, complejidad del desarmado y si requiere pruebas térmicas extendidas.` },
          { question: `¿También revisan batería y cargador?`, answer: `Sí. Revisamos salud de batería, carga, cargador, disco, RAM y temperatura para detectar señales de falla antes de que el equipo te deje tirado.` },
        ],
        relatedSlugs: ['pasta-termica', 'upgrade', 'diagnostico', 'cambio-bateria'],
        relatedExternal: [
          { label: 'Paquetes de mantenimiento', href: '/paquetes', icon: 'fa-box', desc: 'Si necesitas plan recurrente para varios equipos o mantenimiento programado.' },
          { label: 'Mantenimiento Mac', href: '/mantenimiento-mac', icon: 'fa-apple', desc: 'Servicio especializado para MacBook con procedimiento dedicado.' },
        ],
      },

      // --- Cambio de pasta térmica (extendida) ----------------------------
      {
        slug: 'pasta-termica',
        label: 'Sobrecalentamiento y pasta térmica',
        seoKeyword: 'Sobrecalentamiento y cambio de pasta térmica en Cancún',
        h1: 'Sobrecalentamiento y cambio de pasta térmica en Cancún',
        metaTitle: 'Sobrecalentamiento y pasta térmica en Cancún | Laptop y PC',
        metaDescription: 'Diagnóstico de sobrecalentamiento y cambio de pasta térmica para laptop y PC en Cancún. Limpieza, ventiladores, disipador, thermal pads y pruebas.',
        hook: 'Diagnóstico para laptop o PC que se calienta, hace ruido, baja rendimiento o se apaga. Revisamos la causa antes de cambiar pasta o piezas.',
        intro: 'Mantenimiento térmico para laptop y PC con revisión de temperatura, ventiladores, disipador, pasta térmica, thermal pads y flujo de aire.',
        bullets: ['Diagnóstico térmico inicial', 'Limpieza de disipadores y ventiladores', 'Pasta térmica compatible con el equipo', 'Prueba de estabilidad final'],
        fromPrice: '$550 MXN', eta: '24-48 h', warranty: '3 meses por escrito',
        whyUs: [
          { icon: 'fa-temperature-arrow-down', title: 'Medición térmica', desc: 'Comparamos el comportamiento antes y después sin prometer una cifra fija.' },
          { icon: 'fa-volume-low', title: 'Revisión de ruido', desc: 'Comprobamos si el ventilador está saturado, desgastado o trabajando por otra causa.' },
          { icon: 'fa-flask', title: 'Compuesto compatible', desc: 'Elegimos el material según el diseño y las necesidades reales del equipo.' },
          { icon: 'fa-chart-line', title: 'Prueba final', desc: 'Validamos temperatura, ventilación y estabilidad antes de entregar.' },
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
            imgSrc: '/assets/images/responsive/reparacion-mac-cancun.webp',
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
          { question: `¿Cuánto bajan las temperaturas?`, answer: `Depende del estado inicial, diseño térmico y causa real. Comparamos mediciones antes y después, pero no prometemos una cifra fija porque un ventilador, heatpipe, disipador o carga de software también pueden limitar el resultado.` },
          { question: `¿Es seguro abrir mi laptop para esto?`, answer: `Sí, siempre que se use herramienta correcta y cuidado antiestático. Revisamos tornillería, flex, disipador y conectores para evitar daños. Si la carcasa está frágil o hay bisagras dañadas, te avisamos antes de forzar el desarmado.` },
          { question: `¿Vale la pena en una laptop vieja?`, answer: `Sí puede valer la pena si aún cumple tus necesidades. Bajar temperatura ayuda a evitar apagados, ruido y pérdida de rendimiento. También te decimos si conviene combinarlo con SSD, RAM o si el costo ya no justifica la inversión.` },
        ],
        relatedSlugs: ['mantenimiento-preventivo', 'cambio-bateria', 'upgrade', 'diagnostico'],
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
        relatedSlugs: ['mantenimiento-preventivo', 'cambio-bateria', 'pasta-termica', 'diagnostico'],
        relatedExternal: [
          { label: 'Optimización del Sistema',   href: '/optimizacion',          icon: 'fa-bolt',     desc: 'Tras el upgrade, optimización exprime aún más el equipo.' },
          { label: 'Formateo y Windows',         href: '/servicios/laptop/formateo-windows-virus-cancun', icon: 'fa-windows', desc: 'Respaldo, reinstalación limpia, drivers y eliminación de virus.' },
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
        relatedSlugs: ['mantenimiento-preventivo', 'cambio-pantalla', 'cambio-teclado', 'cambio-bateria', 'pasta-termica', 'upgrade'],
        relatedExternal: [
          { label: 'Reparación general',       href: '/reparaciones',         icon: 'fa-screwdriver-wrench', desc: 'Si ya sabes qué tiene, ve directo a reparar.' },
          { label: 'Mantenimiento preventivo', href: '/servicios/laptop/mantenimiento-preventivo', icon: 'fa-screwdriver-wrench', desc: 'Si está sano pero quieres prevenir, servicio preventivo específico para laptop.' },
        ],
      },
      laptopBrandService('reparacion-hp', 'HP', ['HP Pavilion', 'HP Envy', 'HP Omen', 'HP Victus', 'HP EliteBook', 'HP ProBook']),
      laptopBrandService('reparacion-dell', 'Dell', ['Dell Inspiron', 'Dell Latitude', 'Dell XPS', 'Dell Vostro', 'Alienware', 'Dell Precision']),
      laptopBrandService('reparacion-lenovo', 'Lenovo', ['Lenovo IdeaPad', 'Lenovo ThinkPad', 'Lenovo Legion', 'Lenovo Yoga', 'Lenovo LOQ']),
      laptopDataRecoveryService,
      { slug: 'laptop-mojada', label: 'Laptop mojada', customUrl: '/servicios/laptop/laptop-mojada' },
      { slug: 'formateo-windows-virus-cancun', label: 'Formateo y Windows', customUrl: '/servicios/laptop/formateo-windows-virus-cancun' },
      { slug: 'optimizacion',         label: 'Optimización del Sistema',customUrl: '/optimizacion' },
      { slug: 'instalacion-windows',  label: 'Instalación de Windows',  customUrl: '/instalacion-windows' },
      { slug: 'mantenimiento-mac',    label: 'Mantenimiento Mac',       customUrl: '/mantenimiento-mac' },
      { slug: 'limpieza-liquido',     label: 'Limpieza por Líquido',    customUrl: '/limpieza-laptop-liquido' },
    ],
  };
