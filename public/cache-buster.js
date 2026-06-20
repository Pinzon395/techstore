/**
 * Pixon PC — Cache Buster
 *
 * Limpia localStorage/sessionStorage/SW caches cuando la version
 * almacenada no coincide con la actual. Evita inconsistencias entre
 * el HTML servido y assets cacheados antiguos.
 *
 * Cargado con `defer` desde cada pagina HTML para que NO bloquee
 * el render inicial. Cuando la version cambia, el reload ocurre
 * despues del parse del DOM (el usuario nunca ve la version antigua).
 *
 * Para subir version del sitio: cambiar la constante CURRENT_VERSION.
 */
(function () {
    var CURRENT_VERSION = '20260620-1';
    var KEY = 'pixon_version';

    try {
        var userVersion = localStorage.getItem(KEY);
        if (userVersion === CURRENT_VERSION) return;
        if (!userVersion) {
            localStorage.setItem(KEY, CURRENT_VERSION);
            return;
        }

        localStorage.clear();
        sessionStorage.clear();

        if ('caches' in window) {
            caches.keys().then(function (names) {
                for (var i = 0; i < names.length; i++) caches.delete(names[i]);
            });
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function (regs) {
                for (var i = 0; i < regs.length; i++) regs[i].unregister();
            });
        }

        localStorage.setItem(KEY, CURRENT_VERSION);
        window.location.reload(true);
    } catch (e) {
        // localStorage puede fallar en modo privado o por politicas del navegador.
        // En ese caso simplemente no aplicamos cache-busting.
    }
})();
