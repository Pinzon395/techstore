#!/usr/bin/env node
// E2E de administración contra un entorno real. Crea registros TEST y los revierte.
//   PIXON_ADMIN_COOKIE="connect.sid=..." node tools/e2e-admin-production.mjs https://pixon.com.mx
//   node tools/e2e-admin-production.mjs http://localhost:3099 --dev-login   (solo local/no-producción)
// La cookie se obtiene de DevTools → Application → Cookies tras iniciar sesión con Google.
import { createClient, reporter, assert } from './lib/e2e-client.mjs';

const args = process.argv.slice(2);
const base = String(args.find((a) => /^https?:\/\//.test(a)) || process.env.BASE_URL || '').replace(/\/+$/, '');
if (!base) { console.error('Uso: node tools/e2e-admin-production.mjs <BASE_URL> [--dev-login]'); process.exit(2); }
const api = createClient(base, { cookie: process.env.PIXON_ADMIN_COOKIE || '' });
const anon = createClient(base);
const R = reporter();
const runId = `E2E-${Date.now().toString(36)}`;

if (args.includes('--dev-login')) await R.step('admin session (dev-login local)', () => api.devLogin());
if (!api.hasAuth()) { console.error('Falta PIXON_ADMIN_COOKIE (o --dev-login en local).'); process.exit(2); }

await R.step('AUTH /api/me rol admin', async () => {
    const r = await api.call('GET', '/api/me');
    assert(r.status === 200 && r.json?.user?.role === 'admin', `status=${r.status} role=${r.json?.user?.role}`);
});
await R.step('AUTH roles: anónimo bloqueado en admin', async () => {
    for (const p of ['/api/admin/dashboard', '/api/admin/repairs', '/api/admin/appointments', '/api/admin/users', '/api/admin/commerce/catalog']) {
        const r = await anon.call('GET', p);
        assert([401, 403].includes(r.status), `${p} status=${r.status}`);
    }
});

const reads = {
    ADMIN_DASHBOARD: '/api/admin/dashboard',
    ADMIN_KPIS: '/api/admin/kpis',
    ADMIN_REPAIRS: '/api/admin/repairs',
    ADMIN_TICKETS_RECENT: '/api/admin/tickets/recent',
    ADMIN_APPOINTMENTS: '/api/admin/appointments',
    ADMIN_APPOINTMENTS_TODAY: '/api/admin/appointments/today',
    ADMIN_COMMENTS: '/api/admin/comments',
    ADMIN_USERS: '/api/admin/users',
    ADMIN_TECHNICIANS: '/api/admin/technicians',
    ADMIN_STORE_CATALOG: '/api/admin/commerce/catalog',
    ADMIN_STORE_ORDERS: '/api/admin/commerce/orders',
    ADMIN_EMAIL_HEALTH: '/api/admin/email-health',
    ADMIN_FAQS_UNANSWERED: '/api/admin/faqs/unanswered',
    ADMIN_ANALYTICS: '/api/admin/analytics/summary'
};
for (const [name, path] of Object.entries(reads)) {
    await R.step(`${name} (read ${path})`, async () => {
        const r = await api.call('GET', path);
        assert(r.status === 200 && r.json !== null, `status=${r.status} ${r.json?.message || r.json?.error || r.text.slice(0, 80)}`);
    });
}

// REPAIRS / TICKETS: create → read → update → status → admin visibility → soft delete
let repair = null;
await R.step('REPAIRS_CREATE', async () => {
    const r = await api.call('POST', '/api/admin/repairs', { body: {
        user_name: `TEST ${runId}`, device_type: 'Laptop', device_brand: 'TEST', device_model: runId,
        reported_issue: `Registro de prueba automatizada ${runId}. Eliminar.`, contact_phone: '9980000000', status: 'received'
    } });
    assert(r.status === 201 && r.json?.repair?.id, `status=${r.status} ${r.json?.message || ''}`);
    repair = r.json.repair;
    return `#${repair.ticket_code}`;
});
if (repair) {
    await R.step('REPAIRS_READ', async () => {
        const r = await api.call('GET', `/api/admin/repairs/${repair.id}`);
        assert(r.status === 200 && r.json?.ticket?.id === repair.id, `status=${r.status}`);
    });
    await R.step('REPAIRS_UPDATE (diagnóstico/notas)', async () => {
        const r = await api.call('PATCH', `/api/admin/repairs/${repair.id}`, { body: { notes_internal: `Nota TEST ${runId}` } });
        assert(r.status === 200, `status=${r.status} ${r.json?.message || ''}`);
        const back = await api.call('GET', `/api/admin/repairs/${repair.id}`);
        assert(String(back.json?.ticket?.notes_internal || '').includes(runId), 'la nota no persistió');
    });
    await R.step('REPAIRS_STATUS received→diagnosing', async () => {
        const r = await api.call('PATCH', `/api/admin/repairs/${repair.id}`, { body: { status: 'diagnosing' } });
        assert(r.status === 200, `status=${r.status} ${r.json?.message || ''}`);
        const back = await api.call('GET', `/api/admin/repairs/${repair.id}`);
        assert(back.json?.ticket?.status === 'diagnosing', `status DB=${back.json?.ticket?.status}`);
    });
    await R.step('TICKETS_HISTORY (auditoría)', async () => {
        const r = await api.call('GET', `/api/admin/tickets/${repair.id}/history`);
        assert(r.status === 200, `status=${r.status}`);
    });
    await R.step('TICKETS_ADMIN visibility en listado', async () => {
        const r = await api.call('GET', '/api/admin/repairs');
        const list = Array.isArray(r.json) ? r.json : (r.json?.repairs || r.json?.data || []);
        assert(list.some((t) => t.id === repair.id), 'ticket TEST no aparece en el listado admin');
    });
    await R.step('REPAIRS cleanup (soft delete)', async () => {
        const r = await api.call('PATCH', `/api/admin/tickets/${repair.id}/delete`, { body: {} });
        assert(r.status === 200, `status=${r.status}`);
    });
}

// STORE: producto DRAFT TEST → editar → borrar
let product = null;
await R.step('STORE create DRAFT TEST', async () => {
    const r = await api.call('POST', '/api/admin/commerce/catalog', { body: {
        name: `TEST ${runId}`, slug: `test-${runId.toLowerCase()}`, item_type: 'PRODUCT', base_price: '1.00', currency: 'MXN',
        short_description: 'Producto de prueba automatizada. Eliminar.'
    } });
    assert(r.status === 201 && r.json?.data?.id, `status=${r.status} ${r.json?.error?.message || r.json?.message || r.text.slice(0, 120)}`);
    product = r.json.data;
});
if (product) {
    await R.step('STORE update TEST', async () => {
        const current = await api.call('GET', `/api/admin/commerce/catalog/${product.id}`);
        const r = await api.call('PATCH', `/api/admin/commerce/catalog/${product.id}`, { body: { short_description: `Editado ${runId}`, version: current.json?.data?.version } });
        assert(r.status === 200, `status=${r.status} ${r.json?.error?.message || r.text.slice(0, 120)}`);
        const back = await api.call('GET', `/api/admin/commerce/catalog/${product.id}`);
        assert(String(back.json?.data?.short_description || '').includes(runId), 'edición no persistió');
    });
    await R.step('STORE no publicado en catálogo público', async () => {
        const r = await anon.call('GET', `/api/commerce/catalog/test-${runId.toLowerCase()}`);
        assert(r.status === 404, `DRAFT visible públicamente: status=${r.status}`);
    });
    await R.step('STORE cleanup (delete TEST)', async () => {
        const r = await api.call('DELETE', `/api/admin/commerce/catalog/${product.id}`);
        assert(r.status === 200, `status=${r.status} ${r.json?.error?.message || r.text.slice(0, 120)}`);
    });
}

await R.step('AUTH_LOGOUT invalida sesión', async () => {
    if (!args.includes('--dev-login') && !args.includes('--logout')) return 'omitido (usa --logout para cerrar la sesión real)';
    const r = await api.call('GET', '/auth/logout');
    assert([302, 303].includes(r.status), `status=${r.status}`);
    const me = await api.call('GET', '/api/me');
    assert(me.json?.user === null, 'la sesión sigue activa tras logout');
});
R.finish(`ADMIN_E2E ${base}`);
