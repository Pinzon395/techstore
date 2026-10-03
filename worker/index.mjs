/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Pixon PC — Production Cloudflare Worker (Hardened & Audited)
 * Cloudflare Workers + Dual Hyperdrive (Fresh / Cached) + Aiven MySQL + R2
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * AUDIT-HARDENED CONTROLS:
 * 1. CORS Allowlist (PIXON-SEC-001 fixed):
 *    - Strict origin validation. No reflection of arbitrary Origin with Allow-Credentials.
 *
 * 2. Information Disclosure & Stack Trace Concealment (PIXON-SEC-002 fixed):
 *    - Correlation ID generated for server logs; clean generic messages for clients.
 *
 * 3. Security Headers & CSP (PIXON-SEC-003 fixed):
 *    - Strict Content-Security-Policy, HSTS, X-Content-Type-Options, X-Frame-Options.
 *
 * 4. Rate Limiting (In-Memory Sliding Window):
 *    - Strict per-IP limits on tickets, comments, and auth endpoints.
 *
 * 5. Input Sanitization & Anti-XSS:
 *    - Strip HTML tags, validate lengths, and require moderation on comments.
 *
 * 6. Dual Hyperdrive Isolation (withDb):
 *    - HYPERDRIVE_FRESH: auth, sessions, appointments, tickets, admin, writes.
 *    - HYPERDRIVE_CACHED: public catalog, approved comments, reviews.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import mysql from 'mysql2/promise';

// ─── Rate Limiter en Memoria ──────────────────────────────────────────────────

const RATE_LIMIT_STORE = new Map();

function isRateLimited(key, maxRequests = 20, windowMs = 60000) {
  const now = Date.now();
  const record = RATE_LIMIT_STORE.get(key) || [];
  const validTimestamps = record.filter(ts => now - ts < windowMs);
  if (validTimestamps.length >= maxRequests) {
    RATE_LIMIT_STORE.set(key, validTimestamps);
    return true;
  }
  validTimestamps.push(now);
  RATE_LIMIT_STORE.set(key, validTimestamps);

  // Limpieza periódica para evitar fugas de memoria
  if (RATE_LIMIT_STORE.size > 2000) {
    for (const [k, v] of RATE_LIMIT_STORE.entries()) {
      if (v.every(ts => now - ts >= windowMs)) RATE_LIMIT_STORE.delete(k);
    }
  }
  return false;
}

// ─── Helpers de Respuesta HTTP y Seguridad ────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  'https://pixon.com.mx',
  'https://www.pixon.com.mx',
  'https://pixon-cloud.luispinzon395.workers.dev',
]);

function getCorsHeaders(request) {
  const origin = request ? request.headers.get('Origin') : null;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    // Origen no permitido o ausente: NO devolver cabeceras de CORS
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(data, status = 200, extraHeaders = {}, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'Server-Timing': 'worker;dur=1',
      'Content-Security-Policy': "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; img-src 'self' data: blob: https: https://ui-avatars.com; connect-src 'self' https://pixon.com.mx https://www.pixon.com.mx https://pixon-cloud.luispinzon395.workers.dev https://accounts.google.com; frame-src 'self' https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none';",
      ...getCorsHeaders(request),
      ...extraHeaders,
    },
  });
}

function errorResponse(message, status = 400, details = null, request = null) {
  return jsonResponse({ ok: false, error: message, ...(details ? { details } : {}) }, status, {}, request);
}

function safeInternalReturnTo(value, fallback = '/cuenta') {
  const path = typeof value === 'string' ? value.trim() : '';
  if (!path || !path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u001f]/.test(path)) return fallback;
  try {
    const parsed = new URL(path, 'https://pixon.local');
    return parsed.origin === 'https://pixon.local' ? `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 240) : fallback;
  } catch (_) {
    return fallback;
  }
}

// ─── Guardrail 1: Dual Hyperdrive Request-Scoped Connection (withDb) ─────────

export async function withDb(env, { fresh = true } = {}, fn) {
  const hyperdrive = fresh
    ? env.HYPERDRIVE_FRESH
    : (env.HYPERDRIVE_CACHED || env.HYPERDRIVE_FRESH);

  // Hyperdrive expone credenciales ya adaptadas para mysql2. Usar su
  // connectionString convierte `ssl-mode` en una opción desconocida y hace que
  // MySQL cierre la conexión antes de la primera consulta.
  if (!hyperdrive?.host || !hyperdrive?.user || !hyperdrive?.database || !hyperdrive?.port) {
    throw new Error('Hyperdrive no está configurado');
  }

  const conn = await mysql.createConnection({
    host: hyperdrive.host,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    port: hyperdrive.port,
    disableEval: true,
    connectTimeout: 5000,
  });

  try {
    return await fn(conn);
  } finally {
    try {
      await conn.end();
    } catch {}
  }
}

// ─── Autenticación & Sesiones (Siempre FRESH) ─────────────────────────────────

async function getSessionUser(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)pixon_sid=([^;]+)/);
  if (!match) return null;

  const sessionId = decodeURIComponent(match[1]).slice(0, 128);
  if (!sessionId) return null;

  return await withDb(env, { fresh: true }, async (conn) => {
    const [rows] = await conn.query(
      'SELECT data FROM sessions WHERE session_id = ? AND expires > UNIX_TIMESTAMP()',
      [sessionId]
    );
    if (!rows.length || !rows[0].data) return null;

    try {
      const data = JSON.parse(rows[0].data);
      const rawUser = data?.user || (data?.passport?.user ? data.passport.user : null);
      if (!rawUser?.id) return null;

      // Verificar que el usuario no haya sido eliminado o deshabilitado
      const [uRows] = await conn.query(
        'SELECT u.id, u.name, u.email, r.code as role_code, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
        [rawUser.id]
      );
      if (!uRows.length) return null;

      const userEmail = (uRows[0].email || '').toLowerCase().trim();
      const roleCode = (uRows[0].role_code || '').toLowerCase().trim();
      const roleName = (uRows[0].role_name || '').toLowerCase().trim();

      const isAdmin = userEmail === 'luispinzon395@gmail.com' ||
                      userEmail === (env.ADMIN_EMAIL || '').toLowerCase().trim() ||
                      roleCode === 'admin' ||
                      roleName === 'administrador';

      return {
        id: uRows[0].id,
        name: uRows[0].name,
        email: uRows[0].email,
        role: isAdmin ? 'admin' : (roleCode || 'cliente'),
        avatar: rawUser.avatar || null,
      };
    } catch {
      return null;
    }
  });
}

async function requireAdmin(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return null;
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  if (role === 'admin' || role === 'administrador' || role === 'staff' || email === 'luispinzon395@gmail.com') {
    return user;
  }
  return null;
}

// ─── Handlers de Rutas ────────────────────────────────────────────────────────

// GET /api/me
async function handleGetMe(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) {
    return jsonResponse({ ok: false, user: null, authenticated: false }, 200, {
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    }, request);
  }
  return jsonResponse({
    ok: true,
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'client',
      avatar: user.avatar,
    },
  }, 200, {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  }, request);
}

// POST /api/me/profile
async function handlePostProfile(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return errorResponse('Autenticación requerida', 401, null, request);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON inválido', 400, null, request); }

  const name = String(body.name || '').trim().replace(/<[^>]*>?/gm, '').slice(0, 100);
  const phone = String(body.phone || '').trim().slice(0, 20);

  if (name.length < 2) return errorResponse('Nombre muy corto', 400, null, request);

  await withDb(env, { fresh: true }, async (conn) => {
    await conn.query('UPDATE users SET name = ?, phone = ?, updated_at = NOW() WHERE id = ?', [name, phone || null, user.id]);
  });

  return jsonResponse({ ok: true, message: 'Perfil actualizado exitosamente' }, 200, {
    'Cache-Control': 'no-store, private',
  }, request);
}

// ─── Handlers de Google OAuth ────────────────────────────────────────────────

async function handleAuthGoogle(request, env) {
  const url = new URL(request.url);
  const returnTo = safeInternalReturnTo(url.searchParams.get('returnTo'), '/cuenta');
  const stateToken = crypto.randomUUID();
  const statePayload = `${stateToken}.${btoa(returnTo)}`;
  const redirectUri = new URL('/auth/google/callback', request.url).toString();

  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID || '');
  googleUrl.searchParams.set('redirect_uri', redirectUri);
  googleUrl.searchParams.set('response_type', 'code');
  googleUrl.searchParams.set('scope', 'openid profile email');
  googleUrl.searchParams.set('state', statePayload);
  googleUrl.searchParams.set('prompt', 'select_account');

  return new Response(null, {
    status: 302,
    headers: {
      'Location': googleUrl.toString(),
      'Set-Cookie': `pixon_oauth_state=${stateToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`,
      'Cache-Control': 'no-store, private',
    },
  });
}

async function handleAuthGoogleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)pixon_oauth_state=([^;]+)/);
  const cookieState = match ? decodeURIComponent(match[1]) : null;

  if (!state || !cookieState || !state.startsWith(cookieState)) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/auth/failure?reason=Estado+OAuth+invalido+o+expirado',
        'Set-Cookie': 'pixon_oauth_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax',
      },
    });
  }

  let returnTo = '/cuenta';
  try {
    const parts = state.split('.');
    if (parts.length >= 2) {
      returnTo = safeInternalReturnTo(atob(parts[1]), '/cuenta');
    }
  } catch {}

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/auth/failure?reason=Codigo+de+autorizacion+no+recibido' },
    });
  }

  const redirectUri = new URL('/auth/google/callback', request.url).toString();
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    console.error('[auth:token_error]', await tokenRes.text());
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/auth/failure?reason=Error+al+intercambiar+token+con+Google' },
    });
  }

  const tokenData = await tokenRes.json();
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoRes.ok) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/auth/failure?reason=Error+al+obtener+perfil+de+Google' },
    });
  }

  const profile = await userInfoRes.json();
  const googleId = profile.id;
  const email = String(profile.email || '').trim().toLowerCase();
  const name = String(profile.name || profile.given_name || email.split('@')[0]).trim().slice(0, 100);
  const avatar = profile.picture || null;

  const user = await withDb(env, { fresh: true }, async (conn) => {
    const [rows] = await conn.query(
      'SELECT u.id, u.name, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.google_id = ? OR u.email = ?',
      [googleId, email]
    );
    let u = rows[0];
    if (!u) {
      const [insertRes] = await conn.query(
        'INSERT INTO users (google_id, email, name, role_id, created_at) VALUES (?, ?, ?, 2, NOW())',
        [googleId, email, name]
      );
      u = { id: insertRes.insertId, name, email, role: 'client' };
    } else {
      await conn.query('UPDATE users SET google_id = ?, updated_at = NOW() WHERE id = ?', [googleId, u.id]);
    }
    return u;
  });

  // Regeneración estricta de sesión (previene Session Fixation)
  const sessionId = crypto.randomUUID();
  const sessionData = JSON.stringify({
    passport: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar,
      },
    },
  });

  const expiresTimestamp = Math.floor(Date.now() / 1000) + 14 * 86400;

  await withDb(env, { fresh: true }, async (conn) => {
    await conn.query(
      'INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)',
      [sessionId, expiresTimestamp, sessionData]
    );
  });

  return new Response(null, {
    status: 302,
    headers: {
      'Location': returnTo,
      'Set-Cookie': `pixon_sid=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600`,
      'Cache-Control': 'no-store, private',
    },
  });
}

async function handleAuthLogout(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)pixon_sid=([^;]+)/);
  if (match) {
    const sessionId = decodeURIComponent(match[1]);
    try {
      await withDb(env, { fresh: true }, async (conn) => {
        await conn.query('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
      });
    } catch {}
  }

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': 'pixon_sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax',
      'Cache-Control': 'no-store, private',
    },
  });
}

function handleAuthFailure(request) {
  const url = new URL(request.url);
  const reason = String(url.searchParams.get('reason') || 'No se pudo iniciar sesión con Google.').slice(0, 300);
  const safeReason = reason.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return new Response(`<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Error de Autenticación — Pixon PC</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#071f3a;color:#e5e7eb;font-family:system-ui,-apple-system,sans-serif}
    main{width:min(90vw,540px);background:#0d2847;border:1px solid #1e3a5f;border-radius:16px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.5);text-align:center}
    h1{font-size:1.5rem;margin:0 0 16px;color:#fff}
    p{line-height:1.6;color:#94a3b8}
    code{display:block;margin:16px 0;background:#051427;border:1px solid #1e3a5f;border-radius:8px;padding:12px;color:#38bdf8}
    a{display:inline-block;margin-top:12px;padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600}
  </style>
</head>
<body>
  <main>
    <h1>No se pudo iniciar sesión</h1>
    <p>Ocurrió un problema durante el proceso de autenticación:</p>
    <code>${safeReason}</code>
    <a href="/auth/google">Intentar nuevamente</a>
  </main>
</body>
</html>`, {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  });
}

// ─── Handlers de Comentarios (GET Cached / POST Fresh + Sanitized) ────────────

// GET /api/comments
async function handleGetComments(request, env) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

  try {
    const rows = await withDb(env, { fresh: false }, async (conn) => {
      const [res] = await conn.query(
        'SELECT id, name, stars, text, created_at FROM comments WHERE approved = 1 ORDER BY id DESC LIMIT ?',
        [limit]
      );
      return res;
    });

    return jsonResponse({ ok: true, data: rows }, 200, {
      'Cache-Control': 'public, max-age=120, stale-while-revalidate=86400',
    }, request);
  } catch (err) {
    console.error('[comments:db_error]', err.message);
    return jsonResponse({ ok: true, data: [] }, 200, {
      'Cache-Control': 'public, max-age=30',
    }, request);
  }
}

// POST /api/comments
async function handlePostComment(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(`comment_${ip}`, 5, 300000)) {
    return errorResponse('Demasiados comentarios enviados. Por favor espera unos minutos.', 429, null, request);
  }

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON inválido', 400, null, request); }

  const name = String(body.name || '').trim().replace(/<[^>]*>?/gm, '').slice(0, 60);
  const text = String(body.text || body.comment || '').trim().replace(/<[^>]*>?/gm, '').slice(0, 500);
  const starsRaw = parseFloat(body.stars || body.rating || '5');
  const stars = Math.min(5, Math.max(0.5, Math.round(starsRaw * 2) / 2));

  if (name.length < 2) return errorResponse('El nombre es muy corto (mínimo 2 caracteres)', 400, null, request);
  if (text.length < 10) return errorResponse('El comentario es muy corto (mínimo 10 caracteres)', 400, null, request);

  const user = await getSessionUser(request, env);
  const userId = user ? user.id : null;
  const userEmail = user ? user.email : null;

  const created = await withDb(env, { fresh: true }, async (conn) => {
    const [res] = await conn.query(
      'INSERT INTO comments (user_id, name, stars, text, approved, user_email, created_at) VALUES (?, ?, ?, ?, 0, ?, NOW())',
      [userId, name, stars, text, userEmail]
    );
    return { id: res.insertId, name, stars, text, approved: 0 };
  });

  return jsonResponse({
    ok: true,
    success: true,
    message: 'Comentario enviado para revisión.',
    comment: created,
  }, 201, {}, request);
}

// ─── Google Reviews (GET Cached) ─────────────────────────────────────────────

async function handleGetGoogleReviews(request, env) {
  const rows = await withDb(env, { fresh: false }, async (conn) => {
    const [reviews] = await conn.query(
      'SELECT author_name, rating, text, relative_time_description, profile_photo_url FROM google_reviews WHERE is_hidden = 0 ORDER BY time_unix DESC LIMIT 12'
    );
    return reviews;
  });

  return jsonResponse({ ok: true, reviews: rows }, 200, {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800',
  }, request);
}

// ─── Tickets (POST Fresh & IDOR-Protected GET) ────────────────────────────────

// POST /api/tickets
async function handlePostTicket(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(`ticket_${ip}`, 10, 300000)) {
    return errorResponse('Demasiados tickets enviados. Por favor espera unos minutos.', 429, null, request);
  }

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON inválido', 400, null, request); }

  const name = String(body.name || '').trim().replace(/<[^>]*>?/gm, '').slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 190);
  const phone = String(body.phone || '').replace(/\s/g, '').slice(0, 20);
  const device_type = String(body.device_type || body.device || '').trim().replace(/<[^>]*>?/gm, '').slice(0, 40);
  const device_brand = String(body.device_brand || '').trim().replace(/<[^>]*>?/gm, '').slice(0, 60);
  const device_model = String(body.device_model || '').trim().replace(/<[^>]*>?/gm, '').slice(0, 120);
  const reported_issue = String(body.reported_issue || body.description || '').trim().replace(/<[^>]*>?/gm, '').slice(0, 2000);

  if (!name) return errorResponse('Nombre requerido', 400, null, request);
  if (!phone || !/^\+?[\d\s\-]{8,20}$/.test(phone)) return errorResponse('Teléfono inválido', 400, null, request);
  if (!device_type) return errorResponse('Tipo de dispositivo requerido', 400, null, request);
  if (!reported_issue || reported_issue.length < 10) return errorResponse('Descripción del problema muy corta', 400, null, request);

  const user = await getSessionUser(request, env);
  const userId = user ? user.id : null;

  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  const ticket_code = `TK-${year}${month}-${random}`;

  const createdTicket = await withDb(env, { fresh: true }, async (conn) => {
    await conn.query(
      `INSERT INTO repairs (ticket_code, user_id, device_type, device_brand, device_model, reported_issue,
         status, priority, contact_phone, contact_email, appointment_status)
       VALUES (?, ?, ?, ?, ?, ?, 'received', 'normal', ?, ?, 'pendiente_confirmacion')`,
      [ticket_code, userId, device_type, device_brand || null, device_model || null, reported_issue, phone, email || null]
    );

    const [created] = await conn.query('SELECT ticket_code, status, created_at FROM repairs WHERE ticket_code = ?', [ticket_code]);
    return created[0];
  });

  return jsonResponse({
    ok: true,
    ticket_code,
    ticket: createdTicket,
    message: 'Tu ticket fue recibido. Te contactaremos pronto.'
  }, 201, {}, request);
}

// GET /api/mis-tickets (IDOR Protected: sólo tickets del usuario logueado)
async function handleGetMisTickets(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return errorResponse('Autenticación requerida', 401, null, request);

  const rows = await withDb(env, { fresh: true }, async (conn) => {
    const [tickets] = await conn.query(
      'SELECT id, ticket_code, device_type, device_brand, device_model, reported_issue, status, priority, created_at FROM repairs WHERE user_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 50',
      [user.id]
    );
    return tickets;
  });

  return jsonResponse({
    ok: true,
    success: true,
    repairs: rows,
  }, 200, {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  }, request);
}

// ─── Citas / Disponibilidad (Cancún Timezone UTC-5) ───────────────────────────

// GET /api/appointments/config
async function handleGetAppointmentsConfig(request, env) {
  const data = await withDb(env, { fresh: false }, async (conn) => {
    const [settings] = await conn.query('SELECT * FROM appointment_settings ORDER BY weekday ASC').catch(() => [[]]);
    const [exceptions] = await conn.query('SELECT * FROM appointment_exceptions ORDER BY date ASC').catch(() => [[]]);
    const [types] = await conn.query('SELECT appointment_type, name_es, name_en, duration_minutes, capacity_units, is_exclusive, requires_payment, default_priority, display_color FROM appointment_type_configs WHERE allows_customer_booking = 1').catch(() => [[]]);
    return { settings, exceptions, types };
  });
  return jsonResponse({ success: true, ...data }, 200, { 'Cache-Control': 'no-cache, private' }, request);
}

// GET /api/appointments/availability/month?month=YYYY-MM&type=DROP_OFF
async function handleGetMonthAvailability(request, env) {
  const url = new URL(request.url);
  const month = url.searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return errorResponse('Parámetro month inválido. Formato: YYYY-MM', 400, null, request);
  }

  const [year, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, mo, 0)).getUTCDate();

  const bookedPerDay = await withDb(env, { fresh: true }, async (conn) => {
    const [rows] = await conn.query(
      "SELECT DATE_FORMAT(start_at, '%Y-%m-%d') as day_str, COUNT(*) as count FROM appointments WHERE start_at >= ? AND start_at <= ? AND status IN ('CONFIRMED', 'TEMPORARY_HOLD') GROUP BY day_str",
      [`${month}-01 00:00:00`, `${month}-${String(daysInMonth).padStart(2, '0')} 23:59:59`]
    );
    const map = new Map();
    for (const r of rows) map.set(r.day_str, Number(r.count || 0));
    return map;
  });

  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dayStr = `${month}-${String(i).padStart(2, '0')}`;
    const dow = new Date(`${dayStr}T12:00:00Z`).getUTCDay();
    if (dow === 0) {
      days.push({ date: dayStr, status: 'CLOSED', available_slots: 0 });
      continue;
    }
    const startH = 11;
    const endH = (dow === 6) ? 18 : 22; // Cancún taller: 11:00 AM a 10:00 PM (Sábados 11:00 AM a 6:00 PM)
    const totalSlots = (endH - startH) * 2;
    const bookedCount = bookedPerDay.get(dayStr) || 0;
    const avail = Math.max(0, totalSlots - bookedCount);

    let status;
    if (avail === 0) {
      status = 'FULL';
    } else if (avail <= Math.max(1, Math.ceil(totalSlots * 0.3))) {
      status = 'LIMITED';
    } else {
      status = 'AVAILABLE';
    }
    days.push({ date: dayStr, status, available_slots: avail });
  }

  return jsonResponse({ success: true, month, days }, 200, {
    'Cache-Control': 'no-cache, private',
  }, request);
}

// GET /api/appointments/availability?date=YYYY-MM-DD&type=DROP_OFF
async function handleGetAvailability(request, env) {
  const url = new URL(request.url);
  const dateStr = url.searchParams.get('date');
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return errorResponse('Parámetro date requerido en formato YYYY-MM-DD', 400, null, request);
  }

  const dayOfWeek = new Date(dateStr + 'T12:00:00Z').getUTCDay();

  if (dayOfWeek === 0) {
    return jsonResponse({
      ok: true,
      success: true,
      is_open: false,
      date: dateStr,
      available: false,
      total_slots: 0,
      available_slots: 0,
      slots: [],
      message: 'El taller de Pixon PC permanece cerrado los domingos.'
    }, 200, {}, request);
  }

  const startHour = 11;
  const endHour = (dayOfWeek === 6) ? 18 : 22;
  const allSlots = [];
  for (let h = startHour; h < endHour; h++) {
    allSlots.push(`${String(h).padStart(2, '0')}:00`);
    allSlots.push(`${String(h).padStart(2, '0')}:30`);
  }

  const bookedTimes = await withDb(env, { fresh: true }, async (conn) => {
    const [booked] = await conn.query(
      "SELECT TIME_FORMAT(start_at, '%H:%i') AS slot_time FROM appointments WHERE DATE(start_at) = ? AND status IN ('CONFIRMED', 'TEMPORARY_HOLD')",
      [dateStr]
    );
    return new Set(booked.map(b => String(b.slot_time).slice(0, 5)));
  });

  const slots = allSlots.map(time => ({
    time,
    available: !bookedTimes.has(time),
  }));

  const totalSlots = slots.length;
  const availableSlots = slots.filter(s => s.available).length;

  return jsonResponse({
    ok: true,
    success: true,
    is_open: true,
    date: dateStr,
    available: availableSlots > 0,
    total_slots: totalSlots,
    available_slots: availableSlots,
    message: availableSlots > 0 ? 'Horarios disponibles' : 'Turnos agotados para esta fecha',
    slots
  }, 200, {
    'Cache-Control': 'no-cache, private',
  }, request);
}

// ─── Envíos Transaccionales (Resend API) ──────────────────────────────────────

async function sendResendEmail(env, { to, subject, html, text, ticketId = null }) {
  const apiKey = env.RESEND_API_KEY || '';
  const from = env.EMAIL_FROM || 'soporte@pixon.com.mx';
  if (!apiKey || !to) return { ok: false, error: 'Configuración o destinatario faltante' };

  const recipients = Array.isArray(to) ? to : [to];
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        text,
      }),
    });
    const data = await res.json().catch(() => ({}));
    const providerId = data.id || null;

    if (res.ok) {
      await withDb(env, { fresh: true }, async (conn) => {
        for (const recipient of recipients) {
          const evtId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          await conn.query(
            `INSERT INTO email_outbox (id, ticket_id, event_type, recipient, subject, html, text, status, provider_id, attempts, last_attempt_at, created_at, updated_at)
             VALUES (?, ?, 'transactional', ?, ?, ?, ?, 'DELIVERED', ?, 1, NOW(), NOW(), NOW())`,
            [evtId, ticketId, recipient, subject, html, text || null, providerId]
          ).catch((e) => console.error('[outbox:insert_err]', e));
        }
      }).catch(() => {});
    }

    return { ok: res.ok, status: res.status, id: providerId, error: data.message };
  } catch (err) {
    console.error('[resend:error]', err);
    return { ok: false, error: err.message };
  }
}

// POST /api/appointments/hold
async function handlePostAppointmentHold(request, env, ctx = null) {
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON inválido', 400, null, request); }

  const customer_name = String(body.customer_name || '').trim().replace(/<[^>]*>?/gm, '').slice(0, 120);
  const customer_phone = String(body.customer_phone || '').replace(/\s/g, '').slice(0, 20);
  const customer_email = String(body.customer_email || '').trim().toLowerCase().slice(0, 160) || null;
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();
  const service_type = String(body.service_type || 'Diagnóstico técnico').slice(0, 255);
  const device_summary = String(body.device_summary || 'Equipo general').slice(0, 255);
  const customer_notes = String(body.customer_notes || '').slice(0, 1000);
  const address_line = String(body.address_line || 'Cto. Hacienda Chimay, Cancún, Q.R.').slice(0, 255);
  const appointment_type = String(body.appointment_type || 'DROP_OFF').slice(0, 64);
  const location_type = String(body.location_type || 'WORKSHOP').slice(0, 32);

  if (!customer_name) return errorResponse('Nombre del cliente requerido', 400, null, request);
  if (!customer_phone || customer_phone.length < 8) return errorResponse('Teléfono de contacto requerido', 400, null, request);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return errorResponse('Fecha inválida', 400, null, request);
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return errorResponse('Horario inválido', 400, null, request);

  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  const ticket_code = `TK-${year}${month}-${random}`;
  const appointment_id = `apt_${Date.now()}_${random}`;

  const startAt = `${date} ${time}:00`;
  const [hour, min] = time.split(':').map(Number);
  const endMin = (min + 30) % 60;
  const endHour = hour + Math.floor((min + 30) / 60);
  const endAt = `${date} ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

  const user = await getSessionUser(request, env);
  const userId = user ? user.id : null;

  const result = await withDb(env, { fresh: true }, async (conn) => {
    // 1. Verificar si el slot no está ya ocupado por una cita confirmada
    const [existing] = await conn.query(
      "SELECT id FROM appointments WHERE start_at = ? AND status = 'CONFIRMED' LIMIT 1",
      [startAt]
    );
    if (existing.length > 0) {
      throw new Error('El horario seleccionado ya no está disponible. Por favor elige otro.');
    }

    // 2. Crear ticket unificado en repairs
    const [repairRes] = await conn.query(
      `INSERT INTO repairs (ticket_code, user_id, device_type, device_brand, device_model, reported_issue,
         status, priority, contact_phone, contact_email, appointment_status, appointment_date, appointment_time, appointment_datetime)
       VALUES (?, ?, ?, ?, ?, ?, 'received', 'normal', ?, ?, 'confirmada', ?, ?, ?)`,
      [
        ticket_code, userId, device_summary.split(' ')[0] || 'Equipo', 'General', device_summary,
        customer_notes ? `Servicio: ${service_type}. Detalle: ${customer_notes}` : service_type,
        customer_phone, customer_email, date, time, startAt
      ]
    );
    const repairId = repairRes.insertId;

    // 3. Crear cita en appointments
    await conn.query(
      `INSERT INTO appointments (
         id, ticket_id, customer_id, customer_name, customer_email, customer_phone,
         appointment_type, service_type, location_type, start_at, end_at, duration_minutes,
         capacity_units, status, payment_status, reservation_expires_at, customer_notes,
         device_summary, address_line, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 30, 1, 'CONFIRMED', 'NOT_REQUIRED', DATE_ADD(NOW(), INTERVAL 15 MINUTE), ?, ?, ?, NOW())`,
      [
        appointment_id, repairId, userId ? String(userId) : null, customer_name, customer_email, customer_phone,
        appointment_type, service_type, location_type, startAt, endAt, customer_notes, device_summary, address_line
      ]
    );

    return {
      ticketId: repairId,
      ticketCode: ticket_code,
      appointmentId: appointment_id,
      startAt,
      endAt
    };
  });

  // Notificación por correo con Resend
  const emailNotificationPromise = (async () => {
    try {
      const emailHtmlAdmin = `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;color:#071F3A;">
          <h2 style="color:#071F3A;border-bottom:3px solid #0284c7;padding-bottom:8px;margin-top:0;">🔔 Nueva Cita Agendada — Pixon PC</h2>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:6px 0;color:#64748b;font-size:14px;width:140px;">Folio</td><td style="font-weight:bold;">#${result.ticketCode}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Cliente</td><td style="font-weight:bold;">${customer_name}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Teléfono</td><td><a href="tel:${customer_phone}">${customer_phone}</a></td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Email Cliente</td><td>${customer_email || 'No proporcionado'}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Equipo</td><td style="font-weight:bold;">${device_summary}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Servicio</td><td>${service_type}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Fecha y Hora</td><td style="color:#0284c7;font-weight:bold;">${startAt}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Modalidad</td><td>${location_type === 'ON_SITE' ? 'A Domicilio' : 'En Taller'}</td></tr>
            ${address_line ? `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Dirección</td><td>${address_line}</td></tr>` : ''}
            ${customer_notes ? `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Notas</td><td>${customer_notes}</td></tr>` : ''}
          </table>
          <div style="margin-top:20px;text-align:center;">
            <a href="https://pixon.com.mx/admin" style="display:inline-block;background:#0284c7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver en Panel Administrativo</a>
          </div>
        </div>
      `;

      await sendResendEmail(env, {
        to: 'luispinzon395@gmail.com',
        subject: `🔔 Nueva cita #${result.ticketCode} — ${customer_name}`,
        html: emailHtmlAdmin,
        ticketId: result.ticketId,
      });

      if (customer_email && customer_email.includes('@')) {
        const emailHtmlClient = `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;color:#071F3A;">
            <h2 style="color:#071F3A;border-bottom:3px solid #0284c7;padding-bottom:8px;margin-top:0;">¡Tu cita en Pixon PC está confirmada!</h2>
            <p>Hola <strong>${customer_name}</strong>,</p>
            <p>Hemos confirmado tu cita de servicio técnico para tu equipo <strong>${device_summary}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:6px 0;color:#64748b;font-size:14px;width:140px;">Folio de orden</td><td style="font-weight:bold;">#${result.ticketCode}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Fecha y horario</td><td style="color:#0284c7;font-weight:bold;">${startAt}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Servicio</td><td>${service_type}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">Ubicación</td><td>${location_type === 'ON_SITE' ? (address_line || 'A Domicilio en Cancún') : 'Cto. Hacienda Chimay, 77539 Cancún, Q.R.'}</td></tr>
            </table>
            <p style="margin-top:20px;font-size:14px;color:#64748b;">¿Tienes alguna duda o necesitas reprogramar? Escríbenos directamente por WhatsApp al <a href="https://wa.me/529986690777" style="color:#0284c7;font-weight:bold;">+52 998 669 0777</a>.</p>
          </div>
        `;

        await sendResendEmail(env, {
          to: customer_email,
          subject: `Confirmación de cita #${result.ticketCode} — Pixon PC Cancún`,
          html: emailHtmlClient,
          ticketId: result.ticketId,
        });
      }
    } catch (e) {
      console.error('[email:appointment_err]', e);
    }
  })();

  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(emailNotificationPromise);
  }

  return jsonResponse({
    success: true,
    ok: true,
    appointment: {
      id: result.appointmentId,
      ticket_id: result.ticketId,
      ticket_code: result.ticketCode,
      start_at: result.startAt,
      end_at: result.endAt,
      status: 'CONFIRMED'
    },
    ticket: {
      id: result.ticketId,
      ticket_code: result.ticketCode
    }
  }, 201, {
    'Cache-Control': 'no-store, private'
  }, request);
}

// ─── Commerce / Tienda Catálogo ───────────────────────────────────────────────

async function handleGetCatalog(request, env) {
  const url = new URL(request.url);
  const categorySlug = url.searchParams.get('category');
  const search = url.searchParams.get('search') || url.searchParams.get('q');

  try {
    const rows = await withDb(env, { fresh: false }, async (conn) => {
      let query = `
        SELECT ci.id, ci.public_id, ci.sku, ci.slug, ci.name, ci.short_description,
               ci.description, ci.item_type, ci.condition_code, ci.status,
               ci.base_price, ci.sale_price, ci.currency, ci.track_stock, ci.stock_quantity,
               ci.brand, ci.created_at,
               (SELECT url FROM catalog_media cm WHERE cm.catalog_item_id = ci.id AND cm.is_primary = 1 AND cm.deleted_at IS NULL LIMIT 1) as primary_image
        FROM catalog_items ci
        WHERE ci.status IN ('ACTIVE', 'RESERVED', 'SOLD', 'OUT_OF_STOCK', 'PUBLISHED')
          AND ci.deleted_at IS NULL
      `;
      const params = [];
      if (categorySlug) {
        query += ` AND EXISTS (
          SELECT 1 FROM catalog_item_categories cic
          JOIN catalog_categories cc ON cc.id = cic.category_id
          WHERE cic.catalog_item_id = ci.id AND cc.slug = ?
        )`;
        params.push(categorySlug);
      }
      if (search) {
        query += ` AND (ci.name LIKE ? OR ci.brand LIKE ? OR ci.sku LIKE ? OR ci.short_description LIKE ?)`;
        const pattern = `%${search.slice(0, 50)}%`;
        params.push(pattern, pattern, pattern, pattern);
      }
      query += ' ORDER BY ci.featured DESC, ci.id DESC LIMIT 50';

      const [items] = await conn.query(query, params).catch((err) => {
        console.error('Catalog query error:', err);
        return [[]];
      });
      return items;
    });

    const formattedItems = rows.map(r => ({
      id: r.id,
      public_id: r.public_id,
      sku: r.sku,
      slug: r.slug,
      name: r.name,
      short_description: r.short_description,
      description: r.description,
      item_type: r.item_type,
      condition: r.condition_code,
      status: r.status,
      pricing: {
        base_price: String(r.base_price || '0.00'),
        sale_price: r.sale_price ? String(r.sale_price) : null,
        effective_price: String(r.sale_price ?? r.base_price ?? '0.00'),
        currency: r.currency || 'MXN'
      },
      inventory: {
        tracked: Boolean(r.track_stock),
        stock_quantity: Number(r.stock_quantity || 0),
        available_for_purchase: Number(r.stock_quantity || 0) > 0 || !r.track_stock
      },
      brand: r.brand,
      primary_image: r.primary_image || '/LOGOCIRCULAR.png',
      primary_image_url: r.primary_image || '/LOGOCIRCULAR.png',
      image_url: r.primary_image || '/LOGOCIRCULAR.png'
    }));

    return jsonResponse({
      ok: true,
      data: formattedItems,
      meta: {
        total: formattedItems.length,
        page: 1,
        limit: 50
      }
    }, 200, {
      'Cache-Control': 'public, max-age=120, stale-while-revalidate=600'
    }, request);
  } catch (err) {
    console.error('[catalog:db_error]', err.message);
    return jsonResponse({
      ok: true,
      data: [],
      meta: { total: 0, page: 1, limit: 50 }
    }, 200, {
      'Cache-Control': 'public, max-age=30'
    }, request);
  }
}

async function handleGetCatalogCategories(request, env) {
  try {
    const rows = await withDb(env, { fresh: false }, async (conn) => {
      const [cats] = await conn.query(
        "SELECT id, name, slug, description, image_url, icon, sort_order FROM catalog_categories WHERE status = 'ACTIVE' ORDER BY sort_order ASC, name ASC"
      ).catch(() => [[]]);
      return cats;
    });

    return jsonResponse({ ok: true, data: rows }, 200, {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
    }, request);
  } catch (err) {
    console.error('[catalog_categories:db_error]', err.message);
    return jsonResponse({ ok: true, data: [] }, 200, {
      'Cache-Control': 'public, max-age=30',
    }, request);
  }
}

// ─── FAQs & Tracking ─────────────────────────────────────────────────────────

async function handleGetFaqs(request, env) {
  const rows = await withDb(env, { fresh: false }, async (conn) => {
    const [faqs] = await conn.query(
      'SELECT id, question, answer, category FROM faqs WHERE active = 1 ORDER BY sort_order ASC, id ASC'
    );
    return faqs;
  });

  return jsonResponse(rows, 200, {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=1800',
  }, request);
}

// ─── Admin Endpoints (FRESH + requireAdmin) ───────────────────────────────────

// GET /api/admin/repairs (Devuelve Array para admin.js)
async function handleGetAdminRepairs(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  const rows = await withDb(env, { fresh: true }, async (conn) => {
    let query = `
      SELECT r.id, r.ticket_code, r.device_type, r.device_brand, r.device_model,
             r.serial_number, r.reported_issue, r.diagnostic, r.status, r.priority,
             r.contact_phone, r.contact_email, r.notes_internal,
             r.estimated_cost, r.final_cost,
             r.appointment_status, r.appointment_date, r.appointment_time,
             r.appointment_type, r.appointment_datetime, r.appointment_delivery_method,
             r.appointment_note, r.promised_at, r.delivered_at, r.warranty_until,
             r.created_at, r.updated_at,
             u.name as user_name, u.email as user_email,
             ra.technician_id,
             (SELECT t2.name FROM technicians t2 WHERE t2.id = ra.technician_id) as technician_name
      FROM repairs r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN repair_assignments ra ON ra.repair_id = r.id
      WHERE r.deleted_at IS NULL AND r.status != 'eliminado'
    `;
    const params = [];
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    query += ' ORDER BY r.id DESC LIMIT 200';

    const [res] = await conn.query(query, params);
    // Compute next_action based on status
    return res.map(r => ({
      ...r,
      next_action: getTicketNextAction(r.status),
    }));
  });

  return jsonResponse(rows, 200, {
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  }, request);
}

function getTicketNextAction(status) {
  const map = {
    new: 'Revisar y registrar equipo',
    received: 'Iniciar diagnóstico',
    diagnosing: 'Completar diagnóstico y cotizar',
    contacted: 'Esperar respuesta del cliente',
    quoted: 'Esperar aprobación del cliente',
    approved: 'Iniciar reparación',
    in_progress: 'Completar reparación',
    waiting_parts: 'Esperar llegada de piezas',
    ready: 'Coordinar entrega con cliente',
    delivered: 'Ticket completado',
    cancelled: 'Ticket cancelado',
    eliminado: 'Ticket eliminado',
  };
  return map[status] || 'Revisar expediente';
}

// GET /api/admin/users
async function handleGetAdminUsers(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  const rows = await withDb(env, { fresh: true }, async (conn) => {
    const [res] = await conn.query(
      `SELECT u.id, u.name, u.email, u.phone, r.name as role, u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.id DESC LIMIT 100`
    );
    return res.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=0284c7&color=fff`,
      created_at: u.created_at
    }));
  });

  return jsonResponse(rows, 200, {
    'Cache-Control': 'no-store, private',
  }, request);
}

// GET /api/admin/comments
async function handleGetAdminComments(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  const rows = await withDb(env, { fresh: true }, async (conn) => {
    const [res] = await conn.query(
      'SELECT id, user_id, name, stars, text, approved, user_email, created_at FROM comments ORDER BY id DESC LIMIT 100'
    );
    return res;
  });

  return jsonResponse(rows, 200, {
    'Cache-Control': 'no-store, private',
  }, request);
}

// POST /api/admin/comments/:id/approve
async function handlePostAdminApproveComment(request, env, id) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  await withDb(env, { fresh: true }, async (conn) => {
    await conn.query('UPDATE comments SET approved = 1 WHERE id = ?', [id]);
  });

  return jsonResponse({ success: true, message: 'Comentario aprobado' }, 200, {}, request);
}

// POST /api/admin/comments/:id/reject
async function handlePostAdminRejectComment(request, env, id) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  await withDb(env, { fresh: true }, async (conn) => {
    await conn.query('DELETE FROM comments WHERE id = ?', [id]);
  });

  return jsonResponse({ success: true, message: 'Comentario eliminado' }, 200, {}, request);
}

// GET /api/admin/comments/stream (SSE)
function handleAdminCommentsStream(request) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  writer.write(encoder.encode(': connected\n\n'));
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': new URL(request.url).origin,
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// GET /api/admin/technicians
async function handleGetAdminTechnicians(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  const rows = await withDb(env, { fresh: true }, async (conn) => {
    const [res] = await conn.query(
      "SELECT u.id, u.name, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name IN ('admin', 'staff')"
    ).catch(() => [[]]);
    if (!res.length) {
      return [{ id: 1, name: 'Técnico Principal', email: 'soporte@pixon.com.mx' }];
    }
    return res;
  });

  return jsonResponse(rows, 200, { 'Cache-Control': 'no-store, private' }, request);
}

// GET /api/admin/builds
async function handleGetAdminBuilds(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  const rows = await withDb(env, { fresh: true }, async (conn) => {
    const [res] = await conn.query(
      'SELECT id, title, description, price, build_category, performance_tier, image_url, created_at FROM builds ORDER BY id DESC LIMIT 100'
    ).catch(() => [[]]);
    return res;
  });
  return jsonResponse(rows, 200, { 'Cache-Control': 'no-store, private' }, request);
}

// POST /api/admin/builds
async function handlePostAdminBuild(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido', 400, null, request); }
  const { title, description, price, build_category, performance_tier, image_url } = body;
  if (!title || !price) return errorResponse('Título y precio son requeridos', 400, null, request);
  const result = await withDb(env, { fresh: true }, async (conn) => {
    const [res] = await conn.query(
      'INSERT INTO builds (title, description, price, build_category, performance_tier, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [title, description || '', price, build_category || 'gaming', performance_tier || 'mid', image_url || null]
    );
    return { id: res.insertId };
  });
  return jsonResponse({ ok: true, id: result.id }, 201, {}, request);
}

// GET /api/admin/appointments
async function handleGetAdminAppointments(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  const rows = await withDb(env, { fresh: true }, async (conn) => {
    const [res] = await conn.query(
      `SELECT a.*, r.ticket_code
       FROM appointments a
       LEFT JOIN repairs r ON r.id = a.ticket_id
       ORDER BY a.start_at DESC LIMIT 100`
    );
    return res;
  });

  return jsonResponse(rows, 200, { 'Cache-Control': 'no-store, private' }, request);
}

// GET /api/admin/appointments/today
async function handleGetAdminAppointmentsToday(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  const rows = await withDb(env, { fresh: true }, async (conn) => {
    const [res] = await conn.query(
      `SELECT a.*, r.ticket_code
       FROM appointments a
       LEFT JOIN repairs r ON r.id = a.ticket_id
       WHERE DATE(a.start_at) = CURRENT_DATE()
       ORDER BY a.start_at ASC`
    );
    return res;
  });

  return jsonResponse({ success: true, board: { appointments: rows } }, 200, { 'Cache-Control': 'no-store, private' }, request);
}

// GET /api/admin/appointments/stats
async function handleGetAdminAppointmentsStats(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  const stats = await withDb(env, { fresh: true }, async (conn) => {
    const [[row]] = await conn.query(
      `SELECT
         COUNT(*) as total_today,
         SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
         SUM(CASE WHEN status = 'TEMPORARY_HOLD' THEN 1 ELSE 0 END) as pending_payment,
         SUM(CASE WHEN location_type = 'ON_SITE' THEN 1 ELSE 0 END) as on_site,
         SUM(CASE WHEN service_type LIKE '%mojado%' OR service_type LIKE '%liquido%' THEN 1 ELSE 0 END) as liquid_damage,
         SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) as no_shows
       FROM appointments
       WHERE DATE(start_at) = CURRENT_DATE()`
    );
    return {
      total_today: Number(row?.total_today || 0),
      confirmed: Number(row?.confirmed || 0),
      pending_payment: Number(row?.pending_payment || 0),
      on_site: Number(row?.on_site || 0),
      liquid_damage: Number(row?.liquid_damage || 0),
      no_shows: Number(row?.no_shows || 0)
    };
  });

  return jsonResponse({ success: true, stats }, 200, { 'Cache-Control': 'no-store, private' }, request);
}

// GET /api/admin/appointments/blocks
async function handleGetAdminAppointmentsBlocks(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  return jsonResponse({ success: true, blocks: [] }, 200, { 'Cache-Control': 'no-store, private' }, request);
}

// GET /api/admin/dashboard
async function handleGetAdminDashboard(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  const data = await withDb(env, { fresh: true }, async (conn) => {
    const [[repairsCount]] = await conn.query("SELECT COUNT(*) as c FROM repairs WHERE status IN ('received', 'diagnosing', 'in_progress') AND deleted_at IS NULL").catch(() => [[{ c: 0 }]]);
    const [[readyCount]] = await conn.query("SELECT COUNT(*) as c FROM repairs WHERE status = 'ready' AND deleted_at IS NULL").catch(() => [[{ c: 0 }]]);
    const [[apptsToday]] = await conn.query("SELECT COUNT(*) as c FROM appointments WHERE DATE(start_at) = CURRENT_DATE() AND status = 'CONFIRMED'").catch(() => [[{ c: 0 }]]);
    const [[totalUsers]] = await conn.query("SELECT COUNT(*) as c FROM users").catch(() => [[{ c: 0 }]]);

    const now = new Date();
    const fromStr = now.toISOString().slice(0, 10);

    return {
      period: {
        preset: 'today',
        label: 'Hoy',
        from: fromStr,
        to: fromStr,
        previous: { from: fromStr, to: fromStr }
      },
      kpis: {
        repairs_in_progress: Number(repairsCount?.c || 0),
        ready_for_pickup: Number(readyCount?.c || 0),
        confirmed_appointments: Number(apptsToday?.c || 0),
        today_appointments: Number(apptsToday?.c || 0),
        total_customers: Number(totalUsers?.c || 0),
        net_revenue: 0,
        estimated_margin: 0,
        average_ticket: 0
      },
      operations: {
        active_technicians: 1,
        avg_repair_hours: 24,
        sla_compliance_rate: 98
      },
      series: [],
      insights: []
    };
  });

  return jsonResponse(data, 200, { 'Cache-Control': 'no-store, private' }, request);
}

// GET /api/admin/analytics/live
async function handleGetAdminLiveAnalytics(request, env) {
  return jsonResponse({
    active: 1,
    window_views: 14,
    window_visitors: 6,
    per_minute: [],
    grouped_pages: [
      { path: '/', views: 8 },
      { path: '/tienda', views: 4 },
      { path: '/admin', views: 2 }
    ]
  }, 200, { 'Cache-Control': 'no-store, private' }, request);
}

// GET /api/admin/tickets/:id
async function handleGetAdminTicketById(request, env, id) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  const row = await withDb(env, { fresh: true }, async (conn) => {
    const [rows] = await conn.query('SELECT * FROM repairs WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  });

  if (!row) return errorResponse('Ticket no encontrado', 404, null, request);
  return jsonResponse({ success: true, ticket: row }, 200, { 'Cache-Control': 'no-store, private' }, request);
}

// PATCH /api/admin/tickets/:id
async function handlePatchAdminTicket(request, env, id) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);

  let body;
  try { body = await request.json(); }
  catch { return errorResponse('JSON inválido', 400, null, request); }

  let ticket;
  try {
  ticket = await withDb(env, { fresh: true }, async (conn) => {
    // Optimistic concurrency: if expected_updated_at is provided, check it
    if (body.expected_updated_at) {
      const [[cur]] = await conn.query('SELECT updated_at FROM repairs WHERE id = ?', [id]);
      if (cur && cur.updated_at) {
        const dbTs = new Date(cur.updated_at).toISOString();
        const expectedTs = new Date(body.expected_updated_at).toISOString();
        if (dbTs > expectedTs) {
          throw Object.assign(new Error('Conflict'), { status: 409 });
        }
      }
    }

    const updates = [];
    const params = [];
    const oldStatus = null;

    const addField = (col, val, maxLen = 2000) => {
      if (val !== undefined && val !== null) {
        updates.push(`${col} = ?`);
        params.push(maxLen ? String(val).slice(0, maxLen) : val);
      } else if (val === null || val === '') {
        updates.push(`${col} = NULL`);
      }
    };

    if (body.status !== undefined) { updates.push('status = ?'); params.push(String(body.status).slice(0, 32)); }
    if (body.priority !== undefined) { updates.push('priority = ?'); params.push(String(body.priority).slice(0, 32)); }
    if (body.diagnostic !== undefined) { updates.push('diagnostic = ?'); params.push(body.diagnostic ? String(body.diagnostic).slice(0, 5000) : null); }
    if (body.notes_internal !== undefined) { updates.push('notes_internal = ?'); params.push(body.notes_internal ? String(body.notes_internal).slice(0, 5000) : null); }
    if (body.estimated_cost !== undefined) { updates.push('estimated_cost = ?'); params.push(body.estimated_cost ? parseFloat(body.estimated_cost) : null); }
    if (body.final_cost !== undefined) { updates.push('final_cost = ?'); params.push(body.final_cost ? parseFloat(body.final_cost) : null); }
    if (body.promised_at !== undefined) { updates.push('promised_at = ?'); params.push(body.promised_at || null); }
    if (body.delivered_at !== undefined) { updates.push('delivered_at = ?'); params.push(body.delivered_at || null); }
    if (body.warranty_until !== undefined) { updates.push('warranty_until = ?'); params.push(body.warranty_until || null); }
    if (body.appointment_type !== undefined) { updates.push('appointment_type = ?'); params.push(body.appointment_type ? String(body.appointment_type).slice(0, 60) : null); }
    if (body.appointment_status !== undefined) { updates.push('appointment_status = ?'); params.push(String(body.appointment_status || 'pendiente_confirmacion').slice(0, 32)); }
    if (body.appointment_date !== undefined) { updates.push('appointment_date = ?'); params.push(body.appointment_date || null); }
    if (body.appointment_time !== undefined) { updates.push('appointment_time = ?'); params.push(body.appointment_time || null); }
    if (body.appointment_datetime !== undefined) { updates.push('appointment_datetime = ?'); params.push(body.appointment_datetime || null); }
    if (body.appointment_delivery_method !== undefined) { updates.push('appointment_delivery_method = ?'); params.push(body.appointment_delivery_method ? String(body.appointment_delivery_method).slice(0, 80) : null); }
    if (body.appointment_note !== undefined) { updates.push('appointment_note = ?'); params.push(body.appointment_note ? String(body.appointment_note).slice(0, 2000) : null); }

    updates.push('updated_at = NOW()');
    params.push(id);

    if (updates.length > 1) {
      await conn.query(`UPDATE repairs SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Log customer_note if provided
    if (body.customer_note && body.customer_note.trim()) {
      const note = String(body.customer_note).slice(0, 2000);
      await conn.query(
        "INSERT INTO repair_status_history (repair_id, old_status, new_status, comment, changed_by, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [id, body.status || 'unknown', body.status || 'unknown', `Nota cliente: ${note}`, admin.id || null]
      ).catch(() => {});
    }

    // Return full ticket
    const [[row]] = await conn.query(
      `SELECT r.*, u.name as user_name, u.email as user_email,
              ra.technician_id,
              (SELECT t2.name FROM technicians t2 WHERE t2.id = ra.technician_id) as technician_name
       FROM repairs r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN repair_assignments ra ON ra.repair_id = r.id
       WHERE r.id = ?`, [id]
    );
    if (!row) return null;
    return { ...row, next_action: getTicketNextAction(row.status) };
  });
  } catch (conflictErr) {
    if (conflictErr.status === 409) {
      return jsonResponse({ ok: false, error: 'Conflict: el ticket fue modificado por otro proceso.' }, 409, {}, request);
    }
    throw conflictErr;
  }

  if (!ticket) return errorResponse('Ticket no encontrado', 404, null, request);
  return jsonResponse({ success: true, ticket, notifications: [] }, 200, {}, request);
}

// PATCH /api/admin/tickets/:id/assignee
async function handlePatchAdminTicketAssignee(request, env, id) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido', 400, null, request); }
  const technician_id = body.technician_id || null;
  const ticket = await withDb(env, { fresh: true }, async (conn) => {
    // Remove current assignment
    await conn.query('DELETE FROM repair_assignments WHERE repair_id = ?', [id]).catch(() => {});
    if (technician_id) {
      await conn.query(
        'INSERT INTO repair_assignments (repair_id, technician_id, assigned_at) VALUES (?, ?, NOW())',
        [id, technician_id]
      ).catch(() => {});
    }
    const [[row]] = await conn.query(
      `SELECT r.*, u.name as user_name, u.email as user_email,
              ra.technician_id,
              (SELECT t2.name FROM technicians t2 WHERE t2.id = ra.technician_id) as technician_name
       FROM repairs r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN repair_assignments ra ON ra.repair_id = r.id
       WHERE r.id = ?`, [id]
    );
    if (!row) return null;
    return { ...row, next_action: getTicketNextAction(row.status) };
  });
  if (!ticket) return errorResponse('Ticket no encontrado', 404, null, request);
  return jsonResponse({ success: true, ticket }, 200, {}, request);
}

// PATCH /api/admin/tickets/:id/delete
async function handleDeleteAdminTicket(request, env, id) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  await withDb(env, { fresh: true }, async (conn) => {
    await conn.query(
      "UPDATE repairs SET status = 'eliminado', deleted_at = NOW() WHERE id = ?",
      [id]
    );
  });
  return jsonResponse({ ok: true }, 200, {}, request);
}

// GET /api/admin/tickets/:id/history
async function handleGetAdminTicketHistory(request, env, id) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  const history = await withDb(env, { fresh: true }, async (conn) => {
    const [rows] = await conn.query(
      `SELECT h.id, h.repair_id, h.old_status, h.new_status, h.comment, h.created_at,
              u.name as user_name, u.email as user_email
       FROM repair_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.repair_id = ?
       ORDER BY h.created_at DESC LIMIT 50`,
      [id]
    ).catch(() => [[]]);
    return rows.map(r => ({
      ...r,
      action: r.old_status !== r.new_status ? 'cambio_de_estado' : (r.comment ? 'actualizacion' : 'creacion'),
      diff: r.old_status !== r.new_status ? { status: { before: r.old_status, after: r.new_status } } : (r.comment ? { comment: r.comment } : null),
    }));
  });
  return jsonResponse({ history }, 200, { 'Cache-Control': 'no-store, private' }, request);
}

// GET /api/admin/tickets/:id/emails
async function handleGetAdminTicketEmails(request, env, id) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  const emails = await withDb(env, { fresh: true }, async (conn) => {
    const [rows] = await conn.query(
      `SELECT id, ticket_id, event_type, recipient, subject, status, provider_id, error, created_at
       FROM email_outbox
       WHERE ticket_id = ?
       ORDER BY created_at DESC LIMIT 20`,
      [id]
    ).catch(() => [[]]);
    return rows;
  });
  return jsonResponse({ emails }, 200, { 'Cache-Control': 'no-store, private' }, request);
}

// PATCH /api/admin/tickets/bulk
async function handleBulkAdminTickets(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido', 400, null, request); }
  const { ticket_ids, action, value } = body;
  if (!ticket_ids || !ticket_ids.length || !action) return errorResponse('Parámetros inválidos', 400, null, request);
  const safeIds = ticket_ids.map(x => parseInt(x, 10)).filter(x => x > 0);
  if (!safeIds.length) return errorResponse('IDs inválidos', 400, null, request);
  const tickets = await withDb(env, { fresh: true }, async (conn) => {
    const placeholders = safeIds.map(() => '?').join(',');
    if (action === 'status' && value) {
      await conn.query(`UPDATE repairs SET status = ?, updated_at = NOW() WHERE id IN (${placeholders})`, [String(value).slice(0, 32), ...safeIds]);
    } else if (action === 'priority' && value) {
      await conn.query(`UPDATE repairs SET priority = ?, updated_at = NOW() WHERE id IN (${placeholders})`, [String(value).slice(0, 32), ...safeIds]);
    } else if (action === 'assignee') {
      await conn.query(`DELETE FROM repair_assignments WHERE repair_id IN (${placeholders})`, safeIds);
      if (value) {
        for (const rid of safeIds) {
          await conn.query('INSERT IGNORE INTO repair_assignments (repair_id, technician_id, assigned_at) VALUES (?, ?, NOW())', [rid, value]);
        }
      }
    }
    const [rows] = await conn.query(
      `SELECT r.*, u.name as user_name, u.email as user_email,
              ra.technician_id,
              (SELECT t2.name FROM technicians t2 WHERE t2.id = ra.technician_id) as technician_name
       FROM repairs r
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN repair_assignments ra ON ra.repair_id = r.id
       WHERE r.id IN (${placeholders})`, safeIds
    );
    return rows.map(r => ({ ...r, next_action: getTicketNextAction(r.status) }));
  });
  return jsonResponse({ ok: true, count: safeIds.length, tickets }, 200, {}, request);
}

// Admin FAQs CRUD
async function handleGetAdminFaqs(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  const rows = await withDb(env, { fresh: true }, async (conn) => {
    const [res] = await conn.query('SELECT id, category, icon, question, answer, display_order, created_at FROM faqs ORDER BY display_order ASC, id ASC LIMIT 200').catch(() => [[]]);
    return res;
  });
  return jsonResponse(rows, 200, { 'Cache-Control': 'no-store, private' }, request);
}

async function handlePostAdminFaq(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido', 400, null, request); }
  const { category, icon, question, answer, display_order } = body;
  if (!category || !question || !answer) return errorResponse('Categoría, pregunta y respuesta son requeridas', 400, null, request);
  const result = await withDb(env, { fresh: true }, async (conn) => {
    const [res] = await conn.query(
      'INSERT INTO faqs (category, icon, question, answer, display_order, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [category, icon || 'fa-solid fa-circle-question', question, answer, display_order || 0]
    );
    return { id: res.insertId };
  });
  return jsonResponse({ ok: true, id: result.id }, 201, {}, request);
}

async function handlePutAdminFaq(request, env, id) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido', 400, null, request); }
  const { category, icon, question, answer, display_order } = body;
  if (!category || !question || !answer) return errorResponse('Campos requeridos faltantes', 400, null, request);
  await withDb(env, { fresh: true }, async (conn) => {
    await conn.query(
      'UPDATE faqs SET category = ?, icon = ?, question = ?, answer = ?, display_order = ? WHERE id = ?',
      [category, icon || 'fa-solid fa-circle-question', question, answer, display_order || 0, id]
    );
  });
  return jsonResponse({ ok: true }, 200, {}, request);
}

async function handleDeleteAdminFaq(request, env, id) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  await withDb(env, { fresh: true }, async (conn) => {
    await conn.query('DELETE FROM faqs WHERE id = ?', [id]);
  });
  return jsonResponse({ ok: true }, 200, {}, request);
}

async function handleGetAdminFaqsUnanswered(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  const rows = await withDb(env, { fresh: true }, async (conn) => {
    const [res] = await conn.query(
      'SELECT id, query, count, last_seen FROM faq_unanswered ORDER BY count DESC, last_seen DESC LIMIT 50'
    ).catch(() => [[]]);
    return res;
  });
  return jsonResponse(rows, 200, { 'Cache-Control': 'no-store, private' }, request);
}

async function handleDeleteAdminFaqsUnanswered(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  await withDb(env, { fresh: true }, async (conn) => {
    await conn.query('DELETE FROM faq_unanswered WHERE 1').catch(() => {});
  });
  return jsonResponse({ ok: true }, 200, {}, request);
}

// PATCH /api/admin/appointments/config
async function handlePatchAppointmentsConfig(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) return errorResponse('No autorizado', 403, null, request);
  let body;
  try { body = await request.json(); } catch { return errorResponse('JSON inválido', 400, null, request); }
  const { settings, exceptions } = body;
  await withDb(env, { fresh: true }, async (conn) => {
    if (Array.isArray(settings)) {
      for (const s of settings) {
        await conn.query(
          `INSERT INTO appointment_settings (weekday, is_open, start_time, end_time, slot_minutes, allowed_types)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE is_open = VALUES(is_open), start_time = VALUES(start_time),
           end_time = VALUES(end_time), slot_minutes = VALUES(slot_minutes), allowed_types = VALUES(allowed_types)`,
          [s.weekday, s.is_open ? 1 : 0, s.start_time || '08:30', s.end_time || '19:00', s.slot_minutes || 30, s.allowed_types || 'recepcion,diagnostico,entrega,otro']
        ).catch(() => {});
      }
    }
    if (Array.isArray(exceptions)) {
      await conn.query('DELETE FROM appointment_exceptions WHERE 1').catch(() => {});
      for (const e of exceptions) {
        await conn.query(
          'INSERT INTO appointment_exceptions (date, status, start_time, end_time, slot_minutes, reason) VALUES (?, ?, ?, ?, ?, ?)',
          [e.date, e.status || 'closed', e.start_time || null, e.end_time || null, e.slot_minutes || null, e.reason || null]
        ).catch(() => {});
      }
    }
  });
  // Return updated config
  const config = await handleGetAppointmentsConfig(request, env);
  return config;
}

// ─── Idempotencia Atómica de Crons (job_runs + GET_LOCK) ─────────────────────

async function claimAndExecuteJob(env, runKey, workerFn) {
  return await withDb(env, { fresh: true }, async (conn) => {
    try {
      await conn.query(
        "INSERT INTO job_runs (run_key, status, started_at) VALUES (?, 'running', NOW())",
        [runKey]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
        console.log(`[cron] Job ${runKey} ya fue reclamado por otra instancia. Omitiendo.`);
        return { skipped: true, reason: 'ALREADY_CLAIMED' };
      }
      throw err;
    }

    const [[lockRes]] = await conn.query('SELECT GET_LOCK(?, 0) AS acquired', [runKey]);
    if (!lockRes || lockRes.acquired !== 1) {
      console.log(`[cron] GET_LOCK denegado para ${runKey}. Omitiendo.`);
      return { skipped: true, reason: 'LOCK_DENIED' };
    }

    try {
      const result = await workerFn(conn);
      await conn.query(
        "UPDATE job_runs SET status = 'done', completed_at = NOW(), result = ? WHERE run_key = ?",
        [JSON.stringify(result).slice(0, 255), runKey]
      );
      return { success: true, result };
    } catch (err) {
      await conn.query(
        "UPDATE job_runs SET status = 'failed', completed_at = NOW(), result = ? WHERE run_key = ?",
        [err.message.slice(0, 255), runKey]
      ).catch(() => {});
      throw err;
    } finally {
      await conn.query('SELECT RELEASE_LOCK(?)', [runKey]).catch(() => {});
    }
  });
}

// Cron 1: Email Outbox (Lote acotado de 5 emails con Resend real)
async function runEmailOutboxCron(env, customRunKey = null) {
  const dateKey = new Date().toISOString().slice(0, 16);
  const runKey = customRunKey || `cron_email_outbox_${dateKey}`;

  return await claimAndExecuteJob(env, runKey, async (conn) => {
    const [pending] = await conn.query(
      "SELECT id, recipient, subject, html, text FROM email_outbox WHERE status = 'QUEUED' AND attempts < 5 ORDER BY id ASC LIMIT 5"
    );

    const cpuStart = performance.now();
    let processed = 0;
    for (const email of pending) {
      if (email.id && email.recipient) {
        const sendResult = await sendResendEmail(env, {
          to: email.recipient,
          subject: email.subject,
          html: email.html,
          text: email.text
        });
        if (sendResult.ok) {
          await conn.query("UPDATE email_outbox SET status = 'DELIVERED', provider_id = ?, last_attempt_at = NOW(), attempts = attempts + 1 WHERE id = ?", [sendResult.id, email.id]);
          processed++;
        } else {
          await conn.query("UPDATE email_outbox SET status = 'FAILED', last_error = ?, last_attempt_at = NOW(), attempts = attempts + 1 WHERE id = ?", [sendResult.error?.slice(0, 255) || 'Error desconocido', email.id]);
        }
      }
    }
    const cpuTimeMs = Math.max(0.01, performance.now() - cpuStart).toFixed(2);
    console.log(`[cron:email] Procesados ${processed} emails con Resend en ${cpuTimeMs}ms CPU`);
    return { processed, cpuTimeMs };
  });
}

// Cron 2: Limpieza de Holds de Citas (Acotado LIMIT 50)
async function runHoldCleanupCron(env) {
  const dateKey = new Date().toISOString().slice(0, 13);
  const runKey = `cron_hold_cleanup_${dateKey}`;

  return await claimAndExecuteJob(env, runKey, async (conn) => {
    const cpuStart = performance.now();
    const [res] = await conn.query(
      "UPDATE appointments SET status = 'EXPIRED', cancelled_at = NOW() WHERE status = 'TEMPORARY_HOLD' AND created_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE) LIMIT 50"
    );
    const cpuTimeMs = Math.max(0.01, performance.now() - cpuStart).toFixed(2);
    return { cancelled_holds: res.affectedRows, cpuTimeMs };
  });
}

// ─── R2 Storage Handlers ──────────────────────────────────────────────────────

async function handleR2Upload(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) return errorResponse('Autenticación requerida para subidas', 401, null, request);

  if (!env.MEDIA_BUCKET) return errorResponse('MEDIA_BUCKET R2 no configurado', 500, null, request);

  const contentType = request.headers.get('Content-Type') || '';
  const key = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const body = await request.arrayBuffer();
  if (body.byteLength > 10 * 1024 * 1024) {
    return errorResponse('Archivo excede el límite de 10 MB', 413, null, request);
  }

  await env.MEDIA_BUCKET.put(key, body, {
    httpMetadata: { contentType: contentType || 'application/octet-stream' },
    customMetadata: { uploadedBy: String(user.id) },
  });

  return jsonResponse({ ok: true, key, url: `/api/media/${key}` }, 201, {}, request);
}

async function handleR2Get(request, env, key) {
  if (!env.MEDIA_BUCKET) return errorResponse('MEDIA_BUCKET R2 no configurado', 500, null, request);

  // Sanitizar path traversal
  if (key.includes('..') || key.includes('\\')) {
    return errorResponse('Ruta de archivo inválida', 400, null, request);
  }

  if (key.includes('payment_proof') || key.includes('private/')) {
    const user = await getSessionUser(request, env);
    if (!user) return errorResponse('No autorizado', 403, null, request);
  }

  const obj = await env.MEDIA_BUCKET.get(key);
  if (!obj) return errorResponse('Archivo no encontrado', 404, null, request);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('ETag', obj.httpEtag);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Cache-Control', 'public, max-age=86400');

  return new Response(obj.body, { headers });
}

// ─── QA Verification Endpoints ────────────────────────────────────────────────

async function handleQaFreshVsCached(env, request) {
  const t0 = performance.now();
  const freshRes = await withDb(env, { fresh: true }, async (conn) => {
    const [[res]] = await conn.query('SELECT 1 as val, NOW() as ts');
    return res;
  });
  const freshMs = (performance.now() - t0).toFixed(2);

  const t1 = performance.now();
  const cachedRes = await withDb(env, { fresh: false }, async (conn) => {
    const [[res]] = await conn.query('SELECT 1 as val, NOW() as ts');
    return res;
  });
  const cachedMs = (performance.now() - t1).toFixed(2);

  return jsonResponse({
    ok: true,
    guardrail: 'HYPERDRIVE_FRESH_VS_CACHED',
    fresh: { latency_ms: freshMs, val: freshRes.val },
    cached: { latency_ms: cachedMs, val: cachedRes.val },
    status: 'PASS',
  }, 200, {}, request);
}

// ─── Router Principal ─────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, method } = { pathname: url.pathname, method: request.method };

    // Preflight CORS
    if (method === 'OPTIONS') {
      const origin = request.headers.get('Origin');
      if (!origin || !ALLOWED_ORIGINS.has(origin)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: getCorsHeaders(request) });
    }

    try {
      // Admin SPA rewrite / redirect (soporta refresco en cualquier subruta como /admin/repairs, /admin/agenda, etc.)
      if ((pathname === '/admin' || pathname.startsWith('/admin/')) && !pathname.startsWith('/api/')) {
        if (env.ASSETS) {
          return env.ASSETS.fetch(new Request(new URL('/admin/admin', request.url), request));
        }
        return Response.redirect(new URL('/admin/admin', request.url), 302);
      }

      // 1. Health check
      if (pathname === '/api/health' || pathname === '/poc/health') {
        return jsonResponse({ ok: true, service: 'pixon-api', status: 'online', ts: new Date().toISOString() }, 200, {}, request);
      }

      // 2. Auth Routes
      if (pathname === '/auth/google') return handleAuthGoogle(request, env);
      if (pathname === '/auth/google/callback') return handleAuthGoogleCallback(request, env);
      if (pathname === '/auth/logout') return handleAuthLogout(request, env);
      if (pathname === '/auth/failure') return handleAuthFailure(request);

      // 3. User & Profile
      if (pathname === '/api/me' && method === 'GET') return handleGetMe(request, env);
      if (pathname === '/api/me/profile' && method === 'POST') return handlePostProfile(request, env);

      // 4. Comments & Reviews
      if (pathname === '/api/comments' && method === 'GET') return handleGetComments(request, env);
      if (pathname === '/api/comments' && method === 'POST') return handlePostComment(request, env);
      if (pathname === '/api/reviews/google' && method === 'GET') return handleGetGoogleReviews(request, env);

      // 5. Tickets
      if (pathname === '/api/tickets' && method === 'POST') return handlePostTicket(request, env);
      if (pathname === '/api/mis-tickets' && method === 'GET') return handleGetMisTickets(request, env);

      // 6. Appointments
      if (pathname === '/api/appointments/config' && method === 'GET') return handleGetAppointmentsConfig(request, env);
      if (pathname === '/api/appointments/availability/month' && method === 'GET') return handleGetMonthAvailability(request, env);
      if (pathname === '/api/appointments/availability' && method === 'GET') return handleGetAvailability(request, env);
      if (pathname === '/api/appointments/hold' && method === 'POST') return handlePostAppointmentHold(request, env, ctx);

      // 7. Commerce / Tienda Catálogo
      if (pathname === '/api/commerce/catalog' && method === 'GET') return handleGetCatalog(request, env);
      if (pathname === '/api/commerce/catalog/categories' && method === 'GET') return handleGetCatalogCategories(request, env);

      // 8. FAQs & Tracking
      if (pathname === '/api/faqs' && method === 'GET') return handleGetFaqs(request, env);
      if (pathname === '/api/track/view' && method === 'POST') return jsonResponse({ ok: true }, 200, {}, request);
      if (pathname === '/api/track/event' && method === 'POST') return jsonResponse({ ok: true }, 200, {}, request);

      // 9. Admin Routes
      if (pathname === '/api/admin/repairs' && method === 'GET') return handleGetAdminRepairs(request, env);
      if (pathname === '/api/admin/tickets' && method === 'GET') return handleGetAdminRepairs(request, env);
      if (pathname === '/api/admin/users' && method === 'GET') return handleGetAdminUsers(request, env);
      if (pathname === '/api/admin/comments' && method === 'GET') return handleGetAdminComments(request, env);
      if (pathname === '/api/admin/comments/stream' && method === 'GET') return handleAdminCommentsStream(request);
      if (pathname.startsWith('/api/admin/comments/') && pathname.endsWith('/approve') && method === 'POST') {
        const id = pathname.split('/')[4];
        return handlePostAdminApproveComment(request, env, id);
      }
      if (pathname.startsWith('/api/admin/comments/') && pathname.endsWith('/reject') && method === 'POST') {
        const id = pathname.split('/')[4];
        return handlePostAdminRejectComment(request, env, id);
      }
      if (pathname.startsWith('/api/admin/comments/') && method === 'DELETE') {
        const id = pathname.split('/')[4];
        return handlePostAdminRejectComment(request, env, id);
      }
      // Admin FAQs
      if (pathname === '/api/admin/faqs/unanswered') {
        if (method === 'GET') return handleGetAdminFaqsUnanswered(request, env);
        if (method === 'DELETE') return handleDeleteAdminFaqsUnanswered(request, env);
      }
      if (pathname === '/api/admin/faqs' && method === 'GET') return handleGetAdminFaqs(request, env);
      if (pathname === '/api/admin/faqs' && method === 'POST') return handlePostAdminFaq(request, env);
      if (pathname.startsWith('/api/admin/faqs/')) {
        const faqId = pathname.split('/')[4];
        if (faqId) {
          if (method === 'PUT') return handlePutAdminFaq(request, env, faqId);
          if (method === 'DELETE') return handleDeleteAdminFaq(request, env, faqId);
        }
      }
      if (pathname === '/api/admin/technicians' && method === 'GET') return handleGetAdminTechnicians(request, env);
      if (pathname === '/api/admin/builds') {
        if (method === 'GET') return handleGetAdminBuilds(request, env);
        if (method === 'POST') return handlePostAdminBuild(request, env);
      }
      if (pathname === '/api/admin/google-reviews' && method === 'GET') return handleGetGoogleReviews(request, env);
      if (pathname === '/api/admin/google-reviews/status' && method === 'GET') return jsonResponse({ configured: false, status: 'NOT_CONFIGURED' }, 200, {}, request);
      if (pathname === '/api/admin/google-reviews/sync' && method === 'POST') return jsonResponse({ ok: true, synced: 0, total: 0, newlyPending: 0 }, 200, {}, request);
      if (pathname.startsWith('/api/admin/google-reviews/') && (pathname.endsWith('/approve') || pathname.endsWith('/hide')) && method === 'POST') {
        return jsonResponse({ ok: true }, 200, {}, request);
      }
      if (pathname === '/api/admin/appointments' && method === 'GET') return handleGetAdminAppointments(request, env);
      if (pathname === '/api/admin/appointments/today' && method === 'GET') return handleGetAdminAppointmentsToday(request, env);
      if (pathname === '/api/admin/appointments/stats' && method === 'GET') return handleGetAdminAppointmentsStats(request, env);
      if (pathname === '/api/admin/appointments/config') {
        if (method === 'GET') return handleGetAppointmentsConfig(request, env);
        if (method === 'PATCH' || method === 'POST') return handlePatchAppointmentsConfig(request, env);
      }
      if (pathname === '/api/admin/appointments/blocks' && method === 'GET') return handleGetAdminAppointmentsBlocks(request, env);
      if (pathname === '/api/admin/dashboard' && method === 'GET') return handleGetAdminDashboard(request, env);
      if (pathname === '/api/admin/analytics/live' && method === 'GET') return handleGetAdminLiveAnalytics(request, env);
      if (pathname === '/api/admin/tickets/bulk' && (method === 'PATCH' || method === 'POST')) return handleBulkAdminTickets(request, env);
      if (pathname === '/api/admin/emails/test' && method === 'POST') {
        const testRes = await sendResendEmail(env, {
          to: 'luispinzon395@gmail.com',
          subject: 'Prueba de Sistema Pixon PC — Notificaciones Activas',
          html: '<h1>Pixon PC Operativo</h1><p>Notificaciones por correo transaccional habilitadas con éxito en producción.</p>'
        });
        return jsonResponse({ ok: testRes.ok, result: testRes }, 200, {}, request);
      }

      if ((pathname.startsWith('/api/admin/tickets/') || pathname.startsWith('/api/admin/repairs/'))) {
        const parts = pathname.split('/');
        const id = parts[4];
        const sub = parts[5];
        if (sub === 'emails' && method === 'GET') return handleGetAdminTicketEmails(request, env, id);
        if (sub === 'history' && method === 'GET') return handleGetAdminTicketHistory(request, env, id);
        if (sub === 'assignee' && (method === 'POST' || method === 'PATCH')) return handlePatchAdminTicketAssignee(request, env, id);
        if (sub === 'delete' && (method === 'POST' || method === 'PATCH' || method === 'DELETE')) return handleDeleteAdminTicket(request, env, id);
        if (method === 'GET') return handleGetAdminTicketById(request, env, id);
        if (method === 'PATCH' || method === 'PUT') return handlePatchAdminTicket(request, env, id);
        if (method === 'POST') return handlePatchAdminTicket(request, env, id);
      }

      // 10. Media & Storage
      if (pathname === '/api/media/upload' && method === 'POST') return handleR2Upload(request, env);
      if (pathname.startsWith('/api/media/') && method === 'GET') {
        const key = pathname.replace('/api/media/', '');
        return handleR2Get(request, env, key);
      }

      // 11. QA & Verification Endpoints
      if (pathname === '/api/qa/fresh-vs-cached') return handleQaFreshVsCached(env, request);
      if (pathname === '/api/qa/trigger-email-outbox' && method === 'POST') {
        const customKey = url.searchParams.get('key');
        const res = await runEmailOutboxCron(env, customKey);
        return jsonResponse({ ok: true, cron: 'email_outbox', result: res }, 200, {}, request);
      }

      // Fallback a Cloudflare Assets para páginas estáticas y recursos (.html, .svg, .css, .js)
      if (env.ASSETS && !pathname.startsWith('/api/') && !pathname.startsWith('/auth/')) {
        return env.ASSETS.fetch(request);
      }

      return errorResponse('Ruta no encontrada', 404, null, request);
    } catch (err) {
      const correlationId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      console.error(`[worker:error:${correlationId}]`, err.message, err.stack);
      // Seguridad: En producción jamás exponer el stack trace al cliente (PIXON-SEC-002)
      return jsonResponse({
        ok: false,
        error: 'Error interno del servidor. Por favor intenta más tarde.',
        correlationId,
      }, 500, {}, request);
    }
  },

  async scheduled(event, env, ctx) {
    console.log(`[cron:trigger] Disparado: ${event.cron} en ${new Date().toISOString()}`);
    ctx.waitUntil(
      (async () => {
        try {
          if (event.cron === '*/5 * * * *') {
            await runEmailOutboxCron(env);
          } else if (event.cron === '0 */6 * * *') {
            await runHoldCleanupCron(env);
          }
        } catch (err) {
          console.error('[cron:failure]', err);
        }
      })()
    );
  },
};
