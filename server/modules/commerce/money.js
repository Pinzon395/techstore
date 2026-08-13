'use strict';

const { ValidationError } = require('./errors');

const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const DECIMAL_PATTERN = /^(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/;

class Money {
    #minor;
    #currency;

    constructor(minor, currency = 'MXN') {
        if (typeof minor !== 'bigint') {
            throw new TypeError('minor debe ser bigint');
        }
        const normalizedCurrency = String(currency).toUpperCase();
        if (!CURRENCY_PATTERN.test(normalizedCurrency)) {
            throw new ValidationError('Moneda no valida', { field: 'currency' });
        }
        this.#minor = minor;
        this.#currency = normalizedCurrency;
        Object.freeze(this);
    }

    static fromDecimal(value, currency = 'MXN') {
        if (value instanceof Money) {
            if (value.currency !== String(currency).toUpperCase()) {
                throw new ValidationError('No se pueden mezclar monedas');
            }
            return value;
        }

        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') {
            throw new ValidationError('Importe no valido');
        }

        const raw = String(value).trim();
        const match = DECIMAL_PATTERN.exec(raw);
        if (!match) {
            throw new ValidationError('El importe debe ser positivo y tener maximo dos decimales');
        }

        const whole = BigInt(match[1]);
        const fraction = BigInt((match[2] || '').padEnd(2, '0'));
        return new Money((whole * 100n) + fraction, currency);
    }

    static zero(currency = 'MXN') {
        return new Money(0n, currency);
    }

    get currency() {
        return this.#currency;
    }

    get minor() {
        return this.#minor;
    }

    add(other) {
        const value = Money.fromDecimal(other instanceof Money ? other.toDecimal() : other, this.currency);
        return new Money(this.minor + value.minor, this.currency);
    }

    subtract(other) {
        const value = Money.fromDecimal(other instanceof Money ? other.toDecimal() : other, this.currency);
        if (value.minor > this.minor) {
            throw new ValidationError('El resultado monetario no puede ser negativo');
        }
        return new Money(this.minor - value.minor, this.currency);
    }

    multiply(quantity) {
        const parsed = Number.parseInt(quantity, 10);
        if (!Number.isSafeInteger(parsed) || parsed < 0) {
            throw new ValidationError('Cantidad no valida');
        }
        return new Money(this.minor * BigInt(parsed), this.currency);
    }

    compare(other) {
        const value = Money.fromDecimal(other instanceof Money ? other.toDecimal() : other, this.currency);
        return this.minor === value.minor ? 0 : (this.minor > value.minor ? 1 : -1);
    }

    toDecimal() {
        const whole = this.minor / 100n;
        const fraction = String(this.minor % 100n).padStart(2, '0');
        return `${whole}.${fraction}`;
    }

    toJSON() {
        return { amount: this.toDecimal(), currency: this.currency };
    }
}

function normalizeMoney(value, { field = 'amount', currency = 'MXN', nullable = false } = {}) {
    if ((value === null || value === undefined || value === '') && nullable) return null;
    try {
        return Money.fromDecimal(value, currency).toDecimal();
    } catch (error) {
        if (error instanceof ValidationError) {
            throw new ValidationError(error.message, { field });
        }
        throw error;
    }
}

module.exports = { Money, normalizeMoney };
