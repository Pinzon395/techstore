/**
 * Pixon PC — Hash Scroll Blocker
 * Debe ir en el <head>, antes de cualquier otro script.
 * Bloquea el scroll nativo del browser al hash en el instante que carga.
 */
(function() {
    if (window.location.hash) {
        // Scroll al top inmediatamente antes de que el browser mueva la página
        window.scrollTo(0, 0);
        // Truco: sobreescribir scrollRestoration para controlar el comportamiento
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
    }
})();
