(function() {
  'use strict';

  // Curva de aceleración suave tipo "premium"
  function easeInOutCubic(t) {
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  }

  // Scroll animado manual — independiente del CSS del navegador
  function smoothScrollTo(targetY, duration) {
    duration = duration || 1400; // 1.4s se siente premium, no lento
    const startY = window.pageYOffset || document.documentElement.scrollTop;
    const distance = targetY - startY;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function init() {
    const params = new URLSearchParams(window.location.search);
    const sectionId = params.get('section');
    if (!sectionId) return;

    // Forzar arranque arriba SIN animar (importante)
    const htmlEl = document.documentElement;
    const prevBehavior = htmlEl.style.scrollBehavior;
    htmlEl.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    htmlEl.style.scrollBehavior = prevBehavior;

    // Esperar 1s para que el usuario vea el hero, luego bajar suave
    setTimeout(function() {
      const target = document.getElementById(sectionId);
      if (!target) return;

      // Si tienes header fijo, ajusta el offset
      const fixedHeader = document.querySelector('header.fixed, .navbar-fixed, [data-fixed], #navbar');
      const offset = fixedHeader ? fixedHeader.offsetHeight + 20 : 80;

      const targetY = target.getBoundingClientRect().top + window.pageYOffset - offset;
      smoothScrollTo(targetY, 1400);

      // Limpiar la URL al terminar (queda limpio)
      setTimeout(function() {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }, 1600);
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
