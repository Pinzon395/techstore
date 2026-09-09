'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { localizedAccountPath, safeInternalReturnTo } = require('../utils/locale-paths');

test('localized account routes preserve locale', () => {
    assert.equal(localizedAccountPath('es'), '/cuenta');
    assert.equal(localizedAccountPath('en'), '/en/account');
});

test('returnTo accepts only safe internal paths', () => {
    assert.equal(safeInternalReturnTo('/en/checkout?coupon=x#payment'), '/en/checkout?coupon=x#payment');
    assert.equal(safeInternalReturnTo('/checkout'), '/checkout');
    assert.equal(safeInternalReturnTo('https://evil.example'), '/cuenta');
    assert.equal(safeInternalReturnTo('//evil.example'), '/cuenta');
    assert.equal(safeInternalReturnTo('/\\evil'), '/cuenta');
});
