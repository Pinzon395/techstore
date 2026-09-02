(function () {
  'use strict';
  var cart = window.PixonCart;
  var form = document.getElementById('checkout-form');
  if (!cart || !form) return;
  var itemsNode = document.getElementById('checkout-items');
  var methodsNode = document.getElementById('checkout-payment-methods');
  var message = document.getElementById('checkout-message');
  var submit = document.getElementById('checkout-submit');
  var validated = [];
  var submitting = false;
  var methodLabels = { BANK_TRANSFER: 'Transferencia bancaria', CASH: 'Efectivo', TERMINAL: 'Terminal bancaria', STRIPE: 'Tarjeta en línea', MERCADO_PAGO: 'Mercado Pago', PAYPAL: 'PayPal' };

  function showMessage(text) { message.textContent = text; message.hidden = false; }
  function row(result) {
    var p = document.createElement('p'); p.className = 'checkout-item-row';
    var name = document.createElement('span'); name.textContent = result.catalog.name + ' × ' + result.entry.quantity;
    var amount = document.createElement('strong'); amount.textContent = cart.money(result.catalog.price * result.entry.quantity, result.catalog.currency);
    p.append(name, amount); return p;
  }
  function renderMethods(methods) {
    methodsNode.replaceChildren();
    Object.entries(methods).forEach(function (entry, index) {
      var key = entry[0], config = entry[1];
      var label = document.createElement('label');
      var input = document.createElement('input'); input.type = 'radio'; input.name = 'payment_method'; input.value = key; input.required = true; if (index === 0) input.checked = true;
      var text = document.createElement('span'); var strong = document.createElement('strong'); strong.textContent = methodLabels[key] || key;
      var small = document.createElement('small'); small.textContent = config.instructions || 'Consulta instrucciones al crear el pedido.';
      text.append(strong, small); label.append(input, text); methodsNode.appendChild(label);
    });
    if (!Object.keys(methods).length) showMessage('No hay métodos de pago disponibles. Contacta a Pixon PC.');
  }
  async function init() {
    var results = await cart.revalidate();
    validated = results;
    if (!results.length || !results.every(function (result) { return result.available; })) {
      showMessage('El carrito contiene artículos no disponibles. Vuelve al carrito para corregirlo.'); submit.disabled = true; return;
    }
    itemsNode.replaceChildren.apply(itemsNode, results.map(row));
    var currency = results[0].catalog.currency;
    var base = results.reduce(function (sum, result) { return sum + result.catalog.basePrice * result.entry.quantity; }, 0);
    var current = results.reduce(function (sum, result) { return sum + result.catalog.price * result.entry.quantity; }, 0);
    document.getElementById('checkout-subtotal').textContent = cart.money(base, currency);
    document.getElementById('checkout-discount').textContent = '-' + cart.money(base - current, currency);
    document.getElementById('checkout-total').textContent = cart.money(current, currency);
    var response = await fetch('/api/commerce/settings/payment-methods', { credentials: 'include', headers: { Accept: 'application/json' } });
    var payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || 'No se pudieron cargar los métodos de pago');
    renderMethods(payload.data || {});
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (submitting) return;
    message.hidden = true;
    if (!form.reportValidity()) return;
    if (!validated.length || !validated.every(function (result) { return result.available; })) { showMessage('Revalida tu carrito antes de continuar.'); return; }
    submitting = true; submit.disabled = true; submit.textContent = 'Reservando y creando pedido…';
    var data = new FormData(form);
    var pendingKey = 'pixon.checkout.pending';
    var idempotencyKey = sessionStorage.getItem(pendingKey) || crypto.randomUUID();
    sessionStorage.setItem(pendingKey, idempotencyKey);
    var body = {
      items: validated.map(function (result) { return { catalog_item_id: result.entry.id, quantity: result.entry.quantity }; }),
      customer: { name: data.get('name'), phone: data.get('phone'), email: data.get('email') },
      delivery_method: data.get('delivery_method'), delivery_note: data.get('delivery_note'), payment_method: data.get('payment_method'),
      coupon_codes: String(data.get('coupon_codes') || '').split(',').map(function (code) { return code.trim(); }).filter(Boolean)
    };
    try {
      var response = await fetch('/api/commerce/orders', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'fetch', 'X-Idempotency-Key': idempotencyKey },
        body: JSON.stringify(body)
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || 'No fue posible crear el pedido');
      var order = payload.data;
      localStorage.setItem('pixon.order.access.' + order.folio, String(data.get('email')).toLowerCase());
      sessionStorage.removeItem(pendingKey); cart.clear();
      window.location.assign('/pedido/' + encodeURIComponent(order.folio));
    } catch (error) {
      showMessage(error.message || 'Error al completar la operación');
      submitting = false; submit.disabled = false; submit.textContent = 'Crear pedido y recibir instrucciones';
    }
  });
  init().catch(function (error) { showMessage(error.message || 'No pudimos preparar el checkout.'); submit.disabled = true; });
})();
