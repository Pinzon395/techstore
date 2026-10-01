(function () {
  'use strict';
  var API = '/api/admin/commerce';
  var ordersPage = 1;
  var ordersMeta = {};
  var promotionStatus = '';
  var promotionPage = 1;
  var promotionMeta = {};
  var promotionSearch = '';
  var promotionType = '';
  var promotionScope = '';
  var promotionResources = { items: [], categories: [], badges: [], brands: [] };
  var promotionTargets = { ITEM: new Set(), CATEGORY: new Set(), BRAND: new Set() };
  var promotionImpactTimer = null;
  var promotionImpactSequence = 0;
  var promotionLastImpact = null;
  var paymentStatus = '';
  var inventoryReason = '';
  var loaded = new Set();
  var statusLabels = { PENDING_PAYMENT: 'Pendiente', PAYMENT_REVIEW: 'Revisión', PAID: 'Pagado', PREPARING: 'Preparando', READY: 'Listo', COMPLETED: 'Completado', CANCELLED: 'Cancelado' };
  function money(value, currency) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(Number(value || 0)); }
  function metricText(value, state, format) {
    if (state === 'error') return 'Error';
    if (state === 'unavailable' || state === 'not_configured') return 'No configurado';
    if (state === 'empty') return 'Sin registros';
    return format === 'money' ? money(value, 'MXN') : String(Number(value || 0));
  }
  function node(tag, className, text) { var item = document.createElement(tag); if (className) item.className = className; if (text != null) item.textContent = text; return item; }
  async function request(path, options) {
    var config = Object.assign({ credentials: 'include', headers: { Accept: 'application/json' } }, options || {});
    if (config.body && !(config.body instanceof Blob)) { config.headers = Object.assign({}, config.headers, { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' }); config.body = JSON.stringify(config.body); }
    else if (config.method && config.method !== 'GET') config.headers = Object.assign({}, config.headers, { 'X-Requested-With': 'fetch' });
    var response = await fetch(API + path, config); var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || 'Error al completar operación');
    return payload;
  }
  function toast(message, error) {
    var target = document.querySelector('.commerce-admin:not([style*="display: none"]) .commerce-notice') || document.getElementById('commerce-notice');
    if (!target) { target = node('div', 'market-toast'); document.body.appendChild(target); }
    target.textContent = message; target.hidden = false; target.classList.toggle('is-error', Boolean(error)); setTimeout(function () { target.hidden = true; }, 3500);
  }
  function openModal(id) { var modal = document.getElementById(id); if (!modal) return; modal._lastFocus = document.activeElement; modal.hidden = false; document.body.classList.add('commerce-modal-open'); modal.querySelector('button, input, select')?.focus(); }
  function closeModal(id) { var modal = document.getElementById(id); if (!modal) return; modal.hidden = true; modal._lastFocus?.focus?.(); if (!document.querySelector('.commerce-modal:not([hidden])')) document.body.classList.remove('commerce-modal-open'); }
  function confirmAction(text) {
    return new Promise(function (resolve) {
      var modal = document.getElementById('market-confirm-modal'); document.getElementById('market-confirm-text').textContent = text; openModal('market-confirm-modal');
      function done(value) { accept.removeEventListener('click', yes); cancel.removeEventListener('click', no); closeModal('market-confirm-modal'); resolve(value); }
      function yes() { done(true); } function no() { done(false); }
      var accept = document.getElementById('market-confirm-accept'), cancel = document.getElementById('market-confirm-cancel'); accept.addEventListener('click', yes); cancel.addEventListener('click', no);
    });
  }

  async function loadDashboard() {
    var period = document.getElementById('commerce-dashboard-period').value;
    var payload = await request('/reports/dashboard?period=' + encodeURIComponent(period)); var data = payload.data;
    var states = data.metric_states || {};
    document.getElementById('market-sales').textContent = metricText(data.metrics.sales, states.sales, 'money'); document.getElementById('market-profit').textContent = metricText(data.metrics.gross_profit, states.gross_profit, 'money');
    document.getElementById('market-orders').textContent = metricText(data.metrics.orders, states.orders); document.getElementById('market-review').textContent = metricText(data.metrics.payment_review, states.payment_review);
    document.getElementById('market-available').textContent = metricText(data.metrics.available, states.available); document.getElementById('market-low').textContent = metricText(data.metrics.low_stock, states.low_stock);
    document.getElementById('market-average-ticket').textContent = metricText(data.metrics.average_ticket, states.average_ticket, 'money');
    var topProducts = document.getElementById('commerce-top-products'); topProducts.replaceChildren();
    (data.top_products || []).forEach(function (product) { var line = node('div', 'market-recent-order'); line.append(node('strong', '', product.name), node('span', '', product.quantity + ' unidades'), node('span', '', money(product.amount, 'MXN'))); topProducts.appendChild(line); });
    if (!topProducts.children.length) topProducts.appendChild(node('p', 'commerce-table-state', 'No hay productos vendidos en este periodo.'));
    var chart = document.getElementById('commerce-chart'); chart.replaceChildren(); var series = data.series || []; var max = Math.max.apply(Math, [1].concat(series.map(function (entry) { return Number(entry.amount); })));
    series.forEach(function (entry) { var column = node('div', 'commerce-chart-column'); var bar = node('span'); bar.style.setProperty('--bar-height', Math.max(3, Number(entry.amount) / max * 100) + '%'); var label = node('small', '', new Date(entry.day).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })); column.append(bar, label); chart.appendChild(column); });
    if (!series.length) chart.appendChild(node('p', 'commerce-table-state', 'No hay ventas confirmadas en este periodo.'));
    var recent = document.getElementById('commerce-recent-activity'); recent.replaceChildren(); (data.recent || []).forEach(function (order) { var button = node('button', 'market-recent-order'); button.type = 'button'; button.append(node('strong', '', order.folio), node('span', '', order.customer_name), node('span', '', money(order.total, order.currency)), node('small', '', statusLabels[order.status] || order.status)); button.addEventListener('click', function () { openOrder(order.id); }); recent.appendChild(button); }); if (!recent.children.length) recent.appendChild(node('p', 'commerce-table-state', 'Todavía no hay pedidos.'));
  }

  function orderRow(order) {
    var row = document.createElement('tr'); row.tabIndex = 0; row.dataset.orderId = order.id;
    [order.folio, order.customer_name, order.item_count, money(order.total, order.currency), order.payment_status || '—', statusLabels[order.status] || order.status, new Date(order.created_at).toLocaleDateString('es-MX')].forEach(function (value) { row.appendChild(node('td', '', value)); });
    row.addEventListener('click', function () { openOrder(order.id); }); row.addEventListener('keydown', function (event) { if (event.key === 'Enter') openOrder(order.id); }); return row;
  }
  async function loadOrders() {
    var form = new FormData(document.getElementById('orders-filters')); var params = new URLSearchParams({ page: String(ordersPage), pageSize: '25' }); form.forEach(function (value, key) { if (value) params.set(key, value); });
    var payload = await request('/orders?' + params); var rows = payload.data || []; ordersMeta = payload.meta || {};
    var body = document.getElementById('orders-body'); body.replaceChildren.apply(body, rows.map(orderRow)); if (!rows.length) { var tr = document.createElement('tr'); var td = node('td', 'commerce-table-state', 'No hay pedidos con estos filtros.'); td.colSpan = 7; tr.appendChild(td); body.appendChild(tr); }
    var summary = ordersMeta.summary || {}; document.getElementById('orders-pending').textContent = Number(summary.pending || 0); document.getElementById('orders-review').textContent = Number(summary.review || 0); document.getElementById('orders-paid').textContent = Number(summary.paid || 0); document.getElementById('orders-ready').textContent = Number(summary.preparing || 0) + Number(summary.ready || 0);
    document.getElementById('orders-page').textContent = 'Página ' + (ordersMeta.page || ordersPage) + ' de ' + Math.max(1, ordersMeta.total_pages || 1); document.getElementById('orders-prev').disabled = !ordersMeta.has_previous; document.getElementById('orders-next').disabled = !ordersMeta.has_next;
  }
  async function loadPayments() {
    var params = new URLSearchParams({ pageSize: '100' });
    if (paymentStatus) params.set('payment_status', paymentStatus);
    var payload = await request('/payments?' + params); var body = document.getElementById('payments-body'); body.replaceChildren();
    (payload.data || []).forEach(function (payment) {
      var row = document.createElement('tr'); row.tabIndex = 0;
      [payment.folio, payment.customer_name, payment.payment_method || '—', money(payment.total, payment.currency), payment.payment_status || '—', payment.payment_reviewed_by || '—', payment.payment_reviewed_at ? new Date(payment.payment_reviewed_at).toLocaleString('es-MX') : '—'].forEach(function (value) { row.appendChild(node('td', '', value)); });
      row.addEventListener('click', function () { openOrder(payment.id); }); row.addEventListener('keydown', function (event) { if (event.key === 'Enter') openOrder(payment.id); }); body.appendChild(row);
    });
    if (!body.children.length) { var emptyRow = document.createElement('tr'); var emptyCell = node('td', 'commerce-table-state', 'No hay pagos en este estado.'); emptyCell.colSpan = 7; emptyRow.appendChild(emptyCell); body.appendChild(emptyRow); }
  }
  function detailLine(label, value) { var row = node('div', 'market-detail-line'); row.append(node('span', '', label), node('strong', '', value)); return row; }
  async function openOrder(id) {
    openModal('order-detail-modal'); var target = document.getElementById('order-detail-content'); target.textContent = 'Cargando detalle…';
    try {
      var payload = await request('/orders/' + id); var data = payload.data, order = data.order, payment = data.payments[0]; document.getElementById('order-detail-title').textContent = order.folio;
      target.replaceChildren(); var layout = node('div', 'market-order-layout'); var left = node('div'); left.append(detailLine('Cliente', order.customer_name), detailLine('Contacto', order.customer_phone + ' · ' + order.customer_email), detailLine('Entrega', order.delivery_method), detailLine('Subtotal', money(order.subtotal, order.currency)), detailLine('Descuento', money(order.discount_total, order.currency)), detailLine('Total', money(order.total, order.currency)));
      var items = node('div', 'market-order-items'); data.items.forEach(function (item) { items.append(detailLine(item.title_snapshot + ' × ' + item.quantity, money(item.line_total, order.currency))); }); left.append(node('h3', '', 'Snapshots del pedido'), items);
      var timeline = node('ol', 'market-timeline'); data.history.forEach(function (entry) { var li = node('li'); li.append(node('strong', '', statusLabels[entry.to_status] || entry.to_status), node('span', '', new Date(entry.created_at).toLocaleString('es-MX')), entry.note ? node('p', '', entry.note) : document.createTextNode('')); timeline.appendChild(li); }); left.append(node('h3', '', 'Timeline'), timeline);
      var right = node('aside'); right.append(node('h3', '', 'Pago'));
      if (payment) { right.append(detailLine('Método', payment.method), detailLine('Estado', payment.status), detailLine('Esperado', money(payment.amount, order.currency)), detailLine('Subido', payment.uploaded_at ? new Date(payment.uploaded_at).toLocaleString('es-MX') : 'Sin comprobante')); if (payment.proof_url) { var viewer = payment.proof_mime === 'application/pdf' ? document.createElement('iframe') : document.createElement('img'); viewer.className = 'market-proof-viewer'; viewer.src = payment.proof_url; viewer.title = 'Comprobante ' + order.folio; right.appendChild(viewer); }
        if (['PENDING','UNDER_REVIEW'].includes(payment.status) && !['CANCELLED','COMPLETED'].includes(order.status)) { var actions = node('div', 'market-payment-actions'); var approve = node('button', 'commerce-button commerce-button-primary', 'Aprobar pago'); approve.type = 'button'; approve.addEventListener('click', async function () { if (!await confirmAction('¿Confirmas el pago? El inventario se descontará exactamente una vez.')) return; approve.disabled = true; try { await request('/orders/' + id + '/payments/' + payment.id + '/approve', { method: 'POST' }); toast('Pago confirmado'); closeModal('order-detail-modal'); loadOrders(); loadNotifications(); } catch (cause) { toast(cause.message, true); approve.disabled = false; } });
          var reason = document.createElement('textarea'); reason.placeholder = 'Motivo de rechazo'; reason.maxLength = 1000; var reject = node('button', 'commerce-button commerce-button-secondary', 'Rechazar'); reject.type = 'button'; reject.addEventListener('click', async function () { if (!reason.value.trim()) { reason.focus(); return; } try { await request('/orders/' + id + '/payments/' + payment.id + '/reject', { method: 'POST', body: { reason: reason.value.trim() } }); toast('Pago rechazado'); closeModal('order-detail-modal'); loadOrders(); } catch (cause) { toast(cause.message, true); } }); var another = node('button', 'commerce-button commerce-button-secondary', 'Solicitar otro comprobante'); another.type = 'button'; another.addEventListener('click', function () { if (!reason.value) reason.value = 'Necesitamos un comprobante legible que corresponda al monto y referencia del pedido.'; reject.click(); }); actions.append(approve, reason, reject, another); right.appendChild(actions); }
      }
      if (payment && data.refunds) { right.append(node('h3', '', 'Refunds')); var refundList = node('div', 'market-order-items'); data.refunds.forEach(function (refund) { var line = detailLine(refund.refund_type + ' · ' + refund.status, money(refund.amount, refund.currency)); if (refund.status === 'PENDING') { var complete = node('button', 'commerce-button commerce-button-secondary', 'Confirmar refund manual'); complete.type = 'button'; complete.addEventListener('click', async function () { if (!await confirmAction('¿Confirmas que el dinero ya fue devuelto al cliente?')) return; try { await request('/refunds/' + refund.id + '/complete', { method: 'POST', body: {} }); toast('Refund confirmado'); openOrder(id); } catch (cause) { toast(cause.message, true); } }); line.appendChild(complete); } refundList.appendChild(line); }); if (!data.refunds.length) refundList.append(node('p', 'commerce-table-state', 'Sin refunds.')); right.appendChild(refundList); if (['APPROVED','PARTIALLY_REFUNDED'].includes(payment.status)) { var refundForm = node('form', 'market-status-form'); var refundAmount = document.createElement('input'); refundAmount.type = 'number'; refundAmount.min = '0.01'; refundAmount.step = '0.01'; refundAmount.max = String(Number(payment.amount) - Number(payment.refunded_amount || 0)); refundAmount.placeholder = 'Monto'; var refundReason = document.createElement('textarea'); refundReason.maxLength = 1000; refundReason.placeholder = 'Motivo obligatorio'; var refundButton = node('button', 'commerce-button commerce-button-secondary', 'Crear refund'); refundButton.type = 'submit'; refundForm.append(refundAmount, refundReason, refundButton); refundForm.addEventListener('submit', async function (event) { event.preventDefault(); if (!refundReason.value.trim()) { refundReason.focus(); return; } if (!await confirmAction('¿Crear este refund? El límite se validará contra el monto pagado.')) return; try { await request('/orders/' + id + '/payments/' + payment.id + '/refunds', { method: 'POST', body: { amount: refundAmount.value, reason: refundReason.value.trim(), idempotency_key: 'refund-' + crypto.randomUUID() } }); toast('Refund registrado'); openOrder(id); } catch (cause) { toast(cause.message, true); } }); right.appendChild(refundForm); } }
      var allowedTransitions = { PAID: ['PREPARING','CANCELLED'], PREPARING: ['READY','CANCELLED'], READY: ['COMPLETED','CANCELLED'], PENDING_PAYMENT: ['CANCELLED'], PAYMENT_REVIEW: ['CANCELLED'] };
      var nextStatuses = allowedTransitions[order.status] || [];
      if (nextStatuses.length) { var statusForm = node('form', 'market-status-form'); var select = document.createElement('select'); nextStatuses.forEach(function (status) { var option = node('option', '', statusLabels[status] || status); option.value = status; select.appendChild(option); }); var update = node('button', 'commerce-button commerce-button-secondary', 'Actualizar pedido'); update.type = 'submit'; statusForm.append(select, update); statusForm.addEventListener('submit', async function (event) { event.preventDefault(); try { await request('/orders/' + id + '/status', { method: 'PATCH', body: { status: select.value } }); toast('Pedido actualizado'); closeModal('order-detail-modal'); loadOrders(); } catch (cause) { toast(cause.message, true); } }); right.append(statusForm); }
      var ticketForm = node('form', 'market-status-form');
      var ticketInput = document.createElement('input'); ticketInput.name = 'ticket_code'; ticketInput.placeholder = 'Folio de ticket'; ticketInput.maxLength = 32; ticketInput.value = order.ticket_code || '';
      var ticketButton = node('button', 'commerce-button commerce-button-secondary', order.ticket_code ? 'Cambiar ticket' : 'Vincular ticket'); ticketButton.type = 'submit';
      ticketForm.append(ticketInput, ticketButton);
      ticketForm.addEventListener('submit', async function (event) { event.preventDefault(); try { await request('/orders/' + id + '/ticket', { method: 'PATCH', body: { ticket_code: ticketInput.value.trim() || null } }); toast('Ticket vinculado'); openOrder(id); } catch (cause) { toast(cause.message, true); } });
      right.appendChild(ticketForm);
      if (order.ticket_code) { var ticket = node('a', '', 'Abrir ticket ' + order.ticket_code); ticket.href = '/admin#repairs'; right.appendChild(ticket); }
      layout.append(left, right); target.appendChild(layout);
    } catch (cause) { target.textContent = cause.message; }
  }

  async function loadInventory() {
    var inventoryQuery = new URLSearchParams({ pageSize: '50' }); if (inventoryReason) inventoryQuery.set('reason', inventoryReason);
    var results = await Promise.all([request('/inventory/movements?' + inventoryQuery), request('/inventory/items?pageSize=100')]);
    var payload = results[0], itemsPayload = results[1], meta = payload.meta || {}, summary = meta.summary || {};
    document.getElementById('inventory-stock').textContent = Number(summary.stock || 0); document.getElementById('inventory-value').textContent = money(summary.inventory_value, 'MXN'); document.getElementById('inventory-available').textContent = Number(summary.available || 0); document.getElementById('inventory-reserved').textContent = Number(summary.reserved || 0); document.getElementById('inventory-low').textContent = Number(summary.low_stock || 0);
    var itemsBody = document.getElementById('inventory-items-body'); itemsBody.replaceChildren();
    (itemsPayload.data || []).forEach(function (item) { var row = document.createElement('tr'); if (Number(item.available_quantity) <= Number(item.minimum_stock)) row.classList.add('is-low-stock'); [item.name + (item.sku ? ' · ' + item.sku : ''), item.category_name || '—', item.stock_quantity, item.reserved_quantity, item.available_quantity, item.minimum_stock, money(item.inventory_value, item.currency), item.physical_location || '—'].forEach(function (value) { row.appendChild(node('td', '', value)); }); itemsBody.appendChild(row); });
    if (!itemsBody.children.length) { var itemEmpty = document.createElement('tr'); var itemCell = node('td', 'commerce-table-state', 'No hay artículos con inventario controlado.'); itemCell.colSpan = 8; itemEmpty.appendChild(itemCell); itemsBody.appendChild(itemEmpty); }
    var body = document.getElementById('inventory-body'); body.replaceChildren(); (payload.data || []).forEach(function (movement) { var row = document.createElement('tr'); [movement.item_name + (movement.sku ? ' · ' + movement.sku : ''), movement.quantity_before ?? '—', (movement.qty_delta > 0 ? '+' : '') + movement.qty_delta, movement.quantity_after ?? '—', movement.reason, movement.folio || movement.reference_text || '—', movement.created_by_name || 'Sistema', new Date(movement.created_at).toLocaleString('es-MX')].forEach(function (value) { row.appendChild(node('td', '', value)); }); body.appendChild(row); });
    if (!body.children.length) { var movementEmpty = document.createElement('tr'); var movementCell = node('td', 'commerce-table-state', 'No hay movimientos con este filtro.'); movementCell.colSpan = 8; movementEmpty.appendChild(movementCell); body.appendChild(movementEmpty); }
  }

  var promotionTypeLabels = { PERCENT: 'Porcentaje', FIXED: 'Monto fijo', SALE_PRICE: 'Precio especial', BUNDLE_PRICE: 'Precio de paquete' };
  var promotionScopeLabels = { ITEM: 'Productos', CATEGORY: 'Categorías', BRAND: 'Marcas' };
  var promotionScopeIcons = { ITEM: 'fa-box', CATEGORY: 'fa-layer-group', BRAND: 'fa-certificate' };
  var promotionStatusLabels = { ACTIVE: 'Activa', SCHEDULED: 'Programada', DRAFT: 'Borrador', ENDED: 'Finalizada' };
  var promotionTimeZone = 'America/Cancun';

  function promotionStatusPill(status) {
    return node('span', 'promotion-status-pill is-' + String(status || 'DRAFT').toLowerCase(), promotionStatusLabels[status] || status);
  }

  function promotionBenefit(promotion) {
    var type = promotion.promotion_type;
    if (type === 'PERCENT') return Number(promotion.promotion_value || 0).toLocaleString('es-MX') + '% menos';
    if (type === 'FIXED') return money(promotion.promotion_value, 'MXN') + ' menos';
    return money(promotion.promotion_value, 'MXN') + (type === 'BUNDLE_PRICE' ? ' el paquete' : ' precio final');
  }

  function promotionDates(promotion, compact) {
    var options = compact ? { day: '2-digit', month: 'short' } : { day: '2-digit', month: 'short', year: 'numeric' };
    options.timeZone = promotionTimeZone;
    var start = promotion.starts_at ? serverDate(promotion.starts_at).toLocaleDateString('es-MX', options) : 'Al publicar';
    var end = promotion.ends_at ? serverDate(promotion.ends_at).toLocaleDateString('es-MX', options) : 'Sin vencimiento';
    return start + ' → ' + end;
  }

  function promotionCondition(promotion) {
    var conditions = [];
    if (Number(promotion.minimum_quantity || 1) > 1) conditions.push('Desde ' + Number(promotion.minimum_quantity) + ' unidades');
    if (Number(promotion.minimum_subtotal || 0) > 0) conditions.push('Compra desde ' + money(promotion.minimum_subtotal, 'MXN'));
    if (promotion.max_redemptions) conditions.push(Number(promotion.max_redemptions) + ' usos totales');
    if (promotion.max_redemptions_per_customer) conditions.push(Number(promotion.max_redemptions_per_customer) + ' por cliente');
    return conditions.length ? conditions : ['Sin compra mínima'];
  }

  function promotionTableRow(promotion) {
    var row = document.createElement('tr');
    var nameCell = node('td'), nameBox = node('div', 'promotion-name-cell'); nameBox.append(node('strong', '', promotion.name), node('small', '', promotionTypeLabels[promotion.promotion_type] || promotion.promotion_type)); if (promotion.coupon_code) nameBox.append(node('code', '', promotion.coupon_code)); nameCell.appendChild(nameBox);
    var benefitCell = node('td'), benefitBox = node('div', 'promotion-benefit-cell'); benefitBox.append(node('strong', '', promotionBenefit(promotion)), node('small', '', 'Prioridad ' + Number(promotion.priority || 0))); benefitCell.appendChild(benefitBox);
    var targetCell = node('td'), targetBox = node('div', 'promotion-target-cell'), targetIcon = node('i', 'fa-solid ' + promotionScopeIcons[promotion.scope]), targetText = node('div'); targetIcon.setAttribute('aria-hidden', 'true'); targetText.append(node('strong', '', Number(promotion.target_count || 0) + (Number(promotion.target_count) === 1 ? ' objetivo' : ' objetivos')), node('small', '', Number(promotion.affected_count || 0) + ' productos afectados')); targetBox.append(targetIcon, targetText); targetCell.appendChild(targetBox);
    var conditionCell = node('td'), conditionBox = node('div', 'promotion-condition-cell'); promotionCondition(promotion).slice(0, 2).forEach(function (value, index) { conditionBox.append(node(index ? 'small' : 'strong', '', value)); }); conditionCell.appendChild(conditionBox);
    var performanceCell = node('td'), performanceBox = node('div', 'promotion-performance-cell'); performanceBox.append(node('strong', '', Number(promotion.redemptions_count || 0) + ' usos'), node('small', '', money(promotion.discount_granted, 'MXN') + ' otorgados')); performanceCell.appendChild(performanceBox);
    var validityCell = node('td'), validityBox = node('div', 'promotion-validity-cell'); validityBox.append(node('strong', '', promotionDates(promotion, true)), node('small', '', promotion.stackable ? 'Acumulable' : 'No acumulable')); validityCell.appendChild(validityBox);
    var statusCell = node('td'); statusCell.appendChild(promotionStatusPill(promotion.status));
    var actionCell = node('td'), action = node('button', 'promotion-row-action'); action.type = 'button'; action.title = 'Editar ' + promotion.name; action.setAttribute('aria-label', action.title); var actionIcon = node('i', 'fa-solid fa-pen'); actionIcon.setAttribute('aria-hidden', 'true'); action.appendChild(actionIcon); action.addEventListener('click', function () { editPromotion(promotion.id); }); actionCell.appendChild(action);
    row.append(nameCell, benefitCell, targetCell, conditionCell, performanceCell, validityCell, statusCell, actionCell);
    return row;
  }

  function promotionMobileCard(promotion) {
    var card = node('article', 'promotion-mobile-card'), header = node('header'), heading = node('div'); heading.append(node('h3', '', promotion.name), node('p', '', promotion.coupon_code ? 'Cupón ' + promotion.coupon_code : 'Descuento automático')); header.append(heading, promotionStatusPill(promotion.status));
    var details = document.createElement('dl'); [['Beneficio', promotionBenefit(promotion)], ['Alcance', Number(promotion.affected_count || 0) + ' productos'], ['Usos', Number(promotion.redemptions_count || 0)], ['Vigencia', promotionDates(promotion, true)]].forEach(function (entry) { var box = node('div'); box.append(node('dt', '', entry[0]), node('dd', '', entry[1])); details.appendChild(box); });
    var edit = node('button', '', 'Revisar y editar'); edit.type = 'button'; edit.addEventListener('click', function () { editPromotion(promotion.id); }); card.append(header, details, edit); return card;
  }

  function renderPromotionSummary(summary) {
    document.getElementById('promotion-metric-active').textContent = Number(summary.active || 0);
    document.getElementById('promotion-metric-scheduled').textContent = Number(summary.scheduled || 0);
    document.getElementById('promotion-metric-redemptions').textContent = Number(summary.redemptions || 0).toLocaleString('es-MX');
    document.getElementById('promotion-metric-discount').textContent = money(summary.discount_granted, 'MXN');
    ['all','active','scheduled','draft','ended'].forEach(function (status) { document.getElementById('promotion-count-' + status).textContent = Number(summary[status === 'all' ? 'total' : status] || 0); });
  }

  async function loadPromotions() {
    var params = new URLSearchParams({ page: String(promotionPage), pageSize: '25' });
    if (promotionStatus) params.set('status', promotionStatus); if (promotionSearch) params.set('q', promotionSearch); if (promotionType) params.set('type', promotionType); if (promotionScope) params.set('scope', promotionScope);
    var body = document.getElementById('promotions-body'), mobile = document.getElementById('promotion-mobile-list'); body.innerHTML = '<tr><td colspan="8" class="commerce-table-state">Actualizando promociones…</td></tr>'; mobile.replaceChildren();
    var payload = await request('/promotions?' + params), promotions = payload.data || []; promotionMeta = payload.meta || {}; renderPromotionSummary(promotionMeta.summary || {}); body.replaceChildren();
    promotions.forEach(function (promotion) { body.appendChild(promotionTableRow(promotion)); mobile.appendChild(promotionMobileCard(promotion)); });
    var empty = document.getElementById('promotion-empty'), filtered = Boolean(promotionStatus || promotionSearch || promotionType || promotionScope); empty.hidden = promotions.length > 0;
    if (!promotions.length) { document.querySelector('.promotion-table-wrap').hidden = true; mobile.hidden = true; empty.querySelector('h3').textContent = filtered ? 'No encontramos coincidencias' : 'Aún no hay promociones'; empty.querySelector('p').textContent = filtered ? 'Prueba con otros filtros o limpia la búsqueda para ver todas las reglas.' : 'Crea la primera regla y revisa su impacto antes de mostrarla en la tienda.'; empty.querySelector('button').textContent = filtered ? 'Crear promoción' : 'Crear primera promoción'; }
    else { document.querySelector('.promotion-table-wrap').hidden = false; mobile.hidden = false; }
    var pages = Math.max(1, Number(promotionMeta.total_pages || 1)), pagination = document.getElementById('promotion-pagination'); pagination.hidden = pages <= 1; document.getElementById('promotion-page').textContent = 'Página ' + Number(promotionMeta.page || promotionPage) + ' de ' + pages; document.getElementById('promotion-prev').disabled = !promotionMeta.has_previous; document.getElementById('promotion-next').disabled = !promotionMeta.has_next;
  }

  function localDateTime(value) {
    if (!value) return '';
    var date = serverDate(value); if (Number.isNaN(date.getTime())) return '';
    var parts = new Intl.DateTimeFormat('en-CA', { timeZone: promotionTimeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).reduce(function (result, part) { result[part.type] = part.value; return result; }, {});
    return parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute;
  }

  function serverDate(value) { if (value instanceof Date) return value; var normalized = String(value).replace(' ', 'T'); if (!/[zZ]|[+-]\d\d:\d\d$/.test(normalized)) normalized += 'Z'; return new Date(normalized); }
  function isoDateTime(value) {
    if (!value) return null; var match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value)); if (!match) return null;
    var desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])), guess = desired;
    for (var attempt = 0; attempt < 2; attempt += 1) { var zoned = new Intl.DateTimeFormat('en-CA', { timeZone: promotionTimeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(guess)).reduce(function (result, part) { result[part.type] = part.value; return result; }, {}); var represented = Date.UTC(Number(zoned.year), Number(zoned.month) - 1, Number(zoned.day), Number(zoned.hour), Number(zoned.minute), Number(zoned.second)); guess = desired - (represented - guess); }
    return new Date(guess).toISOString();
  }
  function checkedValue(form, name) { return form.querySelector('input[name="' + name + '"]:checked')?.value || ''; }

  function promotionPayload(form) {
    var data = new FormData(form), scope = checkedValue(form, 'scope'), type = checkedValue(form, 'promotion_type'), selected = Array.from(promotionTargets[scope] || []);
    return { name: String(data.get('name') || '').trim(), coupon_code: String(data.get('coupon_code') || '').trim().toUpperCase() || null, promotion_type: type, promotion_value: data.get('promotion_value'), scope: scope, badge_id: data.get('badge_id') ? Number(data.get('badge_id')) : null, status: data.get('status') === 'SCHEDULED' ? 'ACTIVE' : data.get('status'), starts_at: isoDateTime(data.get('starts_at')), ends_at: isoDateTime(data.get('ends_at')), presentation: { title: String(data.get('presentation_title') || '').trim() || null, text: String(data.get('presentation_text') || '').trim() || null, banner: String(data.get('presentation_banner') || '').trim() || null }, minimum_quantity: Number(data.get('minimum_quantity') || 1), minimum_subtotal: data.get('minimum_subtotal') || '0.00', max_redemptions: data.get('max_redemptions') ? Number(data.get('max_redemptions')) : null, max_redemptions_per_customer: data.get('max_redemptions_per_customer') ? Number(data.get('max_redemptions_per_customer')) : null, priority: Number(data.get('priority') || 0), stackable: Boolean(form.elements.stackable.checked), stop_processing: Boolean(form.elements.stop_processing.checked), item_ids: scope === 'ITEM' ? selected.map(Number) : [], category_ids: scope === 'CATEGORY' ? selected.map(Number) : [], brands: scope === 'BRAND' ? selected.map(String) : [] };
  }

  function promotionResourceEntries(scope) {
    if (scope === 'CATEGORY') return promotionResources.categories;
    if (scope === 'BRAND') return promotionResources.brands;
    return promotionResources.items;
  }

  function renderPromotionTargets() {
    var form = document.getElementById('promotion-form'); if (!form) return; var scope = checkedValue(form, 'scope') || 'ITEM', list = document.getElementById('promotion-target-list'), search = String(document.getElementById('promotion-target-search').value || '').trim().toLocaleLowerCase('es-MX');
    var entries = promotionResourceEntries(scope).filter(function (entry) { return (entry.title + ' ' + entry.detail).toLocaleLowerCase('es-MX').includes(search); }); list.replaceChildren();
    entries.forEach(function (entry) { var label = node('label', 'promotion-target-option' + (promotionTargets[scope].has(entry.value) ? ' is-selected' : '')), checkbox = document.createElement('input'), copy = node('span'); checkbox.type = 'checkbox'; checkbox.value = entry.value; checkbox.checked = promotionTargets[scope].has(entry.value); copy.append(node('strong', '', entry.title), node('small', '', entry.detail)); label.append(checkbox, copy); list.appendChild(label); });
    if (!entries.length) list.appendChild(node('p', 'commerce-table-state', search ? 'No hay objetivos que coincidan con la búsqueda.' : 'No hay objetivos disponibles en este alcance.'));
    var count = promotionTargets[scope].size; document.getElementById('promotion-target-count').textContent = count + (count === 1 ? ' seleccionado' : ' seleccionados'); document.getElementById('promotion-target-error').hidden = count > 0;
  }

  async function loadPromotionResources(force) {
    if (!force && (promotionResources.items.length || promotionResources.categories.length)) return;
    var results = await Promise.all([request('/promotions/targets?scope=ITEM&pageSize=100'), request('/promotions/targets?scope=CATEGORY&pageSize=100'), request('/promotions/targets?scope=BRAND&pageSize=100'), request('/badges')]);
    promotionResources.items = results[0].data || []; promotionResources.categories = results[1].data || []; promotionResources.brands = results[2].data || []; promotionResources.badges = (results[3].data || []).filter(function (badge) { return badge.status === 'ACTIVE'; });
    var badgeSelect = document.getElementById('promotion-badge'), currentBadge = badgeSelect.value; badgeSelect.replaceChildren(new Option('Sin insignia', '')); promotionResources.badges.forEach(function (badge) { badgeSelect.appendChild(new Option(badge.label, badge.id)); }); badgeSelect.value = currentBadge;
  }

  async function loadPromotionTargetOptions(scope, search) {
    var params = new URLSearchParams({ scope: scope, pageSize: '100' }); if (search) params.set('q', search); Array.from(promotionTargets[scope] || []).forEach(function (value) { params.append('selected', value); });
    var list = document.getElementById('promotion-target-list'); list.setAttribute('aria-busy', 'true');
    try { var payload = await request('/promotions/targets?' + params); if (scope === 'ITEM') promotionResources.items = payload.data || []; else if (scope === 'CATEGORY') promotionResources.categories = payload.data || []; else promotionResources.brands = payload.data || []; renderPromotionTargets(); }
    finally { list.removeAttribute('aria-busy'); }
  }

  function effectiveEditorStatus(form) {
    var status = form.elements.status.value; if (status === 'ENDED') return 'ENDED'; if (status === 'DRAFT') return 'DRAFT'; var start = form.elements.starts_at.value ? new Date(isoDateTime(form.elements.starts_at.value)) : null, end = form.elements.ends_at.value ? new Date(isoDateTime(form.elements.ends_at.value)) : null; if (end && end <= new Date()) return 'ENDED'; return start && start > new Date() ? 'SCHEDULED' : 'ACTIVE';
  }

  function renderPromotionEditor() {
    var form = document.getElementById('promotion-form'); if (!form) return; var payload = promotionPayload(form), type = payload.promotion_type || 'PERCENT', isPercent = type === 'PERCENT', value = Number(payload.promotion_value || 0), exampleFinal = type === 'PERCENT' ? 1000 * (1 - value / 100) : type === 'FIXED' ? Math.max(0, 1000 - value) : Math.min(1000, value || 1000);
    document.getElementById('promotion-value-label').innerHTML = (isPercent ? 'Porcentaje de descuento' : type === 'FIXED' ? 'Monto de descuento' : type === 'SALE_PRICE' ? 'Precio final' : 'Precio del paquete') + ' <b>*</b>';
    document.getElementById('promotion-value-prefix').hidden = isPercent; document.getElementById('promotion-value-suffix').hidden = !isPercent; form.elements.promotion_value.max = isPercent ? '100' : ''; document.getElementById('promotion-value-help').textContent = isPercent ? 'El porcentaje máximo permitido es 100%.' : type === 'FIXED' ? 'Nunca producirá un precio negativo.' : 'Solo aplica si mejora el precio actual.'; document.getElementById('promotion-value-example').textContent = money(1000, 'MXN') + ' → ' + money(exampleFinal, 'MXN');
    var status = effectiveEditorStatus(form), statusNode = document.getElementById('promotion-editor-status'); statusNode.className = 'promotion-status-pill is-' + status.toLowerCase(); statusNode.textContent = promotionStatusLabels[status]; document.getElementById('promotion-preview-state').textContent = promotionStatusLabels[status];
    document.getElementById('promotion-preview-heading').textContent = payload.presentation.title || payload.name || 'Nueva promoción'; document.getElementById('promotion-preview-value').textContent = promotionBenefit(payload); document.getElementById('promotion-preview-description').textContent = payload.presentation.text || 'Agrega un título y una descripción para el cliente.';
    var badge = promotionResources.badges.find(function (entry) { return String(entry.id) === String(payload.badge_id); }); document.getElementById('promotion-preview-badge').textContent = badge?.label || 'Promoción';
    var targetCount = promotionTargets[payload.scope]?.size || 0; document.getElementById('promotion-preview-target').textContent = targetCount ? targetCount + ' ' + String(promotionScopeLabels[payload.scope] || 'objetivos').toLowerCase() : 'Sin objetivos'; document.getElementById('promotion-preview-dates').textContent = promotionDates(payload, true); document.getElementById('promotion-preview-condition').textContent = promotionCondition(payload)[0]; document.getElementById('promotion-preview-coupon').textContent = payload.coupon_code || 'Automática'; renderPromotionTargets();
  }

  function setPromotionFormMessage(message, error) { var target = document.getElementById('promotion-form-message'); target.hidden = !message; target.textContent = message || ''; target.classList.toggle('is-error', Boolean(error)); }

  function validatePromotionForm(showMessage) {
    var form = document.getElementById('promotion-form'), payload = promotionPayload(form), errors = []; form.querySelectorAll('[aria-invalid="true"]').forEach(function (input) { input.removeAttribute('aria-invalid'); });
    if (!payload.name) { errors.push('Escribe un nombre interno.'); form.elements.name.setAttribute('aria-invalid', 'true'); }
    var value = Number(payload.promotion_value); if (!Number.isFinite(value) || value <= 0) { errors.push('El beneficio debe ser mayor a cero.'); form.elements.promotion_value.setAttribute('aria-invalid', 'true'); } else if (payload.promotion_type === 'PERCENT' && value > 100) { errors.push('El porcentaje no puede superar 100%.'); form.elements.promotion_value.setAttribute('aria-invalid', 'true'); }
    if (!promotionTargets[payload.scope]?.size) errors.push('Selecciona al menos un objetivo.');
    if (payload.coupon_code && !/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(payload.coupon_code)) { errors.push('El cupón debe tener 3 a 64 caracteres: letras, números, guion o guion bajo.'); form.elements.coupon_code.setAttribute('aria-invalid', 'true'); }
    if (payload.starts_at && payload.ends_at && new Date(payload.ends_at) <= new Date(payload.starts_at)) { errors.push('La fecha de finalización debe ser posterior al inicio.'); form.elements.ends_at.setAttribute('aria-invalid', 'true'); }
    if (payload.status === 'ACTIVE' && payload.ends_at && new Date(payload.ends_at) <= new Date()) { errors.push('Una promoción publicada no puede finalizar en el pasado.'); form.elements.ends_at.setAttribute('aria-invalid', 'true'); }
    if (payload.max_redemptions && payload.max_redemptions_per_customer && payload.max_redemptions_per_customer > payload.max_redemptions) { errors.push('El límite por cliente no puede superar el límite total.'); form.elements.max_redemptions_per_customer.setAttribute('aria-invalid', 'true'); }
    document.getElementById('promotion-target-error').hidden = Boolean(promotionTargets[payload.scope]?.size); if (showMessage) setPromotionFormMessage(errors[0] || '', Boolean(errors.length)); return { valid: errors.length === 0, payload: payload, errors: errors };
  }

  function resetPromotionImpact(message) {
    promotionLastImpact = null; document.getElementById('promotion-impact-products').textContent = '—'; document.getElementById('promotion-impact-discounted').textContent = '—'; var risk = document.getElementById('promotion-impact-risk'); risk.textContent = '—'; risk.classList.remove('has-risk'); var note = document.getElementById('promotion-impact-message'); note.className = 'promotion-impact-message'; note.textContent = message || 'Completa valor y objetivos para calcular.'; document.getElementById('promotion-impact-sample').replaceChildren();
  }

  async function loadPromotionImpact() {
    var validation = validatePromotionForm(false); if (!validation.valid) { resetPromotionImpact('Completa nombre, beneficio, fechas y objetivos para calcular.'); return; }
    var sequence = ++promotionImpactSequence, button = document.getElementById('promotion-impact-refresh'); button.disabled = true; button.querySelector('i')?.classList.add('fa-spin'); var note = document.getElementById('promotion-impact-message'); note.className = 'promotion-impact-message'; note.textContent = 'Calculando impacto con precios y costos actuales…';
    try {
      var id = document.getElementById('promotion-form').elements.id.value, payload = await request('/promotions/preview' + (id ? '?exclude_id=' + encodeURIComponent(id) : ''), { method: 'POST', body: validation.payload }); if (sequence !== promotionImpactSequence) return; var impact = payload.data || {}; promotionLastImpact = impact; document.getElementById('promotion-impact-products').textContent = Number(impact.target_count || 0); document.getElementById('promotion-impact-discounted').textContent = Number(impact.discounted_count || 0); var risk = document.getElementById('promotion-impact-risk'); risk.textContent = Number(impact.below_cost_count || 0); risk.classList.toggle('has-risk', Number(impact.below_cost_count || 0) > 0); note.className = 'promotion-impact-message';
      if (Number(impact.below_cost_count || 0) > 0) { note.classList.add('is-danger'); note.textContent = Number(impact.below_cost_count) + ' producto(s) quedarían por debajo del costo. Revisa el valor antes de publicar.'; }
      else if (!Number(impact.target_count || 0)) { note.classList.add('is-warning'); note.textContent = 'Los objetivos existen, pero actualmente no alcanzan ningún producto.'; }
      else if ((impact.conflicts || []).length) { note.classList.add('is-warning'); note.textContent = 'Coincide en vigencia con ' + impact.conflicts.length + ' promoción(es): ' + impact.conflicts.map(function (entry) { return entry.name; }).join(', ') + '.'; }
      else if (Number(impact.discounted_count || 0) < Number(impact.target_count || 0)) { note.classList.add('is-warning'); note.textContent = 'No todos los objetivos mejoran su precio actual; solo se descontarán ' + Number(impact.discounted_count || 0) + '.'; }
      else note.textContent = 'Impacto verificado: la regla mejora el precio sin vender debajo del costo registrado.';
      var sample = document.getElementById('promotion-impact-sample'); sample.replaceChildren(); (impact.sample || []).forEach(function (item) { var line = node('div'); line.append(node('strong', '', item.name), node('span', '', money(item.final_price, item.currency || 'MXN')), node('small', '', money(item.baseline_price, item.currency || 'MXN') + ' actual · ahorro ' + money(item.discount_amount, item.currency || 'MXN'))); sample.appendChild(line); });
    } catch (cause) { if (sequence === promotionImpactSequence) resetPromotionImpact(cause.message); }
    finally { if (sequence === promotionImpactSequence) { button.disabled = false; button.querySelector('i')?.classList.remove('fa-spin'); } }
  }

  function schedulePromotionImpact() { clearTimeout(promotionImpactTimer); promotionImpactTimer = setTimeout(loadPromotionImpact, 450); }

  function resetPromotionEditor() {
    var form = document.getElementById('promotion-form'); form.reset(); form.elements.id.value = ''; form.elements.status.value = 'DRAFT'; form.elements.minimum_quantity.value = '1'; form.elements.minimum_subtotal.value = '0.00'; form.elements.priority.value = '0'; form.elements.stop_processing.checked = true; promotionTargets = { ITEM: new Set(), CATEGORY: new Set(), BRAND: new Set() }; document.getElementById('promotion-target-search').value = ''; document.getElementById('promotion-delete').hidden = true; document.querySelector('#promotion-form option[value="ENDED"]').hidden = true; setPromotionFormMessage('', false); resetPromotionImpact();
  }

  async function openNewPromotion() {
    resetPromotionEditor(); document.getElementById('promotion-modal-mode').textContent = 'Nueva regla comercial'; document.getElementById('promotion-modal-title').textContent = 'Crear promoción'; openModal('promotion-modal');
    try { await loadPromotionResources(); renderPromotionEditor(); schedulePromotionImpact(); } catch (cause) { resetPromotionImpact(cause.message); toast(cause.message, true); }
  }

  async function editPromotion(id) {
    resetPromotionEditor(); document.getElementById('promotion-modal-mode').textContent = 'Regla comercial #' + id; document.getElementById('promotion-modal-title').textContent = 'Editar promoción'; openModal('promotion-modal');
    try {
      var results = await Promise.all([request('/promotions/' + id), loadPromotionResources()]), promotion = results[0].data, form = document.getElementById('promotion-form'); form.elements.id.value = promotion.id;
      ['name','coupon_code','promotion_value','minimum_quantity','minimum_subtotal','max_redemptions','max_redemptions_per_customer','priority','badge_id'].forEach(function (key) { if (form.elements[key]) form.elements[key].value = promotion[key] ?? ''; });
      form.querySelector('input[name="promotion_type"][value="' + promotion.promotion_type + '"]').checked = true; form.querySelector('input[name="scope"][value="' + promotion.scope + '"]').checked = true; form.elements.stackable.checked = Boolean(promotion.stackable); form.elements.stop_processing.checked = Boolean(promotion.stop_processing); form.elements.starts_at.value = localDateTime(promotion.starts_at); form.elements.ends_at.value = localDateTime(promotion.ends_at); form.elements.presentation_title.value = promotion.presentation?.title || ''; form.elements.presentation_text.value = promotion.presentation?.text || ''; form.elements.presentation_banner.value = promotion.presentation?.banner || '';
      var ended = promotion.status === 'ENDED' || (promotion.ends_at && serverDate(promotion.ends_at) <= new Date()), endedOption = form.querySelector('option[value="ENDED"]'); endedOption.hidden = !ended; form.elements.status.value = ended ? 'ENDED' : promotion.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE'; promotionTargets.ITEM = new Set((promotion.item_ids || []).map(String)); promotionTargets.CATEGORY = new Set((promotion.category_ids || []).map(String)); promotionTargets.BRAND = new Set((promotion.brands || []).map(String)); document.getElementById('promotion-delete').hidden = ended; await loadPromotionTargetOptions(promotion.scope, ''); renderPromotionEditor(); schedulePromotionImpact();
    } catch (cause) { closeModal('promotion-modal'); toast(cause.message, true); }
  }

  var promotionForm = document.getElementById('promotion-form');
  var promotionDelete = document.getElementById('promotion-delete');
  promotionDelete?.addEventListener('click', async function () { var id = promotionForm.elements.id.value; if (!id || !await confirmAction('¿Finalizar esta promoción? Dejará de aplicar, pero conservará historial, usos y auditoría.')) return; try { await request('/promotions/' + id, { method: 'DELETE' }); closeModal('promotion-modal'); toast('Promoción finalizada'); loadPromotions(); } catch (cause) { toast(cause.message, true); } });

  var paymentSettingsSnapshot = null;
  var paymentProviderReadiness = [];
  var paymentSettingsDirty = false;
  var externalPaymentMethods = ['STRIPE', 'PAYPAL', 'MERCADO_PAGO'];
  var paymentPresentation = {
    BANK_TRANSFER: { title: 'Transferencia bancaria', icon: 'fa-building-columns' },
    CASH: { title: 'Efectivo al recoger', icon: 'fa-money-bill-wave' },
    TERMINAL: { title: 'Tarjeta en terminal', icon: 'fa-credit-card' },
    STRIPE: { title: 'Pago con Stripe', icon: 'fa-credit-card' },
    PAYPAL: { title: 'PayPal', icon: 'fa-brands fa-paypal' },
    MERCADO_PAGO: { title: 'Mercado Pago', icon: 'fa-wallet' }
  };

  function paymentDigits(value) { return String(value || '').replace(/\D/g, ''); }

  function validClabe(value) {
    var digits = paymentDigits(value);
    if (digits.length !== 18) return false;
    var weights = [3, 7, 1];
    var sum = digits.slice(0, 17).split('').reduce(function (total, digit, index) {
      return total + (Number(digit) * weights[index % 3]) % 10;
    }, 0);
    return (10 - (sum % 10)) % 10 === Number(digits[17]);
  }

  function settingsPayload(form) {
    var data = new FormData(form);
    function method(name, bank) {
      var value = {
        enabled: Boolean(form.elements[name + '.enabled']?.checked),
        instructions: String(data.get(name + '.instructions') || '').trim()
      };
      if (bank) Object.assign(value, {
        beneficiary: String(data.get(name + '.beneficiary') || '').trim(),
        bank: String(data.get(name + '.bank') || '').trim(),
        account: paymentDigits(data.get(name + '.account')),
        clabe: paymentDigits(data.get(name + '.clabe')),
        card: ''
      });
      return value;
    }
    return {
      BANK_TRANSFER: method('BANK_TRANSFER', true),
      CASH: method('CASH'),
      TERMINAL: method('TERMINAL'),
      STRIPE: method('STRIPE'),
      PAYPAL: method('PAYPAL'),
      MERCADO_PAGO: method('MERCADO_PAGO')
    };
  }

  function providerState(name) {
    return paymentProviderReadiness.find(function (entry) { return entry.provider === name; }) || {
      provider: name, configured: false, enabled: false, operational: false,
      capabilities: { checkout_session: false, webhook_ingest: false, automatic_reconciliation: false }
    };
  }

  function visiblePaymentMethods(methods) {
    return Object.entries(methods).filter(function (entry) {
      return entry[1]?.enabled && (!externalPaymentMethods.includes(entry[0]) || providerState(entry[0]).operational);
    });
  }

  function appendPaymentPreview(preview, name, value) {
    var meta = paymentPresentation[name];
    var card = node('article', 'payment-preview-method');
    var icon = node('i', meta.icon.indexOf('fa-brands') === 0 ? meta.icon : 'fa-solid ' + meta.icon); icon.setAttribute('aria-hidden', 'true');
    var copy = node('div'); copy.append(node('strong', '', meta.title), node('small', '', value.instructions || 'Disponible para este pedido.'));
    var check = node('i', 'fa-solid fa-check'); check.setAttribute('aria-hidden', 'true');
    card.append(icon, copy, check); preview.append(card);
    if (name === 'BANK_TRANSFER') {
      var details = node('div', 'payment-preview-transfer');
      [['Beneficiario', value.beneficiary], ['Banco', value.bank], ['CLABE', value.clabe], ['Cuenta', value.account]].filter(function (entry) { return entry[1]; }).forEach(function (entry) {
        var row = node('div'); row.append(node('span', '', entry[0]), node('strong', '', entry[1])); details.append(row);
      });
      preview.append(details);
    }
  }

  function previewSettings(methods) {
    var preview = document.getElementById('payment-settings-preview');
    if (!preview) return;
    preview.replaceChildren();
    var visible = visiblePaymentMethods(methods);
    if (!visible.length) {
      preview.append(node('p', 'payment-preview-empty', 'No hay métodos disponibles. Activa al menos una opción antes de guardar.'));
      return;
    }
    visible.forEach(function (entry) { appendPaymentPreview(preview, entry[0], entry[1]); });
  }

  function updatePaymentPanels(methods) {
    document.querySelectorAll('[data-method-section]').forEach(function (section) {
      var method = section.dataset.methodSection;
      section.classList.toggle('is-disabled', !methods[method]?.enabled);
    });
    var transferPanel = document.querySelector('[data-method-panel="BANK_TRANSFER"]');
    if (transferPanel) transferPanel.hidden = !methods.BANK_TRANSFER.enabled;
  }

  function renderProviderReadiness(provider) {
    var form = document.getElementById('payment-settings-form');
    var card = form?.querySelector('[data-provider-card="' + provider.provider + '"]');
    if (!card) return;
    var operational = Boolean(provider.operational);
    var status = card.querySelector('[data-provider-status]');
    var input = form.elements[provider.provider + '.enabled'];
    var capabilities = provider.capabilities || {};
    var checks = {
      credentials: Boolean(provider.configured),
      checkout: Boolean(capabilities.checkout_session),
      reconciliation: Boolean(capabilities.automatic_reconciliation)
    };
    status.textContent = operational ? 'Operativo' : provider.configured ? 'Integración incompleta' : 'Credenciales pendientes';
    status.className = 'payment-status-pill ' + (operational ? 'is-ready' : provider.configured ? 'is-blocked' : 'is-error');
    card.classList.toggle('is-blocked', !operational);
    Object.entries(checks).forEach(function (entry) {
      var item = card.querySelector('[data-provider-check="' + entry[0] + '"]');
      if (!item) return;
      item.classList.toggle('is-ready', entry[1]);
      item.classList.toggle('is-pending', !entry[1]);
    });
    if (input) {
      if (!operational) input.checked = false;
      input.disabled = !operational;
      input.title = operational ? '' : 'No se puede publicar hasta completar sesión de pago, webhook y conciliación';
    }
  }

  function updatePaymentSummary(methods) {
    var active = visiblePaymentMethods(methods);
    var onsite = ['CASH', 'TERMINAL'].filter(function (name) { return methods[name]?.enabled; }).length;
    var online = externalPaymentMethods.filter(function (name) { return providerState(name).operational; }).length;
    var warnings = paymentProviderReadiness.filter(function (provider) { return !provider.operational; }).length;
    document.getElementById('payment-active-count').textContent = String(active.length);
    document.getElementById('payment-onsite-count').textContent = String(onsite) + ' de 2';
    document.getElementById('payment-online-status').textContent = online ? String(online) + ' listo' : 'No disponible';
    document.getElementById('payment-warning-count').textContent = String(warnings);
    var pill = document.getElementById('payment-online-pill');
    if (pill) { pill.textContent = online ? 'Operativo' : 'No operativo'; pill.className = 'payment-status-pill ' + (online ? 'is-ready' : 'is-blocked'); }
    var banner = document.getElementById('payment-readiness-banner');
    if (!banner) return;
    banner.className = 'payment-readiness-banner ' + (online ? 'is-success' : 'is-warning');
    banner.querySelector('strong').textContent = online ? 'Cobro online disponible y verificado' : 'Cobro presencial disponible; cobro online aún bloqueado';
    banner.querySelector('p').textContent = online
      ? 'El checkout solo mostrará proveedores activos que superaron todas las verificaciones.'
      : 'Puedes cobrar con efectivo o terminal. Para cobrar tarjeta en línea aún faltan credenciales, sesión de pago y conciliación automática.';
  }

  function renderPaymentSettings(methods) {
    previewSettings(methods);
    updatePaymentPanels(methods);
    updatePaymentSummary(methods);
  }

  function setPaymentDirty(dirty) {
    paymentSettingsDirty = Boolean(dirty);
    var bar = document.querySelector('.payment-save-bar');
    var reset = document.getElementById('payment-settings-reset');
    var submit = document.getElementById('payment-settings-submit');
    var label = document.getElementById('payment-save-state');
    bar?.classList.toggle('is-dirty', paymentSettingsDirty);
    if (reset) reset.disabled = !paymentSettingsDirty;
    if (submit) submit.disabled = !paymentSettingsDirty;
    if (label) label.textContent = paymentSettingsDirty ? 'Cambios sin guardar' : 'Sin cambios pendientes';
  }

  function refreshPaymentDirtyState(form) {
    var methods = settingsPayload(form);
    renderPaymentSettings(methods);
    setPaymentDirty(Boolean(paymentSettingsSnapshot) && JSON.stringify(methods) !== JSON.stringify(paymentSettingsSnapshot));
    var message = document.getElementById('payment-settings-message');
    if (message) { message.hidden = true; message.classList.remove('is-error'); }
  }

  function populatePaymentForm(methods) {
    var form = document.getElementById('payment-settings-form');
    Object.entries(methods).forEach(function (entry) {
      Object.entries(entry[1] || {}).forEach(function (field) {
        var input = form.elements[entry[0] + '.' + field[0]];
        if (!input) return;
        if (input.type === 'checkbox') input.checked = Boolean(field[1]);
        else input.value = field[1] || '';
      });
    });
  }

  function validatePaymentSettings(methods, form) {
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (input) { input.removeAttribute('aria-invalid'); });
    if (!visiblePaymentMethods(methods).length) throw new Error('Activa al menos un método de pago disponible.');
    if (!methods.BANK_TRANSFER.enabled) return;
    if (!methods.BANK_TRANSFER.beneficiary) { form.elements['BANK_TRANSFER.beneficiary'].setAttribute('aria-invalid', 'true'); throw new Error('Escribe el beneficiario de la transferencia.'); }
    if (!methods.BANK_TRANSFER.bank) { form.elements['BANK_TRANSFER.bank'].setAttribute('aria-invalid', 'true'); throw new Error('Escribe el banco de la transferencia.'); }
    if (!methods.BANK_TRANSFER.clabe && !methods.BANK_TRANSFER.account) throw new Error('Configura una CLABE o un número de cuenta.');
    if (methods.BANK_TRANSFER.clabe && !validClabe(methods.BANK_TRANSFER.clabe)) { form.elements['BANK_TRANSFER.clabe'].setAttribute('aria-invalid', 'true'); throw new Error('La CLABE debe tener 18 dígitos y un dígito verificador válido.'); }
    if (methods.BANK_TRANSFER.account && !/^\d{4,20}$/.test(methods.BANK_TRANSFER.account)) { form.elements['BANK_TRANSFER.account'].setAttribute('aria-invalid', 'true'); throw new Error('La cuenta debe contener entre 4 y 20 dígitos.'); }
  }

  async function loadSettings() {
    var form = document.getElementById('payment-settings-form');
    var refresh = document.getElementById('payment-settings-refresh');
    if (!form) return;
    if (refresh) refresh.disabled = true;
    try {
      var results = await Promise.all([request('/settings/payment-methods'), request('/settings/payment-providers')]);
      paymentProviderReadiness = results[1].data || [];
      populatePaymentForm(results[0].data);
      paymentProviderReadiness.forEach(renderProviderReadiness);
      var normalized = settingsPayload(form);
      paymentSettingsSnapshot = JSON.parse(JSON.stringify(normalized));
      renderPaymentSettings(normalized);
      setPaymentDirty(false);
      document.getElementById('payment-last-updated').textContent = 'Sincronizado ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } finally {
      if (refresh) refresh.disabled = false;
    }
  }

  async function loadNotifications() {
    try { var payload = await request('/notifications?unreadOnly=1&pageSize=15'); var items = payload.data || [], badge = document.getElementById('notifications-badge'), navBadge = document.getElementById('nav-badge-orders'); badge.textContent = payload.meta?.unread || items.length; badge.style.display = items.length ? '' : 'none'; var reviewCount = items.filter(function (item) { return item.notification_type === 'PAYMENT_REVIEW' || item.notification_type === 'ORDER_CREATED'; }).length; navBadge.textContent = reviewCount; navBadge.style.display = reviewCount ? '' : 'none'; var body = document.getElementById('notificationsDropdownBody'); if (items.length) { body.replaceChildren(); items.forEach(function (item) { var button = node('button', 'market-notification'); button.type = 'button'; button.append(node('strong', '', item.title), node('small', '', new Date(item.created_at).toLocaleString('es-MX'))); button.addEventListener('click', async function () { await request('/notifications/' + item.id + '/read', { method: 'POST' }); if (item.payload) { var value = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload; if (value.order_id) openOrder(value.order_id); } loadNotifications(); }); body.appendChild(button); }); } } catch (_) {}
  }

  document.getElementById('commerce-dashboard-period')?.addEventListener('change', loadDashboard);
  document.getElementById('orders-filters')?.addEventListener('submit', function (event) { event.preventDefault(); ordersPage = 1; loadOrders().catch(function (cause) { toast(cause.message, true); }); });
  document.getElementById('orders-refresh')?.addEventListener('click', function () { loadOrders(); }); document.getElementById('orders-prev')?.addEventListener('click', function () { if (ordersMeta.has_previous) { ordersPage -= 1; loadOrders(); } }); document.getElementById('orders-next')?.addEventListener('click', function () { if (ordersMeta.has_next) { ordersPage += 1; loadOrders(); } });
  document.getElementById('payment-tabs')?.addEventListener('click', function (event) { var button = event.target.closest('[data-payment-status]'); if (!button) return; paymentStatus = button.dataset.paymentStatus; this.querySelectorAll('button').forEach(function (candidate) { candidate.classList.toggle('is-active', candidate === button); }); loadPayments().catch(function (cause) { toast(cause.message, true); }); });
  document.getElementById('inventory-adjust-open')?.addEventListener('click', function () { openModal('inventory-adjust-modal'); });
  var inventoryAdjustForm = document.getElementById('inventory-adjust-form');
  if (inventoryAdjustForm && !inventoryAdjustForm.elements.movement_reason) { var reasonLabel = node('label'); var reasonTitle = node('span', '', 'Tipo de movimiento'); var reasonSelect = document.createElement('select'); reasonSelect.name = 'movement_reason'; [['ADJUSTMENT','Ajuste'],['ENTRY','Entrada'],['EXIT','Salida'],['RETURN','Devolución'],['LOSS','Pérdida'],['DAMAGE','Daño']].forEach(function (entry) { reasonSelect.appendChild(new Option(entry[1], entry[0])); }); reasonLabel.append(reasonTitle, reasonSelect); inventoryAdjustForm.insertBefore(reasonLabel, inventoryAdjustForm.querySelector('label:last-of-type')); }
  document.getElementById('inventory-tabs')?.addEventListener('click', function (event) { var button = event.target.closest('[data-inventory-reason]'); if (!button) return; inventoryReason = button.dataset.inventoryReason; this.querySelectorAll('button').forEach(function (candidate) { candidate.classList.toggle('is-active', candidate === button); }); loadInventory().catch(function (cause) { toast(cause.message, true); }); });
  document.getElementById('inventory-adjust-form')?.addEventListener('submit', async function (event) { event.preventDefault(); var data = new FormData(this), submit = this.querySelector('button[type="submit"]'); if (submit?.disabled) return; if (submit) { submit.disabled = true; submit.setAttribute('aria-busy', 'true'); } try { await request('/inventory/adjust', { method: 'POST', body: { catalog_item_id: Number(data.get('catalog_item_id')), delta: Number(data.get('delta')), movement_reason: data.get('movement_reason') || 'ADJUSTMENT', reason: data.get('reason') } }); closeModal('inventory-adjust-modal'); this.reset(); toast('Inventario actualizado'); loadInventory(); } catch (cause) { toast(cause.message, true); } finally { if (submit) { submit.disabled = false; submit.removeAttribute('aria-busy'); } } });
  document.getElementById('promotion-create')?.addEventListener('click', openNewPromotion);
  document.getElementById('promotion-empty-create')?.addEventListener('click', openNewPromotion);
  document.getElementById('promotion-tabs')?.addEventListener('click', function (event) {
    var button = event.target.closest('[data-promotion-status]'); if (!button) return; promotionStatus = button.dataset.promotionStatus; promotionPage = 1;
    this.querySelectorAll('button').forEach(function (candidate) { var selected = candidate === button; candidate.classList.toggle('is-active', selected); candidate.setAttribute('aria-selected', String(selected)); });
    loadPromotions().catch(function (cause) { toast(cause.message, true); });
  });
  var promotionFilterTimer = null;
  document.getElementById('promotion-filters')?.addEventListener('submit', function (event) { event.preventDefault(); var data = new FormData(this); promotionSearch = String(data.get('q') || '').trim(); promotionType = String(data.get('type') || ''); promotionScope = String(data.get('scope') || ''); promotionPage = 1; loadPromotions().catch(function (cause) { toast(cause.message, true); }); });
  document.getElementById('promotion-filters')?.addEventListener('input', function () { var form = this; clearTimeout(promotionFilterTimer); promotionFilterTimer = setTimeout(function () { form.requestSubmit(); }, 350); });
  document.getElementById('promotion-filters')?.addEventListener('change', function () { this.requestSubmit(); });
  document.getElementById('promotion-refresh')?.addEventListener('click', function () { loadPromotions().catch(function (cause) { toast(cause.message, true); }); });
  document.getElementById('promotion-prev')?.addEventListener('click', function () { if (!promotionMeta.has_previous) return; promotionPage -= 1; loadPromotions().catch(function (cause) { toast(cause.message, true); }); });
  document.getElementById('promotion-next')?.addEventListener('click', function () { if (!promotionMeta.has_next) return; promotionPage += 1; loadPromotions().catch(function (cause) { toast(cause.message, true); }); });
  document.getElementById('promotion-target-list')?.addEventListener('change', function (event) { var input = event.target.closest('input[type="checkbox"]'); if (!input) return; var scope = checkedValue(promotionForm, 'scope'); if (input.checked) promotionTargets[scope].add(input.value); else promotionTargets[scope].delete(input.value); renderPromotionEditor(); schedulePromotionImpact(); });
  var promotionTargetSearchTimer = null;
  document.getElementById('promotion-target-search')?.addEventListener('input', function () { var input = this, scope = checkedValue(promotionForm, 'scope'); renderPromotionTargets(); clearTimeout(promotionTargetSearchTimer); promotionTargetSearchTimer = setTimeout(function () { loadPromotionTargetOptions(scope, input.value.trim()).catch(function (cause) { toast(cause.message, true); }); }, 300); });
  promotionForm?.addEventListener('input', function (event) { if (event.target.id === 'promotion-target-search' || event.target.closest('#promotion-target-list')) return; if (event.target.name === 'coupon_code') event.target.value = event.target.value.toUpperCase().replace(/\s+/g, ''); renderPromotionEditor(); schedulePromotionImpact(); });
  promotionForm?.addEventListener('change', function (event) { if (event.target.closest('#promotion-target-list')) return; if (event.target.name === 'scope') { document.getElementById('promotion-target-search').value = ''; loadPromotionTargetOptions(event.target.value, '').catch(function (cause) { toast(cause.message, true); }); } renderPromotionEditor(); schedulePromotionImpact(); });
  document.getElementById('promotion-impact-refresh')?.addEventListener('click', loadPromotionImpact);
  promotionForm?.addEventListener('submit', async function (event) {
    event.preventDefault(); var validation = validatePromotionForm(true); if (!validation.valid) { this.querySelector('[aria-invalid="true"]')?.focus(); return; }
    var submit = document.getElementById('promotion-submit'), id = this.elements.id.value;
    try {
      submit.disabled = true; submit.setAttribute('aria-busy', 'true');
      if (validation.payload.status === 'ACTIVE') await loadPromotionImpact();
      if (validation.payload.status === 'ACTIVE' && promotionLastImpact && Number(promotionLastImpact.below_cost_count || 0) > 0 && !await confirmAction('Esta promoción deja productos por debajo del costo registrado. ¿Confirmas que deseas publicarla?')) return;
      if (validation.payload.status === 'ACTIVE' && promotionLastImpact && (promotionLastImpact.conflicts || []).length && !await confirmAction('Esta regla coincide con promociones activas o programadas. ¿Confirmas su prioridad y combinación?')) return;
      await request('/promotions' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: validation.payload }); closeModal('promotion-modal'); toast(id ? 'Promoción actualizada' : 'Promoción creada'); promotionPage = 1; await loadPromotions();
    } catch (cause) { setPromotionFormMessage(cause.message, true); }
    finally { submit.disabled = false; submit.removeAttribute('aria-busy'); }
  });
  document.getElementById('payment-settings-form')?.addEventListener('input', function () { refreshPaymentDirtyState(this); });
  document.getElementById('payment-settings-form')?.addEventListener('focusout', function (event) {
    if (!['BANK_TRANSFER.clabe', 'BANK_TRANSFER.account'].includes(event.target.name)) return;
    event.target.value = paymentDigits(event.target.value);
    refreshPaymentDirtyState(this);
  });
  document.getElementById('payment-settings-form')?.addEventListener('submit', async function (event) {
    event.preventDefault();
    var form = this, methods = settingsPayload(form), message = document.getElementById('payment-settings-message');
    var bar = document.querySelector('.payment-save-bar'), submit = document.getElementById('payment-settings-submit');
    try {
      validatePaymentSettings(methods, form);
      bar?.classList.add('is-saving');
      if (submit) submit.disabled = true;
      document.getElementById('payment-save-state').textContent = 'Guardando configuración…';
      var response = await request('/settings/payment-methods', { method: 'PUT', body: methods });
      populatePaymentForm(response.data);
      paymentSettingsSnapshot = JSON.parse(JSON.stringify(settingsPayload(form)));
      renderPaymentSettings(paymentSettingsSnapshot);
      setPaymentDirty(false);
      document.getElementById('payment-last-updated').textContent = 'Guardado ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      message.textContent = 'Configuración guardada y auditada.';
      message.hidden = false;
      message.classList.remove('is-error');
      toast('Métodos de pago actualizados');
    } catch (cause) {
      message.textContent = cause.message;
      message.hidden = false;
      message.classList.add('is-error');
      document.getElementById('payment-save-state').textContent = 'No fue posible guardar';
      if (submit) submit.disabled = false;
    } finally {
      bar?.classList.remove('is-saving');
    }
  });
  document.getElementById('payment-settings-reset')?.addEventListener('click', function () {
    if (!paymentSettingsSnapshot) return;
    var form = document.getElementById('payment-settings-form');
    populatePaymentForm(paymentSettingsSnapshot);
    paymentProviderReadiness.forEach(renderProviderReadiness);
    renderPaymentSettings(paymentSettingsSnapshot);
    setPaymentDirty(false);
  });
  document.getElementById('payment-settings-refresh')?.addEventListener('click', async function () {
    if (paymentSettingsDirty && !await confirmAction('Hay cambios sin guardar. ¿Descartarlos y volver a cargar la configuración?')) return;
    loadSettings().catch(function (cause) { toast(cause.message, true); });
  });
  window.addEventListener('beforeunload', function (event) { if (paymentSettingsDirty) { event.preventDefault(); event.returnValue = ''; } });
  document.addEventListener('click', function (event) { var close = event.target.closest('[data-market-close]'); if (close) closeModal(close.dataset.marketClose === 'order' ? 'order-detail-modal' : close.dataset.marketClose === 'adjust' ? 'inventory-adjust-modal' : 'promotion-modal'); });
  document.addEventListener('keydown', function (event) { var modal = document.querySelector('.commerce-modal:not([hidden])'); if (!modal || event.key !== 'Tab') return; var focusable = Array.from(modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')).filter(function (entry) { return entry.getClientRects().length; }); if (!focusable.length) return; var first = focusable[0], last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } });
  window.addEventListener('admin:switch-view', function (event) { var view = event.detail?.view; var loads = { 'commerce-dashboard': loadDashboard, 'commerce-orders': loadOrders, 'commerce-payments': loadPayments, 'commerce-inventory': loadInventory, 'commerce-promotions': loadPromotions, 'commerce-settings': loadSettings }; if (loads[view] && !loaded.has(view)) { loaded.add(view); loads[view]().catch(function (cause) { loaded.delete(view); toast(cause.message, true); }); } });
  loadNotifications(); setInterval(loadNotifications, 60000);
})();
