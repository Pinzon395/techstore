import type { ServiceCategory, ServiceItem } from './types';

const tabletFaqs = (topic: string) => [
  { question: `¿Reparan ${topic} en Cancún?`, answer: `Sí. Revisamos ${topic} por modelo, síntoma, golpe, humedad y disponibilidad de pieza antes de cotizar.` },
  { question: '¿La reparación borra mis datos?', answer: 'Una reparación física normalmente no borra información. Si se requiere software o restauración, te avisamos antes.' },
  { question: '¿Cuánto tarda?', answer: 'Depende de modelo y pieza. Fallas comunes pueden tomar 24 a 72 horas si hay refacción; placa o humedad puede requerir más pruebas.' },
  { question: '¿Conviene reparar una tablet?', answer: 'Te lo decimos comparando costo, antigüedad, valor del equipo, datos importantes y disponibilidad de refacciones.' },
  { question: '¿Dan garantía?', answer: 'Sí, por escrito sobre la reparación realizada cuando aplica.' },
];

const tabletService = ({
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
  intro: `${label} en Cancún para iPad, Samsung Tab, Lenovo Tab, Huawei MatePad y tablets Android con diagnóstico antes de cambiar piezas.`,
  bullets: ['Diagnóstico por modelo', 'Pantalla, batería, carga, software y humedad', 'Cotización antes de refacción', 'Garantía por escrito'],
  fromPrice: '$550 MXN',
  eta: '24-72 h',
  warranty: 'Garantía por escrito según reparación',
  whyUs: [
    { icon: 'fa-tablet-screen-button', title: 'Modelo exacto', desc: 'Confirmamos generación, número de modelo y compatibilidad antes de pedir pantalla, batería o puerto.' },
    { icon: 'fa-stethoscope', title: 'Diagnóstico real', desc: 'Separamos falla de pantalla, touch, batería, carga, software, humedad o placa.' },
    { icon: 'fa-shield-halved', title: 'Datos protegidos', desc: 'Avisamos antes de cualquier proceso que pueda afectar información.' },
    { icon: 'fa-location-dot', title: 'Servicio Cancún', desc: 'Atendemos Cancún Centro, Zona Hotelera, Cumbres, Huayacán, Bonampak y alrededores.' },
  ],
  process: [
    { title: 'Recepción', desc: 'Registramos modelo, falla, golpes, humedad, cargador, accesorios y estado físico.' },
    { title: 'Pruebas', desc: 'Revisamos touch, display, carga, batería, cámaras, WiFi, audio, sistema y consumo.' },
    { title: 'Cotización', desc: 'Te indicamos pieza, tiempo, garantía, riesgo y si conviene reparar.' },
    { title: 'Prueba final', desc: 'Validamos funciones principales antes de entregar.' },
  ],
  commonProblems: problems,
  compatibleBrands: ['iPad', 'iPad Air', 'iPad Pro', 'iPad mini', 'Samsung Tab', 'Lenovo Tab', 'Huawei MatePad', 'Xiaomi Pad'],
  faqs: tabletFaqs(label.toLowerCase()),
  relatedSlugs,
});

export const tabletCategory: ServiceCategory = {
  id: 'tablet',
  slug: 'tablet',
  title: 'Tablet',
  icon: 'fa-tablet-screen-button',
  blurb: 'iPad / Android Tab',
  heroBg: 'linear-gradient(135deg, #0f172a 0%, #0e7490 100%)',
  services: [
    tabletService({
      slug: 'reparacion-ipad',
      label: 'Reparación iPad',
      keyword: 'Reparación iPad en Cancún',
      hook: 'Diagnóstico y reparación de iPad con pantalla rota, batería dañada, carga fallando, humedad, WiFi, software o equipo que no prende.',
      problems: [
        { problem: 'iPad no prende', solution: 'Revisamos carga, batería, pantalla, consumo, software y placa.' },
        { problem: 'Pantalla rota o touch fallando', solution: 'Confirmamos si requiere cristal, touch, display o módulo completo.' },
        { problem: 'No carga o falso contacto', solution: 'Probamos cargador, puerto, batería, flex y consumo.' },
        { problem: 'Se mojó', solution: 'No lo cargues; revisamos corrosión y placa antes de energizar.' },
      ],
      relatedSlugs: ['cambio-pantalla-ipad', 'cambio-bateria-ipad', 'centro-carga-tablet', 'tablet-no-prende'],
    }),
    tabletService({
      slug: 'cambio-pantalla-ipad',
      label: 'Cambio pantalla iPad',
      keyword: 'Cambio de pantalla iPad en Cancún',
      hook: 'Cambio de pantalla, cristal o touch de iPad según generación, con revisión de display, marco, golpe y compatibilidad.',
      problems: [
        { problem: 'Cristal roto pero se ve imagen', solution: 'Puede requerir cristal/touch según modelo y generación.' },
        { problem: 'Pantalla negra o con líneas', solution: 'Revisamos display, flex, golpe y placa antes de cotizar.' },
        { problem: 'Touch no responde', solution: 'Probamos digitizer, flex, software y humedad.' },
        { problem: 'Marco doblado', solution: 'Evaluamos si afecta instalación y garantía de la pantalla.' },
      ],
      relatedSlugs: ['reparacion-ipad', 'tablet-no-prende', 'centro-carga-tablet', 'diagnostico-tablet'],
    }),
    tabletService({
      slug: 'cambio-bateria-ipad',
      label: 'Cambio batería iPad',
      keyword: 'Cambio de batería iPad en Cancún',
      hook: 'Reemplazo de batería para iPad que se descarga rápido, se apaga, no carga, se calienta o tiene batería inflada.',
      problems: [
        { problem: 'Se descarga rápido', solution: 'Revisamos salud, consumo, apps, carga y temperatura.' },
        { problem: 'Batería inflada', solution: 'Conviene dejar de usarlo para evitar presión en pantalla o carcasa.' },
        { problem: 'No carga al 100%', solution: 'Probamos cargador, puerto, batería y sistema.' },
        { problem: 'Se apaga con porcentaje', solution: 'Puede ser batería degradada o consumo anormal.' },
      ],
      relatedSlugs: ['reparacion-ipad', 'centro-carga-tablet', 'tablet-no-prende', 'diagnostico-tablet'],
    }),
    tabletService({
      slug: 'reparacion-tablet-samsung',
      label: 'Reparación Samsung Tab',
      keyword: 'Reparación Samsung Tab en Cancún',
      hook: 'Servicio técnico para Samsung Galaxy Tab con pantalla, batería, carga, software, humedad o fallas de encendido.',
      problems: [
        { problem: 'Samsung Tab no carga', solution: 'Revisamos USB-C, batería, cargador, consumo y humedad.' },
        { problem: 'Pantalla rota', solution: 'Cotizamos módulo compatible por modelo exacto.' },
        { problem: 'Se queda en logo', solution: 'Revisamos software, memoria, batería y posible placa.' },
        { problem: 'No conecta WiFi', solution: 'Probamos configuración, software, antena y placa.' },
      ],
      relatedSlugs: ['centro-carga-tablet', 'tablet-no-prende', 'cambio-pantalla-ipad', 'diagnostico-tablet'],
    }),
    tabletService({
      slug: 'centro-carga-tablet',
      label: 'Centro de carga tablet',
      keyword: 'Centro de carga tablet en Cancún',
      hook: 'Reparamos tablets que no cargan, cargan lento, hacen falso contacto o muestran humedad en el puerto.',
      problems: [
        { problem: 'Hay que mover el cable', solution: 'Puede ser puerto flojo, suciedad, pines dañados o flex.' },
        { problem: 'Carga lento', solution: 'Revisamos cargador, cable, puerto, batería y consumo.' },
        { problem: 'Dice humedad detectada', solution: 'No conviene conectar cargador hasta revisar corrosión.' },
        { problem: 'No detecta cargador', solution: 'Probamos puerto, batería, flex, placa y consumo.' },
      ],
      relatedSlugs: ['tablet-no-prende', 'cambio-bateria-ipad', 'reparacion-ipad', 'diagnostico-tablet'],
    }),
    tabletService({
      slug: 'tablet-no-prende',
      label: 'Tablet no prende',
      keyword: 'Tablet no prende en Cancún',
      hook: 'Diagnóstico para tablet o iPad que no enciende, pantalla negra, no carga, se mojó o se queda en logo.',
      problems: [
        { problem: 'Pantalla negra', solution: 'Revisamos carga, batería, pantalla, consumo y software.' },
        { problem: 'No carga ni vibra', solution: 'Probamos cargador, puerto, batería, corto y placa.' },
        { problem: 'Se queda en logo', solution: 'Revisamos software, almacenamiento y batería antes de restaurar.' },
        { problem: 'Se mojó y no prende', solution: 'No lo cargues; revisamos humedad y corrosión primero.' },
      ],
      relatedSlugs: ['diagnostico-tablet', 'centro-carga-tablet', 'cambio-bateria-ipad', 'reparacion-ipad'],
    }),
    tabletService({
      slug: 'diagnostico-tablet',
      label: 'Diagnóstico tablet',
      keyword: 'Diagnóstico tablet en Cancún',
      hook: 'Revisión de iPad y tablets Android para saber si conviene reparar pantalla, batería, carga, software, humedad o placa.',
      problems: [
        { problem: 'No sé qué tiene', solution: 'Probamos funciones principales y te damos ruta clara antes de cotizar.' },
        { problem: 'Ya la revisaron antes', solution: 'Evaluamos ensamble, conectores, piezas previas y síntomas actuales.' },
        { problem: 'Quiero recuperar datos', solution: 'Priorizamos acceso y estabilidad antes de restaurar o formatear.' },
        { problem: 'No sé si conviene reparar', solution: 'Comparamos costo, valor, uso y riesgo para decidir.' },
      ],
      relatedSlugs: ['reparacion-ipad', 'tablet-no-prende', 'centro-carga-tablet', 'cambio-pantalla-ipad'],
    }),
  ],
};
