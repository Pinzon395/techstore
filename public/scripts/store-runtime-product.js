(function () {
  'use strict';

  var root = document.querySelector('[data-runtime-product]');
  if (!root) return;

  var slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '').trim();
  var loading = document.getElementById('runtime-product-loading');
  var error = document.getElementById('runtime-product-error');
  var content = document.getElementById('runtime-product-content');
  var conditionLabels = {
    NEW: 'Nuevo',
    USED: 'Usado',
    REFURBISHED: 'Reacondicionado',
    OPEN_BOX: 'Caja abierta',
    FOR_PARTS: 'Para refacciones',
    NOT_APPLICABLE: 'No aplica'
  };

  function money(value, currency) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(Number(value || 0));
  }

  function showError(message) {
    loading.hidden = true;
    content.hidden = true;
    error.hidden = false;
    document.getElementById('runtime-error-message').textContent = message || 'La publicación no está disponible o cambió de dirección.';
  }

  function valueLabel(attribute) {
    var value = attribute && (attribute.formatted_value ?? attribute.value);
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value) + (attribute.unit ? ' ' + attribute.unit : '');
  }

  function renderGallery(item) {
    var media = Array.isArray(item.media) ? item.media.filter(function (entry) { return entry && entry.url; }) : [];
    var primary = media[0] || { url: '/assets/images/tienda-hero-pixon.webp', alt_text: item.name };
    var main = document.getElementById('runtime-product-image');
    var thumbnails = document.getElementById('runtime-product-thumbnails');
    main.src = primary.url;
    main.alt = primary.alt_text || item.name;
    thumbnails.replaceChildren();
    media.forEach(function (entry, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.classList.toggle('is-active', index === 0);
      button.setAttribute('aria-label', 'Ver imagen ' + (index + 1));
      var image = document.createElement('img');
      image.src = entry.url;
      image.alt = '';
      image.width = 96;
      image.height = 72;
      image.loading = 'lazy';
      button.appendChild(image);
      button.addEventListener('click', function () {
        main.src = entry.url;
        main.alt = entry.alt_text || item.name;
        thumbnails.querySelectorAll('button').forEach(function (candidate) { candidate.classList.toggle('is-active', candidate === button); });
      });
      thumbnails.appendChild(button);
    });
    thumbnails.hidden = media.length < 2;
  }

  function render(item) {
    var pricing = item.pricing || {};
    var inventory = item.inventory || {};
    var currency = pricing.currency || 'MXN';
    var basePrice = Number(pricing.base_price || 0);
    var currentPrice = Number(pricing.effective_price || basePrice);
    var availableQuantity = Number(inventory.available_quantity || 0);
    var tracked = Boolean(inventory.tracked);
    var sold = item.status === 'SOLD';
    var purchasable = item.status === 'ACTIVE' && Boolean(item.allow_purchase) && (!tracked || availableQuantity > 0);
    var availability = sold ? 'Vendido' : item.status === 'RESERVED' ? 'Reservado' : purchasable ? (tracked && availableQuantity === 1 ? 'Última unidad' : 'Disponible') : 'No disponible';

    document.getElementById('runtime-breadcrumb-name').textContent = item.name;
    document.getElementById('product-title').textContent = item.name + ' en Cancún';
    document.getElementById('runtime-product-lead').textContent = item.short_description || '';
    document.getElementById('runtime-product-description').textContent = item.description || item.short_description || 'Solicita la ficha completa para validar los detalles de esta publicación.';
    document.getElementById('runtime-product-price').textContent = money(currentPrice, currency);
    document.getElementById('runtime-product-availability').textContent = availability;
    document.getElementById('runtime-product-condition').textContent = conditionLabels[item.condition] || item.condition || 'Por confirmar';
    document.getElementById('runtime-product-warranty').textContent = item.warranty_text || 'Consulta cobertura según la publicación';
    document.getElementById('runtime-sold-stamp').hidden = !sold;

    var original = document.getElementById('runtime-product-original-price');
    var saving = document.getElementById('runtime-product-saving');
    var hasSale = currentPrice < basePrice;
    original.hidden = !hasSale;
    saving.hidden = !hasSale;
    if (hasSale) {
      original.textContent = money(basePrice, currency);
      saving.textContent = 'Ahorras ' + money(basePrice - currentPrice, currency);
    }

    var badges = document.getElementById('runtime-product-badges');
    badges.replaceChildren();
    (item.badges || []).slice(0, 3).forEach(function (badge) {
      var span = document.createElement('span');
      span.textContent = badge.label || badge.name || String(badge);
      badges.appendChild(span);
    });
    var conditionBadge = document.createElement('span');
    conditionBadge.textContent = conditionLabels[item.condition] || 'Pixon PC';
    badges.appendChild(conditionBadge);

    var attributes = document.getElementById('runtime-product-attributes');
    attributes.replaceChildren();
    (item.attributes || []).forEach(function (attribute) {
      var label = attribute.label || attribute.name || attribute.key;
      var value = valueLabel(attribute);
      if (!label || !value) return;
      var row = document.createElement('div');
      var dt = document.createElement('dt');
      var dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      row.append(dt, dd);
      attributes.appendChild(row);
    });

    var add = document.getElementById('runtime-add-to-cart');
    add.disabled = !purchasable;
    add.textContent = purchasable ? (tracked && availableQuantity === 1 ? 'Agregar última unidad' : 'Agregar al carrito') : availability;
    add.dataset.itemId = String(item.id);
    add.dataset.itemSlug = item.slug;
    add.dataset.itemName = item.name;
    add.dataset.itemPrice = String(currentPrice);
    add.dataset.itemCurrency = currency;
    add.dataset.itemType = item.item_type || 'PRODUCT';
    add.dataset.itemMax = String(tracked ? Math.max(1, availableQuantity) : 100);
    add.dataset.itemImage = item.media && item.media[0] && item.media[0].url || '';

    var message = 'Hola Pixon PC, quiero consultar “' + item.name + '” (' + item.slug + ').';
    document.getElementById('runtime-product-whatsapp').href = 'https://wa.me/529986690777?text=' + encodeURIComponent(message);
    renderGallery(item);

    document.title = (item.seo && item.seo.title) || item.name + ' en Cancún | Pixon PC';
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = location.origin + '/tienda/' + encodeURIComponent(item.slug);
    loading.hidden = true;
    error.hidden = true;
    content.hidden = false;
  }

  fetch('/api/commerce/catalog/' + encodeURIComponent(slug), { credentials: 'include', headers: { Accept: 'application/json' } })
    .then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok || payload.ok === false) throw new Error(payload.error && payload.error.message || 'La publicación ya no está disponible.');
        return payload.data && (payload.data.item || payload.data);
      });
    })
    .then(render)
    .catch(function (cause) { showError(cause.message); });
})();
