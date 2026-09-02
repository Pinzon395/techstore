/**
 * Only pair pages that are genuine translations of the same service. The
 * English support banner may fall back to /en, but that fallback is never an
 * hreflang relationship.
 */
const englishRouteMap: Record<string, string> = {
  '/': '/en',
  '/servicios/telefono/celular-mojado': '/en/liquid-damage',
  '/servicios/telefono/cambio-bateria-iphone': '/en/iphone-battery-replacement',
};

const spanishRouteMap: Record<string, string> = Object.fromEntries(
  Object.entries(englishRouteMap).map(([spanishPath, englishPath]) => [englishPath, spanishPath]),
);

const normalizePath = (pathname: string) => {
  const path = pathname.split(/[?#]/, 1)[0] || '/';
  const withoutHtml = path.replace(/\.html$/, '');
  return withoutHtml.replace(/\/$/, '') || '/';
};

export const ENGLISH_INDEXABLE_ROUTES = new Set(Object.values(englishRouteMap));

export function getEnglishRoute(pathname: string) {
  return englishRouteMap[normalizePath(pathname)] ?? '/en';
}

export function getSpanishRoute(pathname: string) {
  return spanishRouteMap[normalizePath(pathname)];
}

export function getLanguageAlternates(pathname: string, siteUrl = 'https://pixon.com.mx') {
  const path = normalizePath(pathname);
  const spanishPath = spanishRouteMap[path] ?? path;
  const englishPath = englishRouteMap[spanishPath];

  if (!englishPath) return [];

  return [
    { hreflang: 'es-MX', href: `${siteUrl}${spanishPath}` },
    { hreflang: 'en', href: `${siteUrl}${englishPath}` },
    { hreflang: 'x-default', href: `${siteUrl}${spanishPath}` },
  ];
}
