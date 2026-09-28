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
    var num = Number(value || 0);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency || 'MXN',
      maximumFractionDigits: 0
    }).format(num);
  }

  var TYPE_LABELS = {
    PRODUCT: 'Producto',
    EQUIPMENT: 'Equipo',
    HARDWARE: 'Hardware',
    SERVICE: 'Servicio',
    BUNDLE: 'Paquete'
  };

  var CONDITION_LABELS = {
    NEW: 'Nuevo',
    USED: 'Seminuevo',
    REFURBISHED: 'Reacondicionado',
    OPEN_BOX: 'Caja abierta',
    FOR_PARTS: 'Para piezas',
    NOT_APPLICABLE: 'Garantizado'
  };

  function getHighlights(item) {
    var slug = (item.slug || '').toLowerCase();
    if (slug.indexOf('rtx-3060') !== -1 || slug.indexOf('pc-gamer') !== -1) {
      return [
        { icon: 'fa-solid fa-microchip', text: 'Ryzen 5 5600' },
        { icon: 'fa-solid fa-gamepad', text: 'RTX 3060 12GB' },
        { icon: 'fa-solid fa-memory', text: '16GB RAM Dual' },
        { icon: 'fa-solid fa-hard-drive', text: '1TB SSD NVMe' }
      ];
    }
    if (slug.indexOf('arctic-mx4') !== -1 || slug.indexOf('mantenimiento') !== -1) {
      return [
        { icon: 'fa-solid fa-temperature-arrow-down', text: 'Pasta Arctic MX-4' },
        { icon: 'fa-solid fa-spray-can-sparkles', text: 'Limpieza antiestática' },
        { icon: 'fa-solid fa-fan', text: 'Soplado de turbinas' },
        { icon: 'fa-solid fa-chart-line', text: 'Pruebas térmicas' }
      ];
    }
    if (slug.indexOf('laptop') !== -1 || slug.indexOf('matebook') !== -1) {
      return [
        { icon: 'fa-solid fa-microchip', text: 'Ryzen 5 3500U' },
        { icon: 'fa-solid fa-tv', text: 'Pantalla 15.6" FHD' },
        { icon: 'fa-solid fa-memory', text: '8GB RAM' },
        { icon: 'fa-solid fa-shield-halved', text: 'Garantía escrita' }
      ];
    }
    if (Array.isArray(item.attributes) && item.attributes.length) {
      return item.attributes.slice(0, 4).map(function (a) {
        return { icon: 'fa-solid fa-check', text: (a.label || a.name) + ': ' + (a.value || '') };
      });
    }
    return [
      { icon: 'fa-solid fa-shield-halved', text: 'Garantía por escrito' },
      { icon: 'fa-solid fa-shop', text: 'Taller físico Cancún' },
      { icon: 'fa-solid fa-truck', text: 'Entrega local Cancún' }
    ];
  }

  function card(item) {
    var article = node('article', 'home-store-card store-product-card');
    article.dataset.itemId = String(item.id || '');

    // Media Link
    var link = node('a', 'store-card-media');
    var productUrl = '/tienda/' + encodeURIComponent(item.slug);
    link.href = productUrl;
    link.setAttribute('aria-label', 'Ver ' + item.name);

    var image = item.media && item.media[0];
    if (image && image.url) {
      var img = document.createElement('img');
      img.src = image.url;
      img.alt = image.alt_text || item.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 420;
      img.height = 315;
      link.appendChild(img);
    } else {
      var placeholder = node('div', 'store-card-placeholder');
      var icon = document.createElement('i');
      icon.className = item.item_type === 'SERVICE' ? 'fa-solid fa-screwdriver-wrench' : 'fa-solid fa-desktop';
      icon.setAttribute('aria-hidden', 'true');
      placeholder.appendChild(icon);
      link.appendChild(placeholder);
    }

    // Floating Badges / Flags (Left & Right)
    var flags = node('div', 'store-card-flags');
    var flagsLeft = node('div', 'store-card-flags-left');
    var flagsRight = node('div', 'store-card-flags-right');

    var isSold = item.status === 'SOLD';
    var availFlag = node('span', 'store-card-flag ' + (isSold ? 'flag-sold' : 'flag-available'));
    if (!isSold) {
      var dot = node('span', 'stock-dot');
      availFlag.appendChild(dot);
      availFlag.appendChild(document.createTextNode(' En Stock Cancún'));
    } else {
      availFlag.appendChild(document.createTextNode(' Vendido'));
    }
    flagsLeft.appendChild(availFlag);

    // Promotional badge on the right
    if (Array.isArray(item.badges) && item.badges.length) {
      var b = item.badges[0];
      if (b && b.label) {
        var promoClass = (b.key === 'MEGA_OFFER' || b.style === 'DANGER') ? 'flag-promo'
          : (b.key === 'RECOMMENDED' || b.style === 'ACCENT') ? 'flag-recommended'
          : 'flag-warning';
        var iconName = b.icon || (b.key === 'MEGA_OFFER' ? 'fa-bolt' : b.key === 'RECOMMENDED' ? 'fa-star' : 'fa-box-open');
        var promoFlag = node('span', 'store-card-flag ' + promoClass);
        var pIcon = document.createElement('i');
        pIcon.className = 'fa-solid ' + (iconName.indexOf('fa-') === 0 ? iconName : 'fa-' + iconName);
        pIcon.setAttribute('aria-hidden', 'true');
        promoFlag.appendChild(pIcon);
        promoFlag.appendChild(document.createTextNode(' ' + b.label));
        flagsRight.appendChild(promoFlag);
      }
    }

    flags.appendChild(flagsLeft);
    flags.appendChild(flagsRight);
    link.appendChild(flags);
    article.appendChild(link);

    // Body
    var body = node('div', 'store-card-body');

    // Meta (Type & Condition Chips)
    var meta = node('div', 'store-card-meta');
    var typeText = TYPE_LABELS[item.item_type] || 'Tecnología';
    var typeIconClass = item.item_type === 'SERVICE' ? 'fa-screwdriver-wrench' : item.item_type === 'EQUIPMENT' ? 'fa-desktop' : 'fa-tag';
    var typeChip = node('span', 'store-card-type-chip');
    var tIcon = document.createElement('i');
    tIcon.className = 'fa-solid ' + typeIconClass;
    tIcon.setAttribute('aria-hidden', 'true');
    typeChip.appendChild(tIcon);
    typeChip.appendChild(document.createTextNode(' ' + typeText));
    meta.appendChild(typeChip);

    var condText = CONDITION_LABELS[item.condition] || '';
    if (condText) {
      var condChip = node('span', 'store-card-cond-chip');
      var cIcon = document.createElement('i');
      cIcon.className = 'fa-solid fa-shield-check';
      cIcon.setAttribute('aria-hidden', 'true');
      condChip.appendChild(cIcon);
      condChip.appendChild(document.createTextNode(' ' + condText));
      meta.appendChild(condChip);
    }
    body.appendChild(meta);

    // Title
    var title = node('h3');
    var titleLink = node('a', '', item.name);
    titleLink.href = productUrl;
    title.appendChild(titleLink);
    body.appendChild(title);

    // Spec Chips Row
    var specsRow = node('div', 'store-card-specs');
    var highlights = getHighlights(item);
    highlights.forEach(function (h) {
      var chip = node('span', 'store-card-spec-chip');
      var sIcon = document.createElement('i');
      sIcon.className = h.icon;
      sIcon.setAttribute('aria-hidden', 'true');
      chip.appendChild(sIcon);
      chip.appendChild(document.createTextNode(' ' + h.text));
      specsRow.appendChild(chip);
    });
    body.appendChild(specsRow);

    // Description
    var descText = item.short_description || 'Consulta especificaciones, condición física y garantía en taller.';
    body.appendChild(node('p', 'store-card-description', descText));

    // Pricing Row
    var pricing = item.pricing || {};
    var basePrice = Number(pricing.base_price || 0);
    var currentPrice = Number(pricing.effective_price || pricing.sale_price || basePrice);

    var priceRow = node('div', 'store-card-price-row');
    var priceNumbers = node('div', 'store-card-price-numbers');
    priceNumbers.appendChild(node('span', 'store-card-price', money(currentPrice, pricing.currency)));
    if (basePrice > currentPrice) {
      priceNumbers.appendChild(node('del', 'store-card-original', money(basePrice, pricing.currency)));
    }
    priceRow.appendChild(priceNumbers);

    if (basePrice > currentPrice) {
      var saving = basePrice - currentPrice;
      var pct = Math.round((saving / basePrice) * 100);
      var saveEl = node('span', 'store-card-saving');
      var tagIcon = document.createElement('i');
      tagIcon.className = 'fa-solid fa-tag';
      tagIcon.setAttribute('aria-hidden', 'true');
      saveEl.appendChild(tagIcon);
      saveEl.appendChild(document.createTextNode(' Ahorras ' + money(saving, pricing.currency) + ' (-' + pct + '%)'));
      priceRow.appendChild(saveEl);
    }

    var subnote = node('div', 'store-card-subnote');
    var subIcon = document.createElement('i');
    subIcon.className = 'fa-solid fa-shield-halved';
    subIcon.setAttribute('aria-hidden', 'true');
    subnote.appendChild(subIcon);
    subnote.appendChild(document.createTextNode(' Garantía Pixon PC en Cancún • Entrega local'));
    priceRow.appendChild(subnote);

    body.appendChild(priceRow);

    // Actions
    var actions = node('div', 'store-card-actions');

    // Button Add to Cart
    var purchasable = !isSold && item.status === 'ACTIVE' && item.allow_purchase !== false;
    if (purchasable) {
      var addBtn = node('button', 'store-card-add');
      addBtn.type = 'button';
      addBtn.dataset.addToCart = '';
      addBtn.dataset.itemId = String(item.id);
      addBtn.dataset.itemSlug = item.slug;
      addBtn.dataset.itemName = item.name;
      addBtn.dataset.itemPrice = String(currentPrice);
      addBtn.dataset.itemCurrency = pricing.currency || 'MXN';
      addBtn.dataset.itemImage = (image && image.url) || '';
      addBtn.dataset.itemType = item.item_type || 'PRODUCT';
      addBtn.dataset.itemMax = String(item.inventory && item.inventory.available_quantity ? item.inventory.available_quantity : 10);
      addBtn.setAttribute('aria-label', 'Agregar ' + item.name + ' al carrito');

      var cartIcon = document.createElement('i');
      cartIcon.className = 'fa-solid fa-cart-shopping';
      cartIcon.setAttribute('aria-hidden', 'true');
      addBtn.appendChild(cartIcon);
      addBtn.appendChild(document.createTextNode(' Agregar al carrito'));
      actions.appendChild(addBtn);
    }

    // Secondary Link: View details
    var detailLink = node('a', 'home-store-btn-details');
    detailLink.href = productUrl;
    detailLink.setAttribute('aria-label', 'Ver detalles de ' + item.name);
    detailLink.appendChild(document.createTextNode('Ver detalles '));
    var arrIcon = document.createElement('i');
    arrIcon.className = 'fa-solid fa-arrow-right';
    arrIcon.setAttribute('aria-hidden', 'true');
    detailLink.appendChild(arrIcon);
    actions.appendChild(detailLink);

    // WhatsApp Action
    var waUrl = 'https://wa.me/529986690777?text=' + encodeURIComponent('Hola Pixon PC, me interesa consultar información y disponibilidad de: ' + item.name + ' (' + item.slug + ')');
    var waLink = node('a', 'home-store-btn-wa');
    waLink.href = waUrl;
    waLink.target = '_blank';
    waLink.rel = 'noopener noreferrer';
    waLink.title = 'Consultar por WhatsApp';
    waLink.setAttribute('aria-label', 'Consultar ' + item.name + ' por WhatsApp');
    var waIcon = document.createElement('i');
    waIcon.className = 'fa-brands fa-whatsapp';
    waIcon.setAttribute('aria-hidden', 'true');
    waLink.appendChild(waIcon);
    actions.appendChild(waLink);

    body.appendChild(actions);
    article.appendChild(body);
    return article;
  }

  function renderItems(items) {
    if (!items || !items.length) {
      grid.replaceChildren();
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    var cards = items.slice(0, 3).map(card);
    grid.replaceChildren.apply(grid, cards);
  }

  function loadCatalog() {
    fetch('/api/commerce/catalog?pageSize=6&sort=featured', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('catalog');
        return response.json();
      })
      .then(function (payload) {
        var items = Array.isArray(payload.data) ? payload.data : [];
        if (!items.length) {
          return fetch('/api/commerce/catalog?pageSize=6', { credentials: 'include', headers: { Accept: 'application/json' } })
            .then(function (r) { return r.json(); })
            .then(function (p) {
              var fallbackItems = Array.isArray(p.data) ? p.data : [];
              renderItems(fallbackItems);
            });
        }
        renderItems(items);
      })
      .catch(function () {
        grid.replaceChildren();
        if (empty) empty.hidden = false;
      });
  }

  loadCatalog();
})();
