import type { ServiceCategory, ServiceItem } from '../data/services';
import type { ServiceFlags } from './service-page-rules';

type ViewLoader = () => Promise<{ default: unknown }>;
type ViewRule = {
  matches: (flags: ServiceFlags, category: ServiceCategory, service: ServiceItem) => boolean;
  load: ViewLoader;
};

const viewRules: ViewRule[] = [
  { matches: (f) => f.isHotelSupport, load: () => import('../components/views/HotelSupportView.astro') },
  { matches: (f) => f.isB2bOfficeSupport, load: () => import('../components/views/B2bOfficeSupportView.astro') },
  { matches: (f) => f.isB2bWifiEmpresarial, load: () => import('../components/views/B2bWifiEmpresarialView.astro') },
  { matches: (f) => f.isMacSoftware, load: () => import('../components/views/MacOSSoftwareView.astro') },
  { matches: (f) => f.isImacMacMiniRepair, load: () => import('../components/views/ImacMacMiniRepairView.astro') },
  { matches: (f) => f.isMacbookPreventiveMaintenance, load: () => import('../components/views/MacBookPreventiveMaintenanceView.astro') },
  { matches: (f) => f.isMacBookBatteryReplacement, load: () => import('../components/views/MacBookBatteryReplacementView.astro') },
  { matches: (f) => f.isMacBookLiquidDamage, load: () => import('../components/views/MacBookLiquidDamageView.astro') },
  { matches: (f) => f.isLaptopDataRecovery, load: () => import('../components/views/LaptopDataRecoveryView.astro') },
  { matches: (f) => f.isLaptopDiagnostic, load: () => import('../components/views/LaptopDiagnosticView.astro') },
  { matches: (f) => f.isPcDataRecovery, load: () => import('../components/views/PcDataRecoveryView.astro') },
  { matches: (f) => f.isPcVirusMalware, load: () => import('../components/views/PcVirusMalwareView.astro') },
  { matches: (f) => f.isPcInstallComponents, load: () => import('../components/views/PcComponentInstallationView.astro') },
  { matches: (f) => f.isDellLaptopRepair, load: () => import('../components/views/DellLaptopRepairView.astro') },
  { matches: (f) => f.isHpLaptopRepair, load: () => import('../components/views/HpLaptopRepairView.astro') },
  { matches: (f) => f.isLenovoLaptopRepair, load: () => import('../components/views/LenovoLaptopRepairView.astro') },
  { matches: (f) => f.isConsolePreventiveMaintenance, load: () => import('../components/views/ConsolePreventiveMaintenanceView.astro') },
  { matches: (f) => f.isPs5LiquidMetalCleaning, load: () => import('../components/views/Ps5LiquidMetalCleaningView.astro') },
  { matches: (f) => f.isPs5Shutdown, load: () => import('../components/views/Ps5ShutdownView.astro') },
  { matches: (f) => f.isConsoleOverheating, load: () => import('../components/views/MantenimientoTermicoView.astro') },
  { matches: (f) => f.isConsoleThermalPaste, load: () => import('../components/views/ConsoleThermalPasteView.astro') },
  { matches: (f) => f.isConsolePowerSupply, load: () => import('../components/views/ConsolePowerSupplyView.astro') },
  { matches: (f) => f.isPcDiagnostic, load: () => import('../components/views/PcDiagnosticView.astro') },
  { matches: (f) => f.isPcBlueScreen, load: () => import('../components/views/PcBlueScreenView.astro') },
  { matches: (f) => f.isPcLentitud, load: () => import('../components/views/PcLentitudView.astro') },
  { matches: (f) => f.isIphoneScreenRepair, load: () => import('../components/views/IphoneScreenRepairView.astro') },
  { matches: (f) => f.isIphoneBatteryReplacement, load: () => import('../components/views/IphoneBatteryReplacementView.astro') },
  { matches: (f) => f.isSamsungBatteryReplacement, load: () => import('../components/views/SamsungBatteryView.astro') },
  { matches: (f) => f.isIphoneCameraRepair, load: () => import('../components/views/IphoneCameraRepairView.astro') },
  { matches: (f) => f.isIphoneFaceIdRepair, load: () => import('../components/views/IphoneFaceIdRepairView.astro') },
  { matches: (f) => f.isIphoneHumidityRepair, load: () => import('../components/views/IphoneHumidityRepairView.astro') },
  { matches: (f) => f.isIphoneChargeRepair, load: () => import('../components/views/IphoneChargeRepairView.astro') },
  { matches: (f) => f.isIphoneSpeakerRepair, load: () => import('../components/views/IphoneSpeakerRepairView.astro') },
  { matches: (f) => f.isIphoneDiagnostic, load: () => import('../components/views/IphoneDiagnosticView.astro') },
  { matches: (f) => f.isIphoneButtonsRepair, load: () => import('../components/views/IphoneButtonsRepairView.astro') },
  { matches: (f) => f.isIphoneMicrophoneRepair, load: () => import('../components/views/IphoneMicrophoneRepairView.astro') },
  { matches: (f) => f.isPhoneNoPower, load: () => import('../components/views/PhoneNoPowerView.astro') },
  {
    matches: (_f, category, service) => category.slug === 'laptop' && service.slug === 'cambio-bateria',
    load: () => import('../components/views/CambioBateriaView.astro'),
  },
  { matches: (f) => f.isLaptopThermalPaste, load: () => import('../components/views/LaptopThermalPasteView.astro') },
  { matches: (f) => f.isLaptopPreventiveMaintenance, load: () => import('../components/views/LaptopPreventiveMaintenanceView.astro') },
  { matches: (f) => f.isPcPreventiveMaintenance, load: () => import('../components/views/PcPreventiveMaintenanceView.astro') },
  { matches: (f) => f.isPcCorrectiveMaintenance, load: () => import('../components/views/PcCorrectiveMaintenanceView.astro') },
  { matches: (f) => f.isPcDeepCleaning, load: () => import('../components/views/PcDeepCleaningView.astro') },
  { matches: (f) => f.isPcNoEnciende, load: () => import('../components/views/PcNoEnciendeView.astro') },
  { matches: (f) => f.isPcGpu, load: () => import('../components/views/PcGpuView.astro') },
  { matches: (f) => f.isPcPowerSupply, load: () => import('../components/views/PcPowerSupplyView.astro') },
  { matches: (f) => f.useServiceDetailView, load: () => import('../components/views/ServiceDetailView.astro') },
];

export async function resolveServiceView(flags: ServiceFlags, category: ServiceCategory, service: ServiceItem) {
  const rule = viewRules.find((item) => item.matches(flags, category, service));
  if (!rule) return null;
  return (await rule.load()).default;
}
