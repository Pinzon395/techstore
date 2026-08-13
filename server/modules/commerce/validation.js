'use strict';

const {
    ITEM_TYPES,
    ITEM_CONDITIONS,
    CATALOG_STATUSES,
    PUBLIC_CATALOG_STATUSES,
    CATEGORY_STATUSES,
    BADGE_STATUSES,
    ATTRIBUTE_STATUSES,
    ATTRIBUTE_DATA_TYPES,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
} = require('./constants');
const { ValidationError } = require('./errors');
const { normalizeMoney } = require('./money');
const { Money } = require('./money');

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG = /<[^>]*>/g;

// The database contract is canonical. Aliases only exist at the HTTP boundary
// so older admin clients can be upgraded without ever persisting mixed values.
const SOLD_DISPLAY_MODE_ALIASES = Object.freeze({
    KEEP_VISIBLE: 'KEEP_VISIBLE',
    VISIBLE: 'KEEP_VISIBLE',
    SHOW: 'KEEP_VISIBLE',
    HIDE: 'HIDE',
    HIDDEN: 'HIDE',
    REDIRECT: 'REDIRECT',
    REDIRECT_SIMILAR: 'REDIRECT'
});

function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function plainText(value, {
    field,
    max = 255,
    required = false,
    multiline = false,
    nullable = false
} = {}) {
    if (value === null && nullable) return null;
    const normalized = String(value ?? '')
        .replace(CONTROL_CHARACTERS, '')
        .replace(HTML_TAG, '')
        .replace(/\r\n?/g, '\n')
        .trim();
    const result = multiline ? normalized : normalized.replace(/\s+/g, ' ');
    if (required && !result) throw new ValidationError(`${field} es obligatorio`, { field });
    if (!result && nullable) return null;
    if (result.length > max) {
        throw new ValidationError(`${field} excede ${max} caracteres`, { field, max });
    }
    return result;
}

function slugify(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 200);
}

function parseSlug(value, { field = 'slug', required = true } = {}) {
    const slug = slugify(value);
    if (required && slug.length < 2) throw new ValidationError(`${field} no es valido`, { field });
    return slug || null;
}

function parseSku(value, { required = false } = {}) {
    if ((value === undefined || value === null || value === '') && !required) return null;
    const sku = String(value).trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(sku)) {
        throw new ValidationError('SKU no valido', { field: 'sku' });
    }
    return sku;
}

function productKindCode(value, { nullable = true } = {}) {
    if ((value === undefined || value === null || value === '') && nullable) return null;
    const code = String(value || '').trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_]{1,39}$/.test(code)) {
        throw new ValidationError('Tipo de producto no valido', { field: 'product_kind_code' });
    }
    return code;
}

function percentageValue(value, { field = 'tax_rate', fallback = 0 } = {}) {
    if (value === undefined || value === null || value === '') return fallback;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 100) {
        throw new ValidationError(`${field} debe estar entre 0 y 100`, { field, min: 0, max: 100 });
    }
    return number.toFixed(2);
}

function enumValue(value, allowed, { field, required = true, fallback } = {}) {
    if ((value === undefined || value === null || value === '') && !required) return fallback;
    const normalized = String(value ?? '').trim().toUpperCase();
    if (!allowed.includes(normalized)) {
        throw new ValidationError(`${field} no es valido`, { field, allowed });
    }
    return normalized;
}

function booleanValue(value, { field, fallback = false } = {}) {
    if (value === undefined) return fallback;
    if (value === true || value === 1 || value === '1' || value === 'true') return true;
    if (value === false || value === 0 || value === '0' || value === 'false') return false;
    throw new ValidationError(`${field} debe ser booleano`, { field });
}

function integerValue(value, {
    field,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    fallback,
    nullable = false
} = {}) {
    if ((value === undefined || value === null || value === '') && nullable) return null;
    if (value === undefined && fallback !== undefined) return fallback;
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
        throw new ValidationError(`${field} debe ser un entero entre ${min} y ${max}`, { field, min, max });
    }
    return parsed;
}

function positiveId(value, field = 'id') {
    return integerValue(value, { field, min: 1 });
}

function currencyValue(value, { fallback = 'MXN' } = {}) {
    const currency = String(value || fallback).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
        throw new ValidationError('Moneda no valida', { field: 'currency' });
    }
    return currency;
}

function soldDisplayModeValue(value, { fallback = 'KEEP_VISIBLE' } = {}) {
    const normalized = String(value || fallback).trim().toUpperCase().replace(/[\s-]+/g, '_');
    const canonical = SOLD_DISPLAY_MODE_ALIASES[normalized];
    if (!canonical) {
        throw new ValidationError('sold_display_mode no es valido', {
            field: 'sold_display_mode',
            allowed: ['KEEP_VISIBLE', 'HIDE', 'REDIRECT']
        });
    }
    return canonical;
}

function validateCatalogItem(payload, { partial = false, currentCurrency = 'MXN' } = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new ValidationError('El cuerpo debe ser un objeto JSON');
    }
    const output = {};
    const copy = (key, parser) => {
        if (!partial || hasOwn(payload, key)) output[key] = parser(payload[key]);
    };

    copy('name', (value) => plainText(value, { field: 'name', max: 180, required: true }));
    copy('sku', (value) => parseSku(value));
    if (!partial || hasOwn(payload, 'slug')) {
        output.slug = parseSlug(payload.slug || output.name || payload.name, { required: true });
    }
    copy('short_description', (value) => plainText(value, {
        field: 'short_description', max: 320, nullable: true
    }));
    copy('description', (value) => plainText(value, {
        field: 'description', max: 20000, multiline: true, nullable: true
    }));
    copy('item_type', (value) => enumValue(value, ITEM_TYPES, { field: 'item_type' }));
    copy('product_kind_code', (value) => productKindCode(value));
    copy('condition_code', (value) => enumValue(value, ITEM_CONDITIONS, {
        field: 'condition_code', required: false, fallback: 'NOT_APPLICABLE'
    }));
    copy('brand', (value) => plainText(value, { field: 'brand', max: 100, nullable: true }));
    copy('model', (value) => plainText(value, { field: 'model', max: 120, nullable: true }));
    copy('internal_code', (value) => parseSku(value));

    if (!partial || hasOwn(payload, 'currency')) output.currency = currencyValue(payload.currency);
    copy('tax_rate', (value) => percentageValue(value));
    const currency = output.currency || currencyValue(currentCurrency);
    copy('base_price', (value) => normalizeMoney(value, { field: 'base_price', currency }));
    copy('sale_price', (value) => normalizeMoney(value, {
        field: 'sale_price', currency, nullable: true
    }));
    copy('cost_reference', (value) => normalizeMoney(value, {
        field: 'cost_reference', currency, nullable: true
    }));

    copy('track_stock', (value) => booleanValue(value, {
        field: 'track_stock',
        fallback: ['PRODUCT', 'EQUIPMENT', 'HARDWARE'].includes(output.item_type)
    }));
    copy('stock_quantity', (value) => integerValue(value, {
        field: 'stock_quantity', min: 0, max: 2_000_000_000, fallback: 0
    }));
    copy('minimum_stock', (value) => integerValue(value, {
        field: 'minimum_stock', min: 0, max: 2_000_000_000, fallback: 0
    }));
    copy('physical_location', (value) => plainText(value, { field: 'physical_location', max: 120, nullable: true }));
    copy('supplier_name', (value) => plainText(value, { field: 'supplier_name', max: 180, nullable: true }));
    copy('featured', (value) => booleanValue(value, { field: 'featured' }));
    copy('allow_purchase', (value) => booleanValue(value, { field: 'allow_purchase', fallback: true }));
    copy('allow_quote', (value) => booleanValue(value, { field: 'allow_quote' }));
    copy('warranty_text', (value) => plainText(value, {
        field: 'warranty_text', max: 500, nullable: true
    }));
    copy('video_url', (value) => {
        if (value === null || value === undefined || value === '') return null;
        const url = plainText(value, { field: 'video_url', max: 512, required: true });
        if (!/^https:\/\/[a-z0-9.-]+(?:\/[^\s]*)?$/i.test(url)) {
            throw new ValidationError('video_url debe ser una URL HTTPS', { field: 'video_url' });
        }
        return url;
    });
    copy('seo_title', (value) => plainText(value, { field: 'seo_title', max: 180, nullable: true }));
    copy('seo_description', (value) => plainText(value, {
        field: 'seo_description', max: 320, nullable: true
    }));
    copy('seo_keywords', (value) => plainText(value, { field: 'seo_keywords', max: 500, nullable: true }));
    copy('seo_canonical_url', (value) => {
        if (value === null || value === undefined || value === '') return null;
        const url = plainText(value, { field: 'seo_canonical_url', max: 512, required: true });
        if (!/^https:\/\/[a-z0-9.-]+(?:\/[^\s]*)?$/i.test(url)) {
            throw new ValidationError('seo_canonical_url debe ser una URL HTTPS', {
                field: 'seo_canonical_url'
            });
        }
        return url;
    });
    copy('sold_display_mode', (value) => soldDisplayModeValue(value));

    if (!partial) output.status = 'DRAFT';
    if (hasOwn(payload, 'status') && String(payload.status).toUpperCase() !== 'DRAFT') {
        throw new ValidationError('Usa las acciones publicar o archivar para cambiar el estado', { field: 'status' });
    }
    return output;
}

function validateCategory(payload, { partial = false } = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new ValidationError('El cuerpo debe ser un objeto JSON');
    }
    const output = {};
    const copy = (key, parser) => {
        if (!partial || hasOwn(payload, key)) output[key] = parser(payload[key]);
    };
    copy('name', (value) => plainText(value, { field: 'name', max: 100, required: true }));
    if (!partial || hasOwn(payload, 'slug') || hasOwn(payload, 'name')) {
        output.slug = parseSlug(payload.slug || payload.name, { required: true });
    }
    copy('parent_id', (value) => integerValue(value, { field: 'parent_id', min: 1, nullable: true }));
    copy('description', (value) => plainText(value, { field: 'description', max: 1000, nullable: true }));
    copy('image_url', (value) => plainText(value, { field: 'image_url', max: 512, nullable: true }));
    copy('icon', (value) => plainText(value, { field: 'icon', max: 80, nullable: true }));
    copy('sort_order', (value) => integerValue(value, { field: 'sort_order', min: -32768, max: 32767, fallback: 0 }));
    copy('status', (value) => enumValue(value, CATEGORY_STATUSES, {
        field: 'status', required: false, fallback: 'ACTIVE'
    }));
    return output;
}

function validateBadge(payload, { partial = false } = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new ValidationError('El cuerpo debe ser un objeto JSON');
    }
    const output = {};
    const copy = (key, parser) => {
        if (!partial || hasOwn(payload, key)) output[key] = parser(payload[key]);
    };
    const badgeKeyInput = hasOwn(payload, 'badge_key') ? payload.badge_key : payload.key;
    if (!partial || hasOwn(payload, 'badge_key') || hasOwn(payload, 'key')) {
        output.badge_key = (() => {
            const value = badgeKeyInput;
        const key = String(value ?? '').trim().toUpperCase();
        if (!/^[A-Z0-9][A-Z0-9_]{1,63}$/.test(key)) {
            throw new ValidationError('key no es valido', { field: 'key' });
        }
        return key;
        })();
    }
    copy('label', (value) => plainText(value, { field: 'label', max: 100, required: true }));
    copy('description', (value) => plainText(value, { field: 'description', max: 500, nullable: true }));
    if (!partial || hasOwn(payload, 'style_variant') || hasOwn(payload, 'style')) {
        const style = plainText(payload.style_variant ?? payload.style ?? 'INFO', {
            field: 'style_variant', max: 64, nullable: true
        });
        output.style_variant = String(style || 'INFO').toUpperCase();
        if (!['INFO', 'SUCCESS', 'WARNING', 'DANGER', 'ACCENT', 'NEUTRAL'].includes(output.style_variant)) {
            throw new ValidationError('style_variant no es valido', { field: 'style_variant' });
        }
    }
    copy('icon', (value) => plainText(value, { field: 'icon', max: 80, nullable: true }));
    copy('sort_order', (value) => integerValue(value, { field: 'sort_order', min: -32768, max: 32767, fallback: 0 }));
    copy('status', (value) => enumValue(value, BADGE_STATUSES, {
        field: 'status', required: false, fallback: 'ACTIVE'
    }));
    return output;
}

function validateAttributeDefinition(payload, { partial = false } = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new ValidationError('El cuerpo debe ser un objeto JSON');
    }
    const output = {};
    const copy = (key, parser) => {
        if (!partial || hasOwn(payload, key)) output[key] = parser(payload[key]);
    };
    const attributeKeyInput = hasOwn(payload, 'attribute_key') ? payload.attribute_key : payload.key;
    if (!partial || hasOwn(payload, 'attribute_key') || hasOwn(payload, 'key')) {
        output.attribute_key = (() => {
            const value = attributeKeyInput;
        const key = String(value ?? '').trim().toLowerCase();
        if (!/^[a-z][a-z0-9_]{1,63}$/.test(key)) {
            throw new ValidationError('key no es valido', { field: 'key' });
        }
        return key;
        })();
    }
    copy('label', (value) => plainText(value, { field: 'label', max: 100, required: true }));
    copy('description', (value) => plainText(value, { field: 'description', max: 500, nullable: true }));
    copy('data_type', (value) => enumValue(value, ATTRIBUTE_DATA_TYPES, { field: 'data_type' }));
    copy('unit', (value) => plainText(value, { field: 'unit', max: 32, nullable: true }));
    if (!partial || hasOwn(payload, 'options')) {
        if (payload.options === undefined || payload.options === null) output.options_json = null;
        else if (!Array.isArray(payload.options)) {
            throw new ValidationError('options debe ser una lista', { field: 'options' });
        } else {
            output.options_json = payload.options.map((option, index) => plainText(option, {
                field: `options[${index}]`, max: 100, required: true
            }));
        }
    }
    copy('filterable', (value) => booleanValue(value, { field: 'filterable' }));
    copy('searchable', (value) => booleanValue(value, { field: 'searchable' }));
    copy('required', (value) => booleanValue(value, { field: 'required' }));
    copy('sort_order', (value) => integerValue(value, { field: 'sort_order', min: -32768, max: 32767, fallback: 0 }));
    copy('status', (value) => enumValue(value, ATTRIBUTE_STATUSES, {
        field: 'status', required: false, fallback: 'ACTIVE'
    }));
    return output;
}

function validateIdList(value, field) {
    if (!Array.isArray(value)) throw new ValidationError(`${field} debe ser una lista`, { field });
    return [...new Set(value.map((entry) => positiveId(entry, field)))];
}

function validateAttributeValues(value) {
    if (!Array.isArray(value)) throw new ValidationError('attributes debe ser una lista', { field: 'attributes' });
    const seen = new Set();
    return value.map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new ValidationError('Atributo no valido', { field: `attributes[${index}]` });
        }
        const definitionId = positiveId(entry.definition_id, `attributes[${index}].definition_id`);
        if (seen.has(definitionId)) throw new ValidationError('Definicion de atributo duplicada', { definition_id: definitionId });
        seen.add(definitionId);
        return {
            definition_id: definitionId,
            value: entry.value,
            sort_order: integerValue(entry.sort_order, {
                field: `attributes[${index}].sort_order`, min: -32768, max: 32767, fallback: index
            })
        };
    });
}

function validatePagination(query = {}) {
    const page = integerValue(query.page, { field: 'page', min: 1, max: 1_000_000, fallback: 1 });
    const pageSize = integerValue(query.pageSize ?? query.limit, {
        field: 'pageSize', min: 1, max: MAX_PAGE_SIZE, fallback: DEFAULT_PAGE_SIZE
    });
    return { page, pageSize, offset: (page - 1) * pageSize };
}

function validatePublicFilters(query = {}) {
    const pagination = validatePagination(query);
    const output = {
        ...pagination,
        q: plainText(query.q, { field: 'q', max: 120, nullable: true }),
        itemType: query.type ? enumValue(query.type, ITEM_TYPES, { field: 'type' }) : null,
        status: query.status ? enumValue(query.status, PUBLIC_CATALOG_STATUSES, { field: 'status' }) : null,
        conditionCode: query.condition ? enumValue(query.condition, ITEM_CONDITIONS, { field: 'condition' }) : null,
        brand: plainText(query.brand, { field: 'brand', max: 100, nullable: true }),
        category: query.category ? parseSlug(query.category, { field: 'category' }) : null,
        availability: query.availability ? String(query.availability).toUpperCase() : null,
        featured: query.featured === undefined ? null : booleanValue(query.featured, { field: 'featured' }),
        minPrice: query.minPrice === undefined ? null : normalizeMoney(query.minPrice, { field: 'minPrice' }),
        maxPrice: query.maxPrice === undefined ? null : normalizeMoney(query.maxPrice, { field: 'maxPrice' }),
        sort: String(query.sort || 'featured').toLowerCase()
    };
    if (!['AVAILABLE', 'UNAVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'RESERVED', 'SOLD'].includes(output.availability)
        && output.availability !== null) {
        throw new ValidationError('availability no es valido', { field: 'availability' });
    }
    if (output.sort === 'name_asc') output.sort = 'name';
    if (!['featured', 'newest', 'price_asc', 'price_desc', 'name'].includes(output.sort)) {
        throw new ValidationError('sort no es valido', { field: 'sort' });
    }
    if (output.minPrice && output.maxPrice
        && Money.fromDecimal(output.minPrice).compare(Money.fromDecimal(output.maxPrice)) > 0) {
        throw new ValidationError('minPrice no puede superar maxPrice');
    }
    return output;
}

function validateAdminFilters(query = {}) {
    const pagination = validatePagination(query);
    const output = {
        ...pagination,
        q: plainText(query.q, { field: 'q', max: 120, nullable: true }),
        itemType: query.type ? enumValue(query.type, ITEM_TYPES, { field: 'type' }) : null,
        status: query.status ? enumValue(query.status, CATALOG_STATUSES, { field: 'status' }) : null,
        conditionCode: query.condition
            ? enumValue(query.condition, ITEM_CONDITIONS, { field: 'condition' })
            : null,
        brand: plainText(query.brand, { field: 'brand', max: 100, nullable: true }),
        productKind: query.productKind ? productKindCode(query.productKind, { nullable: false }) : null,
        availability: query.availability ? String(query.availability).trim().toUpperCase() : null,
        minPrice: query.minPrice === undefined || query.minPrice === '' ? null : normalizeMoney(query.minPrice, { field: 'minPrice' }),
        maxPrice: query.maxPrice === undefined || query.maxPrice === '' ? null : normalizeMoney(query.maxPrice, { field: 'maxPrice' }),
        featured: query.featured === undefined ? null : booleanValue(query.featured, { field: 'featured' }),
        category: query.category ? parseSlug(query.category, { field: 'category' }) : null,
        sort: ['newest', 'oldest', 'name', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc'].includes(String(query.sort || '').toLowerCase())
            ? String(query.sort).toLowerCase()
            : 'newest'
    };
    if (output.availability !== null
        && !['AVAILABLE', 'UNAVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'RESERVED', 'SOLD'].includes(output.availability)) {
        throw new ValidationError('availability no es valido', { field: 'availability' });
    }
    if (output.minPrice && output.maxPrice
        && Money.fromDecimal(output.minPrice).compare(Money.fromDecimal(output.maxPrice)) > 0) {
        throw new ValidationError('minPrice no puede superar maxPrice');
    }
    return output;
}

module.exports = {
    plainText,
    slugify,
    parseSlug,
    parseSku,
    productKindCode,
    percentageValue,
    enumValue,
    booleanValue,
    integerValue,
    positiveId,
    currencyValue,
    soldDisplayModeValue,
    SOLD_DISPLAY_MODE_ALIASES,
    validateCatalogItem,
    validateCategory,
    validateBadge,
    validateAttributeDefinition,
    validateIdList,
    validateAttributeValues,
    validatePagination,
    validatePublicFilters,
    validateAdminFilters
};
