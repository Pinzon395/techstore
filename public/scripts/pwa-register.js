/**
 * PWA Registration - Pixon PC
 * Registra el Service Worker y aplica actualizaciones inmediatas sin requerir borrar cookies.
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js?v=20261001T192401Z-a3cf15ead09e', {
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
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Actualizar periódicamente si la pestaña vuelve a ser visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });

    } catch (error) {
      // La web sigue operativa sin modo offline; no contaminar consola del admin.
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
  deferredPrompt = null;
}

window.installPWA = installPWA;
