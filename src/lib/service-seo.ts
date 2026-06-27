import type { ServiceCategory, ServiceItem } from "../data/services";
import { getPrimaryLocalServiceAreas } from "../data/local-seo";
import type { ServiceFlags } from "./service-page-rules";

export function getServiceSeoMeta(
  category: ServiceCategory,
  service: ServiceItem,
  flags: ServiceFlags,
) {
  const {
    isLaptopScreenReplacement,
    isLaptopKeyboardReplacement,
    isLaptopThermalPaste,
    isLaptopDiagnostic,
    isLenovoLaptopRepair,
    isHpLaptopRepair,
    isDellLaptopRepair,
    isLaptopDataRecovery,
    isPcUpgrade,
    isPcFormat,
    isPcDiagnostic,
    isPcBlueScreen,
    isPcLentitud,
    isPcDataRecovery,
    isPcVirusMalware,
    isPcInstallComponents,
    isPcPreventiveMaintenance,
    isPcCorrectiveMaintenance,
    isPcDeepCleaning,
    isPcNoEnciende,
    isPcPowerSupply,
    isPcGpu,
    isPrinterService,
    isPrinterMaintenance,
    isPrinterInkToner,
    isPrinterDiagnostic,
    isPrinterConnectivity,
    isPrinterRollers,
    isPrinterJams,
    isConsoleCleaning,
    isConsoleThermalPaste,
    isConsolePowerSupply,
    isConsoleHdmi,
    isConsoleOverheating,
    isConsolePreventiveMaintenance,
    isPs5LiquidMetalCleaning,
    isPs5Shutdown,
    isMacbookPreventiveMaintenance,
    isMacBookLiquidDamage,
    isMacBookBatteryReplacement,
    isMacSoftware,
    isImacMacMiniRepair,
    isHotelSupport,
    isB2bOfficeSupport,
    isB2bWifiEmpresarial,
    isPhoneSpeakerRepair,
    isPhoneScreenReplacement,
    isPhoneSoftwareUnlock,
    isPhoneFlexButtons,
    isPhoneDiagnostic,
    isPhoneNoPower,
    isIphoneService,
    isIphoneScreenRepair,
    isIphoneBatteryReplacement,
    isSamsungBatteryReplacement,
    isIphoneCameraRepair,
    isIphoneFaceIdRepair,
    isIphoneHumidityRepair,
    isIphoneChargeRepair,
    isIphoneSpeakerRepair,
    isIphoneDiagnostic,
    isIphoneButtonsRepair,
    isIphoneMicrophoneRepair,
    isLaptopLocalReplacement,
    usesLegacyInlineServiceView,
    useServiceDetailView,
    usesLegacyServiceStyles,
  } = flags;

  const primaryLocalAreas = getPrimaryLocalServiceAreas(3)
    .map((area) => area.searchName)
    .join(", ");

  const seoKeyword = service.seoKeyword || service.label;
  const seoTitle = isPcFormat
    ? "Formateo de PC en Cancún | Windows, respaldo y drivers"
    : isPcNoEnciende
      ? "PC no enciende en Cancún | Diagnóstico y reparación | Pixon PC"
      : isPcGpu
        ? "Reparación de tarjeta de video GPU en Cancún | Pixon PC"
        : isPcPowerSupply
          ? "Fuente de poder PC en Cancún | Instalación y Reparación | Pixon PC"
          : isPcDiagnostic
            ? "Diagnóstico de PC en Cancún | Pixon PC"
            : isPcBlueScreen
              ? "Pantalla azul Windows en Canc\u00fan | Diagn\u00f3stico BSOD PC"
              : isPcLentitud
                ? "PC lenta en Canc\u00fan | Diagn\u00f3stico, limpieza y optimizaci\u00f3n para acelerar tu computadora"
                : isPcDataRecovery
                  ? "Recuperación de datos en Cancún | PC, SSD, HDD y archivos borrados"
                  : isPcVirusMalware
                    ? "Eliminación de virus y malware en Cancún | PC lenta y anuncios"
                    : isPcInstallComponents
                      ? "Instalación de componentes PC en Cancún | SSD, RAM, GPU y fuente"
                      : isLaptopDataRecovery
                        ? "Recuperación de datos de laptop en Cancún | SSD, HDD, NVMe y Borrado"
                        : isLaptopThermalPaste
                          ? "Cambio de pasta térmica para laptop en Cancún | Sobrecalentamiento"
                          : isLaptopDiagnostic
                            ? "Diagnóstico de laptop en Cancún | Revisión profesional | Pixon PC"
                            : isDellLaptopRepair
                              ? "Reparaci\u00f3n laptop Dell en Canc\u00fan | Inspiron, Latitude, XPS y Alienware"
                              : isLenovoLaptopRepair
                                ? "Reparaci\u00f3n laptop Lenovo en Canc\u00fan | ThinkPad, IdeaPad, Legion y Yoga"
                                : isHpLaptopRepair
                                  ? "Reparaci\u00f3n laptop HP en Canc\u00fan | Pavilion, Envy, Omen, Victus y EliteBook"
                                  : isPrinterMaintenance
                                    ? "Mantenimiento de impresoras en Cancún | Pixon PC"
                                    : isPrinterInkToner
                                      ? "Cambio de tinta y tóner en Cancún | Pixon PC"
                                      : isPrinterDiagnostic
                                        ? "Diagnóstico de impresoras en Cancún | Pixon PC"
                                        : isPrinterConnectivity
                                          ? "Configuración de impresoras WiFi en Cancún | Pixon PC"
                                          : isPrinterRollers
                                            ? "Cambio de rodillos de impresora en Cancún | Pixon PC"
                                            : isPrinterJams
                                              ? "Reparación de atascos de impresora en Cancún | Pixon PC"
                                              : isConsolePreventiveMaintenance
                                                ? "Mantenimiento preventivo de consolas en Cancún | Pixon"
                                                : isPs5LiquidMetalCleaning
                                                  ? "Limpieza PS5 Cancún con metal líquido | Servicio técnico PlayStation"
                                                  : isPs5Shutdown
                                                    ? service.metaTitle ||
                                                      "PS5 se apaga sola en Cancún | Diagnóstico PlayStation"
                                                    : isHotelSupport
                                                      ? "Soporte TI para Hoteles en Cancún | Soporte Técnico 24/7"
                                                      : isB2bOfficeSupport
                                                        ? "Soporte TI para oficinas en Cancún | Red, impresoras y Windows"
                                                        : isB2bWifiEmpresarial
                                                          ? "WiFi empresarial en Cancún | Red, cobertura e impresoras"
                                                          : isMacSoftware
                                                            ? "Software y Soporte macOS en Cancún | Reinstalación, Optimización y Diagnóstico"
                                                            : isImacMacMiniRepair
                                                              ? "Reparación iMac y Mac mini en Cancún | Diagnóstico Apple"
                                                              : isMacbookPreventiveMaintenance
                                                                ? "Mantenimiento Preventivo MacBook en Cancún | Limpieza, Optimización y Diagnóstico Profesional"
                                                                : isConsoleCleaning
                                                                  ? "Limpieza de consolas en Cancún | PS5, Xbox, Switch y Steam Deck"
                                                                  : isConsoleThermalPaste
                                                                    ? "Cambio de pasta térmica de consolas en Cancún | PS5, Xbox y Switch"
                                                                    : isConsolePowerSupply
                                                                      ? "Reparación de fuente de consolas en Cancún | PS5, Xbox y Switch"
                                                                      : isConsoleHdmi
                                                                        ? "Reparación de puerto HDMI de consolas en Cancún | Pixon PC"
                                                                        : isConsoleOverheating
                                                                          ? "Sobrecalentamiento de consola en Cancún | PS5, Xbox y Switch"
                                                                          : isPhoneSpeakerRepair
                                                                            ? "Reparación de bocina de celular en Cancún | Pixon PC"
                                                                            : isPhoneScreenReplacement
                                                                              ? "Cambio de pantalla de celular en Cancún | iPhone, Samsung y Xiaomi"
                                                                              : isPhoneSoftwareUnlock
                                                                                ? "Liberación y software de celulares en Cancún | Pixon PC"
                                                                                : isPhoneFlexButtons
                                                                                  ? "Cambio de flex y botones de celular en Cancún | Pixon PC"
                                                                                  : isPhoneDiagnostic
                                                                                    ? "Diagnóstico de celulares en Cancún | Pixon PC"
                                                                                    : isIphoneBatteryReplacement
                                                                                      ? "Cambio de batería iPhone en Cancún | Pixon PC"
                                                                                      : isSamsungBatteryReplacement
                                                                                        ? "Cambio de batería Samsung en Cancún | Galaxy | Pixon PC"
                                                                                        : isIphoneCameraRepair
                                                                                          ? "Reparación de cámara iPhone en Cancún | Pixon PC"
                                                                                          : isIphoneFaceIdRepair
                                                                                            ? "Reparación de Face ID iPhone en Cancún | Pixon PC"
                                                                                            : isIphoneHumidityRepair
                                                                                              ? "Reparación de iPhone mojado en Cancún | Pixon PC"
                                                                                              : isIphoneChargeRepair
                                                                                                ? "Reparación de carga iPhone en Cancún | Pixon PC"
                                                                                                : isIphoneSpeakerRepair
                                                                                                  ? "Reparación de bocina iPhone en Cancún | Pixon PC"
                                                                                                  : isIphoneDiagnostic
                                                                                                    ? "Diagnóstico iPhone en Cancún | No prende, no carga, pantalla negra"
                                                                                                    : isIphoneButtonsRepair
                                                                                                      ? "Reparación de botones iPhone en Cancún | Power, volumen y mute"
                                                                                                      : isIphoneMicrophoneRepair
                                                                                                        ? "Reparación de micrófono iPhone en Cancún | Llamadas, WhatsApp y video"
                                                                                                        : isLaptopKeyboardReplacement
                                                                                                          ? "Cambio de teclado de laptop en Cancún | Pixon PC"
                                                                                                          : isIphoneService
                                                                                                            ? `${seoKeyword} | Pixon PC`
                                                                                                            : isLaptopLocalReplacement
                                                                                                              ? `${seoKeyword} con garantía | Pixon PC`
                                                                                                              : `${seoKeyword} para ${category.title} en Cancún | Pixon PC`;
  const description = isPcFormat
    ? "Formateo de PC en Cancún desde $750 MXN. Windows limpio, respaldo de archivos, drivers, paquetería básica y optimización."
    : isPcNoEnciende
      ? "¿Tu PC no enciende, prende ventiladores sin imagen o se apaga al instante? Diagnóstico técnico en Cancún para fuente, tarjeta madre, RAM, GPU y cortos. Atención con cita previa."
      : isPcGpu
        ? "Diagnóstico y reparación de GPU en Cancún para PC sin imagen, artefactos, temperatura alta, crashes, mantenimiento térmico e instalación de tarjeta de video."
        : isPcPowerSupply
          ? "¿Tu computadora se apaga sola, huele a quemado o no prende tras un apagón? Cambio, diagnóstico e instalación de fuentes de poder en Cancún con garantía."
          : isPcDiagnostic
            ? "Diagnóstico de PC en Cancún para computadoras que no encienden, se reinician, van lentas, tienen pantalla azul, fallas de Windows, fuente, RAM, SSD, GPU o temperatura."
            : isPcBlueScreen
              ? "Solución de pantalla azul Windows en Cancún. Diagnóstico BSOD para PC que se reinicia, falla al jugar, marca errores de RAM, SSD, drivers, GPU, temperatura o Windows dañado."
              : isPcLentitud
                ? "Diagnóstico de PC lenta en Cancún. Identificamos cuellos de botella por disco duro mecánico, falta de RAM, virus, temperatura o Windows. Acelera tu computadora con opciones seguras desde $300 MXN."
                : isPcDataRecovery
                  ? "Recuperación de datos en Cancún | PC, SSD, HDD y archivos borrados"
                  : isPcVirusMalware
                    ? "Eliminación de virus y malware en Cancún | PC lenta y anuncios"
                    : isPcInstallComponents
                      ? "Instalación de componentes PC en Cancún para SSD, RAM, GPU, fuente, ventiladores, WiFi y capturadoras. Revisión de compatibilidad, BIOS, cableado y pruebas."
                      : isLaptopDataRecovery
                        ? "Rescate de archivos, fotos y documentos desde laptops que no encienden, discos dañados, SSD corruptos, borrado accidental o formateo en Cancún. Proceso seguro, rápido y confidencial desde $650 MXN."
                        : isLaptopThermalPaste
                          ? "Cambio de pasta térmica para laptop en Cancún desde $550 MXN. Solución para sobrecalentamiento, ventilador fuerte, apagados, bajo rendimiento, laptop gamer, HP, Dell, Lenovo, Asus, MSI y MacBook."
                          : isLaptopDiagnostic
                            ? "Diagnóstico de laptop en Cancún para equipos que no encienden, no cargan, van lentos, se calientan, tienen pantalla negra, humedad, fallas de Windows o datos en riesgo."
                            : isHpLaptopRepair
                              ? "Reparaci\u00f3n de laptop HP en Canc\u00fan para Pavilion, Envy, Omen, Victus, EliteBook, ProBook y Spectre. Diagn\u00f3stico de pantalla, carga, bater\u00eda, teclado, SSD, RAM, temperatura, Windows y placa."
                              : isPrinterMaintenance
                                ? "Mantenimiento de impresoras en Cancún desde $750 MXN. Limpieza, rodillos, bandejas, cabezales, tóner, tinta, prueba de impresión y revisión preventiva."
                                : isPrinterInkToner
                                  ? "Cambio, recarga e instalación de tinta y tóner para impresoras en Cancún. Revisamos cartuchos, tóner, cabezales y prueba de impresión."
                                  : isPrinterDiagnostic
                                    ? "Diagnóstico de impresoras en Cancún para HP, Epson, Canon, Brother y más. Revisamos impresión, atascos, cartuchos, tóner, cabezales, WiFi y errores antes de cotizar."
                                    : isPrinterConnectivity
                                      ? "Configuración de impresoras WiFi, USB, Ethernet e IP en Cancún. Instalamos drivers, conectamos PC, Mac y móviles, y dejamos prueba de impresión."
                                      : isPrinterRollers
                                        ? "Cambio y reparación de rodillos de impresora en Cancún. Corregimos fallas de alimentación, papel atorado, hojas dobles y bandejas que no jalan."
                                        : isPrinterJams
                                          ? "Reparación de atascos de impresora en Cancún desde $450 MXN. Revisamos ruta de papel, sensores, rodillos, bandejas y alimentación para evitar fallas repetidas."
                                          : isConsolePreventiveMaintenance
                                            ? "Mantenimiento preventivo y limpieza de consolas en Cancún. Evita sobrecalentamiento en PS5, Xbox Series X, Nintendo Switch y portátiles con pasta térmica nueva y limpieza interna."
                                            : isPs5LiquidMetalCleaning
                                              ? "Limpieza de PS5 en Cancún con revisión de metal líquido, ventilador, disipador, APU, fuente, ruido y apagados al jugar. Servicio técnico PlayStation con garantía."
                                              : isPs5Shutdown
                                                ? service.metaDescription ||
                                                  "Diagnóstico para PS5 que se apaga sola en Cancún al jugar. Revisamos temperatura, polvo, ventilador, metal líquido, fuente, consumo y placa antes de cotizar."
                                                : isHotelSupport
                                                  ? "Soporte técnico y TI para hoteles en Cancún y Zona Hotelera. Soporte 24/7 para recepción, reservas, PMS Opera/Sabre, impresoras de tickets, redes WiFi Hotspot y mantenimiento preventivo por lote."
                                                  : isB2bOfficeSupport
                                                    ? "Soporte TI para oficinas en Cancún para PCs, laptops, impresoras, red, Windows y respaldos. Atención para administración, contabilidad y operación local."
                                                    : isB2bWifiEmpresarial
                                                      ? "WiFi empresarial en Cancún para oficinas y negocios. Revisamos red, cobertura, impresoras, routers, switches y equipos conectados con diagnóstico local."
                                                      : isMacSoftware
                                                        ? "Soporte macOS en Cancún para Mac lenta, no inicia, apps con error, reinstalación de macOS Sonoma y Sequoia, respaldo con Time Machine y migración de datos. MacBook Air, Pro, iMac y Mac mini."
                                                        : isImacMacMiniRepair
                                                          ? "Reparación iMac y Mac mini en Cancún para equipos que no prenden, no dan imagen, van lentos, se calientan, fallan con macOS, SSD, puertos o datos."
                                                          : isMacbookPreventiveMaintenance
                                                            ? "Mantenimiento preventivo MacBook en Cancún: limpieza interna, cambio de pasta térmica, optimización macOS y diagnóstico profesional para MacBook Air, MacBook Pro e iMac."
                                                            : isConsoleCleaning
                                                              ? "Limpieza interna de consolas en Cancún para PS5, Xbox, Nintendo Switch, Steam Deck y ROG Ally. Mantenimiento térmico, polvo, ventilador, pasta y metal líquido con garantía."
                                                              : isConsoleThermalPaste
                                                                ? "Cambio de pasta térmica de consolas en Cancún. Revisamos PS5, Xbox, Nintendo Switch, Steam Deck, ROG Ally, metal líquido, disipador, ventilador y polvo."
                                                                : isConsolePowerSupply
                                                                  ? "Reparación de fuente de consolas en Cancún. Diagnosticamos PS5, PS4, Xbox, Nintendo Switch, voltajes, fusibles, capacitores, consumo y placa antes de cotizar."
                                                                  : isConsoleHdmi
                                                                    ? "Reparación de puerto HDMI de consolas en Cancún. Cambio de HDMI para PS5, PS4, Xbox y Nintendo Switch con diagnóstico de puerto, placa e IC de video."
                                                                    : isConsoleOverheating
                                                                      ? "Solución de sobrecalentamiento de consolas en Cancún. Revisamos PS5, Xbox, Nintendo Switch, Steam Deck, ventilador, pasta térmica, metal líquido, polvo y flujo de aire."
                                                                      : isPhoneSpeakerRepair
                                                                        ? "Reparación de bocina, auricular y audio de celular en Cancún. Revisamos rejilla, flex, humedad, micrófono y altavoz antes de cambiar piezas."
                                                                        : isPhoneScreenReplacement
                                                                          ? "Cambio de pantalla de celular en Cancún para iPhone, Samsung, Xiaomi, Motorola y más. Revisamos touch, display, marco, humedad y calidad de refacción antes de instalar."
                                                                          : isPhoneSoftwareUnlock
                                                                            ? "Liberación de red, flasheo, actualización, FRP y reparación de software para celulares en Cancún. Revisamos IMEI, cuenta, respaldo y compatibilidad antes de trabajar."
                                                                            : isPhoneFlexButtons
                                                                              ? "Cambio de flex, botón power, volumen, home, mute y botones laterales de celular en Cancún. Revisamos flex, humedad, carcasa y placa antes de cotizar."
                                                                              : isPhoneDiagnostic
                                                                                ? "Diagnóstico de celulares en Cancún para fallas de pantalla, batería, carga, audio, cámaras, humedad, placa y software. Revisamos antes de cambiar piezas."
                                                                                : isIphoneBatteryReplacement
                                                                                  ? "Cambio de batería iPhone en Cancún con diagnóstico de salud, carga, consumo, temperatura, batería inflada y garantía por escrito. Servicio local Pixon PC."
                                                                                  : isSamsungBatteryReplacement
                                                                                    ? "Cambio de batería Samsung Galaxy en Cancún para equipos que se descargan rápido, se apagan, se calientan o tienen batería inflada. Diagnóstico de carga, consumo y garantía."
                                                                                    : isIphoneCameraRepair
                                                                                      ? "Reparación de cámara iPhone en Cancún con diagnóstico de cámara frontal, trasera, enfoque, manchas, lente roto, humedad y garantía por escrito."
                                                                                      : isIphoneFaceIdRepair
                                                                                        ? "Reparación de Face ID iPhone en Cancún. Diagnóstico de cámara TrueDepth, sensores infrarrojos, flex y humedad antes de cotizar. Garantía por escrito."
                                                                                        : isIphoneHumidityRepair
                                                                                          ? "Reparación de iPhone mojado en Cancún. Diagnóstico por humedad, limpieza ultrasónica, revisión de placa lógica, batería, pantalla, carga, cámaras y Face ID."
                                                                                          : isIphoneChargeRepair
                                                                                            ? "Reparamos puerto de carga iPhone en Cancún. Revisamos Lightning, USB-C, batería, humedad, cable, adaptador y flex antes de cotizar."
                                                                                            : isIphoneSpeakerRepair
                                                                                              ? "Reparación de bocina iPhone en Cancún para audio bajo, bocina distorsionada, auricular sin sonido, rejilla tapada, humedad, flex y llamadas."
                                                                                              : isIphoneDiagnostic
                                                                                                ? "Diagnóstico iPhone en Cancún para equipos que no prenden, no cargan, tienen pantalla negra, batería dañada, Face ID, cámara, audio, humedad, software o placa."
                                                                                                : isIphoneButtonsRepair
                                                                                                  ? "Reparación de botones iPhone en Cancún para power, volumen, silencio, Home, botón lateral, flex, carcasa, humedad, golpes y falsos contactos."
                                                                                                  : isIphoneMicrophoneRepair
                                                                                                    ? "Reparación de micrófono iPhone en Cancún para llamadas sin voz, WhatsApp sin audio, notas de voz, video sin sonido, Siri, flex de carga, humedad y placa."
                                                                                                    : isLaptopKeyboardReplacement
                                                                                                      ? "Cambio y reparación de teclado de laptop en Cancún. Revisamos flex, conector, líquido, backlit y compatibilidad antes de instalar."
                                                                                                      : service.intro
                                                                                                        ? `${service.intro} Cotización gratis, diagnóstico claro y reparación profesional en Cancún.`
                                                                                                        : `Servicio especializado de ${service.label} para ${category.title} en Cancún. Diagnóstico profundo, garantía por escrito y cobertura local en ${primaryLocalAreas}.`;
  const finalSeoTitle = service.metaTitle || seoTitle;
  const finalDescription = service.metaDescription || description;
  const faqServiceContext =
    category.slug === "telefono"
      ? "celular"
      : category.slug === "pc"
        ? "PC"
        : category.slug === "consola"
          ? "consola"
          : category.slug === "impresora"
            ? "impresora"
            : category.slug === "b2b"
              ? "oficina"
              : "laptop";
  const genericFaqTitle = `Preguntas frecuentes sobre ${service.label} de ${faqServiceContext} en Cancún`;

  const waMessage = encodeURIComponent(
    isPcFormat
      ? "Hola, quiero cotizar formateo de PC en Cancún con respaldo, Windows, drivers y optimización."
      : isPcDiagnostic
        ? "Hola, quiero agendar diagnóstico de PC en Cancún. Mi computadora presenta una falla y quiero saber qué tiene antes de reparar."
        : isPcInstallComponents
          ? "Hola, quiero cotizar la instalación de componentes para mi PC en Cancún. Necesito SSD, RAM, GPU, fuente o revisar compatibilidad antes de instalar."
          : isPrinterMaintenance
            ? "Hola, quiero cotizar mantenimiento de impresora en Cancún. Puedo enviar marca, modelo y la falla que presenta."
            : isPrinterInkToner
              ? "Hola, quiero cotizar cambio de tinta o tóner para mi impresora en Cancún. Puedo enviar marca y modelo."
              : isPrinterDiagnostic
                ? "Hola, quiero agendar diagnóstico de impresora en Cancún. Puedo enviar marca, modelo y el error que presenta."
                : isPrinterConnectivity
                  ? "Hola, quiero configurar mi impresora WiFi, USB o de red en Cancún. Puedo enviar marca, modelo y cuántos equipos necesito conectar."
                  : isPrinterRollers
                    ? "Hola, quiero cotizar cambio o reparación de rodillos de impresora en Cancún. Puedo enviar marca, modelo y el problema de alimentación de papel."
                    : isPrinterJams
                      ? "Hola, quiero cotizar reparación de atascos de impresora en Cancún. Puedo enviar marca, modelo y foto o video del atasco."
                      : isConsoleCleaning
                        ? "Hola, quiero cotizar limpieza interna de consola en Cancún. Puedo enviar modelo, fotos y decir si es PS5, Xbox, Nintendo Switch, Steam Deck o ROG Ally."
                        : isConsoleThermalPaste
                          ? "Hola, quiero cotizar cambio de pasta térmica para consola en Cancún. Mi consola se calienta, suena fuerte o se apaga al jugar."
                          : isConsolePowerSupply
                            ? "Hola, quiero cotizar reparación de fuente de consola en Cancún. Mi consola no enciende, se apaga o se reinicia."
                            : isConsoleHdmi
                              ? "Hola, quiero cotizar reparación de puerto HDMI de consola en Cancún. Mi consola enciende pero no da imagen o tiene el HDMI dañado."
                              : isConsoleOverheating
                                ? "Hola, quiero cotizar diagnóstico por sobrecalentamiento de consola en Cancún. Mi consola se calienta, suena fuerte o se apaga al jugar."
                                : isPhoneSpeakerRepair
                                  ? "Hola, quiero cotizar reparación de bocina o audio de mi celular en Cancún. Puedo enviar modelo, marca y la falla que presenta."
                                  : isPhoneScreenReplacement
                                    ? "Hola, quiero cotizar cambio de pantalla de celular en Cancún. Puedo enviar marca, modelo y foto del daño."
                                    : isPhoneSoftwareUnlock
                                      ? "Hola, quiero cotizar liberación o reparación de software de celular en Cancún. Puedo enviar marca, modelo y la falla."
                                      : isPhoneFlexButtons
                                        ? "Hola, quiero cotizar cambio de flex o botones de celular en Cancún. Puedo enviar marca, modelo y la falla del botón."
                                        : isPhoneDiagnostic
                                          ? "Hola, quiero diagnóstico de celular en Cancún. Puedo enviar marca, modelo y la falla que presenta."
                                          : isLaptopKeyboardReplacement
                                            ? "Hola, quiero cotizar cambio o reparación de teclado de laptop en Cancún. Puedo enviar modelo o foto del equipo."
                                            : `Hola, necesito el servicio de ${service.label} para mi ${category.title} en Cancún. Estoy cerca de ${primaryLocalAreas}. ¿Me podrían cotizar?`,
  );

  // Hooks y Bullets
  const hook =
    service.hook ||
    `Evita fallas costosas y recupera el rendimiento de tu ${category.title}`;

  return {
    seoKeyword,
    seoTitle,
    description,
    finalSeoTitle,
    finalDescription,
    faqServiceContext,
    genericFaqTitle,
    waMessage,
    hook,
  };
}
