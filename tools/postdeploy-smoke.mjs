#!/usr/bin/env node
// Smoke test post-deploy contra un entorno real (preview Hostinger o producción).
//   node tools/postdeploy-smoke.mjs https://pixon.com.mx [--expect-commit <sha12>]
// Solo lectura: no crea datos. Sale 1 si algún check falla.
const args = process.argv.slice(2);
const base = String(args.find((a) => /^https?:\/\//.test(a)) || process.env.BASE_URL || '').replace(/\/+$/, '');
if (!base) { console.error('Uso: node tools/postdeploy-smoke.mjs <BASE_URL> [--expect-commit <sha>]'); process.exit(2); }
const expectIdx = args.indexOf('--expect-commit');
const expectCommit = expectIdx >= 0 ? String(args[expectIdx + 1] || '').slice(0, 12) : '';

const results = [];
async function req(path, init = {}) {
    const started = Date.now();
    const res = await fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...init });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* html */ }
    return { status: res.status, headers: res.headers, text, json, ms: Date.now() - started };
}
async function check(name, fn) {
    try {
        const detail = await fn();
        results.push({ name, ok: true, detail: detail || '' });
    } catch (error) {
        results.push({ name, ok: false, detail: error.message });
    }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

await check('health', async () => {
    const r = await req('/api/health');
    assert(r.status === 200 && r.json?.ok === true && r.json?.status === 'UP', `status=${r.status} body=${r.text.slice(0, 120)}`);
    assert(!r.headers.get('server-timing')?.includes('worker'), 'responde el Worker de Cloudflare, no Node');
    return `${r.ms}ms`;
});
await check('ready (Node + MySQL)', async () => {
    const r = await req('/api/ready');
    assert(r.status === 200 && r.json?.db === 'UP', `status=${r.status} body=${r.text.slice(0, 120)}`);
    return `${r.ms}ms`;
});
await check('version', async () => {
    const r = await req('/api/version');
    assert(r.status === 200 && r.json?.commit && r.json.commit !== 'unknown', `status=${r.status} commit=${r.json?.commit}`);
    if (expectCommit) assert(r.json.commit.startsWith(expectCommit), `commit=${r.json.commit} esperado=${expectCommit}`);
    return `${r.json.version}`;
});
for (const page of ['/', '/optimizacion', '/en/pc-optimization', '/servicios/telefono/celular-mojado',
    '/servicios/telefono/reparacion-humedad-iphone', '/tienda', '/paquetes']) {
    await check(`page ${page}`, async () => {
        const r = await req(page);
        assert(r.status === 200 && /<html/i.test(r.text), `status=${r.status}${r.headers.get('location') ? ` → ${r.headers.get('location')}` : ''}`);
        assert(/no-cache|no-store/.test(r.headers.get('cache-control') || ''), `HTML cacheable: ${r.headers.get('cache-control')}`);
        return `${r.ms}ms`;
    });
}
await check('404 real', async () => {
    const r = await req('/esta-ruta-no-existe-smoke');
    assert(r.status === 404, `status=${r.status}`);
});
await check('robots + sitemap', async () => {
    const a = await req('/robots.txt'); const b = await req('/sitemap.xml');
    assert(a.status === 200 && /Sitemap:/i.test(a.text), `robots ${a.status}`);
    assert(b.status === 200 && /<urlset|<sitemapindex/.test(b.text), `sitemap ${b.status}`);
});
await check('api comments (DB read)', async () => {
    const r = await req('/api/comments');
    assert(r.status === 200 && r.json !== null, `status=${r.status}`);
});
await check('api appointments config (DB read)', async () => {
    const r = await req('/api/appointments/config');
    assert(r.status === 200 && r.json?.success === true, `status=${r.status}`);
});
await check('api store catalog (DB read)', async () => {
    const r = await req('/api/commerce/catalog?limit=1');
    assert(r.status === 200 && r.json?.ok === true, `status=${r.status} ${r.text.slice(0, 100)}`);
});
await check('api me anonymous', async () => {
    const r = await req('/api/me');
    assert(r.status === 200 && r.json && r.json.user === null, `status=${r.status}`);
});
await check('admin API protected', async () => {
    const r = await req('/api/admin/dashboard');
    assert(r.status === 401 || r.status === 403, `status=${r.status} (esperado 401/403)`);
});
await check('dev-login disabled', async () => {
    const r = await req('/auth/dev-login');
    assert(r.status === 404, `status=${r.status} (esperado 404 en producción)`);
});
await check('CSRF enforced', async () => {
    const r = await req('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert(r.status === 403, `status=${r.status} (esperado 403 sin X-Requested-With)`);
});
await check('CORS rejects foreign origin', async () => {
    const r = await req('/api/me', { headers: { Origin: 'https://evil.example' } });
    assert(!r.headers.get('access-control-allow-origin'), `ACAO=${r.headers.get('access-control-allow-origin')}`);
});
await check('security headers', async () => {
    const r = await req('/');
    for (const h of ['content-security-policy', 'x-content-type-options']) assert(r.headers.get(h), `falta ${h}`);
    assert(!r.headers.get('x-powered-by'), 'x-powered-by expuesto');
});
await check('correlation id', async () => {
    const r = await req('/api/version');
    assert(r.headers.get('x-correlation-id'), 'sin X-Correlation-ID');
});
if (base.startsWith('https://pixon.com.mx')) {
    await check('http → https', async () => {
        const r = await fetch('http://pixon.com.mx/', { redirect: 'manual', signal: AbortSignal.timeout(15000) });
        assert([301, 302, 307, 308].includes(r.status) && /^https:/.test(r.headers.get('location') || ''), `status=${r.status}`);
    });
    await check('www → apex', async () => {
        const r = await fetch('https://www.pixon.com.mx/', { redirect: 'manual', signal: AbortSignal.timeout(15000) });
        assert([301, 308].includes(r.status) && (r.headers.get('location') || '').startsWith('https://pixon.com.mx'), `status=${r.status}`);
    });
}

let failed = 0;
for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
console.log(`\nSMOKE ${base} = ${failed ? 'FAIL' : 'PASS'} (${results.length - failed}/${results.length})`);
process.exit(failed ? 1 : 0);
