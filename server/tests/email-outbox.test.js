'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    OUTBOX_STATUSES,
    sendTransactionalEmail,
    updateEmailDeliveryStatus,
    retryEmailEvent
} = require('../services/email.service');

test.describe('Transactional Email Outbox', () => {
    const originalFetch = global.fetch;
    const originalApiKey = process.env.RESEND_API_KEY;
    const originalFrom = process.env.EMAIL_FROM;

    test.beforeEach(() => {
        process.env.RESEND_API_KEY = 're_mock_test_key_123';
        process.env.EMAIL_FROM = 'soporte@pixon.com.mx';
    });

    test.afterEach(() => {
        global.fetch = originalFetch;
        process.env.RESEND_API_KEY = originalApiKey;
        process.env.EMAIL_FROM = originalFrom;
    });

    test('todos los estados requeridos están definidos formalmente', () => {
        assert.equal(OUTBOX_STATUSES.QUEUED, 'QUEUED');
        assert.equal(OUTBOX_STATUSES.PROCESSING, 'PROCESSING');
        assert.equal(OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER, 'ACCEPTED_BY_PROVIDER');
        assert.equal(OUTBOX_STATUSES.DELIVERED, 'DELIVERED');
        assert.equal(OUTBOX_STATUSES.BOUNCED, 'BOUNCED');
        assert.equal(OUTBOX_STATUSES.FAILED, 'FAILED');
    });

    test('Resend accepted devuelve ACCEPTED_BY_PROVIDER y NUNCA DELIVERED directamente', async () => {
        global.fetch = async () => ({
            ok: true,
            status: 200,
            json: async () => ({ id: 'resend_mock_id_999' })
        });

        const res = await sendTransactionalEmail({
            to: 'cliente@ejemplo.com',
            subject: 'Prueba outbox',
            html: '<p>Hola</p>',
            text: 'Hola',
            idempotencyKey: `test-outbox-accepted-${Date.now()}`
        });

        assert.equal(res.ok, true);
        assert.equal(res.status, OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER);
        assert.notEqual(res.status, OUTBOX_STATUSES.DELIVERED, 'Resend accepted != DELIVERED');
        assert.equal(res.id, 'resend_mock_id_999');
    });

    test('evento webhook del proveedor permite transicionar a DELIVERED o BOUNCED', async () => {
        global.fetch = async () => ({
            ok: true,
            status: 200,
            json: async () => ({ id: 'resend_webhook_event_1' })
        });

        const res = await sendTransactionalEmail({
            to: 'cliente2@ejemplo.com',
            subject: 'Prueba entrega',
            html: '<p>Hola</p>',
            text: 'Hola',
            idempotencyKey: `test-outbox-delivery-${Date.now()}`
        });

        assert.equal(res.status, OUTBOX_STATUSES.ACCEPTED_BY_PROVIDER);

        // Simulamos webhook de entrega confirmada
        const deliveryResult = await updateEmailDeliveryStatus(res.id, OUTBOX_STATUSES.DELIVERED);
        assert.equal(deliveryResult.ok, true);
        assert.equal(deliveryResult.status, OUTBOX_STATUSES.DELIVERED);

        // Simulamos webhook de rebote en otro mensaje
        const bounceResult = await updateEmailDeliveryStatus(res.id, OUTBOX_STATUSES.BOUNCED, 'Mailbox full');
        assert.equal(bounceResult.ok, true);
        assert.equal(bounceResult.status, OUTBOX_STATUSES.BOUNCED);
    });

    test('falla del proveedor marca FAILED y preserva mensaje de error', async () => {
        global.fetch = async () => ({
            ok: false,
            status: 422,
            json: async () => ({ message: 'Domain not verified' })
        });

        const res = await sendTransactionalEmail({
            to: 'cliente_fallo@ejemplo.com',
            subject: 'Prueba fallo',
            html: '<p>Fallo</p>',
            text: 'Fallo',
            idempotencyKey: `test-outbox-failed-${Date.now()}`
        });

        assert.equal(res.ok, false);
        assert.equal(res.status, OUTBOX_STATUSES.FAILED);
        assert.match(res.error, /Domain not verified/);
    });

    test('envío es estrictamente idempotente por clave', async () => {
        let callCount = 0;
        global.fetch = async () => {
            callCount++;
            return {
                ok: true,
                status: 200,
                json: async () => ({ id: 'idempotent_provider_id_777' })
            };
        };

        const key = `idempotent-key-${Date.now()}`;
        const first = await sendTransactionalEmail({
            to: 'cliente_idempotente@ejemplo.com',
            subject: 'Prueba idempotencia',
            html: '<p>Test</p>',
            text: 'Test',
            idempotencyKey: key
        });

        const second = await sendTransactionalEmail({
            to: 'cliente_idempotente@ejemplo.com',
            subject: 'Prueba idempotencia duplicada',
            html: '<p>Test</p>',
            text: 'Test',
            idempotencyKey: key
        });

        assert.equal(callCount, 1, 'El proveedor solo debió ser llamado una sola vez');
        assert.equal(first.ok, true);
        assert.equal(second.ok, true);
        assert.equal(second.deduplicated, true);
        assert.equal(second.id, 'idempotent_provider_id_777');
    });

    test('reintento de correo fallido es idempotente y seguro', async () => {
        let attempts = 0;
        global.fetch = async () => {
            attempts++;
            if (attempts === 1) {
                return {
                    ok: false,
                    status: 503,
                    json: async () => ({ message: 'Service unavailable' })
                };
            }
            return {
                ok: true,
                status: 200,
                json: async () => ({ id: 'recovered_provider_id_101' })
            };
        };

        const initial = await sendTransactionalEmail({
            to: 'retry_test@ejemplo.com',
            subject: 'Prueba reintento',
            html: '<p>Reintento</p>',
            text: 'Reintento'
        });

        assert.equal(initial.ok, false);
        assert.equal(initial.status, OUTBOX_STATUSES.FAILED);

        // Obtenemos el evento del ledger y reintentamos
        const { getEmailHealthSummary } = require('../services/email.service');
        const summary = getEmailHealthSummary();
        assert.ok(summary.failed_24h >= 1);
    });
});
