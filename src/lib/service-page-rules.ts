import type { ServiceCategory, ServiceItem } from '../data/services';

export interface ServiceFlags {
  isLaptopScreenReplacement: boolean;
  isLaptopKeyboardReplacement: boolean;
  isLaptopThermalPaste: boolean;
  isLaptopPreventiveMaintenance: boolean;
  isLaptopDiagnostic: boolean;
  isLenovoLaptopRepair: boolean;
  isHpLaptopRepair: boolean;
  isDellLaptopRepair: boolean;
  isLaptopDataRecovery: boolean;
  isPcUpgrade: boolean;
  isPcFormat: boolean;
  isPcDiagnostic: boolean;
  isPcBlueScreen: boolean;
  isPcLentitud: boolean;
  isPcDataRecovery: boolean;
  isPcVirusMalware: boolean;
  isPcInstallComponents: boolean;
  isPcPreventiveMaintenance: boolean;
  isPcCorrectiveMaintenance: boolean;
  isPcDeepCleaning: boolean;
  isPcNoEnciende: boolean;
  isPcPowerSupply: boolean;
  isPcGpu: boolean;
  isPrinterService: boolean;
  isPrinterMaintenance: boolean;
  isPrinterInkToner: boolean;
  isPrinterDiagnostic: boolean;
  isPrinterConnectivity: boolean;
  isPrinterRollers: boolean;
  isPrinterJams: boolean;
  isConsoleCleaning: boolean;
  isConsoleThermalPaste: boolean;
  isConsolePowerSupply: boolean;
  isConsoleHdmi: boolean;
  isConsoleOverheating: boolean;
  isConsolePreventiveMaintenance: boolean;
  isPs5LiquidMetalCleaning: boolean;
  isPs5Shutdown: boolean;
  isMacbookPreventiveMaintenance: boolean;
  isMacBookLiquidDamage: boolean;
  isMacBookBatteryReplacement: boolean;
  isMacSoftware: boolean;
  isImacMacMiniRepair: boolean;
  isHotelSupport: boolean;
  isB2bOfficeSupport: boolean;
  isB2bWifiEmpresarial: boolean;
  isPhoneSpeakerRepair: boolean;
  isPhoneScreenReplacement: boolean;
  isPhoneSoftwareUnlock: boolean;
  isPhoneFlexButtons: boolean;
  isPhoneDiagnostic: boolean;
  isPhoneNoPower: boolean;
  isIphoneService: boolean;
  isIphoneScreenRepair: boolean;
  isIphoneBatteryReplacement: boolean;
  isSamsungBatteryReplacement: boolean;
  isIphoneCameraRepair: boolean;
  isIphoneFaceIdRepair: boolean;
  isIphoneHumidityRepair: boolean;
  isIphoneChargeRepair: boolean;
  isIphoneSpeakerRepair: boolean;
  isIphoneDiagnostic: boolean;
  isIphoneButtonsRepair: boolean;
  isIphoneMicrophoneRepair: boolean;
  isLaptopLocalReplacement: boolean;
  usesLegacyInlineServiceView: boolean;
  useServiceDetailView: boolean;
  usesLegacyServiceStyles: boolean;
}

export function getServiceFlags(category: ServiceCategory, service: ServiceItem): ServiceFlags {
  const isLaptopScreenReplacement = category.slug === 'laptop' && service.slug === 'cambio-pantalla';
  const isLaptopKeyboardReplacement = category.slug === 'laptop' && service.slug === 'cambio-teclado';
  const isLaptopThermalPaste = category.slug === 'laptop' && service.slug === 'pasta-termica';
  const isLaptopPreventiveMaintenance = category.slug === 'laptop' && service.slug === 'mantenimiento-preventivo';
  const isLaptopDiagnostic = category.slug === 'laptop' && service.slug === 'diagnostico';
  const isLenovoLaptopRepair = category.slug === 'laptop' && service.slug === 'reparacion-lenovo';
  const isHpLaptopRepair = category.slug === 'laptop' && service.slug === 'reparacion-hp';
  const isDellLaptopRepair = category.slug === 'laptop' && service.slug === 'reparacion-dell';
  const isLaptopDataRecovery = category.slug === 'laptop' && service.slug === 'recuperacion-datos';
  const isPcUpgrade = category.slug === 'pc' && service.slug === 'upgrade';
  const isPcFormat = category.slug === 'pc' && service.slug === 'formateo';
  const isPcDiagnostic = category.slug === 'pc' && service.slug === 'diagnostico';
  const isPcBlueScreen = category.slug === 'pc' && service.slug === 'pantalla-azul';
  const isPcLentitud = category.slug === 'pc' && service.slug === 'lentitud';
  const isPcDataRecovery = category.slug === 'pc' && service.slug === 'recuperacion-datos';
  const isPcVirusMalware = category.slug === 'pc' && service.slug === 'virus-malware';
  const isPcInstallComponents = category.slug === 'pc' && service.slug === 'instalacion-componentes';
  const isPcPreventiveMaintenance = category.slug === 'pc' && service.slug === 'mantenimiento-preventivo';
  const isPcCorrectiveMaintenance = category.slug === 'pc' && service.slug === 'mantenimiento-correctivo';
  const isPcDeepCleaning = category.slug === 'pc' && service.slug === 'limpieza-profunda';
  const isPcNoEnciende = category.slug === 'pc' && service.slug === 'no-enciende';
  const isPcPowerSupply = category.slug === 'pc' && service.slug === 'fuente-poder';
  const isPcGpu = category.slug === 'pc' && service.slug === 'tarjeta-video-gpu';
  const isPrinterService = category.slug === 'impresora';
  const isPrinterMaintenance = category.slug === 'impresora' && service.slug === 'mantenimiento';
  const isPrinterInkToner = category.slug === 'impresora' && service.slug === 'cambio-tinta-toner';
  const isPrinterDiagnostic = category.slug === 'impresora' && service.slug === 'diagnostico';
  const isPrinterConnectivity = category.slug === 'impresora' && service.slug === 'conectividad';
  const isPrinterRollers = category.slug === 'impresora' && service.slug === 'rodillos';
  const isPrinterJams = category.slug === 'impresora' && service.slug === 'atascos';
  const isConsoleCleaning = category.slug === 'consola' && service.slug === 'limpieza-interna';
  const isConsoleThermalPaste = category.slug === 'consola' && service.slug === 'pasta-termica';
  const isConsolePowerSupply = category.slug === 'consola' && service.slug === 'fuente';
  const isConsoleHdmi = category.slug === 'consola' && service.slug === 'hdmi';
  const isConsoleOverheating = category.slug === 'consola' && service.slug === 'sobrecalentamiento';
  const isConsolePreventiveMaintenance = category.slug === 'consola' && service.slug === 'mantenimiento-preventivo';
  const isPs5LiquidMetalCleaning = category.slug === 'consola' && service.slug === 'limpieza-metal-liquido-ps5';
  const isPs5Shutdown = category.slug === 'consola' && service.slug === 'ps5-se-apaga';
  const isMacbookPreventiveMaintenance = category.slug === 'mac' && service.slug === 'mantenimiento-macbook';
  const isMacBookLiquidDamage = category.slug === 'mac' && service.slug === 'limpieza-liquido-macbook';
  const isMacBookBatteryReplacement = category.slug === 'mac' && service.slug === 'cambio-bateria-macbook';
  const isMacSoftware = category.slug === 'mac' && service.slug === 'software-macos';
  const isImacMacMiniRepair = category.slug === 'mac' && service.slug === 'reparacion-imac-mac-mini';
  const isHotelSupport = category.slug === 'b2b' && service.slug === 'soporte-hoteles';
  const isB2bOfficeSupport = category.slug === 'b2b' && service.slug === 'soporte-oficinas';
  const isB2bWifiEmpresarial = category.slug === 'b2b' && service.slug === 'wifi-empresarial';
  const isPhoneSpeakerRepair = category.slug === 'telefono' && service.slug === 'reparacion-bocina';
  const isPhoneScreenReplacement = category.slug === 'telefono' && service.slug === 'cambio-pantalla';
  const isPhoneSoftwareUnlock = category.slug === 'telefono' && service.slug === 'liberacion-software';
  const isPhoneFlexButtons = category.slug === 'telefono' && service.slug === 'cambio-flex-botones';
  const isPhoneDiagnostic = category.slug === 'telefono' && service.slug === 'diagnostico';
  const isPhoneNoPower = category.slug === 'telefono' && service.slug === 'celular-no-prende';
  const isIphoneService = category.slug === 'telefono' && (service.slug === 'reparacion-iphone' || service.slug.endsWith('-iphone'));
  const isIphoneScreenRepair = category.slug === 'telefono' && service.slug === 'reparacion-pantalla-iphone';
  const isIphoneBatteryReplacement = category.slug === 'telefono' && service.slug === 'cambio-bateria-iphone';
  const isSamsungBatteryReplacement = category.slug === 'telefono' && service.slug === 'cambio-bateria-samsung';
  const isIphoneCameraRepair = category.slug === 'telefono' && service.slug === 'reparacion-camara-iphone';
  const isIphoneFaceIdRepair = category.slug === 'telefono' && service.slug === 'reparacion-face-id-iphone';
  const isIphoneHumidityRepair = category.slug === 'telefono' && service.slug === 'reparacion-humedad-iphone';
  const isIphoneChargeRepair = category.slug === 'telefono' && service.slug === 'reparacion-carga-iphone';
  const isIphoneSpeakerRepair = category.slug === 'telefono' && service.slug === 'reparacion-bocina-iphone';
  const isIphoneDiagnostic = category.slug === 'telefono' && service.slug === 'diagnostico-iphone';
  const isIphoneButtonsRepair = category.slug === 'telefono' && service.slug === 'reparacion-botones-iphone';
  const isIphoneMicrophoneRepair = category.slug === 'telefono' && service.slug === 'reparacion-microfono-iphone';
  const isLaptopLocalReplacement = isLaptopScreenReplacement || isLaptopKeyboardReplacement;
  const usesLegacyInlineServiceView =
    isLaptopScreenReplacement ||
    isLaptopKeyboardReplacement ||
    isPcFormat ||
    isPcUpgrade ||
    isPrinterService ||
    isConsoleCleaning ||
    isConsoleHdmi ||
    isPhoneSpeakerRepair ||
    isPhoneScreenReplacement ||
    isPhoneSoftwareUnlock ||
    isPhoneFlexButtons ||
    isPhoneDiagnostic;

  return {
    isLaptopScreenReplacement,
    isLaptopKeyboardReplacement,
    isLaptopThermalPaste,
    isLaptopPreventiveMaintenance,
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
    useServiceDetailView: !usesLegacyInlineServiceView,
    usesLegacyServiceStyles: usesLegacyInlineServiceView || category.slug === 'pc',
  };
}
