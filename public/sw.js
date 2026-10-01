/**
 * PWA Service Worker - Pixon PC
 * Maneja cache offline y garantiza actualización inmediata de contenido.
 */

const CACHE_NAME = 'pixon-20261001T192222Z-32027369a7fe';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.png',
  '/LOGOCIRCULAR.png'
];

// Install - Cache mínimo esencial para PWA offline, nunca HTML de páginas
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - Borrar de inmediato todas las cachés anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name.startsWith('pixon-') && name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Estrategias según el tipo de recurso
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests and Auth routes - siempre red directa
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) return;

  // 1. Navegación / Páginas HTML: SIEMPRE RED PRIMERO (Network-First estricto)
  // Los clientes nunca deben ver HTML viejo si hay conexión a internet
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Solo si no hay internet (offline), intentar servir desde caché
          return caches.match(request).then((cached) => {
            return cached || caches.match('/offline.html') || new Response(
              '<h1>Sin conexión a internet</h1><p>Verifica tu conexión para cargar Pixon PC.</p>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          });
        })
    );
    return;
  }

  // 2. Recursos con hash de Vite/Astro (_astro/* con hash largo): Cache-First seguro
  if (/\/_astro\/.+\.[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. Scripts públicos, version.json o archivos dinámicos: Network-First (siempre frescos)
  if (url.pathname.endsWith('.json') || url.pathname.startsWith('/scripts/') || url.pathname.startsWith('/styles/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 4. Otros recursos estáticos (imágenes, fuentes): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});

// Mensajes desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names
        .filter((name) => name.startsWith('pixon-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
    );
  }
});
