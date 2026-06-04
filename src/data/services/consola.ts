import type { ServiceCategory, ServiceItem } from './types';

const consoleProcess = [
  { title: 'Recepción y pruebas iniciales', desc: 'Registramos modelo, síntoma, historial de golpes, humedad, apagones, ruido, imagen y uso de controles.' },
  { title: 'Diagnóstico por sistema', desc: 'Revisamos energía, HDMI, video, almacenamiento, temperatura, ventilador, lector, controles y conectividad.' },
  { title: 'Apertura si aplica', desc: 'Inspeccionamos polvo, metal líquido o pasta, fuente, flex, puerto HDMI, placa y conectores internos.' },
  { title: 'Cotización clara', desc: 'Te explicamos causa probable, pieza, tiempo, garantía y riesgos antes de reparar.' },
  { title: 'Pruebas jugando', desc: 'Validamos encendido, imagen, sonido, temperatura, lectura, controles y estabilidad con carga real.' },
];

const consoleFaqs = (service: string) => [
  { question: `¿Cuánto cuesta ${service} en Cancún?`, answer: 'Depende del modelo, daño y disponibilidad de piezas. Primero diagnosticamos y te damos cotización clara antes de reparar.' },
  { question: '¿Cuánto tarda la reparación?', answer: 'Puede tomar de 24 horas a 7 días según falla, pieza y pruebas. HDMI, fuente, lector o placa pueden requerir más validación.' },
  { question: '¿Pierdo mis juegos o partidas?', answer: 'Una reparación física normalmente no borra datos. Si se requiere software, almacenamiento o restauración, te avisamos antes.' },
  { question: '¿Reparan PS5, Xbox y Nintendo Switch?', answer: 'Sí. Trabajamos PlayStation, Xbox, Nintendo Switch y consolas portátiles gamer según falla y disponibilidad.' },
  { question: '¿Conviene reparar o comprar otra consola?', answer: 'Te lo decimos después del diagnóstico, comparando costo, edad, daño, disponibilidad de pieza y riesgo de falla adicional.' },
  { question: '¿Dan garantía?', answer: 'Sí, por escrito sobre la reparación realizada. No cubre golpes, humedad posterior, apagones o manipulación externa.' },
];

const consoleClusterService = ({
  slug,
  label,
  keyword,
  hook,
  intro,
  bullets,
  problems,
  relatedSlugs,
}: {
  slug: string;
  label: string;
  keyword: string;
  hook: string;
  intro: string;
  bullets: string[];
  problems: { problem: string; solution: string }[];
  relatedSlugs: string[];
}): ServiceItem => ({
  slug,
  label,
  seoKeyword: keyword,
  hook,
  intro,
  bullets,
  fromPrice: '$650 MXN',
  eta: '24-72 h',
  warranty: 'Garantía por escrito según reparación',
  whyUs: [
    { icon: 'fa-gamepad', title: 'Diagnóstico gamer', desc: 'Revisamos encendido, HDMI, temperatura, lector, fuente, almacenamiento, red y controles con pruebas reales.' },
    { icon: 'fa-temperature-half', title: 'Clima Cancún', desc: 'Consideramos polvo, humedad, salitre, calor y muebles cerrados, causas comunes de fallas en consolas.' },
    { icon: 'fa-screwdriver-wrench', title: 'Reparación por módulo', desc: 'Separamos si conviene puerto, fuente, limpieza, lector, control, software o diagnóstico de placa.' },
    { icon: 'fa-shield-halved', title: 'Garantía clara', desc: 'Te damos condiciones por escrito antes de entregar y probamos la consola bajo carga.' },
  ],
  process: consoleProcess,
  commonProblems: problems,
  compatibleBrands: ['PlayStation 5', 'PS5 Slim', 'PlayStation 4', 'Xbox Series X', 'Xbox Series S', 'Xbox One', 'Nintendo Switch', 'Switch OLED', 'Switch Lite'],
  faqs: consoleFaqs(label.toLowerCase()),
  relatedSlugs,
});

const CONSOLE_CLUSTER_SERVICES: ServiceItem[] = [
  consoleClusterService({
    slug: 'reparacion-ps5',
    label: 'Reparación PS5',
    keyword: 'Reparación PS5 Cancún',
    hook: 'Diagnóstico para PS5 que no da imagen, se apaga, se calienta, no lee discos, falla HDMI, fuente o metal líquido.',
    intro: 'Servicio técnico PS5 en Cancún con revisión de HDMI, fuente, ventilación, metal líquido, lector, almacenamiento, controles y software.',
    bullets: ['PS5 Fat y PS5 Slim', 'HDMI, fuente, lector y temperatura', 'Revisión de metal líquido', 'Prueba con juego antes de entregar'],
    problems: [
      { problem: 'PS5 no da imagen', solution: 'Revisamos HDMI, cable, resolución, puerto, soldadura e IC de video.' },
      { problem: 'PS5 se apaga al jugar', solution: 'Puede ser temperatura, metal líquido, fuente o placa; se prueba bajo carga.' },
      { problem: 'PS5 suena fuerte', solution: 'Se revisa polvo, ventilador, disipador y flujo de aire.' },
      { problem: 'No lee discos', solution: 'Probamos lector, lente, mecanismo, flex y software.' },
    ],
    relatedSlugs: ['cambio-hdmi-ps5', 'ps5-se-apaga', 'limpieza-metal-liquido-ps5', 'lector-disco'],
  }),
  consoleClusterService({
    slug: 'reparacion-xbox',
    label: 'Reparación Xbox',
    keyword: 'Reparación Xbox Cancún',
    hook: 'Reparamos Xbox Series X/S y Xbox One con fallas de encendido, HDMI, fuente, temperatura, disco, control o red.',
    intro: 'Servicio técnico Xbox en Cancún para consola sin imagen, se apaga, no prende, no conecta control, no lee juegos o se calienta.',
    bullets: ['Xbox Series X/S y Xbox One', 'HDMI, fuente y ventilación', 'Prueba de red, control y almacenamiento', 'Garantía por escrito'],
    problems: [
      { problem: 'Xbox no enciende', solution: 'Probamos fuente, botón, placa, consumo y cableado.' },
      { problem: 'Xbox no da imagen', solution: 'Revisamos HDMI, cable, puerto, resolución y circuito de video.' },
      { problem: 'Se apaga al jugar', solution: 'Puede ser fuente, temperatura o ventilación; hacemos prueba bajo carga.' },
      { problem: 'Control no conecta', solution: 'Revisamos sincronización, Bluetooth/radio, puerto, software y control.' },
    ],
    relatedSlugs: ['no-enciende', 'no-da-imagen', 'fuente', 'limpieza-interna'],
  }),
  consoleClusterService({
    slug: 'reparacion-nintendo-switch',
    label: 'Reparación Nintendo Switch',
    keyword: 'Reparación Nintendo Switch Cancún',
    hook: 'Diagnóstico para Switch, Switch OLED o Lite con pantalla, carga, joy-con, dock, ventilador, batería, lector o humedad.',
    intro: 'Servicio técnico Nintendo Switch en Cancún revisando carga USB-C, batería, pantalla, ventilador, joy-con, dock, lector y software.',
    bullets: ['Switch, OLED y Lite', 'Carga USB-C, pantalla y batería', 'Joy-Con, dock y ventilador', 'Revisión por humedad'],
    problems: [
      { problem: 'Switch no carga', solution: 'Revisamos USB-C, batería, cargador, dock, flex y placa.' },
      { problem: 'No da imagen en TV', solution: 'Probamos dock, cable, puerto USB-C, HDMI y configuración.' },
      { problem: 'Joy-Con drift', solution: 'Revisamos joystick, rieles, flex y calibración.' },
      { problem: 'Se calienta o se apaga', solution: 'Revisamos ventilador, pasta, polvo y batería.' },
    ],
    relatedSlugs: ['controles-drift', 'no-da-imagen', 'limpieza-interna', 'diagnostico'],
  }),
  consoleClusterService({
    slug: 'no-enciende',
    label: 'Consola no enciende',
    keyword: 'Consola no enciende Cancún',
    hook: 'Diagnóstico para PS5, Xbox o Switch que no prende, no da luz, hace beep, se apaga al instante o falló después de apagón.',
    intro: 'Revisamos fuente, cable, botón, consumo, placa, batería, cargador, corto y daño por humedad antes de cotizar.',
    bullets: ['Prueba de fuente y consumo', 'Revisión de botón y placa', 'Diagnóstico por apagón o humedad', 'Cotización antes de reparar'],
    problems: [
      { problem: 'No enciende nada', solution: 'Probamos cable, fuente, consumo, fusibles y corto.' },
      { problem: 'Hace beep pero no prende', solution: 'Puede ser fuente, placa, botón o protección por corto.' },
      { problem: 'Se apaga al instante', solution: 'Se revisa fuente, temperatura, placa y consumo bajo carga.' },
      { problem: 'Falló después de apagón', solution: 'Revisamos fuente, capacitores y daño en alimentación.' },
    ],
    relatedSlugs: ['fuente', 'diagnostico', 'limpieza-interna', 'reparacion-ps5'],
  }),
  consoleClusterService({
    slug: 'no-da-imagen',
    label: 'Consola no da imagen',
    keyword: 'PS5 no da imagen',
    hook: 'Solución para consola que prende pero no da video, parpadea, muestra pantalla negra, no detecta HDMI o solo da audio.',
    intro: 'Diagnóstico de video para PS5, Xbox, PS4 y Switch revisando HDMI, cable, resolución, puerto, soldadura y circuito de imagen.',
    bullets: ['Prueba con cable y pantalla', 'Revisión de puerto HDMI', 'Diagnóstico de señal y resolución', 'Cotización de puerto o placa'],
    problems: [
      { problem: 'Prende pero pantalla negra', solution: 'Revisamos HDMI, resolución, cable, TV, puerto e IC de video.' },
      { problem: 'Imagen se corta', solution: 'Puede ser soldadura, pines, cable, puerto flojo o circuito de video.' },
      { problem: 'Solo audio sin video', solution: 'Revisamos líneas de HDMI y configuración de salida.' },
      { problem: 'Puerto HDMI flojo', solution: 'Normalmente requiere cambio de conector y revisión de pistas.' },
    ],
    relatedSlugs: ['hdmi', 'cambio-hdmi-ps5', 'diagnostico', 'reparacion-xbox'],
  }),
  consoleClusterService({
    slug: 'cambio-hdmi-ps5',
    label: 'Cambio HDMI PS5',
    keyword: 'Cambio HDMI PS5 Cancún',
    hook: 'Cambio de puerto HDMI PS5 para consola sin imagen, puerto roto, pines doblados, señal intermitente o daño por jalón.',
    intro: 'Reparación HDMI PS5 en Cancún con diagnóstico de puerto, soldadura, pistas, señal, audio/video y pruebas de estabilidad.',
    bullets: ['Puerto HDMI PS5 Fat/Slim', 'Revisión de pistas e IC', 'Soldadura profesional', 'Prueba de video y audio'],
    problems: [
      { problem: 'Puerto HDMI roto', solution: 'Se reemplaza el conector y se revisan pistas levantadas.' },
      { problem: 'PS5 prende sin imagen', solution: 'Probamos HDMI, cable, resolución, puerto y circuito de video.' },
      { problem: 'Imagen parpadea', solution: 'Puede ser soldadura floja, pines dañados o cable.' },
      { problem: 'Se dañó por jalón', solution: 'Revisamos si el daño llegó a placa antes de cotizar.' },
    ],
    relatedSlugs: ['reparacion-ps5', 'no-da-imagen', 'hdmi', 'diagnostico'],
  }),
  consoleClusterService({
    slug: 'ps5-se-apaga',
    label: 'PS5 se apaga',
    keyword: 'PS5 se apaga sola Cancún',
    hook: 'Diagnóstico para PS5 que se apaga al jugar, con juegos pesados, por temperatura, fuente, metal líquido o polvo interno.',
    intro: 'Revisamos PS5 que se apaga sola en Cancún con pruebas de temperatura, fuente, metal líquido, ventilador, disipador y consumo.',
    bullets: ['Prueba con juego exigente', 'Revisión de metal líquido', 'Diagnóstico de fuente y temperatura', 'Limpieza y garantía'],
    problems: [
      { problem: 'Se apaga solo en juegos PS5', solution: 'Puede ser temperatura, metal líquido desplazado, fuente o consumo bajo carga.' },
      { problem: 'No avisa temperatura', solution: 'A veces la fuente falla sin aviso térmico; se prueba por consumo.' },
      { problem: 'Ventilador suena fuerte', solution: 'Revisamos polvo, disipador y ventilador.' },
      { problem: 'Está en mueble cerrado', solution: 'El flujo de aire puede causar apagados por acumulación de calor.' },
    ],
    relatedSlugs: ['limpieza-metal-liquido-ps5', 'fuente', 'limpieza-interna', 'diagnostico'],
  }),
  consoleClusterService({
    slug: 'lector-disco',
    label: 'Lector de disco',
    keyword: 'Reparación lector disco consola Cancún',
    hook: 'Reparamos consolas que no leen discos, expulsan disco, hacen ruido, no jalan el disco o marcan error al instalar juegos físicos.',
    intro: 'Diagnóstico de lector de disco para PS5, PS4, Xbox y otras consolas revisando lente, mecanismo, motor, flex y software.',
    bullets: ['Prueba con varios discos', 'Revisión de lente y mecanismo', 'Flex, motor y sensores', 'Cotización antes de pieza'],
    problems: [
      { problem: 'No lee ningún disco', solution: 'Revisamos lente, motor, flex, sensores y limpieza.' },
      { problem: 'Hace ruido al insertar', solution: 'Puede ser mecanismo, engrane, motor o disco atorado.' },
      { problem: 'Lee algunos juegos y otros no', solution: 'Probamos lente, suciedad, rayones, región y estado del lector.' },
      { problem: 'No jala el disco', solution: 'Se revisa motor, sensor, mecanismo y alimentación.' },
    ],
    relatedSlugs: ['reparacion-ps5', 'diagnostico', 'limpieza-interna', 'fuente'],
  }),
  consoleClusterService({
    slug: 'controles-drift',
    label: 'Controles drift',
    keyword: 'Joystick drift Cancún',
    hook: 'Solución para joystick drift, personaje que se mueve solo, sticks dañados, botones fallando o control que no conecta.',
    intro: 'Reparación de controles con drift en Cancún para DualSense, Xbox, Joy-Con y controles gamer con prueba de calibración.',
    bullets: ['Diagnóstico de joystick', 'Cambio de módulo si aplica', 'Limpieza y calibración', 'Prueba en consola'],
    problems: [
      { problem: 'El personaje se mueve solo', solution: 'Probamos zona muerta, calibración y módulo de joystick.' },
      { problem: 'Stick se siente flojo', solution: 'Puede requerir cambio de módulo o limpieza interna.' },
      { problem: 'Botones no responden', solution: 'Revisamos membranas, placa, suciedad, humedad y flex.' },
      { problem: 'Control no conecta', solution: 'Probamos batería, puerto, Bluetooth/radio y sincronización.' },
    ],
    relatedSlugs: ['diagnostico', 'reparacion-ps5', 'reparacion-xbox', 'reparacion-nintendo-switch'],
  }),
  consoleClusterService({
    slug: 'limpieza-metal-liquido-ps5',
    label: 'Limpieza metal líquido PS5',
    keyword: 'Limpieza PS5 Cancún',
    hook: 'Mantenimiento PS5 con revisión de polvo, ventilador, disipador, sellos y metal líquido para evitar apagados y sobrecalentamiento.',
    intro: 'Limpieza de PS5 en Cancún revisando metal líquido, APU, disipador, ventilador, fuente de calor, ruido y estabilidad jugando.',
    bullets: ['Revisión de metal líquido', 'Limpieza de ventilador y disipador', 'Prueba térmica con juego', 'Garantía por escrito'],
    problems: [
      { problem: 'PS5 se apaga al jugar', solution: 'Revisamos metal líquido, fuente, temperatura y ventilador.' },
      { problem: 'Ruido fuerte', solution: 'Puede ser polvo, ventilador o flujo de aire deficiente.' },
      { problem: 'Nunca se ha limpiado', solution: 'En Cancún conviene mantenimiento por polvo, calor y humedad.' },
      { problem: 'Está muy caliente', solution: 'Se prueba temperatura y contacto térmico antes de manipular metal líquido.' },
    ],
    relatedSlugs: ['ps5-se-apaga', 'reparacion-ps5', 'sobrecalentamiento', 'limpieza-interna'],
  }),
];

export const consolaCategory: ServiceCategory = {
    id: 'consola',
    slug: 'consola',
    title: 'Consola',
    icon: 'fa-gamepad',
    blurb: 'PS5 / Xbox / Switch',
    heroBg: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)',
    services: [
      { slug: 'reparacion-general',label: 'Reparación General',       customUrl: '/reparaciones' },
      {
        slug: 'mantenimiento-preventivo',
        label: 'Mantenimiento preventivo',
        seoKeyword: 'Mantenimiento preventivo de consolas en Cancún',
        hook: 'Mantenimiento para PS5, Xbox Series X/S, Nintendo Switch y consolas portátiles antes de que el polvo, calor o ventilador saturado provoquen apagados.',
        intro: 'Servicio preventivo para consolas de videojuegos en Cancún: limpieza interna, revisión térmica, ventilador, puertos, pasta térmica o metal líquido según modelo.',
        bullets: ['Limpieza interna de ventilador, disipador y rejillas', 'Revisión térmica de PS5, Xbox, Switch y portátiles', 'Pasta térmica o metal líquido según modelo y estado', 'Prueba de ruido, temperatura, video y controles', 'Reporte con recomendaciones antes de cambiar piezas'],
        fromPrice: '$700 MXN', eta: '24-48 h', warranty: '3 meses por escrito',
        featuredImage: '/assets/images/ps5_xbox.webp',
        sectionImages: {
          whyUs: '/assets/images/ps5_xbox.webp',
          process: '/assets/images/mantenimiento-metal-liquido-cancun.webp',
        },
        whyUs: [
          { icon: 'fa-gamepad', title: 'Modelos actuales', desc: 'Revisamos PS5, Xbox Series X/S, Nintendo Switch, Switch OLED, ROG Ally y consolas portátiles similares.' },
          { icon: 'fa-fan', title: 'Ruido bajo control', desc: 'Limpiamos ventilador y flujo de aire para evitar que trabaje al máximo por polvo.' },
          { icon: 'fa-temperature-arrow-down', title: 'Servicio térmico correcto', desc: 'No tratamos igual una PS5 con metal líquido que una Switch con pasta térmica tradicional.' },
          { icon: 'fa-shield-halved', title: 'Trabajo documentado', desc: 'Te explicamos qué se encontró y si conviene limpieza, pasta, ventilador o reparación aparte.' },
        ],
        process: [
          { title: 'Diagnóstico preventivo', desc: 'Revisamos modelo, síntomas, ruido, temperatura, apagados, puertos y estado de ventilación.' },
          { title: 'Desarmado controlado', desc: 'Abrimos la consola con herramienta adecuada para evitar daños en clips, flex y tornillería.' },
          { title: 'Limpieza interna', desc: 'Retiramos polvo de ventilador, disipador, rejillas, placa y zonas de acumulación.' },
          { title: 'Revisión térmica', desc: 'Validamos pasta térmica, pads o metal líquido según el modelo antes de aplicar material nuevo.' },
          { title: 'Prueba final', desc: 'Probamos encendido, video, ventilación, ruido, temperatura y estabilidad antes de entregar.' },
        ],
        commonProblems: [
          { problem: 'PS5 o Xbox Series X se calienta y hace mucho ruido', solution: 'El mantenimiento revisa polvo, ventilador, disipador y compuesto térmico para prevenir apagados.' },
          { problem: 'Nintendo Switch o Switch OLED con ventilación tapada', solution: 'Limpiamos entradas, disipador y ventilador; también revisamos temperatura y estado de batería si aplica.' },
          { problem: 'Consola portátil ROG con temperatura alta', solution: 'Revisamos ventilación, pasta, disipador, polvo y estabilidad bajo carga antes de recomendar piezas.' },
          { problem: 'Consola usada sin historial de servicio', solution: 'El preventivo ayuda a detectar humedad, polvo, ventilador fatigado, puertos flojos o mantenimiento mal hecho.' },
        ],
        compatibleBrands: ['PlayStation 5', 'PS5 Slim', 'PlayStation 4', 'Xbox Series X', 'Xbox Series S', 'Xbox One', 'Nintendo Switch', 'Switch OLED', 'Switch Lite', 'ASUS ROG Ally / ROG Strix portátil', 'Steam Deck'],
        faqs: [
          { question: `¿Cada cuánto debo hacer mantenimiento preventivo a una consola?`, answer: `En Cancún recomendamos cada <strong>12 a 18 meses</strong>. Si la consola está en mueble cerrado, cerca del piso, se usa muchas horas o ya suena fuerte, conviene hacerlo antes.` },
          { question: `¿El mantenimiento de PS5 incluye metal líquido?`, answer: `Revisamos el estado del metal líquido y el aislamiento. Si requiere redistribución o reemplazo, te lo explicamos antes porque debe hacerse con técnica correcta para evitar riesgo en placa.` },
          { question: `¿También dan servicio a Xbox Series X y Nintendo Switch?`, answer: `Sí. Atendemos Xbox Series X/S, Xbox One, Nintendo Switch, Switch OLED y Switch Lite. El procedimiento cambia según diseño térmico, tamaño y tipo de disipador.` },
          { question: `¿Reparan consolas portátiles como ROG Ally o Steam Deck?`, answer: `Sí, podemos revisar consolas portátiles como ROG Ally, equipos ROG portátiles similares y Steam Deck. Validamos modelo exacto antes de abrir o prometer refacciones.` },
          { question: `¿Se borran mis juegos o partidas?`, answer: `No. El mantenimiento preventivo no toca almacenamiento ni cuentas. Aun así, recomendamos tener datos sincronizados en la nube cuando la plataforma lo permita.` },
        ],
        relatedSlugs: ['limpieza-interna', 'pasta-termica', 'sobrecalentamiento', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación de controles', href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Drift, botones, gatillos y fallas de control.' },
          { label: 'Paquetes de mantenimiento', href: '/paquetes', icon: 'fa-box', desc: 'Plan preventivo recurrente si tienes varias consolas o equipos.' },
        ],
      },
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
            imgSrc: '/assets/images/responsive/reparacion-mac-cancun.webp',
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
        relatedSlugs: ['mantenimiento-preventivo', 'pasta-termica', 'sobrecalentamiento', 'fuente', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación de Controles',   href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Joystick drift, gatillos, botones  -  lo arreglamos.' },
          { label: 'Paquetes de mantenimiento', href: '/paquetes',             icon: 'fa-box',     desc: 'Servicio recurrente con descuento.' },
        ],
      },

      // --- Pasta térmica consola (extendida) ---------------------------
      {
        slug: 'pasta-termica',
        label: 'Cambio de pasta térmica',
        seoKeyword: 'Cambio de pasta térmica de consolas en Cancún',
        hook: '¿Tu PS5, Xbox, Nintendo Switch, Steam Deck o ROG Ally se calienta, suena fuerte o se apaga al jugar? Revisamos pasta térmica, metal líquido, disipador, ventilador y polvo antes de cotizar.',
        intro: 'Cambio de pasta térmica de consolas en Cancún para PS5, PS4, Xbox, Nintendo Switch, Steam Deck y ROG Ally. Revisamos metal líquido en PS5, flujo de aire, disipador y ventilador con garantía por escrito.',
        bullets: ['Diagnóstico térmico antes de cambiar compuesto', 'Pasta premium según modelo', 'Revisión de metal líquido en PS5', 'Limpieza de disipador y flujo de aire', 'Prueba de ruido y estabilidad'],
        fromPrice: '$850 MXN', eta: '24-48 h', warranty: '3 meses por escrito',
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
        relatedSlugs: ['mantenimiento-preventivo', 'limpieza-interna', 'sobrecalentamiento', 'fuente', 'diagnostico'],
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
        relatedSlugs: ['fuente', 'sobrecalentamiento', 'diagnostico', 'limpieza-interna', 'pasta-termica'],
        relatedExternal: [
          { label: 'Reparación de controles', href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Si también tienes drift, botones fallando o problemas de conexión en el control.' },
          { label: 'Mantenimiento de consola', href: '/servicios/consola/mantenimiento-preventivo', icon: 'fa-screwdriver-wrench', desc: 'Limpieza interna, revisión térmica y mantenimiento preventivo para consolas de alto uso.' },
        ],
      },

      // --- Fuente consola (extendida) -----------------------------------
      {
        slug: 'fuente',
        label: 'Reparación de fuente',
        seoKeyword: 'Reparación de fuente de consolas en Cancún',
        hook: '¿Tu PS5, PS4, Xbox o Nintendo Switch no enciende, hace beep, se apaga al jugar o falló después de un apagón? Medimos fuente, voltajes, fusibles, capacitores, consumo y placa antes de cotizar.',
        intro: 'Reparación de fuente de consolas en Cancún para PS5, PS4, Xbox Series, Xbox One y Nintendo Switch. Diagnosticamos alimentación, voltajes, consumo y placa antes de cambiar piezas.',
        bullets: ['Diagnóstico eléctrico con multímetro', 'Medición de voltajes y consumo', 'Revisión de fusibles y capacitores', 'Reparación o reemplazo según daño', 'Prueba bajo carga y garantía por escrito'],
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
          { question: `¿Vale la pena reparar la fuente en vez de comprar consola nueva?`, answer: `Si el resto de la consola está en buen estado, casi siempre conviene reparar la fuente frente a comprar una nueva. Aun así, revisamos placa, encendido y consumo antes de recomendarlo, porque no tiene sentido si existe daño mayor.` },
          { question: `¿Cuánto tarda la reparación de fuente?`, answer: `Normalmente tarda de <strong>3 a 5 días</strong> porque hacemos diagnóstico eléctrico y pruebas de carga. No entregamos una fuente solo porque encienda; la dejamos trabajando bajo demanda para confirmar estabilidad al jugar.` },
        ],
        relatedSlugs: ['hdmi', 'limpieza-interna', 'sobrecalentamiento', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación de Controles', href: '/reparacion-controles', icon: 'fa-gamepad', desc: 'Si también tienes drift.' },
        ],
      },

      // --- Sobrecalentamiento consola (extendida) -----------------------
      {
        slug: 'sobrecalentamiento',
        label: 'Sobrecalentamiento',
        seoKeyword: 'Sobrecalentamiento de consola en Cancún',
        hook: '¿Tu PS5, Xbox, Nintendo Switch o consola portátil se calienta, suena fuerte o se apaga al jugar? Revisamos polvo, ventilador, disipador, pasta térmica, metal líquido en PS5 y flujo de aire antes de cotizar.',
        intro: 'Servicio técnico en Cancún para consolas con sobrecalentamiento, ruido de ventilador, apagados por temperatura o bajo rendimiento. Diagnosticamos la causa real antes de cambiar piezas.',
        bullets: ['Diagnóstico térmico de consola', 'Revisión de ventilador y disipador', 'Pasta térmica o metal líquido según modelo', 'Limpieza interna y flujo de aire', 'Garantía por escrito'],
        fromPrice: 'Desde $700 MXN', eta: '24-72 h', warranty: 'Garantía por escrito',
        whyUs: [
          { icon: 'fa-fan',                title: 'Refacciones Originales', desc: 'No instalamos ventiladores genéricos ruidosos. Usamos piezas Nidec o Delta, idénticas a las de fábrica para mantener el flujo de aire exacto.' },
          { icon: 'fa-microchip',          title: 'Protección al Procesador',desc: 'Un ventilador dañado quema tu APU. Nuestro servicio previene el fatal daño de "Luz Roja" o "Luz Azul" asegurando la refrigeración correcta.' },
          { icon: 'fa-spray-can-sparkles', title: 'Limpieza Nivel Quirúrgico',desc: 'Al desarmar la consola para cambiar el ventilador, te incluimos totalmente gratis la limpieza del sistema térmico, eliminando capas de polvo.' },
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
            imgSrc: '/assets/images/responsive/reparacion-mac-cancun.webp',
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
        relatedSlugs: ['mantenimiento-preventivo', 'limpieza-interna', 'pasta-termica', 'fuente', 'reparacion-controles'],
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
          { question: `¿Hacen diagnóstico a domicilio?`, answer: `Para consolas casi siempre recomendamos taller porque ahí podemos probar fuente, video, HDMI, temperatura y controles con mejor equipo. Podemos hacer visita en Cancún con costo para revisión inicial, pero abrir y reparar se hace con más seguridad en taller.` },
        ],
        relatedSlugs: ['mantenimiento-preventivo', 'limpieza-interna', 'pasta-termica', 'hdmi', 'fuente'],
        relatedExternal: [
          { label: 'Reparación general',     href: '/reparaciones',         icon: 'fa-screwdriver-wrench', desc: 'Si ya sabes qué tiene tu consola.' },
          { label: 'Reparación de Controles',href: '/reparacion-controles', icon: 'fa-gamepad',             desc: 'Para joystick drift y fallas de control.' },
        ],
      },
      ...CONSOLE_CLUSTER_SERVICES,
    ],
  };
