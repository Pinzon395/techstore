/**
 * ============================================================
 *  server/server.js  â¬ API Express + MariaDB + Auth
 * ============================================================
 *
 *  Migrado a MariaDB (mysql2/promise pool) + express-mysql-session.
 *  Las funciones de DB son async â¬ todos los handlers usan await.
 * ============================================================
 */

'use strict';

require('dotenv').config();
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MySQLStore = require('express-mysql-session')(session);
const { ah } = require('./middlewares/async.middleware');
const { createLimiter } = require('./middlewares/rateLimit.middleware');
const { errorHandler } = require('./middlewares/error.middleware');
const createHealthRoutes = require('./routes/health.routes');
const {
    cleanText,
    cleanMultilineText,
    stripHtml,
    cleanPhone,
    isValidPhone,
    cleanEmail,
    cleanDate,
    cleanTime,
    cleanBoolean,
    toPositiveInt,
    hasHtml
} = require('./utils/validators');
const { logError } = require('./utils/logger');

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = String(process.env.SESSION_SECRET || '').trim();

if (isProduction && !sessionSecret) {
    throw new Error('SESSION_SECRET es obligatorio en produccion.');
}

const {
    initDB,
    getDB,
    dbEmitter,
    getAllComments,
    getAllCommentsAdmin,
    insertComment,
    approveComment,
    deleteComment,
    findOrCreateGoogleUser,
    getUserById,
    updateUserProfile,
    getAllUsersAdmin,
    getAllFaqs,
    insertFaq,
    updateFaq,
    deleteFaq,
    logUnansweredFaq,
    getUnansweredFaqs,
    clearUnansweredFaqs,
    getAllRepairsAdmin,
    getUserRepairs,
    getRepairAdminById,
    updateRepairAdmin,
    insertRepairAdmin,
    softDeleteRepairAdmin,
    getAppointmentConfig,
    saveAppointmentConfig,
    getAppointmentAvailability,
    getAdminAppointments,
    getAllBuildsAdmin,
    getAllBuildsPublic,
    insertBuildAdmin,
    logAdminAction,
    trackPageView,
    getPageViewsDaily,
    getPageViewsTop,
    getPageViewsSummary,
    getLiveAnalytics
} = require('./database');

const app = express();
app.disable('x-powered-by');

// Cache HTTP para contenido estático
const cacheMiddleware = (duration) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${duration}`);
  }
  next();
};

const resolvePort = () => {
    const rawPort = process.env.PORT || '3000';
    const port = Number(rawPort);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        console.error(`[server] PORT invalido: "${rawPort}". Usa un numero entre 1 y 65535.`);
        process.exit(1);
    }

    return port;
};

const PORT = resolvePort();

const trustedOrigins = new Set([
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://pixon.com.mx'
]);

function isTrustedRequestOrigin(req) {
    const source = req.get('origin') || req.get('referer');
    if (!source) return true;

    try {
        const url = new URL(source);
        const currentOrigin = `${req.protocol}://${req.get('host')}`;
        return trustedOrigins.has(url.origin) || url.origin === currentOrigin;
    } catch (_err) {
        return false;
    }
}

/* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
   BOOTSTRAP â¬ todo el setup que necesita la DB lista va dentro
â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
async function bootstrap() {
    await initDB();

    const sseClients = new Set();
    let sseIdCounter = 0;

    const sseStats = {
        date: new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }),
        visits: 0,
        totalTimeSec: 0
    };

    function broadcastComment(comment) {
        const payload = JSON.stringify(comment);
        for (const client of sseClients) {
            try {
                client.res.write(`event: new-comment\ndata: ${payload}\n\n`);
            } catch (e) {
                sseClients.delete(client);
            }
        }
    }

    dbEmitter.on('new-comment', (comment) => broadcastComment(comment));
    dbEmitter.on('db-sync', () => {
        const payload = JSON.stringify({ action: 'reload' });
        for (const client of sseClients) {
            try { client.res.write(`event: db-sync\ndata: ${payload}\n\n`); } catch (e) { }
        }
    });

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
       MIDDLEWARES GLOBALES
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */

    // SECURITY-2 (M1+C2) â¬ Helmet con CSP pragmatica.
    // El sitio tiene 207+ inline event handlers (onclick=...) y multiples
    // <script> inline. Refactorizar todo a addEventListener es un proyecto
    // aparte, asi que CSP usa 'unsafe-inline' para script-src y style-src,
    // pero estricto en TODO lo demas: bloquea scripts/iframes/forms a otros
    // origenes y cierra defaultSrc a 'self'. Combinado con C1 (sanitizar
    // FAQ HTML) y CSRF (M8), el riesgo de XSS persistente cae fuerte.
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc:    ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://static.cloudflareinsights.com", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
                // Helmet por default pone script-src-attr 'none' que romperia
                // los 207+ inline onclick=, onmouseover=, etc. del sitio.
                // Necesario hasta que se refactoren a addEventListener.
                scriptSrcAttr: ["'unsafe-inline'"],
                styleSrc:   ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
                fontSrc:    ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
                imgSrc:     ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://cloudflareinsights.com", "https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"],
                frameSrc:   ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://maps.google.com", "https://www.google.com"],
                frameAncestors: ["'none'"],
                baseUri:    ["'self'"],
                formAction: ["'self'", "https://accounts.google.com"],
                objectSrc:  ["'none'"],
                upgradeInsecureRequests: []
            }
        },
        // Helmet emite por defecto: X-Content-Type-Options, X-Frame-Options,
        // Strict-Transport-Security, Referrer-Policy, X-DNS-Prefetch-Control,
        // X-Download-Options, X-Permitted-Cross-Domain-Policies.
        crossOriginEmbedderPolicy: false,            // permite imagenes externas
        crossOriginResourcePolicy: { policy: 'same-site' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: true }
    }));

    const rootPath = path.join(__dirname, '..');
    const distPath = path.join(__dirname, '../dist');

    function setUtf8StaticHeaders(res, filePath) {
        if (/\.html?$/i.test(filePath)) {
            res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        } else if (/\.css$/i.test(filePath)) {
            res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        } else if (/\.(js|mjs)$/i.test(filePath)) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        } else if (/\.json$/i.test(filePath)) {
            res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        } else if (/\.xml$/i.test(filePath)) {
            res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
        } else if (/\.txt$/i.test(filePath)) {
            res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
        }
    }

    // WebP content negotiation: si el browser acepta WebP y existe .webp, servirlo
    app.use((req, res, next) => {
        const pathname = req.path;
        if (/\.(jpe?g|png)$/i.test(pathname) && req.accepts('image/webp')) {
            const webpPath = pathname.replace(/\.(jpe?g|png)$/i, '.webp');
            // Tras cutover a Astro, dev y prod sirven de dist/ â¬ un solo path.
            const fullPath = path.join(distPath, webpPath);
            if (fs.existsSync(fullPath)) {
                req.url = webpPath;
                res.setHeader('Vary', 'Accept');
            }
        }
        next();
    });

    app.use(compression({
        threshold: 1024,
        level: 6,
        filter: (req, res) => {
            if (req.headers['x-no-compression']) return false;
            if (req.path.endsWith('/stream')) return false; // B6
            return compression.filter(req, res);
        }
    }));

    app.use('/api/track/view', express.text({ type: '*/*', limit: '10kb' }));
    app.use(express.json({ limit: '10kb' }));

    // SECURITY-2 â¬ bloquear /admin* a no-admins ANTES de cualquier static.
    // Sin este pre-gate, /admin/admin.html y /admin/ se servían sin auth.
    // Hooks de auth aún no existen aquí (passport va más abajo) por lo que
    // re-evaluamos la sesión cuando ya esté inicializada (req.isAuthenticated
    // existe solo después de session+passport), pero los handlers reales en
    // app.get(['/admin', '/admin/', '/admin/admin.html'], gateAdminPage, ⬦)
    // se montan después de passport y bloquean la entrada.
    app.use((req, res, next) => {
        const p = req.path;
        if (p === '/admin' || p === '/admin/' || p === '/admin/admin.html') {
            // Marcar para que el static middleware lo deje pasar al handler con gate.
            req._skipStatic = true;
        }
        next();
    });

    function staticSkipAdmin(staticHandler) {
        return (req, res, next) => {
            if (req._skipStatic) return next();
            return staticHandler(req, res, next);
        };
    }

    // Tras el cutover a Astro (mayo 2026), TANTO dev como prod sirven de dist/.
    // La diferencia es solo cache: dev = 0, prod = larga.
    // Para ver cambios: correr `npm run build` (o `npm run build:astro` solo).
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
        app.use(staticSkipAdmin(express.static(distPath, {
            index: false,
            maxAge: 0,
            etag: false,
            redirect: false,
            setHeaders: setUtf8StaticHeaders
        })));
    } else {
        app.use(staticSkipAdmin(express.static(distPath, {
            maxAge: '1y',
            etag: true,
            index: false,
            redirect: false,
            setHeaders: (res, filePath) => {
                setUtf8StaticHeaders(res, filePath);
                const p = filePath.replace(/\\/g, '/');
                if (/\/assets\/.+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(p)) {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                } else if (/\/(styles|scripts|components)\/.+\.(js|css|mjs)$/i.test(p)) {
                    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
                } else if (/\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(p)) {
                    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
                }
            }
})));
    }



    app.get('/robots.txt', (_req, res) => {
            const file = path.join(distPath, 'robots.txt');
            res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
            if (fs.existsSync(file)) {
                res.type('text/plain; charset=UTF-8').sendFile(file);
            } else {
                res.type('text/plain; charset=UTF-8').send('User-agent: *\nAllow: /\n\nSitemap: https://pixon.com.mx/sitemap.xml\n');
            }
        });

        app.get('/sitemap.xml', (_req, res) => {
            const file = path.join(distPath, 'sitemap.xml');
            res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
            if (fs.existsSync(file)) {
                res.type('application/xml; charset=UTF-8').sendFile(file);
            } else {
                res.status(404).send('Sitemap not found');
            }
        });

    // M2 â¬ CORS con metodos completos
    app.use(cors({
        origin: Array.from(trustedOrigins),
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-Requested-With'],
        credentials: true
    }));

    // SECURITY-2 (B2) â¬ Rate-limit. Protege OAuth callback de brute-force
    // y endpoints publicos de spam.
    const authLimiter = createLimiter({
        windowMs: 10 * 60 * 1000,    // 10 min
        max: 30,
        message: 'Demasiados intentos. Espera unos minutos.'
    });
    const formLimiter = createLimiter({
        windowMs: 60 * 1000,         // 1 min
        max: 10,
        message: 'Demasiadas peticiones. Espera un momento.'
    });
    const commentLimiter = createLimiter({
        windowMs: 10 * 60 * 1000,
        max: 6,
        message: 'Demasiados comentarios enviados. Espera unos minutos.'
    });
    const ticketLimiter = createLimiter({
        windowMs: 10 * 60 * 1000,
        max: 5,
        message: 'Demasiados tickets creados. Espera unos minutos.'
    });
    const profileLimiter = createLimiter({
        windowMs: 5 * 60 * 1000,
        max: 10,
        message: 'Demasiadas actualizaciones de perfil. Espera unos minutos.'
    });
    const trackingLimiter = createLimiter({
        windowMs: 60 * 1000,
        max: 120,
        message: 'Demasiados eventos.'
    });
    const adminWriteLimiter = createLimiter({
        windowMs: 60 * 1000,
        max: 120,
        message: 'Demasiadas acciones administrativas.'
    });
    const adminMutationLimiter = (req, res, next) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
        return adminWriteLimiter(req, res, next);
    };
    app.use('/auth/', authLimiter);
    app.use('/api/admin', adminMutationLimiter);

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
       SESIONES + PASSPORT
       (usa la tabla `sessions` que ya creó 01-schema.sql)
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    app.set('trust proxy', 1);

    app.use(session({
        store: new MySQLStore({
            clearExpired: true,
            checkExpirationInterval: 900000,
            expiration: 604800000
        }, getDB()),
        secret: sessionSecret || 'dev_session_secret_only_for_local',
        resave: false,
        saveUninitialized: false,
        cookie: {
            // M1 â¬ secure dinámica. En prod Cloudflare entrega HTTPS y trust proxy=1
            // ya hace que Express vea X-Forwarded-Proto correctamente.
            secure:   'auto',
            httpOnly: true,
            sameSite: 'lax',
            maxAge:   7 * 24 * 60 * 60 * 1000
        }
    }));

    const googleClientID = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const googleClientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
    const googleCallbackURL = String(process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback').trim();
    const googleOAuthConfigured = Boolean(
        googleClientID &&
        googleClientSecret &&
        googleClientID.endsWith('.apps.googleusercontent.com')
    );

    if (googleOAuthConfigured) {
        passport.use(new GoogleStrategy({
            clientID: googleClientID,
            clientSecret: googleClientSecret,
            callbackURL: googleCallbackURL,
            proxy: true
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                const user = await findOrCreateGoogleUser(profile);
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }));
    } else {
        console.warn('[auth] Google OAuth no configurado. Define GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET validos en .env.');
    }

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await getUserById(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    app.use(passport.initialize());
    app.use(passport.session());

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
       M8 â¬ CSRF mínimo: cualquier request que muta estado debe
       traer header X-Requested-With:fetch. Esto bloquea CSRF clásico
       basado en formularios cross-site (no pueden setear ese header
       sin pasar por preflight CORS).
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    app.use((req, res, next) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
        if (req.path.startsWith('/auth/')) return next();
        // /api/track/view es fire-and-forget vía navigator.sendBeacon que NO
        // permite setear headers custom. Es lectura-pasiva (no muta cuentas
        // ni privilegios), por lo que no necesita CSRF.
        if (req.path === '/api/track/view') return next();
        if (!isTrustedRequestOrigin(req)) {
            return res.status(403).json({ error: 'CSRF: origen no permitido' });
        }
        if (req.get('X-Requested-With') !== 'fetch') {
            return res.status(403).json({ error: 'CSRF: header X-Requested-With requerido' });
        }
        next();
    });

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
       AUTORIZACIÓN
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    function requireAuth(req, res, next) {
        if (req.isAuthenticated()) return next();
        res.status(401).json({ error: 'No autorizado' });
    }

    function requireAdmin(req, res, next) {
        if (req.isAuthenticated() && req.user?.role === 'admin') return next();
        res.status(403).json({ error: 'Prohibido' });
    }

    // SECURITY-2 (M2) â¬ gate del HTML del panel admin a nivel servidor.
    // Antes la proteccion era solo client-side (admin.js mostraba "Acceso
    // Denegado"). Ahora ni siquiera se sirve el HTML a no-admins.
    function gateAdminPage(req, res, next) {
        if (req.isAuthenticated() && req.user?.role === 'admin') return next();
        res.redirect('/?adminRequired=1');
    }

    function requireGoogleOAuthConfigured(req, res, next) {
        if (googleOAuthConfigured) return next();
        if (req.accepts('html')) {
            return res.status(503).send(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login no configurado - Pixon PC</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
    main{width:min(92vw,560px);background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;box-shadow:0 24px 80px rgba(0,0,0,.35)}
    h1{font-size:1.4rem;margin:0 0 12px;color:#fff}
    p{line-height:1.6;color:#cbd5e1}
    code{background:#020617;border:1px solid #334155;border-radius:6px;padding:2px 6px;color:#93c5fd}
    a{color:#93c5fd}
  </style>
</head>
<body>
  <main>
    <h1>Login con Google no configurado</h1>
    <p>El servidor no tiene un <code>GOOGLE_CLIENT_ID</code> y <code>GOOGLE_CLIENT_SECRET</code> validos en <code>.env</code>.</p>
    <p>Crea credenciales OAuth en Google Cloud y registra como redirect URI: <code>${googleCallbackURL}</code>.</p>
    <p><a href="/">Volver al inicio</a></p>
  </main>
</body>
</html>`);
        }
        return res.status(503).json({
            error: 'Google OAuth no configurado',
            message: 'Define GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET validos en .env.'
        });
    }

    // SECURITY-3 (M6) â¬ wrapper que extrae datos del req para admin_logs.
    // Llamar despues de la mutacion: audit(req, 'delete', 'comment', id)
    function audit(req, action, entity, entity_id, diff) {
        return logAdminAction({
            user_id:    req.user?.id,
            action,
            entity,
            entity_id,
            diff,
            ip:         req.ip,
            user_agent: req.get('user-agent')
        });
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
       AUTH
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    app.get('/auth/google', requireGoogleOAuthConfigured, (req, res, next) => {
        const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '';
        if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
            req.session.returnTo = returnTo.slice(0, 240);
        }
        passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
    });

    // SECURITY-2 (M5) â¬ regenerar la sesion previene session fixation:
    // un atacante no puede preparar una cookie y heredarla autenticada.
    app.get('/auth/google/callback', requireGoogleOAuthConfigured, (req, res, next) => {
        passport.authenticate('google', (err, user, info) => {
            if (err) {
                logError(err, req, 'auth');
                return next(err);
            }
            if (!user) {
                const reason = info?.message || info?.toString?.() || 'Google no devolvio un usuario valido.';
                console.warn('[auth] Google login failed:', reason);
                return res.redirect(`/auth/failure?reason=${encodeURIComponent(reason)}`);
            }

            const returnTo = req.session.returnTo || '/';
            req.session.regenerate((err) => {
                if (err) return next(err);
                req.login(user, (err2) => {
                    if (err2) return next(err2);
                    res.redirect(returnTo);
                });
            });
        })(req, res, next);
    });

    app.get('/auth/failure', (req, res) => {
        const reason = String(req.query.reason || 'No se pudo iniciar sesion con Google.').slice(0, 500);
        res.status(401).send(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Error al iniciar sesion - Pixon PC</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
    main{width:min(92vw,620px);background:#111827;border:1px solid #334155;border-radius:16px;padding:28px;box-shadow:0 24px 80px rgba(0,0,0,.35)}
    h1{font-size:1.4rem;margin:0 0 12px;color:#fff}
    p{line-height:1.6;color:#cbd5e1}
    code{display:block;white-space:pre-wrap;background:#020617;border:1px solid #334155;border-radius:8px;padding:10px;color:#93c5fd}
    a{color:#93c5fd}
  </style>
</head>
<body>
  <main>
    <h1>No se pudo iniciar sesion con Google</h1>
    <p>Detalle tecnico:</p>
    <code>${escapeHtml(reason)}</code>
    <p><a href="/auth/google">Intentar de nuevo</a> · <a href="/">Volver al inicio</a></p>
  </main>
</body>
</html>`);
    });

    app.get('/auth/logout', (req, res, next) => {
        req.logout(err => {
            if (err) return next(err);
            res.redirect('/');
        });
    });

    app.get('/api/me', (req, res) => {
        res.json({ user: req.user || null });
    });

    app.post('/api/me/profile', profileLimiter, requireAuth, ah(async (req, res) => {
        const { phone } = req.body;
        // M7 â¬ validar phone con regex (10-15 digitos, opcional + al inicio)
        const cleanedPhone = cleanPhone(phone);
        if (!/^\+?\d{10,15}$/.test(cleanedPhone)) {
            return res.status(400).json({ error: 'Número de celular inválido (10â¬15 dígitos, opcional + al inicio).' });
        }

        const success = await updateUserProfile(req.user.id, { phone: cleanedPhone });
        if (success) {
            req.user.phone = cleanedPhone;
            res.json({ success: true, phone: cleanedPhone });
        } else {
            res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
        }
    }));

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
       API PÚBLICA
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    app.use('/api', createHealthRoutes({ getClientCount: () => sseClients.size }));

    app.get('/api/comments', ah(async (_req, res) => {
        const comments = await getAllComments();
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.json(comments);
    }));

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
       GOOGLE PLACES API â¬ Reseñas reales de Google Maps
       Cacheado 1h en memoria (Places API es billable, ~$17/1000 calls)
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    const googleReviewsCache = { data: null, expires: 0 };
    const GOOGLE_REVIEWS_TTL = 60 * 60 * 1000; // 1 hora

    app.get('/api/reviews/google', ah(async (_req, res) => {
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        const placeId = process.env.GOOGLE_PLACE_ID;

        // Si no hay API key configurada, devolver respuesta clara para el frontend
        if (!apiKey || !placeId) {
            return res.json({
                source: 'unconfigured',
                configured: false,
                place_id: placeId || null,
                reviews: [],
                rating: 0,
                total: 0,
                hint: 'Configura GOOGLE_PLACES_API_KEY y GOOGLE_PLACE_ID en .env para mostrar reseñas reales de Google Maps.'
            });
        }

        // Servir desde caché si aún es válido (evita llamadas billables repetidas)
        if (googleReviewsCache.data && Date.now() < googleReviewsCache.expires) {
            return res.json({ ...googleReviewsCache.data, cached: true });
        }

        try {
            const https = require('https');
            const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,reviews,user_ratings_total&language=es&key=${apiKey}`;

            const data = await new Promise((resolve, reject) => {
                https.get(url, (resp) => {
                    let body = '';
                    resp.on('data', (chunk) => body += chunk);
                    resp.on('end', () => {
                        try { resolve(JSON.parse(body)); }
                        catch (e) { reject(e); }
                    });
                }).on('error', reject);
            });

            if (data.status !== 'OK') {
                return res.json({
                    source: 'error',
                    configured: true,
                    place_id: placeId,
                    error: data.status,
                    error_message: data.error_message || null,
                    reviews: [], rating: 0, total: 0
                });
            }

            const result = data.result;
            const reviews = (result.reviews || []).map(r => ({
                id: `google-${r.time}`,
                name: r.author_name,
                text: r.text,
                rating: r.rating,
                relative_time: r.relative_time_description,
                time: r.time,
                profile_photo_url: r.profile_photo_url,
                source: 'google',
                verified: true
            }));

            const payload = {
                source: 'google',
                configured: true,
                place_id: placeId,
                place_name: result.name,
                rating: result.rating,
                total: result.user_ratings_total,
                reviews
            };

            googleReviewsCache.data = payload;
            googleReviewsCache.expires = Date.now() + GOOGLE_REVIEWS_TTL;

            res.json(payload);
        } catch (err) {
            logError(err, _req, 'google-places');
            res.json({
                source: 'error',
                configured: true,
                place_id: placeId,
                error: err.message,
                reviews: [], rating: 0, total: 0
            });
        }
    }));

    app.get('/api/comments/stream', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const clientId = ++sseIdCounter;
        const client = { id: clientId, res };
        const connectTime = Date.now();
        client.connectTime = connectTime;
        sseClients.add(client);
        
        const connectTimeStr = new Date(connectTime).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour12: false });
        console.log(`[${connectTimeStr}] SSE #${clientId} conectado (total activos: ${sseClients.size})`);

        const keepalive = setInterval(() => {
            try { res.write(': ping\n\n'); } catch (e) { clearInterval(keepalive); }
        }, 25000);

        req.on('close', () => {
            clearInterval(keepalive);
            sseClients.delete(client);
            
            const disconnectTime = Date.now();
            const durationSec = Math.round((disconnectTime - client.connectTime) / 1000);
            const currentDate = new Date(disconnectTime).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
            
            if (sseStats.date !== currentDate) {
                sseStats.date = currentDate;
                sseStats.visits = 0;
                sseStats.totalTimeSec = 0;
            }
            
            sseStats.visits++;
            sseStats.totalTimeSec += durationSec;
            const avgTimeSec = Math.round(sseStats.totalTimeSec / sseStats.visits);
            const disconnectTimeStr = new Date(disconnectTime).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour12: false });
            
            console.log(`[${disconnectTimeStr}] SSE #${clientId} desconectado. Duró: ${durationSec}s. ` +
                        `Subtotal Hoy -> Visitas: ${sseStats.visits} | Promedio: ${avgTimeSec}s | Tiempo Total: ${sseStats.totalTimeSec}s`);
        });
    });

    app.post('/api/comments', commentLimiter, requireAuth, ah(async (req, res) => {
        const { name, stars, text } = req.body;
        const cleanName = stripHtml(name, 60);
        const cleanComment = stripHtml(text, 500);
        // stars admite incrementos de 0.5 entre 0.5 y 5
        const cleanStars = Math.round(parseFloat(stars) * 2) / 2;

        const errors = [];
        if (cleanName.length < 2) errors.push('El nombre es muy corto.');
        if (cleanComment.length < 10) errors.push('El comentario es muy corto.');
        if (hasHtml(name) || hasHtml(text)) errors.push('No se permite HTML en comentarios.');
        if (isNaN(cleanStars) || cleanStars < 0.5 || cleanStars > 5)
            errors.push('Estrellas invalidas (0.5 - 5).');

        if (errors.length) return res.status(400).json({ errors });

        // M4 â¬ guardar user_id ademas de email para no perder trazabilidad
        const user_id    = req.user?.id    || null;
        const user_email = req.user?.email || null;
        const created = await insertComment({ name: cleanName, stars: cleanStars, text: cleanComment, user_id, user_email });
        res.status(201).json({ success: true, message: 'Comentario enviado para revisión.', comment: created });
    }));

    // ---------------------------------------------------------------
    // TICKETS â¬ Crear ticket de servicio con auth
    // ---------------------------------------------------------------
    app.get('/api/appointments/config', ah(async (_req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json(await getAppointmentConfig());
    }));

    app.get('/api/appointments/availability', ah(async (req, res) => {
        res.set('Cache-Control', 'no-store');
        const date = cleanDate(req.query.date);
        const type = cleanText(req.query.type || 'recepcion', 40);
        if (!date) {
            return res.status(400).json({ success: false, message: 'Fecha invalida.' });
        }
        const result = await getAppointmentAvailability(date, type);
        res.status(result.available ? 200 : 409).json(result);
    }));

    app.post('/api/tickets', ticketLimiter, requireAuth, ah(async (req, res) => {
        const { 
            customer_name, customer_phone, customer_email, 
            device_type, service_requested, issue_description,
            device_brand, device_model, is_b2b, 
            b2b_company, b2b_quantity, b2b_type, b2b_frequency, b2b_invoice,
            appointment_type, appointment_date, appointment_time, appointment_datetime,
            appointment_delivery_method, appointment_note, appointment_status
        } = req.body;

        const cleanedName = cleanText(customer_name, 80);
        const cleanedPhone = cleanPhone(customer_phone);
        const cleanedEmail = customer_email ? cleanEmail(customer_email) : null;
        const cleanedDeviceType = cleanText(device_type, 80);
        const cleanedService = cleanText(service_requested || 'Revision', 120);
        const cleanedIssue = cleanMultilineText(issue_description, 1800);
        const cleanedBrand = cleanText(device_brand, 80);
        const cleanedModel = cleanText(device_model, 100);
        const cleanedAppointmentDate = cleanDate(appointment_date);
        const cleanedAppointmentTime = cleanTime(appointment_time);
        const cleanedAppointmentType = cleanText(appointment_type || 'recepcion', 40);
        const cleanedDeliveryMethod = cleanText(appointment_delivery_method, 80);
        const cleanedAppointmentNote = cleanText(appointment_note, 300);
        
        // Validaciones
        const errors = [];
        if (cleanedName.length < 2) errors.push('El nombre es requerido.');
        if (!isValidPhone(cleanedPhone)) errors.push('El teléfono de contacto es requerido.');
        if (customer_email && !cleanedEmail) errors.push('El correo no tiene un formato valido.');
        if (cleanedDeviceType.length < 2) errors.push('El tipo de equipo es requerido.');
        if (cleanedIssue.length < 10) errors.push('La descripción del problema es muy corta.');
        
        if (!cleanedAppointmentDate) errors.push('Selecciona un día disponible.');
        if (!cleanedAppointmentTime) errors.push('Selecciona un horario disponible.');

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors.join(' ') });
        }

        const availability = await getAppointmentAvailability(cleanedAppointmentDate, cleanedAppointmentType);
        if (!availability.available || !availability.slots.includes(cleanedAppointmentTime)) {
            return res.status(409).json({ success: false, message: 'Ese horario ya no está disponible. Elige otro.' });
        }
        
        // Crear ticket con user_id del usuario autenticado
        const user_id = req.user?.id || null;
        
        // Preparar detalles uniendo el servicio y la descripción
        const details = [
            `Servicio solicitado: ${cleanedService}`,
            `\n${cleanedIssue}`
        ].join('\n');
        const urgencyText = cleanedIssue.match(/Urgencia:\s*([^\n\r]+)/i)?.[1] || '';
        const normalizedUrgency = urgencyText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const priority = normalizedUrgency.includes('urgente')
            ? 'urgent'
            : normalizedUrgency.includes('trabajo') || normalizedUrgency.includes('escuela')
                ? 'work_school'
                : normalizedUrgency.includes('cotizar')
                    ? 'quote'
                    : 'normal';
        
        const ticket = await insertRepairAdmin({
            user_id,
            user_name: cleanedName,
            device_type: cleanedDeviceType,
            device_brand: cleanedBrand || null,
            device_model: cleanedModel || null,
            reported_issue: details,
            contact_phone: cleanedPhone,
            contact_email: cleanedEmail,
            priority,
            is_b2b: cleanBoolean(is_b2b),
            b2b_company: cleanText(b2b_company, 120),
            b2b_quantity: cleanText(b2b_quantity, 40),
            b2b_type: cleanText(b2b_type, 160),
            b2b_frequency: cleanText(b2b_frequency, 80),
            b2b_invoice: cleanText(b2b_invoice, 20),
            appointment_type: cleanedAppointmentType,
            appointment_date: cleanedAppointmentDate,
            appointment_time: cleanedAppointmentTime,
            appointment_datetime: `${cleanedAppointmentDate} ${cleanedAppointmentTime}:00`,
            appointment_delivery_method: cleanedDeliveryMethod,
            appointment_note: cleanedAppointmentNote,
            appointment_status: cleanText(appointment_status || 'pendiente_confirmacion', 40)
        });
        
        res.status(201).json({ success: true, message: 'Ticket creado exitosamente.', ticket_code: ticket.ticket_code, ticket });
    }));

    // GET mis-tickets - Tickets del usuario logueado
    app.get('/api/mis-tickets', requireAuth, ah(async (req, res) => {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }
        const repairs = await getUserRepairs(userId);
        res.json({ success: true, repairs });
    }));

    app.get('/api/faqs', ah(async (_req, res) => {
        const faqs = await getAllFaqs();
        res.json(faqs);
    }));

    app.post('/api/faqs/unanswered', formLimiter, ah(async (req, res) => {
        const query = stripHtml(req.body?.query, 180);
        if (query.length >= 3) {
            await logUnansweredFaq(query);
        }
        res.json({ success: true });
    }));

    // M3 â¬ endpoint publico no expone cost, compare_price, stock_alert ni SKUs internos
    app.get('/api/builds', ah(async (_req, res) => {
        const builds = await getAllBuildsPublic();
        res.json(builds);
    }));

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
        ANALYTICS â¬ Page View Tracking
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    app.post('/api/track/view', trackingLimiter, (req, res) => {
        const payload = typeof req.body === 'string'
            ? (() => {
                try { return JSON.parse(req.body || '{}'); } catch (_e) { return {}; }
            })()
            : (req.body || {});
        const pagePath = cleanText(payload.path, 300);
        const pageTitle = cleanText(payload.title, 180);
        const referrer = cleanText(payload.referrer, 500);
        if (!pagePath || !pagePath.startsWith('/') || pagePath.startsWith('//')) {
            return res.status(400).json({ error: 'path required' });
        }
        const session_id = req.sessionID || null;
        const user_id = req.user?.id || null;
        trackPageView({
            path: pagePath,
            title: pageTitle,
            referrer,
            user_agent: req.get('user-agent'),
            ip: req.ip,
            session_id,
            user_id
        }).catch(e => logError(e, req, 'analytics'));
        res.json({ ok: true });
    });

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
        PANEL DE ADMINISTRACIÓN
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    app.get('/api/admin/users', requireAdmin, ah(async (_req, res) => {
        const users = await getAllUsersAdmin();
        res.json(users);
    }));

    app.get('/api/admin/repairs', requireAdmin, ah(async (_req, res) => {
        const repairs = await getAllRepairsAdmin();
        res.json(repairs);
    }));

    app.get('/api/admin/appointments', requireAdmin, ah(async (req, res) => {
        res.set('Cache-Control', 'no-store');
        const from = req.query.from ? cleanDate(req.query.from) : '';
        const to = req.query.to ? cleanDate(req.query.to) : '';
        if ((req.query.from && !from) || (req.query.to && !to)) {
            return res.status(400).json({ success: false, message: 'Rango de fechas invalido.' });
        }
        res.json(await getAdminAppointments({ from, to }));
    }));

    app.patch('/api/admin/appointments/config', requireAdmin, ah(async (req, res) => {
        const config = await saveAppointmentConfig(req.body || {});
        await audit(req, 'update', 'appointment_config', null);
        res.json({ success: true, config });
    }));

    app.get(['/api/admin/tickets/:id', '/api/admin/repairs/:id'], requireAdmin, ah(async (req, res) => {
        const id = toPositiveInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID invalido.' });
        const ticket = await getRepairAdminById(id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado.' });
        res.json({ success: true, ticket });
    }));

    app.patch(['/api/admin/tickets/:id', '/api/admin/repairs/:id'], requireAdmin, ah(async (req, res) => {
        const id = toPositiveInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID invalido.' });
        const ticket = await updateRepairAdmin(id, req.body || {});
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado.' });
        await audit(req, 'update', 'repair', ticket?.id, { ticket_code: ticket?.ticket_code });
        res.json({ success: true, message: 'Cambios guardados correctamente.', ticket });
    }));

    app.patch('/api/admin/tickets/:id/appointment', requireAdmin, ah(async (req, res) => {
        const id = toPositiveInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID invalido.' });
        const ticket = await updateRepairAdmin(id, req.body || {});
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket no encontrado.' });
        await audit(req, 'update', 'repair_appointment', ticket?.id, { ticket_code: ticket?.ticket_code });
        res.json({ success: true, message: 'Cita actualizada correctamente.', ticket });
    }));

    app.patch('/api/admin/tickets/:id/delete', requireAdmin, ah(async (req, res) => {
        const id = toPositiveInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID invalido.' });
        const ok = await softDeleteRepairAdmin(id, req.user?.id);
        if (!ok) return res.status(404).json({ success: false, message: 'Ticket no encontrado.' });
        await audit(req, 'delete', 'repair', id);
        res.json({ success: true, message: 'Ticket eliminado correctamente.' });
    }));

    app.post('/api/admin/repairs', requireAdmin, ah(async (req, res) => {
        const payload = req.body || {};
        const errors = [];
        if (cleanText(payload.user_name, 80).length < 2) errors.push('El nombre del cliente es requerido.');
        if (cleanText(payload.device_type, 80).length < 2) errors.push('El tipo de equipo es requerido.');
        if (cleanMultilineText(payload.reported_issue, 1800).length < 5) errors.push('El problema reportado es requerido.');
        if (payload.contact_email && !cleanEmail(payload.contact_email)) errors.push('El correo no tiene un formato valido.');
        if (payload.contact_phone && !isValidPhone(cleanPhone(payload.contact_phone))) errors.push('El telefono no tiene un formato valido.');
        if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

        const repair = await insertRepairAdmin(payload);
        await audit(req, 'create', 'repair', repair?.id, { ticket_code: repair?.ticket_code });
        res.status(201).json({ success: true, repair });
    }));

    app.get('/api/admin/builds', requireAdmin, ah(async (_req, res) => {
        const builds = await getAllBuildsAdmin();
        res.json(builds);
    }));

    app.post('/api/admin/builds', requireAdmin, ah(async (req, res) => {
        const payload = req.body || {};
        const errors = [];
        if (cleanText(payload.title, 120).length < 3) errors.push('El titulo del ensamble es requerido.');
        if (cleanMultilineText(payload.description, 1200).length < 10) errors.push('La descripcion del ensamble es requerida.');
        if (cleanText(payload.price, 80).length < 1) errors.push('El precio o rango visible es requerido.');
        if (String(payload.image_url || '').length > 500) errors.push('La URL de imagen es demasiado larga.');
        if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

        const build = await insertBuildAdmin(payload);
        await audit(req, 'create', 'build', build?.id, { title: build?.title, price: build?.price });
        res.status(201).json({ success: true, build });
    }));

    app.get('/api/admin/comments', requireAdmin, ah(async (_req, res) => {
        const comments = await getAllCommentsAdmin();
        res.json(comments);
    }));

    app.post('/api/admin/comments/:id/approve', requireAdmin, ah(async (req, res) => {
        const id = toPositiveInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID invalido.' });
        const success = await approveComment(id);
        if (success) {
            await audit(req, 'approve', 'comment', id);
            res.json({ success: true });
        } else res.status(404).json({ error: 'Comentario no encontrado' });
    }));

    app.delete('/api/admin/comments/:id', requireAdmin, ah(async (req, res) => {
        const id = toPositiveInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID invalido.' });
        const success = await deleteComment(id);
        if (success) {
            await audit(req, 'delete', 'comment', id);
            res.json({ success: true });
        } else res.status(404).json({ error: 'Comentario no encontrado' });
    }));

    app.get('/api/admin/comments/stream', requireAdmin, (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const adminPendingListener = (comment) => {
            res.write(`data: ${JSON.stringify(comment)}\n\n`);
        };
        dbEmitter.on('admin-pending', adminPendingListener);
        req.on('close', () => dbEmitter.off('admin-pending', adminPendingListener));
    });

    app.post('/api/admin/faqs', requireAdmin, ah(async (req, res) => {
        const payload = req.body || {};
        const errors = [];
        if (cleanText(payload.category, 80).length < 2) errors.push('La categoria es requerida.');
        if (stripHtml(payload.question, 220).length < 5) errors.push('La pregunta es requerida.');
        if (cleanMultilineText(payload.answer, 3000).length < 5) errors.push('La respuesta es requerida.');
        if (errors.length) return res.status(400).json({ success: false, message: errors.join(' ') });

        const faq = await insertFaq(payload);
        await audit(req, 'create', 'faq', faq?.id, { question: faq?.question, category: faq?.category });
        res.status(201).json(faq);
    }));

    app.put('/api/admin/faqs/:id', requireAdmin, ah(async (req, res) => {
        const id = toPositiveInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID invalido.' });
        const success = await updateFaq(id, req.body);
        if (success) await audit(req, 'update', 'faq', id, { category: req.body?.category, question: req.body?.question });
        res.json({ success });
    }));

    app.delete('/api/admin/faqs/:id', requireAdmin, ah(async (req, res) => {
        const id = toPositiveInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID invalido.' });
        const success = await deleteFaq(id);
        if (success) await audit(req, 'delete', 'faq', id);
        res.json({ success });
    }));

    app.get('/api/admin/faqs/unanswered', requireAdmin, ah(async (_req, res) => {
        res.json(await getUnansweredFaqs());
    }));

    app.delete('/api/admin/faqs/unanswered', requireAdmin, ah(async (req, res) => {
        const count = await clearUnansweredFaqs();
        await audit(req, 'clear', 'faq_unanswered', null, { rows_deleted: count });
        res.json({ success: true });
    }));

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
        ADMIN ANALYTICS
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    app.get('/api/admin/analytics/summary', requireAdmin, ah(async (_req, res) => {
        res.json(await getPageViewsSummary());
    }));

    app.get('/api/admin/analytics/daily', requireAdmin, ah(async (req, res) => {
        const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
        res.json(await getPageViewsDaily(days));
    }));

    /**
     * Live analytics: visitantes activos (últimos 5 min), vistas por minuto
     * (últimos 30 min para sparkline) y últimas N páginas vistas.
     * Polling-friendly desde el dashboard cada ~10 s.
     */
    app.get('/api/admin/analytics/live', requireAdmin, ah(async (req, res) => {
        const window = Math.min(120, Math.max(5, parseInt(req.query.window, 10) || 30));
        const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
        res.set('Cache-Control', 'no-store');
        res.json(await getLiveAnalytics(window, limit));
    }));

    app.get('/api/admin/analytics/top-pages', requireAdmin, ah(async (req, res) => {
        const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        res.json(await getPageViewsTop(limit, days));
    }));

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
        ARCHIVOS ESTATICOS Y RUTAS HTML
        Tras el cutover Astro, dev y prod sirven el MISMO árbol dist/.
        Por eso la tabla de rutas y el handler son únicos.
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    {
        // Las páginas Astro emiten archivos planos en dist/<ruta>.html
        // (build.format = 'file' en astro.config.ts). Las únicas páginas
        // que aún vienen del build legacy de Vite son la home (index.html),
        // la home en inglés y el panel admin.
        const pages = {
            // Legacy Vite (sin equivalente Astro todavía)
            '/':                            'index.html',
            '/en':                          'en.html',
            '/admin':                       'admin/admin.html',
            // Astro SSG (src/pages/*.astro -> dist/*.html via build.format='file')
            '/paquetes':                    'paquetes.html',
            '/servicios/paquetes':          'paquetes.html',
            '/ensambles':                   'ensambles.html',
            '/servicios/ensambles':         'ensambles.html',
            '/mantenimiento-mac':           'mantenimiento-mac.html',
            '/servicios/mantenimiento-mac': 'mantenimiento-mac.html',
            '/instalacion-windows':         'instalacion-windows.html',
            '/servicios/instalacion-windows':'instalacion-windows.html',
            '/reparaciones':                'reparaciones.html',
            '/servicios/reparaciones':      'reparaciones.html',
            '/reparacion-bisagras':         'reparacion-bisagras.html',
            '/servicios/reparacion-bisagras':'reparacion-bisagras.html',
            '/reparacion-controles':        'reparacion-controles.html',
            '/servicios/reparacion-controles':'reparacion-controles.html',
            '/limpieza-laptop-liquido':     'limpieza-laptop-liquido.html',
            '/servicios/limpieza-laptop-liquido':'limpieza-laptop-liquido.html',
            '/empresas':                    'empresas.html',
            '/B2B':                         'empresas.html',
            '/servicios/b2b':               'empresas.html',
            '/servicios/laptop/cambio-bateria': 'servicios/laptop/cambio-bateria.html',
            '/servicios/telefono/cambio-bateria': 'servicios/telefono/cambio-bateria.html',
            '/optimizacion':                'optimizacion.html',
            '/servicios/optimizacion':      'optimizacion.html',
            '/antisulfatacion':             'antisulfatacion.html',
            '/servicios/antisulfatacion':   'antisulfatacion.html',
            '/catalogo':                    'catalogo.html',
            '/comentarios':                 'comentarios.html',
            '/contacto':                    'contacto.html',
            '/preguntas-frecuentes':        'preguntas-frecuentes.html',
            '/privacidad':                  'privacidad.html',
            '/garantia':                    'garantia.html',
            // VISTAS DE PRUEBAS â¬ no listadas en sitemap, pero sirven con HTTP 200
            '/test-navbar-3':               'test-navbar-3.html',
            // Hub general de servicios
            '/servicios':                   'servicios/index.html',
            // Páginas en inglés (Astro)
            '/en/packages':                 'en/packages.html',
            '/en/pc-builds':                'en/pc-builds.html',
            '/en/repairs':                  'en/repairs.html',
            '/en/hinge-repair':             'en/hinge-repair.html',
            '/en/controller-repair':        'en/controller-repair.html',
            '/en/liquid-damage':            'en/liquid-damage.html',
            '/en/mac-maintenance':          'en/mac-maintenance.html',
            '/en/windows-install':          'en/windows-install.html',
            '/en/optimization':             'en/optimization.html',
            '/en/anti-sulfatation':         'en/anti-sulfatation.html',
            '/en/corporate':                'en/corporate.html',
            '/en/contact':                  'en/contact.html',
            '/en/catalog':                  'en/catalog.html',
            '/en/reviews':                  'en/reviews.html',
            '/en/faq':                      'en/faq.html',
            '/en/privacy':                  'en/privacy.html',
            '/en/warranty':                 'en/warranty.html',
        };

        const legacyRedirects = ['/formateo-optimizacion'];
        legacyRedirects.forEach(oldPath => {
            app.get(oldPath, (_req, res) => res.redirect(301, '/instalacion-windows'));
        });
        // M6 â¬ canonicaliza /b2b -> /B2B (Preferencia del usuario por Mayúsculas)
        app.get('/b2b', (req, res, next) => {
            if (req.path === '/b2b') return res.redirect(301, '/B2B');
            next();
        });

        // SECURITY-2 (M2) â¬ gate del HTML admin antes del catch-all.
        // Acepta /admin y /admin/ (con trailing slash) y bloquea acceso directo
        // a /admin/admin.html (que el static middleware serviría sin gate).
        app.get(['/admin', '/admin/', '/admin/admin.html'], gateAdminPage, (_req, res) => {
            res.sendFile(path.join(distPath, 'admin/admin.html'), {
                headers: { 'Cache-Control': 'no-store' }
            });
        });

        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();

            const sendFileOptions = {
                headers: {
                    'Cache-Control': 'public, max-age=600, s-maxage=86400, stale-while-revalidate=86400'
                }
            };

            const cleanPath = req.path === '/' ? '/' : req.path.replace(/\/$/, '');
            const htmlFile = pages[cleanPath];

            if (htmlFile) {
                const fullPath = path.join(distPath, htmlFile);
                if (fs.existsSync(fullPath)) {
                    return res.sendFile(fullPath, sendFileOptions);
                }
            }

            // Resolución dinámica para rutas Astro (build.format='file' emite <ruta>.html)
            // Ej: /servicios/laptop/cambio-pantalla -> dist/servicios/laptop/cambio-pantalla.html
            // Solo si la ruta es "segura" (sin .. ni caracteres raros).
            if (/^\/[a-zA-Z0-9/_-]+$/.test(cleanPath)) {
                const candidate = path.join(distPath, cleanPath + '.html');
                if (candidate.startsWith(distPath) && fs.existsSync(candidate)) {
                    return res.sendFile(candidate, sendFileOptions);
                }
                
                const astroDistPath = path.join(__dirname, '../dist-astro');
                const astroCandidate = path.join(astroDistPath, cleanPath + '.html');
                if (astroCandidate.startsWith(astroDistPath) && fs.existsSync(astroCandidate)) {
                    return res.sendFile(astroCandidate, sendFileOptions);
                }
            }

            const notFoundPath = path.join(distPath, '404.html');
            if (fs.existsSync(notFoundPath)) {
                return res.status(404).sendFile(notFoundPath, {
                    headers: {
                        'Cache-Control': 'public, max-age=300, s-maxage=3600'
                    }
                });
            }

            res.status(404).send('Not found');
        });
    }

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
       MANEJO DE ERRORES (handlers async sin catch caen aquí)
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    app.use((req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
            return res.status(404).json({
                ok: false,
                success: false,
                error: 'Ruta no encontrada',
                message: 'Ruta no encontrada'
            });
        }
        next();
    });

    app.use(errorHandler);

    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
       ARRANCAR
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    const server = app.listen(PORT, () => {
        const mode = process.env.NODE_ENV || 'development';
        console.log(`
+--------------------------------------------------+
|  Pixon PC API [${mode}] (MariaDB)
|  REST  -> http://localhost:${PORT}/api/comments
|  SSE   -> http://localhost:${PORT}/api/comments/stream
|  OAuth -> http://localhost:${PORT}/auth/google
+--------------------------------------------------+`);
    });
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`
[server] El puerto ${PORT} ya esta en uso.

Probablemente ya tienes otra instancia del servidor abierta.

Windows PowerShell:
  netstat -ano | findstr :${PORT}
  taskkill /PID <PID> /F

Alternativa para arrancar en otro puerto:
  $env:PORT=3001; npm start
`);
            process.exit(1);
            return;
        }

        console.error('[server] Error al iniciar el servidor:', error.message);
        console.error(error);
        process.exit(1);
    });
}

if (require.main === module) {
    bootstrap().catch(err => {
        console.error('Bootstrap fallido:', err.message);
        console.error(err.stack);
        process.exit(1);
    });
}

module.exports = app;
module.exports.bootstrap = bootstrap;
