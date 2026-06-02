import type { ServiceCategory } from './types';

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
          { question: `¿Atienden impresoras para oficina o negocio?`, answer: `Sí, atendemos impresoras domásticas, escolares, de oficina y negocios en Cancún. En equipos de alto uso también revisamos volumen de impresión, tipo de insumo y mantenimiento preventivo para reducir atascos, manchas y fallas recurrentes.` },
        ],
        relatedSlugs: ['mantenimiento', 'atascos', 'conectividad', 'diagnostico'],
      },
      { slug: 'atascos',            label: 'Reparación de atascos',        intro: 'Papel atascado, sensores rotos o rodillos sucios  -  solucionamos para que vuelva a alimentar.',         bullets: ['Limpieza/sustitución de rodillos', 'Calibración de sensores', 'Test continuo 50 hojas'],                fromPrice: '$450 MXN', eta: '24-48 h' },
      { slug: 'rodillos',           label: 'Rodillos / alimentación',      intro: 'Rodillos gastados que ya no agarran el papel. Los cambiamos por nuevos.',                              bullets: ['Rodillos OEM', 'Limpieza del trayecto del papel', 'Garantía 3 meses'],                                    fromPrice: '$750 MXN', eta: '2-4 días' },
      { slug: 'conectividad',       label: 'Conectividad / configuración', intro: 'Configuramos tu impresora WiFi, Ethernet o USB en cualquier dispositivo.',                              bullets: ['Configuración WiFi / IP fija', 'Drivers en PC, Mac o móvil', 'Pruebas con cada dispositivo'],            fromPrice: '$550 MXN', eta: '1-2 h' },
      { slug: 'diagnostico',        label: 'Diagnóstico',                  intro: 'Revisamos qué tiene tu impresora y te damos cotización sin costo.',                                     bullets: ['Test eléctrico y mecánico', 'Revisión de cabezales y software', 'Reporte por escrito'],                  fromPrice: 'GRATIS',    eta: '1 h' },
    ],
  };
