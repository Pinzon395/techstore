import type { ServiceCategory } from './types';

const printerFaqs = (topic: string) => [
  { question: `¿Atienden ${topic} en Cancún?`, answer: `Sí. Revisamos ${topic} por marca, modelo, tipo de tinta o tóner, conexión, error y volumen de uso antes de cotizar.` },
  { question: `¿Cuánto cuesta reparar ${topic}?`, answer: 'Depende de la falla, refacción, insumo y si requiere limpieza, cabezal, rodillos, sensores, configuración o mantenimiento.' },
  { question: '¿Conviene reparar o comprar otra impresora?', answer: 'Te lo decimos después del diagnóstico, comparando costo de refacciones, antigüedad, volumen de impresión y precio real de reemplazo.' },
  { question: '¿Atienden oficinas y negocios?', answer: 'Sí. Podemos revisar impresoras de oficinas, hoteles, restaurantes, escuelas, despachos y negocios en Cancún.' },
  { question: '¿Dan garantía?', answer: 'Sí, por escrito sobre el trabajo realizado cuando aplica. No cubre insumos agotados, mal uso, humedad posterior o piezas no intervenidas.' },
];

const printerIssueService = ({
  slug,
  label,
  keyword,
  hook,
  problems,
  relatedSlugs,
}: {
  slug: string;
  label: string;
  keyword: string;
  hook: string;
  problems: { problem: string; solution: string }[];
  relatedSlugs: string[];
}) => ({
  slug,
  label,
  seoKeyword: keyword,
  hook,
  intro: `${label} en Cancún para impresoras de tinta, láser, multifuncionales y equipos de oficina con diagnóstico antes de cambiar piezas o comprar insumos.`,
  bullets: ['Diagnóstico por marca y modelo', 'Prueba de impresión y alimentación', 'Revisión de insumos, sensores, cabezal y conexión', 'Cotización clara antes de reparar'],
  fromPrice: '$450 MXN',
  eta: '24-72 h',
  warranty: 'Garantía por escrito según reparación',
  whyUs: [
    { icon: 'fa-print', title: 'Prueba real', desc: 'Probamos impresión, alimentación, conexión, escaneo y errores antes de cotizar.' },
    { icon: 'fa-droplet', title: 'Tinta y tóner', desc: 'Separamos falla de insumo, cabezal, rodillo, sensor, driver o configuración.' },
    { icon: 'fa-building', title: 'Uso de oficina', desc: 'Consideramos volumen, tipo de papel, red, usuarios y urgencia del negocio.' },
    { icon: 'fa-location-dot', title: 'Servicio Cancún', desc: 'Atendemos Centro, Bonampak, Cumbres, Huayacán, Zona Hotelera y Parque Industrial.' },
  ],
  process: [
    { title: 'Recepción y modelo', desc: 'Registramos marca, modelo, error, tipo de insumo, conexión y volumen de uso.' },
    { title: 'Pruebas funcionales', desc: 'Probamos impresión, alimentación de papel, WiFi/USB/red, escaneo, cabezal, tóner y sensores.' },
    { title: 'Cotización', desc: 'Te explicamos si conviene limpieza, insumo, rodillo, cabezal, configuración o reemplazo.' },
    { title: 'Prueba de entrega', desc: 'Validamos impresión limpia, alimentación correcta y conexión con tus equipos.' },
  ],
  commonProblems: problems,
  compatibleBrands: ['Epson', 'HP', 'Canon', 'Brother', 'Samsung', 'Xerox', 'Lexmark', 'Kyocera'],
  faqs: printerFaqs(label.toLowerCase()),
  relatedSlugs,
});

const printerBrandService = (slug: string, brand: string, models: string[]) => ({
  slug,
  label: `Reparación impresora ${brand}`,
  seoKeyword: `Reparación impresora ${brand} en Cancún`,
  hook: `Servicio técnico para impresoras ${brand} que no imprimen, fallan por WiFi, tienen rayas, atascos, error de tinta, tóner, cabezal o rodillos.`,
  intro: `Diagnóstico de impresoras ${brand} en Cancún con revisión de insumos, cabezal, rodillos, sensores, drivers, WiFi y calidad de impresión.`,
  bullets: ['Revisión por modelo exacto', 'Tinta, tóner, cabezal, rodillos y sensores', 'Configuración WiFi, USB o red', 'Soporte para hogar, oficina y negocio'],
  fromPrice: '$450 MXN',
  eta: '24-72 h',
  warranty: 'Garantía por escrito según reparación',
  whyUs: [
    { icon: 'fa-barcode', title: 'Modelo exacto', desc: `Validamos serie ${brand}, insumos compatibles y tipo de sistema antes de cotizar.` },
    { icon: 'fa-screwdriver-wrench', title: 'Falla real', desc: 'No culpamos al cartucho sin revisar cabezal, contactos, driver, sensor y alimentación.' },
    { icon: 'fa-network-wired', title: 'Red y oficina', desc: 'Configuramos equipos en WiFi, USB, Ethernet, IP fija y múltiples computadoras.' },
    { icon: 'fa-file-shield', title: 'Reporte claro', desc: 'Te decimos si conviene reparar, cambiar insumo o reemplazar la impresora.' },
  ],
  process: [
    { title: 'Identificación', desc: `Confirmamos modelo ${brand}, insumo, error, uso y dispositivos conectados.` },
    { title: 'Prueba de impresión', desc: 'Revisamos calidad, atascos, niveles, cabezal, tóner, rodillos, sensores y conexión.' },
    { title: 'Cotización', desc: 'Indicamos costo, insumo o pieza requerida, tiempo y garantía antes de reparar.' },
    { title: 'Entrega probada', desc: 'Hacemos prueba de impresión y conexión con los equipos necesarios.' },
  ],
  commonProblems: [
    { problem: `${brand} no imprime`, solution: 'Revisamos cola de impresión, driver, conexión, cabezal, tóner/tinta, sensores y errores.' },
    { problem: 'Imprime con rayas o manchas', solution: 'Puede ser cabezal tapado, tinta, tóner, tambor, fusor o falta de mantenimiento.' },
    { problem: 'No conecta por WiFi', solution: 'Configuramos red, IP, driver, firmware y equipos conectados.' },
    { problem: 'Atasco recurrente', solution: 'Revisamos rodillos, sensores, ruta de papel, bandeja y tipo de papel.' },
  ],
  compatibleBrands: models,
  faqs: printerFaqs(`impresoras ${brand}`),
  relatedSlugs: ['diagnostico', 'conectividad', 'mantenimiento', 'atascos', 'cambio-tinta-toner'],
});

export const impresoraCategory: ServiceCategory = {
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
          { question: `¿Atienden impresoras para oficina o negocio?`, answer: `Sí, atendemos impresoras domésticas, escolares, de oficina y negocios en Cancún. En equipos de alto uso también revisamos volumen de impresión, tipo de insumo y mantenimiento preventivo para reducir atascos, manchas y fallas recurrentes.` },
        ],
        relatedSlugs: ['mantenimiento', 'atascos', 'conectividad', 'diagnostico'],
      },
      { slug: 'atascos',            label: 'Reparación de atascos',        intro: 'Papel atascado, sensores rotos o rodillos sucios  -  solucionamos para que vuelva a alimentar.',         bullets: ['Limpieza/sustitución de rodillos', 'Calibración de sensores', 'Test continuo 50 hojas'],                fromPrice: '$450 MXN', eta: '24-48 h' },
      { slug: 'rodillos',           label: 'Rodillos / alimentación',      intro: 'Rodillos gastados que ya no agarran el papel. Los cambiamos por nuevos.',                              bullets: ['Rodillos OEM', 'Limpieza del trayecto del papel', 'Garantía 3 meses'],                                    fromPrice: '$750 MXN', eta: '2-4 días' },
      { slug: 'conectividad',       label: 'Conectividad / configuración', intro: 'Configuramos tu impresora WiFi, Ethernet o USB en cualquier dispositivo.',                              bullets: ['Configuración WiFi / IP fija', 'Drivers en PC, Mac o móvil', 'Pruebas con cada dispositivo'],            fromPrice: '$550 MXN', eta: '1-2 h' },
      { slug: 'diagnostico',        label: 'Diagnóstico',                  intro: 'Revisamos qué tiene tu impresora y te damos cotización clara.',                                         bullets: ['Test eléctrico y mecánico', 'Revisión de cabezales y software', 'Reporte técnico por escrito'],                  fromPrice: 'Desde $600 MXN', eta: '1-2 h' },
      printerBrandService('reparacion-epson', 'Epson', ['Epson EcoTank', 'Epson L Series', 'Epson WorkForce', 'Epson Expression']),
      printerBrandService('reparacion-hp', 'HP', ['HP DeskJet', 'HP Ink Tank', 'HP Smart Tank', 'HP LaserJet', 'HP OfficeJet']),
      printerBrandService('reparacion-canon', 'Canon', ['Canon PIXMA', 'Canon G Series', 'Canon ImageCLASS', 'Canon Maxify']),
      printerBrandService('reparacion-brother', 'Brother', ['Brother DCP', 'Brother HL', 'Brother MFC', 'Brother InkBenefit']),
      printerIssueService({
        slug: 'no-imprime',
        label: 'Impresora no imprime',
        keyword: 'Impresora no imprime en Cancún',
        hook: 'Diagnóstico para impresoras que no imprimen, quedan en cola, marcan error, no reconocen tinta/tóner o no responden desde la computadora.',
        problems: [
          { problem: 'Queda en cola y no sale nada', solution: 'Revisamos driver, cola de impresión, conexión, permisos, puerto y servicio de impresión.' },
          { problem: 'Dice sin tinta o tóner aunque tiene', solution: 'Probamos chip, contactos, cartucho, tóner, firmware y compatibilidad.' },
          { problem: 'Imprime hoja en blanco', solution: 'Puede ser cabezal tapado, tinta seca, cartucho sin flujo, láser/fusor o configuración.' },
          { problem: 'No imprime desde celular o laptop', solution: 'Configuramos WiFi, app, driver, IP, AirPrint, Mopria o conexión USB.' },
        ],
        relatedSlugs: ['diagnostico', 'conectividad', 'cambio-tinta-toner', 'cabezal', 'mantenimiento'],
      }),
      printerIssueService({
        slug: 'wifi-impresora',
        label: 'Configuración WiFi impresora',
        keyword: 'Configurar impresora WiFi en Cancún',
        hook: 'Conectamos impresoras a WiFi, IP fija, USB, Ethernet, PC, Mac, celulares y varios usuarios de oficina.',
        problems: [
          { problem: 'La impresora no aparece en la red', solution: 'Revisamos WiFi, IP, driver, permisos, firmware y router.' },
          { problem: 'Cambia de IP y deja de imprimir', solution: 'Podemos dejar IP fija o configuración estable para oficina.' },
          { problem: 'Imprime desde una PC pero no otra', solution: 'Instalamos driver correcto, permisos, cola y puerto en cada equipo.' },
          { problem: 'No imprime desde celular', solution: 'Configuramos app, AirPrint, Mopria, red y compatibilidad por modelo.' },
        ],
        relatedSlugs: ['conectividad', 'diagnostico', 'no-imprime', 'mantenimiento'],
      }),
      printerIssueService({
        slug: 'cabezal',
        label: 'Limpieza y reparación de cabezal',
        keyword: 'Limpieza de cabezal de impresora en Cancún',
        hook: 'Solución para impresoras con rayas, colores faltantes, hojas en blanco, tinta seca o cabezal tapado.',
        problems: [
          { problem: 'Imprime con rayas', solution: 'Revisamos patrón de inyectores, tinta, cabezal, mangueras y mantenimiento.' },
          { problem: 'Falta un color', solution: 'Puede ser cabezal tapado, aire en sistema, tinta agotada o cartucho defectuoso.' },
          { problem: 'No imprime después de meses sin uso', solution: 'La tinta puede secarse en cabezal y líneas; evaluamos limpieza técnica.' },
          { problem: 'Hoja sale en blanco', solution: 'Revisamos cabezal, bomba, tinta, cartucho y electrónica antes de recomendar pieza.' },
        ],
        relatedSlugs: ['mantenimiento', 'cambio-tinta-toner', 'diagnostico', 'no-imprime'],
      }),
      printerIssueService({
        slug: 'toner',
        label: 'Tóner y láser',
        keyword: 'Tóner de impresora láser en Cancún',
        hook: 'Revisión de impresoras láser con manchas, impresión tenue, tóner agotado, tambor dañado, fusor o errores de cartucho.',
        problems: [
          { problem: 'Impresión tenue o gris', solution: 'Revisamos tóner, tambor, densidad, fusor y configuración.' },
          { problem: 'Manchas o líneas negras', solution: 'Puede ser cartucho, tambor, rodillo, fusor o fuga de tóner.' },
          { problem: 'No reconoce tóner', solution: 'Revisamos chip, contactos, firmware y compatibilidad.' },
          { problem: 'Se atasca al calentar', solution: 'Puede ser fusor, rodillos o ruta de papel en impresoras láser.' },
        ],
        relatedSlugs: ['cambio-tinta-toner', 'diagnostico', 'rodillos', 'atascos', 'mantenimiento'],
      }),
    ],
  };
