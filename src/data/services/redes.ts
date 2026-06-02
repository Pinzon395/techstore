import type { ServiceCategory, ServiceItem } from './types';

const networkFaqs = (topic: string) => [
  { question: `¿Atienden ${topic} en Cancún?`, answer: `Sí. Revisamos ${topic} para casas, oficinas, hoteles pequeños, restaurantes, agencias y negocios.` },
  { question: '¿Pueden ir a sitio?', answer: 'Sí, las fallas de red y WiFi normalmente requieren visita para medir cobertura, revisar equipos, cableado y ubicación.' },
  { question: '¿Configuran impresoras y cámaras?', answer: 'Sí, podemos integrar impresoras de red, PCs, laptops, celulares, cámaras IP y equipos conectados.' },
  { question: '¿Dan reporte?', answer: 'Sí, podemos entregar diagnóstico, cambios realizados, recomendaciones y equipos revisados.' },
  { question: '¿Qué zonas cubren?', answer: 'Cancún Centro, Zona Hotelera, Av. Tulum, Bonampak, Puerto Cancún, Cumbres, Huayacán, Bonfil, Aeropuerto y Parque Industrial.' },
];

const networkService = ({
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
}): ServiceItem => ({
  slug,
  label,
  seoKeyword: keyword,
  hook,
  intro: `${label} en Cancún para resolver WiFi lento, red inestable, impresoras de red, routers, repetidores, cableado y equipos conectados.`,
  bullets: ['Diagnóstico en sitio', 'Router, WiFi, cableado, switches e impresoras', 'Configuración estable', 'Reporte y recomendaciones'],
  fromPrice: '$650 MXN',
  eta: 'Según visita',
  warranty: 'Garantía por configuración realizada',
  whyUs: [
    { icon: 'fa-wifi', title: 'Cobertura real', desc: 'Revisamos ubicación, muros, interferencia, saturación y equipos conectados.' },
    { icon: 'fa-network-wired', title: 'Red completa', desc: 'Diagnosticamos router, switches, cableado, IP, impresoras, PCs y dispositivos móviles.' },
    { icon: 'fa-building', title: 'Hogar y negocio', desc: 'Atendemos casas, oficinas, restaurantes, agencias, hoteles pequeños y negocios.' },
    { icon: 'fa-map-location-dot', title: 'Cancún local', desc: 'Cobertura en Centro, Zona Hotelera, Huayacán, Cumbres, Bonampak, Aeropuerto y más.' },
  ],
  process: [
    { title: 'Levantamiento', desc: 'Identificamos módem, router, repetidores, switches, impresoras, usuarios y zonas con falla.' },
    { title: 'Diagnóstico', desc: 'Probamos cobertura, velocidad, cableado, IP, DNS, puertos, saturación y equipos conectados.' },
    { title: 'Configuración', desc: 'Ajustamos red, nombres, canales, seguridad, IP, impresoras o equipos según necesidad.' },
    { title: 'Prueba final', desc: 'Validamos conexión en zonas críticas y dejamos recomendaciones de mejora.' },
  ],
  commonProblems: problems,
  compatibleBrands: ['Telmex', 'Totalplay', 'Izzi', 'TP-Link', 'Ubiquiti', 'Mercusys', 'D-Link', 'Asus', 'Linksys', 'HP', 'Epson'],
  faqs: networkFaqs(label.toLowerCase()),
  relatedSlugs,
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
      keyword: 'WiFi lento en Cancún',
      hook: 'Diagnóstico de WiFi lento, intermitente o saturado en casas, oficinas y negocios de Cancún.',
      problems: [
        { problem: 'Internet va lento en algunas zonas', solution: 'Medimos cobertura, interferencia, distancia, muros y ubicación de router.' },
        { problem: 'Se cae en horas pico', solution: 'Revisamos saturación, canales, equipos conectados y capacidad del router.' },
        { problem: 'Funciona por cable pero no WiFi', solution: 'Diagnosticamos radio WiFi, configuración, canal y ubicación.' },
        { problem: 'Clientes o empleados saturan red', solution: 'Recomendamos separación de redes, límites y mejor distribución.' },
      ],
      relatedSlugs: ['configuracion-router', 'red-oficina', 'repetidores-mesh', 'impresora-red'],
    }),
    networkService({
      slug: 'configuracion-router',
      label: 'Configuración router',
      keyword: 'Configuración de router en Cancún',
      hook: 'Configuramos routers, módems, repetidores, red segura, nombres WiFi, contraseñas, IP y equipos conectados.',
      problems: [
        { problem: 'Router nuevo sin configurar', solution: 'Configuramos red, seguridad, WiFi, DHCP y dispositivos.' },
        { problem: 'Olvidé contraseña WiFi', solution: 'Restablecemos o cambiamos contraseña de forma segura.' },
        { problem: 'Necesito separar red de clientes', solution: 'Configuramos red principal e invitados cuando el equipo lo permite.' },
        { problem: 'Tengo doble router', solution: 'Ordenamos modo bridge/AP/router para evitar conflictos.' },
      ],
      relatedSlugs: ['wifi-lento', 'repetidores-mesh', 'red-oficina', 'impresora-red'],
    }),
    networkService({
      slug: 'red-oficina',
      label: 'Red de oficina',
      keyword: 'Red de oficina en Cancún',
      hook: 'Diagnóstico y configuración de red para oficinas: PCs, laptops, impresoras, switches, router, cableado e IP.',
      problems: [
        { problem: 'Equipos no se ven entre sí', solution: 'Revisamos red, IP, permisos, firewall, cableado y configuración.' },
        { problem: 'Impresora de red falla', solution: 'Configuramos IP, driver, puerto, cola y permisos.' },
        { problem: 'Switch o cableado causa cortes', solution: 'Probamos puertos, cables, energía y puntos de red.' },
        { problem: 'No hay orden de red', solution: 'Documentamos equipos y recomendamos estructura más estable.' },
      ],
      relatedSlugs: ['impresora-red', 'configuracion-router', 'wifi-lento', 'cableado-red'],
    }),
    networkService({
      slug: 'impresora-red',
      label: 'Impresora en red',
      keyword: 'Configurar impresora en red en Cancún',
      hook: 'Conectamos impresoras WiFi, Ethernet o USB compartidas para PCs, laptops, Mac y celulares.',
      problems: [
        { problem: 'La impresora no aparece', solution: 'Configuramos IP, driver, permisos, red y cola de impresión.' },
        { problem: 'Imprime desde una PC pero no otra', solution: 'Instalamos drivers y puerto correcto en cada equipo.' },
        { problem: 'Cambia de IP', solution: 'Podemos dejar IP fija o configuración más estable.' },
        { problem: 'No imprime desde celular', solution: 'Configuramos app, AirPrint, Mopria o conexión compatible.' },
      ],
      relatedSlugs: ['red-oficina', 'configuracion-router', 'wifi-lento'],
    }),
    networkService({
      slug: 'repetidores-mesh',
      label: 'Repetidores y Mesh',
      keyword: 'Instalación de repetidores WiFi Mesh en Cancún',
      hook: 'Instalamos repetidores o sistemas Mesh para mejorar cobertura WiFi en casas, oficinas y negocios.',
      problems: [
        { problem: 'Hay zonas sin señal', solution: 'Medimos ubicación y recomendamos repetidor, Mesh o cableado según caso.' },
        { problem: 'Repetidor empeora velocidad', solution: 'Puede estar mal ubicado o saturado; ajustamos topología.' },
        { problem: 'Casa grande o varios pisos', solution: 'Planeamos nodos Mesh o puntos de acceso.' },
        { problem: 'Negocio con clientes y operación', solution: 'Separamos redes cuando conviene para estabilidad.' },
      ],
      relatedSlugs: ['wifi-lento', 'configuracion-router', 'red-oficina', 'cableado-red'],
    }),
    networkService({
      slug: 'cableado-red',
      label: 'Cableado de red',
      keyword: 'Cableado de red en Cancún',
      hook: 'Diagnóstico básico de puntos de red, cables, switches y conexión por Ethernet para oficinas y negocios.',
      problems: [
        { problem: 'Un punto de red no funciona', solution: 'Probamos cable, puerto, switch, patch cord y equipo conectado.' },
        { problem: 'Ethernet se desconecta', solution: 'Revisamos conectores, cable, switch y tarjeta de red.' },
        { problem: 'Necesito conectar impresora o PC por cable', solution: 'Evaluamos ruta, punto, switch y configuración.' },
        { problem: 'Switch sin orden', solution: 'Identificamos equipos conectados y recomendaciones de organización.' },
      ],
      relatedSlugs: ['red-oficina', 'impresora-red', 'configuracion-router', 'wifi-lento'],
    }),
  ],
};
