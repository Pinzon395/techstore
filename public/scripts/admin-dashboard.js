'use strict';

(() => {
    const root = document.getElementById('view-dashboard');
    if (!root || window.PixonDashboard) return;

    const moneyFormatter = new Intl.NumberFormat('es-MX', {
        style: 'currency', currency: 'MXN', maximumFractionDigits: 0
    });
    const numberFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
    const periodKey = 'pixon_admin_dashboard_period_v1';
    const statusLabels = {
        new: 'Recibida', received: 'Recepción', diagnosing: 'Diagnóstico', contacted: 'Contactado',
        quoted: 'Esperando aprobación', approved: 'Aprobada', in_progress: 'Reparación',
        waiting_parts: 'Esperando pieza', ready: 'Por entregar', delivered: 'Entregada',
        cancelled: 'Cancelada', eliminado: 'Eliminada', PENDING_PAYMENT: 'Pago pendiente',
        PAYMENT_REVIEW: 'Revisar pago', PAID: 'Pagada', PREPARING: 'Preparación',
        READY: 'Por entregar', COMPLETED: 'Completada', CANCELLED: 'Cancelada'
    };
    const state = {
        period: readPeriod(),
        report: null,
        series: 'collected',
        request: null,
        initialized: false
    };

    function readPeriod() {
        try {
            const saved = JSON.parse(sessionStorage.getItem(periodKey) || 'null');
            if (saved && typeof saved.preset === 'string') return saved;
        } catch (_) {}
        return { preset: 'last30' };
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatValue(value, format) {
        const numeric = Number(value || 0);
        return format === 'currency' ? moneyFormatter.format(numeric) : numberFormatter.format(numeric);
    }

    function metricValue(metric) {
        if (!metric || metric.state === 'error') return 'Error al cargar';
        if (!metric || metric.state === 'unavailable') return 'No configurado';
        if (metric.state === 'empty') return metric.empty_label || 'Sin registros';
        return formatValue(metric.value, metric.format);
    }

    function comparisonText(metric) {
        if (!metric || metric.state !== 'value' || !metric.comparison) return metric?.state === 'value' ? 'Sin comparación' : '';
        const comparison = metric.comparison;
        if (comparison.direction === 'stable') return 'Sin cambio vs. periodo anterior';
        if (comparison.direction === 'new') return 'Nuevo en este periodo';
        const arrow = comparison.direction === 'up' ? '↑' : '↓';
        return `${arrow} ${numberFormatter.format(Math.abs(comparison.percent || 0))}% vs. periodo anterior`;
    }

    function metricRow(label, metric, actionLabel = '') {
        const comparison = comparisonText(metric);
        const sentiment = escapeHtml(metric?.comparison?.sentiment || 'neutral');
        return `<div class="dashboard-metric-row">
            <span>${escapeHtml(label)}</span>
            <strong class="metric-state-${escapeHtml(metric?.state || 'unavailable')}">${escapeHtml(metricValue(metric))}</strong>
            <small class="is-${sentiment}">${escapeHtml(comparison)}</small>
            ${actionLabel ? `<button type="button" class="command-link" data-metric-action="${escapeHtml(actionLabel)}" aria-label="Abrir ${escapeHtml(label)}">↗</button>` : ''}
        </div>`;
    }

    function sectionError(container, label) {
        container.innerHTML = `<div class="dashboard-empty"><strong>No se pudo cargar ${escapeHtml(label)}</strong><span>Las demás secciones siguen disponibles.</span><button type="button" data-dashboard-retry>Reintentar</button></div>`;
    }

    function setLoading() {
        root.querySelectorAll('[data-dashboard-kpi]').forEach((card) => {
            card.className = 'command-kpi is-loading';
            card.querySelector('[data-kpi-value]').textContent = '—';
            card.querySelector('[data-kpi-change]').textContent = 'Cargando…';
        });
        ['dashboard-operations', 'dashboard-series'].forEach((id) => {
            const element = document.getElementById(id);
            if (!element) return;
            element.className = 'dashboard-panel-body dashboard-skeleton';
            element.setAttribute('aria-busy', 'true');
            element.innerHTML = '<span></span><span></span><span></span>';
        });
        document.getElementById('dashboard-kpis')?.setAttribute('aria-busy', 'true');
        root.querySelectorAll('.command-disclosure').forEach((details) => details.setAttribute('aria-busy', 'true'));
        root.querySelectorAll('.disclosure-body').forEach((body) => body.setAttribute('aria-busy', 'true'));
        if (!state.report) {
            root.querySelectorAll('[data-dashboard-summary]').forEach((summary) => { summary.textContent = 'Cargando…'; });
        }
        setStatus('Actualizando todas las métricas…', 'loading');
    }

    function setStatus(message, type = '') {
        const element = document.getElementById('dashboard-status');
        if (!element) return;
        element.className = `dashboard-status${type ? ` is-${type}` : ''}`;
        element.textContent = message || '';
    }

    function queryString() {
        const params = new URLSearchParams({ preset: state.period.preset || 'last30' });
        if (state.period.preset === 'custom') {
            params.set('from', state.period.from || '');
            params.set('to', state.period.to || state.period.from || '');
        }
        return params.toString();
    }

    async function refresh({ quiet = false } = {}) {
        state.request?.abort();
        state.request = new AbortController();
        if (!quiet) setLoading();
        const refreshButton = document.getElementById('dashboard-refresh-btn');
        refreshButton?.classList.add('is-refreshing');
        try {
            const response = await fetch(`/api/admin/dashboard?${queryString()}`, {
                credentials: 'include', signal: state.request.signal,
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.message || body.error || `No se pudo cargar el Dashboard (HTTP ${response.status})`);
            }
            state.report = await response.json();
            state.period = {
                preset: state.report.period.preset,
                from: state.report.period.from,
                to: state.report.period.to
            };
            sessionStorage.setItem(periodKey, JSON.stringify(state.period));
            render();
        } catch (error) {
            if (error.name === 'AbortError') return;
            renderError(error);
        } finally {
            refreshButton?.classList.remove('is-refreshing');
        }
    }

    function render() {
        const report = state.report;
        if (!report) return;
        const periodLabel = document.getElementById('dashboard-period-label');
        const periodSummary = document.getElementById('dashboard-period-summary');
        if (periodLabel) periodLabel.textContent = report.period.label;
        if (periodSummary) {
            periodSummary.textContent = `${report.period.from} a ${report.period.to} · comparado con ${report.period.previous.from} a ${report.period.previous.to}`;
        }
        document.getElementById('dashboard-period-from').value = report.period.from;
        document.getElementById('dashboard-period-to').value = report.period.to;
        root.querySelectorAll('[data-dashboard-preset]').forEach((button) => {
            if (button.dataset.dashboardPreset === report.period.preset) button.setAttribute('aria-current', 'true');
            else button.removeAttribute('aria-current');
        });
        setStatus(`Actualizado ${new Date(report.generated_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`, 'ready');
        renderKpis();
        renderOperations();
        renderSeries();
        renderFinance();
        renderCustomers();
        renderServices();
        renderInventory();
        renderTraffic();
        renderQuality();
        root.querySelectorAll('.command-disclosure').forEach((details) => details.setAttribute('aria-busy', 'false'));
    }

    function renderKpis() {
        root.querySelectorAll('[data-dashboard-kpi]').forEach((card) => {
            const key = card.dataset.dashboardKpi;
            const metric = state.report.kpis[key];
            if (!metric) return;
            card.className = `command-kpi state-${metric.state}`;
            card.title = metric.definition || '';
            card.dataset.action = JSON.stringify(metric.action || null);
            card.querySelector('[data-kpi-value]').textContent = metricValue(metric);
            const change = card.querySelector('[data-kpi-change]');
            change.textContent = comparisonText(metric) || metric.definition || '';
            change.className = `command-kpi-change is-${metric.comparison?.sentiment || 'neutral'}`;
        });
        document.getElementById('dashboard-kpis')?.setAttribute('aria-busy', 'false');
    }

    function renderOperations() {
        const operation = state.report.operations;
        const container = document.getElementById('dashboard-operations');
        if (operation.state === 'error') {
            container.className = 'dashboard-panel-body';
            container.setAttribute('aria-busy', 'false');
            sectionError(container, 'la operación');
            return;
        }
        const statusEntries = [
            ...Object.entries(operation.repairs.statuses || {}),
            ...Object.entries(operation.commerce.statuses || {})
        ].filter(([, count]) => Number(count) > 0);
        const total = Number(operation.metrics.total.value || 0);
        const attention = operation.attention_now || {};
        container.className = 'dashboard-panel-body';
        container.setAttribute('aria-busy', 'false');
        container.innerHTML = `<div class="operations-lead">
                <strong>${numberFormatter.format(total)}</strong><span>órdenes creadas</span>
                <small>${escapeHtml(comparisonText(operation.metrics.total))}</small>
            </div>
            <div class="operation-statuses">
                ${statusEntries.length ? statusEntries.map(([key, count]) => `<button type="button" data-operation-status="${escapeHtml(key)}"><span>${escapeHtml(statusLabels[key] || key)}</span><strong>${numberFormatter.format(count)}</strong></button>`).join('') : '<p class="dashboard-empty">No hay órdenes creadas en este periodo.</p>'}
            </div>
            <div class="attention-strip" aria-label="Atención inmediata">
                <button type="button" data-operation-action="urgent"><strong>${numberFormatter.format(attention.urgent || 0)}</strong> urgentes</button>
                <button type="button" data-operation-action="overdue"><strong>${numberFormatter.format(attention.overdue || 0)}</strong> atrasadas</button>
                <button type="button" data-operation-action="ready"><strong>${numberFormatter.format(attention.ready || 0)}</strong> por entregar</button>
                <button type="button" data-operation-action="payment_review"><strong>${numberFormatter.format(attention.payment_review || 0)}</strong> pagos por revisar</button>
            </div>`;
    }

    function renderSeries() {
        const container = document.getElementById('dashboard-series');
        const labels = { collected: 'Ingresos en el tiempo', sales: 'Ventas en el tiempo', tickets: 'Órdenes por periodo', views: 'Tráfico en el tiempo' };
        const values = (state.report.series || []).map((entry) => Number(entry[state.series] || 0));
        const max = Math.max(...values, 0);
        document.getElementById('dashboard-series-title').textContent = labels[state.series];
        root.querySelectorAll('[data-dashboard-series]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.dashboardSeries === state.series));
        });
        container.className = 'dashboard-panel-body';
        container.setAttribute('aria-busy', 'false');
        if (state.report.data_quality?.some((item) => item.key === 'series' && item.state === 'error')) {
            sectionError(container, 'la tendencia');
            return;
        }
        if (!values.length || max === 0) {
            container.innerHTML = `<div class="dashboard-empty"><strong>Sin registros para esta serie</strong><span>El cero no se sustituye con una estimación. Puedes revisar otra señal del periodo.</span></div>`;
            return;
        }
        const format = ['sales', 'collected'].includes(state.series) ? 'currency' : 'integer';
        container.innerHTML = `<figure class="command-chart">
            <div class="command-chart-bars" style="--chart-columns:${values.length}">
                ${state.report.series.map((entry, index) => {
                    const value = values[index];
                    const height = Math.max(value > 0 ? 4 : 0, (value / max) * 100);
                    return `<div class="command-chart-column" title="${escapeHtml(entry.bucket)}: ${escapeHtml(formatValue(value, format))}">
                        <span class="command-chart-value">${escapeHtml(formatValue(value, format))}</span>
                        <i style="height:${height}%"></i><small>${escapeHtml(shortBucket(entry.bucket))}</small>
                    </div>`;
                }).join('')}
            </div>
            <figcaption>${escapeHtml(state.report.period.granularity === 'hour' ? 'Por hora' : state.report.period.granularity === 'week' ? 'Por semana' : state.report.period.granularity === 'month' ? 'Por mes' : 'Por día')}</figcaption>
        </figure>`;
    }

    function shortBucket(bucket) {
        const value = String(bucket || '');
        const match = value.match(/(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):00)?/);
        if (!match) return value.slice(-5);
        return match[4] ? `${match[4]}h` : `${match[3]}/${match[2]}`;
    }

    function renderFinance() {
        const finance = state.report.finance;
        const container = document.getElementById('dashboard-finance');
        container.setAttribute('aria-busy', 'false');
        if (finance.state === 'error') {
            document.querySelector('[data-dashboard-summary="finance"]').textContent = 'Error al cargar';
            sectionError(container, 'finanzas');
            return;
        }
        document.querySelector('[data-dashboard-summary="finance"]').textContent = `${metricValue(finance.metrics.collected)} cobrados`;
        container.innerHTML = `<div class="dashboard-detail-grid">
            ${metricRow('Ventas', finance.metrics.sales, 'commerce-dashboard')}
            ${metricRow('Ingresos cobrados', finance.metrics.collected, 'commerce-payments')}
            ${metricRow('Pagos pendientes', finance.metrics.pending, 'commerce-payments')}
            ${metricRow('Gastos', finance.metrics.expenses)}
            ${metricRow('Utilidad bruta', finance.metrics.gross_profit)}
            ${metricRow('Utilidad operativa', finance.metrics.operating_profit)}
            ${metricRow('Ticket promedio', finance.metrics.average_ticket, 'commerce-orders')}
        </div>
        <div class="dashboard-inline-facts">
            <span><small>Abonos aprobados</small><strong>${moneyFormatter.format(Number(finance.detail.cash_in || 0))}</strong></span>
            <span><small>Reembolsos</small><strong>${moneyFormatter.format(Number(finance.detail.refunds || 0))}</strong></span>
            <span><small>Margen</small><strong>${finance.detail.margin === null ? 'Sin datos' : `${numberFormatter.format(finance.detail.margin)}%`}</strong></span>
            <span><small>Compras</small><strong>${finance.metrics.expenses.state === 'unavailable' ? 'No configurado' : moneyFormatter.format(Number(finance.detail.expense_categories?.purchases || 0))}</strong></span>
            <span><small>Piezas</small><strong>${finance.metrics.expenses.state === 'unavailable' ? 'No configurado' : moneyFormatter.format(Number(finance.detail.expense_categories?.parts || 0))}</strong></span>
        </div>
        ${finance.detail.payment_methods?.length ? `<div class="payment-methods"><h4>Métodos de pago</h4>${finance.detail.payment_methods.map((item) => `<span><small>${escapeHtml(paymentLabel(item.method))}</small><strong>${moneyFormatter.format(Number(item.amount || 0))}</strong></span>`).join('')}</div>` : ''}
        ${finance.metrics.expenses.state === 'unavailable'
            ? '<p class="dashboard-config-note">El registro contable de gastos requiere aplicar la migración preparada. Hasta entonces la utilidad permanece sin calcular.</p>'
            : `<details class="expense-entry"><summary>Registrar gasto</summary>${expenseForm()}</details>`}`;
    }

    function expenseForm() {
        return `<form id="dashboard-expense-form" class="expense-form">
            <label>Concepto<input name="description" maxlength="180" required placeholder="Ej. Compra de consumibles" /></label>
            <label>Importe<input name="amount" type="number" min="0.01" step="0.01" required /></label>
            <label>Fecha<input name="incurred_on" type="date" value="${escapeHtml(state.report.period.to)}" required /></label>
            <label>Categoría<select name="category"><option value="PURCHASE">Compra</option><option value="PART">Pieza</option><option value="OPERATING">Operación</option><option value="SERVICE">Servicio</option><option value="TAX">Impuesto</option><option value="OTHER">Otro</option></select></label>
            <label class="expense-notes">Notas<input name="notes" maxlength="500" /></label>
            <button type="submit">Guardar gasto</button>
        </form>`;
    }

    function renderCustomers() {
        const customers = state.report.customers;
        const appointments = state.report.appointments;
        const container = document.getElementById('dashboard-customers');
        container.setAttribute('aria-busy', 'false');
        if (customers.state === 'error' || appointments.state === 'error') {
            document.querySelector('[data-dashboard-summary="customers"]').textContent = 'Datos parciales';
            sectionError(container, 'clientes y citas');
            return;
        }
        document.querySelector('[data-dashboard-summary="customers"]').textContent = `${metricValue(customers.metrics.new_customers)} nuevos · ${metricValue(appointments.metric)} citas`;
        container.innerHTML = `<div class="dashboard-detail-grid">
            ${metricRow('Clientes nuevos', customers.metrics.new_customers, 'users')}
            ${metricRow('Clientes activos', customers.metrics.active_customers)}
            ${metricRow('Recurrentes', customers.metrics.returning_customers)}
            ${metricRow('Frecuencia por cliente', customers.metrics.frequency)}
            ${metricRow('Con pago pendiente', customers.metrics.pending_customers, 'commerce-payments')}
            ${metricRow('Citas del periodo', appointments.metric, 'repairs')}
        </div>
        <div class="dashboard-inline-facts">
            <span><small>Clientes registrados</small><strong>${numberFormatter.format(customers.lifetime || 0)}</strong></span>
            ${Object.entries(appointments.statuses || {}).map(([key, count]) => `<span><small>${escapeHtml(appointmentLabel(key))}</small><strong>${numberFormatter.format(count)}</strong></span>`).join('')}
        </div>`;
    }

    function appointmentLabel(key) {
        return ({ pending: 'Pendientes', confirmed: 'Confirmadas', rescheduled: 'Reagendadas', completed: 'Completadas', cancelled: 'Canceladas', overdue: 'Atrasadas' })[key] || key;
    }

    function paymentLabel(method) {
        return ({ CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', BANK_TRANSFER: 'Transferencia', DEPOSIT: 'Depósito', OTHER: 'Otro' })[String(method || '').toUpperCase()] || String(method || 'Otro');
    }

    function renderServices() {
        const services = state.report.services;
        const technicians = state.report.technicians;
        const container = document.getElementById('dashboard-services');
        container.setAttribute('aria-busy', 'false');
        if (services.state === 'error' || technicians.state === 'error') {
            document.querySelector('[data-dashboard-summary="services"]').textContent = 'Datos parciales';
            sectionError(container, 'servicios y técnicos');
            return;
        }
        const available = services.state === 'value' || technicians.state === 'value';
        document.querySelector('[data-dashboard-summary="services"]').textContent = available ? `${services.items.length} servicios · ${technicians.total} técnicos` : 'Sin datos suficientes';
        container.innerHTML = `<div class="dashboard-split-list">
            <section><h4>Servicios con demanda</h4>${renderRankedItems(services.items, 'name', 'quantity', 'Sin servicios clasificados en el periodo.')}</section>
            <section><h4>Carga técnica</h4>${renderRankedItems(technicians.items, 'name', 'completed', technicians.state === 'not_configured' ? 'No hay técnicos ni asignaciones registradas.' : 'Sin trabajos asignados en el periodo.')}</section>
        </div>`;
    }

    function renderRankedItems(items = [], labelKey, valueKey, empty) {
        if (!items.length) return `<p class="dashboard-empty">${escapeHtml(empty)}</p>`;
        return `<ol class="dashboard-ranked-list">${items.map((item) => `<li><span title="${escapeHtml(item[labelKey] || 'Sin clasificar')}">${escapeHtml(item[labelKey] || 'Sin clasificar')}</span><strong>${numberFormatter.format(item[valueKey] || 0)}</strong></li>`).join('')}</ol>`;
    }

    function renderInventory() {
        const inventory = state.report.inventory;
        const snapshot = inventory.snapshot;
        const container = document.getElementById('dashboard-inventory');
        container.setAttribute('aria-busy', 'false');
        if (inventory.state === 'error') {
            document.querySelector('[data-dashboard-summary="inventory"]').textContent = 'Error al cargar';
            sectionError(container, 'inventario y piezas');
            return;
        }
        document.querySelector('[data-dashboard-summary="inventory"]').textContent = snapshot.tracked_items ? `${numberFormatter.format(snapshot.low_stock)} en stock bajo` : 'Sin inventario rastreado';
        container.innerHTML = `<div class="dashboard-inline-facts">
            <span><small>Artículos rastreados</small><strong>${numberFormatter.format(snapshot.tracked_items)}</strong></span>
            <span><small>Unidades</small><strong>${numberFormatter.format(snapshot.stock_units)}</strong></span>
            <span><small>Stock bajo</small><strong>${numberFormatter.format(snapshot.low_stock)}</strong></span>
            <span><small>Sin stock</small><strong>${numberFormatter.format(snapshot.out_of_stock)}</strong></span>
            <span><small>Valor registrado</small><strong>${moneyFormatter.format(Number(snapshot.recorded_value || 0))}</strong></span>
        </div>
        <div class="dashboard-detail-grid">${metricRow('Movimientos del periodo', inventory.movements, 'commerce-inventory')}</div>
        ${inventory.parts.state === 'not_configured' ? `<p class="dashboard-config-note">${escapeHtml(inventory.parts.reason)}</p>` : ''}`;
    }

    function renderTraffic() {
        const traffic = state.report.traffic;
        const container = document.getElementById('dashboard-traffic');
        container.setAttribute('aria-busy', 'false');
        if (traffic.state === 'error') {
            document.querySelector('[data-dashboard-summary="traffic"]').textContent = 'Error al cargar';
            sectionError(container, 'tráfico web');
            return;
        }
        document.querySelector('[data-dashboard-summary="traffic"]').textContent = `${metricValue(traffic.metrics.visitors)} visitantes`;
        container.innerHTML = `<div class="dashboard-detail-grid">
            ${metricRow('Páginas vistas', traffic.metrics.views)}
            ${metricRow('Visitantes', traffic.metrics.visitors)}
        </div>
        <div class="dashboard-split-list">
            <section><h4>Páginas principales</h4>${renderRankedItems(traffic.top_pages, 'path', 'views', 'Sin visitas en este periodo.')}</section>
            <section><h4>Origen</h4>${renderRankedItems(traffic.referrers, 'source', 'views', 'Sin referencias identificables.')}</section>
        </div>
        ${traffic.conversions.state === 'not_configured' ? `<p class="dashboard-config-note">Conversiones: ${escapeHtml(traffic.conversions.reason)}</p>` : ''}`;
    }

    function renderQuality() {
        const quality = state.report.data_quality || [];
        const container = document.getElementById('dashboard-data-quality');
        container.hidden = quality.length === 0;
        if (!quality.length) return;
        container.querySelector('[data-quality-count]').textContent = quality.length;
        container.querySelector('[data-quality-list]').innerHTML = quality.map((item) => `<li><strong>${escapeHtml(item.key)}</strong><span>${escapeHtml(item.message)}</span></li>`).join('');
    }

    function renderError(error) {
        if (state.report) {
            setStatus(`${error.message}. Se conserva la última lectura correcta.`, 'error');
            return;
        }
        setStatus(error.message, 'error');
        root.querySelectorAll('[data-dashboard-kpi]').forEach((card) => {
            card.className = 'command-kpi state-error';
            card.querySelector('[data-kpi-value]').textContent = 'Error';
            card.querySelector('[data-kpi-change]').textContent = 'No se sustituyó por cero';
        });
        ['dashboard-operations', 'dashboard-series'].forEach((id) => {
            const element = document.getElementById(id);
            element.className = 'dashboard-panel-body';
            element.innerHTML = '<div class="dashboard-empty"><strong>No se pudieron obtener los datos</strong><button type="button" data-dashboard-retry>Reintentar</button></div>';
        });
        ['finance', 'customers', 'services', 'inventory', 'traffic'].forEach((key) => {
            const element = document.getElementById(`dashboard-${key}`);
            if (!element) return;
            element.setAttribute('aria-busy', 'false');
            sectionError(element, key === 'customers' ? 'clientes y citas' : key);
            const summary = document.querySelector(`[data-dashboard-summary="${key}"]`);
            if (summary) summary.textContent = 'Error al cargar';
        });
        root.querySelectorAll('.command-disclosure').forEach((details) => details.setAttribute('aria-busy', 'false'));
    }

    function openPeriod(open, restoreFocus = false) {
        const trigger = document.getElementById('dashboard-period-trigger');
        const popover = document.getElementById('dashboard-period-popover');
        popover.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
        if (open) popover.querySelector('button, input')?.focus();
        else if (restoreFocus) trigger.focus();
    }

    function navigate(action) {
        if (!action) return;
        if (action.type === 'expense') {
            const details = document.getElementById('dashboard-finance')?.closest('details');
            if (details) details.open = true;
            const form = document.getElementById('dashboard-expense-form');
            if (form) form.querySelector('input')?.focus();
            else {
                details?.scrollIntoView({ block: 'center' });
                setStatus('El registro de gastos aún no está configurado; la utilidad no se inventa.', 'error');
            }
            return;
        }
        const view = action.view;
        if (!view) return;
        document.querySelector(`[data-view="${CSS.escape(view)}"]`)?.click();
        window.setTimeout(() => applyModuleFilter(action), 50);
    }

    function applyModuleFilter(action) {
        if (action.view !== 'repairs') return;
        if (action.tab === 'appointments') document.getElementById('repairTabAgenda')?.click();
        const status = document.getElementById('repairStatusFilter');
        const priority = document.getElementById('repairUrgencyFilter');
        if (action.filter && status && Array.from(status.options).some((option) => option.value === action.filter)) {
            status.value = action.filter;
            status.dispatchEvent(new Event('change'));
        }
        if (action.filter === 'urgent' && priority) { priority.value = 'urgent'; priority.dispatchEvent(new Event('change')); }
    }

    async function submitExpense(form) {
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        try {
            const payload = Object.fromEntries(new FormData(form).entries());
            const response = await fetch('/api/admin/dashboard/expenses', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
                body: JSON.stringify(payload)
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.message || body.error || 'No se pudo registrar el gasto.');
            setStatus('Gasto registrado y Dashboard recalculado.', 'ready');
            await refresh({ quiet: true });
        } catch (error) {
            setStatus(error.message, 'error');
        } finally {
            button.disabled = false;
        }
    }

    function bind() {
        document.getElementById('dashboard-period-trigger')?.addEventListener('click', (event) => {
            event.stopPropagation();
            openPeriod(document.getElementById('dashboard-period-popover').hidden);
        });
        root.querySelectorAll('[data-dashboard-preset]').forEach((button) => {
            button.addEventListener('click', () => {
                state.period = { preset: button.dataset.dashboardPreset };
                openPeriod(false, true);
                refresh();
            });
        });
        document.getElementById('dashboard-custom-period')?.addEventListener('submit', (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const from = String(form.get('from') || '');
            const to = String(form.get('to') || '');
            if (!from || !to || from > to) {
                setStatus('Selecciona un rango de fechas válido.', 'error');
                return;
            }
            state.period = { preset: 'custom', from, to };
            openPeriod(false, true);
            refresh();
        });
        document.getElementById('dashboard-refresh-btn')?.addEventListener('click', () => refresh());
        root.addEventListener('click', (event) => {
            const retry = event.target.closest('[data-dashboard-retry]');
            if (retry) return refresh();
            const seriesButton = event.target.closest('[data-dashboard-series]');
            if (seriesButton) { state.series = seriesButton.dataset.dashboardSeries; return renderSeries(); }
            const kpi = event.target.closest('[data-dashboard-kpi]');
            if (kpi) {
                try { return navigate(JSON.parse(kpi.dataset.action || 'null')); } catch (_) { return; }
            }
            const metricAction = event.target.closest('[data-metric-action]');
            if (metricAction) return navigate({ view: metricAction.dataset.metricAction });
            const status = event.target.closest('[data-operation-status]');
            if (status) {
                const filter = String(status.dataset.operationStatus);
                return navigate({ view: filter === filter.toUpperCase() ? 'commerce-orders' : 'repairs', filter: filter.toLowerCase() });
            }
            const operation = event.target.closest('[data-operation-action]');
            if (operation) {
                const filter = operation.dataset.operationAction;
                return navigate({ view: filter === 'payment_review' ? 'commerce-payments' : 'repairs', filter });
            }
        });
        root.addEventListener('submit', (event) => {
            if (event.target.id !== 'dashboard-expense-form') return;
            event.preventDefault();
            submitExpense(event.target);
        });
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.dashboard-period-control')) openPeriod(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') openPeriod(false, true);
        });
        window.addEventListener('admin:switch-view', (event) => {
            if (event.detail?.view === 'dashboard' && state.initialized) refresh({ quiet: true });
        });
        window.addEventListener('admin:data-changed', () => {
            if (state.initialized) refresh({ quiet: true });
        });
    }

    bind();
    state.initialized = true;
    window.PixonDashboard = { refresh, setPeriod: (period) => { state.period = period; return refresh(); } };
    refresh();
})();
