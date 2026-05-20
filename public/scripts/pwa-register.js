/**
 * PWA Registration - Pixon PC
 * Registra el Service Worker para funcionalidad offline
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('[PWA] Service Worker registered:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New version available');
            if (confirm('Nueva versión disponible. ¿Recargar?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      });
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  });
}

// Detect PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('[PWA] Install prompt available');
});

async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[PWA] Install prompt outcome:', outcome);
  deferredPrompt = null;
}

// Expose for manual trigger
window.installPWA = installPWA;