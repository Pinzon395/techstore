(function () {
  if (window._pixnTracked) return;
  window._pixnTracked = true;

  const API = '/api/track/view';
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
