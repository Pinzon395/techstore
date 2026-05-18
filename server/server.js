/**
 * ============================================================
 *  server/server.js  — API Express + MariaDB + Auth
 * ============================================================
 *
 *  Migrado a MariaDB (mysql2/promise pool) + express-mysql-session.
 *  Las funciones de DB son async — todos los handlers usan await.
 * ============================================================
 */

'use strict';

require('dotenv').config();
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MySQLStore = require('express-mysql-session')(session);

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
    insertRepairAdmin,
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

// Helper para envolver handlers async sin perder errores en Express 4
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ─────────────────────────────────────────────────────────────
   BOOTSTRAP — todo el setup que necesita la DB lista va dentro
───────────────────────────────────────────────────────────── */
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

    /* ─────────────────────────────────────────────────────────
       MIDDLEWARES GLOBALES
    ───────────────────────────────────────────────────────── */

    // SECURITY-2 (M1+C2) — Helmet con CSP pragmatica.
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

    // WebP content negotiation: si el browser acepta WebP y existe .webp, servirlo
    app.use((req, res, next) => {
        const pathname = req.path;
        if (/\.(jpe?g|png)$/i.test(pathname) && req.accepts('image/webp')) {
            const webpPath = pathname.replace(/\.(jpe?g|png)$/i, '.webp');
            // Tras cutover a Astro, dev y prod sirven de dist/ — un solo path.
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

    // SECURITY-2 — bloquear /admin* a no-admins ANTES de cualquier static.
    // Sin este pre-gate, /admin/admin.html y /admin/ se servían sin auth.
    // Hooks de auth aún no existen aquí (passport va más abajo) por lo que
    // re-evaluamos la sesión cuando ya esté inicializada (req.isAuthenticated
    // existe solo después de session+passport), pero los handlers reales en
    // app.get(['/admin', '/admin/', '/admin/admin.html'], gateAdminPage, …)
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
        app.use(staticSkipAdmin(express.static(distPath, { index: false, maxAge: 0, etag: false, redirect: false })));
    } else {
        app.use(staticSkipAdmin(express.static(distPath, {
            maxAge: '1y',
            etag: true,
            index: false,
            redirect: false,
            setHeaders: (res, filePath) => {
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
                res.type('text/plain').sendFile(file);
            } else {
                res.type('text/plain').send('User-agent: *\nAllow: /\n\nSitemap: https://pixon.com.mx/sitemap.xml\n');
            }
        });

        app.get('/sitemap.xml', (_req, res) => {
            const file = path.join(distPath, 'sitemap.xml');
            res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
            if (fs.existsSync(file)) {
                res.type('application/xml').sendFile(file);
            } else {
                res.status(404).send('Sitemap not found');
            }
        });

    // M2 — CORS con metodos completos
    app.use(cors({
        origin: [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'http://localhost:3001',
            'https://pixon.com.mx',
        ],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-Requested-With'],
        credentials: true
    }));

    // SECURITY-2 (B2) — Rate-limit. Protege OAuth callback de brute-force
    // y endpoints publicos de spam.
    const authLimiter = rateLimit({
        windowMs: 10 * 60 * 1000,    // 10 min
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Demasiados intentos. Espera unos minutos.' }
    });
    const writeLimiter = rateLimit({
        windowMs: 60 * 1000,         // 1 min
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Demasiadas peticiones. Espera un momento.' }
    });
    app.use('/auth/', authLimiter);

    /* ─────────────────────────────────────────────────────────
       SESIONES + PASSPORT
       (usa la tabla `sessions` que ya creó 01-schema.sql)
    ───────────────────────────────────────────────────────── */
    app.set('trust proxy', 1);

    app.use(session({
        store: new MySQLStore({
            clearExpired: true,
            checkExpirationInterval: 900000,
            expiration: 604800000
        }, getDB()),
        secret: process.env.SESSION_SECRET || 'default_secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            // M1 — secure dinámica. En prod Cloudflare entrega HTTPS y trust proxy=1
            // ya hace que Express vea X-Forwarded-Proto correctamente.
            secure:   isProd,
            httpOnly: true,
            sameSite: 'lax',
            maxAge:   7 * 24 * 60 * 60 * 1000
        }
    }));

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID || 'no_client_id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'no_secret',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
        proxy: true
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const user = await findOrCreateGoogleUser(profile);
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));

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

    /* ─────────────────────────────────────────────────────────
       M8 — CSRF mínimo: cualquier request que muta estado debe
       traer header X-Requested-With:fetch. Esto bloquea CSRF clásico
       basado en formularios cross-site (no pueden setear ese header
       sin pasar por preflight CORS).
    ───────────────────────────────────────────────────────── */
    app.use((req, res, next) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
        if (req.path.startsWith('/auth/')) return next();
        // /api/track/view es fire-and-forget vía navigator.sendBeacon que NO
        // permite setear headers custom. Es lectura-pasiva (no muta cuentas
        // ni privilegios), por lo que no necesita CSRF.
        if (req.path === '/api/track/view') return next();
        if (req.get('X-Requested-With') !== 'fetch') {
            return res.status(403).json({ error: 'CSRF: header X-Requested-With requerido' });
        }
        next();
    });

    /* ─────────────────────────────────────────────────────────
       AUTORIZACIÓN
    ───────────────────────────────────────────────────────── */
    function requireAuth(req, res, next) {
        if (req.isAuthenticated()) return next();
        res.status(401).json({ error: 'No autorizado' });
    }

    function requireAdmin(req, res, next) {
        if (req.isAuthenticated() && req.user?.role === 'admin') return next();
        res.status(403).json({ error: 'Prohibido' });
    }

    // SECURITY-2 (M2) — gate del HTML del panel admin a nivel servidor.
    // Antes la proteccion era solo client-side (admin.js mostraba "Acceso
    // Denegado"). Ahora ni siquiera se sirve el HTML a no-admins.
    function gateAdminPage(req, res, next) {
        if (req.isAuthenticated() && req.user?.role === 'admin') return next();
        res.redirect('/?adminRequired=1');
    }

    // SECURITY-3 (M6) — wrapper que extrae datos del req para admin_logs.
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

    /* ─────────────────────────────────────────────────────────
       AUTH
    ───────────────────────────────────────────────────────── */
    app.get('/auth/google', (req, res, next) => {
        const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '';
        if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
            req.session.returnTo = returnTo.slice(0, 240);
        }
        passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
    });

    // SECURITY-2 (M5) — regenerar la sesion previene session fixation:
    // un atacante no puede preparar una cookie y heredarla autenticada.
    app.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/' }),
        (req, res, next) => {
            const user = req.user;
            const returnTo = req.session.returnTo || '/';
            req.session.regenerate((err) => {
                if (err) return next(err);
                req.login(user, (err2) => {
                    if (err2) return next(err2);
                    res.redirect(returnTo);
                });
            });
        }
    );

    app.get('/auth/logout', (req, res, next) => {
        req.logout(err => {
            if (err) return next(err);
            res.redirect('/');
        });
    });

    app.get('/api/me', (req, res) => {
        res.json({ user: req.user || null });
    });

    app.post('/api/me/profile', requireAuth, ah(async (req, res) => {
        const { phone } = req.body;
        // M7 — validar phone con regex (10-15 digitos, opcional + al inicio)
        const cleanPhone = String(phone || '').trim().replace(/[^\d+]/g, '').slice(0, 16);
        if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
            return res.status(400).json({ error: 'Número de celular inválido (10–15 dígitos, opcional + al inicio).' });
        }

        const success = await updateUserProfile(req.user.id, { phone: cleanPhone });
        if (success) {
            req.user.phone = cleanPhone;
            res.json({ success: true, phone: cleanPhone });
        } else {
            res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
        }
    }));

    /* ─────────────────────────────────────────────────────────
       API PÚBLICA
    ───────────────────────────────────────────────────────── */
    app.get('/api/health', (_req, res) => {
        res.json({ ok: true, ts: new Date().toISOString(), clients: sseClients.size, db: 'mariadb' });
    });

    app.get('/api/comments', ah(async (_req, res) => {
        const comments = await getAllComments();
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.json(comments);
    }));

    /* ─────────────────────────────────────────────────────────
       GOOGLE PLACES API — Reseñas reales de Google Maps
       Cacheado 1h en memoria (Places API es billable, ~$17/1000 calls)
    ───────────────────────────────────────────────────────── */
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
            console.error('Google Places API error:', err.message);
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
        res.setHeader('Content-Type', 'text/event-stream');
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

    app.post('/api/comments', writeLimiter, requireAuth, ah(async (req, res) => {
        const { name, stars, text } = req.body;
        const cleanName = String(name || '').trim().slice(0, 60);
        const cleanText = String(text || '').trim().slice(0, 500);
        // stars admite incrementos de 0.5 entre 0.5 y 5
        const cleanStars = Math.round(parseFloat(stars) * 2) / 2;

        const errors = [];
        if (cleanName.length < 2) errors.push('El nombre es muy corto.');
        if (cleanText.length < 10) errors.push('El comentario es muy corto.');
        if (isNaN(cleanStars) || cleanStars < 0.5 || cleanStars > 5)
            errors.push('Estrellas invalidas (0.5 - 5).');

        if (errors.length) return res.status(400).json({ errors });

        // M4 — guardar user_id ademas de email para no perder trazabilidad
        const user_id    = req.user?.id    || null;
        const user_email = req.user?.email || null;
        const created = await insertComment({ name: cleanName, stars: cleanStars, text: cleanText, user_id, user_email });
        res.status(201).json({ success: true, message: 'Comentario enviado para revisión.', comment: created });
    }));

    // ═══════════════════════════════════════════════════════════════
    // TICKETS — Crear ticket de servicio con auth
    // ═══════════════════════════════════════════════════════════════
    app.post('/api/tickets', requireAuth, ah(async (req, res) => {
        const { 
            customer_name, customer_phone, customer_email, 
            device_type, service_requested, issue_description,
            device_brand, device_model, is_b2b, 
            b2b_company, b2b_quantity, b2b_type, b2b_frequency, b2b_invoice 
        } = req.body;
        
        // Validaciones
        const errors = [];
        if (!customer_name || String(customer_name).trim().length < 2) errors.push('El nombre es requerido.');
        if (!customer_phone || String(customer_phone).trim().length < 8) errors.push('El teléfono de contacto es requerido.');
        if (!device_type || String(device_type).trim().length < 2) errors.push('El tipo de equipo es requerido.');
        if (!issue_description || String(issue_description).trim().length < 10) errors.push('La descripción del problema es muy corta.');
        
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors.join(' ') });
        }
        
        // Crear ticket con user_id del usuario autenticado
        const user_id = req.user?.id || null;
        
        // Preparar detalles uniendo el servicio y la descripción
        const details = [
            `Servicio solicitado: ${service_requested || 'Revisión'}`,
            `\n${issue_description}`
        ].join('\n');
        
        const ticket = await insertRepairAdmin({
            user_id,
            user_name: customer_name,
            device_type: String(device_type).trim(),
            device_brand: device_brand ? String(device_brand).trim() : null,
            device_model: device_model ? String(device_model).trim() : null,
            reported_issue: details,
            contact_phone: String(customer_phone).trim(),
            is_b2b,
            b2b_company,
            b2b_quantity,
            b2b_type,
            b2b_frequency,
            b2b_invoice
        });
        
        res.status(201).json({ success: true, message: 'Ticket creado exitosamente.', ticket_code: ticket.ticket_code, ticket });
    }));

    app.get('/api/faqs', ah(async (_req, res) => {
        const faqs = await getAllFaqs();
        res.json(faqs);
    }));

    app.post('/api/faqs/unanswered', writeLimiter, ah(async (req, res) => {
        const { query } = req.body;
        if (query && query.length >= 3) {
            await logUnansweredFaq(query);
        }
        res.json({ success: true });
    }));

    // M3 — endpoint publico no expone cost, compare_price, stock_alert ni SKUs internos
    app.get('/api/builds', ah(async (_req, res) => {
        const builds = await getAllBuildsPublic();
        res.json(builds);
    }));

    /* ─────────────────────────────────────────────────────────
        ANALYTICS — Page View Tracking
    ───────────────────────────────────────────────────────── */
    app.post('/api/track/view', (req, res) => {
        const payload = typeof req.body === 'string'
            ? (() => {
                try { return JSON.parse(req.body || '{}'); } catch (_e) { return {}; }
            })()
            : (req.body || {});
        const { path, title, referrer } = payload;
        if (!path) return res.status(400).json({ error: 'path required' });
        const session_id = req.sessionID || null;
        const user_id = req.user?.id || null;
        trackPageView({
            path,
            title,
            referrer,
            user_agent: req.get('user-agent'),
            ip: req.ip,
            session_id,
            user_id
        }).catch(e => console.error('track error:', e.message));
        res.json({ ok: true });
    });

    /* ─────────────────────────────────────────────────────────
        PANEL DE ADMINISTRACIÓN
    ───────────────────────────────────────────────────────── */
    app.get('/api/admin/users', requireAdmin, ah(async (_req, res) => {
        const users = await getAllUsersAdmin();
        res.json(users);
    }));

    app.get('/api/admin/repairs', requireAdmin, ah(async (_req, res) => {
        const repairs = await getAllRepairsAdmin();
        res.json(repairs);
    }));

    app.post('/api/admin/repairs', requireAdmin, ah(async (req, res) => {
        const repair = await insertRepairAdmin(req.body);
        await audit(req, 'create', 'repair', repair?.id, { ticket_code: repair?.ticket_code });
        res.status(201).json({ success: true, repair });
    }));

    app.get('/api/admin/builds', requireAdmin, ah(async (_req, res) => {
        const builds = await getAllBuildsAdmin();
        res.json(builds);
    }));

    app.post('/api/admin/builds', requireAdmin, ah(async (req, res) => {
        const build = await insertBuildAdmin(req.body);
        await audit(req, 'create', 'build', build?.id, { title: build?.title, price: build?.price });
        res.status(201).json({ success: true, build });
    }));

    app.get('/api/admin/comments', requireAdmin, ah(async (_req, res) => {
        const comments = await getAllCommentsAdmin();
        res.json(comments);
    }));

    app.post('/api/admin/comments/:id/approve', requireAdmin, ah(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const success = await approveComment(id);
        if (success) {
            await audit(req, 'approve', 'comment', id);
            res.json({ success: true });
        } else res.status(404).json({ error: 'Comentario no encontrado' });
    }));

    app.delete('/api/admin/comments/:id', requireAdmin, ah(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const success = await deleteComment(id);
        if (success) {
            await audit(req, 'delete', 'comment', id);
            res.json({ success: true });
        } else res.status(404).json({ error: 'Comentario no encontrado' });
    }));

    app.get('/api/admin/comments/stream', requireAdmin, (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
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
        const faq = await insertFaq(req.body);
        await audit(req, 'create', 'faq', faq?.id, { question: faq?.question, category: faq?.category });
        res.status(201).json(faq);
    }));

    app.put('/api/admin/faqs/:id', requireAdmin, ah(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const success = await updateFaq(id, req.body);
        if (success) await audit(req, 'update', 'faq', id, { category: req.body?.category, question: req.body?.question });
        res.json({ success });
    }));

    app.delete('/api/admin/faqs/:id', requireAdmin, ah(async (req, res) => {
        const id = parseInt(req.params.id, 10);
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

    /* ─────────────────────────────────────────────────────────
        ADMIN ANALYTICS
    ───────────────────────────────────────────────────────── */
    app.get('/api/admin/analytics/summary', requireAdmin, ah(async (_req, res) => {
        res.json(await getPageViewsSummary());
    }));

    app.get('/api/admin/analytics/daily', requireAdmin, ah(async (req, res) => {
        const days = parseInt(req.query.days, 10) || 30;
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
        const days = parseInt(req.query.days, 10) || 30;
        const limit = parseInt(req.query.limit, 10) || 20;
        res.json(await getPageViewsTop(limit, days));
    }));

    /* ─────────────────────────────────────────────────────────
        ARCHIVOS ESTATICOS Y RUTAS HTML
        Tras el cutover Astro, dev y prod sirven el MISMO árbol dist/.
        Por eso la tabla de rutas y el handler son únicos.
    ───────────────────────────────────────────────────────── */
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
            // VISTAS DE PRUEBAS — no listadas en sitemap, pero sirven con HTTP 200
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
        // M6 — canonicaliza /b2b -> /B2B (Preferencia del usuario por Mayúsculas)
        app.get('/b2b', (req, res, next) => {
            if (req.path === '/b2b') return res.redirect(301, '/B2B');
            next();
        });

        // SECURITY-2 (M2) — gate del HTML admin antes del catch-all.
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

            res.sendFile(path.join(distPath, 'index.html'), sendFileOptions);
        });
    }

    /* ─────────────────────────────────────────────────────────
       MANEJO DE ERRORES (handlers async sin catch caen aquí)
    ───────────────────────────────────────────────────────── */
    app.use((err, req, res, _next) => {
        console.error(`✗ ${req.method} ${req.path}:`, err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    /* ─────────────────────────────────────────────────────────
       ARRANCAR
    ───────────────────────────────────────────────────────── */
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
