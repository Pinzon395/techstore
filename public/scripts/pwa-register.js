/**
 * PWA Registration - Pixon PC
 * Registra el Service Worker y aplica actualizaciones inmediatas sin requerir borrar cookies.
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js?v=20260916-062820', {
        scope: '/'
      });

      // Solicitar actualización activa al registrar
      registration.update().catch(() => {});

      // Escuchar si hay un nuevo worker instalándose
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] Nueva versión disponible. Activando...');
            newWorker.postMessage({ type: 'CLEAR_CACHE' });
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Si el controlador cambia (nueva versión tomó el mando), recargar una sola vez
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('[PWA] Controlador actualizado. Recargando página...');
          window.location.reload();
        }
      });

      // Actualizar periódicamente si la pestaña vuelve a ser visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });

    } catch (error) {
      console.error('[PWA] Fallo de registro de Service Worker:', error);
    }
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
});

async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[PWA] Resultado de instalación:', outcome);
  deferredPrompt = null;
}

window.installPWA = installPWA;
