(function () {
  'use strict';
  function node(tag, className, text) { var item = document.createElement(tag); if (className) item.className = className; if (text != null) item.textContent = text; return item; }
  function money(value, currency) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(Number(value || 0)); }
  function promoCard(promotion) {
    var article = node('article', 'promotion-card');
    var presentation = promotion.presentation || {};
    article.append(node('span', 'store-card-flag is-sale', promotion.badge || 'Promoción'), node('h3', '', presentation.title || promotion.name), node('p', '', presentation.text || 'Descuento aplicado y validado por el servidor.'));
    var value = promotion.promotion_type === 'PERCENT' ? Number(promotion.promotion_value) + '%' : money(promotion.promotion_value, 'MXN');
    article.append(node('strong', '', value));
    if (promotion.ends_at) article.append(node('time', '', 'Vigente hasta ' + new Date(promotion.ends_at).toLocaleDateString('es-MX')));
    var link = node('a', '', 'Ver artículos'); link.href = '/tienda'; article.append(link); return article;
  }
  function productCard(item) {
    var article = node('article', 'home-store-card');
    var link = node('a', 'home-store-card-media'); link.href = '/tienda/' + encodeURIComponent(item.slug);
    if (item.media?.[0]?.url) { var image = document.createElement('img'); image.src = item.media[0].url; image.alt = item.media[0].alt_text || item.name; image.loading = 'lazy'; link.appendChild(image); }
    var body = node('div', 'home-store-card-body'); var title = node('h3'); var titleLink = node('a', '', item.name); titleLink.href = link.href; title.appendChild(titleLink); body.append(title, node('strong', '', money(item.pricing.effective_price, item.pricing.currency))); article.append(link, body); return article;
  }
  async function get(url) { var response = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } }); var payload = await response.json(); if (!response.ok || payload.ok === false) throw new Error('request'); return Array.isArray(payload.data) ? payload.data : []; }
  Promise.all([get('/api/commerce/promotions'), get('/api/commerce/catalog?availability=LOW_STOCK&pageSize=6'), get('/api/commerce/catalog?status=SOLD&pageSize=6&sort=newest')]).then(function (results) {
    var promotions = results[0], low = results[1], sold = results[2];
    var active = document.getElementById('promotions-active'); active.replaceChildren.apply(active, promotions.map(promoCard));
    if (!promotions.length) active.append(node('p', 'store-state', 'No hay promociones activas en este momento.'));
    var soon = promotions.filter(function (promotion) { return promotion.ends_at && new Date(promotion.ends_at).getTime() - Date.now() <= 7 * 86400000 && new Date(promotion.ends_at) > new Date(); });
    if (soon.length) { document.getElementById('promotions-ending-section').hidden = false; var end = document.getElementById('promotions-ending'); end.replaceChildren.apply(end, soon.map(promoCard)); }
    if (low.length) { document.getElementById('last-units-section').hidden = false; var lowGrid = document.getElementById('last-units-grid'); lowGrid.replaceChildren.apply(lowGrid, low.map(productCard)); }
    var soldGrid = document.getElementById('sold-promotions-grid'); soldGrid.replaceChildren.apply(soldGrid, sold.map(productCard)); if (!sold.length) soldGrid.append(node('p', 'store-state', 'No hay publicaciones vendidas visibles.'));
  }).catch(function () { document.getElementById('promotions-active').textContent = 'No pudimos cargar promociones. Intenta nuevamente.'; });
})();

