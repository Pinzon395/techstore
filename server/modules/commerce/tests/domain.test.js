'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    CatalogService,
    assertPriceRelationship,
    normalizeTypedAttribute
} = require('../catalog/catalog.service');
const { mapItem, attributeNumber } = require('../catalog/catalog.repository');
const { ValidationError } = require('../errors');

test('precio promocional no puede superar precio base', () => {
    assert.doesNotThrow(() => assertPriceRelationship({
        base_price: '8500.00', sale_price: '6999.00', currency: 'MXN'
    }));
    assert.throws(() => assertPriceRelationship({
        base_price: '8500.00', sale_price: '9000.00', currency: 'MXN'
    }), ValidationError);
});

test('atributos INTEGER y DECIMAL usan value_number con validacion diferenciada', () => {
    const integer = normalizeTypedAttribute(
        { id: 1, attribute_key: 'ram_gb', label: 'RAM', data_type: 'INTEGER' },
        { value: '16', sort_order: 0 }
    );
    assert.equal(integer.value_number, '16');
    assert.throws(() => normalizeTypedAttribute(
        { id: 1, attribute_key: 'ram_gb', label: 'RAM', data_type: 'INTEGER' },
        { value: '16.5', sort_order: 0 }
    ), ValidationError);

    const decimal = normalizeTypedAttribute(
        { id: 2, attribute_key: 'screen_inches', label: 'Pantalla', data_type: 'DECIMAL' },
        { value: '15.6', sort_order: 1 }
    );
    assert.equal(decimal.value_number, '15.6');
});

test('value_number DECIMAL(20,6) leido de MariaDB se puede reenviar al guardar', () => {
    assert.equal(attributeNumber('4.000000'), '4');
    assert.equal(attributeNumber('15.600000'), '15.6');
    assert.equal(attributeNumber('-0.500000'), '-0.5');
    assert.equal(attributeNumber('120'), '120');
    assert.equal(attributeNumber(null), null);
    const roundTrip = normalizeTypedAttribute(
        { id: 3, attribute_key: 'cores', label: 'Nucleos', data_type: 'INTEGER' },
        { value: attributeNumber('4.000000'), sort_order: 0 }
    );
    assert.equal(roundTrip.value_number, '4');
});

test('DTO publico nunca incluye costo interno', () => {
    const dto = mapItem({
        id: 1,
        public_id: '00000000-0000-4000-8000-000000000000',
        name: 'Equipo', slug: 'equipo', item_type: 'EQUIPMENT',
        condition_code: 'USED', status: 'ACTIVE', base_price: '8500.00',
        sale_price: '6999.00', cost_reference: '5000.00', currency: 'MXN',
        stock_quantity: 1, reserved_quantity: 0, minimum_stock: 0,
        track_stock: 1, featured: 0, allow_purchase: 1, allow_quote: 0,
        version: 1
    }, { publicView: true });
    assert.equal(Object.hasOwn(dto, 'cost_reference'), false);
    assert.equal(dto.pricing.effective_price, '6999.00');
});

test('PATCH conserva currency ausente pero aplica una currency explicita y canonicaliza sold mode', async () => {
    const connection = {
        async query() {},
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {}
    };
    const captured = [];
    let reads = 0;
    const before = {
        id: 7,
        version: 3,
        status: 'DRAFT',
        pricing: { base_price: '14000.00', sale_price: '11999.00', currency: 'MXN' },
        categories: [],
        badges: [],
        attributes: []
    };
    const repository = {
        async getAdminById() {
            reads += 1;
            return reads === 1
                ? before
                : {
                    ...before,
                    version: 4,
                    sold_display_mode: 'KEEP_VISIBLE',
                    pricing: { ...before.pricing, currency: 'USD' }
                };
        },
        async getCategoriesByIds() { return []; },
        async getBadgesByIds() { return []; },
        async updateItem(_connection, id, changes, version) {
            captured.push({ id, changes, version });
            return true;
        }
    };
    const service = new CatalogService({
        pool: { async getConnection() { return connection; } },
        repository,
        audit: { async write() {} }
    });

    const updated = await service.updateItem(7, {
        version: 3,
        currency: 'usd',
        sold_display_mode: 'visible'
    }, { userId: '00000000-0000-4000-8000-000000000001' });

    assert.equal(captured.length, 1);
    assert.equal(captured[0].changes.currency, 'USD');
    assert.equal(captured[0].changes.sold_display_mode, 'KEEP_VISIBLE');
    assert.equal(captured[0].version, 3);
    assert.equal(updated.pricing.currency, 'USD');

    reads = 0;
    captured.length = 0;
    await service.updateItem(7, {
        version: 3,
        sold_display_mode: 'hidden'
    }, { userId: '00000000-0000-4000-8000-000000000001' });
    assert.equal(Object.hasOwn(captured[0].changes, 'currency'), false);
    assert.equal(captured[0].changes.sold_display_mode, 'HIDE');
});
