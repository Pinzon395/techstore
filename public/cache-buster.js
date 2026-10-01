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

    var CURRENT_VERSION = '20261001T192401Z-a3cf15ead09e'; // Reemplazado automáticamente en build
    var KEY = 'pixon_version';

    function purgeOldCaches(targetVersion) {
        if ('caches' in window) {
            caches.keys().then(function (names) {
                var expected = 'pixon-' + (targetVersion || CURRENT_VERSION);
                for (var i = 0; i < names.length; i++) {
                    if (names[i].indexOf('pixon-') === 0 && names[i] !== expected) {
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

    function showUpdateNotice(serverVersion) {
        if (document.getElementById('pixon-update-notice')) return;
        var notice = document.createElement('aside');
        notice.id = 'pixon-update-notice';
        notice.setAttribute('role', 'status');
        notice.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;align-items:center;gap:10px;max-width:min(420px,calc(100vw - 32px));padding:12px 14px;border:1px solid rgba(56,189,248,.45);border-radius:12px;background:#071f3a;color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.4);font:600 14px/1.35 system-ui,sans-serif';
        var message = document.createElement('span');
        message.textContent = 'Nueva versión disponible (' + serverVersion + ').';
        var refresh = document.createElement('button');
        refresh.type = 'button';
        refresh.textContent = 'Actualizar';
        refresh.style.cssText = 'padding:7px 10px;border:0;border-radius:8px;background:#22d3ee;color:#071f3a;font:700 13px system-ui;cursor:pointer';
        refresh.addEventListener('click', function () { window.location.reload(); });
        var dismiss = document.createElement('button');
        dismiss.type = 'button';
        dismiss.textContent = '×';
        dismiss.setAttribute('aria-label', 'Ocultar aviso de actualización');
        dismiss.style.cssText = 'border:0;background:transparent;color:#fff;font-size:20px;cursor:pointer';
        dismiss.addEventListener('click', function () { notice.remove(); });
        notice.append(message, refresh, dismiss);
        document.body.appendChild(notice);
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
                purgeOldCaches(data.version);
                updateServiceWorkers();
                showUpdateNotice(data.version);
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

        // Una comprobación ligera al cargar; nunca se recarga sin consentimiento.
        checkServerVersion();

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
