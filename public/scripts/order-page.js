(function () {
  'use strict';
  var folio = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '').toUpperCase();
  var form = document.getElementById('order-access-form');
  var emailInput = document.getElementById('order-email');
  var content = document.getElementById('order-content');
  var loading = document.getElementById('order-loading');
  var error = document.getElementById('order-error');
  var currentOrder = null;
  var currentEmail = localStorage.getItem('pixon.order.access.' + folio) || '';
  var selectedFile = null;
  var dropzone = document.getElementById('proof-dropzone');
  var fileInput = document.getElementById('proof-file');
  var labels = { PENDING_PAYMENT: 'Pendiente de pago', PAYMENT_REVIEW: 'Pago en revisión', PAID: 'Pago confirmado', PREPARING: 'Preparando', READY: 'Listo', COMPLETED: 'Completado', CANCELLED: 'Cancelado' };
  var methodLabels = { BANK_TRANSFER: 'Transferencia bancaria', CASH: 'Efectivo', TERMINAL: 'Terminal bancaria' };
  function money(value, currency) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(Number(value || 0)); }
  function showError(text) { error.textContent = text; error.hidden = false; loading.hidden = true; }
  function element(tag, text) { var node = document.createElement(tag); if (text != null) node.textContent = text; return node; }
  function render(order) {
    currentOrder = order; error.hidden = true; loading.hidden = true; content.hidden = false; form.hidden = true;
    document.getElementById('order-folio').textContent = order.folio;
    document.getElementById('order-status').textContent = labels[order.status] || order.status;
    document.getElementById('order-total').textContent = money(order.pricing.total, order.pricing.currency);
    document.getElementById('order-method').textContent = methodLabels[order.payment.method] || order.payment.method;
    var items = document.getElementById('order-items'); items.replaceChildren();
    order.items.forEach(function (item) { var row = element('p'); row.className = 'order-item-row'; row.append(element('span', item.title + ' × ' + item.quantity), element('strong', money(item.line_total, order.pricing.currency))); items.appendChild(row); });
    var timeline = document.getElementById('order-timeline'); timeline.replaceChildren();
    order.timeline.forEach(function (entry) { var item = element('li'); item.append(element('strong', labels[entry.to_status] || entry.to_status), element('span', new Date(entry.created_at).toLocaleString('es-MX')), entry.note ? element('p', entry.note) : document.createTextNode('')); timeline.appendChild(item); });
    var transfer = document.getElementById('order-transfer');
    if (order.transfer) {
      transfer.hidden = false; var details = document.getElementById('order-transfer-details'); details.replaceChildren();
      [['Beneficiario', order.transfer.beneficiary], ['Banco', order.transfer.bank], ['CLABE', order.transfer.clabe], ['Cuenta', order.transfer.account], ['Referencia', order.transfer.reference], ['Monto exacto', money(order.transfer.amount, order.transfer.currency)]].filter(function (row) { return row[1]; }).forEach(function (row) { var wrap = element('div'); wrap.append(element('dt', row[0]), element('dd', row[1])); details.appendChild(wrap); });
      transfer.dataset.account = order.transfer.clabe || order.transfer.account || order.transfer.card || '';
      transfer.dataset.reference = order.transfer.reference;
    }
    var proof = document.getElementById('order-proof');
    proof.hidden = order.payment.method !== 'BANK_TRANSFER' || ['APPROVED'].includes(order.payment.status) || ['PAID','PREPARING','READY','COMPLETED','CANCELLED'].includes(order.status);
    document.getElementById('proof-status').textContent = order.payment.status === 'UNDER_REVIEW' ? 'Comprobante recibido. Pago en revisión.' : order.payment.status === 'REJECTED' ? 'Comprobante rechazado: ' + (order.payment.rejection_reason || 'sube otro archivo') : '';
  }
  async function load(email) {
    loading.hidden = false; content.hidden = true; error.hidden = true;
    var headers = { Accept: 'application/json' };
    if (email) headers['X-Customer-Email'] = email;
    var response = await fetch('/api/commerce/orders/' + encodeURIComponent(folio), { credentials: 'include', headers: headers });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || 'No encontramos un pedido con esos datos.');
    if (email) { currentEmail = email.toLowerCase(); localStorage.setItem('pixon.order.access.' + folio, currentEmail); }
    render(payload.data);
  }
  form.addEventListener('submit', function (event) { event.preventDefault(); if (!form.reportValidity()) return; load(emailInput.value.trim()).catch(function (cause) { showError(cause.message); }); });
  if (currentEmail) { emailInput.value = currentEmail; load(currentEmail).catch(function () { form.hidden = false; showError('Confirma el correo usado al crear el pedido.'); }); }
  function selectProof(file) {
    selectedFile = file || null;
    document.getElementById('proof-file-label').textContent = selectedFile ? selectedFile.name : 'Ningún archivo seleccionado';
    document.getElementById('proof-upload').disabled = !selectedFile;
    dropzone.classList.toggle('has-file', Boolean(selectedFile));
    var preview = document.getElementById('proof-preview');
    preview.replaceChildren();
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      var image = document.createElement('img');
      image.alt = 'Vista previa del comprobante seleccionado';
      image.src = URL.createObjectURL(selectedFile);
      image.addEventListener('load', function () { URL.revokeObjectURL(image.src); }, { once: true });
      preview.appendChild(image);
    } else if (selectedFile) {
      preview.appendChild(element('span', 'PDF listo para subir'));
    }
  }
  fileInput.addEventListener('change', function (event) { selectProof(event.target.files[0]); });
  ['dragenter', 'dragover'].forEach(function (name) { dropzone.addEventListener(name, function (event) { event.preventDefault(); dropzone.classList.add('is-dragging'); }); });
  ['dragleave', 'drop'].forEach(function (name) { dropzone.addEventListener(name, function (event) { event.preventDefault(); dropzone.classList.remove('is-dragging'); }); });
  dropzone.addEventListener('drop', function (event) { selectProof(event.dataTransfer?.files?.[0]); });
  document.getElementById('proof-upload').addEventListener('click', async function () {
    if (!selectedFile || !currentOrder) return;
    var button = this; button.disabled = true; button.textContent = 'Subiendo…'; document.getElementById('proof-status').textContent = 'Subiendo comprobante…';
    try {
      var headers = { 'Content-Type': selectedFile.type || 'application/octet-stream', 'X-File-Name': selectedFile.name, 'X-Requested-With': 'fetch' };
      if (currentEmail) headers['X-Customer-Email'] = currentEmail;
      var response = await fetch('/api/commerce/orders/' + encodeURIComponent(folio) + '/payment-proof', { method: 'POST', credentials: 'include', headers: headers, body: selectedFile });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || 'No se pudo subir el comprobante');
      render(payload.data); document.getElementById('proof-status').textContent = 'Comprobante recibido. Pago en revisión.';
    } catch (cause) { document.getElementById('proof-status').textContent = cause.message || 'Error al subir'; button.disabled = false; }
    finally { button.textContent = 'Subir comprobante'; }
  });
  document.querySelector('.order-copy-actions')?.addEventListener('click', function (event) { var button = event.target.closest('[data-copy-field]'); if (!button) return; var value = document.getElementById('order-transfer').dataset[button.dataset.copyField]; navigator.clipboard.writeText(value || '').then(function () { button.textContent = 'Copiado'; setTimeout(function () { button.textContent = button.dataset.copyField === 'account' ? 'Copiar cuenta' : 'Copiar referencia'; }, 1600); }); });
})();
