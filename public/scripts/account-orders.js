(function () {
  'use strict';
  var list = document.getElementById('account-orders-list');
  var more = document.getElementById('account-orders-more');
  if (!list) return;
  var page = 1;
  var labels = { PENDING_PAYMENT: 'Pendiente de pago', PAYMENT_REVIEW: 'Pago en revisión', PAID: 'Pagado', PREPARING: 'Preparando', READY: 'Listo', COMPLETED: 'Completado', CANCELLED: 'Cancelado' };
  function money(value, currency) { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN' }).format(Number(value || 0)); }
  function row(order) {
    var article = document.createElement('article'); article.className = 'account-order-row';
    var heading = document.createElement('div'); var title = document.createElement('h3'); title.textContent = order.folio;
    var date = document.createElement('small'); date.textContent = new Date(order.created_at).toLocaleDateString('es-MX') + ' · ' + order.item_count + (order.item_count === 1 ? ' artículo' : ' artículos'); heading.append(title, date);
    var state = document.createElement('p'); state.textContent = labels[order.status] || order.status;
    var link = document.createElement('a'); link.href = '/pedido/' + encodeURIComponent(order.folio); link.textContent = money(order.total, order.currency) + ' · Ver pedido';
    article.append(heading, state, link); return article;
  }
  async function load(append) {
    var response = await fetch('/api/me/orders?page=' + page + '&pageSize=6', { credentials: 'include', headers: { Accept: 'application/json' } });
    if (response.status === 401) { list.textContent = 'Inicia sesión para consultar pedidos asociados a tu cuenta.'; return; }
    var payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || 'No se pudieron cargar los pedidos');
    var items = Array.isArray(payload.data) ? payload.data : [];
    if (!append) list.replaceChildren();
    items.forEach(function (order) { list.appendChild(row(order)); });
    if (!items.length && page === 1) { var empty = document.createElement('p'); empty.textContent = 'Aún no tienes pedidos. Cuando compres en la tienda aparecerán aquí.'; list.appendChild(empty); }
    more.hidden = !payload.meta?.has_next;
  }
  more.addEventListener('click', function () { page += 1; more.disabled = true; load(true).finally(function () { more.disabled = false; }); });
  load(false).catch(function (error) { list.textContent = error.message; });
})();

