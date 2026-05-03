/**
 * ============================================================
 *  server/server.js  — API Express + better-sqlite3 + Auth
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
const SQLiteStore = require('better-sqlite3-session-store')(session);

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
    clearUnansweredFaqs
} = require('./database');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 3000) : (process.env.PORT || 3001);

/* ─────────────────────────────────────────────────────────────
   1. INICIALIZAR BASE DE DATOS Y EVENTOS (Síncrono)
───────────────────────────────────────────────────────────── */
// Inicializa better-sqlite3 de forma síncrona
initDB();

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

dbEmitter.on('new-comment', (comment) => {
    broadcastComment(comment);
});

dbEmitter.on('db-sync', () => {
    const payload = JSON.stringify({ action: 'reload' });
    for (const client of sseClients) {
        try { client.res.write(`event: db-sync\ndata: ${payload}\n\n`); } catch (e) { }
    }
});

/* ─────────────────────────────────────────────────────────────
   2. MIDDLEWARES GLOBALES
───────────────────────────────────────────────────────────── */
// gzip/deflate para todas las respuestas — reduce 70-85% el peso de HTML/CSS/JS
// que viaja al cliente. La descompresión la hace el navegador.
app.use(compression({
    threshold: 1024,           // No comprimir respuestas <1KB (overhead innecesario)
    level: 6,                  // Balance entre CPU y ratio de compresión (1-9)
    filter: (req, res) => {
        // Respeta el header del cliente cuando pide explícitamente sin compresión
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

app.use(express.json({ limit: '10kb' }));

// En desarrollo, servir los archivos del proyecto directamente desde la raíz
// Esto permite acceder a localhost:3000 sin Vite (después del OAuth callback)
if (process.env.NODE_ENV !== 'production') {
    const rootPath = path.join(__dirname, '..');
    app.use(express.static(rootPath, {
        index: false, // No auto-servir index.html todavía, primero van las rutas API
        maxAge: 0     // Sin cache en desarrollo
    }));
}


app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'https://pixon.com.mx',
    ],
    methods: ['GET', 'POST'],
    credentials: true // Necesario para sesiones OAuth
}));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

/* ─────────────────────────────────────────────────────────────
   3. CONFIGURACIÓN DE SESIONES Y PASSPORT
───────────────────────────────────────────────────────────── */
// ESTO TIENE QUE IR ANTES DE DECLARAR CUALQUIER RUTA
app.set('trust proxy', 1); // <-- CRÍTICO para que la cookie de sesión funcione en producción detrás de Nginx con HTTPS
app.use(session({
    store: new SQLiteStore({
        client: getDB(),
        expired: {
            clear: true,
            intervalMs: 900000 // Limpia cada 15 min
        }
    }),
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Evita que la sesión se pierda si el proxy/hosting no pasa el header HTTPS correctamente
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 semana
        sameSite: 'lax'
    }
}));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'no_client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'no_secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    proxy: true // ESTO ES CLAVE para que al subir a producción detrás de Nginx/Render, detecte el https:// y el dominio correcto automáticamente.
}, (accessToken, refreshToken, profile, done) => {
    try {
        const user = findOrCreateGoogleUser(profile);
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    try {
        const user = getUserById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

app.use(passport.initialize());
app.use(passport.session());

/* ─────────────────────────────────────────────────────────────
   4. MIDDLEWARES DE AUTORIZACIÓN (Ayudantes)
───────────────────────────────────────────────────────────── */
function requireAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'No autorizado' });
}

function requireAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') return next();
    res.status(403).json({ error: 'Prohibido' });
}

/* ─────────────────────────────────────────────────────────────
   5. RUTAS DE AUTENTICACIÓN
───────────────────────────────────────────────────────────── */
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        // Redirigir a la raíz relativa. Como el frontend y backend comparten dominio,
        // esto funcionará perfectamente tanto en local (localhost:3000) como en producción (dominio real) o red local (IP).
        res.redirect('/');
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

app.post('/api/me/profile', requireAuth, (req, res) => {
    try {
        const { phone } = req.body;
        const cleanPhone = String(phone || '').trim().slice(0, 20);

        if (cleanPhone.length < 10) {
            return res.status(400).json({ error: 'Número de celular inválido (mínimo 10 dígitos).' });
        }

        const success = updateUserProfile(req.user.id, { phone: cleanPhone });
        if (success) {
            req.user.phone = cleanPhone; // Actualizar la sesión en memoria
            res.json({ success: true, phone: cleanPhone });
        } else {
            res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
        }
    } catch (err) {
        console.error('POST /api/me/profile error:', err.message);
        res.status(500).json({ error: 'Error interno al guardar el perfil.' });
    }
});

/* ─────────────────────────────────────────────────────────────
   6. RUTAS DE LA API (Comentarios, etc)
───────────────────────────────────────────────────────────── */
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString(), clients: sseClients.size });
});

app.get('/api/comments', (_req, res) => {
    try {
        const comments = getAllComments();
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.json(comments);
    } catch (err) {
        console.error('GET /api/comments error:', err.message);
        res.status(500).json({ error: 'Error al obtener comentarios.' });
    }
});

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

app.post('/api/comments', requireAuth, (req, res) => {
    try {
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

        // El email viene de la sesión autenticada (no del body — no se puede falsear)
        const user_email = req.user?.email || null;

        const created = insertComment({ name: cleanName, stars: cleanStars, text: cleanText, user_email });
        res.status(201).json({ success: true, message: 'Comentario enviado para revisión.', comment: created });

    } catch (err) {
        console.error('POST /api/comments error:', err.message);
        res.status(500).json({ error: 'Error al guardar el comentario.' });
    }
});

app.get('/api/faqs', (_req, res) => {
    try {
        const faqs = getAllFaqs();
        res.json(faqs);
    } catch (err) {
        console.error('GET /api/faqs error:', err);
        res.status(500).json({ error: 'Error al cargar FAQs' });
    }
});

app.post('/api/faqs/unanswered', (req, res) => {
    try {
        const { query } = req.body;
        if (query && query.length >= 3) {
            logUnansweredFaq(query);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error logging faq' });
    }
});

/* ─────────────────────────────────────────────────────────────
   API REST — PANEL DE ADMINISTRACIÓN (Protegidas)
───────────────────────────────────────────────────────────── */

// Obtener TODOS los usuarios registrados
app.get('/api/admin/users', requireAdmin, (req, res) => {
    try {
        const users = getAllUsersAdmin();
        res.json(users);
    } catch (error) {
        console.error('GET /api/admin/users error:', error);
        res.status(500).json({ error: 'Error interno al cargar usuarios.' });
    }
});

// Obtener TODOS los comentarios (pendientes y aprobados)
app.get('/api/admin/comments', requireAdmin, (req, res) => {
    try {
        const comments = getAllCommentsAdmin();
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// Aprobar un comentario
app.post('/api/admin/comments/:id/approve', requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const success = approveComment(id);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Comentario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// Eliminar un comentario (rechazar o borrar)
app.delete('/api/admin/comments/:id', requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const success = deleteComment(id);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Comentario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// SSE stream solo para admin: recibe notificaciones de comentarios pendientes
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

    req.on('close', () => {
        dbEmitter.off('admin-pending', adminPendingListener);
    });
});

app.post('/api/admin/faqs', requireAdmin, (req, res) => {
    try {
        const faq = insertFaq(req.body);
        res.status(201).json(faq);
    } catch (error) {
        res.status(500).json({ error: 'Error creando FAQ' });
    }
});

app.put('/api/admin/faqs/:id', requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const success = updateFaq(id, req.body);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando FAQ' });
    }
});

app.delete('/api/admin/faqs/:id', requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const success = deleteFaq(id);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando FAQ' });
    }
});

app.get('/api/admin/faqs/unanswered', requireAdmin, (req, res) => {
    try {
        res.json(getUnansweredFaqs());
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

app.delete('/api/admin/faqs/unanswered', requireAdmin, (req, res) => {
    try {
        clearUnansweredFaqs();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
});

/* ─────────────────────────────────────────────────────────────
   7. ARCHIVOS ESTATICOS EN PRODUCCION
───────────────────────────────────────────────────────────── */
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../dist');

    const pages = {
        '/': 'index.html',
        '/en': 'pages/en/index.html',
        '/paquetes': 'pages/servicios/paquetes.html',
        '/ensambles': 'pages/servicios/ensambles.html',
        '/mantenimiento-mac': 'pages/servicios/mantenimiento-mac.html',
        '/instalacion-windows': 'pages/servicios/instalacion-windows.html',
        '/reparaciones': 'pages/servicios/reparaciones.html',
        '/reparacion-bisagras': 'pages/servicios/reparacion-bisagras.html',
        '/reparacion-controles': 'pages/servicios/reparacion-controles.html',
        '/b2b': 'pages/servicios/b2b.html',
        '/B2B': 'pages/servicios/b2b.html',
        '/optimizacion': 'pages/servicios/optimizacion.html',
        '/catalogo': 'pages/info/catalogo.html',
        '/comentarios': 'pages/info/comentarios.html',
        '/contacto': 'pages/info/contacto.html',
        '/preguntas-frecuentes': 'pages/info/preguntas-frecuentes.html',
        '/privacidad': 'pages/legal/privacidad.html',
        '/garantia': 'pages/legal/garantia.html',
        '/admin': 'pages/admin/admin.html',
    };

    // Redirects 301 — URLs viejas consolidadas
    const legacyRedirects = ['/formateo-optimizacion'];
    legacyRedirects.forEach(oldPath => {
        app.get(oldPath, (_req, res) => res.redirect(301, '/instalacion-windows'));
    });

    // express.static sirve los assets bajo /assets/* con hash inmutable.
    // Cache muy larga porque Vite genera nuevos nombres de archivo en cada build.
    app.use(express.static(distPath, {
        maxAge: '1y',
        etag: true,
        index: false,
        setHeaders: (res, filePath) => {
            // Normalizar separador en Windows para que los regex funcionen igual
            const p = filePath.replace(/\\/g, '/');
            // Assets de Vite con hash en el nombre → immutable seguro
            if (/\/assets\/.+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(p)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            } else if (/\/(styles|scripts|components)\/.+\.(js|css|mjs)$/i.test(p)) {
                // JS/CSS sin hash (cache-buster.js limpia localStorage al subir versión)
                res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
            } else if (/\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(p)) {
                // Imágenes y fuentes → 1 día browser, 1 semana CDN
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

        // Páginas HTML: se cachean en Cloudflare 24h (s-maxage) y en navegador 10min.
        // stale-while-revalidate permite servir respuesta previa mientras se revalida en
        // background, sin bloquear al cliente. cache-buster.js limpia caches del cliente
        // al cambiar la versión, así que es seguro cachear el HTML.
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
    // ── MODO DESARROLLO: servir HTML fuente directamente desde la raíz ──
    const rootPath = path.join(__dirname, '..');

    const devPages = {
        '/': 'index.html',
        '/en': 'pages/en/index.html',
        '/paquetes': 'pages/servicios/paquetes.html',
        '/ensambles': 'pages/servicios/ensambles.html',
        '/mantenimiento-mac': 'pages/servicios/mantenimiento-mac.html',
        '/instalacion-windows': 'pages/servicios/instalacion-windows.html',
        '/reparaciones': 'pages/servicios/reparaciones.html',
        '/reparacion-bisagras': 'pages/servicios/reparacion-bisagras.html',
        '/reparacion-controles': 'pages/servicios/reparacion-controles.html',
        '/b2b': 'pages/servicios/b2b.html',
        '/B2B': 'pages/servicios/b2b.html',
        '/optimizacion': 'pages/servicios/optimizacion.html',
        '/catalogo': 'pages/info/catalogo.html',
        '/comentarios': 'pages/info/comentarios.html',
        '/contacto': 'pages/info/contacto.html',
        '/preguntas-frecuentes': 'pages/info/preguntas-frecuentes.html',
        '/privacidad': 'pages/legal/privacidad.html',
        '/garantia': 'pages/legal/garantia.html',
        '/admin': 'pages/admin/admin.html',
    };

    // Redirects 301 — URLs viejas consolidadas
    const legacyDevRedirects = ['/formateo-optimizacion'];
    legacyDevRedirects.forEach(oldPath => {
        app.get(oldPath, (_req, res) => res.redirect(301, '/instalacion-windows'));
    });

    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
        if (req.path.includes('.')) return next(); // Dejar que express.static maneje assets

        const cleanPath = req.path === '/' ? '/' : req.path.replace(/\/$/, '');
        const htmlFile = devPages[cleanPath];

        if (htmlFile) {
            const fullPath = path.join(rootPath, htmlFile);
            if (fs.existsSync(fullPath)) {
                return res.sendFile(fullPath);
            }
        }

        // Fallback: index.html
        res.sendFile(path.join(rootPath, 'index.html'));
    });
}

/* ─────────────────────────────────────────────────────────────
   8. ARRANCAR SERVIDOR
───────────────────────────────────────────────────────────── */
app.listen(PORT, () => {
    const mode = process.env.NODE_ENV || 'development';
    console.log(`
+--------------------------------------------------+
|  Pixon PC API [${mode}]
|  REST  -> http://localhost:${PORT}/api/comments
|  SSE   -> http://localhost:${PORT}/api/comments/stream
|  OAuth -> http://localhost:${PORT}/auth/google
+--------------------------------------------------+`);
});

module.exports = app;
