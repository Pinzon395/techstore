'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    validateCatalogItem,
    validatePublicFilters,
    validateAdminFilters,
    validateBadge,
    validateAttributeDefinition,
    validateAttributeValues,
    slugify
} = require('../validation');
const { ValidationError } = require('../errors');

test('validateCatalogItem crea borrador, normaliza slug y elimina HTML', () => {
    const item = validateCatalogItem({
        name: '  ASUS <b>TUF</b> Gaming  ',
        item_type: 'equipment',
        condition_code: 'used',
        base_price: '14000',
        sale_price: '11999.00',
        short_description: '<script>alert(1)</script> Equipo listo',
        description: 'Equipo\r\nen buen estado',
        track_stock: true,
        stock_quantity: 1
    });
    assert.equal(item.name, 'ASUS TUF Gaming');
    assert.equal(item.slug, 'asus-tuf-gaming');
    assert.equal(item.status, 'DRAFT');
    assert.equal(item.base_price, '14000.00');
    assert.equal(item.sale_price, '11999.00');
    assert.equal(item.item_type, 'EQUIPMENT');
    assert.equal(item.short_description.includes('<'), false);
});

test('validateCatalogItem solo acepta estados vendidos visibles soportados por DB', () => {
    const base = {
        name: 'Equipo', item_type: 'EQUIPMENT', base_price: '1.00'
    };
    assert.equal(validateCatalogItem({ ...base, sold_display_mode: 'redirect' }).sold_display_mode, 'REDIRECT');
    assert.equal(validateCatalogItem({ ...base, sold_display_mode: 'visible' }).sold_display_mode, 'KEEP_VISIBLE');
    assert.equal(validateCatalogItem({ ...base, sold_display_mode: 'hidden' }).sold_display_mode, 'HIDE');
    assert.equal(validateCatalogItem({ ...base, sold_display_mode: 'redirect-similar' }).sold_display_mode, 'REDIRECT');
    assert.throws(() => validateCatalogItem({ ...base, sold_display_mode: 'remove' }), ValidationError);
});

test('PATCH valida currency explicita y usa la actual solo como contexto de importes', () => {
    const explicit = validateCatalogItem({
        currency: 'usd', base_price: '120.00', sale_price: '99.00'
    }, { partial: true, currentCurrency: 'MXN' });
    assert.equal(explicit.currency, 'USD');
    assert.equal(explicit.base_price, '120.00');

    const inherited = validateCatalogItem({ base_price: '120.00' }, {
        partial: true,
        currentCurrency: 'USD'
    });
    assert.equal(Object.hasOwn(inherited, 'currency'), false);
    assert.equal(inherited.base_price, '120.00');
    assert.throws(() => validateCatalogItem({ currency: 'US' }, {
        partial: true,
        currentCurrency: 'MXN'
    }), ValidationError);
});

test('filtros publicos aceptan aliases y limitan paginacion', () => {
    const filters = validatePublicFilters({
        page: '2', pageSize: '50', availability: 'low_stock', sort: 'name_asc'
    });
    assert.equal(filters.page, 2);
    assert.equal(filters.offset, 50);
    assert.equal(filters.availability, 'LOW_STOCK');
    assert.equal(filters.sort, 'name');
    assert.throws(() => validatePublicFilters({ pageSize: 101 }), ValidationError);
});

test('badges y atributos mapean los nombres canonicos de la migracion', () => {
    const badge = validateBadge({ key: 'mega_oferta', label: 'Mega oferta', style: 'ACCENT' });
    assert.equal(badge.badge_key, 'MEGA_OFERTA');
    assert.equal(badge.style_variant, 'ACCENT');
    assert.equal(Object.hasOwn(badge, 'key'), false);

    const definition = validateAttributeDefinition({
        key: 'ram_gb', label: 'RAM', data_type: 'integer', options: ['8', '16']
    });
    assert.equal(definition.attribute_key, 'ram_gb');
    assert.equal(definition.data_type, 'INTEGER');
    assert.deepEqual(definition.options_json, ['8', '16']);
});

test('validateAttributeValues evita definiciones duplicadas', () => {
    assert.throws(() => validateAttributeValues([
        { definition_id: 1, value: 'a' },
        { definition_id: 1, value: 'b' }
    ]), ValidationError);
});

test('slugify conserva URLs locales deterministas', () => {
    assert.equal(slugify('Mantenimiento Completo en Cancún'), 'mantenimiento-completo-en-cancun');
});

test('catalogo administrativo valida subtipo, IVA y filtros avanzados', () => {
    const item = validateCatalogItem({
        name: 'ThinkPad T14', item_type: 'EQUIPMENT', product_kind_code: 'laptop',
        internal_code: 'alm-001', base_price: '20000', tax_rate: '16',
        physical_location: 'Anaquel A2'
    });
    assert.equal(item.product_kind_code, 'LAPTOP');
    assert.equal(item.internal_code, 'ALM-001');
    assert.equal(item.tax_rate, '16.00');
    assert.throws(() => validateCatalogItem({ name: 'Equipo', item_type: 'EQUIPMENT', base_price: '1', tax_rate: '101' }), ValidationError);
    const filters = validateAdminFilters({ productKind: 'gpu', availability: 'low_stock', minPrice: '100', maxPrice: '500', sort: 'stock_desc' });
    assert.equal(filters.productKind, 'GPU');
    assert.equal(filters.availability, 'LOW_STOCK');
    assert.equal(filters.sort, 'stock_desc');
    assert.throws(() => validateAdminFilters({ minPrice: '501', maxPrice: '500' }), ValidationError);
});
