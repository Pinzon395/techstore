'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DashboardService, metric, percentChange } = require('../dashboard.service');

test('la comparación distingue crecimiento nuevo, estabilidad y sentido del indicador', () => {
    assert.deepEqual(percentChange(120, 100), {
        direction: 'up', percent: 20, sentiment: 'positive'
    });
    assert.deepEqual(percentChange(0, 0), {
        direction: 'stable', percent: 0, sentiment: 'neutral'
    });
    assert.deepEqual(percentChange(10, 0), {
        direction: 'new', percent: null, sentiment: 'positive'
    });
    assert.equal(percentChange(8, 4, 'lower').sentiment, 'negative');
});

test('una métrica separa cero real, ausencia de registros y fuente no disponible', () => {
    const zero = metric({ value: 0, previous: 2, coverage: 4 });
    const empty = metric({ value: 0, previous: 0, coverage: 0 });
    const unavailable = metric({ value: 0, previous: 0, coverage: 0, available: false });

    assert.equal(zero.state, 'value');
    assert.equal(zero.value, 0);
    assert.equal(empty.state, 'empty');
    assert.equal(empty.empty_label, 'Sin registros');
    assert.equal(unavailable.state, 'unavailable');
    assert.equal(unavailable.comparison, null);
});

test('normaliza importes monetarios sin perder el contrato de comparación', () => {
    const result = metric({
        value: '14520',
        previous: '12000',
        format: 'currency',
        coverage: 1
    });

    assert.equal(result.value, '14520.00');
    assert.equal(result.previous, '12000.00');
    assert.equal(result.comparison.percent, 21);
});

test('aísla una consulta fallida sin convertir todo el dashboard en cero', async () => {
    const service = new DashboardService({ pool: {} });
    const countMetric = metric({ value: 2, previous: 1, coverage: 2 });
    service.tableExists = async () => false;
    service.finance = async () => { throw new Error('finance offline'); };
    service.operations = async () => ({ metrics: { total: countMetric, active: countMetric, ready: countMetric }, repairs: { statuses: {} } });
    service.customers = async () => ({ metrics: { new_customers: countMetric } });
    service.appointments = async () => ({ metric: countMetric, statuses: {} });
    service.traffic = async () => ({ metrics: { views: countMetric, visitors: countMetric }, top_pages: [], referrers: [], conversions: {} });
    service.inventory = async () => ({ state: 'empty', snapshot: {}, movements: countMetric, parts: { state: 'empty' } });
    service.technicians = async () => ({ state: 'empty', items: [], total: 0 });
    service.services = async () => ({ state: 'empty', items: [] });
    service.series = async () => [];

    const report = await service.getDashboard({ preset: 'today' });
    assert.equal(report.partial, true);
    assert.equal(report.kpis.sales.state, 'error');
    assert.equal(report.kpis.active_work.value, 2);
    assert.ok(report.data_quality.some((item) => item.key === 'finance' && item.state === 'error'));
});

test('el adaptador de Commerce conserva estados y no convierte ausencia de datos en cero', async () => {
    const service = new DashboardService({ pool: { execute: async () => [[]] } });
    service.getDashboard = async () => ({
        period: { preset: 'last30', from: '2026-07-15', to: '2026-08-13' },
        finance: { metrics: {
            sales: { state: 'empty', value: '0.00' },
            gross_profit: { state: 'empty', value: '0.00' },
            average_ticket: { state: 'empty', value: '0.00' }
        } },
        operations: {
            metrics: { total: { state: 'empty', value: 0 } },
            commerce: { total: 0 },
            attention_now: { payment_review: 0 }
        },
        inventory: { state: 'empty', snapshot: { tracked_items: 0, low_stock: 0 } },
        series: []
    });

    const report = await service.getCommerceReport({ preset: 'last30' });
    assert.equal(report.metrics.gross_profit, null);
    assert.equal(report.metric_states.sales, 'empty');
    assert.equal(report.metric_states.available, 'empty');
});

test('taller hoy usa el día de Cancún, agrupa etapas y ordena primero los atrasados', async () => {
    const calls = [];
    const now = new Date('2026-10-13T03:30:00Z'); // 12-oct 22:30 en Cancún
    const pool = {
        async execute(sql, params = []) {
            calls.push({ sql, params });
            if (/LIMIT 6/.test(sql)) {
                return [[
                    { id: 9, ticket_code: 'AB12', device_type: 'Laptop', device_brand: 'HP', device_model: null, status: 'quoted',
                      promised_at: '2026-10-10T12:00:00Z', created_at: '2026-10-01T15:00:00Z', contact_phone: '998', notes_internal: 'Cliente: Ana', user_name: null },
                ]];
            }
            return [[{ entered_today: 2, delivered_today: 1, cancelled_today: 0, pending_intake: 3, open_total: 5,
                diagnosis: 1, waiting_customer: 2, waiting_parts: 0, in_repair: 1, ready: 1, overdue: 1, stale: 2 }]];
        }
    };
    const service = new DashboardService({ pool, now: () => now });
    const w = await service.workshopNow();
    assert.equal(w.date, '2026-10-12');
    assert.deepEqual(calls[0].params.slice(0, 2), ['2026-10-12', '2026-10-13']);
    assert.equal(w.open_total, 5);
    assert.deepEqual(w.stages, { diagnosis: 1, waiting_customer: 2, waiting_parts: 0, in_repair: 1, ready: 1 });
    assert.equal(w.oldest[0].customer, 'Ana');
    assert.equal(w.oldest[0].device, 'Laptop · HP');
    assert.equal(w.oldest[0].overdue, true);
    assert.equal(w.oldest[0].days_open, 11);
    assert.match(calls[1].sql, /ORDER BY \(r\.promised_at IS NOT NULL AND r\.promised_at < NOW\(\)\) DESC, r\.created_at ASC/);
});
