import type { ServiceCategory, ServiceItem } from '../data/services';
import type { ServiceFlags } from './service-page-rules';

type ViewLoader = () => Promise<{ default: unknown }>;
type ViewRule = {
  name: string;
  matches: (flags: ServiceFlags, category: ServiceCategory, service: ServiceItem) => boolean;
  load: ViewLoader;
};

const viewRules: ViewRule[] = [
  { name: 'HotelSupportView', matches: (f) => f.isHotelSupport, load: () => import('../components/views/HotelSupportView.astro') },
  { name: 'B2bOfficeSupportView', matches: (f) => f.isB2bOfficeSupport, load: () => import('../components/views/B2bOfficeSupportView.astro') },
  { name: 'B2bWifiEmpresarialView', matches: (f) => f.isB2bWifiEmpresarial, load: () => import('../components/views/B2bWifiEmpresarialView.astro') },
  { name: 'MacOSSoftwareView', matches: (f) => f.isMacSoftware, load: () => import('../components/views/MacOSSoftwareView.astro') },
  { name: 'ImacMacMiniRepairView', matches: (f) => f.isImacMacMiniRepair, load: () => import('../components/views/ImacMacMiniRepairView.astro') },
  { name: 'MacBookPreventiveMaintenanceView', matches: (f) => f.isMacbookPreventiveMaintenance, load: () => import('../components/views/MacBookPreventiveMaintenanceView.astro') },
  { name: 'MacBookBatteryReplacementView', matches: (f) => f.isMacBookBatteryReplacement, load: () => import('../components/views/MacBookBatteryReplacementView.astro') },
  { name: 'MacBookLiquidDamageView', matches: (f) => f.isMacBookLiquidDamage, load: () => import('../components/views/MacBookLiquidDamageView.astro') },
  { name: 'MacDiagnosticView', matches: (f) => f.isMacDiagnostic, load: () => import('../components/views/MacDiagnosticView.astro') },
  { name: 'MacBookScreenReplacementView', matches: (f) => f.isMacBookScreenReplacement, load: () => import('../components/views/MacBookScreenReplacementView.astro') },
  { name: 'MacBookRepairView', matches: (f) => f.isMacBookRepair, load: () => import('../components/views/MacBookRepairView.astro') },
  { name: 'LaptopDataRecoveryView', matches: (f) => f.isLaptopDataRecovery, load: () => import('../components/views/LaptopDataRecoveryView.astro') },
  { name: 'LaptopDiagnosticView', matches: (f) => f.isLaptopDiagnostic, load: () => import('../components/views/LaptopDiagnosticView.astro') },
  { name: 'PcDataRecoveryView', matches: (f) => f.isPcDataRecovery, load: () => import('../components/views/PcDataRecoveryView.astro') },
  { name: 'PcVirusMalwareView', matches: (f) => f.isPcVirusMalware, load: () => import('../components/views/PcVirusMalwareView.astro') },
  { name: 'PcComponentInstallationView', matches: (f) => f.isPcInstallComponents, load: () => import('../components/views/PcComponentInstallationView.astro') },
  { name: 'DellLaptopRepairView', matches: (f) => f.isDellLaptopRepair, load: () => import('../components/views/DellLaptopRepairView.astro') },
  { name: 'HpLaptopRepairView', matches: (f) => f.isHpLaptopRepair, load: () => import('../components/views/HpLaptopRepairView.astro') },
  { name: 'LenovoLaptopRepairView', matches: (f) => f.isLenovoLaptopRepair, load: () => import('../components/views/LenovoLaptopRepairView.astro') },
  { name: 'ConsolePreventiveMaintenanceView', matches: (f) => f.isConsolePreventiveMaintenance, load: () => import('../components/views/ConsolePreventiveMaintenanceView.astro') },
  { name: 'Ps5LiquidMetalCleaningView', matches: (f) => f.isPs5LiquidMetalCleaning, load: () => import('../components/views/Ps5LiquidMetalCleaningView.astro') },
  { name: 'Ps5ShutdownView', matches: (f) => f.isPs5Shutdown, load: () => import('../components/views/Ps5ShutdownView.astro') },
  { name: 'MantenimientoTermicoView', matches: (f) => f.isConsoleOverheating, load: () => import('../components/views/MantenimientoTermicoView.astro') },
  { name: 'ConsoleThermalPasteView', matches: (f) => f.isConsoleThermalPaste, load: () => import('../components/views/ConsoleThermalPasteView.astro') },
  { name: 'ConsolePowerSupplyView', matches: (f) => f.isConsolePowerSupply, load: () => import('../components/views/ConsolePowerSupplyView.astro') },
  { name: 'PcDiagnosticView', matches: (f) => f.isPcDiagnostic, load: () => import('../components/views/PcDiagnosticView.astro') },
  { name: 'PcBlueScreenView', matches: (f) => f.isPcBlueScreen, load: () => import('../components/views/PcBlueScreenView.astro') },
  { name: 'PcLentitudView', matches: (f) => f.isPcLentitud, load: () => import('../components/views/PcLentitudView.astro') },
  { name: 'IphoneAdvancedRepairView', matches: (f) => f.isIphoneAdvancedRepair, load: () => import('../components/views/IphoneAdvancedRepairView.astro') },
  { name: 'IphoneScreenRepairView', matches: (f) => f.isIphoneScreenRepair, load: () => import('../components/views/IphoneScreenRepairView.astro') },
  { name: 'IphoneBatteryReplacementView', matches: (f) => f.isIphoneBatteryReplacement, load: () => import('../components/views/IphoneBatteryReplacementView.astro') },
  { name: 'SamsungBatteryView', matches: (f) => f.isSamsungBatteryReplacement, load: () => import('../components/views/SamsungBatteryView.astro') },
  { name: 'IphoneCameraRepairView', matches: (f) => f.isIphoneCameraRepair, load: () => import('../components/views/IphoneCameraRepairView.astro') },
  { name: 'IphoneFaceIdRepairView', matches: (f) => f.isIphoneFaceIdRepair, load: () => import('../components/views/IphoneFaceIdRepairView.astro') },
  { name: 'IphoneHumidityRepairView', matches: (f) => f.isIphoneHumidityRepair, load: () => import('../components/views/IphoneHumidityRepairView.astro') },
  { name: 'IphoneChargeRepairView', matches: (f) => f.isIphoneChargeRepair, load: () => import('../components/views/IphoneChargeRepairView.astro') },
  { name: 'IphoneSpeakerRepairView', matches: (f) => f.isIphoneSpeakerRepair, load: () => import('../components/views/IphoneSpeakerRepairView.astro') },
  { name: 'IphoneDiagnosticView', matches: (f) => f.isIphoneDiagnostic, load: () => import('../components/views/IphoneDiagnosticView.astro') },
  { name: 'IphoneButtonsRepairView', matches: (f) => f.isIphoneButtonsRepair, load: () => import('../components/views/IphoneButtonsRepairView.astro') },
  { name: 'IphoneMicrophoneRepairView', matches: (f) => f.isIphoneMicrophoneRepair, load: () => import('../components/views/IphoneMicrophoneRepairView.astro') },
  { name: 'DesbloqueoIcloudView', matches: (f) => f.isDesbloqueoIcloud, load: () => import('../components/views/DesbloqueoIcloudView.astro') },
  { name: 'PhoneLiquidDamageView', matches: (f) => f.isPhoneLiquidDamage, load: () => import('../components/views/PhoneLiquidDamageView.astro') },
  { name: 'PhoneNoPowerView', matches: (f) => f.isPhoneNoPower, load: () => import('../components/views/PhoneNoPowerView.astro') },
  { name: 'PhoneBatteryReplacementView', matches: (f) => f.isPhoneBatteryReplacement, load: () => import('../components/views/PhoneBatteryReplacementView.astro') },
  {
    name: 'CambioBateriaView',
    matches: (_f, category, service) => category.slug === 'laptop' && service.slug === 'cambio-bateria',
    load: () => import('../components/views/CambioBateriaView.astro'),
  },
  { name: 'LaptopThermalPasteView', matches: (f) => f.isLaptopThermalPaste, load: () => import('../components/views/LaptopThermalPasteView.astro') },
  { name: 'LaptopPreventiveMaintenanceView', matches: (f) => f.isLaptopPreventiveMaintenance, load: () => import('../components/views/LaptopPreventiveMaintenanceView.astro') },
  { name: 'PcPreventiveMaintenanceView', matches: (f) => f.isPcPreventiveMaintenance, load: () => import('../components/views/PcPreventiveMaintenanceView.astro') },
  { name: 'PcCorrectiveMaintenanceView', matches: (f) => f.isPcCorrectiveMaintenance, load: () => import('../components/views/PcCorrectiveMaintenanceView.astro') },
  { name: 'PcDeepCleaningView', matches: (f) => f.isPcDeepCleaning, load: () => import('../components/views/PcDeepCleaningView.astro') },
  { name: 'PcNoEnciendeView', matches: (f) => f.isPcNoEnciende, load: () => import('../components/views/PcNoEnciendeView.astro') },
  { name: 'PcGpuView', matches: (f) => f.isPcGpu, load: () => import('../components/views/PcGpuView.astro') },
  { name: 'PcPowerSupplyView', matches: (f) => f.isPcPowerSupply, load: () => import('../components/views/PcPowerSupplyView.astro') },
  { name: 'PcUpgradeView', matches: (f) => f.isPcUpgrade, load: () => import('../components/views/PcUpgradeView.astro') },
  { name: 'ServiceDetailView', matches: (f) => f.useServiceDetailView, load: () => import('../components/views/ServiceDetailView.astro') },
];

export function getServiceViewName(flags: ServiceFlags, category: ServiceCategory, service: ServiceItem): string | null {
  const rule = viewRules.find((item) => item.matches(flags, category, service));
  return rule ? rule.name : null;
}

export async function resolveServiceView(flags: ServiceFlags, category: ServiceCategory, service: ServiceItem): Promise<any> {
  const rule = viewRules.find((item) => item.matches(flags, category, service));
  if (!rule) return null;
  return (await rule.load()).default;
}
