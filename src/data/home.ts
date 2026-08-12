import { SERVICE_CATEGORIES } from './services';

export type HomeIconName = string;

export interface HomeServiceCategory {
  slug: string;
  title: string;
  icon: HomeIconName;
  description: string;
  examples: string[];
  href: string;
  image: string;
  imageAlt: string;
}

const serviceCopy: Record<string, Omit<HomeServiceCategory, 'slug' | 'title' | 'icon' | 'href'>> = {
  laptop: {
    description: 'Pantallas, baterías, teclados, bisagras, Windows, temperatura y equipos que no encienden.',
    examples: ['Diagnóstico por modelo', 'SSD y RAM', 'Líquido y salitre'],
    image: '/assets/images/cambio-pantalla-laptop.webp',
    imageAlt: 'Reparación de pantalla de laptop en Pixon PC Cancún',
  },
  pc: {
    description: 'Mantenimiento, fuentes, GPU, tarjeta madre, pantalla azul, upgrades y refrigeración para PC Gamer.',
    examples: ['Limpieza profunda', 'Componentes y upgrades', 'Windows y malware'],
    image: '/assets/images/mantenimiento-pc-escritorio.webp',
    imageAlt: 'Mantenimiento interno de computadora de escritorio en Cancún',
  },
  mac: {
    description: 'Diagnóstico y mantenimiento para MacBook, iMac y Mac mini, sin presentarnos como centro autorizado.',
    examples: ['Batería y pantalla', 'USB-C y MagSafe', 'macOS y datos'],
    image: '/assets/images/mantenimiento-macbook-cancun.webp',
    imageAlt: 'Mantenimiento de MacBook en taller de Pixon PC Cancún',
  },
  telefono: {
    description: 'Servicio para Android y iPhone: pantalla, batería, carga, audio, cámaras, software y humedad.',
    examples: ['Android y iPhone', 'Centro de carga', 'Diagnóstico de placa'],
    image: '/assets/images/reparacion-celulares-cancun.webp',
    imageAlt: 'Reparación de celular en Cancún',
  },
  consola: {
    description: 'PS5, Xbox, Nintendo Switch y controles con fallas de HDMI, temperatura, fuente o joystick drift.',
    examples: ['HDMI y video', 'Limpieza térmica', 'Controles y drift'],
    image: '/assets/images/ps5_xbox.webp',
    imageAlt: 'Servicio técnico para consolas PlayStation y Xbox en Cancún',
  },
  impresora: {
    description: 'Atascos, cabezales, rodillos, tinta, tóner y conectividad para hogar, oficina y negocio.',
    examples: ['Epson, HP y Canon', 'WiFi y Ethernet', 'Láser e inyección'],
    image: '/assets/images/reparacion-impresoras-cancun.webp',
    imageAlt: 'Reparación y mantenimiento de impresora en Cancún',
  },
  redes: {
    description: 'Diagnóstico de WiFi, routers, sistemas Mesh, cableado e impresoras compartidas.',
    examples: ['Cobertura e interferencia', 'Red de oficina', 'Router y Mesh'],
    image: '/assets/images/actualizacion-windows-cancun.webp',
    imageAlt: 'Configuración técnica de red y equipos en Cancún',
  },
  b2b: {
    description: 'Soporte programado para oficinas, hoteles, restaurantes, agencias, comercios y flotillas.',
    examples: ['Mantenimiento por lote', 'Tickets y reportes', 'Pólizas y prioridad'],
    image: '/assets/images/soporte-hoteles-hero.webp',
    imageAlt: 'Soporte técnico empresarial para hoteles y oficinas en Cancún',
  },
};

const homeCategoryOrder = ['laptop', 'pc', 'mac', 'telefono', 'consola', 'impresora', 'redes', 'b2b'];

export const homeServiceCategories: HomeServiceCategory[] = homeCategoryOrder.flatMap((slug) => {
  const category = SERVICE_CATEGORIES.find((item) => item.slug === slug);
  const copy = serviceCopy[slug];
  if (!category || !copy) return [];
  return [{
    slug,
    title: category.title === 'B2B' ? 'Empresas' : category.title,
    icon: slug === 'redes' ? 'network-wired' : category.icon.replace(/^fa-/, ''),
    href: `/servicios/${category.slug}`,
    ...copy,
  }];
});

export const trustItems = [
  { icon: 'stethoscope', title: 'Diagnóstico antes de reparar', text: 'Separamos síntomas de causas antes de recomendar piezas o procesos.' },
  { icon: 'file-contract', title: 'Cotización autorizada', text: 'Explicamos alcance, riesgos y costo antes de intervenir el equipo.' },
  { icon: 'camera-retro', title: 'Proceso documentado', text: 'Cuando aplica, compartimos fotos, video o reporte del trabajo realizado.' },
  { icon: 'shield-halved', title: 'Garantía por escrito', text: 'La cobertura se define según la reparación, la pieza y el estado del equipo.' },
];

export const maintenanceBenefits = [
  'Limpieza preventiva y revisión general',
  'Temperaturas, ventilación y ruido',
  'Detección temprana de desgaste',
  'Recomendaciones por polvo, humedad y salitre',
  'Atención para hogar, gaming y empresa',
  'Visita sujeta a equipo, zona y agenda',
];

export const specialties = [
  { icon: 'droplet', title: 'Humedad, líquido y salitre', text: 'Inspección de corrosión, limpieza y estabilización antes de energizar cuando el caso lo requiere.', href: '/antisulfatacion', anchor: 'metal-liquido' },
  { icon: 'microchip', title: 'Placa y componentes', text: 'Pruebas de energía, conectores, voltajes y módulos para localizar la causa real.', href: '/reparaciones' },
  { icon: 'database', title: 'Recuperación de datos', text: 'Priorizamos documentos y respaldos antes de formatear o insistir con un medio inestable.', href: '/servicios/laptop/recuperacion-datos' },
  { icon: 'temperature-high', title: 'Refrigeración avanzada', text: 'Pasta térmica, thermal pads y metal líquido solo en equipos compatibles y después de revisar temperaturas.', href: '/servicios/pc/refrigeracion' },
  { icon: 'laptop-medical', title: 'Bisagras y carcasas', text: 'Reconstrucción estructural, ajuste de bisagras y revisión de flex para evitar más daño.', href: '/reparacion-bisagras', anchor: 'bisagras-index' },
  { icon: 'gamepad', title: 'HDMI y controles', text: 'Diagnóstico de video, puertos, botones, gatillos y joystick drift en consolas y controles.', href: '/reparacion-controles', anchor: 'controles-index' },
];

export const businessSegments = [
  { icon: 'hotel', title: 'Hoteles y hospitalidad', text: 'Equipos de recepción, administración, impresoras y conectividad.' },
  { icon: 'building', title: 'Oficinas y agencias', text: 'Mantenimiento por lote, tickets, reportes y prioridades operativas.' },
  { icon: 'utensils', title: 'Restaurantes y comercios', text: 'Revisión de equipos que sostienen caja, operación y comunicación.' },
];

export const processSteps = [
  { icon: 'comments', title: 'Contacto y registro', text: 'Comparte modelo, síntomas, fotos o video por WhatsApp o crea un ticket.' },
  { icon: 'magnifying-glass-chart', title: 'Diagnóstico técnico', text: 'Revisamos la causa probable, el estado del equipo y los riesgos.' },
  { icon: 'file-invoice', title: 'Cotización y autorización', text: 'Recibes alcance, costo estimado y condiciones antes de reparar.' },
  { icon: 'screwdriver-wrench', title: 'Servicio documentado', text: 'Realizamos el trabajo autorizado con materiales y proceso adecuados.' },
  { icon: 'circle-check', title: 'Pruebas y entrega', text: 'Validamos funciones relacionadas y entregamos recomendaciones y garantía aplicable.' },
];

export const packageGroups = [
  { icon: 'house-laptop', title: 'Hogar y trabajo', text: 'Mantenimiento para laptops y computadoras de uso cotidiano.', href: '/paquetes' },
  { icon: 'gamepad', title: 'Gaming', text: 'Limpieza y revisión térmica para PC Gamer, laptops gaming y consolas.', href: '/paquetes' },
  { icon: 'building', title: 'Empresas', text: 'Planes por lote y mantenimiento programado según operación y cantidad de equipos.', href: '/servicios/mantenimiento-preventivo-pc-empresas' },
];

export const buildProfiles = [
  { title: 'PC Gamer de entrada', text: 'Configuración equilibrada para esports, estudio y trabajo diario.', image: '/assets/images/responsive/pc-gamer-entrada.webp', alt: 'Ensamble PC Gamer de entrada en Cancún' },
  { title: 'PC Gamer equilibrada', text: 'Componentes seleccionados para jugar y producir con margen de actualización.', image: '/assets/images/responsive/pc-gamer-gama-media.webp', alt: 'Ensamble PC Gamer de gama media en Cancún' },
  { title: 'PC de alto rendimiento', text: 'Proyecto a medida para cargas exigentes, gaming o creación de contenido.', image: '/assets/images/responsive/pc-gamer-gama-alta.webp', alt: 'Ensamble PC de alto rendimiento en Cancún' },
];

export const workVideos = [
  { id: '8qoePYYRBaI', title: 'Soporte empresarial', subtitle: 'Servicio de impresora en banco', landscape: true },
  { id: 'jUewdDR4g0A', title: 'Mantenimiento de laptop', subtitle: 'Limpieza y revisión documentada' },
  { id: 'y-YJV5JXJdE', title: 'Limpieza de GPU', subtitle: 'Mantenimiento profundo de RTX 4070' },
];

export const fallbackReviews = [
  { name: 'Fred Uriostegui', date: 'mayo 2025', rating: 5, text: 'Muy buen servicio, reparación entregada a tiempo y de forma correcta. La atención fue clara desde el diagnóstico.' },
  { name: 'Deon Daboy', date: 'mayo 2025', rating: 5, text: 'Excelente servicio y comunicación. Informa cada detalle con fotos y videos durante la reparación.' },
  { name: 'Joel Sonda', date: 'mayo 2025', rating: 5, text: 'Buen servicio con atención especializada. Explica los problemas y ofrece opciones según el presupuesto.' },
];

export const coverageZones = [
  'Cancún Centro', 'Zona Hotelera', 'Huayacán', 'Cumbres', 'Bonfil', 'Polígono Sur',
  'Puerto Cancún', 'Av. Tulum', 'Bonampak', 'Puerto Juárez', 'Supermanzanas', 'Haciendas',
];

export const homeFaqs = [
  { question: '¿Qué equipos reparan en Pixon PC?', answer: 'Atendemos laptops, computadoras, PC Gamer, Mac, celulares, consolas, controles e impresoras. También ofrecemos redes WiFi y soporte técnico para empresas en Cancún.' },
  { question: '¿Ofrecen recolección y entrega en Cancún?', answer: 'Podemos coordinar recolección y entrega según la zona, la agenda y el tipo de equipo. Confirma disponibilidad por WhatsApp antes de trasladarlo.' },
  { question: '¿Qué servicios pueden hacerse a domicilio?', answer: 'El mantenimiento preventivo, algunas configuraciones y revisiones empresariales pueden realizarse a domicilio. Los trabajos de placa, pantalla, humedad severa, HDMI o desarme avanzado suelen requerir taller.' },
  { question: '¿El diagnóstico tiene costo?', answer: 'El costo depende del tipo de equipo y la profundidad de las pruebas. Antes de recibirlo te explicamos las condiciones aplicables y si el diagnóstico se descuenta al autorizar.' },
  { question: '¿Se pueden perder mis archivos?', answer: 'Una reparación física normal no requiere borrar datos. Si existe riesgo para la información o se necesita formatear, pedimos autorización y recomendamos respaldo antes de continuar.' },
  { question: '¿Cuánto tarda una reparación?', answer: 'Depende de la falla, las pruebas y la disponibilidad de refacciones. Después del diagnóstico te compartimos un tiempo estimado antes de reparar.' },
  { question: '¿Dan garantía por escrito?', answer: 'Sí, cuando corresponde al servicio o pieza instalada. La cobertura, vigencia y exclusiones se indican por escrito según el estado del equipo y el trabajo realizado.' },
  { question: '¿Atienden empresas, hoteles y oficinas?', answer: 'Sí. Ofrecemos mantenimiento por lote, soporte de equipos, impresoras, redes, WiFi, tickets y reportes para negocios de Cancún.' },
  { question: '¿Por qué la humedad y el salitre dañan los equipos?', answer: 'La humedad, el calor y el salitre aceleran corrosión, suciedad conductiva y problemas térmicos. La frecuencia preventiva correcta depende del ambiente y del uso del equipo.' },
  { question: '¿Aceptan tarjeta, transferencia o facturación?', answer: 'Consulta los métodos disponibles y los requisitos de facturación al cotizar. Así confirmamos la opción adecuada antes de iniciar el servicio.' },
];
