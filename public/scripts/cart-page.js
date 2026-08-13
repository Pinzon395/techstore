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

  function renderRow(result) {
    var item = result.entry;
    var catalog = result.catalog;
    var row = document.createElement('article'); row.className = 'cart-item' + (result.available ? '' : ' is-unavailable');
    if (catalog?.image) { var image = document.createElement('img'); image.src = catalog.image; image.alt = catalog.name; image.width = 112; image.height = 84; row.appendChild(image); }
    var body = document.createElement('div');
    var title = document.createElement('h2'); title.textContent = catalog?.name || item.visual.name; body.appendChild(title);
    var state = document.createElement('p'); state.textContent = result.available ? 'Precio y disponibilidad validados' : 'Producto ya no disponible'; body.appendChild(state);
    var controls = document.createElement('div'); controls.className = 'cart-item-controls';
    var label = document.createElement('label'); label.textContent = 'Cantidad ';
    var input = document.createElement('input'); input.type = 'number'; input.min = '1'; input.max = String(catalog?.tracked ? Math.max(1, catalog.available) : 100); input.value = item.quantity; input.disabled = !result.available;
    input.addEventListener('change', function () { api.update(item.id, input.value); load(); }); label.appendChild(input);
    var remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Eliminar'; remove.addEventListener('click', function () { api.remove(item.id); load(); });
    controls.append(label, remove); body.appendChild(controls); row.appendChild(body);
    var amount = document.createElement('strong'); amount.textContent = catalog ? api.money(catalog.price * item.quantity, catalog.currency) : 'No disponible'; row.appendChild(amount);
    return row;
  }
  async function load() {
    var stored = api.read();
    if (!stored.length) {
      list.replaceChildren(); empty.hidden = false; checkout.setAttribute('aria-disabled', 'true'); checkout.removeAttribute('href'); note.textContent = 'Agrega artículos para continuar.'; return;
    }
    empty.hidden = true; list.innerHTML = '<div class="cart-skeleton"></div><div class="cart-skeleton"></div>';
    var results = await api.revalidate();
    list.replaceChildren.apply(list, results.map(renderRow));
    var currency = results.find(function (result) { return result.catalog; })?.catalog?.currency || 'MXN';
    var base = results.reduce(function (sum, result) { return sum + (result.catalog ? result.catalog.basePrice * result.entry.quantity : 0); }, 0);
    var current = results.reduce(function (sum, result) { return sum + (result.catalog ? result.catalog.price * result.entry.quantity : 0); }, 0);
    subtotal.textContent = api.money(base, currency); discount.textContent = '-' + api.money(base - current, currency); total.textContent = api.money(current, currency);
    var valid = results.length > 0 && results.every(function (result) { return result.available; });
    if (valid) { checkout.href = '/checkout'; checkout.setAttribute('aria-disabled', 'false'); note.textContent = 'Todo está disponible para continuar.'; }
    else { checkout.removeAttribute('href'); checkout.setAttribute('aria-disabled', 'true'); note.textContent = 'Elimina o ajusta los artículos no disponibles.'; }
  }
  document.addEventListener('pixon:cart-change', function () { if (!document.hidden) load(); });
  load().catch(function () { note.textContent = 'No pudimos validar el carrito. Intenta de nuevo.'; });
})();

