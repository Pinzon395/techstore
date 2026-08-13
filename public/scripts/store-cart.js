(function () {
  'use strict';
  var STORAGE_KEY = 'pixon.cart.v1';
  var drawer = document.getElementById('store-cart-drawer');
  var drawerItems = document.getElementById('store-cart-drawer-items');
  var drawerTotal = document.getElementById('store-cart-drawer-total');
  var toastRegion = document.getElementById('store-toast-region');
  var drawerTrigger = null;

  function read() {
    try {
      var value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.filter(function (item) { return item && item.id && item.slug && Number(item.quantity) > 0; }).slice(0, 40) : [];
    } catch (_) { return []; }
  }
  function write(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('pixon:cart-change', { detail: { items: items } }));
    renderDrawer();
  }
  function money(value, currency) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(Number(value || 0));
  }
  function add(item, quantity) {
    var items = read();
    var existing = items.find(function (entry) { return String(entry.id) === String(item.id); });
    var amount = Math.max(1, Math.min(100, Number(quantity || 1)));
    if (existing) existing.quantity = Math.min(100, Number(existing.quantity) + amount);
    else items.push({
      id: Number(item.id), slug: String(item.slug), quantity: amount,
      visual: { name: String(item.name || 'Artículo'), image: String(item.image || ''), displayPrice: String(item.displayPrice || ''), currency: String(item.currency || 'MXN') }
    });
    write(items);
    openDrawer();
    toast('Producto agregado al carrito', 'success');
  }
  function update(id, quantity) {
    var items = read();
    var found = items.find(function (item) { return String(item.id) === String(id); });
    if (!found) return;
    found.quantity = Math.max(1, Math.min(100, Number(quantity || 1)));
    write(items);
  }
  function remove(id) { write(read().filter(function (item) { return String(item.id) !== String(id); })); }
  function clear() { write([]); }
  function toast(message, type) {
    if (!toastRegion) return;
    var item = document.createElement('div');
    item.className = 'store-toast is-' + (type || 'info');
    item.textContent = message;
    toastRegion.appendChild(item);
    window.setTimeout(function () { item.remove(); }, 3200);
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('store-cart-open');
    drawerTrigger?.focus?.();
  }
  function openDrawer() {
    if (!drawer) return;
    drawerTrigger = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('store-cart-open');
    drawer.querySelector('.store-cart-panel button')?.focus();
  }
  function renderDrawer() {
    if (!drawerItems) return;
    var items = read();
    drawerItems.replaceChildren();
    var total = 0;
    items.forEach(function (item) {
      var row = document.createElement('article');
      var title = document.createElement('strong'); title.textContent = item.visual.name;
      var meta = document.createElement('span'); meta.textContent = 'Cantidad: ' + item.quantity;
      var price = Number(item.visual.displayPrice || 0); total += price * item.quantity;
      var amount = document.createElement('span'); amount.textContent = price ? money(price * item.quantity, item.visual.currency) : 'Se validará en checkout';
      row.append(title, meta, amount); drawerItems.appendChild(row);
    });
    if (!items.length) drawerItems.textContent = 'Tu carrito está vacío.';
    drawerTotal.textContent = money(total, items[0]?.visual?.currency || 'MXN');
  }
  function normalizeCatalog(payload) {
    var item = payload && payload.data && (payload.data.item || payload.data);
    if (!item) return null;
    return {
      id: Number(item.id), slug: item.slug, name: item.name, status: item.status,
      allowPurchase: Boolean(item.allow_purchase), shortDescription: item.short_description,
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
        return { entry: entry, catalog: catalog, available: Boolean(catalog && catalog.status === 'ACTIVE' && catalog.allowPurchase && (!catalog.tracked || catalog.available >= entry.quantity)) };
      } catch (_) { return { entry: entry, catalog: null, available: false }; }
    }));
    var refreshed = results.filter(function (result) { return result.catalog; }).map(function (result) {
      return { id: result.entry.id, slug: result.entry.slug, quantity: result.entry.quantity, visual: { name: result.catalog.name, image: result.catalog.image || '', displayPrice: String(result.catalog.price), currency: result.catalog.currency } };
    });
    if (refreshed.length) write(refreshed.concat(items.filter(function (entry) { return !refreshed.some(function (next) { return String(next.id) === String(entry.id); }); })));
    return results;
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-add-to-cart]');
    if (trigger && !trigger.disabled) {
      add({ id: trigger.dataset.itemId, slug: trigger.dataset.itemSlug, name: trigger.dataset.itemName, image: trigger.dataset.itemImage, displayPrice: trigger.dataset.itemPrice, currency: trigger.dataset.itemCurrency }, 1);
    }
    if (event.target.closest('[data-cart-close]')) closeDrawer();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && drawer?.classList.contains('is-open')) closeDrawer();
    if (event.key !== 'Tab' || !drawer?.classList.contains('is-open')) return;
    var focusable = Array.from(drawer.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])')).filter(function (entry) { return entry.getClientRects().length; });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  renderDrawer();
  window.PixonCart = { read: read, add: add, update: update, remove: remove, clear: clear, revalidate: revalidate, open: openDrawer, close: closeDrawer, toast: toast, money: money };
})();
