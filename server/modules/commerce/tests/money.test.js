'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Money, normalizeMoney } = require('../money');
const { ValidationError } = require('../errors');

test('Money conserva precision decimal sin IEEE-754', () => {
    const total = Money.fromDecimal('0.10').add(Money.fromDecimal('0.20'));
    assert.equal(total.toDecimal(), '0.30');
    assert.equal(total.currency, 'MXN');
});

test('Money multiplica cantidades usando unidades menores bigint', () => {
    const total = Money.fromDecimal('1550.00').multiply(5);
    assert.equal(total.toDecimal(), '7750.00');
    assert.equal(total.minor, 775000n);
});

test('Money rechaza negativos, exponentes y mas de dos decimales', () => {
    for (const invalid of ['-1.00', '1e3', '10.001', 'NaN', '']) {
        assert.throws(() => Money.fromDecimal(invalid), ValidationError);
    }
});

test('normalizeMoney conserva importes nulos solo cuando el contrato lo permite', () => {
    assert.equal(normalizeMoney(null, { nullable: true }), null);
    assert.equal(normalizeMoney(6999, { field: 'price' }), '6999.00');
    assert.throws(() => normalizeMoney(null, { field: 'price' }), ValidationError);
});
