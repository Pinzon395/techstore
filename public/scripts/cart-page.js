(function () {
  'use strict';
  var api = window.PixonCart;
  if (!api) return;
  var list = document.getElementById('cart-items');
  var empty = document.getElementById('cart-empty');
  var checkout = document.getElementById('cart-checkout');
  var subtotal = document.getElementById('cart-subtotal');
  var discount = document.getElementById('cart-discount');
  var total = document.getElementById('cart-total');
  var note = document.getElementById('cart-validation-note');

  function isEn() {
    return (document.documentElement.lang && document.documentElement.lang.startsWith('en'));
  }

  function applyLocale() {
    if (!isEn()) return;
    document.title = 'Cart | Pixon PC';
    var cartTitle = document.getElementById('cart-title');
    if (cartTitle) cartTitle.textContent = 'Your cart';
    var secureLabel = document.querySelector('.cart-page .store-section-label');
    if (secureLabel) secureLabel.textContent = 'Secure purchase';
    var lead = document.querySelector('.cart-page header p:last-child');
    if (lead) lead.textContent = 'We revalidate price, promotions and availability with the server before proceeding.';
    var summaryHeading = document.querySelector('.cart-summary h2');
    if (summaryHeading) summaryHeading.textContent = 'Summary';
    var dts = document.querySelectorAll('.cart-summary dt');
    if (dts[0]) dts[0].textContent = 'Subtotal';
    if (dts[1]) dts[1].textContent = 'Estimated discounts';
    if (dts[2]) dts[2].textContent = 'Estimated total';
    var contBtn = document.querySelector('.store-action-secondary[href="/tienda"]');
    if (contBtn) contBtn.textContent = 'Continue shopping';
    var emptyH2 = document.querySelector('#cart-empty h2');
    if (emptyH2) emptyH2.textContent = 'Your cart is empty';
    var emptyP = document.querySelector('#cart-empty p');
    if (emptyP) emptyP.textContent = 'Explore available equipment, hardware, services and packages.';
    var emptyA = document.querySelector('#cart-empty a');
    if (emptyA) emptyA.textContent = 'Browse the store';
  }

  function renderRow(result) {
    var en = isEn();
    var item = result.entry;
    var catalog = result.catalog;
    var row = document.createElement('article'); row.className = 'cart-item' + (result.available ? '' : ' is-unavailable');
    if (catalog?.image) { var image = document.createElement('img'); image.src = catalog.image; image.alt = catalog.name; image.width = 112; image.height = 84; row.appendChild(image); }
    var body = document.createElement('div');
    var title = document.createElement('h2'); title.textContent = catalog?.name || item.visual.name; body.appendChild(title);
    var state = document.createElement('p');
    state.textContent = result.available
      ? (en ? 'Price and availability verified' : 'Precio y disponibilidad validados')
      : (en ? 'Item no longer available' : 'Producto ya no disponible');
    body.appendChild(state);
    var controls = document.createElement('div'); controls.className = 'cart-item-controls';
    var label = document.createElement('label'); label.textContent = en ? 'Quantity ' : 'Cantidad ';
    var input = document.createElement('input'); input.type = 'number'; input.min = '1'; input.max = String(catalog?.tracked ? Math.max(1, catalog.available) : 100); input.value = item.quantity; input.disabled = !result.available;
    input.addEventListener('change', function () { api.update(item.id, input.value); load(); }); label.appendChild(input);
    var remove = document.createElement('button'); remove.type = 'button'; remove.textContent = en ? 'Remove' : 'Eliminar'; remove.addEventListener('click', function () { api.remove(item.id); load(); });
    controls.append(label, remove); body.appendChild(controls); row.appendChild(body);
    var amount = document.createElement('strong'); amount.textContent = catalog ? api.money(catalog.price * item.quantity, catalog.currency) : (en ? 'Unavailable' : 'No disponible'); row.appendChild(amount);
    return row;
  }
  async function load() {
    applyLocale();
    var en = isEn();
    var stored = api.read();
    if (!stored.length) {
      list.replaceChildren(empty); empty.hidden = false; checkout.setAttribute('aria-disabled', 'true'); checkout.removeAttribute('href');
      checkout.textContent = en ? 'Proceed to checkout' : 'Continuar al checkout';
      note.textContent = en ? 'Add items to continue.' : 'Agrega artículos para continuar.';
      return;
    }
    empty.hidden = true; list.replaceChildren(); list.insertAdjacentHTML('beforeend', '<div class="cart-skeleton"></div><div class="cart-skeleton"></div>');
    var results = await api.revalidate();
    list.replaceChildren.apply(list, results.map(renderRow));
    var currency = results.find(function (result) { return result.catalog; })?.catalog?.currency || 'MXN';
    var base = results.reduce(function (sum, result) { return sum + (result.catalog ? result.catalog.basePrice * result.entry.quantity : 0); }, 0);
    var current = results.reduce(function (sum, result) { return sum + (result.catalog ? result.catalog.price * result.entry.quantity : 0); }, 0);
    subtotal.textContent = api.money(base, currency); discount.textContent = '-' + api.money(base - current, currency); total.textContent = api.money(current, currency);
    var valid = results.length > 0 && results.every(function (result) { return result.available; });
    checkout.textContent = en ? 'Proceed to checkout' : 'Continuar al checkout';
    if (valid) {
      checkout.href = '/checkout'; checkout.setAttribute('aria-disabled', 'false');
      note.textContent = en ? 'Everything is available to proceed.' : 'Todo está disponible para continuar.';
    } else {
      checkout.removeAttribute('href'); checkout.setAttribute('aria-disabled', 'true');
      note.textContent = en ? 'Remove or adjust unavailable items to proceed.' : 'Elimina o ajusta los artículos no disponibles.';
    }
  }
  document.addEventListener('pixon:cart-change', function () { if (!document.hidden) load(); });
  checkout.addEventListener('click', function () {
    if (checkout.getAttribute('aria-disabled') !== 'true') window.pixonTrackEvent?.('checkout_start');
  });
  applyLocale();
  load().catch(function () {
    var en = isEn();
    note.textContent = en ? 'Could not validate cart. Please try again.' : 'No pudimos validar el carrito. Intenta de nuevo.';
  });
})();
