import { getLocaleFromPath, normalizeRoutePath, type Locale } from './i18n';

export type EnglishRoute = {
  es: string;
  en: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  summary: string;
  category: 'computer' | 'laptop' | 'phone' | 'graphics' | 'mac' | 'console' | 'printer' | 'data' | 'builds' | 'business' | 'wifi' | 'contact' | 'services';
};

const siteUrl = 'https://pixon.com.mx';

export const ENGLISH_OWNER_ROUTES: EnglishRoute[] = [
  { es: '/', en: '/en', title: 'Tech Repair in Cancun | Written English Support | Pixon PC', description: 'Computer, laptop, phone and console repair in Cancun with written English support.', eyebrow: 'English support in Cancun', h1: 'Computer Repair in Cancun', summary: 'Clear written communication, diagnosis and a quote before repair.', category: 'computer' },
  { es: '/servicios/pc', en: '/en/computer-repair', title: 'Computer Repair in Cancun | English Support | Pixon PC', description: 'Computer diagnostics and repair in Cancun with written English support.', eyebrow: 'Computer diagnostics', h1: 'Computer Repair in Cancun', summary: 'Share the PC model and symptom for a clear diagnostic route.', category: 'computer' },
  { es: '/servicios/laptop', en: '/en/laptop-repair', title: 'Laptop Repair in Cancun | English Support | Pixon PC', description: 'Laptop diagnostics and repair in Cancun with written English support.', eyebrow: 'Laptop diagnostics', h1: 'Laptop Repair in Cancun', summary: 'Share the laptop model and symptom before service is arranged.', category: 'laptop' },
  { es: '/servicios/telefono', en: '/en/phone-repair', title: 'Phone Repair in Cancun | English Support | Pixon PC', description: 'Phone diagnostics and repair in Cancun with written English support.', eyebrow: 'Phone diagnostics', h1: 'Phone Repair in Cancun', summary: 'Share the phone model and symptom before a repair route is quoted.', category: 'phone' },
  { es: '/servicios', en: '/en/services', title: 'Repair Services in Cancun | Pixon PC', description: 'Computer, laptop, phone, console, printer and business IT repair services in Cancun.', eyebrow: 'Repair services', h1: 'Repair Services in Cancun', summary: 'Choose the device or service area and share the exact model and symptom.', category: 'services' },
  { es: '/servicios/pc/tarjeta-video-gpu', en: '/en/graphics-card-repair', title: 'Graphics Card Repair in Cancun | GPU Diagnostics | Pixon PC', description: 'GPU diagnostics and graphics card repair in Cancun for black screens, artifacts, crashes and temperature issues.', eyebrow: 'NVIDIA and AMD diagnostics', h1: 'Graphics Card Repair in Cancun', summary: 'We assess black screens, artifacts, crashes, cooling and power-related GPU faults before recommending a repair.', category: 'graphics' },
  { es: '/servicios/mac/reparacion-macbook', en: '/en/macbook-repair', title: 'MacBook Repair in Cancun | Pixon PC', description: 'MacBook diagnosis and repair in Cancun for power, screen, battery, charging, liquid and macOS issues.', eyebrow: 'Apple computer service', h1: 'MacBook Repair in Cancun', summary: 'Tell us the MacBook model and symptom so we can confirm the appropriate diagnostic route.', category: 'mac' },
  { es: '/servicios/consola', en: '/en/game-console-repair', title: 'Game Console Repair in Cancun | PS5, Xbox and Switch | Pixon PC', description: 'Game console diagnostics and repair in Cancun for PS5, Xbox, Nintendo Switch and controllers.', eyebrow: 'Console diagnostics', h1: 'Game Console Repair in Cancun', summary: 'We assess power, HDMI, heat, storage, controller and connectivity problems before quoting.', category: 'console' },
  { es: '/servicios/consola/reparacion-ps5', en: '/en/ps5-repair', title: 'PS5 Repair in Cancun | Diagnostics and Service | Pixon PC', description: 'PS5 diagnostics and repair in Cancun for HDMI, power, overheating, shutdown and storage issues.', eyebrow: 'PlayStation 5 service', h1: 'PS5 Repair in Cancun', summary: 'The diagnostic process confirms whether the issue involves HDMI, power, cooling, storage or another component.', category: 'console' },
  { es: '/servicios/impresora', en: '/en/printer-repair', title: 'Printer Repair in Cancun | Pixon PC', description: 'Printer diagnostics and repair in Cancun for HP, Epson, Canon, Brother, WiFi and paper-feed issues.', eyebrow: 'Home and business printers', h1: 'Printer Repair in Cancun', summary: 'We assess printing quality, paper feed, WiFi, drivers, ink, toner and error messages before quoting.', category: 'printer' },
  { es: '/servicios/pc/recuperacion-datos', en: '/en/data-recovery', title: 'Data Recovery in Cancun | SSD, HDD and Laptop Data | Pixon PC', description: 'Data recovery assessment in Cancun for SSD, HDD, laptops and Windows startup failures.', eyebrow: 'Data comes first', h1: 'Data Recovery in Cancun', summary: 'We assess the storage device and the risk before attempting recovery. Recovery is never guaranteed.', category: 'data' },
  { es: '/ensambles', en: '/en/custom-pc-builds', title: 'Custom PC Builds in Cancun | Gaming and Work PCs | Pixon PC', description: 'Custom PC builds in Cancun for gaming, work, editing, programming and office use.', eyebrow: 'Built around your workload', h1: 'Custom PC Builds in Cancun', summary: 'We discuss the intended workload, display, software and budget before choosing compatible parts.', category: 'builds' },
  { es: '/empresas', en: '/en/business-it-support', title: 'Business IT Support in Cancun | Pixon PC', description: 'Business IT support in Cancun for offices, hotels, device maintenance, networks and technical requests.', eyebrow: 'For offices, hotels and teams', h1: 'Business IT Support in Cancun', summary: 'Share the location, number of devices and operational impact for a clear next step.', category: 'business' },
  { es: '/servicios/b2b/wifi-empresarial', en: '/en/business-wifi', title: 'Business WiFi in Cancun | Network Diagnostics | Pixon PC', description: 'Business WiFi and network diagnostics in Cancun for offices, hotels, printers and connected devices.', eyebrow: 'Network assessment', h1: 'Business WiFi in Cancun', summary: 'We assess coverage, interference, access points, switches, cabling, IP settings and network printers.', category: 'wifi' },
  { es: '/contacto', en: '/en/contact', title: 'Contact Pixon PC | English Support in Cancun', description: 'Contact Pixon PC for computer, laptop, phone, console and business IT support in Cancun.', eyebrow: 'Contact Pixon PC', h1: 'Contact Pixon PC in Cancun', summary: 'Send the device, exact model, symptom and Cancun area for written English support.', category: 'contact' },
  { es: '/servicios/telefono/celular-mojado', en: '/en/liquid-damage', title: 'Water Damage Phone Repair in Cancun | Pixon PC', description: 'Water damage phone assessment in Cancun with written English support.', eyebrow: 'Phone liquid damage', h1: 'Water Damage Phone Repair in Cancun', summary: 'Do not charge the device after liquid exposure.', category: 'phone' },
  { es: '/servicios/telefono/cambio-bateria-iphone', en: '/en/iphone-battery-replacement', title: 'iPhone Battery Replacement in Cancun | Pixon PC', description: 'iPhone battery assessment and replacement in Cancun with written English support.', eyebrow: 'iPhone battery service', h1: 'iPhone Battery Replacement in Cancun', summary: 'Compatibility and battery condition are confirmed by model.', category: 'phone' },
  { es: '/optimizacion', en: '/en/pc-optimization', title: 'Remote Gaming PC Optimization | Fix Low FPS & Stutter | Pixon PC', description: 'Remote gaming PC and Windows 10/11 optimization worldwide. We diagnose low FPS, stuttering, input lag, frametimes, CPU/GPU bottlenecks, thermals and network.', eyebrow: 'Remote Performance Lab', h1: 'Remote Gaming PC Optimization for Low FPS, Stuttering and Input Lag', summary: 'Live remote diagnostics and custom tuning for gaming PCs and laptops. Full before-and-after benchmarks with verified results.', category: 'computer' },
];

const normalizePath = normalizeRoutePath;

export const routeTranslations = [
  ...ENGLISH_OWNER_ROUTES.map(({ es, en }) => ({ es, en })),
  { es: '/tienda', en: '/en/store' },
  { es: '/carrito', en: '/en/cart' },
  { es: '/checkout', en: '/en/checkout' },
  { es: '/cuenta', en: '/en/account' },
  { es: '/tickets', en: '/en/tickets' },
  { es: '/pedido/seguimiento', en: '/en/order/seguimiento' },
  { es: '/tienda/detalle', en: '/en/store/item' },
];
const bySpanish = new Map(routeTranslations.map((route) => [route.es, route]));
const byEnglish = new Map(routeTranslations.map((route) => [route.en, route]));

export const ENGLISH_INDEXABLE_ROUTES = new Set(ENGLISH_OWNER_ROUTES.map((route) => route.en));

export function getEnglishRoute(pathname: string) {
  const path = normalizePath(pathname);
  const exact = bySpanish.get(path);
  if (exact) return exact.en;
  return '/en';
}

export function getSpanishRoute(pathname: string) {
  return byEnglish.get(normalizePath(pathname))?.es;
}

export function getEnglishOwner(pathname: string) {
  return ENGLISH_OWNER_ROUTES.find((route) => route.en === normalizePath(pathname));
}

const RUNTIME_LOCALIZED_ROUTES = new Set([
  '/tienda',
  '/catalogo',
  '/carrito',
  '/checkout',
  '/cuenta',
  '/tickets',
]);

export function isRuntimeLocalizedPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return RUNTIME_LOCALIZED_ROUTES.has(path) || path.startsWith('/pedido/') || path.startsWith('/tienda/');
}

export function getLocalizedPath(pathname: string, targetLocale: Locale) {
  const normalized = normalizePath(pathname);
  if (targetLocale === getLocaleFromPath(normalized)) return normalized;
  return targetLocale === 'en' ? getEnglishRoute(normalized) : getSpanishRoute(normalized) ?? '/';
}


// Alternates are emitted only for exact, reciprocal translations.
export function getLanguageAlternates(pathname: string, baseUrl = siteUrl) {
  const route = bySpanish.get(normalizePath(pathname)) ?? byEnglish.get(normalizePath(pathname));
  if (!route) return [];
  return [
    { hreflang: 'es-MX', href: `${baseUrl}${route.es}` },
    { hreflang: 'en', href: `${baseUrl}${route.en}` },
    { hreflang: 'x-default', href: `${baseUrl}${route.es}` },
  ];
}
