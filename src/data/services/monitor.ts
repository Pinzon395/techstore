import type { ServiceCategory, ServiceItem } from './types';

const monitorFaqs = (topic: string) => [
  { question: `¿Reparan ${topic} en Cancún?`, answer: `Sí. Revisamos ${topic} con pruebas de energía, video, panel, fuente, puertos, cables y configuración antes de cotizar.` },
  { question: '¿Conviene reparar un monitor?', answer: 'Depende del tamaño, panel, costo de pieza y valor del equipo. Te decimos si conviene reparar o reemplazar.' },
  { question: '¿Atienden monitores gamer?', answer: 'Sí, revisamos monitores gamer, ultrawide, oficina, CCTV y pantallas usadas como display de trabajo.' },
  { question: '¿Cuánto tarda?', answer: 'Un diagnóstico puede tomar 24 a 72 horas según falla. Fuente, puertos o placa pueden requerir pruebas adicionales.' },
  { question: '¿Dan garantía?', answer: 'Sí, por escrito sobre la intervención realizada cuando aplica.' },
];

const monitorService = ({
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
  intro: `${label} en Cancún para monitores de oficina, gamer, ultrawide y pantallas con fallas de energía, imagen, puertos o panel.`,
  bullets: ['Prueba con varios cables y equipos', 'Revisión de fuente, HDMI/DP, placa y panel', 'Cotización antes de reparar', 'Garantía por escrito'],
  fromPrice: '$550 MXN',
  eta: '24-72 h',
  warranty: 'Garantía por escrito según reparación',
  whyUs: [
    { icon: 'fa-display', title: 'Prueba completa', desc: 'Probamos monitor, cable, puerto, resolución, fuente, backlight y placa antes de culpar el panel.' },
    { icon: 'fa-plug-circle-bolt', title: 'Energía y señal', desc: 'Separamos fallas de fuente, entrada HDMI/DP, tarjeta lógica, panel o configuración.' },
    { icon: 'fa-gamepad', title: 'Monitores gamer', desc: 'Revisamos alta tasa de refresco, DisplayPort, HDMI, flicker, líneas, ghosting y apagados.' },
    { icon: 'fa-location-dot', title: 'Cancún local', desc: 'Atendemos equipos de oficina, gamer, hoteles, cámaras, negocios y particulares.' },
  ],
  process: [
    { title: 'Prueba externa', desc: 'Probamos con cables, laptop/PC y entradas distintas para descartar fuente externa.' },
    { title: 'Diagnóstico interno', desc: 'Revisamos fuente, placa, puertos, capacitores, backlight y panel si aplica.' },
    { title: 'Cotización', desc: 'Te explicamos si conviene reparación, puerto, fuente, placa o reemplazo.' },
    { title: 'Prueba final', desc: 'Validamos imagen, brillo, resolución, entradas y estabilidad antes de entregar.' },
  ],
  commonProblems: problems,
  compatibleBrands: ['Samsung', 'LG', 'Dell', 'HP', 'AOC', 'Acer', 'Asus', 'MSI', 'BenQ', 'ViewSonic'],
  faqs: monitorFaqs(label.toLowerCase()),
  relatedSlugs,
});

export const monitorCategory: ServiceCategory = {
  id: 'monitor',
  slug: 'monitor',
  title: 'Monitor',
  icon: 'fa-display',
  blurb: 'Gamer / Oficina / Ultrawide',
  heroBg: 'linear-gradient(135deg, #111827 0%, #2563eb 100%)',
  services: [
    monitorService({
      slug: 'diagnostico-monitor',
      label: 'Diagnóstico monitor',
      keyword: 'Diagnóstico de monitor en Cancún',
      hook: 'Revisión de monitor sin imagen, sin energía, con líneas, parpadeo, HDMI fallando, DisplayPort o apagados intermitentes.',
      problems: [
        { problem: 'No sé si falla el monitor o la PC', solution: 'Probamos con otra fuente de video, cable y entrada para separar la falla.' },
        { problem: 'Enciende pero no da imagen', solution: 'Revisamos backlight, panel, placa, entrada y configuración.' },
        { problem: 'Se apaga solo', solution: 'Puede ser fuente, capacitores, temperatura o placa.' },
        { problem: 'Falla intermitente', solution: 'Hacemos pruebas prolongadas para reproducir la falla.' },
      ],
      relatedSlugs: ['monitor-no-enciende', 'monitor-no-da-imagen', 'reparacion-hdmi-monitor', 'fuente-monitor'],
    }),
    monitorService({
      slug: 'monitor-no-enciende',
      label: 'Monitor no enciende',
      keyword: 'Monitor no enciende en Cancún',
      hook: 'Diagnóstico para monitor que no prende, no da LED, huele a quemado, se apaga o falla después de apagón.',
      problems: [
        { problem: 'No prende ningún LED', solution: 'Revisamos cable, fuente, botón, placa y consumo.' },
        { problem: 'Prende y se apaga', solution: 'Puede ser fuente, capacitores, backlight o placa.' },
        { problem: 'Falló después de apagón', solution: 'Revisamos fuente, fusibles, protección y placa.' },
        { problem: 'Olor a quemado', solution: 'No lo conectes más; se revisa fuente y componentes dañados.' },
      ],
      relatedSlugs: ['fuente-monitor', 'diagnostico-monitor', 'monitor-no-da-imagen'],
    }),
    monitorService({
      slug: 'monitor-no-da-imagen',
      label: 'Monitor no da imagen',
      keyword: 'Monitor no da imagen en Cancún',
      hook: 'Solución para monitor con pantalla negra, luz encendida, sin señal, imagen intermitente, líneas o brillo muy bajo.',
      problems: [
        { problem: 'Dice sin señal', solution: 'Probamos cable, puerto, PC/laptop, resolución y entrada seleccionada.' },
        { problem: 'Pantalla negra con LED', solution: 'Revisamos backlight, panel, placa, fuente y señal.' },
        { problem: 'Imagen se corta', solution: 'Puede ser HDMI/DP, cable, soldadura, placa o fuente.' },
        { problem: 'Brillo muy bajo', solution: 'Revisamos backlight, alimentación, panel y configuración.' },
      ],
      relatedSlugs: ['reparacion-hdmi-monitor', 'diagnostico-monitor', 'fuente-monitor'],
    }),
    monitorService({
      slug: 'reparacion-hdmi-monitor',
      label: 'Reparación HDMI monitor',
      keyword: 'Reparación HDMI de monitor en Cancún',
      hook: 'Revisión y reparación de puerto HDMI, DisplayPort o entrada dañada en monitores que no detectan señal.',
      problems: [
        { problem: 'Puerto HDMI flojo', solution: 'Revisamos conector, soldadura, pistas y placa antes de cotizar.' },
        { problem: 'Solo funciona con cierto cable', solution: 'Probamos entrada, cable, resolución y desgaste del puerto.' },
        { problem: 'DisplayPort no detecta', solution: 'Revisamos entrada, configuración, cable y señal.' },
        { problem: 'Se dañó por jalón', solution: 'Evaluamos si hay pistas levantadas o daño de placa.' },
      ],
      relatedSlugs: ['monitor-no-da-imagen', 'diagnostico-monitor', 'monitor-no-enciende'],
    }),
    monitorService({
      slug: 'fuente-monitor',
      label: 'Fuente de monitor',
      keyword: 'Fuente de monitor en Cancún',
      hook: 'Diagnóstico de fuente interna o adaptador externo para monitores que no prenden, parpadean o se apagan.',
      problems: [
        { problem: 'Adaptador no entrega voltaje', solution: 'Probamos cargador/fuente externa y consumo del monitor.' },
        { problem: 'Capacitores dañados', solution: 'Revisamos fuente interna y componentes visibles.' },
        { problem: 'Se apaga bajo uso', solution: 'Puede ser fuente inestable, temperatura o placa.' },
        { problem: 'Ruido o olor', solution: 'No conviene seguir conectándolo hasta diagnosticar.' },
      ],
      relatedSlugs: ['monitor-no-enciende', 'diagnostico-monitor', 'monitor-no-da-imagen'],
    }),
  ],
};
