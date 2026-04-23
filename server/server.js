/**
 * ============================================================
 *  server/server.js  — API Express + SQLite (sql.js / WASM)
 * ============================================================
 *
 *  ARRANCAR:
 *  Dev:         node server/server.js
 *  Dev (ambos): npm run dev:all   (Vite + este servidor)
 *  Producción:  npm run start
 *
 *  RUTAS:
 *  GET  /api/health              → check de salud
 *  GET  /api/comments            → lista de comentarios aprobados
 *  POST /api/comments            → crear comentario nuevo
 *  GET  /api/comments/stream     → SSE: push tiempo real
 * ============================================================
 */

'use strict';

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const { initDB, getAllComments, insertComment, reloadIfExternallyChanged } = require('./database');

const app  = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

/* ─────────────────────────────────────────────────────────────
   SSE — Set de clientes conectados en tiempo real
───────────────────────────────────────────────────────────── */
const sseClients = new Set();
let sseIdCounter = 0;

/**
 * broadcastComment(comment) — Envía SSE 'new-comment' a TODOS los clientes.
 */
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

/* ─────────────────────────────────────────────────────────────
   MIDDLEWARE
───────────────────────────────────────────────────────────── */
app.use(express.json({ limit: '10kb' }));

app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'https://pixon.com.mx',
    ],
    methods: ['GET', 'POST'],
}));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

/* ─────────────────────────────────────────────────────────────
   RUTAS
───────────────────────────────────────────────────────────── */

/** GET /api/health */
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString(), clients: sseClients.size });
});

/** GET /api/comments */
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

/**
 * GET /api/comments/stream — SSE tiempo real
 * El cliente se subscribe y recibe un evento 'new-comment' cada
 * vez que alguien publica uno via POST, sin recargar la página.
 */
app.get('/api/comments/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Para Nginx / Cloudflare Tunnel
    res.flushHeaders();

    const clientId = ++sseIdCounter;
    const client = { id: clientId, res };
    sseClients.add(client);
    console.log(`SSE #${clientId} conectado (total: ${sseClients.size})`);

    // Keepalive cada 25s para evitar timeouts de proxy
    const keepalive = setInterval(() => {
        try { res.write(': ping\n\n'); } catch (e) { clearInterval(keepalive); }
    }, 25000);

    req.on('close', () => {
        clearInterval(keepalive);
        sseClients.delete(client);
        console.log(`SSE #${clientId} desconectado (total: ${sseClients.size})`);
    });
});

/** POST /api/comments */
app.post('/api/comments', (req, res) => {
    try {
        const { name, stars, text } = req.body;

        const cleanName  = String(name  || '').trim().slice(0, 60);
        const cleanText  = String(text  || '').trim().slice(0, 500);
        const cleanStars = parseInt(stars, 10);

        const errors = [];
        if (cleanName.length < 2)   errors.push('El nombre es muy corto.');
        if (cleanText.length < 10)  errors.push('El comentario es muy corto.');
        if (isNaN(cleanStars) || cleanStars < 1 || cleanStars > 5)
                                    errors.push('Estrellas invalidas (1-5).');

        if (errors.length) return res.status(400).json({ errors });

        const created = insertComment({ name: cleanName, stars: cleanStars, text: cleanText });

        // PUSH EN TIEMPO REAL a todos los clientes SSE
        broadcastComment(created);

        res.status(201).json(created);

    } catch (err) {
        console.error('POST /api/comments error:', err.message);
        res.status(500).json({ error: 'Error al guardar el comentario.' });
    }
});

/* ─────────────────────────────────────────────────────────────
   ARCHIVOS ESTATICOS EN PRODUCCION
───────────────────────────────────────────────────────────── */
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../dist');
    const fs = require('fs');

    const pages = {
        '/':                      'index.html',
        '/paquetes':              'paquetes.html',
        '/ensambles':             'ensambles.html',
        '/catalogo':              'catalogo.html',
        '/comentarios':           'comentarios.html',
        '/contacto':              'contacto.html',
        '/mantenimiento-mac':     'mantenimiento-mac.html',
        '/preguntas-frecuentes':  'preguntas-frecuentes.html',
        '/privacidad':            'privacidad.html',
        '/garantia':              'garantia.html',
        '/formateo-optimizacion-computadoras-cancun': 'formateo-optimizacion-computadoras-cancun.html',
    };

    app.use(express.static(distPath, { maxAge: '1y', etag: true, index: false }));

    app.get('/robots.txt', (_req, res) => {
        const file = path.join(distPath, 'robots.txt');
        if (fs.existsSync(file)) {
            res.type('text/plain').sendFile(file);
        } else {
            res.type('text/plain').send('User-agent: *\nAllow: /\n\nSitemap: https://pixon.com.mx/sitemap.xml\n');
        }
    });

    app.get('/sitemap.xml', (_req, res) => {
        const file = path.join(distPath, 'sitemap.xml');
        if (fs.existsSync(file)) {
            res.type('application/xml').sendFile(file);
        } else {
            res.status(404).send('Sitemap not found');
        }
    });

    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();

        const sendFileOptions = {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
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
}

/* ─────────────────────────────────────────────────────────────
   ARRANCAR
───────────────────────────────────────────────────────────── */
initDB().then(() => {
    // Escuchar cambios externos en el archivo de base de datos
    fs.watchFile(path.join(__dirname, 'pixon.db'), { interval: 1000 }, () => {
        if (reloadIfExternallyChanged()) {
            const payload = JSON.stringify({ action: 'reload' });
            for (const client of sseClients) {
                try { client.res.write(`event: db-sync\ndata: ${payload}\n\n`); } catch(e){}
            }
        }
    });

    app.listen(PORT, () => {
        const mode = process.env.NODE_ENV || 'development';
        console.log(`
+--------------------------------------------------+
|  Pixon PC API [${mode}]
|  REST  -> http://localhost:${PORT}/api/comments
|  SSE   -> http://localhost:${PORT}/api/comments/stream
+--------------------------------------------------+`);
    });
}).catch(err => {
    console.error('Error iniciando la DB:', err);
    process.exit(1);
});

module.exports = app;
