import type { ServiceCategory, ServiceItem } from './types';

const b2bFaqs = (sector: string) => [
  { question: `¿Dan soporte TI para ${sector} en Cancún?`, answer: `Sí. Podemos atender ${sector} con tickets, visitas programadas, mantenimiento preventivo, soporte a PCs, laptops, impresoras, red, WiFi y reportes.` },
  { question: '¿Pueden facturar y entregar reporte?', answer: 'Sí. Podemos manejar CFDI, evidencia del servicio, reporte técnico, equipos atendidos, recomendaciones y próximos mantenimientos.' },
  { question: '¿Atienden varias sucursales o equipos?', answer: 'Sí. Podemos organizar atención por lote, prioridad por operación y calendario de mantenimiento para reducir paros.' },
  { question: '¿Trabajan por póliza?', answer: 'Sí. Podemos estructurar pólizas mensuales, visitas programadas o soporte bajo demanda según volumen de equipos y urgencia.' },
  { question: '¿Qué zonas cubren?', answer: 'Atendemos Cancún Centro, Zona Hotelera, Av. Tulum, Bonampak, Puerto Cancún, Cumbres, Huayacán, Bonfil, Aeropuerto y Parque Industrial.' },
];

const b2bService = ({
  slug,
  label,
  keyword,
  hook,
  sectors,
  problems,
  relatedSlugs,
  faqSector,
  h1,
  metaTitle,
  metaDescription,
}: {
  slug: string;
  label: string;
  keyword: string;
  hook: string;
  sectors: string[];
  problems: { problem: string; solution: string }[];
  relatedSlugs: string[];
  faqSector?: string;
  h1?: string;
  metaTitle?: string;
  metaDescription?: string;
}): ServiceItem => ({
  slug,
  label,
  seoKeyword: keyword,
  h1,
  metaTitle,
  metaDescription,
  hook,
  intro: `${label} en Cancún con enfoque operativo: menos paros, mejor control de tickets, evidencia clara y soporte técnico para equipos críticos del negocio.`,
  bullets: ['Atención por ticket', 'Reportes para administración', 'Soporte a PC, laptop, impresora, red y WiFi', 'CFDI y seguimiento'],
  fromPrice: 'Cotización',
  eta: 'Según alcance',
  warranty: 'Acuerdo por servicio o póliza',
  whyUs: [
    { icon: 'fa-clipboard-list', title: 'Tickets y trazabilidad', desc: 'Registramos equipo, falla, prioridad, diagnóstico, costo y cierre para dar seguimiento real.' },
    { icon: 'fa-building-shield', title: 'Operación primero', desc: 'Priorizamos equipos que detienen caja, recepción, administración, reservas, cocina o producción.' },
    { icon: 'fa-file-invoice', title: 'CFDI y reportes', desc: 'Podemos documentar servicios, recomendaciones, equipos atendidos y próximos mantenimientos.' },
    { icon: 'fa-map-location-dot', title: 'Cobertura Cancún', desc: 'Atendemos Zona Hotelera, Centro, Av. Tulum, Bonampak, Puerto Cancún, Cumbres, Huayacán, Bonfil, Aeropuerto y Parque Industrial.' },
  ],
  process: [
    { title: 'Levantamiento', desc: 'Identificamos cantidad de equipos, áreas críticas, horarios, red, impresoras, usuarios y urgencias.' },
    { title: 'Diagnóstico operativo', desc: 'Revisamos puntos de falla: computadoras, laptops, impresoras, WiFi, respaldos, energía, software y usuarios.' },
    { title: 'Plan de acción', desc: 'Definimos prioridad, visita, cotización, refacciones, póliza o mantenimiento por lote.' },
    { title: 'Cierre y reporte', desc: 'Entregamos resumen de trabajos, evidencia, recomendaciones y próximos pasos.' },
  ],
  commonProblems: problems,
  compatibleBrands: sectors,
  faqs: b2bFaqs(faqSector || label.toLowerCase()),
  relatedSlugs,
});

export const b2bCategory: ServiceCategory = {
  id: 'b2b',
  slug: 'b2b',
  title: 'B2B',
  icon: 'fa-building-shield',
  blurb: 'Empresas / Hoteles / Oficinas',
  heroBg: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
  services: [
    {
      slug: 'soporte-ti-empresas',
      label: 'Soporte TI para empresas',
      customUrl: '/empresas',
      seoKeyword: 'Soporte TI para empresas en Cancún',
      intro: 'Mesa de ayuda, mantenimiento preventivo, reportes y soporte para oficinas, hoteles y negocios en Cancún.',
      bullets: ['Atención por ticket', 'Reportes para administración', 'Soporte a equipos, red e impresoras'],
    },
    {
      slug: 'mantenimiento-preventivo-pc-empresas',
      label: 'Mantenimiento preventivo para empresas',
      customUrl: '/servicios/mantenimiento-preventivo-pc-empresas',
      seoKeyword: 'Mantenimiento preventivo de PC para empresas en Cancún',
      intro: 'Limpieza, diagnóstico, rendimiento, respaldos y revisión por lote para computadoras empresariales.',
      bullets: ['Atención por equipo o lote', 'Diagnóstico de hardware y Windows', 'Reporte y prioridades de operación'],
    },
    b2bService({
      slug: 'soporte-hoteles',
      label: 'Soporte TI para hoteles',
      keyword: 'Soporte TI para hoteles en Cancún',
      hook: 'Soporte para recepción, administración, reservas, impresoras, laptops, PCs, WiFi operativo y equipos de hotel en Zona Hotelera y Cancún.',
      sectors: ['Hoteles', 'Recepción', 'Reservas', 'Administración', 'Zona Hotelera', 'Puerto Cancún'],
      problems: [
        { problem: 'Equipo de recepción falla', solution: 'Priorizamos diagnóstico, respaldo, reemplazo temporal o reparación para no detener check-in.' },
        { problem: 'Impresora de administración no imprime', solution: 'Revisamos red, drivers, tóner, cola, rodillos y configuración multiusuario.' },
        { problem: 'WiFi o red interna intermitente', solution: 'Revisamos router, switches, cableado, IP, saturación y equipos conectados.' },
        { problem: 'Mantenimiento por lote', solution: 'Organizamos calendario por áreas para no afectar operación.' },
      ],
      relatedSlugs: ['polizas-mantenimiento', 'mantenimiento-flotilla', 'soporte-oficinas', 'wifi-empresarial'],
    }),
    b2bService({
      slug: 'soporte-oficinas',
      label: 'Soporte TI para oficinas',
      keyword: 'Soporte TI para oficinas en Cancún',
      hook: 'Mantenimiento, reparación, Windows, impresoras, red, respaldos y soporte por ticket para oficinas en Cancún Centro, Bonampak y Av. Tulum.',
      sectors: ['Oficinas', 'Despachos', 'Administración', 'Contabilidad', 'Av. Tulum', 'Bonampak'],
      problems: [
        { problem: 'PC lenta o con Windows dañado', solution: 'Diagnosticamos disco, RAM, virus, Windows y posibilidad de SSD.' },
        { problem: 'Usuarios no pueden imprimir', solution: 'Configuramos impresora, red, permisos, cola y drivers por equipo.' },
        { problem: 'Equipos sin mantenimiento', solution: 'Planeamos limpieza, respaldo, actualizaciones y control preventivo.' },
        { problem: 'Falta seguimiento', solution: 'Usamos tickets y reportes para que administración vea estado y costos.' },
      ],
      relatedSlugs: ['polizas-mantenimiento', 'mantenimiento-flotilla', 'wifi-empresarial', 'soporte-restaurantes'],
      faqSector: 'oficinas',
      metaTitle: 'Soporte TI para oficinas en Cancún | Red, impresoras y Windows',
      metaDescription: 'Soporte TI para oficinas en Cancún con diagnóstico de PCs, laptops, impresoras, red, Windows y respaldos. Atención local para administración y operación.',
    }),
    b2bService({
      slug: 'soporte-restaurantes',
      label: 'Soporte TI para restaurantes',
      keyword: 'Soporte TI para restaurantes en Cancún',
      hook: 'Soporte para equipos de caja, laptops, impresoras, WiFi, red, administración y operación en restaurantes de Cancún.',
      sectors: ['Restaurantes', 'Cajas', 'Administración', 'Cocina', 'Centro', 'Zona Hotelera'],
      problems: [
        { problem: 'Caja o equipo administrativo falla', solution: 'Priorizamos equipos que detienen operación y ventas.' },
        { problem: 'Impresora no imprime comandas o tickets', solution: 'Revisamos conexión, driver, cola, red, papel, rodillos e insumos.' },
        { problem: 'WiFi inestable', solution: 'Revisamos cobertura, router, saturación y separación entre clientes y operación.' },
        { problem: 'Equipos con grasa/polvo/calor', solution: 'Mantenimiento preventivo para ambientes de cocina y alto uso.' },
      ],
      relatedSlugs: ['soporte-oficinas', 'wifi-empresarial', 'polizas-mantenimiento', 'mantenimiento-flotilla'],
    }),
    b2bService({
      slug: 'soporte-agencias',
      label: 'Soporte TI para agencias',
      keyword: 'Soporte TI para agencias en Cancún',
      hook: 'Soporte para agencias de viaje, tours, inmobiliarias y equipos de ventas que dependen de laptops, internet, impresoras y archivos.',
      sectors: ['Agencias de viaje', 'Tours', 'Inmobiliarias', 'Ventas', 'Puerto Cancún', 'Cumbres'],
      problems: [
        { problem: 'Laptops de ventas fallan', solution: 'Revisamos carga, batería, pantalla, Windows, rendimiento y respaldo.' },
        { problem: 'Archivos o cotizaciones en riesgo', solution: 'Priorizamos respaldo, recuperación de datos y organización de información crítica.' },
        { problem: 'Internet o WiFi afecta ventas', solution: 'Revisamos red, router, cobertura, configuración y equipos conectados.' },
        { problem: 'Impresiones de documentos fallan', solution: 'Solucionamos drivers, red, tóner/tinta, cola y mantenimiento de impresora.' },
      ],
      relatedSlugs: ['wifi-empresarial', 'soporte-oficinas', 'polizas-mantenimiento', 'mantenimiento-flotilla'],
    }),
    b2bService({
      slug: 'polizas-mantenimiento',
      label: 'Pólizas de mantenimiento TI',
      keyword: 'Pólizas de mantenimiento TI en Cancún',
      hook: 'Pólizas para empresas que necesitan mantenimiento preventivo, soporte por ticket, reportes, CFDI y atención programada.',
      sectors: ['Póliza mensual', 'Visitas programadas', 'CFDI', 'Reportes', 'Hoteles', 'Oficinas', 'Restaurantes'],
      problems: [
        { problem: 'Se atiende todo hasta que falla', solution: 'Creamos calendario preventivo para reducir urgencias y paros.' },
        { problem: 'No hay control de equipos', solution: 'Levantamos inventario, estado, prioridad y recomendaciones por equipo.' },
        { problem: 'Gastos no documentados', solution: 'Entregamos reporte y CFDI para administración.' },
        { problem: 'Muchos equipos sin seguimiento', solution: 'Usamos tickets y prioridades por área.' },
      ],
      relatedSlugs: ['mantenimiento-flotilla', 'soporte-hoteles', 'soporte-oficinas', 'wifi-empresarial'],
      h1: 'Mantenimiento preventivo TI en Cancun',
      metaTitle: 'Mantenimiento preventivo TI en Cancun | Polizas para empresas',
      metaDescription: 'Mantenimiento preventivo TI en Cancun para empresas, hoteles, oficinas y restaurantes. Polizas con visitas programadas, tickets, inventario, reportes, CFDI y soporte local.',
    }),
    b2bService({
      slug: 'mantenimiento-flotilla',
      label: 'Mantenimiento de flotilla',
      keyword: 'Mantenimiento de flotilla de computadoras en Cancún',
      hook: 'Mantenimiento por lote para PCs, laptops e impresoras de empresas, con diagnóstico, limpieza, optimización, respaldo y reporte.',
      sectors: ['Flotillas de laptops', 'PCs de oficina', 'Impresoras', 'Administración', 'Parque Industrial', 'Aeropuerto'],
      problems: [
        { problem: 'Muchos equipos lentos', solution: 'Revisamos SSD/RAM, Windows, virus, temperatura y mantenimiento por prioridad.' },
        { problem: 'Equipos sin limpieza', solution: 'Programamos limpieza interna, revisión térmica y pruebas por lote.' },
        { problem: 'Riesgo de pérdida de datos', solution: 'Revisamos discos, respaldos y equipos críticos antes de intervenir.' },
        { problem: 'Operación no puede parar', solution: 'Planificamos por horarios, áreas y prioridades.' },
      ],
      relatedSlugs: ['polizas-mantenimiento', 'soporte-oficinas', 'soporte-hoteles', 'wifi-empresarial'],
    }),
    b2bService({
      slug: 'wifi-empresarial',
      label: 'WiFi y red empresarial',
      keyword: 'WiFi empresarial en Cancún',
      hook: 'Diagnóstico y configuración de red, WiFi, routers, switches, impresoras de red y equipos conectados para negocios.',
      sectors: ['WiFi empresarial', 'Routers', 'Switches', 'Impresoras de red', 'Oficinas', 'Restaurantes', 'Hoteles'],
      problems: [
        { problem: 'WiFi se cae o va lento', solution: 'Revisamos cobertura, saturación, ubicación, canal, router y cantidad de dispositivos.' },
        { problem: 'Impresora de red no aparece', solution: 'Configuramos IP, driver, permisos, cola y acceso por usuario.' },
        { problem: 'Clientes y operación comparten red', solution: 'Recomendamos separación de redes para estabilidad y seguridad.' },
        { problem: 'Cableado o switches fallan', solution: 'Diagnosticamos puntos, switches, puertos, energía y equipos conectados.' },
      ],
      relatedSlugs: ['soporte-oficinas', 'soporte-restaurantes', 'soporte-hoteles', 'polizas-mantenimiento'],
      faqSector: 'empresarial',
      metaTitle: 'WiFi empresarial en Cancún | Red, impresoras y cobertura',
      metaDescription: 'WiFi empresarial en Cancún para oficinas y negocios. Revisamos red, cobertura, impresoras, routers, switches y equipos conectados con diagnóstico local.',
    }),
  ],
};
