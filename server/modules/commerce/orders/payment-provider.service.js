'use strict';

const crypto = require('crypto');
const { ServiceUnavailableError, ValidationError } = require('../errors');

const PROVIDERS = Object.freeze(['STRIPE', 'PAYPAL', 'MERCADO_PAGO']);

// A provider is not operational just because credentials exist. These flags must
// only be enabled when checkout creation and automatic reconciliation are both
// implemented and covered by integration tests for that provider.
const PROVIDER_IMPLEMENTATION = Object.freeze({
    STRIPE: Object.freeze({ checkout_session: false, automatic_reconciliation: false }),
    PAYPAL: Object.freeze({ checkout_session: false, automatic_reconciliation: false }),
    MERCADO_PAGO: Object.freeze({ checkout_session: false, automatic_reconciliation: false })
});

function configured(provider, env = process.env) {
    if (provider === 'STRIPE') return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
    if (provider === 'PAYPAL') return Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET && env.PAYPAL_WEBHOOK_ID);
    if (provider === 'MERCADO_PAGO') return Boolean(env.MERCADO_PAGO_ACCESS_TOKEN && env.MERCADO_PAGO_WEBHOOK_SECRET);
    return false;
}

function safeEqual(left, right) {
    const a = Buffer.from(String(left || ''), 'utf8');
    const b = Buffer.from(String(right || ''), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function responseJson(response, provider) {
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
    if (!response.ok) {
        const message = body?.error?.message || body?.message || `${provider} respondio ${response.status}`;
        throw new ServiceUnavailableError(`No fue posible completar la operacion con ${provider}`, {
            provider, status: response.status, provider_message: String(message).slice(0, 300)
        });
    }
    return body;
}

class StripeAdapter {
    constructor(env = process.env) { this.env = env; this.name = 'STRIPE'; }
    assertConfigured() { if (!configured(this.name, this.env)) throw new ServiceUnavailableError('Stripe no esta configurado'); }
    verifyWebhook(rawBody, headers) {
        this.assertConfigured();
        const signature = String(headers['stripe-signature'] || '');
        const parts = Object.fromEntries(signature.split(',').map((part) => part.split('=', 2)));
        const timestamp = Number(parts.t);
        if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
        const expected = crypto.createHmac('sha256', this.env.STRIPE_WEBHOOK_SECRET)
            .update(`${parts.t}.${rawBody.toString('utf8')}`).digest('hex');
        return safeEqual(expected, parts.v1);
    }
    normalizeEvent(event) {
        const object = event?.data?.object || {};
        return { id: event?.id, type: event?.type, transactionId: object.payment_intent || object.id || null };
    }
    async refund({ transactionId, amountMinor, idempotencyKey }) {
        this.assertConfigured();
        const body = new URLSearchParams({ payment_intent: transactionId, amount: String(amountMinor) });
        const response = await fetch('https://api.stripe.com/v1/refunds', {
            method: 'POST', body,
            headers: { Authorization: `Bearer ${this.env.STRIPE_SECRET_KEY}`, 'Idempotency-Key': idempotencyKey }
        });
        const result = await responseJson(response, this.name);
        return { externalId: result.id, status: result.status === 'succeeded' ? 'SUCCEEDED' : 'PROCESSING', rawStatus: result.status };
    }
}

class PayPalAdapter {
    constructor(env = process.env) { this.env = env; this.name = 'PAYPAL'; }
    get baseUrl() { return this.env.PAYPAL_MODE === 'LIVE' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'; }
    assertConfigured() { if (!configured(this.name, this.env)) throw new ServiceUnavailableError('PayPal no esta configurado'); }
    async token() {
        const credentials = Buffer.from(`${this.env.PAYPAL_CLIENT_ID}:${this.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
        const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
            method: 'POST', body: 'grant_type=client_credentials',
            headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return (await responseJson(response, this.name)).access_token;
    }
    async verifyWebhook(rawBody, headers) {
        this.assertConfigured();
        const event = JSON.parse(rawBody.toString('utf8'));
        const token = await this.token();
        const response = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_algo: headers['paypal-auth-algo'], cert_url: headers['paypal-cert-url'],
                transmission_id: headers['paypal-transmission-id'], transmission_sig: headers['paypal-transmission-sig'],
                transmission_time: headers['paypal-transmission-time'], webhook_id: this.env.PAYPAL_WEBHOOK_ID,
                webhook_event: event
            })
        });
        return (await responseJson(response, this.name)).verification_status === 'SUCCESS';
    }
    normalizeEvent(event) {
        return { id: event?.id, type: event?.event_type, transactionId: event?.resource?.id || null };
    }
    async refund({ transactionId, amount, currency, idempotencyKey }) {
        this.assertConfigured();
        const token = await this.token();
        const response = await fetch(`${this.baseUrl}/v2/payments/captures/${encodeURIComponent(transactionId)}/refund`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': idempotencyKey },
            body: JSON.stringify({ amount: { value: amount, currency_code: currency } })
        });
        const result = await responseJson(response, this.name);
        return { externalId: result.id, status: result.status === 'COMPLETED' ? 'SUCCEEDED' : 'PROCESSING', rawStatus: result.status };
    }
}

class MercadoPagoAdapter {
    constructor(env = process.env) { this.env = env; this.name = 'MERCADO_PAGO'; }
    assertConfigured() { if (!configured(this.name, this.env)) throw new ServiceUnavailableError('Mercado Pago no esta configurado'); }
    verifyWebhook(_rawBody, headers, query = {}) {
        this.assertConfigured();
        const parts = Object.fromEntries(String(headers['x-signature'] || '').split(',').map((part) => part.trim().split('=', 2)));
        const requestId = String(headers['x-request-id'] || '');
        const dataId = String(query['data.id'] || query.id || '').toLowerCase();
        if (!parts.ts || !parts.v1 || !requestId || !dataId) return false;
        const template = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
        const expected = crypto.createHmac('sha256', this.env.MERCADO_PAGO_WEBHOOK_SECRET).update(template).digest('hex');
        return safeEqual(expected, parts.v1);
    }
    normalizeEvent(event) {
        return { id: event?.id || event?.data?.id, type: event?.type || event?.action, transactionId: event?.data?.id || null };
    }
    async refund({ transactionId, amount, idempotencyKey }) {
        this.assertConfigured();
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(transactionId)}/refunds`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.env.MERCADO_PAGO_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': idempotencyKey },
            body: JSON.stringify({ amount: Number(amount) })
        });
        const result = await responseJson(response, this.name);
        return { externalId: String(result.id), status: result.status === 'approved' ? 'SUCCEEDED' : 'PROCESSING', rawStatus: result.status };
    }
}

class PaymentProviderService {
    constructor({ pool, runTransaction, audit, env = process.env }) {
        this.pool = pool; this.runTransaction = runTransaction; this.audit = audit; this.env = env;
        this.adapters = { STRIPE: new StripeAdapter(env), PAYPAL: new PayPalAdapter(env), MERCADO_PAGO: new MercadoPagoAdapter(env) };
    }
    adapter(provider) {
        const name = String(provider || '').toUpperCase();
        if (!PROVIDERS.includes(name)) throw new ValidationError('Proveedor de pago no valido');
        return this.adapters[name];
    }
    isConfigured(provider) { return configured(String(provider).toUpperCase(), this.env); }
    capabilities(provider) {
        const name = String(provider || '').toUpperCase();
        const credentialsReady = this.isConfigured(name);
        const implementation = PROVIDER_IMPLEMENTATION[name] || {};
        return {
            checkout_session: Boolean(implementation.checkout_session),
            webhook_ingest: credentialsReady,
            refund_api: credentialsReady,
            automatic_reconciliation: Boolean(implementation.automatic_reconciliation)
        };
    }
    async readiness(executor = this.pool) {
        const [rows] = await executor.execute('SELECT provider, enabled, mode, display_name, public_config, sort_order, updated_at FROM commerce_payment_provider_configs ORDER BY sort_order, provider');
        return rows.map((row) => {
            const isConfigured = this.isConfigured(row.provider);
            const capabilities = this.capabilities(row.provider);
            const integrationReady = capabilities.checkout_session && capabilities.webhook_ingest && capabilities.automatic_reconciliation;
            const enabled = Boolean(row.enabled);
            const issues = [];
            if (!isConfigured) issues.push('credentials');
            if (!capabilities.checkout_session) issues.push('checkout_session');
            if (!capabilities.automatic_reconciliation) issues.push('automatic_reconciliation');
            return { ...row, enabled, configured: isConfigured, capabilities, integration_ready: integrationReady,
                operational: enabled && isConfigured && integrationReady, issues };
        });
    }
    async updateConfigs(payload, actor) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ValidationError('Configuracion de proveedores no valida');
        return this.runTransaction(this.pool, async (connection) => {
            const before = await this.readiness(connection);
            for (const provider of PROVIDERS) {
                if (!Object.hasOwn(payload, provider)) continue;
                const input = payload[provider];
                if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ValidationError(`${provider} no es valido`);
                const enabled = input.enabled === true || input.enabled === 1 || input.enabled === '1';
                if (enabled && !this.isConfigured(provider)) throw new ValidationError(`${provider} no puede activarse sin credenciales y secreto de webhook`);
                const capabilities = this.capabilities(provider);
                if (enabled && (!capabilities.checkout_session || !capabilities.automatic_reconciliation)) {
                    throw new ValidationError(`${provider} no puede activarse hasta implementar sesion de pago y conciliacion automatica`);
                }
                const mode = String(input.mode || 'TEST').toUpperCase();
                if (!['TEST','LIVE'].includes(mode)) throw new ValidationError(`${provider}.mode no es valido`);
                const displayName = String(input.display_name || provider).trim().slice(0, 100);
                const publicConfig = input.public_config ?? null;
                if (publicConfig !== null && (typeof publicConfig !== 'object' || Array.isArray(publicConfig))) {
                    throw new ValidationError(`${provider}.public_config debe ser un objeto`);
                }
                if (publicConfig && Object.keys(publicConfig).some((key) => /secret|private|password|token|access_key/i.test(key))) {
                    throw new ValidationError('Los secretos de proveedores solo se configuran mediante variables de entorno');
                }
                const sortOrder = Number.parseInt(input.sort_order, 10);
                await connection.execute(
                    `UPDATE commerce_payment_provider_configs SET enabled = ?, mode = ?, display_name = ?,
                        public_config = ?, sort_order = ?, updated_by = ? WHERE provider = ?`,
                    [enabled, mode, displayName, publicConfig ? JSON.stringify(publicConfig) : null,
                        Number.isSafeInteger(sortOrder) ? Math.max(-32768, Math.min(32767, sortOrder)) : 0,
                        actor.userId, provider]
                );
            }
            const after = await this.readiness(connection);
            await this.audit.write(connection, { actor, action: 'update', entity: 'commerce_payment_provider_settings', entityId: 'providers', before, after });
            return after;
        });
    }
    async refund(provider, payload) { return this.adapter(provider).refund(payload); }
    async handleWebhook(providerValue, rawBody, headers, query = {}) {
        const provider = String(providerValue || '').toUpperCase();
        const adapter = this.adapter(provider);
        const valid = await adapter.verifyWebhook(rawBody, headers, query);
        if (!valid) throw new ValidationError('Firma de webhook no valida');
        let event;
        try { event = JSON.parse(rawBody.toString('utf8')); } catch { throw new ValidationError('Payload de webhook no valido'); }
        const normalized = adapter.normalizeEvent(event);
        if (!normalized.id || !normalized.type) throw new ValidationError('Evento de proveedor incompleto');
        const checksum = crypto.createHash('sha256').update(rawBody).digest('hex');
        return this.runTransaction(this.pool, async (connection) => {
            const [insert] = await connection.execute(
                `INSERT IGNORE INTO commerce_payment_provider_events
                    (provider, external_event_id, event_type, payload_checksum_sha256)
                 VALUES (?, ?, ?, ?)`,
                [provider, String(normalized.id), String(normalized.type).slice(0, 120), checksum]
            );
            if (!insert.affectedRows) return { received: true, replayed: true };
            await connection.execute(
                `UPDATE commerce_payment_provider_events SET status = 'PROCESSED', processed_at = UTC_TIMESTAMP()
                 WHERE provider = ? AND external_event_id = ?`, [provider, String(normalized.id)]
            );
            return { received: true, replayed: false };
        });
    }
}

module.exports = { PaymentProviderService, StripeAdapter, PayPalAdapter, MercadoPagoAdapter, configured, PROVIDERS, PROVIDER_IMPLEMENTATION };
