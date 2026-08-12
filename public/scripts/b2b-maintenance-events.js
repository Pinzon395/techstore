(() => {
  'use strict';

  const page = '/servicios/mantenimiento-preventivo-pc-empresas';
  const service = 'mantenimiento-preventivo-empresarial';
  const send = (eventName, placement) => {
    if (!eventName) return;

    window.dataLayer = window.dataLayer || [];
    const payload = { page, placement, service };
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload);
      return;
    }

    window.dataLayer.push({ event: eventName, ...payload });
  };

  send('b2b_maintenance_view', 'page');
  document.querySelectorAll('[data-b2b-event]').forEach((link) => {
    link.addEventListener('click', () => {
      const placement = link.getAttribute('data-placement') || 'unknown';
      send(link.getAttribute('data-b2b-event'), placement);

      const secondaryEvent = link.getAttribute('data-b2b-secondary-event');
      if (secondaryEvent) send(secondaryEvent, placement);
    });
  });
})();
