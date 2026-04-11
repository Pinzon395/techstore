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
 *  GET  /api/health      → check de salud
 *  GET  /api/comments    → lista de comentarios aprobados
 *  POST /api/comments    → crear comentario nuevo
 * ============================================================
 */

'use strict';

const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const { initDB, getAllComments, insertComment } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ─────────────────────────────────────────────────────────────
   MIDDLEWARE
───────────────────────────────────────────────────────────── */

app.use(express.json({ limit: '10kb' }));

// CORS: permite peticiones desde el dev server de Vite
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'https://pizon.com.mx',
    ],
    methods: ['GET', 'POST'],
}));

// Headers de seguridad básicos
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});

/* ─────────────────────────────────────────────────────────────
   RUTAS
───────────────────────────────────────────────────────────── */

/** GET /api/health — Para Cloudflare Tunnel y monitoreo */
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
});

/** GET /api/comments — Lista de comentarios */
app.get('/api/comments', (_req, res) => {
    try {
        const comments = getAllComments();
        res.setHeader('Cache-Control', 'public, max-age=30');
        res.json(comments);
    } catch (err) {
        console.error('❌ GET /api/comments:', err.message);
        res.status(500).json({ error: 'Error al obtener comentarios.' });
    }
});

/** POST /api/comments — Crear comentario */
app.post('/api/comments', (req, res) => {
    try {
        const { name, stars, text } = req.body;

        // Limpiar input
        const cleanName  = String(name  || '').trim().slice(0, 60);
        const cleanText  = String(text  || '').trim().slice(0, 500);
        const cleanStars = parseInt(stars, 10);

        // Validar
        const errors = [];
        if (cleanName.length < 2)   errors.push('El nombre es muy corto.');
        if (cleanText.length < 10)  errors.push('El comentario es muy corto.');
        if (isNaN(cleanStars) || cleanStars < 1 || cleanStars > 5)
                                    errors.push('Estrellas inválidas (1-5).');

        if (errors.length) return res.status(400).json({ errors });

        const created = insertComment({ name: cleanName, stars: cleanStars, text: cleanText });
        res.status(201).json(created);

    } catch (err) {
        console.error('❌ POST /api/comments:', err.message);
        res.status(500).json({ error: 'Error al guardar el comentario.' });
    }
});

/* ─────────────────────────────────────────────────────────────
   ARCHIVOS ESTÁTICOS EN PRODUCCIÓN
───────────────────────────────────────────────────────────── */
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath, { maxAge: '1d', etag: true }));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'));
        }
    });
}

/* ─────────────────────────────────────────────────────────────
   ARRANCAR — Primero inicializar la DB (async), luego escuchar
───────────────────────────────────────────────────────────── */
initDB().then(() => {
    app.listen(PORT, () => {
        const mode = process.env.NODE_ENV || 'development';
        console.log(`
╔════════════════════════════════════════════╗
║  🚀 Pixon PC API — ${mode.padEnd(20)}║
║  📡 http://localhost:${PORT}/api/comments  ║
╚════════════════════════════════════════════╝`);
    });
}).catch(err => {
    console.error('❌ Error iniciando la DB:', err);
    process.exit(1);
});

module.exports = app;
