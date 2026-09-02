'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    addDays,
    cancunToday,
    granularityFor,
    resolveDashboardPeriod
} = require('../period');

const NOW = new Date('2026-08-13T18:00:00.000Z');

test('resuelve hoy en la zona de Cancun y crea comparacion equivalente', () => {
    assert.equal(cancunToday(NOW), '2026-08-13');
    const period = resolveDashboardPeriod({ preset: 'today' }, { now: NOW });
    assert.deepEqual(
        { from: period.from, to: period.to, previous: period.previous, granularity: period.granularity },
        {
            from: '2026-08-13',
            to: '2026-08-13',
            previous: { from: '2026-08-12', to: '2026-08-12', toExclusive: '2026-08-13', days: 1 },
            granularity: 'hour'
        }
    );
});

test('ultimos 30 dias incluye hoy y compara con los 30 inmediatamente anteriores', () => {
    const period = resolveDashboardPeriod({ preset: 'last30' }, { now: NOW });
    assert.equal(period.from, '2026-07-15');
    assert.equal(period.to, '2026-08-13');
    assert.equal(period.days, 30);
    assert.deepEqual(period.previous, {
        from: '2026-06-15',
        to: '2026-07-14',
        toExclusive: '2026-07-15',
        days: 30
    });
});

test('mes anterior respeta la duracion real del mes', () => {
    const period = resolveDashboardPeriod({ preset: 'previousMonth' }, { now: NOW });
    assert.equal(period.from, '2026-07-01');
    assert.equal(period.to, '2026-07-31');
    assert.equal(period.days, 31);
    assert.equal(period.previous.from, '2026-05-31');
    assert.equal(period.previous.to, '2026-06-30');
});

test('rango personalizado y dia especifico comparten el mismo contrato', () => {
    const range = resolveDashboardPeriod({ preset: 'custom', from: '2026-02-27', to: '2026-03-02' }, { now: NOW });
    const day = resolveDashboardPeriod({ preset: 'custom', from: '2026-03-02', to: '2026-03-02' }, { now: NOW });
    assert.equal(range.days, 4);
    assert.equal(day.days, 1);
    assert.equal(addDays('2024-02-28', 1), '2024-02-29');
});

test('rechaza fechas imposibles, rangos invertidos y periodos desconocidos', () => {
    assert.throws(() => resolveDashboardPeriod({ preset: 'custom', from: '2026-02-30', to: '2026-03-01' }, { now: NOW }), /válidas/);
    assert.throws(() => resolveDashboardPeriod({ preset: 'custom', from: '2026-03-02', to: '2026-03-01' }, { now: NOW }), /posterior/);
    assert.throws(() => resolveDashboardPeriod({ preset: 'quarter' }, { now: NOW }), /no reconocido/);
});

test('selecciona granularidad segun amplitud', () => {
    assert.equal(granularityFor(1), 'hour');
    assert.equal(granularityFor(30), 'day');
    assert.equal(granularityFor(365), 'week');
    assert.equal(granularityFor(1000), 'month');
});
