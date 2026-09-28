'use strict';

const crypto = require('crypto');
const { addDays, cancunToday, resolveDashboardPeriod } = require('./period');

// Eventos de conversion_events que representan una interaccion util con un
// CTA (no cualquier click de DOM). Ver public/scripts/tracker.js.
const CLICK_EVENT_NAMES = Object.freeze(['whatsapp_click', 'phone_click', 'ticket_start', 'ticket_submit', 'add_to_cart', 'checkout_start']);
const CLICK_EVENTS_SQL_LIST = CLICK_EVENT_NAMES.map((name) => `'${name}'`).join(',');
// Piso minimo de vistas para que una pagina entre al ranking de "bajo CTR":
// evita mezclar paginas casi sin trafico con paginas realmente desatendidas.
const LOW_CTR_MIN_VIEWS = 20;

const RECOGNIZED_COMMERCE_STATUSES = Object.freeze(['PAID', 'PREPARING', 'READY', 'COMPLETED']);
const RECOGNIZED_LEGACY_STATUSES = Object.freeze(['paid', 'processing', 'shipped', 'delivered']);
const ACTIVE_REPAIR_STATUSES = Object.freeze(['new', 'received', 'diagnosing', 'contacted', 'quoted', 'approved', 'in_progress', 'waiting_parts', 'ready']);
const ACTIVE_COMMERCE_STATUSES = Object.freeze(['PENDING_PAYMENT', 'PAYMENT_REVIEW', 'PAID', 'PREPARING', 'READY']);

const METRIC_DEFINITIONS = Object.freeze({
    sales: 'Valor de pedidos confirmados y trabajos con costo final registrado. No equivale a dinero cobrado.',
    collected: 'Pagos aprobados menos reembolsos completados dentro del periodo.',
    expenses: 'Salidas registradas expresamente como gastos. No se infieren desde precios de venta.',
    gross_profit: 'Ventas menos costos directos registrados. Solo se publica cuando la cobertura de costos es completa.',
    operating_profit: 'Utilidad bruta menos gastos registrados. No se muestra si faltan costos o el registro de gastos.',
    average_ticket: 'Ventas registradas divididas entre operaciones con importe real.',
    new_customers: 'Clientes cuya primera aparición confiable en usuarios, tickets u órdenes ocurre dentro del periodo.',
    visitors: 'Sesiones únicas del sitio público registradas por el tracker propio de Pixon PC; excluye rutas administrativas.',
    clicks: 'Interacciones útiles registradas por el tracker propio: WhatsApp, llamada, inicio/envío de ticket, carrito y checkout. No incluye clicks decorativos.'
});

const COUNT_FORMAT = 'integer';
const MONEY_FORMAT = 'currency';

function numeric(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
    return numeric(value).toFixed(2);
}

function percentChange(currentValue, previousValue, betterWhen = 'higher') {
    const current = numeric(currentValue);
    const previous = numeric(previousValue);
    if (current === previous) return { direction: 'stable', percent: 0, sentiment: 'neutral' };
    if (previous === 0) {
        return {
            direction: current > 0 ? 'new' : 'down',
            percent: null,
            sentiment: current > 0
                ? (betterWhen === 'lower' ? 'negative' : 'positive')
                : (betterWhen === 'lower' ? 'positive' : 'negative')
        };
    }
    const percent = Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
    const direction = percent > 0 ? 'up' : 'down';
    const sentiment = betterWhen === 'neutral'
        ? 'neutral'
        : ((direction === 'up') === (betterWhen === 'higher') ? 'positive' : 'negative');
    return { direction, percent, sentiment };
}

function metric({
    value,
    previous,
    format = COUNT_FORMAT,
    coverage = 1,
    available = true,
    betterWhen = 'higher',
    definition,
    source,
    action = null,
    emptyLabel = 'Sin registros'
}) {
    const state = !available ? 'unavailable' : numeric(coverage) > 0 ? 'value' : 'empty';
    const normalizedValue = format === MONEY_FORMAT ? money(value) : format === 'decimal' ? Number(numeric(value).toFixed(2)) : numeric(value);
    const normalizedPrevious = format === MONEY_FORMAT ? money(previous) : format === 'decimal' ? Number(numeric(previous).toFixed(2)) : numeric(previous);
    return {
        value: normalizedValue,
        previous: normalizedPrevious,
        format,
        state,
        empty_label: state === 'empty' ? emptyLabel : null,
        comparison: state === 'value' ? percentChange(value, previous, betterWhen) : null,
        definition,
        source,
        action
    };
}

function boundsParams(period) {
    return [
        period.from,
        period.toExclusive,
        period.previous.from,
        period.previous.toExclusive
    ];
}

function boundsCte() {
    return `WITH bounds AS (
        SELECT 'current' bucket, ? start_at, ? end_at
        UNION ALL
        SELECT 'previous' bucket, ? start_at, ? end_at
    )`;
}

function rowsByBucket(rows) {
    const result = { current: {}, previous: {} };
    for (const row of rows || []) result[row.bucket] = row;
    return result;
}

function statusCounts(rows) {
    return Object.fromEntries((rows || []).map((row) => [String(row.status), numeric(row.count)]));
}

function periodPayload(period) {
    return {
        preset: period.preset,
        label: period.label,
        from: period.from,
        to: period.to,
        days: period.days,
        granularity: period.granularity,
        timezone: period.timezone,
        previous: {
            from: period.previous.from,
            to: period.previous.to,
            days: period.previous.days
        }
    };
}

function failedMetric(definition, source, format = COUNT_FORMAT) {
    return {
        value: null,
        previous: null,
        format,
        state: 'error',
        empty_label: null,
        comparison: null,
        definition,
        source,
        action: null
    };
}

function failedSection(name) {
    const generic = (label, format) => failedMetric(`No se pudo calcular ${label}.`, name, format);
    const fallbacks = {
        finance: {
            state: 'error',
            metrics: {
                sales: generic('ventas', MONEY_FORMAT), collected: generic('ingresos', MONEY_FORMAT),
                expenses: generic('gastos', MONEY_FORMAT), gross_profit: generic('utilidad bruta', MONEY_FORMAT),
                operating_profit: generic('utilidad operativa', MONEY_FORMAT), average_ticket: generic('ticket promedio', MONEY_FORMAT),
                pending: generic('pagos pendientes', MONEY_FORMAT)
            },
            detail: { cash_in: null, refunds: null, direct_costs: null, costs_complete: false, uncosted_sales: null, sale_count: null, margin: null }
        },
        operations: {
            state: 'error',
            metrics: { total: generic('órdenes'), active: generic('órdenes activas'), ready: generic('entregas'), urgent: generic('urgencias'), overdue: generic('atrasos') },
            repairs: { total: null, statuses: {} }, commerce: { total: null, statuses: {} }, attention_now: { urgent: null, overdue: null, ready: null, payment_review: null }
        },
        customers: {
            state: 'error',
            metrics: { new_customers: generic('clientes nuevos'), active_customers: generic('clientes activos'), returning_customers: generic('clientes recurrentes') },
            lifetime: null
        },
        appointments: { state: 'error', metric: generic('citas'), statuses: {} },
        traffic: { state: 'error', metrics: { views: generic('páginas vistas'), visitors: generic('visitantes') }, top_pages: [], referrers: [], conversions: { state: 'error', reason: 'No se pudo consultar.' } },
        inventory: { state: 'error', snapshot: { tracked_items: null, stock_units: null, low_stock: null, out_of_stock: null, recorded_value: null }, movements: generic('movimientos'), parts: { state: 'error', count: null, reason: 'No se pudo consultar.' } },
        technicians: { state: 'error', items: [], total: null },
        services: { state: 'error', items: [] },
        series: []
    };
    return fallbacks[name];
}

class DashboardService {
    constructor({ pool, now = () => new Date() }) {
        if (!pool) throw new TypeError('DashboardService requiere pool');
        this.pool = pool;
        this.now = now;
        this.schemaCache = { expiresAt: 0, tables: new Set() };
    }

    async tableExists(tableName) {
        if (Date.now() >= this.schemaCache.expiresAt) {
            const [rows] = await this.pool.execute(
                `SELECT TABLE_NAME table_name
                 FROM INFORMATION_SCHEMA.TABLES
                 WHERE TABLE_SCHEMA = DATABASE()`
            );
            this.schemaCache = {
                expiresAt: Date.now() + 60_000,
                tables: new Set(rows.map((row) => row.table_name))
            };
        }
        return this.schemaCache.tables.has(tableName);
    }

    async getDashboard(query = {}) {
        const period = resolveDashboardPeriod(query, { now: this.now() });
        const expensesAvailable = await this.tableExists('business_expenses');
        const sectionNames = ['finance', 'operations', 'customers', 'appointments', 'traffic', 'inventory', 'technicians', 'services', 'series'];
        const settled = await Promise.allSettled([
            this.finance(period, expensesAvailable), this.operations(period), this.customers(period),
            this.appointments(period), this.traffic(period), this.inventory(period),
            this.technicians(period), this.services(period), this.series(period, expensesAvailable)
        ]);
        const sectionErrors = [];
        const sections = Object.fromEntries(settled.map((result, index) => {
            const name = sectionNames[index];
            if (result.status === 'fulfilled') return [name, result.value];
            sectionErrors.push({
                key: name,
                state: 'error',
                message: `No se pudo calcular la sección ${name}. Reintenta; las demás fuentes siguen disponibles.`
            });
            return [name, failedSection(name)];
        }));
        const { finance, operations, customers, appointments, traffic, inventory, technicians, services, series } = sections;

        const kpis = {
            sales: finance.metrics.sales,
            collected: finance.metrics.collected,
            expenses: finance.metrics.expenses,
            operating_profit: finance.metrics.operating_profit,
            active_work: operations.metrics.active,
            ready: operations.metrics.ready,
            new_customers: customers.metrics.new_customers,
            average_ticket: finance.metrics.average_ticket
        };

        const dataQuality = [
            ...(expensesAvailable ? [] : [{
                key: 'expenses',
                state: 'not_configured',
                message: 'El registro de gastos aún no está migrado. Ventas e ingresos siguen disponibles, pero la utilidad neta no se inventa.'
            }]),
            ...(technicians.state === 'not_configured' ? [{
                key: 'technicians',
                state: 'not_configured',
                message: 'No hay técnicos ni asignaciones registrados; no se muestran rankings vacíos.'
            }] : []),
            ...(inventory.parts.state === 'not_configured' ? [{
                key: 'parts',
                state: 'not_configured',
                message: 'Las piezas actuales no registran estados de compra, pago y recepción; solo se muestran conteos verificables.'
            }] : []),
            ...sectionErrors,
            ...(traffic.conversions?.state === 'empty' ? [{
                key: 'web_conversions',
                state: 'partial',
                message: traffic.conversions.reason
            }] : [])
        ];

        return {
            generated_at: new Date().toISOString(),
            period: periodPayload(period),
            definitions: METRIC_DEFINITIONS,
            kpis,
            finance,
            operations,
            customers,
            appointments,
            traffic,
            inventory,
            technicians,
            services,
            series,
            partial: sectionErrors.length > 0,
            data_quality: dataQuality
        };
    }

    async finance(period, expensesAvailable) {
        const [rows] = await this.pool.execute(
            `${boundsCte()}
             SELECT b.bucket,
                COALESCE((SELECT SUM(o.total) FROM commerce_orders o
                    WHERE o.created_at >= b.start_at AND o.created_at < b.end_at
                      AND o.status IN ('PAID','PREPARING','READY','COMPLETED')),0)
                + COALESCE((SELECT SUM(o.total) FROM orders o
                    WHERE o.created_at >= b.start_at AND o.created_at < b.end_at
                      AND o.status IN ('paid','processing','shipped','delivered')),0)
                + COALESCE((SELECT SUM(r.final_cost) FROM repairs r
                    WHERE COALESCE(r.delivered_at,r.updated_at,r.created_at) >= b.start_at
                      AND COALESCE(r.delivered_at,r.updated_at,r.created_at) < b.end_at
                      AND r.deleted_at IS NULL AND r.status IN ('ready','delivered')
                      AND r.final_cost IS NOT NULL
                      AND NOT EXISTS (SELECT 1 FROM commerce_orders linked
                        WHERE linked.ticket_id = r.id AND linked.status <> 'CANCELLED')),0) sales,
                (SELECT COUNT(*) FROM commerce_orders o
                    WHERE o.created_at >= b.start_at AND o.created_at < b.end_at
                      AND o.status IN ('PAID','PREPARING','READY','COMPLETED'))
                + (SELECT COUNT(*) FROM orders o
                    WHERE o.created_at >= b.start_at AND o.created_at < b.end_at
                      AND o.status IN ('paid','processing','shipped','delivered'))
                + (SELECT COUNT(*) FROM repairs r
                    WHERE COALESCE(r.delivered_at,r.updated_at,r.created_at) >= b.start_at
                      AND COALESCE(r.delivered_at,r.updated_at,r.created_at) < b.end_at
                      AND r.deleted_at IS NULL AND r.status IN ('ready','delivered')
                      AND r.final_cost IS NOT NULL
                      AND NOT EXISTS (SELECT 1 FROM commerce_orders linked
                        WHERE linked.ticket_id = r.id AND linked.status <> 'CANCELLED')) sale_count,
                COALESCE((SELECT SUM(p.amount) FROM commerce_payments p
                    WHERE p.reviewed_at >= DATE_ADD(b.start_at, INTERVAL 5 HOUR)
                      AND p.reviewed_at < DATE_ADD(b.end_at, INTERVAL 5 HOUR)
                      AND p.status IN ('APPROVED','PARTIALLY_REFUNDED','REFUNDED')),0)
                + COALESCE((SELECT SUM(p.amount) FROM payments p
                    WHERE p.created_at >= b.start_at AND p.created_at < b.end_at
                      AND p.status = 'captured'),0) cash_in,
                COALESCE((SELECT SUM(ref.amount) FROM commerce_refunds ref
                    WHERE ref.completed_at >= DATE_ADD(b.start_at, INTERVAL 5 HOUR)
                      AND ref.completed_at < DATE_ADD(b.end_at, INTERVAL 5 HOUR)
                      AND ref.status = 'SUCCEEDED'),0) refunds,
                COALESCE((SELECT SUM(COALESCE(oi.cost_unit_snapshot,0) * oi.quantity)
                    FROM commerce_order_items oi JOIN commerce_orders o ON o.id = oi.order_id
                    WHERE o.created_at >= b.start_at AND o.created_at < b.end_at
                      AND o.status IN ('PAID','PREPARING','READY','COMPLETED')),0) direct_costs,
                (SELECT COUNT(*) FROM commerce_order_items oi JOIN commerce_orders o ON o.id = oi.order_id
                    WHERE o.created_at >= b.start_at AND o.created_at < b.end_at
                      AND o.status IN ('PAID','PREPARING','READY','COMPLETED')
                      AND oi.cost_unit_snapshot IS NULL)
                + (SELECT COUNT(*) FROM orders o WHERE o.created_at >= b.start_at AND o.created_at < b.end_at
                      AND o.status IN ('paid','processing','shipped','delivered'))
                + (SELECT COUNT(*) FROM repairs r WHERE COALESCE(r.delivered_at,r.updated_at,r.created_at) >= b.start_at
                      AND COALESCE(r.delivered_at,r.updated_at,r.created_at) < b.end_at
                      AND r.deleted_at IS NULL AND r.status IN ('ready','delivered') AND r.final_cost IS NOT NULL
                      AND NOT EXISTS (SELECT 1 FROM commerce_orders linked
                        WHERE linked.ticket_id = r.id AND linked.status <> 'CANCELLED')) uncosted_sales,
                COALESCE((SELECT SUM(GREATEST(o.total - COALESCE((
                    SELECT SUM(p.amount - p.refunded_amount) FROM commerce_payments p
                    WHERE p.order_id = o.id AND p.status IN ('APPROVED','PARTIALLY_REFUNDED','REFUNDED')
                ),0),0)) FROM commerce_orders o
                    WHERE o.created_at >= b.start_at AND o.created_at < b.end_at
                      AND o.status NOT IN ('CANCELLED','COMPLETED')),0)
                + COALESCE((SELECT SUM(GREATEST(o.total - COALESCE((
                    SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id AND p.status = 'captured'
                ),0),0)) FROM orders o
                    WHERE o.created_at >= b.start_at AND o.created_at < b.end_at
                      AND o.status NOT IN ('cancelled','refunded','delivered')),0) pending_amount
             FROM bounds b`,
            boundsParams(period)
        );
        const byBucket = rowsByBucket(rows);
        const current = byBucket.current;
        const previous = byBucket.previous;

        let expenseRows = [
            { bucket: 'current', expenses: 0, purchases: 0, parts: 0, operating: 0 },
            { bucket: 'previous', expenses: 0, purchases: 0, parts: 0, operating: 0 }
        ];
        let expenseCoverage = 0;
        if (expensesAvailable) {
            [expenseRows] = await this.pool.execute(
                `${boundsCte()}
                 SELECT b.bucket, COALESCE(SUM(e.amount),0) expenses,
                    COALESCE(SUM(CASE WHEN e.category = 'PURCHASE' THEN e.amount ELSE 0 END),0) purchases,
                    COALESCE(SUM(CASE WHEN e.category = 'PART' THEN e.amount ELSE 0 END),0) parts,
                    COALESCE(SUM(CASE WHEN e.category = 'OPERATING' THEN e.amount ELSE 0 END),0) operating
                 FROM bounds b LEFT JOIN business_expenses e
                   ON e.incurred_on >= b.start_at AND e.incurred_on < b.end_at AND e.deleted_at IS NULL
                 GROUP BY b.bucket`,
                boundsParams(period)
            );
            const [[coverage]] = await this.pool.execute('SELECT COUNT(*) total FROM business_expenses WHERE deleted_at IS NULL');
            expenseCoverage = numeric(coverage.total);
        }
        const expenses = rowsByBucket(expenseRows);

        const [paymentMethods] = await this.pool.execute(
            `SELECT method, SUM(amount) amount FROM (
                SELECT p.method, p.amount FROM commerce_payments p
                WHERE p.reviewed_at >= DATE_ADD(?,INTERVAL 5 HOUR)
                  AND p.reviewed_at < DATE_ADD(?,INTERVAL 5 HOUR)
                  AND p.status IN ('APPROVED','PARTIALLY_REFUNDED','REFUNDED')
                UNION ALL
                SELECT p.provider method, p.amount FROM payments p
                WHERE p.created_at >= ? AND p.created_at < ? AND p.status = 'captured'
             ) received GROUP BY method ORDER BY amount DESC`,
            [period.from, period.toExclusive, period.from, period.toExclusive]
        );

        const [[coverage]] = await this.pool.execute(
            `SELECT
                (SELECT COUNT(*) FROM commerce_orders WHERE status IN ('PAID','PREPARING','READY','COMPLETED'))
                + (SELECT COUNT(*) FROM orders WHERE status IN ('paid','processing','shipped','delivered'))
                + (SELECT COUNT(*) FROM repairs WHERE deleted_at IS NULL AND status IN ('ready','delivered') AND final_cost IS NOT NULL) sales,
                (SELECT COUNT(*) FROM commerce_payments WHERE status IN ('APPROVED','PARTIALLY_REFUNDED','REFUNDED'))
                + (SELECT COUNT(*) FROM payments WHERE status = 'captured') payments`
        );

        const currentCollected = numeric(current.cash_in) - numeric(current.refunds);
        const previousCollected = numeric(previous.cash_in) - numeric(previous.refunds);
        // Cero ventas no implica falta de cobertura: no hay costos que completar.
        const costComplete = numeric(current.uncosted_sales) === 0;
        const previousCostComplete = numeric(previous.uncosted_sales) === 0;
        const grossProfit = costComplete ? numeric(current.sales) - numeric(current.direct_costs) : 0;
        const previousGrossProfit = previousCostComplete ? numeric(previous.sales) - numeric(previous.direct_costs) : 0;
        const operatingAvailable = expensesAvailable && costComplete;
        const operatingProfit = operatingAvailable ? grossProfit - numeric(expenses.current.expenses) : 0;
        const previousOperatingProfit = expensesAvailable && previousCostComplete
            ? previousGrossProfit - numeric(expenses.previous.expenses)
            : 0;

        return {
            metrics: {
                sales: metric({ value: current.sales, previous: previous.sales, format: MONEY_FORMAT, coverage: coverage.sales,
                    definition: METRIC_DEFINITIONS.sales, source: 'commerce_orders + orders + repairs.final_cost', action: { view: 'commerce-dashboard' } }),
                collected: metric({ value: currentCollected, previous: previousCollected, format: MONEY_FORMAT, coverage: coverage.payments,
                    definition: METRIC_DEFINITIONS.collected, source: 'commerce_payments aprobados + payments capturados - refunds', action: { view: 'commerce-payments' } }),
                expenses: metric({ value: expenses.current.expenses, previous: expenses.previous.expenses, format: MONEY_FORMAT,
                    coverage: expenseCoverage, available: expensesAvailable, betterWhen: 'lower', definition: METRIC_DEFINITIONS.expenses,
                    source: 'business_expenses', action: { type: 'expense' }, emptyLabel: 'Sin gastos registrados' }),
                gross_profit: metric({ value: grossProfit, previous: previousGrossProfit, format: MONEY_FORMAT,
                    coverage: coverage.sales, available: costComplete, definition: METRIC_DEFINITIONS.gross_profit,
                    source: 'ventas - costos directos snapshot' }),
                operating_profit: metric({ value: operatingProfit, previous: previousOperatingProfit, format: MONEY_FORMAT,
                    coverage: Math.max(numeric(coverage.sales), expenseCoverage), available: operatingAvailable, definition: METRIC_DEFINITIONS.operating_profit,
                    source: 'utilidad bruta - business_expenses' }),
                average_ticket: metric({ value: numeric(current.sale_count) ? numeric(current.sales) / numeric(current.sale_count) : 0,
                    previous: numeric(previous.sale_count) ? numeric(previous.sales) / numeric(previous.sale_count) : 0,
                    format: MONEY_FORMAT, coverage: coverage.sales, definition: METRIC_DEFINITIONS.average_ticket,
                    source: 'ventas / operaciones', action: { view: 'commerce-orders' } }),
                pending: metric({ value: current.pending_amount, previous: previous.pending_amount, format: MONEY_FORMAT,
                    coverage: coverage.sales, betterWhen: 'lower', definition: 'Saldo pendiente de órdenes creadas en el periodo.',
                    source: 'orden total - pagos netos', action: { view: 'commerce-payments', filter: 'pending' } })
            },
            detail: {
                cash_in: money(current.cash_in),
                refunds: money(current.refunds),
                direct_costs: money(current.direct_costs),
                costs_complete: costComplete,
                uncosted_sales: numeric(current.uncosted_sales),
                sale_count: numeric(current.sale_count),
                expense_categories: {
                    purchases: money(expenses.current.purchases),
                    parts: money(expenses.current.parts),
                    operating: money(expenses.current.operating)
                },
                payment_methods: paymentMethods.map((row) => ({ method: row.method || 'OTRO', amount: money(row.amount) })),
                margin: costComplete && numeric(current.sales) > 0
                    ? Number(((grossProfit / numeric(current.sales)) * 100).toFixed(1))
                    : null
            }
        };
    }

    async operations(period) {
        const [rows] = await this.pool.execute(
            `${boundsCte()}
             SELECT b.bucket,
                (SELECT COUNT(*) FROM repairs r WHERE r.created_at >= b.start_at AND r.created_at < b.end_at AND r.deleted_at IS NULL) repairs,
                (SELECT COUNT(*) FROM repairs r WHERE r.created_at >= b.start_at AND r.created_at < b.end_at AND r.deleted_at IS NULL
                    AND r.status IN ('new','received','diagnosing','contacted','quoted','approved','in_progress','waiting_parts','ready')) repair_active,
                (SELECT COUNT(*) FROM repairs r WHERE r.created_at >= b.start_at AND r.created_at < b.end_at AND r.deleted_at IS NULL AND r.status = 'ready') repair_ready,
                (SELECT COUNT(*) FROM repairs r WHERE r.created_at >= b.start_at AND r.created_at < b.end_at AND r.deleted_at IS NULL AND r.status = 'delivered') repair_delivered,
                (SELECT COUNT(*) FROM repairs r WHERE r.created_at >= b.start_at AND r.created_at < b.end_at AND r.deleted_at IS NULL AND r.priority = 'urgent'
                    AND r.status NOT IN ('delivered','cancelled','eliminado')) urgent,
                (SELECT COUNT(*) FROM repairs r WHERE r.created_at >= b.start_at AND r.created_at < b.end_at AND r.deleted_at IS NULL
                    AND r.promised_at IS NOT NULL AND r.promised_at < NOW() AND r.status NOT IN ('delivered','cancelled','eliminado')) overdue,
                (SELECT COUNT(*) FROM commerce_orders o WHERE o.created_at >= b.start_at AND o.created_at < b.end_at) commerce_orders,
                (SELECT COUNT(*) FROM commerce_orders o WHERE o.created_at >= b.start_at AND o.created_at < b.end_at
                    AND o.ticket_id IS NULL AND o.status IN ('PENDING_PAYMENT','PAYMENT_REVIEW','PAID','PREPARING','READY')) commerce_active,
                (SELECT COUNT(*) FROM commerce_orders o WHERE o.created_at >= b.start_at AND o.created_at < b.end_at
                    AND o.ticket_id IS NULL AND o.status = 'READY') commerce_ready
             FROM bounds b`,
            boundsParams(period)
        );
        const buckets = rowsByBucket(rows);
        const current = buckets.current;
        const previous = buckets.previous;
        const [repairStatuses, commerceStatuses] = await Promise.all([
            this.pool.execute(
                `SELECT status, COUNT(*) count FROM repairs
                 WHERE created_at >= ? AND created_at < ? AND deleted_at IS NULL
                 GROUP BY status ORDER BY FIELD(status,'new','received','diagnosing','contacted','quoted','approved','waiting_parts','in_progress','ready','delivered','cancelled')`,
                [period.from, period.toExclusive]
            ).then(([result]) => result),
            this.pool.execute(
                `SELECT status, COUNT(*) count FROM commerce_orders
                 WHERE created_at >= ? AND created_at < ? GROUP BY status
                 ORDER BY FIELD(status,'PENDING_PAYMENT','PAYMENT_REVIEW','PAID','PREPARING','READY','COMPLETED','CANCELLED')`,
                [period.from, period.toExclusive]
            ).then(([result]) => result)
        ]);
        const [[attention]] = await this.pool.execute(
            `SELECT
                (SELECT COUNT(*) FROM repairs WHERE deleted_at IS NULL AND priority = 'urgent'
                    AND status NOT IN ('delivered','cancelled','eliminado')) urgent,
                (SELECT COUNT(*) FROM repairs WHERE deleted_at IS NULL AND promised_at IS NOT NULL
                    AND promised_at < NOW() AND status NOT IN ('delivered','cancelled','eliminado')) overdue,
                (SELECT COUNT(*) FROM repairs WHERE deleted_at IS NULL AND status = 'ready') ready,
                (SELECT COUNT(*) FROM commerce_orders WHERE status = 'PAYMENT_REVIEW') payment_review,
                (SELECT COUNT(*) FROM commerce_orders WHERE status = 'READY') orders_ready`
        );
        const [[coverage]] = await this.pool.execute(
            `SELECT (SELECT COUNT(*) FROM repairs WHERE deleted_at IS NULL)
                  + (SELECT COUNT(*) FROM commerce_orders) total`
        );
        const currentActive = numeric(current.repair_active) + numeric(current.commerce_active);
        const previousActive = numeric(previous.repair_active) + numeric(previous.commerce_active);
        const currentReady = numeric(current.repair_ready) + numeric(current.commerce_ready);
        const previousReady = numeric(previous.repair_ready) + numeric(previous.commerce_ready);
        return {
            metrics: {
                total: metric({ value: numeric(current.repairs) + numeric(current.commerce_orders), previous: numeric(previous.repairs) + numeric(previous.commerce_orders), coverage: coverage.total,
                    definition: 'Tickets y pedidos creados en el periodo.', source: 'repairs + commerce_orders' }),
                active: metric({ value: currentActive, previous: previousActive, coverage: coverage.total, betterWhen: 'neutral',
                    definition: 'Trabajos del periodo que aún requieren una acción.', source: 'repairs + commerce_orders sin ticket duplicado', action: { view: 'repairs', filter: 'active' } }),
                ready: metric({ value: currentReady, previous: previousReady, coverage: coverage.total, betterWhen: 'lower',
                    definition: 'Trabajos listos para entregar dentro del periodo.', source: 'repairs.status + commerce_orders.status', action: { view: 'repairs', filter: 'ready' } }),
                urgent: metric({ value: current.urgent, previous: previous.urgent, coverage: coverage.total, betterWhen: 'lower',
                    definition: 'Tickets urgentes aún abiertos.', source: 'repairs.priority', action: { view: 'repairs', filter: 'urgent' } }),
                overdue: metric({ value: current.overdue, previous: previous.overdue, coverage: coverage.total, betterWhen: 'lower',
                    definition: 'Tickets abiertos cuya fecha prometida ya venció.', source: 'repairs.promised_at', action: { view: 'repairs', filter: 'overdue' } })
            },
            repairs: { total: numeric(current.repairs), statuses: statusCounts(repairStatuses) },
            commerce: { total: numeric(current.commerce_orders), statuses: statusCounts(commerceStatuses) },
            attention_now: {
                urgent: numeric(attention.urgent),
                overdue: numeric(attention.overdue),
                ready: numeric(attention.ready) + numeric(attention.orders_ready),
                payment_review: numeric(attention.payment_review)
            }
        };
    }

    async customers(period) {
        const [rows] = await this.pool.execute(
            `${boundsCte()}, customer_events AS (
                SELECT LOWER(u.email) customer_key, u.created_at event_at FROM users u
                JOIN roles role ON role.id = u.role_id
                WHERE u.deleted_at IS NULL AND role.code = 'cliente'
                UNION ALL
                SELECT LOWER(o.customer_email), o.created_at FROM commerce_orders o
                UNION ALL
                SELECT LOWER(u.email), o.created_at FROM orders o JOIN users u ON u.id = o.user_id
                UNION ALL
                SELECT CASE WHEN NULLIF(LOWER(r.contact_email),'') IS NOT NULL THEN LOWER(r.contact_email)
                    ELSE CONCAT('phone:',REGEXP_REPLACE(r.contact_phone,'[^0-9]','')) END, r.created_at
                FROM repairs r WHERE r.deleted_at IS NULL
             ), customers AS (
                SELECT customer_key, MIN(event_at) first_seen, COUNT(*) interactions
                FROM customer_events WHERE customer_key IS NOT NULL AND customer_key <> 'phone:' GROUP BY customer_key
             ), pending_customer_events AS (
                SELECT LOWER(o.customer_email) customer_key, o.created_at event_at
                FROM commerce_orders o WHERE o.status IN ('PENDING_PAYMENT','PAYMENT_REVIEW')
                UNION ALL
                SELECT LOWER(u.email), o.created_at FROM orders o JOIN users u ON u.id = o.user_id
                WHERE o.status IN ('pending','payment_pending','failed')
             )
             SELECT b.bucket,
                SUM(c.first_seen >= b.start_at AND c.first_seen < b.end_at) new_customers,
                (SELECT COUNT(DISTINCT event.customer_key) FROM customer_events event
                    WHERE event.event_at >= b.start_at AND event.event_at < b.end_at) active_customers,
                (SELECT COUNT(*) FROM customer_events event
                    WHERE event.event_at >= b.start_at AND event.event_at < b.end_at) interactions,
                (SELECT COUNT(DISTINCT event.customer_key) FROM customer_events event
                    WHERE event.event_at >= b.start_at AND event.event_at < b.end_at
                      AND EXISTS (SELECT 1 FROM customer_events earlier
                        WHERE earlier.customer_key = event.customer_key AND earlier.event_at < b.start_at)) returning_customers,
                (SELECT COUNT(DISTINCT pending.customer_key) FROM pending_customer_events pending
                    WHERE pending.event_at >= b.start_at AND pending.event_at < b.end_at) pending_customers,
                (SELECT COUNT(*) FROM customers) lifetime_customers
             FROM bounds b CROSS JOIN customers c GROUP BY b.bucket`,
            boundsParams(period)
        );
        const bucket = rowsByBucket(rows);
        const current = bucket.current;
        const previous = bucket.previous;
        return {
            metrics: {
                new_customers: metric({ value: current.new_customers, previous: previous.new_customers,
                    coverage: current.lifetime_customers, definition: METRIC_DEFINITIONS.new_customers,
                    source: 'primera aparición en users, repairs u orders', action: { view: 'users' } }),
                active_customers: metric({ value: current.active_customers, previous: previous.active_customers,
                    coverage: current.lifetime_customers, definition: 'Clientes con actividad registrada en el periodo.',
                    source: 'users + repairs + orders' }),
                returning_customers: metric({ value: current.returning_customers, previous: previous.returning_customers,
                    coverage: current.lifetime_customers, definition: 'Clientes del periodo con actividad anterior.',
                    source: 'historial unificado por correo o teléfono' }),
                frequency: metric({
                    value: numeric(current.active_customers) ? numeric(current.interactions) / numeric(current.active_customers) : 0,
                    previous: numeric(previous.active_customers) ? numeric(previous.interactions) / numeric(previous.active_customers) : 0,
                    format: 'decimal', coverage: current.lifetime_customers,
                    definition: 'Interacciones registradas por cliente activo durante el periodo.',
                    source: 'eventos unificados / clientes activos'
                }),
                pending_customers: metric({
                    value: current.pending_customers, previous: previous.pending_customers,
                    coverage: current.lifetime_customers, betterWhen: 'lower',
                    definition: 'Clientes con pedidos del periodo que aún esperan pago o validación.',
                    source: 'commerce_orders + orders pendientes', action: { view: 'commerce-payments', filter: 'pending' }
                })
            },
            lifetime: numeric(current.lifetime_customers)
        };
    }

    async appointments(period) {
        const [rows] = await this.pool.execute(
            `${boundsCte()}
             SELECT b.bucket, COUNT(r.id) total,
                SUM(r.appointment_status = 'pendiente_confirmacion') pending,
                SUM(r.appointment_status = 'confirmada') confirmed,
                SUM(r.appointment_status = 'reagendada') rescheduled,
                SUM(r.appointment_status = 'completada') completed,
                SUM(r.appointment_status = 'cancelada') cancelled,
                SUM(r.appointment_date < CURDATE() AND r.appointment_status NOT IN ('completada','cancelada')) overdue
             FROM bounds b LEFT JOIN repairs r ON r.appointment_date >= b.start_at AND r.appointment_date < b.end_at
                AND r.appointment_date IS NOT NULL AND r.deleted_at IS NULL
             GROUP BY b.bucket`,
            boundsParams(period)
        );
        const [[coverage]] = await this.pool.execute('SELECT COUNT(*) total FROM repairs WHERE deleted_at IS NULL AND appointment_date IS NOT NULL');
        const bucket = rowsByBucket(rows);
        return {
            metric: metric({ value: bucket.current.total, previous: bucket.previous.total, coverage: coverage.total,
                definition: 'Citas agendadas para fechas dentro del periodo.', source: 'repairs.appointment_date',
                action: { view: 'repairs', tab: 'appointments' } }),
            statuses: {
                pending: numeric(bucket.current.pending),
                confirmed: numeric(bucket.current.confirmed),
                rescheduled: numeric(bucket.current.rescheduled),
                completed: numeric(bucket.current.completed),
                cancelled: numeric(bucket.current.cancelled),
                overdue: numeric(bucket.current.overdue)
            }
        };
    }

    async traffic(period) {
        const [rows] = await this.pool.execute(
            `${boundsCte()}
             SELECT b.bucket, COUNT(pv.id) views,
                COUNT(DISTINCT COALESCE(pv.session_id,CONCAT('view-',pv.id))) visitors
             FROM bounds b LEFT JOIN page_views pv ON pv.created_at >= b.start_at AND pv.created_at < b.end_at
                AND COALESCE(pv.path,'') NOT LIKE '/admin%'
             GROUP BY b.bucket`,
            boundsParams(period)
        );
        const [clickRows] = await this.pool.execute(
            `${boundsCte()}
             SELECT b.bucket, COUNT(ce.id) clicks
             FROM bounds b LEFT JOIN conversion_events ce ON ce.created_at >= b.start_at AND ce.created_at < b.end_at
                AND ce.event_name IN (${CLICK_EVENTS_SQL_LIST})
                AND COALESCE(ce.path,'') NOT LIKE '/admin%'
             GROUP BY b.bucket`,
            boundsParams(period)
        );
        const [[coverage]] = await this.pool.execute("SELECT COUNT(*) total FROM page_views WHERE COALESCE(path,'') NOT LIKE '/admin%'");
        const [[clicksCoverage]] = await this.pool.execute(
            `SELECT COUNT(*) total FROM conversion_events WHERE event_name IN (${CLICK_EVENTS_SQL_LIST}) AND COALESCE(path,'') NOT LIKE '/admin%'`
        );
        const normalizedPath = (col) => `CASE WHEN TRIM(TRAILING '/' FROM SUBSTRING_INDEX(${col},'?',1)) = '' THEN '/'
                        ELSE TRIM(TRAILING '/' FROM SUBSTRING_INDEX(${col},'?',1)) END`;
        const [pagePerformance, referrers] = await Promise.all([
            this.pool.execute(
                `SELECT pv.path, pv.views, pv.visitors, COALESCE(ce.clicks, 0) clicks
                 FROM (
                    SELECT ${normalizedPath('path')} path, COUNT(*) views,
                        COUNT(DISTINCT COALESCE(session_id,CONCAT('view-',id))) visitors
                    FROM page_views WHERE created_at >= ? AND created_at < ?
                      AND COALESCE(path,'') NOT LIKE '/admin%'
                    GROUP BY path
                 ) pv
                 LEFT JOIN (
                    SELECT ${normalizedPath('path')} path, COUNT(*) clicks
                    FROM conversion_events WHERE created_at >= ? AND created_at < ?
                      AND event_name IN (${CLICK_EVENTS_SQL_LIST})
                      AND COALESCE(path,'') NOT LIKE '/admin%'
                    GROUP BY path
                 ) ce ON ce.path = pv.path
                 ORDER BY pv.views DESC LIMIT 200`,
                [period.from, period.toExclusive, period.from, period.toExclusive]
            ).then(([result]) => result),
            this.pool.execute(
                `SELECT CASE
                        WHEN referrer IS NULL OR referrer = '' THEN 'Directo / desconocido'
                        WHEN referrer LIKE '%google.%' THEN 'Google'
                        WHEN referrer LIKE '%facebook.%' OR referrer LIKE '%instagram.%' THEN 'Meta'
                        -- Trafico de entornos de desarrollo (localhost, IPs locales, puertos de
                        -- astro dev/preview): no es un origen real, se agrupa aparte para no
                        -- contaminar "Origen" con ruido interno (ver #21).
                        WHEN referrer LIKE '%localhost%' OR referrer LIKE '%127.0.0.1%' THEN 'Entorno de desarrollo (interno)'
                        ELSE SUBSTRING_INDEX(SUBSTRING_INDEX(referrer,'/',3),'//',-1)
                    END source, COUNT(*) views
                 FROM page_views WHERE created_at >= ? AND created_at < ?
                   AND COALESCE(path,'') NOT LIKE '/admin%'
                 GROUP BY source ORDER BY views DESC LIMIT 6`,
                [period.from, period.toExclusive]
            ).then(([result]) => result)
        ]);
        const bucket = rowsByBucket(rows);
        const clickBucket = rowsByBucket(clickRows);

        const pages = pagePerformance.map((row) => ({
            path: row.path, views: numeric(row.views), visitors: numeric(row.visitors), clicks: numeric(row.clicks),
            ctr: numeric(row.views) > 0 ? numeric(row.clicks) / numeric(row.views) : 0
        }));
        const topPages = [...pages].sort((a, b) => b.views - a.views).slice(0, 8);
        const topClickPages = [...pages].filter((p) => p.clicks > 0).sort((a, b) => b.clicks - a.clicks).slice(0, 8);
        const lowClickPages = [...pages]
            .filter((p) => p.views >= LOW_CTR_MIN_VIEWS)
            .sort((a, b) => a.ctr - b.ctr)
            .slice(0, 8);
        // Nota: paginas con 0 vistas nunca entran a lowClickPages (piso LOW_CTR_MIN_VIEWS),
        // para no mezclarlas con paginas de bajo CTR que sí reciben tráfico real.

        return {
            metrics: {
                views: metric({ value: bucket.current.views, previous: bucket.previous.views, coverage: coverage.total,
                    definition: 'Páginas vistas del sitio público registradas por el tracker propio.', source: 'page_views sin rutas /admin' }),
                visitors: metric({ value: bucket.current.visitors, previous: bucket.previous.visitors, coverage: coverage.total,
                    definition: METRIC_DEFINITIONS.visitors, source: 'page_views.session_id sin rutas /admin' }),
                clicks: metric({ value: clickBucket.current.clicks, previous: clickBucket.previous.clicks, coverage: clicksCoverage.total,
                    definition: METRIC_DEFINITIONS.clicks, source: 'conversion_events sin rutas /admin',
                    emptyLabel: 'Tracking activo, sin clicks registrados aún' })
            },
            top_pages: topPages.map(({ path, views, visitors }) => ({ path, views, visitors })),
            top_click_pages: topClickPages.map(({ path, views, clicks }) => ({ path, views, clicks })),
            low_click_pages: lowClickPages.map(({ path, views, clicks, ctr }) => ({ path, views, clicks, ctr: Number((ctr * 100).toFixed(1)) })),
            referrers: referrers.map((row) => ({ source: row.source, views: numeric(row.views) })),
            conversions: numeric(clicksCoverage.total) > 0
                ? { state: 'value', reason: null }
                : { state: 'empty', reason: 'El tracker de clicks está activo (WhatsApp, llamada, ticket, carrito) pero aún no registra eventos.' }
        };
    }

    async inventory(period) {
        const [[snapshot]] = await this.pool.execute(
            `SELECT
                (SELECT COUNT(*) FROM catalog_items WHERE deleted_at IS NULL AND track_stock = 1) tracked_catalog,
                (SELECT COALESCE(SUM(stock_quantity),0) FROM catalog_items WHERE deleted_at IS NULL AND track_stock = 1) catalog_stock,
                (SELECT COUNT(*) FROM catalog_items WHERE deleted_at IS NULL AND track_stock = 1 AND stock_quantity <= minimum_stock) low_stock,
                (SELECT COUNT(*) FROM catalog_items WHERE deleted_at IS NULL AND track_stock = 1 AND stock_quantity = 0) out_of_stock,
                (SELECT COALESCE(SUM(COALESCE(cost_reference,0) * stock_quantity),0) FROM catalog_items WHERE deleted_at IS NULL AND track_stock = 1) catalog_value,
                (SELECT COUNT(*) FROM components WHERE deleted_at IS NULL) legacy_items,
                (SELECT COALESCE(SUM(stock),0) FROM components WHERE deleted_at IS NULL) legacy_stock,
                (SELECT COUNT(*) FROM components WHERE deleted_at IS NULL AND stock <= stock_alert) legacy_low`
        );
        const [movementRows] = await this.pool.execute(
            `${boundsCte()}
             SELECT b.bucket,
                (SELECT COUNT(*) FROM commerce_inventory_movements m WHERE m.created_at >= b.start_at AND m.created_at < b.end_at)
                + (SELECT COUNT(*) FROM inventory_movements m WHERE m.created_at >= b.start_at AND m.created_at < b.end_at) movements,
                (SELECT COUNT(*) FROM repair_parts rp JOIN repairs r ON r.id = rp.repair_id
                    WHERE r.created_at >= b.start_at AND r.created_at < b.end_at AND r.deleted_at IS NULL) repair_parts
             FROM bounds b`,
            boundsParams(period)
        );
        const bucket = rowsByBucket(movementRows);
        const tracked = numeric(snapshot.tracked_catalog) + numeric(snapshot.legacy_items);
        return {
            state: tracked ? 'value' : 'empty',
            snapshot: {
                tracked_items: tracked,
                stock_units: numeric(snapshot.catalog_stock) + numeric(snapshot.legacy_stock),
                low_stock: numeric(snapshot.low_stock) + numeric(snapshot.legacy_low),
                out_of_stock: numeric(snapshot.out_of_stock),
                recorded_value: money(snapshot.catalog_value)
            },
            movements: metric({ value: bucket.current.movements, previous: bucket.previous.movements, coverage: tracked,
                definition: 'Movimientos de inventario registrados en el periodo.', source: 'commerce_inventory_movements + inventory_movements',
                action: { view: 'commerce-inventory' } }),
            parts: {
                state: numeric(bucket.current.repair_parts) ? 'partial' : 'not_configured',
                count: numeric(bucket.current.repair_parts),
                reason: 'repair_parts no contiene estado de compra, pago o recepción.'
            }
        };
    }

    async technicians(period) {
        const [[coverage]] = await this.pool.execute(
            `SELECT (SELECT COUNT(*) FROM technicians WHERE is_active = 1) technicians,
                    (SELECT COUNT(*) FROM repair_assignments) assignments`
        );
        if (!numeric(coverage.technicians) || !numeric(coverage.assignments)) {
            return { state: 'not_configured', items: [], total: numeric(coverage.technicians) };
        }
        const [rows] = await this.pool.execute(
            `SELECT t.id, t.name,
                COUNT(DISTINCT r.id) assigned,
                SUM(r.status = 'delivered') completed,
                SUM(r.status NOT IN ('delivered','cancelled','eliminado')) pending,
                COALESCE(SUM(CASE WHEN r.status IN ('ready','delivered') THEN r.final_cost ELSE 0 END),0) sales
             FROM technicians t JOIN repair_assignments ra ON ra.technician_id = t.id
             JOIN repairs r ON r.id = ra.repair_id
             WHERE t.is_active = 1 AND r.created_at >= ? AND r.created_at < ? AND r.deleted_at IS NULL
             GROUP BY t.id,t.name ORDER BY completed DESC, assigned DESC, t.name LIMIT 8`,
            [period.from, period.toExclusive]
        );
        return {
            state: rows.length ? 'value' : 'empty',
            total: numeric(coverage.technicians),
            items: rows.map((row) => ({
                id: row.id,
                name: row.name,
                assigned: numeric(row.assigned),
                completed: numeric(row.completed),
                pending: numeric(row.pending),
                sales: money(row.sales)
            }))
        };
    }

    async services(period) {
        const [rows] = await this.pool.execute(
            `SELECT name, SUM(quantity) quantity, SUM(revenue) revenue FROM (
                SELECT oi.title_snapshot name, oi.quantity, oi.line_total revenue
                FROM commerce_order_items oi JOIN commerce_orders o ON o.id = oi.order_id
                WHERE o.created_at >= ? AND o.created_at < ?
                  AND o.status IN ('PAID','PREPARING','READY','COMPLETED')
                  AND oi.item_type_snapshot = 'SERVICE'
                UNION ALL
                SELECT service.title name, 1 quantity,
                    CASE WHEN r.status IN ('ready','delivered') THEN COALESCE(r.final_cost,0) ELSE 0 END revenue
                FROM repairs r JOIN services service ON service.id = r.service_id
                WHERE r.created_at >= ? AND r.created_at < ? AND r.deleted_at IS NULL
            ) service_sales GROUP BY name ORDER BY quantity DESC,revenue DESC LIMIT 8`,
            [period.from, period.toExclusive, period.from, period.toExclusive]
        );
        const [[coverage]] = await this.pool.execute(
            `SELECT (SELECT COUNT(*) FROM commerce_order_items WHERE item_type_snapshot = 'SERVICE')
                  + (SELECT COUNT(*) FROM repairs WHERE deleted_at IS NULL AND service_id IS NOT NULL) total`
        );
        return {
            state: numeric(coverage.total) ? (rows.length ? 'value' : 'empty') : 'not_configured',
            items: rows.map((row) => ({ name: row.name, quantity: numeric(row.quantity), revenue: money(row.revenue) }))
        };
    }

    bucketExpression(granularity, field = 'event_at') {
        if (granularity === 'hour') return `DATE_FORMAT(${field},'%Y-%m-%d %H:00:00')`;
        if (granularity === 'week') return `DATE_SUB(DATE(${field}),INTERVAL WEEKDAY(${field}) DAY)`;
        if (granularity === 'month') return `DATE_FORMAT(${field},'%Y-%m-01')`;
        return `DATE(${field})`;
    }

    async series(period, expensesAvailable) {
        const events = [
            `SELECT o.created_at event_at, 'sales' kind, o.total amount FROM commerce_orders o
             WHERE o.created_at >= ? AND o.created_at < ? AND o.status IN ('PAID','PREPARING','READY','COMPLETED')`,
            `SELECT o.created_at, 'sales', o.total FROM orders o
             WHERE o.created_at >= ? AND o.created_at < ? AND o.status IN ('paid','processing','shipped','delivered')`,
            `SELECT COALESCE(r.delivered_at,r.updated_at,r.created_at), 'sales', r.final_cost FROM repairs r
             WHERE COALESCE(r.delivered_at,r.updated_at,r.created_at) >= ? AND COALESCE(r.delivered_at,r.updated_at,r.created_at) < ?
               AND r.deleted_at IS NULL AND r.status IN ('ready','delivered') AND r.final_cost IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM commerce_orders linked WHERE linked.ticket_id = r.id AND linked.status <> 'CANCELLED')`,
            `SELECT DATE_SUB(p.reviewed_at,INTERVAL 5 HOUR), 'collected', p.amount FROM commerce_payments p
             WHERE p.reviewed_at >= DATE_ADD(?,INTERVAL 5 HOUR) AND p.reviewed_at < DATE_ADD(?,INTERVAL 5 HOUR)
               AND p.status IN ('APPROVED','PARTIALLY_REFUNDED','REFUNDED')`,
            `SELECT p.created_at, 'collected', p.amount FROM payments p
             WHERE p.created_at >= ? AND p.created_at < ? AND p.status = 'captured'`,
            `SELECT DATE_SUB(ref.completed_at,INTERVAL 5 HOUR), 'collected', -ref.amount FROM commerce_refunds ref
             WHERE ref.completed_at >= DATE_ADD(?,INTERVAL 5 HOUR) AND ref.completed_at < DATE_ADD(?,INTERVAL 5 HOUR)
               AND ref.status = 'SUCCEEDED'`,
            `SELECT r.created_at, 'tickets', 1 FROM repairs r
             WHERE r.created_at >= ? AND r.created_at < ? AND r.deleted_at IS NULL`,
            `SELECT pv.created_at, 'views', 1 FROM page_views pv
             WHERE pv.created_at >= ? AND pv.created_at < ?
               AND COALESCE(pv.path,'') NOT LIKE '/admin%'`
        ];
        const params = Array(8).fill([period.from, period.toExclusive]).flat();
        if (expensesAvailable) {
            events.push(`SELECT CONCAT(e.incurred_on,' 12:00:00'), 'expenses', e.amount FROM business_expenses e
                WHERE e.incurred_on >= ? AND e.incurred_on < ? AND e.deleted_at IS NULL`);
            params.push(period.from, period.toExclusive);
        }
        const bucket = this.bucketExpression(period.granularity);
        const [rows] = await this.pool.execute(
            `SELECT ${bucket} bucket,
                COALESCE(SUM(CASE WHEN kind = 'sales' THEN amount ELSE 0 END),0) sales,
                COALESCE(SUM(CASE WHEN kind = 'collected' THEN amount ELSE 0 END),0) collected,
                COALESCE(SUM(CASE WHEN kind = 'expenses' THEN amount ELSE 0 END),0) expenses,
                COALESCE(SUM(CASE WHEN kind = 'tickets' THEN amount ELSE 0 END),0) tickets,
                COALESCE(SUM(CASE WHEN kind = 'views' THEN amount ELSE 0 END),0) views
             FROM (${events.join(' UNION ALL ')}) events
             GROUP BY ${bucket} ORDER BY bucket`,
            params
        );
        return rows.map((row) => ({
            bucket: row.bucket,
            sales: money(row.sales),
            collected: money(row.collected),
            expenses: money(row.expenses),
            tickets: numeric(row.tickets),
            views: numeric(row.views)
        }));
    }

    async getCommerceReport(query = {}) {
        const report = await this.getDashboard(query);
        const [recent] = await this.pool.execute(
            `SELECT id,folio,customer_name,total,currency,status,created_at
             FROM commerce_orders ORDER BY created_at DESC,id DESC LIMIT 8`
        );
        const [topProducts] = await this.pool.execute(
            `SELECT oi.title_snapshot name,SUM(oi.quantity) quantity,SUM(oi.line_total) amount
             FROM commerce_order_items oi JOIN commerce_orders o ON o.id = oi.order_id
             WHERE o.created_at >= ? AND o.created_at < ?
               AND o.status IN ('PAID','PREPARING','READY','COMPLETED')
             GROUP BY oi.title_snapshot ORDER BY quantity DESC,amount DESC LIMIT 5`,
            [report.period.from, addDays(report.period.to, 1)]
        );
        return {
            period: report.period.preset,
            metrics: {
                sales: report.finance.metrics.sales.value,
                gross_profit: report.finance.metrics.gross_profit.state === 'value' ? report.finance.metrics.gross_profit.value : null,
                orders: report.operations.commerce.total,
                payment_review: report.operations.attention_now.payment_review,
                average_ticket: report.finance.metrics.average_ticket.value,
                available: report.inventory.snapshot.tracked_items,
                low_stock: report.inventory.snapshot.low_stock
            },
            metric_states: {
                sales: report.finance.metrics.sales.state,
                gross_profit: report.finance.metrics.gross_profit.state,
                orders: report.operations.metrics.total.state,
                payment_review: 'value',
                average_ticket: report.finance.metrics.average_ticket.state,
                available: report.inventory.state,
                low_stock: report.inventory.state
            },
            series: report.series.map((entry) => ({ day: entry.bucket, amount: entry.collected })),
            recent,
            top_products: topProducts
        };
    }

    async listExpenses(query = {}) {
        if (!await this.tableExists('business_expenses')) {
            const error = new Error('El registro de gastos aún no está configurado.');
            error.status = 503;
            throw error;
        }
        const period = resolveDashboardPeriod(query, { now: this.now() });
        const [rows] = await this.pool.execute(
            `SELECT id,public_id,category,description,amount,currency,incurred_on,notes,created_at
             FROM business_expenses WHERE incurred_on >= ? AND incurred_on < ? AND deleted_at IS NULL
             ORDER BY incurred_on DESC,id DESC LIMIT 200`,
            [period.from, period.toExclusive]
        );
        return { period: periodPayload(period), items: rows };
    }

    async createExpense(payload = {}, actor = {}) {
        if (!await this.tableExists('business_expenses')) {
            const error = new Error('El registro de gastos aún no está configurado.');
            error.status = 503;
            throw error;
        }
        const description = String(payload.description || '').trim().slice(0, 180);
        const amount = numeric(payload.amount);
        const category = String(payload.category || 'OTHER').toUpperCase();
        const incurredOn = String(payload.incurred_on || '').slice(0, 10);
        const categories = new Set(['PURCHASE', 'PART', 'OPERATING', 'SERVICE', 'TAX', 'OTHER']);
        let validDate = true;
        try { addDays(incurredOn, 0); } catch (_) { validDate = false; }
        if (!description || amount <= 0 || amount > 9_999_999_999.99 || !validDate || incurredOn > cancunToday(this.now()) || !categories.has(category)) {
            const error = new Error('Descripción, importe, categoría y fecha son obligatorios.');
            error.status = 400;
            throw error;
        }
        const publicId = crypto.randomUUID();
        const notes = String(payload.notes || '').trim().slice(0, 500) || null;
        const [result] = await this.pool.execute(
            `INSERT INTO business_expenses
                (public_id,category,description,amount,currency,incurred_on,created_by,notes)
             VALUES (?,?,?,?,?,?,?,?)`,
            [publicId, category, description, amount.toFixed(2), 'MXN', incurredOn, actor.userId || null, notes]
        );
        const [[created]] = await this.pool.execute(
            `SELECT id,public_id,category,description,amount,currency,incurred_on,notes,created_at
             FROM business_expenses WHERE id = ?`,
            [result.insertId]
        );
        return created;
    }

    async deleteExpense(id) {
        if (!await this.tableExists('business_expenses')) {
            const error = new Error('El registro de gastos aún no está configurado.');
            error.status = 503;
            throw error;
        }
        const expenseId = Number.parseInt(id, 10);
        if (!Number.isInteger(expenseId) || expenseId < 1) {
            const error = new Error('ID de gasto inválido.');
            error.status = 400;
            throw error;
        }
        const [result] = await this.pool.execute(
            'UPDATE business_expenses SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL',
            [expenseId]
        );
        if (!result.affectedRows) {
            const error = new Error('Gasto no encontrado.');
            error.status = 404;
            throw error;
        }
        return true;
    }
}

module.exports = {
    ACTIVE_COMMERCE_STATUSES,
    ACTIVE_REPAIR_STATUSES,
    DashboardService,
    METRIC_DEFINITIONS,
    RECOGNIZED_COMMERCE_STATUSES,
    RECOGNIZED_LEGACY_STATUSES,
    metric,
    percentChange
};
