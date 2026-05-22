'use strict';

/**
 * apiFetch — wrapper de fetch para llamadas a /api/* y /auth/*.
 *
 * Garantiza que toda mutación lleve el header X-Requested-With:XMLHttpRequest
 * que el middleware CSRF del servidor exige (server/server.js).
 *
 * - GET/HEAD/OPTIONS → no toca headers (no se piden).
 * - POST/PUT/PATCH/DELETE → añade X-Requested-With y, si hay body objeto,
 *   serializa a JSON y fija Content-Type.
 *
 * Devuelve la Response cruda. El que llama decide si parsea JSON.
 */
export async function apiFetch(url, options = {}) {
    const opts = { credentials: 'include', ...options };
    opts.headers = { ...(options.headers || {}) };

    const method = (opts.method || 'GET').toUpperCase();
    const isMutation = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

    if (isMutation) {
        opts.headers['X-Requested-With'] = 'XMLHttpRequest';

        if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData) && !(opts.body instanceof Blob)) {
            opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
            opts.body = JSON.stringify(opts.body);
        }
    }

    return fetch(url, opts);
}

/**
 * apiJson — versión de apiFetch que ya parsea JSON y rechaza si !ok.
 * Lanza Error con .status y .body para que el caller pueda discriminar.
 */
export async function apiJson(url, options = {}) {
    const res = await apiFetch(url, options);
    let body = null;
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) {
        const err = new Error(
            (body && (body.error || (body.errors && body.errors.join(' ')))) ||
            `HTTP ${res.status}`
        );
        err.status = res.status;
        err.body = body;
        throw err;
    }
    return body;
}
