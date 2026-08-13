import 'dotenv/config';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import signature from 'cookie-signature';

const baseUrl = process.env.COMMERCE_E2E_BASE_URL || 'http://127.0.0.1:3017';
const origin = new URL(baseUrl).origin;
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'pixon_app', password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pixon_db', dateStrings: true,
});
const created = { itemIds: [], promotionIds: [], orderIds: [] };
let sessionId = null;

function assert(condition, message) { if (!condition) throw new Error(message); }
function idempotency(prefix) { return `${prefix}-${crypto.randomUUID()}`.slice(0, 80); }

async function api(path, { method = 'GET', body, headers = {}, admin = false } = {}) {
  const requestHeaders = { Accept: 'application/json', Origin: origin, ...headers };
  if (body !== undefined) { requestHeaders['Content-Type'] = 'application/json'; requestHeaders['X-Requested-With'] = 'fetch'; }
  if (method !== 'GET' && method !== 'HEAD') requestHeaders['X-Requested-With'] = 'fetch';
  if (admin) requestHeaders.Cookie = cookie;
  const response = await fetch(`${baseUrl}${path}`, {
    method, headers: requestHeaders, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual'
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(`${method} ${path}: ${response.status} ${payload?.error?.message || payload?.error || 'respuesta invalida'}${payload?.error?.details?.diagnostic ? ` · ${payload.error.details.diagnostic}` : ''}`);
  }
  return { status: response.status, ...payload };
}

const [[admin]] = await connection.query(
  `SELECT users.id FROM users JOIN roles ON roles.id = users.role_id WHERE roles.code = 'admin' ORDER BY users.created_at LIMIT 1`
);
assert(admin?.id, 'No existe un usuario admin para E2E autenticado');
sessionId = `e2e-${crypto.randomUUID()}`;
const expires = Math.floor(Date.now() / 1000) + 3600;
const sessionData = JSON.stringify({
  cookie: { originalMaxAge: 3600000, expires: new Date(Date.now() + 3600000).toISOString(), secure: false, httpOnly: true, path: '/', sameSite: 'lax' },
  passport: { user: admin.id }
});
await connection.query('INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)', [sessionId, expires, sessionData]);
const secret = process.env.SESSION_SECRET || 'dev_session_secret_only_for_local';
const cookie = `connect.sid=${encodeURIComponent(`s:${signature.sign(sessionId, secret)}`)}`;

async function createItem(spec) {
  const result = await api('/api/admin/commerce/catalog', { method: 'POST', body: spec, admin: true });
  created.itemIds.push(Number(result.data.id));
  return result.data;
}

async function cleanup() {
  const safeIds = (values) => values.filter(Number.isSafeInteger);
  const [orphanOrders] = await connection.query("SELECT id FROM commerce_orders WHERE customer_email = 'e2e-commerce@example.com'");
  const [orphanPromotions] = await connection.query("SELECT id FROM commerce_promotions WHERE name LIKE 'E2E-%'");
  const [orphanItems] = await connection.query("SELECT id FROM catalog_items WHERE name LIKE 'E2E-%'");
  const orderIds = safeIds([...new Set([...created.orderIds, ...orphanOrders.map((row) => Number(row.id))])]);
  const promotionIds = safeIds([...new Set([...created.promotionIds, ...orphanPromotions.map((row) => Number(row.id))])]);
  const itemIds = safeIds([...new Set([...created.itemIds, ...orphanItems.map((row) => Number(row.id))])]);
  await connection.beginTransaction();
  try {
    if (orderIds.length) {
      const marks = orderIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM commerce_notifications WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.order_id')) AS UNSIGNED) IN (${marks})`, orderIds);
      await connection.query(`DELETE FROM commerce_return_items WHERE return_id IN (SELECT id FROM commerce_returns WHERE order_id IN (${marks}))`, orderIds);
      await connection.query(`DELETE FROM commerce_returns WHERE order_id IN (${marks})`, orderIds);
      await connection.query(`DELETE FROM commerce_refunds WHERE order_id IN (${marks})`, orderIds);
      await connection.query(`DELETE FROM commerce_promotion_usage WHERE order_id IN (${marks})`, orderIds);
      await connection.query(`DELETE FROM commerce_inventory_movements WHERE reference_order_id IN (${marks})`, orderIds);
      await connection.query(`DELETE FROM commerce_order_inventory_reservations WHERE order_id IN (${marks})`, orderIds);
      await connection.query(`DELETE FROM commerce_order_status_history WHERE order_id IN (${marks})`, orderIds);
      await connection.query(`DELETE FROM commerce_payments WHERE order_id IN (${marks})`, orderIds);
      await connection.query(`DELETE FROM commerce_order_items WHERE order_id IN (${marks})`, orderIds);
      await connection.query(`DELETE FROM commerce_orders WHERE id IN (${marks})`, orderIds);
    }
    if (promotionIds.length) {
      const marks = promotionIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM commerce_promotion_brands WHERE promotion_id IN (${marks})`, promotionIds);
      await connection.query(`DELETE FROM commerce_promotion_items WHERE promotion_id IN (${marks})`, promotionIds);
      await connection.query(`DELETE FROM commerce_promotions WHERE id IN (${marks})`, promotionIds);
    }
    if (itemIds.length) {
      const marks = itemIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM catalog_item_attribute_values WHERE catalog_item_id IN (${marks})`, itemIds);
      await connection.query(`DELETE FROM catalog_item_badges WHERE catalog_item_id IN (${marks})`, itemIds);
      await connection.query(`DELETE FROM catalog_item_categories WHERE catalog_item_id IN (${marks})`, itemIds);
      await connection.query(`DELETE FROM catalog_media WHERE catalog_item_id IN (${marks})`, itemIds);
      await connection.query(`DELETE FROM catalog_items WHERE id IN (${marks})`, itemIds);
    }
    await connection.query("DELETE FROM commerce_notifications WHERE title LIKE 'E2E-%'");
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
}

try {
  for (const route of ['/admin/commerce','/admin/commerce/store','/admin/commerce/sales','/admin/commerce/orders','/admin/commerce/payments','/admin/commerce/inventory','/admin/commerce/promotions','/admin/commerce/payment-methods']) {
    const response = await fetch(`${baseUrl}${route}`, { headers: { Cookie: cookie }, redirect: 'manual' });
    assert(response.status === 200, `${route} no respondio 200 autenticado`);
  }

  const common = {
    short_description: 'Fixture E2E Commerce', description: 'Producto real de testing para validar Commerce.',
    currency: 'MXN', condition_code: 'NEW', sale_price: null, cost_reference: '500.00',
    track_stock: true, stock_quantity: 8, minimum_stock: 1, allow_purchase: true,
    allow_quote: false, featured: false, warranty_text: '12 meses', badge_ids: []
  };
  let general = await createItem({ ...common, name: 'E2E-General', slug: `e2e-general-${Date.now()}`, sku: `E2E-G-${Date.now()}`, item_type: 'PRODUCT', product_kind_code: 'GENERAL', base_price: '800.00', category_ids: [1], attributes: [] });
  general = (await api(`/api/admin/commerce/catalog/${general.id}`, { method: 'PATCH', body: { version: general.version, name: 'E2E-General-Editado' }, admin: true })).data;
  assert(general.name === 'E2E-General-Editado', 'La edicion de producto general no persistio');

  const laptop = await createItem({ ...common, name: 'E2E-Laptop', slug: `e2e-laptop-${Date.now()}`, sku: `E2E-L-${Date.now()}`, item_type: 'EQUIPMENT', product_kind_code: 'LAPTOP', brand: 'E2EBrand', base_price: '1000.00', stock_quantity: 3, category_ids: [7], attributes: [{ definition_id: 1, value: 'Ryzen E2E' }, { definition_id: 3, value: 16 }, { definition_id: 4, value: 512 }, { definition_id: 6, value: '15.6' }] });
  await api(`/api/admin/commerce/catalog/${laptop.id}/publish`, { method: 'POST', admin: true });

  let part = await createItem({ ...common, name: 'E2E-Pieza', slug: `e2e-pieza-${Date.now()}`, sku: `E2E-P-${Date.now()}`, item_type: 'HARDWARE', product_kind_code: 'PART', brand: 'E2EBrand', base_price: '300.00', category_ids: [3], attributes: [{ definition_id: 111, value: 'Conector' }, { definition_id: 52, value: 'E2E-PART-001' }, { definition_id: 53, value: 'Modelo de testing' }] });
  part = (await api(`/api/admin/commerce/catalog/${part.id}`, { method: 'PATCH', body: { version: part.version, physical_location: 'E2E-A1' }, admin: true })).data;
  await api(`/api/admin/commerce/catalog/${part.id}/publish`, { method: 'POST', admin: true });

  for (const promotion of [
    { name: 'E2E-Cupon-10', coupon_code: 'E2E10', promotion_type: 'PERCENT', promotion_value: '10.00', scope: 'ITEM', item_ids: [laptop.id], category_ids: [], brands: [], minimum_quantity: 1, minimum_subtotal: '0.00', priority: 20, stackable: true, stop_processing: false, status: 'ACTIVE' },
    { name: 'E2E-Cupon-50', coupon_code: 'E2E50', promotion_type: 'FIXED', promotion_value: '50.00', scope: 'ITEM', item_ids: [laptop.id], category_ids: [], brands: [], minimum_quantity: 1, minimum_subtotal: '0.00', priority: 10, stackable: true, stop_processing: false, status: 'ACTIVE' },
    { name: 'E2E-Marca-Cantidad', coupon_code: null, promotion_type: 'PERCENT', promotion_value: '5.00', scope: 'BRAND', item_ids: [], category_ids: [], brands: ['E2EBrand'], minimum_quantity: 2, minimum_subtotal: '0.00', priority: 5, stackable: false, stop_processing: true, status: 'ACTIVE' }
  ]) {
    const saved = await api('/api/admin/commerce/promotions', { method: 'POST', body: promotion, admin: true });
    created.promotionIds.push(Number(saved.data.id));
  }

  const methods = (await api('/api/admin/commerce/settings/payment-methods', { admin: true })).data;
  const method = methods.CASH?.enabled ? 'CASH' : 'TERMINAL';
  assert(methods[method]?.enabled, 'E2E requiere CASH o TERMINAL activo');
  await api('/api/admin/commerce/settings/payment-methods', { method: 'PUT', body: methods, admin: true });
  const providers = (await api('/api/admin/commerce/settings/payment-providers', { admin: true })).data;
  assert(providers.length === 3 && providers.every((provider) => !provider.configured), 'Readiness de proveedores no coincide con credenciales ausentes');

  const firstOrder = await api('/api/commerce/orders', {
    method: 'POST', headers: { 'X-Idempotency-Key': idempotency('e2e-order') },
    body: { items: [{ catalog_item_id: laptop.id, quantity: 1 }], coupon_codes: ['E2E10','E2E50'], customer: { name: 'E2E Cliente', phone: '9980000000', email: 'e2e-commerce@example.com' }, delivery_method: 'PICKUP', payment_method: method }
  });
  assert(firstOrder.status === 201 && firstOrder.data.pricing.total === '850.00', 'Descuento acumulado backend incorrecto');
  const orderList = await api(`/api/admin/commerce/orders?q=${encodeURIComponent(firstOrder.data.folio)}`, { admin: true });
  const orderRow = orderList.data[0]; created.orderIds.push(Number(orderRow.id));
  await api(`/api/admin/commerce/orders/${orderRow.id}/payments/${orderRow.payment_id}/approve`, { method: 'POST', admin: true });
  let detail = (await api(`/api/admin/commerce/orders/${orderRow.id}`, { admin: true })).data;
  assert(detail.order.status === 'PAID' && detail.payments[0].status === 'APPROVED', 'Aprobacion de pago inconsistente');

  for (const [amount, label] of [['100.00','partial'],['750.00','total']]) {
    const refund = await api(`/api/admin/commerce/orders/${orderRow.id}/payments/${orderRow.payment_id}/refunds`, { method: 'POST', body: { amount, reason: `E2E ${label}`, idempotency_key: idempotency(`e2e-refund-${label}`) }, admin: true });
    await api(`/api/admin/commerce/refunds/${refund.data.id}/complete`, { method: 'POST', body: {}, admin: true });
  }
  detail = (await api(`/api/admin/commerce/orders/${orderRow.id}`, { admin: true })).data;
  assert(detail.payments[0].status === 'REFUNDED' && String(detail.payments[0].refunded_amount) === '850.00', 'Refund total/parcial inconsistente');

  const returned = await api(`/api/admin/commerce/orders/${orderRow.id}/returns`, { method: 'POST', body: { reason: 'E2E devolucion fisica', items: [{ order_item_id: detail.items[0].id, quantity: 1, restock: true }] }, admin: true });
  await api(`/api/admin/commerce/returns/${returned.data.id}/status`, { method: 'PATCH', body: { status: 'APPROVED' }, admin: true });
  await api(`/api/admin/commerce/returns/${returned.data.id}/status`, { method: 'PATCH', body: { status: 'RECEIVED' }, admin: true });

  const quantityOrder = await api('/api/commerce/orders', {
    method: 'POST', headers: { 'X-Idempotency-Key': idempotency('e2e-quantity') },
    body: { items: [{ catalog_item_id: part.id, quantity: 2 }], customer: { name: 'E2E Cliente', phone: '9980000000', email: 'e2e-commerce@example.com' }, delivery_method: 'PICKUP', payment_method: method }
  });
  assert(quantityOrder.data.pricing.total === '570.00', 'Promocion por marca/cantidad incorrecta');
  const secondList = await api(`/api/admin/commerce/orders?q=${encodeURIComponent(quantityOrder.data.folio)}`, { admin: true });
  created.orderIds.push(Number(secondList.data[0].id));
  await api(`/api/admin/commerce/orders/${secondList.data[0].id}/status`, { method: 'PATCH', body: { status: 'CANCELLED', note: 'Cleanup E2E' }, admin: true });

  for (const endpoint of ['/api/admin/commerce/catalog?pageSize=5','/api/admin/commerce/orders?pageSize=5','/api/admin/commerce/payments?pageSize=5','/api/admin/commerce/inventory/items?pageSize=5','/api/admin/commerce/inventory/movements?pageSize=5','/api/admin/commerce/promotions?pageSize=5','/api/admin/commerce/reports/dashboard?period=today']) {
    const result = await api(endpoint, { admin: true }); assert(result.ok === true, `${endpoint} no devolvio envelope OK`);
  }
  console.log(JSON.stringify({ result: 'PASS', authenticated: true, routes: 8, products: 3, orders: 2, promotions: 3, refunds: ['PARTIAL','TOTAL'], return: 'RECEIVED', providers: 'NOT_CONFIGURED' }));
} finally {
  await cleanup();
  if (sessionId) await connection.query('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
  await connection.end();
}
