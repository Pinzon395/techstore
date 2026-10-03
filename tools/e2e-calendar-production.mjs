#!/usr/bin/env node
// E2E del calendario contra un entorno real (crea y limpia citas TEST).
//   PIXON_ADMIN_COOKIE="connect.sid=..." node tools/e2e-calendar-production.mjs https://pixon.com.mx
//   node tools/e2e-calendar-production.mjs http://localhost:3099 --dev-login   (solo local/no-producción)
// Flujo: mes → día disponible → slots → reservas concurrentes (sin sobreventa)
//        → visibilidad admin → confirmación admin → cancelación → slot liberado → limpieza ticket.
import { createClient, reporter, assert } from './lib/e2e-client.mjs';

const args = process.argv.slice(2);
const base = String(args.find((a) => /^https?:\/\//.test(a)) || process.env.BASE_URL || '').replace(/\/+$/, '');
if (!base) { console.error('Uso: node tools/e2e-calendar-production.mjs <BASE_URL> [--dev-login]'); process.exit(2); }
const api = createClient(base, { cookie: process.env.PIXON_ADMIN_COOKIE || '' });
const anon = createClient(base);
const R = reporter();
const runId = `E2E-${Date.now().toString(36)}`;
const TZ = 'America/Cancun';
const created = []; // { appointmentId, ticketId }

if (args.includes('--dev-login')) await R.step('admin session (dev-login local)', () => api.devLogin());

const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const months = [today.slice(0, 7)];
{ const [y, m] = today.split('-').map(Number); months.push(m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`); }

let target = null; // { date, slot }
await R.step('calendar load (config)', async () => {
    const r = await anon.call('GET', '/api/appointments/config');
    assert(r.status === 200 && r.json?.success, `status=${r.status}`);
});
await R.step('month navigation + availability', async () => {
    const summary = [];
    for (const month of months) {
        const r = await anon.call('GET', `/api/appointments/availability/month?month=${month}`);
        assert(r.status === 200 && Array.isArray(r.json?.days), `month ${month} status=${r.status}`);
        summary.push(`${month}:${r.json.days.filter((d) => d.status !== 'CLOSED' && d.status !== 'FULL').length}d`);
        // Se evita "hoy" por lead time; se buscan días futuros con hueco.
        for (const day of r.json.days) {
            if (target || day.date <= today || !['AVAILABLE', 'LIMITED'].includes(day.status)) continue;
            const a = await anon.call('GET', `/api/appointments/availability?date=${day.date}&type=DROP_OFF`);
            const slot = (a.json?.slots || []).filter((s) => s.available).pop(); // el último del día: menos probable que lo use un cliente real
            if (a.status === 200 && slot) target = { date: day.date, slot };
        }
    }
    assert(target, 'no hay días con slots disponibles en los próximos 2 meses');
    return `${summary.join(' ')} → ${target.date} ${target.slot.time} (restante ${target.slot.remaining_capacity}/${target.slot.total_capacity})`;
});
await R.step('timezone (slot en hora local Cancún, sin desfase de día)', async () => {
    assert(String(target.slot.start_at).startsWith(target.date), `start_at=${target.slot.start_at} fecha=${target.date}`);
    assert(String(target.slot.start_at).slice(11, 16) === String(target.slot.time).slice(0, 5), `start_at=${target.slot.start_at} time=${target.slot.time}`);
});

const ATTEMPTS = 5;
let expectedWins = 0;
await R.step(`concurrency: ${ATTEMPTS} reservas simultáneas mismo slot`, async () => {
    expectedWins = Math.min(ATTEMPTS, Math.max(0, Number(target.slot.remaining_capacity) || 0));
    const responses = await Promise.all(Array.from({ length: ATTEMPTS }, (_, i) => anon.call('POST', '/api/appointments/hold', {
        headers: { 'X-Idempotency-Key': `${runId}-${i}` },
        body: {
            customer_name: `TEST ${runId} #${i}`,
            customer_phone: `99800000${String(i).padStart(2, '0')}`,
            appointment_type: 'DROP_OFF',
            service_type: 'E2E_TEST',
            date: target.date,
            time: String(target.slot.time).slice(0, 5),
            customer_notes: `Prueba automatizada ${runId}. Eliminar.`
        }
    })));
    const wins = responses.filter((r) => r.status === 201);
    const conflicts = responses.filter((r) => r.status === 409);
    for (const w of wins) created.push({ appointmentId: w.json.appointment.id, ticketId: w.json.ticket?.id || w.json.appointment.ticket_id });
    const other = responses.filter((r) => r.status !== 201 && r.status !== 409).map((r) => `${r.status}:${r.json?.message || ''}`);
    assert(!other.length, `respuestas inesperadas: ${other.join(' | ')}`);
    assert(wins.length === expectedWins, `éxitos=${wins.length} esperado=${expectedWins} (capacidad restante)`);
    assert(conflicts.length === ATTEMPTS - expectedWins, `conflictos=${conflicts.length}`);
    return `success=${wins.length} conflict=${conflicts.length} NO_OVERBOOKING=PASS`;
});
await R.step('slot lleno tras reservas', async () => {
    const a = await anon.call('GET', `/api/appointments/availability?date=${target.date}&type=DROP_OFF`);
    const slot = (a.json?.slots || []).find((s) => s.time === target.slot.time);
    assert(slot && slot.available === false, `slot sigue disponible: ${JSON.stringify(slot)}`);
});

await R.step('reschedule hacia slot lleno es rechazado', async () => {
    if (!expectedWins) return 'omitido: el slot no tenía capacidad';
    const a = await anon.call('GET', `/api/appointments/availability?date=${target.date}&type=DROP_OFF`);
    const other = (a.json?.slots || []).find((s) => s.available && s.time !== target.slot.time);
    if (!other) return 'omitido: sin otro slot libre ese día';
    const h = await anon.call('POST', '/api/appointments/hold', { headers: { 'X-Idempotency-Key': `${runId}-rs` }, body: {
        customer_name: `TEST ${runId} RS`, customer_phone: '9980000099', appointment_type: 'DROP_OFF', service_type: 'E2E_TEST',
        date: target.date, time: String(other.time).slice(0, 5), customer_notes: `Prueba automatizada ${runId}. Eliminar.`
    } });
    assert(h.status === 201, `hold auxiliar status=${h.status} ${h.json?.message || ''}`);
    created.push({ appointmentId: h.json.appointment.id, ticketId: h.json.ticket?.id || h.json.appointment.ticket_id });
    const r = await anon.call('POST', `/api/appointments/${h.json.appointment.id}/reschedule`, { body: { date: target.date, time: String(target.slot.time).slice(0, 5), reason: runId } });
    assert(r.status !== 200 && /SLOT_NO_LONGER_AVAILABLE/.test(r.json?.message || ''), `status=${r.status} ${r.json?.message || ''}`);
    return `rechazado (${r.status})`;
});

if (api.hasAuth()) {
    await R.step('admin visibility', async () => {
        const r = await api.call('GET', `/api/admin/appointments?from=${target.date}&to=${target.date}`);
        assert(r.status === 200, `status=${r.status}`);
        const ids = new Set((r.json.appointments || []).map((a) => a.id));
        const missing = created.filter((c) => !ids.has(c.appointmentId));
        assert(!missing.length, `${missing.length} citas TEST no visibles en admin`);
        return `${created.length} visibles`;
    });
    await R.step('admin confirmation', async () => {
        const first = created[0];
        assert(first, 'sin cita creada');
        const r = await api.call('PATCH', `/api/admin/appointments/${first.appointmentId}/status`, { body: { status: 'CONFIRMED', reason: runId } });
        assert(r.status === 200, `status=${r.status} ${r.json?.message || ''}`);
    });
} else {
    R.skip('admin visibility', 'sin PIXON_ADMIN_COOKIE');
    R.skip('admin confirmation', 'sin PIXON_ADMIN_COOKIE');
}

await R.step('cancel (cliente)', async () => {
    for (const c of created) {
        const r = await anon.call('POST', `/api/appointments/${c.appointmentId}/cancel`, { body: { reason: `Limpieza ${runId}` } });
        assert(r.status === 200, `cancel ${c.appointmentId} status=${r.status} ${r.json?.message || ''}`);
    }
    return `${created.length} canceladas`;
});
await R.step('slot liberado tras cancelar', async () => {
    const a = await anon.call('GET', `/api/appointments/availability?date=${target.date}&type=DROP_OFF`);
    const slot = (a.json?.slots || []).find((s) => s.time === target.slot.time);
    assert(slot && Number(slot.remaining_capacity) === Number(target.slot.remaining_capacity), `restante=${slot?.remaining_capacity} antes=${target.slot.remaining_capacity}`);
});
if (api.hasAuth()) {
    await R.step('cleanup tickets TEST (soft delete)', async () => {
        for (const c of created.filter((x) => x.ticketId)) {
            const r = await api.call('PATCH', `/api/admin/tickets/${c.ticketId}/delete`, { body: {} });
            assert(r.status === 200, `ticket ${c.ticketId} status=${r.status}`);
        }
        return `${created.length} tickets`;
    });
} else {
    R.skip('cleanup tickets TEST', 'sin PIXON_ADMIN_COOKIE: borrar manualmente tickets con nombre "TEST ' + runId + '"');
}
R.finish(`CALENDAR_E2E ${base}`);
