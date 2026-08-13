(function () {
  'use strict';
  var grid = document.getElementById('home-store-grid');
  var empty = document.getElementById('home-store-empty');
  if (!grid) return;

  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }
  function money(value, currency) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(Number(value || 0));
  }
  function card(item) {
    var article = node('article', 'home-store-card');
    var link = node('a', 'home-store-card-media');
    link.href = '/tienda/' + encodeURIComponent(item.slug);
    var image = item.media && item.media[0];
    if (image && image.url) {
      var img = document.createElement('img');
      img.src = image.url;
      img.alt = image.alt_text || item.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      link.appendChild(img);
    } else {
      link.appendChild(node('span', 'home-store-placeholder', item.item_type === 'SERVICE' ? 'Servicio' : 'Pixon PC'));
    }
    article.appendChild(link);
    var body = node('div', 'home-store-card-body');
    body.appendChild(node('span', 'store-card-flag', item.status === 'SOLD' ? 'Vendido' : 'Disponible'));
    var title = node('h3');
    var titleLink = node('a', '', item.name);
    titleLink.href = link.href;
    title.appendChild(titleLink);
    body.appendChild(title);
    body.appendChild(node('p', '', item.short_description || 'Consulta detalles, condición y disponibilidad.'));
    body.appendChild(node('strong', '', money(item.pricing && item.pricing.effective_price, item.pricing && item.pricing.currency)));
    article.appendChild(body);
    return article;
  }

  fetch('/api/commerce/catalog?featured=1&pageSize=6', { credentials: 'include', headers: { Accept: 'application/json' } })
    .then(function (response) { if (!response.ok) throw new Error('catalog'); return response.json(); })
    .then(function (payload) {
      var items = Array.isArray(payload.data) ? payload.data : [];
      grid.replaceChildren.apply(grid, items.map(card));
      if (!items.length) empty.hidden = false;
    })
    .catch(function () {
      grid.replaceChildren();
      empty.hidden = false;
    });
})();

