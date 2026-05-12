// Versionar SW por build: cuando se publica nuevo HTML/CSS, se invalidan caches
// previas. Bumpear esta constante cada vez que cambien recursos críticos cacheados.
const VERSION = '2026-05-11-3';
const CACHE = `pixon-${VERSION}`;
const STATIC_CACHE = `pixon-static-${VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/styles/style.css',
  '/assets/icons/sprite.svg',
  '/LOGOCIRCULAR.png',
  '/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== STATIC_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo mismo origen
  if (url.origin !== self.location.origin) return;

  // API: network only
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Assets con hash (imágenes, CSS, JS con hash en nombre): cache-first
  if (/\/assets\/.+-[A-Za-z0-9_-]{8,}\./.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML / páginas: network-first (siempre frescos, caen a caché sin internet)
  if (url.pathname.endsWith('.html') || url.pathname === '/' || !url.pathname.includes('.')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Otros assets estáticos: cache-first
  if (/\.(css|js|svg|webp|png|jpg|jpeg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return cached || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}
