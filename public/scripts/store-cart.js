(function () {
  'use strict';

  var STORAGE_KEY = 'pixon.cart.v1';
  var DEFAULT_MAX = 100;
  var drawer = document.getElementById('store-cart-drawer');
  var drawerItems = document.getElementById('store-cart-drawer-items');
  var drawerTotal = document.getElementById('store-cart-drawer-total');
  var launcher = document.getElementById('store-cart-launcher');
  var launcherCount = document.getElementById('store-cart-launcher-count');
  var toastRegion = document.getElementById('store-toast-region');
  var drawerTrigger = null;

  function positiveInteger(value, fallback) {
    var parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  function maxFor(item) {
    return Math.max(1, Math.min(DEFAULT_MAX, positiveInteger(item && item.maxQuantity, DEFAULT_MAX)));
  }

  function sanitizeEntry(item) {
    if (!item || !item.id || !item.slug) return null;
    var maxQuantity = maxFor(item);
    return {
      id: Number(item.id),
      slug: String(item.slug),
      quantity: Math.max(1, Math.min(maxQuantity, positiveInteger(item.quantity, 1))),
      maxQuantity: maxQuantity,
      visual: {
        name: String(item.visual && item.visual.name || 'Artículo'),
        image: String(item.visual && item.visual.image || ''),
        displayPrice: String(item.visual && item.visual.displayPrice || ''),
        currency: String(item.visual && item.visual.currency || 'MXN'),
        type: String(item.visual && item.visual.type || 'PRODUCT')
      }
    };
  }

  function read() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.map(sanitizeEntry).filter(Boolean).slice(0, 40) : [];
    } catch (_) {
      return [];
    }
  }

  function write(items, options) {
    var safeItems = items.map(sanitizeEntry).filter(Boolean).slice(0, 40);
    var serialized = JSON.stringify(safeItems);
    var changed = localStorage.getItem(STORAGE_KEY) !== serialized;
    localStorage.setItem(STORAGE_KEY, serialized);
    if (changed && (!options || options.notify !== false)) {
      document.dispatchEvent(new CustomEvent('pixon:cart-change', { detail: { items: safeItems } }));
    }
    renderDrawer();
    renderLauncher();
  }

  function isEn() {
    return (document.documentElement.lang && document.documentElement.lang.startsWith('en'));
  }

  function money(value, currency) {
    return new Intl.NumberFormat(isEn() ? 'en-US' : 'es-MX', { style: 'currency', currency: currency || 'MXN' }).format(Number(value || 0));
  }

  function typeLabel(type) {
    if (isEn()) {
      return ({ SERVICE: 'Service', EQUIPMENT: 'Equipment', HARDWARE: 'Hardware', BUNDLE: 'Bundle' })[type] || 'Product';
    }
    return ({ SERVICE: 'Servicio', EQUIPMENT: 'Equipo', HARDWARE: 'Hardware', BUNDLE: 'Paquete' })[type] || 'Producto';
  }

  function add(item, quantity) {
    var items = read();
    var existing = items.find(function (entry) { return String(entry.id) === String(item.id); });
    var requested = Math.max(1, Math.min(DEFAULT_MAX, positiveInteger(quantity, 1)));
    var itemMax = Math.max(1, Math.min(DEFAULT_MAX, positiveInteger(item.maxQuantity, DEFAULT_MAX)));

    if (existing) {
      existing.maxQuantity = Math.min(maxFor(existing), itemMax);
      var nextQuantity = Number(existing.quantity) + requested;
      if (nextQuantity > existing.maxQuantity) {
        existing.quantity = existing.maxQuantity;
        write(items);
        var limitMsg = isEn()
          ? (existing.maxQuantity === 1 ? 'Only 1 unit available.' : 'Maximum stock available: ' + existing.maxQuantity + '.')
          : (existing.maxQuantity === 1 ? 'Solo hay una unidad disponible.' : 'Stock máximo disponible: ' + existing.maxQuantity + '.');
        toast(limitMsg, 'warning');
        pulseLauncher();
        return false;
      }
      existing.quantity = nextQuantity;
    } else {
      items.push({
        id: Number(item.id),
        slug: String(item.slug),
        quantity: Math.min(requested, itemMax),
        maxQuantity: itemMax,
        visual: {
          name: String(item.name || (isEn() ? 'Item' : 'Artículo')),
          image: String(item.image || ''),
          displayPrice: String(item.displayPrice || ''),
          currency: String(item.currency || 'MXN'),
          type: String(item.type || 'PRODUCT')
        }
      });
    }

    write(items);
    toast(typeLabel(item.type) + (isEn() ? ' added to cart.' : ' agregado al carrito.'), 'success');
    pulseLauncher();
    return true;
  }

  function update(id, quantity) {
    var items = read();
    var found = items.find(function (item) { return String(item.id) === String(id); });
    if (!found) return;
    var requested = positiveInteger(quantity, 1);
    found.quantity = Math.max(1, Math.min(maxFor(found), requested));
    if (requested > found.maxQuantity) {
      var limitMsg = isEn()
        ? (found.maxQuantity === 1 ? 'Only 1 unit available.' : 'Maximum stock available: ' + found.maxQuantity + '.')
        : (found.maxQuantity === 1 ? 'Solo hay una unidad disponible.' : 'Stock máximo disponible: ' + found.maxQuantity + '.');
      toast(limitMsg, 'warning');
    }
    write(items);
  }

  function remove(id) {
    write(read().filter(function (item) { return String(item.id) !== String(id); }));
    toast(isEn() ? 'Item removed from cart.' : 'Artículo eliminado del carrito.', 'info');
  }

  function clear() {
    write([]);
  }

  function toast(message, type) {
    if (!toastRegion) return;
    var item = document.createElement('div');
    item.className = 'store-toast is-' + (type || 'info');
    item.textContent = message;
    toastRegion.appendChild(item);
    window.setTimeout(function () { item.remove(); }, 3200);
  }

  function pulseLauncher() {
    if (!launcher) return;
    launcher.classList.remove('is-pulsing');
    void launcher.offsetWidth;
    launcher.classList.add('is-pulsing');
    window.setTimeout(function () { launcher.classList.remove('is-pulsing'); }, 520);
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('store-cart-open');
    drawerTrigger && drawerTrigger.focus && drawerTrigger.focus();
  }

  function openDrawer() {
    if (!drawer) return;
    drawerTrigger = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('store-cart-open');
    var close = drawer.querySelector('.store-cart-panel button');
    if (close) close.focus();
  }

  function renderLauncher() {
    if (!launcher || !launcherCount) return;
    var items = read();
    var count = items.reduce(function (sum, item) { return sum + Number(item.quantity); }, 0);
    launcherCount.textContent = String(count);
    launcher.classList.toggle('has-items', count > 0);
    launcher.setAttribute('aria-label', isEn() ? ('Open cart, ' + count + (count === 1 ? ' item' : ' items')) : ('Abrir carrito, ' + count + (count === 1 ? ' artículo' : ' artículos')));
    var launcherCopy = launcher.querySelector('.store-cart-launcher-copy');
    if (launcherCopy) {
      launcherCopy.innerHTML = isEn()
        ? '<small>Your selection</small><strong>View cart</strong>'
        : '<small>Tu selección</small><strong>Ver carrito</strong>';
    }
  }

  function renderDrawer() {
    if (!drawerItems || !drawerTotal) return;
    var items = read();
    drawerItems.replaceChildren();
    var total = 0;
    var en = isEn();

    if (drawer) {
      var headerP = drawer.querySelector('header div p');
      if (headerP) headerP.textContent = en ? 'Shop at Pixon PC' : 'Compra en Pixon PC';
      var headerH2 = drawer.querySelector('#store-cart-title');
      if (headerH2) headerH2.textContent = en ? 'Your cart' : 'Tu carrito';
      var footerSubtotal = drawer.querySelector('footer p span');
      if (footerSubtotal) footerSubtotal.textContent = en ? 'Estimated subtotal' : 'Subtotal estimado';
      var footerPrimary = drawer.querySelector('footer .store-action-primary');
      if (footerPrimary) footerPrimary.textContent = en ? 'Review cart' : 'Revisar carrito';
      var footerSecondary = drawer.querySelector('footer .store-action-secondary');
      if (footerSecondary) footerSecondary.textContent = en ? 'Continue shopping' : 'Continuar comprando';
    }

    items.forEach(function (item) {
      var row = document.createElement('article');
      row.className = 'store-cart-drawer-item';

      if (item.visual.image) {
        var image = document.createElement('img');
        image.src = item.visual.image;
        image.alt = '';
        image.width = 72;
        image.height = 58;
        row.appendChild(image);
      }

      var copy = document.createElement('div');
      var title = document.createElement('a');
      title.href = '/tienda/' + encodeURIComponent(item.slug);
      title.textContent = item.visual.name;
      var meta = document.createElement('span');
      meta.textContent = typeLabel(item.visual.type) + ' · ' + (en ? 'Qty ' : 'Cantidad ') + item.quantity + (item.maxQuantity < DEFAULT_MAX ? (en ? ' of ' : ' de ') + item.maxQuantity : '');
      var price = Number(item.visual.displayPrice || 0);
      total += price * item.quantity;
      var amount = document.createElement('strong');
      amount.textContent = price ? money(price * item.quantity, item.visual.currency) : (en ? 'Validated upon confirmation' : 'Se validará al confirmar');
      copy.append(title, meta, amount);

      var removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.dataset.cartRemove = String(item.id);
      removeButton.setAttribute('aria-label', (en ? 'Remove ' : 'Eliminar ') + item.visual.name);
      removeButton.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
      row.append(copy, removeButton);
      drawerItems.appendChild(row);
    });

    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'store-cart-drawer-empty';
      empty.innerHTML = en
        ? '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i><strong>Your cart is empty</strong><span>Add equipment, product or service to see it here.</span>'
        : '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i><strong>Tu carrito está vacío</strong><span>Agrega un equipo, producto o servicio para verlo aquí.</span>';
      drawerItems.appendChild(empty);
    }
    drawerTotal.textContent = money(total, items[0] && items[0].visual.currency || 'MXN');
  }

  function normalizeCatalog(payload) {
    var item = payload && payload.data && (payload.data.item || payload.data);
    if (!item) return null;
    return {
      id: Number(item.id),
      slug: item.slug,
      name: item.name,
      type: item.item_type || 'PRODUCT',
      status: item.status,
      allowPurchase: Boolean(item.allow_purchase),
      shortDescription: item.short_description,
      image: item.media && item.media[0] && item.media[0].url,
      currency: item.pricing && item.pricing.currency || 'MXN',
      basePrice: Number(item.pricing && item.pricing.base_price || 0),
      price: Number(item.pricing && item.pricing.effective_price || 0),
      tracked: Boolean(item.inventory && item.inventory.tracked),
      available: Number(item.inventory && item.inventory.available_quantity || 0)
    };
  }

  async function revalidate() {
    var items = read();
    var results = await Promise.all(items.map(async function (entry) {
      try {
        var response = await fetch('/api/commerce/catalog/' + encodeURIComponent(entry.slug), { credentials: 'include', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('unavailable');
        var catalog = normalizeCatalog(await response.json());
        var maxQuantity = catalog && catalog.tracked ? Math.max(0, catalog.available) : DEFAULT_MAX;
        var safeQuantity = maxQuantity > 0 ? Math.min(entry.quantity, maxQuantity) : entry.quantity;
        var safeEntry = {
          id: entry.id,
          slug: entry.slug,
          quantity: safeQuantity,
          maxQuantity: maxQuantity > 0 ? maxQuantity : entry.maxQuantity,
          visual: {
            name: catalog ? catalog.name : entry.visual.name,
            image: catalog && catalog.image || entry.visual.image || '',
            displayPrice: String(catalog ? catalog.price : entry.visual.displayPrice),
            currency: catalog ? catalog.currency : entry.visual.currency,
            type: catalog ? catalog.type : entry.visual.type
          }
        };
        return {
          entry: safeEntry,
          catalog: catalog,
          available: Boolean(catalog && catalog.status === 'ACTIVE' && catalog.allowPurchase && (!catalog.tracked || catalog.available >= safeEntry.quantity))
        };
      } catch (_) {
        return { entry: entry, catalog: null, available: false };
      }
    }));
    if (results.length) write(results.map(function (result) { return result.entry; }), { notify: false });
    return results;
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-add-to-cart]');
    if (trigger && !trigger.disabled) {
      add({
        id: trigger.dataset.itemId,
        slug: trigger.dataset.itemSlug,
        name: trigger.dataset.itemName,
        image: trigger.dataset.itemImage,
        displayPrice: trigger.dataset.itemPrice,
        currency: trigger.dataset.itemCurrency,
        type: trigger.dataset.itemType,
        maxQuantity: trigger.dataset.itemMax
      }, 1);
      window.pixonTrackEvent?.('add_to_cart');
      openDrawer(trigger);
    }
    if (event.target.closest('[data-cart-open]')) openDrawer();
    if (event.target.closest('[data-cart-close]')) closeDrawer();
    var removeTrigger = event.target.closest('[data-cart-remove]');
    if (removeTrigger) remove(removeTrigger.dataset.cartRemove);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && drawer && drawer.classList.contains('is-open')) closeDrawer();
    if (event.key !== 'Tab' || !drawer || !drawer.classList.contains('is-open')) return;
    var focusable = Array.from(drawer.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])')).filter(function (entry) { return entry.getClientRects().length; });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  renderDrawer();
  renderLauncher();
  window.PixonCart = {
    read: read,
    add: add,
    update: update,
    remove: remove,
    clear: clear,
    revalidate: revalidate,
    open: openDrawer,
    close: closeDrawer,
    toast: toast,
    money: money
  };
})();
