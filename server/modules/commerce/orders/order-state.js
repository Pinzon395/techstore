'use strict';

const { InvalidStateError } = require('../errors');

const ORDER_STATUSES = Object.freeze([
    'PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PAID', 'PREPARING',
    'READY', 'COMPLETED', 'CANCELLED'
]);

const TRANSITIONS = Object.freeze({
    PENDING_PAYMENT: Object.freeze(['PAYMENT_REVIEW', 'CANCELLED']),
    PAYMENT_REVIEW: Object.freeze(['PENDING_PAYMENT', 'PAID', 'CANCELLED']),
    PAID: Object.freeze(['PREPARING', 'CANCELLED']),
    PREPARING: Object.freeze(['READY', 'CANCELLED']),
    READY: Object.freeze(['COMPLETED', 'CANCELLED']),
    COMPLETED: Object.freeze([]),
    CANCELLED: Object.freeze([])
});

function canTransition(from, to) {
    return ORDER_STATUSES.includes(from) && TRANSITIONS[from].includes(to);
}

function assertTransition(from, to) {
    if (!canTransition(from, to)) {
        throw new InvalidStateError(`No se puede cambiar el pedido de ${from} a ${to}`, {
            from,
            to,
            allowed: TRANSITIONS[from] || []
        });
    }
}

module.exports = { ORDER_STATUSES, TRANSITIONS, canTransition, assertTransition };

