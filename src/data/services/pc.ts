import type { ServiceCategory, ServiceItem } from './types';

const pcProcess = [
  { title: 'Recepción y síntoma', desc: 'Registramos si no enciende, se reinicia, va lenta, no da video, marca pantalla azul o falla bajo carga.' },
  { title: 'Prueba de energía y arranque', desc: 'Revisamos fuente, botón, placa madre, RAM, GPU, almacenamiento, cableado y señales de corto.' },
  { title: 'Diagnóstico por componente', desc: 'Probamos piezas críticas de forma separada para ubicar causa real antes de recomendar compras.' },
  { title: 'Cotización y recomendación', desc: 'Te explicamos si conviene reparar, reemplazar, actualizar, formatear o no invertir más.' },
  { title: 'Pruebas de estabilidad', desc: 'Validamos temperatura, carga, Windows, rendimiento y estabilidad antes de entregar.' },
];

const pcFaqs = (topic: string) => [
  { question: `¿Cuánto cuesta ${topic} en Cancún?`, answer: 'Depende del componente, disponibilidad de pieza y causa real. Primero diagnosticamos y luego enviamos cotización clara antes de reparar.' },
  { question: '¿El diagnóstico es gratis?', answer: 'Sí, el diagnóstico inicial de PC es gratis. Fallas intermitentes o pruebas largas pueden requerir más tiempo para confirmar la causa.' },
  { question: '¿Me dicen si conviene reparar o comprar otra PC?', answer: 'Sí. Comparamos costo, antigüedad, uso, disponibilidad de piezas y rendimiento esperado para recomendar la mejor ruta.' },
  { question: '¿Puedo llevar una PC gamer ensamblada?', answer: 'Sí. Revisamos PC gamer, equipos de oficina, workstations, mini PC y equipos ensamblados por piezas.' },
  { question: '¿Pierdo mis archivos?', answer: 'No en reparaciones físicas normales. Si hay riesgo en disco, Windows o recuperación de datos, te avisamos antes de tocar información.' },
  { question: '¿Dan garantía?', answer: 'Sí, por escrito sobre la reparación o instalación realizada. No cubre variaciones eléctricas, humedad posterior, golpes o piezas no intervenidas.' },
];

const pcClusterService = ({
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
    { icon: 'fa-stethoscope', title: 'Diagnóstico por pruebas', desc: 'No cambiamos piezas por intuición. Probamos fuente, RAM, disco, GPU, placa, Windows y temperatura.' },
    { icon: 'fa-microchip', title: 'Hardware real', desc: 'Trabajamos PC gamer, oficina, workstations y equipos ensamblados con revisión de compatibilidad.' },
    { icon: 'fa-file-shield', title: 'Datos primero', desc: 'Si el disco está en riesgo, priorizamos respaldo o recuperación antes de formatear o clonar.' },
    { icon: 'fa-location-dot', title: 'Servicio local Cancún', desc: 'Atendemos Cancún Centro, Avenida Tulum, Bonampak, Puerto Cancún, Cumbres, Huayacán, Bonfil y Zona Hotelera.' },
  ],
  process: pcProcess,
  commonProblems: problems,
  compatibleBrands: ['PC gamer', 'PC de oficina', 'PC ensamblada', 'Workstation', 'HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'Mini PC'],
  faqs: pcFaqs(label.toLowerCase()),
  relatedSlugs,
});

const PC_CLUSTER_SERVICES: ServiceItem[] = [
  pcClusterService({
    slug: 'no-enciende',
    label: 'PC no enciende',
    keyword: 'PC no enciende Cancún',
    hook: 'Diagnóstico para PC que no prende, no da luces, prende ventiladores sin imagen, se apaga al instante o no responde al botón.',
    intro: 'Revisamos fuente de poder, placa madre, botón, RAM, GPU, almacenamiento, cableado y posibles cortos antes de cambiar piezas.',
    bullets: ['Prueba de fuente y voltajes', 'Revisión de placa, RAM y GPU', 'Diagnóstico de corto o consumo', 'Cotización antes de reparar'],
    problems: [
      { problem: 'No prende ningún LED', solution: 'Probamos cable, fuente, botón, placa madre y corto antes de recomendar reemplazo.' },
      { problem: 'Prenden ventiladores pero no da imagen', solution: 'Revisamos RAM, GPU, BIOS, monitor, cable y salida de video.' },
      { problem: 'Se apaga al instante', solution: 'Puede ser fuente, corto, temperatura, placa o conexión incorrecta.' },
      { problem: 'Olor a quemado', solution: 'Se detiene uso y se revisa fuente, placa y conectores para evitar daño mayor.' },
    ],
    relatedSlugs: ['fuente-poder', 'tarjeta-madre', 'diagnostico', 'recuperacion-datos'],
  }),
  pcClusterService({
    slug: 'fuente-poder',
    label: 'Fuente de poder PC',
    keyword: 'Fuente de poder PC dañada Cancún',
    hook: 'Revisión de fuente de poder para PC que se apaga, no prende, reinicia al jugar, huele a quemado o no soporta la GPU.',
    intro: 'Diagnóstico de PSU ATX, SFX y fuentes de PC gamer/oficina con prueba de voltajes, carga y compatibilidad.',
    bullets: ['Prueba de voltajes y carga', 'Compatibilidad con GPU y placa', 'Revisión de conectores', 'Instalación de fuente nueva'],
    problems: [
      { problem: 'Se reinicia al abrir juegos', solution: 'Puede ser fuente insuficiente o degradada; revisamos consumo real y GPU.' },
      { problem: 'No prende la PC', solution: 'Probamos fuente fuera del equipo y descartamos botón, placa o corto.' },
      { problem: 'Ruido, olor o chispazo', solution: 'No conviene seguir usándola; se revisa por seguridad.' },
      { problem: 'Quiero poner GPU nueva', solution: 'Validamos watts, conectores, eficiencia y espacio antes de instalar.' },
    ],
    relatedSlugs: ['no-enciende', 'tarjeta-video-gpu', 'instalacion-componentes', 'diagnostico'],
  }),
  pcClusterService({
    slug: 'tarjeta-madre',
    label: 'Tarjeta madre PC',
    keyword: 'Reparación tarjeta madre PC Cancún',
    hook: 'Diagnóstico de motherboard para PC sin video, sin arranque, con puertos fallando, RAM no detectada o daño por corto/humedad.',
    intro: 'Revisamos placa madre, BIOS, VRM, sockets, slots RAM/PCIe, conectores, CMOS y señales de daño antes de recomendar reemplazo.',
    bullets: ['Diagnóstico de placa y BIOS', 'Revisión de slots y conectores', 'Pruebas cruzadas de RAM/GPU/CPU', 'Recomendación de reemplazo si conviene'],
    problems: [
      { problem: 'No reconoce RAM', solution: 'Probamos módulos, slots, BIOS y controlador antes de culpar la placa.' },
      { problem: 'No da video', solution: 'Se descarta GPU, RAM, CPU, BIOS, monitor y fuente.' },
      { problem: 'Puertos USB fallan', solution: 'Revisamos headers, controladores, daño físico y sistema.' },
      { problem: 'Daño por humedad o corto', solution: 'Evaluamos si conviene reparación por etapa o reemplazo.' },
    ],
    relatedSlugs: ['no-enciende', 'fuente-poder', 'tarjeta-video-gpu', 'diagnostico'],
  }),
  pcClusterService({
    slug: 'tarjeta-video-gpu',
    label: 'Tarjeta de video GPU',
    keyword: 'Reparación PC gamer Cancún',
    hook: 'Diagnóstico de GPU para PC gamer sin imagen, artefactos, pantallazos, crashes, ventiladores al máximo o bajo rendimiento.',
    intro: 'Revisamos tarjeta de video, drivers, fuente, temperatura, ranura PCIe, cables, monitor y estabilidad bajo carga.',
    bullets: ['Prueba de GPU y drivers', 'Revisión de temperatura y fuente', 'Benchmark y stress test', 'Instalación o cambio de GPU'],
    problems: [
      { problem: 'Artefactos o cuadros en pantalla', solution: 'Puede ser GPU, VRAM, temperatura o driver; se prueba bajo carga.' },
      { problem: 'Juegos se cierran o reinician', solution: 'Revisamos fuente, temperatura, drivers, RAM y GPU.' },
      { problem: 'No da imagen por HDMI/DP', solution: 'Probamos cable, monitor, salida, ranura, BIOS y GPU.' },
      { problem: 'Quiero actualizar GPU', solution: 'Validamos fuente, gabinete, CPU, ventilación y cuello de botella.' },
    ],
    relatedSlugs: ['fuente-poder', 'refrigeracion', 'instalacion-componentes', 'diagnostico'],
  }),
  pcClusterService({
    slug: 'pantalla-azul',
    label: 'Pantalla azul Windows',
    keyword: 'Pantalla azul Windows Cancún',
    hook: 'Solución para pantalla azul, reinicios, errores de Windows, drivers dañados, RAM inestable, disco fallando o temperatura alta.',
    intro: 'Diagnóstico de BSOD en Windows revisando códigos de error, memoria, disco, drivers, actualizaciones, temperatura y hardware.',
    bullets: ['Lectura de errores BSOD', 'Prueba de RAM y SSD/HDD', 'Revisión de drivers y Windows', 'Corrección sin formatear si es posible'],
    problems: [
      { problem: 'Pantalla azul al iniciar', solution: 'Revisamos arranque, disco, drivers y archivos de sistema.' },
      { problem: 'Pantalla azul al jugar', solution: 'Puede ser GPU, RAM, fuente, temperatura o driver.' },
      { problem: 'Error después de actualizar', solution: 'Revisamos controlador, update, restauración y estabilidad.' },
      { problem: 'Reinicios sin mensaje', solution: 'Probamos RAM, fuente, temperatura y visor de eventos.' },
    ],
    relatedSlugs: ['diagnostico', 'upgrade', 'virus-malware', 'recuperacion-datos'],
  }),
  pcClusterService({
    slug: 'recuperacion-datos',
    label: 'Recuperación de datos PC',
    keyword: 'Recuperación de datos PC Cancún',
    hook: 'Recuperamos archivos de PC con Windows dañado, disco lento, SSD que falla, carpetas borradas o equipo que no arranca.',
    intro: 'Servicio de recuperación de información en Cancún para discos duros, SSD, Windows dañado, particiones y respaldo antes de reparar.',
    bullets: ['Prioridad a documentos, fotos y trabajo', 'Diagnóstico de disco y SMART', 'Respaldo antes de formatear', 'Ruta según riesgo del medio'],
    problems: [
      { problem: 'Windows no entra y necesito archivos', solution: 'Se extrae disco o se arranca entorno seguro para respaldar si el medio lo permite.' },
      { problem: 'Disco hace ruido', solution: 'Se detiene uso y se evalúa riesgo; no conviene insistir con encendidos.' },
      { problem: 'Borré archivos importantes', solution: 'Evita guardar más datos. Revisamos posibilidades de recuperación.' },
      { problem: 'SSD no aparece', solution: 'Se revisa conexión, gabinete, placa y estado del SSD.' },
    ],
    relatedSlugs: ['diagnostico', 'formateo', 'no-enciende', 'virus-malware'],
  }),
  pcClusterService({
    slug: 'virus-malware',
    label: 'Virus y malware PC',
    keyword: 'Eliminar virus malware PC Cancún',
    hook: 'Limpieza de PC con virus, anuncios, lentitud, ventanas raras, robo de navegador, programas no deseados o sospecha de infección.',
    intro: 'Eliminación de malware en Cancún con revisión de sistema, navegador, programas de inicio, archivos sospechosos y respaldo.',
    bullets: ['Limpieza de malware y adware', 'Revisión de navegador e inicio', 'Backup antes de cambios críticos', 'Recomendación de protección'],
    problems: [
      { problem: 'Se abren ventanas o anuncios', solution: 'Eliminamos extensiones, adware, tareas programadas y programas sospechosos.' },
      { problem: 'PC muy lenta de repente', solution: 'Revisamos procesos, disco, malware, inicio y estado de Windows.' },
      { problem: 'Antivirus detecta amenazas', solution: 'Limpiamos y revisamos persistencia para que no regrese al reiniciar.' },
      { problem: 'Sospecha de robo de cuentas', solution: 'Te orientamos para cambiar contraseñas y asegurar sesiones después de limpiar.' },
    ],
    relatedSlugs: ['formateo', 'lentitud', 'recuperacion-datos', 'diagnostico'],
  }),
  pcClusterService({
    slug: 'lentitud',
    label: 'PC lenta',
    keyword: 'PC lenta en Cancún',
    hook: 'Diagnóstico para PC lenta al encender, abrir programas, navegar, trabajar con Office, editar o jugar.',
    intro: 'Revisamos si la lentitud viene de disco duro, poca RAM, virus, Windows dañado, temperatura, apps de inicio o hardware viejo.',
    bullets: ['Diagnóstico de cuello de botella', 'SSD/RAM si conviene', 'Limpieza de software y arranque', 'Prueba antes/después'],
    problems: [
      { problem: 'Tarda mucho en encender', solution: 'Suele ser disco mecánico, programas de inicio o Windows dañado.' },
      { problem: 'Se congela con varias pestañas', solution: 'Revisamos RAM, navegador, disco y procesos en segundo plano.' },
      { problem: 'Va lenta después de años', solution: 'Puede requerir SSD, RAM, limpieza o instalación limpia.' },
      { problem: 'Se calienta y baja rendimiento', solution: 'La temperatura puede provocar throttling; revisamos ventilación y pasta.' },
    ],
    relatedSlugs: ['upgrade', 'formateo', 'virus-malware', 'limpieza-profunda'],
  }),
  pcClusterService({
    slug: 'refrigeracion',
    label: 'Refrigeración PC',
    keyword: 'Refrigeración PC gamer Cancún',
    hook: 'Mejora térmica para PC gamer o de trabajo que se calienta, hace ruido, baja FPS, se apaga o necesita cambio de ventiladores/pasta.',
    intro: 'Revisión de flujo de aire, ventiladores, pasta térmica, disipador, AIO, gabinete, polvo y temperaturas en Cancún.',
    bullets: ['Test térmico antes/después', 'Cambio de pasta térmica', 'Ventiladores y flujo de aire', 'Mantenimiento de AIO si aplica'],
    problems: [
      { problem: 'CPU o GPU llegan a temperaturas altas', solution: 'Revisamos polvo, pasta, disipador, flujo de aire y curva de ventiladores.' },
      { problem: 'Ventiladores hacen ruido', solution: 'Puede requerir limpieza, lubricación o reemplazo.' },
      { problem: 'La PC se apaga al jugar', solution: 'Puede ser temperatura, fuente o GPU; se prueba bajo carga.' },
      { problem: 'Quiero gabinete más fresco', solution: 'Recomendamos ventiladores, orientación, presión de aire y cableado.' },
    ],
    relatedSlugs: ['limpieza-profunda', 'tarjeta-video-gpu', 'fuente-poder', 'diagnostico'],
  }),
  pcClusterService({
    slug: 'instalacion-componentes',
    label: 'Instalación de componentes',
    keyword: 'Instalación de componentes PC Cancún',
    hook: 'Instalamos SSD, RAM, GPU, fuente, ventiladores, gabinete, tarjeta WiFi, capturadora o componentes nuevos sin dañar tu PC.',
    intro: 'Servicio de instalación de componentes PC en Cancún con revisión de compatibilidad, cableado, BIOS, drivers y pruebas.',
    bullets: ['Compatibilidad antes de instalar', 'Cableado limpio y seguro', 'Drivers/BIOS si aplica', 'Pruebas de estabilidad'],
    problems: [
      { problem: 'Compré una GPU y no sé si entra', solution: 'Validamos gabinete, fuente, conectores, PCIe y cuello de botella.' },
      { problem: 'Quiero poner SSD sin perder datos', solution: 'Podemos clonar sistema si el disco actual está sano.' },
      { problem: 'RAM nueva no arranca', solution: 'Revisamos compatibilidad, frecuencia, perfil XMP/EXPO, slots y BIOS.' },
      { problem: 'Necesito ordenar cables', solution: 'Mejoramos cableado para flujo de aire y mantenimiento futuro.' },
    ],
    relatedSlugs: ['upgrade', 'fuente-poder', 'tarjeta-video-gpu', 'refrigeracion'],
  }),
];

export const pcCategory: ServiceCategory = {
    id: 'pc',
    slug: 'pc',
    title: 'PC',
    icon: 'fa-desktop',
    blurb: 'Escritorio / Gamer / Oficina',
    heroBg: 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)',
    services: [
      { slug: 'reparacion-general',      label: 'Reparación General',      customUrl: '/reparaciones' },
      { slug: 'ensambles',               label: 'Ensambles PC Gamer',      customUrl: '/ensambles' },
      { slug: 'mantenimiento-preventivo',label: 'Mantenimiento Preventivo',customUrl: '/paquetes' },

      // --- Mantenimiento correctivo (extendida) -------------------------
      {
        slug: 'mantenimiento-correctivo',
        label: 'Mantenimiento correctivo',
        seoKeyword: 'Mantenimiento correctivo de PC en Cancún',
        hook: '¿No enciende, pantalla azul, ruidos extraños o se reinicia sola? Diagnóstico + reparación con garantía y cotización clara antes de tocar.',
        intro: 'Diagnóstico y reparación de fallas: no enciende, pantalla azul, ruidos, lentitud severa. Cotización clara antes de empezar.',
        bullets: ['Diagnóstico hardware y software incluido', 'Reemplazo de componentes con tu autorización previa', 'Pruebas de estabilidad 24h', 'Garantía 30 días sobre la reparación', 'Backup antes de tocar el disco'],
        fromPrice: '$650 MXN', eta: '24-72 h', warranty: '30 días por escrito',
        whyUs: [
          { icon: 'fa-magnifying-glass', title: 'Diagnóstico real', desc: 'No "es la placa" sin pruebas. Test eléctrico + lógico antes de cobrar.' },
          { icon: 'fa-handshake',        title: 'Cotización antes', desc: 'Te cotizamos pieza por pieza. Tú decides qué cambiar.' },
          { icon: 'fa-shield-halved',    title: 'Garantía 30 días', desc: 'Si la falla cubierta reaparece, lo corregimos sin costo.' },
          { icon: 'fa-database',         title: 'Backup primero',   desc: 'Imagen de tu disco antes de cualquier intervención que lo toque.' },
        ],
        process: [
          { title: 'Diagnóstico',  desc: 'Test de fuente, RAM, disco, GPU y placa. Identificamos componente fallido.' },
          { title: 'Cotización',   desc: 'Por WhatsApp con foto del componente y precio de la pieza + mano de obra.' },
          { title: 'Backup',       desc: 'Imagen completa del disco antes de tocar nada que pueda afectarlo.' },
          { title: 'Reparación',   desc: 'Reemplazo de componente fallado con pieza nueva o equivalente.' },
          { title: 'Stress test',  desc: '24h de pruebas (Cinebench + Prime95 + memtest) antes de entregar.' },
        ],
        commonProblems: [
          { problem: 'PC no enciende (sin LED, sin beep)',         solution: 'Diagnóstico de fuente y placa base. Reparación o reemplazo según resultado.' },
          { problem: 'Pantalla azul (BSOD) frecuente',             solution: 'Test de RAM con memtest86 + revisión SMART del disco. Identificamos causa exacta.' },
          { problem: 'Reinicios aleatorios bajo carga',            solution: 'Suele ser fuente de poder degradada o sobrecalentamiento. Lo determinamos.' },
          { problem: 'Ruidos del disco o ventilador',              solution: 'Disco mecánico próximo a fallar  -  migrar a SSD ya. Ventiladores se cambian.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'PCs ensambladas', 'Workstations', 'Servidores pequeños'],
        faqs: [
          { question: `¿Cuánto cuesta una reparación correctiva?`, answer: `La mano de obra inicia desde <strong>$650 MXN</strong>, pero el costo final depende de la falla y piezas necesarias. Primero diagnosticamos fuente, RAM, disco, GPU, placa y temperatura; después te enviamos cotización clara para autorizar.` },
          { question: `¿Y si el costo de la reparación es muy alto?`, answer: `Si el costo se acerca demasiado al valor real de la PC, te lo decimos antes de avanzar. A veces conviene cambiar solo una pieza, hacer upgrade o considerar otro equipo. La recomendación depende de edad, uso y disponibilidad de refacciones.` },
          { question: `¿Cuánto tarda una reparación correctiva?`, answer: `Suele tomar de <strong>24 a 72 horas</strong> si la pieza está disponible. Si hay que pedir componente, probar estabilidad o revisar fallas intermitentes, puede tomar más. Te damos tiempo estimado después del diagnóstico.` },
          { question: `¿Qué cubre la garantía?`, answer: `La garantía cubre la pieza reemplazada y la mano de obra relacionada con esa reparación durante el periodo indicado. No cubre componentes distintos que ya venían dañados, variaciones eléctricas, humedad, golpes o modificaciones externas posteriores.` },
        ],
        relatedSlugs: ['formateo', 'limpieza-profunda', 'upgrade', 'diagnostico'],
        relatedExternal: [
          { label: 'Reparación General',         href: '/reparaciones',   icon: 'fa-screwdriver-wrench', desc: 'Si ya tienes problemas con celular, laptop o PC.' },
          { label: 'Ensambles PC Gamer',         href: '/ensambles',      icon: 'fa-microchip',          desc: 'Si tu PC ya no da más, te armamos una nueva.' },
        ],
      },

      // --- Formateo (extendida) ----------------------------------------
      {
        slug: 'formateo',
        label: 'Formateo',
        seoKeyword: 'Formateo de PC en Cancún',
        hook: 'PC lenta, llena de virus o quieres empezar de cero. Borrado seguro + Windows limpio + drivers + tu paquetería favorita en 2-4 horas.',
        intro: 'Borrado seguro y reinstalación limpia del sistema operativo. Tu PC vuelve a sentirse como nueva en pocas horas.',
        bullets: ['Respaldo de tus archivos incluido', 'Windows + drivers + paquetería básica', 'Activación legal de licencia', 'Optimización post-instalación', 'Antivirus básico instalado'],
        fromPrice: '$450 MXN', eta: '2-4 h', warranty: 'Reinstalación gratis si falla en 30 días',
        whyUs: [
          { icon: 'fa-database', title: 'Backup primero',   desc: 'Tus archivos a salvo en disco externo antes de borrar nada.' },
          { icon: 'fa-windows',  title: 'Windows legal',    desc: 'Licencia activada o asesoría para conseguirla.' },
          { icon: 'fa-rocket',   title: 'Drivers + apps',   desc: 'Drivers oficiales del fabricante + paquetería esencial.' },
          { icon: 'fa-shield-halved', title: 'Antivirus',   desc: 'Protección básica activa desde el primer arranque.' },
        ],
        process: [
          { title: 'Backup',       desc: 'Copia completa de Documentos, Escritorio, Descargas, fotos y configuración del navegador.' },
          { title: 'Borrado seguro', desc: 'Formateo de bajo nivel del disco. Sin restos del sistema anterior.' },
          { title: 'Instalación',  desc: 'Windows 10 u 11 según compatibilidad + activación + actualizaciones críticas.' },
          { title: 'Drivers',      desc: 'Drivers oficiales del fabricante: chipset, video, audio, red, lector de huellas.' },
          { title: 'Paquetería',   desc: 'Office o LibreOffice, navegador, lector PDF, antivirus, paquetes que uses.' },
          { title: 'Restauración', desc: 'Devolvemos tus archivos al lugar correcto. Listo para usar.' },
        ],
        commonProblems: [
          { problem: 'PC con virus que vuelve sola',         solution: 'Formateo limpio elimina rootkits y malware persistente.' },
          { problem: 'Windows lento aunque tengas SSD',      solution: 'Acumulación de software basura. Reinstalación devuelve velocidad.' },
          { problem: 'Errores que no se solucionan',         solution: 'Si llevas semanas con el mismo error, formateo es la cura.' },
          { problem: 'Voy a vender la PC',                   solution: 'Borrado seguro + sistema limpio para entregarla lista.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'PCs ensambladas', 'PCs gamer', 'Mini PCs'],
        faqs: [
          { question: `¿Pierdo mis archivos al formatear?`, answer: `No necesariamente. Antes de formatear respaldamos documentos, escritorio, descargas, fotos y carpetas importantes que nos indiques. Si el disco está dañado o Windows no permite acceso normal, primero te avisamos porque puede requerirse recuperación.` },
          { question: `¿Cuánto tarda el formateo de una PC?`, answer: `Normalmente tarda de <strong>2 a 4 horas</strong> en equipos con SSD y respaldo ligero. Si usa disco mecánico, tiene muchos archivos, requiere actualizaciones largas o drivers especiales, puede tomar más. Te damos tiempo real al revisar el equipo.` },
          { question: `¿Qué versión de Windows instalan?`, answer: `Instalamos Windows 10 o Windows 11 según compatibilidad, requisitos de seguridad y uso que le darás. No forzamos Windows 11 en equipos que trabajarán peor; si conviene Windows 10 por estabilidad o rendimiento, te lo explicamos.` },
          { question: `¿La licencia es legal?`, answer: `Sí. Si tu equipo ya tiene licencia digital, normalmente se reactiva al conectarse a internet. Si no cuenta con licencia válida, te orientamos para adquirir una opción legal; evitamos activadores dudosos que causen alertas.` },
          { question: `¿Incluye paquetería de Office?`, answer: `Incluimos paquetería básica como navegador, lector PDF, compresor y alternativa tipo LibreOffice si la necesitas. Microsoft Office original se instala solo si cuentas con licencia o autorizas cotizarla, para evitar software pirata.` },
        ],
        relatedSlugs: ['mantenimiento-correctivo', 'limpieza-profunda', 'upgrade', 'diagnostico'],
        relatedExternal: [
          { label: 'Instalación de Windows',  href: '/instalacion-windows', icon: 'fa-windows', desc: 'Página dedicada con más opciones de licencia y versiones.' },
          { label: 'Optimización del Sistema',href: '/optimizacion',         icon: 'fa-bolt',    desc: 'Ya con Windows limpio, optimización avanzada exprime más.' },
        ],
      },

      { slug: 'instalacion-sistema',     label: 'Instalación de Windows',  customUrl: '/instalacion-windows' },

      // --- Upgrade RAM/SSD PC (extendida) ------------------------------
      {
        slug: 'upgrade',
        label: 'Upgrade RAM / SSD',
        seoKeyword: 'Upgrade de RAM y SSD para PC en Cancún',
        hook: 'Mejoramos tu PC sin cambiarla. Más RAM, SSD NVMe, o tarjeta gráfica nueva  -  con clonado de tu Windows actual y benchmark antes/después.',
        intro: 'Mejoramos tu PC sin cambiarla: más RAM, SSD NVMe o tarjeta gráfica nueva. Asesoría experta para no gastar de más.',
        bullets: ['Análisis de cuello de botella real', 'Recomendación con cotización transparente', 'Instalación + pruebas + benchmark', 'Clonado de Windows sin reinstalar', 'Garantía del fabricante en cada pieza'],
        fromPrice: '$300 MXN + pieza', eta: '24-48 h', warranty: 'Pieza: garantía fabricante (1-3 años) | Mano de obra: 30 días',
        whyUs: [
          { icon: 'fa-magnifying-glass-chart', title: 'Identificamos cuello', desc: 'Te decimos si es disco, RAM o GPU lo que limita tu PC.' },
          { icon: 'fa-piggy-bank',             title: 'Sin gastar de más',  desc: 'Recomendación honesta: solo cambias lo que de verdad importa.' },
          { icon: 'fa-clone',                  title: 'Clonado del SO',     desc: 'Conservas Windows + apps + archivos exactamente igual.' },
          { icon: 'fa-chart-line',             title: 'Benchmarks',         desc: 'Antes/después con CrystalDisk + 3DMark para que veas la mejora.' },
        ],
        process: [
          { title: 'Diagnóstico de bottleneck', desc: 'Medimos uso real de CPU/RAM/disco/GPU para identificar qué frena tu PC.' },
          { title: 'Cotización piezas',    desc: 'Lista con precios actualizados. Tú apruebas modelo exacto.' },
          { title: 'Backup',               desc: 'Imagen completa antes de tocar disco. Cero riesgo de pérdida.' },
          { title: 'Instalación',          desc: 'Físico + clonado del SO al SSD nuevo (sin reinstalar Windows).' },
          { title: 'Benchmarks',           desc: 'CrystalDiskMark, Cinebench, 3DMark. Reporte antes/después.' },
        ],
        commonProblems: [
          { problem: 'PC arranca lentísima',           solution: 'SSD NVMe te lleva de 3 min a 15 segundos. La mejora más impactante.' },
          { problem: 'Apps tardan en abrir',           solution: 'Más RAM (16 o 32 GB) elimina el swap a disco. Multitasking real.' },
          { problem: 'No corre juegos modernos',       solution: 'GPU dedicada o ampliación de RAM. Te decimos cuál cambia el juego.' },
          { problem: 'Sin espacio para fotos/videos',  solution: 'SSD de 1 TB o 2 TB resuelve por años.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'PCs ensambladas', 'Workstations', 'Mini PCs'],
        faqs: [
          { question: `¿SSD o más RAM, qué da más mejora?`, answer: `Si tu PC usa disco duro mecánico, el SSD casi siempre da la mejora más grande. Si ya tiene SSD pero trabaja con muchas pestañas, juegos o programas pesados, la RAM puede ser prioridad. Revisamos uso real antes de recomendar.` },
          { question: `¿Pierdo mis programas?`, answer: `No, cuando el disco está sano podemos clonar el sistema actual para conservar programas, archivos, sesiones y configuración. Si detectamos errores en el disco o Windows está muy dañado, te explicamos si conviene clonación o instalación limpia.` },
          { question: `¿Qué SSD recomiendan?`, answer: `Recomendamos el SSD según tu placa, presupuesto y uso. Para oficina puede bastar un SATA o NVMe confiable; para gaming, edición o cargas pesadas conviene uno con mejor rendimiento sostenido. Validamos compatibilidad antes de comprar.` },
          { question: `¿Cuánta RAM máxima soporta mi PC?`, answer: `Depende del chipset, procesador, placa madre y ranuras disponibles. Revisamos modelo exacto, tipo de memoria, frecuencia y capacidad máxima estable. No instalamos RAM al azar porque puede provocar reinicios o memoria no detectada.` },
          { question: `¿Pueden poner GPU nueva?`, answer: `Sí, pero antes revisamos fuente de poder, espacio del gabinete, ranura PCIe, consumo, cuello de botella y ventilación. Una GPU nueva sin fuente adecuada o sin flujo de aire puede causar apagados o bajo rendimiento.` },
        ],
        relatedSlugs: ['formateo', 'mantenimiento-correctivo', 'limpieza-profunda', 'diagnostico'],
        relatedExternal: [
          { label: 'Ensambles PC Gamer',         href: '/ensambles',     icon: 'fa-microchip', desc: 'Si conviene armar PC nueva en lugar de actualizar.' },
          { label: 'Optimización del Sistema',   href: '/optimizacion',  icon: 'fa-bolt',      desc: 'Saca aún más provecho del hardware nuevo.' },
        ],
      },

      // --- Limpieza profunda PC (extendida) -----------------------------
      {
        slug: 'limpieza-profunda',
        label: 'Limpieza profunda',
        seoKeyword: 'Limpieza profunda de PC en Cancún',
        hook: 'PC con polvo de años, ventiladores que rugen y temperaturas insanas. Desarmamos todo, limpiamos cada componente y aplicamos pasta nueva.',
        intro: 'Desarmado total, limpieza de cada componente con químicos especializados, cambio de pasta térmica y reensamble.',
        bullets: ['Limpieza ultrasónica de placa si aplica', 'Cambio de pasta térmica incluido', 'Reorganización de cableado', 'Test térmico antes/después', 'Limpieza de fuente y disipadores'],
        fromPrice: '$600 MXN', eta: '24-48 h', warranty: '60 días',
        whyUs: [
          { icon: 'fa-spray-can-sparkles', title: 'Limpieza nivel pro',   desc: 'Aire comprimido + alcohol isopropílico + ultrasonidos. No solo soplar.' },
          { icon: 'fa-temperature-arrow-down', title: 'Bajan temperaturas', desc: 'Tu PC vuelve a temperaturas de fábrica. Ventiladores en silencio.' },
          { icon: 'fa-flask',              title: 'Pasta térmica nueva',  desc: 'Arctic MX-4 incluida. Bajan otros 10-15°C extra del CPU.' },
          { icon: 'fa-list-check',         title: 'Cableado pro',         desc: 'Reorganizamos cables para mejor flujo de aire post-limpieza.' },
        ],
        process: [
          { title: 'Test térmico inicial', desc: 'Medimos temperaturas en idle y bajo carga (HWMonitor + Cinebench).' },
          { title: 'Desarmado total',  desc: 'Cada componente sale para limpieza individual. Foto del cableado para reensamble exacto.' },
          { title: 'Limpieza',         desc: 'Ventiladores, disipadores, RAM, slots, fuente. Químicos seguros para electrónica.' },
          { title: 'Pasta térmica',    desc: 'Limpieza de pasta vieja del CPU/GPU + aplicación de pasta nueva premium.' },
          { title: 'Reensamble',       desc: 'Cableado limpio + verificación de cada conexión.' },
          { title: 'Test térmico final', desc: 'Mismas pruebas que al inicio. Reporte comparativo antes/después.' },
        ],
        commonProblems: [
          { problem: 'PC quema y los ventiladores rugen',        solution: 'Polvo + pasta seca. Limpieza profunda baja 20-30°C inmediatamente.' },
          { problem: 'Apagados aleatorios bajo carga',            solution: 'Throttling térmico por temperatura. Limpieza lo soluciona.' },
          { problem: 'PC con años sin servicio',                  solution: 'Acumulación crítica de polvo. Necesita limpieza profunda urgente.' },
          { problem: 'Olor extraño o quemado al encender',        solution: 'PARA YA. Tráela de inmediato  -  riesgo de daño a fuente o placa.' },
        ],
        compatibleBrands: ['HP', 'Dell', 'Lenovo', 'Acer', 'Asus', 'PCs ensambladas', 'PCs gamer', 'Workstations'],
        faqs: [
          { question: `¿Cada cuánto necesito una limpieza profunda?`, answer: `En Cancún recomendamos cada <strong>12 a 18 meses</strong> por polvo, humedad y salitre. Si la PC está cerca de ventana, piso, mascotas o nunca se ha abierto, puede necesitarse antes para evitar temperaturas altas y ruido.` },
          { question: `¿Cuánto cuesta la limpieza profunda?`, answer: `La limpieza profunda inicia desde <strong>$600 MXN</strong>. Puede cambiar si requiere desmontaje complejo, pasta térmica especial, limpieza de fuente o tratamiento por sulfatación. Antes de hacer extras te mostramos el estado interno y cotizamos.` },
          { question: `¿Qué tanto bajan las temperaturas?`, answer: `En PCs muy sucias puede bajar de <strong>20 a 30°C</strong>; en casos moderados suele mejorar de 10 a 15°C. La cifra real depende de polvo, pasta térmica, flujo de aire y ventiladores, por eso comparamos antes/después.` },
          { question: `¿Es seguro abrir mi PC?`, answer: `Sí, se hace con pulsera antiestática, herramientas correctas y registro del cableado antes de desmontar. Revisamos conectores, ventiladores y tornillería para no forzar piezas. Si vemos humedad u óxido, te avisamos.` },
          { question: `¿Vale la pena en una PC vieja?`, answer: `Sí vale la pena si el equipo aún cumple su función. Una limpieza puede reducir calor, ruido y apagados, además de alargar la vida de fuente, placa y GPU. Si conviene más un upgrade, te lo diremos.` },
        ],
        relatedSlugs: ['formateo', 'mantenimiento-correctivo', 'upgrade', 'diagnostico'],
        relatedExternal: [
          { label: 'Paquetes de mantenimiento', href: '/paquetes',     icon: 'fa-box',     desc: 'Servicio recurrente con descuento.' },
          { label: 'Antisulfatación',           href: '/antisulfatacion', icon: 'fa-droplet-slash', desc: 'Si vives cerca del mar, atender corrosión también.' },
        ],
      },

      // --- Diagnóstico PC (extendida) ----------------------------------
      {
        slug: 'diagnostico',
        label: 'Diagnóstico',
        seoKeyword: 'Diagnóstico de PC en Cancún',
        hook: '¿Tu PC no enciende, se reinicia, va lenta, muestra pantalla azul o no da video? Hacemos diagnóstico técnico real antes de cambiar piezas.',
        intro: 'Diagnóstico profesional de PC en Cancún para fallas de encendido, Windows, virus, fuente de poder, RAM, SSD, disco duro, GPU, temperatura y placa madre.',
        bullets: ['Prueba de fuente, RAM, SSD/HDD y GPU', 'Revisión de Windows, virus y drivers', 'Medición de temperatura y estabilidad', 'Reporte claro por WhatsApp', 'Diagnóstico gratis'],
        fromPrice: 'GRATIS', eta: 'Hasta 6 h o más según falla', warranty: 'Reporte por escrito',
        whyUs: [
          { icon: 'fa-magnifying-glass', title: 'Diagnóstico real', desc: 'No decimos "es la placa" sin pruebas. Separamos fuente, RAM, disco, Windows, temperatura y GPU.' },
          { icon: 'fa-file-contract',    title: 'Reporte por WhatsApp', desc: 'Te explicamos la falla, causa probable, urgencia, costo y tiempo antes de reparar.' },
          { icon: 'fa-handshake',        title: 'Recomendación honesta', desc: 'Si conviene formatear, cambiar SSD, limpiar, reparar o no invertir más, te lo decimos claro.' },
          { icon: 'fa-piggy-bank',       title: 'Diagnóstico gratis', desc: 'La revisión no tiene costo. El tiempo depende del tipo de problema y puede extenderse si la falla requiere pruebas largas.' },
        ],
        process: [
          { title: 'Recepción y síntomas', desc: 'Registramos si no enciende, se reinicia, va lenta, no da video, se calienta o marca errores.' },
          { title: 'Prueba eléctrica', desc: 'Verificamos fuente, voltajes, consumo, botón de encendido, placa y conectores principales.' },
          { title: 'Prueba de componentes', desc: 'Revisamos RAM, SSD/HDD, GPU, temperatura, ventiladores, puertos y estabilidad bajo carga.' },
          { title: 'Revisión de Windows', desc: 'Analizamos arranque, drivers, virus, eventos, pantalla azul, actualizaciones y estado del sistema.' },
          { title: 'Reporte y cotización', desc: 'Te enviamos diagnóstico, costo, tiempo estimado y recomendación técnica antes de reparar.' },
        ],
        commonProblems: [
          { problem: 'PC no enciende', solution: 'Probamos fuente de poder, botón, RAM, placa madre, conectores y corto antes de cambiar piezas.' },
          { problem: 'Pantalla azul o reinicios', solution: 'Revisamos RAM, SSD/HDD, drivers, Windows, temperatura y eventos del sistema.' },
          { problem: 'PC lenta aunque tiene buen hardware', solution: 'Identificamos si la causa es disco, virus, Windows dañado, poca RAM o sobrecalentamiento.' },
          { problem: 'No da video o prende sin imagen', solution: 'Descartamos monitor, cable, GPU, RAM, BIOS, fuente y placa para encontrar la causa real.' },
          { problem: 'Quiero una segunda opinión', solution: 'Hacemos revisión independiente y te explicamos si la reparación propuesta tiene sentido.' },
          { problem: '¿Conviene reparar o comprar otra?', solution: 'Comparamos costo, edad del equipo, piezas disponibles y uso real para recomendar la mejor decisión.' },
        ],
        compatibleBrands: ['PC gamer', 'PC de oficina', 'PC ensamblada', 'HP', 'Dell', 'Lenovo', 'Acer', 'Asus'],
        faqs: [
          { question: `¿Qué incluye el diagnóstico de PC?`, answer: `Incluye revisión de fuente, RAM, SSD o disco duro, GPU, temperatura, Windows, drivers, virus, arranque, estabilidad y síntomas reportados. La profundidad depende de la falla, pero la meta es encontrar la causa antes de cambiar piezas.` },
          { question: `¿Cuánto tarda el diagnóstico?`, answer: `Un diagnóstico completo puede tomar hasta <strong>6 horas</strong> según el problema del equipo. Si hay reinicios aleatorios, pantalla azul, fallas bajo carga o pruebas cruzadas de piezas, puede requerir más tiempo para reproducir la falla con seguridad.` },
          { question: `¿Cuánto cuesta el diagnóstico?`, answer: `El diagnóstico de PC es <strong>gratis</strong>. Lo que puede variar es el tiempo necesario para revisar correctamente el equipo, especialmente si la falla es intermitente o requiere pruebas extendidas de hardware, Windows, temperatura o fuente.` },
          { question: `¿Me dicen si conviene reparar o comprar otra PC?`, answer: `Sí. Si la reparación no conviene por costo, antigüedad, disponibilidad de piezas o rendimiento esperado, te lo diremos. También podemos recomendar formateo, upgrade SSD/RAM o mantenimiento si eso resuelve mejor el problema.` },
          { question: `¿Hacen diagnóstico a domicilio?`, answer: `Podemos coordinar visita en Cancún según zona y disponibilidad, pero para diagnóstico profundo recomendamos taller. Ahí podemos medir voltajes, probar piezas, revisar temperatura y abrir el equipo con herramienta adecuada.` },
        ],
        relatedSlugs: ['mantenimiento-correctivo', 'formateo', 'upgrade', 'limpieza-profunda'],
        relatedExternal: [
          { label: 'Reparación general',   href: '/reparaciones',  icon: 'fa-screwdriver-wrench', desc: 'Si ya sabes qué tiene, ve directo a reparar.' },
          { label: 'Paquetes de mantenimiento', href: '/paquetes', icon: 'fa-box',                desc: 'Servicio preventivo recurrente.' },
          { label: 'Soporte TI empresarial', href: '/empresas', icon: 'fa-building-shield', desc: 'Diagnóstico y soporte para oficinas, hoteles y flotillas de equipos.' },
          { label: 'Diagnóstico de laptop', href: '/servicios/laptop/diagnostico', icon: 'fa-laptop-medical', desc: 'Si la falla viene de una laptop, revisamos batería, pantalla, teclado, carga y temperatura.' },
        ],
      },

      { slug: 'optimizacion',            label: 'Optimización del Sistema',customUrl: '/optimizacion' },
      ...PC_CLUSTER_SERVICES,
      { slug: 'antisulfatacion',         label: 'Antisulfatación',         customUrl: '/antisulfatacion' },
    ],
  };
