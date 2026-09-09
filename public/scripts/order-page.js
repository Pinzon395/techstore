(function () {
  'use strict';
  var folio = (new URLSearchParams(location.search).get('folio') || decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '')).toUpperCase();
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
  var labelsEs = { PENDING_PAYMENT: 'Pendiente de pago', PAYMENT_REVIEW: 'Pago en revisión', PAID: 'Pago confirmado', PREPARING: 'Preparando', READY: 'Listo', COMPLETED: 'Completado', CANCELLED: 'Cancelado' };
  var labelsEn = { PENDING_PAYMENT: 'Pending payment', PAYMENT_REVIEW: 'Payment under review', PAID: 'Payment confirmed', PREPARING: 'Preparing', READY: 'Ready', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
  var methodLabelsEs = { BANK_TRANSFER: 'Transferencia bancaria', CASH: 'Efectivo', TERMINAL: 'Terminal bancaria' };
  var methodLabelsEn = { BANK_TRANSFER: 'Bank transfer', CASH: 'Cash', TERMINAL: 'Card payment' };

  function isEn() {
    return (document.documentElement.lang && document.documentElement.lang.startsWith('en'));
  }

  function applyLocale() {
    if (!isEn()) return;
    document.title = 'Order Tracking | Pixon PC';
    var sectionLabel = document.querySelector('.order-header .store-section-label');
    if (sectionLabel) sectionLabel.textContent = 'Secure tracking';
    var orderTitle = document.getElementById('order-title');
    if (orderTitle) orderTitle.textContent = 'Your Pixon PC order';
    var orderIntro = document.getElementById('order-intro');
    if (orderIntro) orderIntro.textContent = 'Look up using the email used during purchase. The order folio alone is not sufficient.';
    var emailSpan = document.querySelector('#order-access-form label span');
    if (emailSpan) emailSpan.textContent = 'Order email';
    var submitBtn = document.querySelector('#order-access-form button');
    if (submitBtn) submitBtn.textContent = 'Check order';

    var summaryCards = document.querySelectorAll('.order-summary-card div span');
    if (summaryCards[0]) summaryCards[0].textContent = 'Folio';
    if (summaryCards[1]) summaryCards[1].textContent = 'Status';
    if (summaryCards[2]) summaryCards[2].textContent = 'Total';
    if (summaryCards[3]) summaryCards[3].textContent = 'Method';

    var cardH2s = document.querySelectorAll('.order-card h2');
    if (cardH2s[0]) cardH2s[0].textContent = 'Summary';
    if (cardH2s[1]) cardH2s[1].textContent = 'Timeline';
    if (cardH2s[2]) cardH2s[2].textContent = 'Complete your transfer';
    if (cardH2s[3]) cardH2s[3].textContent = 'Payment receipt';
    if (cardH2s[4]) cardH2s[4].textContent = 'Need help?';

    var copyBtns = document.querySelectorAll('.order-copy-actions button');
    if (copyBtns[0]) copyBtns[0].textContent = 'Copy account';
    if (copyBtns[1]) copyBtns[1].textContent = 'Copy reference';

    var proofP = document.querySelector('#order-proof p');
    if (proofP) proofP.textContent = 'JPEG, PNG, WebP or PDF. Maximum 10 MB.';
    var dropzoneStrong = document.querySelector('#proof-dropzone strong');
    if (dropzoneStrong) dropzoneStrong.textContent = 'Drag your receipt or click to select';
    var proofBtn = document.getElementById('proof-upload');
    if (proofBtn) proofBtn.textContent = 'Upload receipt';
    var helpCard = document.querySelector('#order-proof + .order-card');
    if (helpCard) {
      var hp = helpCard.querySelector('p'); if (hp) hp.textContent = 'Use the ticket support system and mention your order folio.';
      var ha = helpCard.querySelector('a'); if (ha) ha.textContent = 'Create support ticket';
    }
  }

  function money(value, currency) { return new Intl.NumberFormat(isEn() ? 'en-US' : 'es-MX', { style: 'currency', currency: currency || 'MXN' }).format(Number(value || 0)); }
  function showError(text) { error.textContent = text; error.hidden = false; loading.hidden = true; }
  function element(tag, text) { var node = document.createElement(tag); if (text != null) node.textContent = text; return node; }
  function render(order) {
    applyLocale();
    var en = isEn();
    var labels = en ? labelsEn : labelsEs;
    var methodLabels = en ? methodLabelsEn : methodLabelsEs;

    currentOrder = order; error.hidden = true; loading.hidden = true; content.hidden = false; form.hidden = true;
    document.getElementById('order-folio').textContent = order.folio;
    document.getElementById('order-status').textContent = labels[order.status] || order.status;
    document.getElementById('order-total').textContent = money(order.pricing.total, order.pricing.currency);
    document.getElementById('order-method').textContent = methodLabels[order.payment.method] || order.payment.method;
    var items = document.getElementById('order-items'); items.replaceChildren();
    order.items.forEach(function (item) { var row = element('p'); row.className = 'order-item-row'; row.append(element('span', item.title + ' × ' + item.quantity), element('strong', money(item.line_total, order.pricing.currency))); items.appendChild(row); });
    var timeline = document.getElementById('order-timeline'); timeline.replaceChildren();
    order.timeline.forEach(function (entry) { var item = element('li'); item.append(element('strong', labels[entry.to_status] || entry.to_status), element('span', new Date(entry.created_at).toLocaleString(en ? 'en-US' : 'es-MX')), entry.note ? element('p', entry.note) : document.createTextNode('')); timeline.appendChild(item); });
    var transfer = document.getElementById('order-transfer');
    if (order.transfer) {
      transfer.hidden = false; var details = document.getElementById('order-transfer-details'); details.replaceChildren();
      [
        [en ? 'Beneficiary' : 'Beneficiario', order.transfer.beneficiary],
        [en ? 'Bank' : 'Banco', order.transfer.bank],
        ['CLABE', order.transfer.clabe],
        [en ? 'Account' : 'Cuenta', order.transfer.account],
        [en ? 'Reference' : 'Referencia', order.transfer.reference],
        [en ? 'Exact amount' : 'Monto exacto', money(order.transfer.amount, order.transfer.currency)]
      ].filter(function (row) { return row[1]; }).forEach(function (row) { var wrap = element('div'); wrap.append(element('dt', row[0]), element('dd', row[1])); details.appendChild(wrap); });
      transfer.dataset.account = order.transfer.clabe || order.transfer.account || order.transfer.card || '';
      transfer.dataset.reference = order.transfer.reference;
    }
    var proof = document.getElementById('order-proof');
    proof.hidden = order.payment.method !== 'BANK_TRANSFER' || ['APPROVED'].includes(order.payment.status) || ['PAID','PREPARING','READY','COMPLETED','CANCELLED'].includes(order.status);
    document.getElementById('proof-status').textContent = order.payment.status === 'UNDER_REVIEW'
      ? (en ? 'Receipt received. Payment under review.' : 'Comprobante recibido. Pago en revisión.')
      : order.payment.status === 'REJECTED'
      ? (en ? 'Receipt rejected: ' + (order.payment.rejection_reason || 'upload another file') : 'Comprobante rechazado: ' + (order.payment.rejection_reason || 'sube otro archivo'))
      : '';
  }
  async function load(email) {
    loading.hidden = false; content.hidden = true; error.hidden = true;
    var en = isEn();
    var headers = { Accept: 'application/json' };
    if (email) headers['X-Customer-Email'] = email;
    var response = await fetch('/api/commerce/orders/' + encodeURIComponent(folio), { credentials: 'include', headers: headers });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || (en ? 'Could not find an order with those details.' : 'No encontramos un pedido con esos datos.'));
    if (email) { currentEmail = email.toLowerCase(); localStorage.setItem('pixon.order.access.' + folio, currentEmail); }
    render(payload.data);
  }
  form.addEventListener('submit', function (event) { event.preventDefault(); if (!form.reportValidity()) return; load(emailInput.value.trim()).catch(function (cause) { showError(cause.message); }); });
  if (currentEmail) { emailInput.value = currentEmail; load(currentEmail).catch(function () { form.hidden = false; showError(isEn() ? 'Confirm the email used when creating the order.' : 'Confirma el correo usado al crear el pedido.'); }); }
  function selectProof(file) {
    selectedFile = file || null;
    var en = isEn();
    document.getElementById('proof-file-label').textContent = selectedFile ? selectedFile.name : (en ? 'No file selected' : 'Ningún archivo seleccionado');
    document.getElementById('proof-upload').disabled = !selectedFile;
    dropzone.classList.toggle('has-file', Boolean(selectedFile));
    var preview = document.getElementById('proof-preview');
    preview.replaceChildren();
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      var image = document.createElement('img');
      image.alt = en ? 'Receipt preview' : 'Vista previa del comprobante seleccionado';
      image.src = URL.createObjectURL(selectedFile);
      image.addEventListener('load', function () { URL.revokeObjectURL(image.src); }, { once: true });
      preview.appendChild(image);
    } else if (selectedFile) {
      preview.appendChild(element('span', en ? 'PDF ready to upload' : 'PDF listo para subir'));
    }
  }
  fileInput.addEventListener('change', function (event) { selectProof(event.target.files[0]); });
  ['dragenter', 'dragover'].forEach(function (name) { dropzone.addEventListener(name, function (event) { event.preventDefault(); dropzone.classList.add('is-dragging'); }); });
  ['dragleave', 'drop'].forEach(function (name) { dropzone.addEventListener(name, function (event) { event.preventDefault(); dropzone.classList.remove('is-dragging'); }); });
  dropzone.addEventListener('drop', function (event) { selectProof(event.dataTransfer?.files?.[0]); });
  document.getElementById('proof-upload').addEventListener('click', async function () {
    if (!selectedFile || !currentOrder) return;
    var en = isEn();
    var button = this; button.disabled = true; button.textContent = en ? 'Uploading…' : 'Subiendo…';
    document.getElementById('proof-status').textContent = en ? 'Uploading receipt…' : 'Subiendo comprobante…';
    try {
      var headers = { 'Content-Type': selectedFile.type || 'application/octet-stream', 'X-File-Name': selectedFile.name, 'X-Requested-With': 'fetch' };
      if (currentEmail) headers['X-Customer-Email'] = currentEmail;
      var response = await fetch('/api/commerce/orders/' + encodeURIComponent(folio) + '/payment-proof', { method: 'POST', credentials: 'include', headers: headers, body: selectedFile });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || (en ? 'Could not upload receipt' : 'No se pudo subir el comprobante'));
      render(payload.data); document.getElementById('proof-status').textContent = en ? 'Receipt received. Payment under review.' : 'Comprobante recibido. Pago en revisión.';
    } catch (cause) { document.getElementById('proof-status').textContent = cause.message || (en ? 'Upload error' : 'Error al subir'); button.disabled = false; }
    finally { button.textContent = en ? 'Upload receipt' : 'Subir comprobante'; }
  });
  document.querySelector('.order-copy-actions')?.addEventListener('click', function (event) {
    var button = event.target.closest('[data-copy-field]'); if (!button) return;
    var en = isEn();
    var value = document.getElementById('order-transfer').dataset[button.dataset.copyField];
    navigator.clipboard.writeText(value || '').then(function () {
      button.textContent = en ? 'Copied' : 'Copiado';
      setTimeout(function () {
        button.textContent = button.dataset.copyField === 'account' ? (en ? 'Copy account' : 'Copiar cuenta') : (en ? 'Copy reference' : 'Copiar referencia');
      }, 1600);
    });
  });
  applyLocale();
})();
