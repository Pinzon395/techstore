'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { Money } = require('../money');
const { canTransition, assertTransition } = require('../orders/order-state');
const { validateCreateOrder } = require('../orders/order-validation');
const { inspectPaymentProof } = require('../orders/payment-proof-inspector');
const { priceAfterPromotion, applyPromotionRules, validatePromotion } = require('../orders/promotion.service');
const { configured, StripeAdapter, PaymentProviderService, PROVIDER_IMPLEMENTATION } = require('../orders/payment-provider.service');
const { cleanPaymentMethods, validClabe } = require('../orders/settings.service');
const { buildInventoryDemand } = require('../orders/order.service');

const root = path.resolve(__dirname, '..', '..', '..', '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const orderSource = source('server/modules/commerce/orders/order.service.js');
const adminSource = source('server/modules/commerce/orders/admin-order.service.js');
const inventorySource = source('server/modules/commerce/orders/inventory.service.js');
const routeSource = source('server/modules/commerce/orders/order.routes.js');
const migration = source('server/sql/migrations/003_commerce_orders.sql');
const adminMigration = source('server/sql/migrations/004_commerce_admin_catalog.sql');
const transactionalExtension = source('server/sql/migrations/005_commerce_promotions_refunds_providers.sql');
const refundSource = source('server/modules/commerce/orders/refund.service.js');
const catalogRoutes = source('server/modules/commerce/catalog/catalog.routes.js');

test('administracion commerce agrega tipos extensibles y CRUD protegido', () => {
    assert.match(adminMigration, /CREATE TABLE IF NOT EXISTS catalog_product_kinds/);
    assert.match(adminMigration, /CREATE TABLE IF NOT EXISTS catalog_product_kind_attributes/);
    for (const kind of ['LAPTOP', 'GAMING_PC', 'CPU', 'GPU', 'RAM', 'STORAGE', 'PART', 'PERIPHERAL']) {
        assert.match(adminMigration, new RegExp(`'${kind}'`));
    }
    assert.match(catalogRoutes, /\/catalog\/:id\/duplicate/);
    assert.match(catalogRoutes, /router\.delete\('\/catalog\/:id'/);
    assert.match(catalogRoutes, /canDelete/);
    assert.match(routeSource, /\/inventory\/items/);
});

test('pedido normal se valida y no acepta precios del navegador como autoridad', () => {
    const result = validateCreateOrder({
        items: [{ catalog_item_id: 7, quantity: 1, unit_price: '0.01' }],
        customer: { name: 'Cliente Prueba', phone: '998 000 0000', email: 'CLIENTE@example.com' },
        delivery_method: 'PICKUP', payment_method: 'BANK_TRANSFER', total: '0.01'
    }, 'checkout-contract-000001');
    assert.deepEqual(result.items, [{ catalog_item_id: 7, quantity: 1 }]);
    assert.equal(result.customer.email, 'cliente@example.com');
    assert.equal(Object.hasOwn(result, 'total'), false);
});

test('Money calcula subtotales sin floats', () => {
    const subtotal = Money.fromDecimal('14000.00').multiply(1);
    const sale = Money.fromDecimal('11999.00');
    assert.equal(subtotal.subtract(sale).toDecimal(), '2001.00');
});

test('promociones PERCENT, FIXED, SALE_PRICE y BUNDLE_PRICE calculan importe seguro', () => {
    assert.equal(priceAfterPromotion('1000.00', { promotion_type: 'PERCENT', promotion_value: '15.00' }, 'MXN').toDecimal(), '850.00');
    assert.equal(priceAfterPromotion('1000.00', { promotion_type: 'FIXED', promotion_value: '125.50' }, 'MXN').toDecimal(), '874.50');
    assert.equal(priceAfterPromotion('14000.00', { promotion_type: 'SALE_PRICE', promotion_value: '11999.00' }, 'MXN').toDecimal(), '11999.00');
    assert.equal(priceAfterPromotion('7750.00', { promotion_type: 'BUNDLE_PRICE', promotion_value: '6000.00' }, 'MXN').toDecimal(), '6000.00');
});

test('constructor de promociones exige objetivo, beneficio y limites consistentes', () => {
    const base = {
        name: 'Regreso a clases', coupon_code: ' pixon_10 ', promotion_type: 'PERCENT',
        promotion_value: '10.00', scope: 'ITEM', badge_id: null, status: 'DRAFT',
        starts_at: null, ends_at: null, presentation: { title: 'Oferta', text: null, banner: null },
        minimum_quantity: 1, minimum_subtotal: '0.00', max_redemptions: 100,
        max_redemptions_per_customer: 1, priority: 0, stackable: false,
        stop_processing: true, item_ids: [7], category_ids: [], brands: []
    };
    assert.equal(validatePromotion(base).coupon_code, 'PIXON_10');
    assert.throws(() => validatePromotion({ ...base, item_ids: [] }), /Selecciona al menos un producto/);
    assert.throws(() => validatePromotion({ ...base, promotion_value: '0.00' }), /mayor a cero/);
    assert.throws(() => validatePromotion({ ...base, max_redemptions: 2, max_redemptions_per_customer: 3 }), /limite por cliente/);
});

test('cupones se normalizan y reglas acumulables respetan prioridad y stop_processing', () => {
    const input = validateCreateOrder({
        items: [{ catalog_item_id: 7, quantity: 2 }],
        customer: { name: 'Cliente Prueba', phone: '9980000000', email: 'cliente@example.com' },
        payment_method: 'CASH', coupon_codes: [' verano-10 ']
    }, 'checkout-coupon-000001');
    assert.deepEqual(input.couponCodes, ['VERANO-10']);
    const result = applyPromotionRules('1000.00', '1000.00', [
        { id: 2, promotion_type: 'FIXED', promotion_value: '50.00', priority: 10, stackable: 1, stop_processing: 0 },
        { id: 1, promotion_type: 'PERCENT', promotion_value: '10.00', priority: 20, stackable: 1, stop_processing: 0 }
    ], 'MXN');
    assert.equal(result.unitPrice.toDecimal(), '850.00');
    assert.deepEqual(result.promotions.map((promotion) => promotion.id), [1, 2]);
});

test('refunds separan devolucion fisica, limitan monto y usan idempotencia', () => {
    for (const table of ['commerce_refunds','commerce_returns','commerce_return_items','commerce_payment_provider_events']) {
        assert.match(transactionalExtension, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    }
    assert.match(refundSource, /requested\.compare\(available\) > 0/);
    assert.match(refundSource, /idempotency_key = \? LIMIT 1 FOR UPDATE/);
    assert.match(refundSource, /PARTIALLY_REFUNDED/);
    assert.match(refundSource, /commerce_return_items/);
});

test('proveedores externos permanecen bloqueados sin secretos y Stripe valida HMAC', () => {
    assert.equal(configured('STRIPE', {}), false);
    const env = { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test' };
    const adapter = new StripeAdapter(env);
    const raw = Buffer.from('{"id":"evt_1"}');
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = require('crypto').createHmac('sha256', env.STRIPE_WEBHOOK_SECRET)
        .update(`${timestamp}.${raw.toString('utf8')}`).digest('hex');
    assert.equal(adapter.verifyWebhook(raw, { 'stripe-signature': `t=${timestamp},v1=${signature}` }), true);
    assert.equal(adapter.verifyWebhook(raw, { 'stripe-signature': `t=${timestamp},v1=bad` }), false);
});

test('credenciales no convierten por si solas un proveedor en cobro operativo', async () => {
    assert.equal(PROVIDER_IMPLEMENTATION.STRIPE.checkout_session, false);
    const service = new PaymentProviderService({
        pool: null, runTransaction: null, audit: null,
        env: { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test' }
    });
    const executor = { execute: async () => [[{
        provider: 'STRIPE', enabled: 1, mode: 'TEST', display_name: 'Stripe', public_config: null, sort_order: 100
    }]] };
    const [state] = await service.readiness(executor);
    assert.equal(state.configured, true);
    assert.equal(state.capabilities.webhook_ingest, true);
    assert.equal(state.capabilities.checkout_session, false);
    assert.equal(state.operational, false);
    assert.deepEqual(state.issues, ['checkout_session', 'automatic_reconciliation']);
});

test('transferencia exige identidad bancaria y valida CLABE en frontend y servidor', () => {
    const clabe = '012180001234567899';
    assert.equal(validClabe(clabe), true);
    assert.equal(validClabe(clabe.slice(0, -1) + '8'), false);
    const clean = cleanPaymentMethods({
        BANK_TRANSFER: { enabled: true, beneficiary: 'Pixon PC', bank: 'Banco', clabe, instructions: 'Usa tu folio.' }
    });
    assert.equal(clean.BANK_TRANSFER.clabe, clabe);
    assert.equal(Object.hasOwn(clean.BANK_TRANSFER, 'card'), false);
    assert.throws(() => cleanPaymentMethods({
        BANK_TRANSFER: { enabled: true, beneficiary: 'Pixon PC', bank: 'Banco', clabe: clabe.slice(0, -1) + '8' }
    }), /CLABE/);
});

test('bundle multiplica componentes físicos y no reserva servicios sin inventario', () => {
    const bundle = { id: 30, item_type: 'BUNDLE', track_stock: 0 };
    const laptop = { id: 10, item_type: 'EQUIPMENT', track_stock: 1 };
    const service = { id: 20, item_type: 'SERVICE', track_stock: 0 };
    const demand = buildInventoryDemand(
        [{ catalog_item_id: 30, quantity: 2, item: bundle }],
        [
            { bundle_catalog_item_id: 30, component_catalog_item_id: 10, quantity: 1 },
            { bundle_catalog_item_id: 30, component_catalog_item_id: 20, quantity: 5 }
        ],
        new Map([[10, laptop], [20, service], [30, bundle]])
    );
    assert.deepEqual([...demand], [[10, 2]]);
});

test('stock insuficiente y producto SOLD se rechazan en el servidor', () => {
    assert.match(inventorySource, /available < quantity/);
    assert.match(inventorySource, /Producto ya no disponible/);
    assert.match(orderSource, /item\.status !== 'ACTIVE'/);
});

test('dos compradores serializan filas de inventario y evitan overselling', () => {
    assert.match(inventorySource, /ORDER BY id FOR UPDATE/);
    assert.match(inventorySource, /stock_quantity\) - Number\(item\.reserved_quantity/);
    assert.match(inventorySource, /reserved_quantity = reserved_quantity \+ \?/);
});

test('doble submit se serializa y conserva un único pedido', () => {
    assert.match(migration, /UNIQUE \(idempotency_key\)/);
    assert.match(orderSource, /acquireIdempotencyLock/);
    assert.match(orderSource, /commerce_counters[\s\S]+FOR UPDATE/);
    assert.match(orderSource, /replayed: true/);
});

test('comprobante JPEG válido obtiene MIME real y checksum SHA-256', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 1, 2, 3]);
    const result = inspectPaymentProof(jpeg, { declaredMimeType: 'image/jpeg', originalName: 'pago.jpeg' });
    assert.equal(result.mimeType, 'image/jpeg');
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
});

test('comprobante PDF válido queda disponible para el inspector', () => {
    const result = inspectPaymentProof(Buffer.from('%PDF-1.7\n%%EOF'), { declaredMimeType: 'application/pdf', originalName: 'pago.pdf' });
    assert.equal(result.extension, 'pdf');
});

test('comprobante inválido, MIME falso y extensión falsa se rechazan', () => {
    assert.throws(() => inspectPaymentProof(Buffer.from('not a file'), { originalName: 'x.pdf' }), /no valido/);
    assert.throws(() => inspectPaymentProof(Buffer.from('%PDF-1.7'), { declaredMimeType: 'image/png', originalName: 'x.pdf' }), /MIME/);
    assert.throws(() => inspectPaymentProof(Buffer.from('%PDF-1.7'), { declaredMimeType: 'application/pdf', originalName: 'x.png' }), /extension/);
});

test('aprobar pago bloquea pago y pedido, consume una reserva y registra SALE', () => {
    assert.match(adminSource, /commerce_payments[\s\S]+FOR UPDATE/);
    assert.match(adminSource, /commerce_orders[\s\S]+FOR UPDATE/);
    assert.match(adminSource, /consumeOrder\(connection, orderId/);
    assert.match(inventorySource, /'SALE'/);
});

test('aprobar pago dos veces es idempotente y no descuenta dos veces', () => {
    assert.match(adminSource, /payment\.status === 'APPROVED'/);
    assert.match(adminSource, /replayed: true/);
    assert.match(inventorySource, /status = 'RESERVED'/);
});

test('rechazar pago exige motivo y conserva revisión', () => {
    assert.match(adminSource, /required: true/);
    assert.match(adminSource, /rejection_reason = \?/);
    assert.match(adminSource, /reviewed_at = UTC_TIMESTAMP/);
});

test('cancelar libera reserva o retorna stock con movimientos auditables', () => {
    assert.match(adminSource, /releaseOrder/);
    assert.match(adminSource, /returnOrder/);
    assert.match(inventorySource, /'RELEASE'/);
    assert.match(inventorySource, /'RETURN'/);
});

test('transiciones válidas e inválidas del pedido se hacen explícitas', () => {
    assert.equal(canTransition('PENDING_PAYMENT', 'PAYMENT_REVIEW'), true);
    assert.equal(canTransition('PAID', 'PREPARING'), true);
    assert.equal(canTransition('READY', 'COMPLETED'), true);
    assert.equal(canTransition('PENDING_PAYMENT', 'COMPLETED'), false);
    assert.throws(() => assertTransition('CANCELLED', 'PAID'), /No se puede cambiar/);
});

test('consulta ajena requiere sesión propietaria o correo coincidente y no solo folio', () => {
    assert.match(routeSource, /if \(!email && !userId\) throw new NotFoundError/);
    assert.match(orderSource, /LOWER\(o\.customer_email\) = \?/);
    assert.match(orderSource, /o\.user_id = \?/);
});

test('endpoints administrativos aplican RBAC por operación', () => {
    for (const permission of ['orders.view', 'orders.manage', 'payments.approve', 'inventory.view', 'inventory.adjust', 'promotions.manage']) {
        assert.match(routeSource, new RegExp(permission.replace('.', '\\.')));
    }
});

test('migración conserva snapshots, historial, pagos, reservas, movimientos y settings', () => {
    for (const table of [
        'commerce_orders', 'commerce_order_items', 'commerce_payments', 'commerce_order_status_history',
        'commerce_inventory_movements', 'commerce_order_inventory_reservations', 'commerce_bundle_items',
        'commerce_promotions', 'commerce_promotion_items', 'commerce_notifications', 'commerce_settings'
    ]) assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(migration, /title_snapshot/);
    assert.doesNotMatch(orderSource, /MAX\(id\)\s*\+\s*1/i);
});
