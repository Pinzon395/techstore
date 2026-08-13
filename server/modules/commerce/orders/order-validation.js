'use strict';

const { plainText, enumValue, integerValue, positiveId } = require('../validation');
const { ValidationError } = require('../errors');
const { ORDER_STATUSES } = require('./order-state');

const PAYMENT_METHODS = Object.freeze(['BANK_TRANSFER', 'CASH', 'TERMINAL', 'STRIPE', 'PAYPAL', 'MERCADO_PAGO']);
const DELIVERY_METHODS = Object.freeze(['PICKUP', 'LOCAL_DELIVERY', 'SERVICE_ON_SITE']);
const PAYMENT_STATUSES = Object.freeze(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED']);
const PROMOTION_TYPES = Object.freeze(['PERCENT', 'FIXED', 'SALE_PRICE', 'BUNDLE_PRICE']);
const PROMOTION_SCOPES = Object.freeze(['ITEM', 'CATEGORY', 'BRAND']);
const PROMOTION_STATUSES = Object.freeze(['DRAFT', 'ACTIVE', 'SCHEDULED', 'ENDED']);
const INVENTORY_REASONS = Object.freeze(['SALE', 'RESERVE', 'RELEASE', 'ADJUSTMENT', 'RETURN']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,79}$/;

function email(value, field = 'customer.email') {
    const normalized = plainText(value, { field, max: 190, required: true }).toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) throw new ValidationError('Correo no valido', { field });
    return normalized;
}

function validateItems(value) {
    if (!Array.isArray(value) || value.length < 1 || value.length > 40) {
        throw new ValidationError('items debe contener entre 1 y 40 productos', { field: 'items' });
    }
    const merged = new Map();
    value.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new ValidationError('Item no valido', { field: `items[${index}]` });
        }
        const id = positiveId(entry.catalog_item_id ?? entry.id, `items[${index}].catalog_item_id`);
        const quantity = integerValue(entry.quantity, {
            field: `items[${index}].quantity`, min: 1, max: 100, fallback: 1
        });
        const next = (merged.get(id) || 0) + quantity;
        if (next > 100) throw new ValidationError('Cantidad maxima excedida', { catalog_item_id: id });
        merged.set(id, next);
    });
    return [...merged.entries()].map(([catalog_item_id, quantity]) => ({ catalog_item_id, quantity }));
}

function validateCreateOrder(payload, idempotencyHeader) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new ValidationError('El cuerpo debe ser un objeto JSON');
    }
    const customer = payload.customer || {};
    const idempotencyKey = String(idempotencyHeader || payload.idempotency_key || '').trim();
    if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
        throw new ValidationError('X-Idempotency-Key debe tener entre 16 y 80 caracteres seguros', {
            field: 'idempotency_key'
        });
    }
    const couponCodes = Array.isArray(payload.coupon_codes)
        ? [...new Set(payload.coupon_codes.map((value, index) => {
            const code = String(value || '').trim().toUpperCase();
            if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(code)) {
                throw new ValidationError('Codigo de cupon no valido', { field: `coupon_codes[${index}]` });
            }
            return code;
        }))]
        : [];
    if (couponCodes.length > 5) throw new ValidationError('Solo se permiten hasta 5 cupones por pedido');
    return {
        items: validateItems(payload.items),
        customer: {
            name: plainText(customer.name, { field: 'customer.name', max: 120, required: true }),
            phone: plainText(customer.phone, { field: 'customer.phone', max: 24, required: true }),
            email: email(customer.email)
        },
        deliveryMethod: enumValue(payload.delivery_method, DELIVERY_METHODS, {
            field: 'delivery_method', required: false, fallback: 'PICKUP'
        }),
        deliveryNote: plainText(payload.delivery_note, {
            field: 'delivery_note', max: 1000, multiline: true, nullable: true
        }),
        paymentMethod: enumValue(payload.payment_method, PAYMENT_METHODS, { field: 'payment_method' }),
        idempotencyKey,
        couponCodes
    };
}

function validateFolio(value) {
    const folio = String(value || '').trim().toUpperCase();
    if (!/^PIX-\d{4}-\d{6}$/.test(folio)) throw new ValidationError('Folio no valido', { field: 'folio' });
    return folio;
}

function validateLookupEmail(value) {
    return email(value, 'email');
}

function validateStatus(value) {
    return enumValue(value, ORDER_STATUSES, { field: 'status' });
}

function validateIdempotencyKey(value) {
    const key = String(value || '').trim();
    if (!IDEMPOTENCY_PATTERN.test(key)) throw new ValidationError('Idempotency key no valida');
    return key;
}

module.exports = {
    PAYMENT_METHODS,
    DELIVERY_METHODS,
    PAYMENT_STATUSES,
    PROMOTION_TYPES,
    PROMOTION_SCOPES,
    PROMOTION_STATUSES,
    INVENTORY_REASONS,
    validateCreateOrder,
    validateFolio,
    validateLookupEmail,
    validateStatus,
    validateIdempotencyKey,
    email
};
