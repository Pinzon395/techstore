'use strict';

const DASHBOARD_TIME_ZONE = 'America/Cancun';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366 * 5;

const PRESET_ALIASES = Object.freeze({
    '7d': 'last7',
    '30d': 'last30',
    month: 'thisMonth',
    previous_month: 'previousMonth',
    year: 'year',
    day: 'custom'
});

function dateAtUtcMidnight(value) {
    if (!ISO_DATE_PATTERN.test(String(value || ''))) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month - 1
        || date.getUTCDate() !== day
    ) return null;
    return date;
}

function isoDate(date) {
    return date.toISOString().slice(0, 10);
}

function addDays(value, amount) {
    const date = dateAtUtcMidnight(value);
    if (!date) throw invalidPeriod('Fecha invalida. Usa AAAA-MM-DD.');
    date.setUTCDate(date.getUTCDate() + amount);
    return isoDate(date);
}

function daysBetweenInclusive(from, to) {
    const start = dateAtUtcMidnight(from);
    const end = dateAtUtcMidnight(to);
    if (!start || !end) throw invalidPeriod('Rango de fechas inválido.');
    return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function cancunToday(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: DASHBOARD_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(now);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
}

function firstDayOfMonth(value) {
    const date = dateAtUtcMidnight(value);
    if (!date) throw invalidPeriod('Fecha invalida.');
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function lastDayOfPreviousMonth(value) {
    return addDays(firstDayOfMonth(value), -1);
}

function invalidPeriod(message) {
    const error = new Error(message);
    error.status = 400;
    error.code = 'INVALID_DASHBOARD_PERIOD';
    return error;
}

function granularityFor(days) {
    if (days === 1) return 'hour';
    if (days <= 62) return 'day';
    if (days <= 730) return 'week';
    return 'month';
}

function labelFor(preset, from, to) {
    const labels = {
        today: 'Hoy',
        yesterday: 'Ayer',
        last7: 'Últimos 7 días',
        last30: 'Últimos 30 días',
        thisMonth: 'Este mes',
        previousMonth: 'Mes anterior',
        year: 'Año actual'
    };
    if (labels[preset]) return labels[preset];
    return from === to ? from : `${from} a ${to}`;
}

function resolveDashboardPeriod(query = {}, { now = new Date() } = {}) {
    const today = cancunToday(now);
    const requestedPreset = String(query.preset || query.period || 'last30').trim();
    const preset = PRESET_ALIASES[requestedPreset] || requestedPreset;
    let from;
    let to;

    if (preset === 'today') {
        from = today;
        to = today;
    } else if (preset === 'yesterday') {
        from = addDays(today, -1);
        to = from;
    } else if (preset === 'last7') {
        from = addDays(today, -6);
        to = today;
    } else if (preset === 'last30') {
        from = addDays(today, -29);
        to = today;
    } else if (preset === 'thisMonth') {
        from = firstDayOfMonth(today);
        to = today;
    } else if (preset === 'previousMonth') {
        to = lastDayOfPreviousMonth(today);
        from = firstDayOfMonth(to);
    } else if (preset === 'year') {
        from = `${today.slice(0, 4)}-01-01`;
        to = today;
    } else if (preset === 'custom') {
        from = String(query.from || '').trim();
        to = String(query.to || query.from || '').trim();
        if (!dateAtUtcMidnight(from) || !dateAtUtcMidnight(to)) {
            throw invalidPeriod('Selecciona una fecha inicial y final válidas.');
        }
    } else {
        throw invalidPeriod('Periodo no reconocido.');
    }

    const days = daysBetweenInclusive(from, to);
    if (days < 1) throw invalidPeriod('La fecha inicial no puede ser posterior a la final.');
    if (days > MAX_RANGE_DAYS) throw invalidPeriod('El rango máximo permitido es de cinco años.');

    const previousTo = addDays(from, -1);
    const previousFrom = addDays(previousTo, -(days - 1));

    return Object.freeze({
        preset,
        label: labelFor(preset, from, to),
        from,
        to,
        toExclusive: addDays(to, 1),
        days,
        granularity: granularityFor(days),
        timezone: DASHBOARD_TIME_ZONE,
        previous: Object.freeze({
            from: previousFrom,
            to: previousTo,
            toExclusive: from,
            days
        })
    });
}

module.exports = {
    DASHBOARD_TIME_ZONE,
    MAX_RANGE_DAYS,
    addDays,
    cancunToday,
    daysBetweenInclusive,
    granularityFor,
    resolveDashboardPeriod
};
