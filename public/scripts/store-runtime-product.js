(function () {
  'use strict';

  var root = document.querySelector('[data-runtime-product]');
  if (!root) return;

  var isEn = document.documentElement.lang === 'en';
  var slug = (new URLSearchParams(location.search).get('slug') || decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '')).trim();
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

  function conditionLabel(code) {
    if (!isEn) return conditionLabels[code] || code || 'Por confirmar';
    return ({ NEW: 'New', USED: 'Pre-owned', REFURBISHED: 'Refurbished', OPEN_BOX: 'Open box', FOR_PARTS: 'For parts', NOT_APPLICABLE: 'Not applicable' })[code] || code || 'To be confirmed';
  }

  function money(value, currency) {
    return new Intl.NumberFormat(isEn ? 'en-US' : 'es-MX', { style: 'currency', currency: currency || 'MXN' }).format(Number(value || 0));
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

    if (isEn) availability = sold ? 'Sold' : item.status === 'RESERVED' ? 'Reserved' : purchasable ? (tracked && availableQuantity === 1 ? 'Last unit' : 'Available') : 'Unavailable';
    document.getElementById('runtime-breadcrumb-name').textContent = item.name;
    document.getElementById('product-title').textContent = item.name.includes('Cancún') ? item.name : item.name + ' en Cancún';
    var skuEl = document.getElementById('runtime-product-sku');
    if (skuEl) skuEl.textContent = 'SKU: ' + (item.sku || 'PIX-' + item.id);
    document.getElementById('runtime-product-lead').textContent = item.short_description || '';
    document.getElementById('runtime-product-description').textContent = item.description || item.short_description || 'Solicita la ficha completa para validar los detalles de esta publicación.';
    document.getElementById('runtime-product-price').textContent = money(currentPrice, currency);
    document.getElementById('runtime-product-availability').textContent = availability;
    document.getElementById('runtime-product-condition').textContent = conditionLabel(item.condition);
    document.getElementById('runtime-product-warranty').textContent = item.warranty_text || '1 año con Pixon PC';
    var trustWarr = document.getElementById('runtime-trust-warranty');
    if (trustWarr) trustWarr.textContent = item.warranty_text || 'Respaldo directo en taller';
    document.getElementById('runtime-sold-stamp').hidden = !sold;

    var original = document.getElementById('runtime-product-original-price');
    var saving = document.getElementById('runtime-product-saving');
    var hasSale = currentPrice < basePrice;
    original.hidden = !hasSale;
    saving.hidden = !hasSale;
    if (hasSale) {
      var diff = basePrice - currentPrice;
      var pct = Math.round((diff / basePrice) * 100);
      original.textContent = money(basePrice, currency);
      saving.innerHTML = '<i class="fa-solid fa-tag" aria-hidden="true"></i> Ahorras ' + money(diff, currency) + ' (-' + pct + '%)';
    }

    var badges = document.getElementById('runtime-product-badges');
    badges.replaceChildren();

    // Type chip
    var typeSpan = document.createElement('span');
    typeSpan.className = 'product-badge-type';
    typeSpan.innerHTML = '<i class="' + (item.item_type === 'SERVICE' ? 'fa-solid fa-screwdriver-wrench' : 'fa-solid fa-desktop') + '" aria-hidden="true"></i> ' + (item.item_type === 'SERVICE' ? 'Servicio Técnico' : 'Equipo');
    badges.appendChild(typeSpan);

    // Condition chip
    var condSpan = document.createElement('span');
    condSpan.className = 'product-badge-condition';
    condSpan.innerHTML = '<i class="fa-solid fa-shield-check" aria-hidden="true"></i> ' + conditionLabel(item.condition);
    badges.appendChild(condSpan);

    // Stock badge
    var stockSpan = document.createElement('span');
    stockSpan.className = 'product-badge-stock ' + (sold ? 'is-sold' : purchasable ? 'in-stock' : 'out-of-stock');
    stockSpan.innerHTML = (sold ? '' : '<span class="stock-dot"></span> ') + (sold ? 'Vendido' : 'En Stock Cancún');
    badges.appendChild(stockSpan);

    (item.badges || []).slice(0, 2).forEach(function (badge) {
      var promoSpan = document.createElement('span');
      promoSpan.className = 'product-badge-promo';
      promoSpan.innerHTML = '<i class="fa-solid fa-bolt" aria-hidden="true"></i> ' + (badge.label || badge.name || String(badge));
      badges.appendChild(promoSpan);
    });

    var ATTRIBUTE_ICONS = {
      cpu_model: 'fa-solid fa-microchip',
      gpu_model: 'fa-solid fa-gamepad',
      ram_capacity_gb: 'fa-solid fa-memory',
      ram_type: 'fa-solid fa-memory',
      ram_speed_mhz: 'fa-solid fa-gauge-high',
      storage_capacity_gb: 'fa-solid fa-hard-drive',
      storage_interface: 'fa-solid fa-hard-drive',
      operating_system: 'fa-brands fa-windows',
      screen_size_inches: 'fa-solid fa-tv',
      screen_refresh_hz: 'fa-solid fa-bolt',
      battery_health_percent: 'fa-solid fa-battery-half',
      service_duration_minutes: 'fa-solid fa-clock',
      service_warranty_days: 'fa-solid fa-shield-halved',
      psu_watts: 'fa-solid fa-bolt',
      gpu_vram_gb: 'fa-solid fa-gamepad'
    };

    var attributes = document.getElementById('runtime-product-attributes');
    attributes.replaceChildren();
    (item.attributes || []).forEach(function (attribute) {
      var label = attribute.label || attribute.name || attribute.key;
      var value = valueLabel(attribute);
      if (!label || !value) return;
      var card = document.createElement('div');
      card.className = 'product-spec-card';
      var iconName = ATTRIBUTE_ICONS[attribute.key] || 'fa-solid fa-circle-info';
      var icon = document.createElement('i');
      icon.className = iconName;
      icon.setAttribute('aria-hidden', 'true');
      var wrap = document.createElement('div');
      var sLabel = document.createElement('span');
      sLabel.className = 'product-spec-label';
      sLabel.textContent = label;
      var sVal = document.createElement('strong');
      sVal.className = 'product-spec-val';
      sVal.textContent = value;
      wrap.append(sLabel, sVal);
      card.append(icon, wrap);
      attributes.appendChild(card);
    });

    var add = document.getElementById('runtime-add-to-cart');
    add.disabled = !purchasable;
    add.innerHTML = '<i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> ' + (purchasable ? (tracked && availableQuantity === 1 ? 'Agregar última unidad al carrito' : 'Agregar al carrito') : availability);
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

    document.title = (item.seo && item.seo.title) || (item.name.includes('Cancún') ? item.name : item.name + ' en Cancún') + ' | Pixon PC';
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
