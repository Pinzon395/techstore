// Cliente HTTP mínimo para los E2E contra un entorno real.
// La cookie de admin llega por PIXON_ADMIN_COOKIE (p. ej. "connect.sid=...")
// y nunca se imprime. En local (no producción) --dev-login la obtiene sola.
export function createClient(base, { cookie = '' } = {}) {
    let jar = cookie;
    async function call(method, path, { body, headers = {}, auth = true } = {}) {
        const res = await fetch(base + path, {
            method,
            redirect: 'manual',
            signal: AbortSignal.timeout(30000),
            headers: {
                Accept: 'application/json',
                ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                ...(method !== 'GET' ? { 'X-Requested-With': 'fetch' } : {}),
                ...(auth && jar ? { Cookie: jar } : {}),
                ...headers
            },
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
        const text = await res.text();
        let json = null; try { json = JSON.parse(text); } catch { /* no json */ }
        return { status: res.status, json, text, headers: res.headers };
    }
    async function devLogin() {
        const res = await fetch(`${base}/auth/dev-login?returnTo=/`, { redirect: 'manual' });
        const set = res.headers.getSetCookie?.() || [];
        const sid = set.map((c) => c.split(';')[0]).find((c) => c.startsWith('connect.sid='));
        if (res.status !== 302 || !sid) throw new Error(`dev-login no disponible (status ${res.status})`);
        jar = sid;
    }
    return { call, devLogin, hasAuth: () => Boolean(jar) };
}

export function reporter() {
    const rows = [];
    return {
        async step(name, fn) {
            try { const d = await fn(); rows.push({ name, ok: true, d: d ?? '' }); return true; }
            catch (e) { rows.push({ name, ok: false, d: e.message }); return false; }
        },
        skip(name, why) { rows.push({ name, ok: null, d: why }); },
        finish(label) {
            let failed = 0;
            for (const r of rows) {
                if (r.ok === false) failed++;
                console.log(`${r.ok === null ? 'SKIP' : r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.d !== '' ? `  (${r.d})` : ''}`);
            }
            console.log(`\n${label}=${failed ? 'FAIL' : 'PASS'}`);
            process.exit(failed ? 1 : 0);
        }
    };
}

export const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
