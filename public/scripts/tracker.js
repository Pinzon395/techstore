(function () {
  if (window._pixnTracked) return;
  window._pixnTracked = true;

  const API = '/api/track/view';
  const EVENT_API = '/api/track/event';
  let lastPath = location.pathname;

  function track(path, title) {
    try {
      const payload = JSON.stringify({
        path: path || location.pathname,
        title: title || document.title,
        referrer: document.referrer || ''
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API, payload);
      } else {
        fetch(API, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true });
      }
    } catch (e) { /* silent */ }
  }

  track();

  function conversion(eventName) {
    try {
      const params = new URLSearchParams(location.search);
      const payload = JSON.stringify({
        event: eventName,
        path: location.pathname,
        locale: document.documentElement.lang === 'en' ? 'en' : 'es',
        referrer: document.referrer || '',
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || ''
      });
      if (navigator.sendBeacon) navigator.sendBeacon(EVENT_API, payload);
      else fetch(EVENT_API, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true });
    } catch (e) { /* analytics must not affect the interaction */ }
  }

  window.pixonTrackEvent = conversion;
  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (/^https:\/\/wa\.me\//i.test(href)) conversion('whatsapp_click');
    if (/^tel:/i.test(href)) conversion('phone_click');
  }, { capture: true });

  let lastTime = Date.now();
  setInterval(function () {
    const p = location.pathname;
    if (p !== lastPath) {
      lastPath = p;
      track();
    }
  }, 2000);

  window.addEventListener('popstate', function () {
    setTimeout(track, 300);
  });

  const origPush = history.pushState;
  history.pushState = function () {
    origPush.apply(this, arguments);
    setTimeout(track, 300);
  };
  const origReplace = history.replaceState;
  history.replaceState = function () {
    origReplace.apply(this, arguments);
    setTimeout(track, 300);
  };
})();
