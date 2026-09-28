/**
 * Pixon PC — Smart Cache Buster & Auto-Sync
 *
 * Garantiza que todos los clientes vean los cambios y actualizaciones inmediatamente
 * sin tener que borrar cookies ni limpiar el historial manualmente.
 *
 * Preserva el carrito de compras (pixon.cart.v1) y sesiones de usuario.
 */
(function () {
    'use strict';

    var CURRENT_VERSION = '20260916-062820'; // Reemplazado automáticamente en build
    var KEY = 'pixon_version';

    function purgeOldCaches(targetVersion) {
        if ('caches' in window) {
            caches.keys().then(function (names) {
                var expected = 'pixon-' + (targetVersion || CURRENT_VERSION);
                for (var i = 0; i < names.length; i++) {
                    if (names[i] !== expected) {
                        caches.delete(names[i]);
                    }
                }
            }).catch(function () {});
        }
    }

    function updateServiceWorkers() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function (registrations) {
                for (var i = 0; i < registrations.length; i++) {
                    registrations[i].update();
                }
            }).catch(function () {});
        }
    }

    function checkServerVersion() {
        if (!navigator.onLine) return;
        var url = '/version.json?_t=' + Date.now();
        fetch(url, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        })
        .then(function (res) {
            if (!res.ok) return null;
            return res.json();
        })
        .then(function (data) {
            if (!data || !data.version) return;
            if (data.version !== CURRENT_VERSION) {
                console.log('[Pixon Sync] Nueva versión detectada en servidor:', data.version, '(actual:', CURRENT_VERSION + ')');
                purgeOldCaches(data.version);
                updateServiceWorkers();
                try {
                    localStorage.setItem(KEY, data.version);
                } catch (_) {}
                // Recargar de forma transparente para mostrar el nuevo contenido
                window.location.reload();
            }
        })
        .catch(function () {});
    }

    try {
        var localVer = localStorage.getItem(KEY);

        // Si la versión guardada en el cliente es diferente a la del HTML entregado
        if (localVer && localVer !== CURRENT_VERSION) {
            purgeOldCaches(CURRENT_VERSION);
            updateServiceWorkers();
        }

        // Registrar versión actual sin borrar datos vitales del usuario (carrito, auth)
        localStorage.setItem(KEY, CURRENT_VERSION);

        // Comprobación de versión remota al cargar (tras 2 segundos)
        setTimeout(checkServerVersion, 2000);

        // Comprobación cuando el usuario vuelve a enfocar la pestaña
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') {
                checkServerVersion();
            }
        });

        window.addEventListener('focus', function () {
            checkServerVersion();
        });
    } catch (e) {
        // En caso de restricciones de almacenamiento o navegación privada
    }
})();
