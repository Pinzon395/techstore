(() => {
  const labels = { es: { CASH: 'Efectivo', TERMINAL: 'Terminal bancaria', BANK_TRANSFER: 'Transferencia bancaria', ONLINE_CARD: 'Tarjeta en línea' }, en: { CASH: 'Cash', TERMINAL: 'Card terminal', BANK_TRANSFER: 'Bank transfer', ONLINE_CARD: 'Online card' } };
  const locale = document.documentElement.lang?.startsWith('en') ? 'en' : 'es';
  const targets = document.querySelectorAll('[data-payment-methods]');
  if (!targets.length) return;
  fetch('/api/commerce/settings/payment-methods', { credentials: 'same-origin' })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((payload) => {
      const methods = Object.entries(payload?.data || {}).filter(([, value]) => value?.enabled).map(([key]) => labels[locale][key]).filter(Boolean);
      if (!methods.length) return;
      targets.forEach((target) => { target.textContent = methods.join(' · '); target.hidden = false; });
    }).catch(() => {});
})();
