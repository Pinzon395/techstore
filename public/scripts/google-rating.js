// Rellena [data-google-rating] con la calificación real de Google Maps (/api/reviews/google).
// Sin datos (API no configurada o caída) se queda el texto neutro del HTML.
(function () {
  var targets = document.querySelectorAll('[data-google-rating]');
  if (!targets.length) return;
  var KEY = 'pixon-google-rating-v1';
  function paint(data) {
    if (!data || !data.rating || !data.total) return;
    var rating = Number(data.rating).toFixed(1);
    targets.forEach(function (el) {
      var short = el.getAttribute('data-google-rating') === 'short';
      el.textContent = short ? rating + ' ★' : rating + ' ★ · ' + data.total + ' reseñas en Google';
      if (el.tagName === 'A' && data.reviews_url) el.href = data.reviews_url;
    });
  }
  try {
    var cached = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (cached && Date.now() - cached.at < 30 * 60 * 1000) return paint(cached.data);
  } catch (_) {}
  fetch('/api/reviews/google', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      var slim = { rating: data.rating, total: data.total, reviews_url: data.reviews_url };
      try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data: slim })); } catch (_) {}
      paint(slim);
    })
    .catch(function () {});
})();
