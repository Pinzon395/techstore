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
  var methodLabelsEs = { BANK_TRANSFER: 'Transferencia bancaria', CASH: 'Efectivo', TERMINAL: 'Terminal bancaria', STRIPE: 'Tarjeta en línea', MERCADO_PAGO: 'Mercado Pago', PAYPAL: 'PayPal' };
  var methodLabelsEn = { BANK_TRANSFER: 'Bank transfer', CASH: 'Cash', TERMINAL: 'Card payment', STRIPE: 'Online card payment', MERCADO_PAGO: 'Mercado Pago', PAYPAL: 'PayPal' };

  function isEn() {
    return (document.documentElement.lang && document.documentElement.lang.startsWith('en'));
  }

  function applyLocale() {
    if (!isEn()) return;
    document.title = 'Checkout | Pixon PC';
    var sectionLabel = document.querySelector('.checkout-header .store-section-label');
    if (sectionLabel) sectionLabel.textContent = 'Pixon PC Order';
    var checkoutTitle = document.getElementById('checkout-title');
    if (checkoutTitle) checkoutTitle.textContent = 'Confirm your order';
    var steps = document.querySelectorAll('.checkout-stepper li');
    if (steps[0]) steps[0].textContent = 'Cart';
    if (steps[1]) steps[1].textContent = 'Details';
    if (steps[2]) steps[2].textContent = 'Payment';
    if (steps[3]) steps[3].textContent = 'Confirmation';

    var legends = document.querySelectorAll('.checkout-form-card legend');
    if (legends[0]) legends[0].textContent = 'Contact information';
    if (legends[1]) legends[1].textContent = 'Delivery';
    if (legends[2]) legends[2].textContent = 'Payment method';

    var labels = document.querySelectorAll('.checkout-fields label span');
    if (labels[0]) labels[0].textContent = 'Full name *';
    if (labels[1]) labels[1].textContent = 'Phone number *';
    if (labels[2]) labels[2].textContent = 'Email address *';

    var deliveryLabels = document.querySelectorAll('.checkout-options label');
    if (deliveryLabels[0]) {
      var s0 = deliveryLabels[0].querySelector('strong'); if (s0) s0.textContent = 'Pick up at Pixon PC';
    }
    if (deliveryLabels[1]) {
      var s1 = deliveryLabels[1].querySelector('strong'); if (s1) s1.textContent = 'Local delivery';
      var sm1 = deliveryLabels[1].querySelector('small'); if (sm1) sm1.textContent = 'We will coordinate coverage and delivery fee before preparing.';
    }
    if (deliveryLabels[2]) {
      var s2 = deliveryLabels[2].querySelector('strong'); if (s2) s2.textContent = 'On-site service';
      var sm2 = deliveryLabels[2].querySelector('small'); if (sm2) sm2.textContent = 'Available only for compatible services.';
    }

    var deliveryNoteSpan = document.querySelector('.checkout-note span');
    if (deliveryNoteSpan) deliveryNoteSpan.textContent = 'Delivery notes';

    var allNoteSpans = document.querySelectorAll('.checkout-note span');
    if (allNoteSpans[1]) allNoteSpans[1].textContent = 'Discount coupon';
    var couponInput = document.querySelector('input[name="coupon_codes"]');
    if (couponInput) couponInput.placeholder = 'e.g. PIXON10';
    var couponHelp = document.getElementById('checkout-coupon-help');
    if (couponHelp) couponHelp.textContent = 'If you have multiple, separate with a comma. The server validates validity, priority, and accumulation.';

    var summaryH2 = document.querySelector('.checkout-summary h2');
    if (summaryH2) summaryH2.textContent = 'Your order';
    var dts = document.querySelectorAll('.checkout-summary dt');
    if (dts[0]) dts[0].textContent = 'Subtotal';
    if (dts[1]) dts[1].textContent = 'Estimated discount';
    if (dts[2]) dts[2].textContent = 'Estimated total';

    var summaryNotice = document.querySelector('.checkout-summary p:not(.checkout-submit-note)');
    if (summaryNotice) summaryNotice.textContent = 'The server recalculates totals and reserves inventory upon confirmation.';
    var submitNote = document.querySelector('.checkout-submit-note');
    if (submitNote) submitNote.innerHTML = '<strong>This step does not charge your card yet.</strong> We will create the order as pending payment, send confirmation to your email, and Pixon PC will contact you with next steps.';
    if (submit) submit.textContent = 'Place order and receive instructions';
    var backBtn = document.querySelector('.checkout-summary .store-action-secondary');
    if (backBtn) backBtn.textContent = 'Back to cart';
  }

  function showMessage(text) { message.textContent = text; message.hidden = false; }
  function row(result) {
    var p = document.createElement('p'); p.className = 'checkout-item-row';
    var name = document.createElement('span'); name.textContent = result.catalog.name + ' × ' + result.entry.quantity;
    var amount = document.createElement('strong'); amount.textContent = cart.money(result.catalog.price * result.entry.quantity, result.catalog.currency);
    p.append(name, amount); return p;
  }
  function renderMethods(methods) {
    methodsNode.replaceChildren();
    var en = isEn();
    var labels = en ? methodLabelsEn : methodLabelsEs;
    Object.entries(methods).forEach(function (entry, index) {
      var key = entry[0], config = entry[1];
      var label = document.createElement('label');
      var input = document.createElement('input'); input.type = 'radio'; input.name = 'payment_method'; input.value = key; input.required = true; if (index === 0) input.checked = true;
      var text = document.createElement('span'); var strong = document.createElement('strong'); strong.textContent = labels[key] || key;
      var small = document.createElement('small'); small.textContent = config.instructions || (en ? 'Instructions provided upon placing order.' : 'Consulta instrucciones al crear el pedido.');
      text.append(strong, small); label.append(input, text); methodsNode.appendChild(label);
    });
    if (!Object.keys(methods).length) showMessage(en ? 'No payment methods available. Please contact Pixon PC.' : 'No hay métodos de pago disponibles. Contacta a Pixon PC.');
  }
  async function init() {
    applyLocale();
    var results = await cart.revalidate();
    validated = results;
    var en = isEn();
    if (!results.length || !results.every(function (result) { return result.available; })) {
      showMessage(en ? 'Your cart contains unavailable items. Return to cart to adjust.' : 'El carrito contiene artículos no disponibles. Vuelve al carrito para corregirlo.');
      submit.disabled = true; return;
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
    if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || (en ? 'Could not load payment methods' : 'No se pudieron cargar los métodos de pago'));
    renderMethods(payload.data || {});
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (submitting) return;
    message.hidden = true;
    var en = isEn();
    if (!form.reportValidity()) return;
    if (!validated.length || !validated.every(function (result) { return result.available; })) {
      showMessage(en ? 'Revalidate your cart before proceeding.' : 'Revalida tu carrito antes de continuar.'); return;
    }
    submitting = true; submit.disabled = true; submit.textContent = en ? 'Reserving and placing order…' : 'Reservando y creando pedido…';
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
      if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || (en ? 'Could not create order' : 'No fue posible crear el pedido'));
      var order = payload.data;
      window.pixonTrackEvent?.('order_created');
      localStorage.setItem('pixon.order.access.' + order.folio, String(data.get('email')).toLowerCase());
      sessionStorage.removeItem(pendingKey); cart.clear();
      window.location.assign(en
        ? '/en/order/seguimiento?folio=' + encodeURIComponent(order.folio)
        : '/pedido/' + encodeURIComponent(order.folio));
    } catch (error) {
      showMessage(error.message || (en ? 'Error completing operation' : 'Error al completar la operación'));
      submitting = false; submit.disabled = false; submit.textContent = en ? 'Place order and receive instructions' : 'Crear pedido y recibir instrucciones';
    }
  });
  applyLocale();
  init().catch(function (error) {
    var en = isEn();
    showMessage(error.message || (en ? 'Could not prepare checkout.' : 'No pudimos preparar el checkout.'));
    submit.disabled = true;
  });
})();
