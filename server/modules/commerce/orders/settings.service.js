'use strict';

const { ValidationError } = require('../errors');
const { plainText, booleanValue } = require('../validation');

const DEFAULT_PAYMENT_METHODS = Object.freeze({
    BANK_TRANSFER: { enabled: false, beneficiary: '', bank: '', account: '', clabe: '', card: '', instructions: '' },
    CASH: { enabled: true, instructions: 'Pago al recoger en Pixon PC.' },
    TERMINAL: { enabled: true, instructions: 'Pago con terminal al recoger en Pixon PC.' },
    STRIPE: { enabled: false, instructions: 'Pago seguro procesado por Stripe.' },
    PAYPAL: { enabled: false, instructions: 'Pago seguro procesado por PayPal.' },
    MERCADO_PAGO: { enabled: false, instructions: 'Pago seguro procesado por Mercado Pago.' }
});

function parseJson(value, fallback) {
    if (!value) return structuredClone(fallback);
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return structuredClone(fallback); }
}

function cleanPaymentMethods(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ValidationError('Metodos de pago no validos');
    const output = {};
    for (const method of Object.keys(DEFAULT_PAYMENT_METHODS)) {
        const input = payload[method] || {};
        output[method] = {
            enabled: booleanValue(input.enabled, { field: `${method}.enabled`, fallback: false }),
            instructions: plainText(input.instructions, { field: `${method}.instructions`, max: 1000, multiline: true, nullable: true }) || ''
        };
        if (method === 'BANK_TRANSFER') {
            Object.assign(output[method], {
                beneficiary: plainText(input.beneficiary, { field: 'BANK_TRANSFER.beneficiary', max: 160, nullable: true }) || '',
                bank: plainText(input.bank, { field: 'BANK_TRANSFER.bank', max: 120, nullable: true }) || '',
                account: plainText(input.account, { field: 'BANK_TRANSFER.account', max: 40, nullable: true })?.replace(/\s/g, '') || '',
                clabe: plainText(input.clabe, { field: 'BANK_TRANSFER.clabe', max: 24, nullable: true })?.replace(/\s/g, '') || '',
                card: plainText(input.card, { field: 'BANK_TRANSFER.card', max: 24, nullable: true })?.replace(/\s/g, '') || ''
            });
            if (output[method].enabled && !output[method].clabe && !output[method].account && !output[method].card) {
                throw new ValidationError('Configura al menos CLABE, cuenta o tarjeta para activar transferencia');
            }
        }
    }
    if (!Object.values(output).some((method) => method.enabled)) throw new ValidationError('Debe existir al menos un metodo de pago activo');
    return output;
}

class SettingsService {
    constructor({ pool, runTransaction, audit, providerService = null }) { this.pool = pool; this.runTransaction = runTransaction; this.audit = audit; this.providerService = providerService; }

    async getPaymentMethods(executor = this.pool, { enabledOnly = false } = {}) {
        const [[row]] = await executor.execute("SELECT setting_value FROM commerce_settings WHERE setting_key = 'payment_methods' LIMIT 1");
        const methods = { ...structuredClone(DEFAULT_PAYMENT_METHODS), ...parseJson(row?.setting_value, DEFAULT_PAYMENT_METHODS) };
        if (!enabledOnly) return methods;
        const readiness = this.providerService ? await this.providerService.readiness(executor) : [];
        const externalReady = new Map(readiness.map((entry) => [entry.provider, entry.enabled && entry.configured]));
        return Object.fromEntries(Object.entries(methods).filter(([key, value]) =>
            value?.enabled && (!['STRIPE','PAYPAL','MERCADO_PAGO'].includes(key) || externalReady.get(key))));
    }

    async assertEnabled(executor, method) {
        const methods = await this.getPaymentMethods(executor);
        if (!methods[method]?.enabled) throw new ValidationError('El metodo de pago no esta disponible', { method });
        if (['STRIPE','PAYPAL','MERCADO_PAGO'].includes(method)) {
            const provider = (await this.providerService.readiness(executor)).find((entry) => entry.provider === method);
            if (!provider?.enabled || !provider.configured) throw new ValidationError('El proveedor de pago no esta disponible', { method });
        }
        return methods[method];
    }

    async reservationMinutes(executor = this.pool) {
        const [[row]] = await executor.execute("SELECT setting_value FROM commerce_settings WHERE setting_key = 'reservation_policy' LIMIT 1");
        const value = Number(parseJson(row?.setting_value, { minutes: 1440 }).minutes);
        return Number.isSafeInteger(value) && value >= 15 && value <= 10080 ? value : 1440;
    }

    async updatePaymentMethods(payload, actor) {
        const clean = cleanPaymentMethods(payload);
        for (const provider of ['STRIPE','PAYPAL','MERCADO_PAGO']) {
            if (clean[provider].enabled && !this.providerService?.isConfigured(provider)) {
                throw new ValidationError(`${provider} no puede activarse: faltan credenciales o secreto de webhook`);
            }
        }
        return this.runTransaction(this.pool, async (connection) => {
            const before = await this.getPaymentMethods(connection);
            await connection.execute(
                `INSERT INTO commerce_settings (setting_key, setting_value, updated_by) VALUES ('payment_methods', ?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
                [JSON.stringify(clean), actor.userId]
            );
            await this.audit.write(connection, { actor, action: 'update', entity: 'commerce_payment_settings', entityId: 'payment_methods', before, after: clean });
            return clean;
        });
    }
}

module.exports = { SettingsService, DEFAULT_PAYMENT_METHODS, cleanPaymentMethods };
