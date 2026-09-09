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

test('zona horaria America/Cancun evalua correctamente 23:59 y 00:01 (UTC-5 sin DST)', () => {
    // 2026-06-15 23:59:59 en Cancun corresponde a 2026-06-16 04:59:59 UTC
    const at2359 = new Date('2026-06-16T04:59:59.000Z');
    assert.equal(cancunToday(at2359), '2026-06-15', 'A las 23:59 sigue siendo el mismo dia en Cancun');

    // 2026-06-16 00:01:00 en Cancun corresponde a 2026-06-16 05:01:00 UTC
    const at0001 = new Date('2026-06-16T05:01:00.000Z');
    assert.equal(cancunToday(at0001), '2026-06-16', 'A las 00:01 ya es el siguiente dia en Cancun');
});

test('zona horaria America/Cancun respeta transiciones de fin de mes a las 23:59 y 00:01', () => {
    // 31 de enero a las 23:59:59 en Cancun -> 1 de febrero a las 04:59:59 UTC
    const endOfJan = new Date('2026-02-01T04:59:59.000Z');
    assert.equal(cancunToday(endOfJan), '2026-01-31', 'Fin de enero a las 23:59 es 31 de enero en Cancun');

    // 1 de febrero a las 00:01:00 en Cancun -> 1 de febrero a las 05:01:00 UTC
    const startOfFeb = new Date('2026-02-01T05:01:00.000Z');
    assert.equal(cancunToday(startOfFeb), '2026-02-01', 'Inicio de febrero a las 00:01 es 1 de febrero en Cancun');

    // Febrero en ano bisiesto 2024: 28 de feb 23:59 -> 29 de feb 00:01 -> 1 de marzo 00:01
    const feb28_2359 = new Date('2024-02-29T04:59:59.000Z');
    assert.equal(cancunToday(feb28_2359), '2024-02-28');

    const feb29_0001 = new Date('2024-02-29T05:01:00.000Z');
    assert.equal(cancunToday(feb29_0001), '2024-02-29');

    const feb29_2359 = new Date('2024-03-01T04:59:59.000Z');
    assert.equal(cancunToday(feb29_2359), '2024-02-29');

    const mar1_0001 = new Date('2024-03-01T05:01:00.000Z');
    assert.equal(cancunToday(mar1_0001), '2024-03-01');
});

test('zona horaria America/Cancun respeta transiciones de fin de ano a las 23:59 y 00:01', () => {
    // 31 de diciembre a las 23:59:59 en Cancun -> 1 de enero a las 04:59:59 UTC
    const newYearsEve = new Date('2027-01-01T04:59:59.000Z');
    assert.equal(cancunToday(newYearsEve), '2026-12-31', '31 de diciembre a las 23:59 es 2026 en Cancun');

    // 1 de enero a las 00:01:00 en Cancun -> 1 de enero a las 05:01:00 UTC
    const newYearDay = new Date('2027-01-01T05:01:00.000Z');
    assert.equal(cancunToday(newYearDay), '2027-01-01', '1 de enero a las 00:01 es 2027 en Cancun');
});

test('cadenas date-only no cambian de dia bajo ningun calculo de negocio', () => {
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2027-01-01', -1), '2026-12-31');
    assert.equal(addDays('2026-02-28', 1), '2026-03-01');
    assert.equal(addDays('2024-02-28', 1), '2024-02-29');
});
