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
    insertBuildAdmin
} = require('./database');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 3000) : (process.env.PORT || 3001);

// Helper para envolver handlers async sin perder errores en Express 4
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ─────────────────────────────────────────────────────────────
   BOOTSTRAP — todo el setup que necesita la DB lista va dentro
───────────────────────────────────────────────────────────── */
(async () => {
    await initDB();

    const sseClients = new Set();
    let sseIdCounter = 0;

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
    app.use(compression({
        threshold: 1024,
        level: 6,
        filter: (req, res) => {
            if (req.headers['x-no-compression']) return false;
            return compression.filter(req, res);
        }
    }));

    app.use(express.json({ limit: '10kb' }));

    if (process.env.NODE_ENV !== 'production') {
        const rootPath = path.join(__dirname, '..');
        app.use(express.static(rootPath, { index: false, maxAge: 0 }));
    }

    app.use(cors({
        origin: [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'https://pixon.com.mx',
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }));

    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        next();
    });

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
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
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

    /* ─────────────────────────────────────────────────────────
       AUTH
    ───────────────────────────────────────────────────────── */
    app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    app.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/' }),
        (req, res) => res.redirect('/')
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
        const cleanPhone = String(phone || '').trim().slice(0, 20);

        if (cleanPhone.length < 10) {
            return res.status(400).json({ error: 'Número de celular inválido (mínimo 10 dígitos).' });
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

    app.get('/api/comments/stream', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const clientId = ++sseIdCounter;
        const client = { id: clientId, res };
        sseClients.add(client);
        console.log(`SSE #${clientId} conectado (total: ${sseClients.size})`);

        const keepalive = setInterval(() => {
            try { res.write(': ping\n\n'); } catch (e) { clearInterval(keepalive); }
        }, 25000);

        req.on('close', () => {
            clearInterval(keepalive);
            sseClients.delete(client);
            console.log(`SSE #${clientId} desconectado (total: ${sseClients.size})`);
        });
    });

    app.post('/api/comments', requireAuth, ah(async (req, res) => {
        const { name, stars, text } = req.body;
        const cleanName = String(name || '').trim().slice(0, 60);
        const cleanText = String(text || '').trim().slice(0, 500);
        const cleanStars = parseInt(stars, 10);

        const errors = [];
        if (cleanName.length < 2) errors.push('El nombre es muy corto.');
        if (cleanText.length < 10) errors.push('El comentario es muy corto.');
        if (isNaN(cleanStars) || cleanStars < 1 || cleanStars > 5)
            errors.push('Estrellas invalidas (1-5).');

        if (errors.length) return res.status(400).json({ errors });

        const user_email = req.user?.email || null;
        const created = await insertComment({ name: cleanName, stars: cleanStars, text: cleanText, user_email });
        res.status(201).json({ success: true, message: 'Comentario enviado para revisión.', comment: created });
    }));

    app.get('/api/faqs', ah(async (_req, res) => {
        const faqs = await getAllFaqs();
        res.json(faqs);
    }));

    app.post('/api/faqs/unanswered', ah(async (req, res) => {
        const { query } = req.body;
        if (query && query.length >= 3) {
            await logUnansweredFaq(query);
        }
        res.json({ success: true });
    }));

    app.get('/api/builds', ah(async (_req, res) => {
        const builds = await getAllBuildsAdmin();
        res.json(builds);
    }));

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
        res.status(201).json({ success: true, repair });
    }));

    app.get('/api/admin/builds', requireAdmin, ah(async (_req, res) => {
        const builds = await getAllBuildsAdmin();
        res.json(builds);
    }));

    app.post('/api/admin/builds', requireAdmin, ah(async (req, res) => {
        const build = await insertBuildAdmin(req.body);
        res.status(201).json({ success: true, build });
    }));

    app.get('/api/admin/comments', requireAdmin, ah(async (_req, res) => {
        const comments = await getAllCommentsAdmin();
        res.json(comments);
    }));

    app.post('/api/admin/comments/:id/approve', requireAdmin, ah(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const success = await approveComment(id);
        if (success) res.json({ success: true });
        else res.status(404).json({ error: 'Comentario no encontrado' });
    }));

    app.delete('/api/admin/comments/:id', requireAdmin, ah(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const success = await deleteComment(id);
        if (success) res.json({ success: true });
        else res.status(404).json({ error: 'Comentario no encontrado' });
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
        res.status(201).json(faq);
    }));

    app.put('/api/admin/faqs/:id', requireAdmin, ah(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const success = await updateFaq(id, req.body);
        res.json({ success });
    }));

    app.delete('/api/admin/faqs/:id', requireAdmin, ah(async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const success = await deleteFaq(id);
        res.json({ success });
    }));

    app.get('/api/admin/faqs/unanswered', requireAdmin, ah(async (_req, res) => {
        res.json(await getUnansweredFaqs());
    }));

    app.delete('/api/admin/faqs/unanswered', requireAdmin, ah(async (_req, res) => {
        await clearUnansweredFaqs();
        res.json({ success: true });
    }));

    /* ─────────────────────────────────────────────────────────
       ARCHIVOS ESTATICOS Y RUTAS HTML
    ───────────────────────────────────────────────────────── */
    if (process.env.NODE_ENV === 'production') {
        const distPath = path.join(__dirname, '../dist');

        const pages = {
            '/': 'index.html',
            '/en': 'pages/en/index.html',
            '/paquetes': 'pages/servicios/paquetes.html',
            '/servicios/paquetes': 'pages/servicios/paquetes.html',
            '/ensambles': 'pages/servicios/ensambles.html',
            '/servicios/ensambles': 'pages/servicios/ensambles.html',
            '/mantenimiento-mac': 'pages/servicios/mantenimiento-mac.html',
            '/servicios/mantenimiento-mac': 'pages/servicios/mantenimiento-mac.html',
            '/instalacion-windows': 'pages/servicios/instalacion-windows.html',
            '/servicios/instalacion-windows': 'pages/servicios/instalacion-windows.html',
            '/reparaciones': 'pages/servicios/reparaciones.html',
            '/servicios/reparaciones': 'pages/servicios/reparaciones.html',
            '/reparacion-bisagras': 'pages/servicios/reparacion-bisagras.html',
            '/servicios/reparacion-bisagras': 'pages/servicios/reparacion-bisagras.html',
            '/reparacion-controles': 'pages/servicios/reparacion-controles.html',
            '/servicios/reparacion-controles': 'pages/servicios/reparacion-controles.html',
            '/b2b': 'pages/servicios/b2b.html',
            '/B2B': 'pages/servicios/b2b.html',
            '/servicios/b2b': 'pages/servicios/b2b.html',
            '/optimizacion': 'pages/servicios/optimizacion.html',
            '/servicios/optimizacion': 'pages/servicios/optimizacion.html',
            '/catalogo': 'pages/info/catalogo.html',
            '/comentarios': 'pages/info/comentarios.html',
            '/contacto': 'pages/info/contacto.html',
            '/preguntas-frecuentes': 'pages/info/preguntas-frecuentes.html',
            '/privacidad': 'pages/legal/privacidad.html',
            '/garantia': 'pages/legal/garantia.html',
            '/admin': 'pages/admin/admin.html',
        };

        const legacyRedirects = ['/formateo-optimizacion'];
        legacyRedirects.forEach(oldPath => {
            app.get(oldPath, (_req, res) => res.redirect(301, '/instalacion-windows'));
        });

        app.use(express.static(distPath, {
            maxAge: '1y',
            etag: true,
            index: false,
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
        }));

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

            res.sendFile(path.join(distPath, 'index.html'), sendFileOptions);
        });
    } else {
        const rootPath = path.join(__dirname, '..');

        const devPages = {
            '/': 'index.html',
            '/en': 'pages/en/index.html',
            '/paquetes': 'pages/servicios/paquetes.html',
            '/servicios/paquetes': 'pages/servicios/paquetes.html',
            '/ensambles': 'pages/servicios/ensambles.html',
            '/servicios/ensambles': 'pages/servicios/ensambles.html',
            '/mantenimiento-mac': 'pages/servicios/mantenimiento-mac.html',
            '/servicios/mantenimiento-mac': 'pages/servicios/mantenimiento-mac.html',
            '/instalacion-windows': 'pages/servicios/instalacion-windows.html',
            '/servicios/instalacion-windows': 'pages/servicios/instalacion-windows.html',
            '/reparaciones': 'pages/servicios/reparaciones.html',
            '/servicios/reparaciones': 'pages/servicios/reparaciones.html',
            '/reparacion-bisagras': 'pages/servicios/reparacion-bisagras.html',
            '/servicios/reparacion-bisagras': 'pages/servicios/reparacion-bisagras.html',
            '/reparacion-controles': 'pages/servicios/reparacion-controles.html',
            '/servicios/reparacion-controles': 'pages/servicios/reparacion-controles.html',
            '/b2b': 'pages/servicios/b2b.html',
            '/B2B': 'pages/servicios/b2b.html',
            '/servicios/b2b': 'pages/servicios/b2b.html',
            '/optimizacion': 'pages/servicios/optimizacion.html',
            '/servicios/optimizacion': 'pages/servicios/optimizacion.html',
            '/catalogo': 'pages/info/catalogo.html',
            '/comentarios': 'pages/info/comentarios.html',
            '/contacto': 'pages/info/contacto.html',
            '/preguntas-frecuentes': 'pages/info/preguntas-frecuentes.html',
            '/privacidad': 'pages/legal/privacidad.html',
            '/garantia': 'pages/legal/garantia.html',
            '/admin': 'pages/admin/admin.html',
        };

        const legacyDevRedirects = ['/formateo-optimizacion'];
        legacyDevRedirects.forEach(oldPath => {
            app.get(oldPath, (_req, res) => res.redirect(301, '/instalacion-windows'));
        });

        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
            if (req.path.includes('.')) return next();

            const cleanPath = req.path === '/' ? '/' : req.path.replace(/\/$/, '');
            const htmlFile = devPages[cleanPath];

            if (htmlFile) {
                const fullPath = path.join(rootPath, htmlFile);
                if (fs.existsSync(fullPath)) {
                    return res.sendFile(fullPath);
                }
            }

            res.sendFile(path.join(rootPath, 'index.html'));
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
    app.listen(PORT, () => {
        const mode = process.env.NODE_ENV || 'development';
        console.log(`
+--------------------------------------------------+
|  Pixon PC API [${mode}] (MariaDB)
|  REST  -> http://localhost:${PORT}/api/comments
|  SSE   -> http://localhost:${PORT}/api/comments/stream
|  OAuth -> http://localhost:${PORT}/auth/google
+--------------------------------------------------+`);
    });
})().catch(err => {
    console.error('✗ Bootstrap fallido:', err.message);
    console.error(err.stack);
    process.exit(1);
});

module.exports = app;
