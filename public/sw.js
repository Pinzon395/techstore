/**
 * PWA Service Worker - Pixon PC
 * Maneja cache offline y mejora rendimiento
 */

const CACHE_NAME = 'pixon-rollback-80b34d0-20260527';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logos/Logo.svg',
  '/LOGOCIRCULAR.png'
];

const CACHE_STRATEGIES = {
  // Páginas que se cachean y sirven desde cache
  pages: [
    '/',
    '/reparaciones',
    '/paquetes',
    '/contacto'
  ],
  // Recursos que se cachean al primer acceso
  resources: [
    /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico)$/,
    /\/assets\//
  ]
};

// Install - Cache assets estáticos
self.addEventListener('install', (event) => {
  console.log('[PWA] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - Limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('[PWA] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[PWA] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Estrategia cache-first para estáticos, network-first para APIs
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) return;

  // Cache-first para recursos estáticos
  if (isStaticResource(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first para páginas
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/');
        });
      })
  );
});

function isStaticResource(pathname) {
  return CACHE_STRATEGIES.resources.some(regex => regex.test(pathname));
}

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))))
    );
  }
});
