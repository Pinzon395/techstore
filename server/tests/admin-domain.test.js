'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    deriveNextAction,
    mapRepairWithDerived,
    generateUniqueTicketCode
} = require('../database');

const { inferErrorCode } = require('../middlewares/error.middleware');
const { maskEmail, maskPhone, structuredLog } = require('../utils/logger');

test('Admin Domain: deriveNextAction assigns appropriate contextual action for each ticket state', () => {
    assert.equal(deriveNextAction({ status: 'new' }), 'Confirmar recepción y disponibilidad de cita');
    assert.equal(deriveNextAction({ status: 'received' }), 'Realizar diagnóstico técnico inicial');
    assert.equal(deriveNextAction({ status: 'diagnosing', estimated_cost: null }), 'Registrar costo y diagnóstico');
    assert.equal(deriveNextAction({ status: 'diagnosing', estimated_cost: '1200.00' }), 'Enviar cotización al cliente');
    assert.equal(deriveNextAction({ status: 'contacted' }), 'Esperar respuesta o coordinar con cliente');
    assert.equal(deriveNextAction({ status: 'quoted' }), 'Esperar aprobación de presupuesto');
    assert.equal(deriveNextAction({ status: 'approved' }), 'Iniciar reparación en taller');
    assert.equal(deriveNextAction({ status: 'in_progress' }), 'Realizar pruebas de estabilidad');
    assert.equal(deriveNextAction({ status: 'waiting_parts' }), 'Monitorear llegada de refacciones');
    assert.equal(deriveNextAction({ status: 'ready' }), 'Contactar cliente para entrega de equipo');
    assert.equal(deriveNextAction({ status: 'delivered' }), 'Garantía activa');
    assert.equal(deriveNextAction({ status: 'cancelled' }), 'Ticket cancelado');
    assert.equal(deriveNextAction({ status: 'eliminado' }), 'Ticket archivado');
    assert.equal(deriveNextAction(null), 'Revisar expediente');
});

test('Admin Domain: mapRepairWithDerived enriches repair object with next_action', () => {
    const raw = { id: 42, ticket_code: 'ABC123', status: 'ready' };
    const mapped = mapRepairWithDerived(raw);
    assert.equal(mapped.id, 42);
    assert.equal(mapped.ticket_code, 'ABC123');
    assert.equal(mapped.next_action, 'Contactar cliente para entrega de equipo');
    assert.equal(mapRepairWithDerived(null), null);
});

test('Admin Domain: generateUniqueTicketCode generates uppercase 6-char alphanumeric folio', async () => {
    const mockConn = {
        execute: async (_sql, _params) => [[]]
    };
    const code = await generateUniqueTicketCode(mockConn);
    assert.ok(code.length >= 6);
    assert.match(code, /^[A-Z0-9]+$/);
});

test('Admin Domain: generateUniqueTicketCode retries on collision', async () => {
    let callCount = 0;
    const mockConn = {
        execute: async (_sql, _params) => {
            callCount++;
            if (callCount === 1) return [[{ id: 99 }]];
            return [[]];
        }
    };
    const code = await generateUniqueTicketCode(mockConn);
    assert.ok(callCount >= 2);
    assert.match(code, /^[A-Z0-9]+$/);
});

test('Error Taxonomy: inferErrorCode resolves correct standard taxonomy', () => {
    assert.equal(inferErrorCode(400), 'VALIDATION_ERROR');
    assert.equal(inferErrorCode(401), 'UNAUTHENTICATED');
    assert.equal(inferErrorCode(403), 'UNAUTHORIZED');
    assert.equal(inferErrorCode(404), 'NOT_FOUND');
    assert.equal(inferErrorCode(409), 'CONFLICT');
    assert.equal(inferErrorCode(422), 'UNPROCESSABLE_ENTITY');
    assert.equal(inferErrorCode(429), 'RATE_LIMIT_EXCEEDED');
    assert.equal(inferErrorCode(500), 'INTERNAL_ERROR');
    assert.equal(inferErrorCode(503), 'INTERNAL_ERROR');
    assert.equal(inferErrorCode(400, { code: 'CUSTOM_CODE' }), 'CUSTOM_CODE');
});

test('PII Sanitization: maskEmail masks username correctly preserving domain', () => {
    assert.equal(maskEmail('juan.perez@gmail.com'), 'j***z@gmail.com');
    assert.equal(maskEmail('al@empresa.mx'), 'a***@empresa.mx');
    assert.equal(maskEmail('pixonpc@gmail.com'), 'p***c@gmail.com');
    assert.equal(maskEmail(''), '');
    assert.equal(maskEmail(null), '');
    assert.equal(maskEmail('invalid-string'), '***');
});

test('PII Sanitization: maskPhone masks leading digits preserving last 4', () => {
    assert.equal(maskPhone('9986690777'), '***0777');
    assert.equal(maskPhone('+52 998 123 4567'), '***4567');
    assert.equal(maskPhone('123'), '***');
    assert.equal(maskPhone(''), '');
    assert.equal(maskPhone(null), '');
});

test('Structured Logger: structuredLog builds valid timestamped JSON entry with correlation_id', () => {
    const entry = structuredLog({
        level: 'info',
        event: 'ticket_action',
        entity_type: 'repair',
        entity_id: 123,
        correlation_id: 'test-uuid-corr-1234',
        provider: 'internal',
        status: 'ok',
        message: 'Ticket actualizado con éxito'
    });

    assert.equal(entry.level, 'info');
    assert.equal(entry.event, 'ticket_action');
    assert.equal(entry.entity_type, 'repair');
    assert.equal(entry.entity_id, '123');
    assert.equal(entry.correlation_id, 'test-uuid-corr-1234');
    assert.ok(entry.timestamp);
});
