import type { ServiceCategory, ServiceItem } from './types';

const networkFaqs = (topic: string) => [
  { question: `Atienden ${topic} en Cancun?`, answer: `Si. Revisamos ${topic} para casas, oficinas, hoteles pequenos, restaurantes, agencias y negocios en Cancun. Primero ubicamos donde falla la senal, que proveedor usas y cuantos equipos se conectan.` },
  { question: 'Pueden ir a sitio?', answer: 'Si. Las fallas de WiFi, cableado y red normalmente requieren visita para medir cobertura, revisar router, repetidores, switches, impresoras y ubicacion real de los equipos.' },
  { question: 'Tambien configuran impresoras, camaras o equipos conectados?', answer: 'Si. Podemos integrar impresoras de red, PCs, laptops, celulares, camaras IP y dispositivos conectados cuando la red lo permite. Si hace falta equipo adicional, te lo decimos antes de comprar.' },
  { question: 'Dejan reporte o recomendaciones?', answer: 'Si. Podemos dejar diagnostico, cambios realizados, claves entregadas al responsable, recomendaciones de seguridad y mejoras sugeridas para estabilidad o cobertura.' },
  { question: 'Que zonas cubren?', answer: 'Atendemos Cancun Centro, Zona Hotelera, Avenida Tulum, Bonampak, Puerto Cancun, Cumbres, Huayacan, Bonfil, Aeropuerto, Parque Industrial y otras zonas de Quintana Roo.' },
];

const networkService = ({
  slug,
  label,
  keyword,
  hook,
  problems,
  relatedSlugs,
  overrides = {},
}: {
  slug: string;
  label: string;
  keyword: string;
  hook: string;
  problems: { problem: string; solution: string }[];
  relatedSlugs: string[];
  overrides?: Record<string, any>;
}): ServiceItem => ({
  slug,
  label,
  seoKeyword: keyword,
  hook,
  intro: `${label} en Cancun para resolver WiFi lento, internet inestable, red de oficina, router, modem, repetidores Mesh, cableado Ethernet, switches, impresoras en red y equipos conectados.`,
  bullets: ['Diagnostico de red en sitio', 'Router, modem, WiFi, cableado, switches e impresoras', 'Configuracion estable para casas y negocios', 'Reporte y recomendaciones de mejora'],
  fromPrice: '$650 MXN',
  eta: 'Segun visita',
  warranty: 'Garantia por configuracion realizada',
  whyUs: [
    { icon: 'fa-wifi', title: 'Cobertura real', desc: 'Revisamos ubicacion, muros, interferencia, saturacion, distancia y cantidad de equipos conectados.' },
    { icon: 'fa-network-wired', title: 'Red completa', desc: 'Diagnosticamos router, switches, cableado, IP, impresoras, PCs, laptops y dispositivos moviles.' },
    { icon: 'fa-lock', title: 'Seguridad basica', desc: 'Podemos ordenar claves, red de invitados, nombres WiFi, acceso a equipos e impresoras compartidas.' },
    { icon: 'fa-map-location-dot', title: 'Cancun local', desc: 'Cobertura en Centro, Zona Hotelera, Huayacan, Cumbres, Bonampak, Aeropuerto, Puerto Cancun y mas.' },
  ],
  process: [
    { title: 'Levantamiento', desc: 'Identificamos modem, router, repetidores, switches, impresoras, usuarios, proveedor y zonas con falla.' },
    { title: 'Diagnostico de red', desc: 'Probamos cobertura, velocidad, cableado, IP, DNS, puertos, saturacion, interferencia y equipos conectados.' },
    { title: 'Solucion propuesta', desc: 'Definimos si conviene reubicar router, ajustar canales, instalar mesh, ordenar cableado o configurar equipos.' },
    { title: 'Configuracion segura', desc: 'Ajustamos red, nombres, claves, IP, impresoras, invitados o equipos segun necesidad y autorizacion.' },
    { title: 'Prueba final', desc: 'Validamos conexion en zonas criticas, dejamos recomendaciones y confirmamos que los equipos principales naveguen o impriman.' },
  ],
  commonProblems: problems,
  compatibleBrands: [
    'Telmex',
    'Totalplay',
    'Izzi',
    'TP-Link',
    'Ubiquiti',
    'Mercusys',
    'D-Link',
    'Asus',
    'Linksys',
    'HP/Epson en red',
    'Casas y oficinas',
    'Restaurantes y hoteles pequenos',
  ],
  faqs: networkFaqs(label.toLowerCase()),
  relatedSlugs,
  ...overrides,
});

export const redesCategory: ServiceCategory = {
  id: 'redes',
  slug: 'redes',
  title: 'Redes y WiFi',
  icon: 'fa-wifi',
  blurb: 'WiFi / Router / Cableado',
  heroBg: 'linear-gradient(135deg, #082f49 0%, #0891b2 100%)',
  services: [
    networkService({
      slug: 'wifi-lento',
      label: 'WiFi lento',
      keyword: 'WiFi lento en Cancun',
      hook: 'Diagnostico profesional de WiFi lento, internet intermitente, baja cobertura, router saturado o red inestable en casas, oficinas, hoteles pequenos, restaurantes y negocios de Cancun.',
      problems: [
        { problem: 'Internet va lento en algunas zonas', solution: 'Medimos cobertura, interferencia, distancia, muros, ubicacion del router y velocidad real por zona.' },
        { problem: 'Se cae en horas pico', solution: 'Revisamos saturacion, canales, equipos conectados, capacidad del router y proveedor.' },
        { problem: 'Funciona por cable pero no por WiFi', solution: 'Diagnosticamos radio WiFi, configuracion, canal, potencia, distancia y ubicacion.' },
        { problem: 'Clientes o empleados saturan red', solution: 'Recomendamos red de invitados, separacion de equipos, limites basicos y mejor distribucion.' },
      ],
      relatedSlugs: ['configuracion-router', 'red-oficina', 'repetidores-mesh', 'impresora-red'],
      overrides: {
        h1: 'Solucion para WiFi lento en Cancun',
        metaTitle: 'WiFi lento en Cancun | Diagnostico de internet y router',
        metaDescription: 'Solucion para WiFi lento en Cancun. Revisamos router, modem, cobertura, interferencia, repetidores, Mesh, cableado, equipos conectados y velocidad real por zona.',
        bullets: [
          'Diagnostico de WiFi lento e internet intermitente',
          'Revision de router, modem, canales, interferencia y cobertura',
          'Soluciones con repetidores, Mesh, cableado o reubicacion',
          'Atencion para casas, oficinas, hoteles pequenos y negocios',
        ],
        faqs: [
          { question: 'Por que mi WiFi esta lento aunque pago buen internet?', answer: 'Puede ser cobertura baja, router saturado, mala ubicacion, interferencia, repetidores mal colocados, muchos equipos conectados o cableado deficiente. Medimos velocidad por zona para separar falla de proveedor y falla interna.' },
          { question: 'Arreglan WiFi lento en casas y negocios de Cancun?', answer: 'Si. Revisamos casas, oficinas, restaurantes, consultorios, agencias y hoteles pequenos en Cancun. Evaluamos modem, router, repetidores, Mesh, cableado, switches y equipos conectados.' },
          { question: 'Conviene comprar repetidor WiFi o sistema Mesh?', answer: 'Depende del espacio. Un repetidor mal ubicado puede empeorar la velocidad. Primero revisamos distancia, muros, saturacion y zonas criticas para recomendar repetidor, Mesh, punto de acceso o cableado.' },
          { question: 'Pueden revisar si la falla es del proveedor?', answer: 'Si. Probamos velocidad por cable, respuesta del modem, WiFi por zonas y equipos conectados. Si el problema apunta al proveedor, te decimos que evidencia reportar.' },
          { question: 'Cuanto cuesta revisar WiFi lento en Cancun?', answer: 'La visita parte desde $650 MXN segun zona, alcance y cantidad de equipos. Antes de ir te pedimos datos del proveedor, router, ubicacion y sintomas para estimar mejor.' },
        ],
      },
    }),
    networkService({
      slug: 'configuracion-router',
      label: 'Configuracion router',
      keyword: 'Configuracion de router en Cancun',
      hook: 'Configuracion profesional de router, modem, WiFi, contrasenas, red de invitados, IP, DHCP, repetidores y equipos conectados en Cancun.',
      problems: [
        { problem: 'Router nuevo sin configurar', solution: 'Configuramos red, seguridad, WiFi, DHCP, nombre de red, clave y dispositivos principales.' },
        { problem: 'Olvide contrasena WiFi', solution: 'Restablecemos o cambiamos la clave de forma segura y la documentamos para el responsable.' },
        { problem: 'Necesito separar red de clientes', solution: 'Configuramos red principal e invitados cuando el equipo lo permite para proteger equipos internos.' },
        { problem: 'Tengo doble router', solution: 'Ordenamos modo bridge, punto de acceso o router para evitar conflictos de IP y cortes.' },
      ],
      relatedSlugs: ['wifi-lento', 'repetidores-mesh', 'red-oficina', 'impresora-red'],
      overrides: {
        h1: 'Configuracion de router y WiFi en Cancun',
        metaTitle: 'Configuracion de router en Cancun | WiFi, clave e IP',
        metaDescription: 'Configuracion de router en Cancun. Ajustamos modem, WiFi, contrasenas, red de invitados, IP, DHCP, repetidores, Mesh y equipos conectados.',
      },
    }),
    networkService({
      slug: 'red-oficina',
      label: 'Red de oficina',
      keyword: 'Red de oficina en Cancun',
      hook: 'Diagnostico y configuracion de red de oficina en Cancun para PCs, laptops, impresoras, switches, router, cableado Ethernet, IP, permisos y equipos compartidos.',
      problems: [
        { problem: 'Equipos no se ven entre si', solution: 'Revisamos red, IP, permisos, firewall, cableado, grupo de trabajo y configuracion compartida.' },
        { problem: 'Impresora de red falla', solution: 'Configuramos IP, driver, puerto, cola de impresion, permisos y prueba desde cada equipo.' },
        { problem: 'Switch o cableado causa cortes', solution: 'Probamos puertos, cables, energia, patch cords y puntos de red antes de culpar al proveedor.' },
        { problem: 'No hay orden de red', solution: 'Documentamos equipos y recomendamos estructura mas estable para crecimiento de la oficina.' },
      ],
      relatedSlugs: ['impresora-red', 'configuracion-router', 'wifi-lento', 'cableado-red'],
      overrides: {
        h1: 'Red de oficina en Cancun',
        metaTitle: 'Red de oficina en Cancun | WiFi, cableado e impresoras',
        metaDescription: 'Configuramos red de oficina en Cancun: PCs, laptops, impresoras, switches, router, cableado Ethernet, IP, permisos, WiFi y equipos compartidos.',
      },
    }),
    networkService({
      slug: 'impresora-red',
      label: 'Impresora en red',
      keyword: 'Configurar impresora en red en Cancun',
      hook: 'Configuramos impresora en red WiFi, Ethernet o USB compartida para PCs, laptops, Mac, celulares y oficinas en Cancun.',
      problems: [
        { problem: 'La impresora no aparece', solution: 'Configuramos IP, driver, puerto, permisos, red y cola de impresion.' },
        { problem: 'Imprime desde una PC pero no desde otra', solution: 'Instalamos drivers, puerto correcto y permisos en cada equipo que necesita imprimir.' },
        { problem: 'Cambia de IP y deja de imprimir', solution: 'Podemos dejar IP fija o configuracion mas estable segun router e impresora.' },
        { problem: 'No imprime desde celular o Mac', solution: 'Configuramos app, AirPrint, Mopria o conexion compatible segun modelo.' },
      ],
      relatedSlugs: ['red-oficina', 'configuracion-router', 'wifi-lento'],
      overrides: {
        h1: 'Configurar impresora en red en Cancun',
        metaTitle: 'Configurar impresora en red en Cancun | WiFi y Ethernet',
        metaDescription: 'Configuracion de impresora en red en Cancun para WiFi, Ethernet, USB compartida, PCs, laptops, Mac, celulares, IP fija, drivers y permisos.',
      },
    }),
    networkService({
      slug: 'repetidores-mesh',
      label: 'Repetidores y Mesh',
      keyword: 'Instalacion de repetidores WiFi Mesh en Cancun',
      hook: 'Instalacion y configuracion de repetidores WiFi, sistemas Mesh y puntos de acceso para mejorar cobertura en casas, oficinas y negocios de Cancun.',
      problems: [
        { problem: 'Hay zonas sin senal', solution: 'Medimos ubicacion y recomendamos repetidor, Mesh, punto de acceso o cableado segun el caso.' },
        { problem: 'El repetidor empeora velocidad', solution: 'Puede estar mal ubicado o saturado; ajustamos topologia y distancia al router.' },
        { problem: 'Casa grande o varios pisos', solution: 'Planeamos nodos Mesh, puntos de acceso o cableado para cobertura mas estable.' },
        { problem: 'Negocio con clientes y operacion', solution: 'Separamos redes cuando conviene para proteger cajas, impresoras, camaras y equipos internos.' },
      ],
      relatedSlugs: ['wifi-lento', 'configuracion-router', 'red-oficina', 'cableado-red'],
      overrides: {
        h1: 'Instalacion de repetidores WiFi y Mesh en Cancun',
        metaTitle: 'Repetidores WiFi y Mesh en Cancun | Mejorar cobertura',
        metaDescription: 'Instalacion de repetidores WiFi y Mesh en Cancun. Mejoramos cobertura, ubicacion de nodos, puntos de acceso, router, cableado y velocidad por zona.',
      },
    }),
    networkService({
      slug: 'cableado-red',
      label: 'Cableado de red',
      keyword: 'Cableado de red en Cancun',
      hook: 'Diagnostico de cableado de red Ethernet, puntos de red, conectores, switches, patch cords y conexion estable para oficinas y negocios en Cancun.',
      problems: [
        { problem: 'Un punto de red no funciona', solution: 'Probamos cable, puerto, switch, patch cord, conector y equipo conectado.' },
        { problem: 'Ethernet se desconecta', solution: 'Revisamos conectores, cable, switch, energia, tarjeta de red y ruta fisica.' },
        { problem: 'Necesito conectar impresora o PC por cable', solution: 'Evaluamos ruta, punto, switch y configuracion para una conexion mas estable que WiFi.' },
        { problem: 'Switch sin orden', solution: 'Identificamos equipos conectados y dejamos recomendaciones de organizacion y etiquetado.' },
      ],
      relatedSlugs: ['red-oficina', 'impresora-red', 'configuracion-router', 'wifi-lento'],
      overrides: {
        h1: 'Cableado de red Ethernet en Cancun',
        metaTitle: 'Cableado de red en Cancun | Ethernet, switches y puntos',
        metaDescription: 'Cableado de red en Cancun para oficinas y negocios. Revisamos Ethernet, puntos de red, conectores, switches, patch cords, impresoras y PCs.',
      },
    }),
  ],
};
