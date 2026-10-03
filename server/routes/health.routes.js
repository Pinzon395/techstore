'use strict';

const express = require('express');

function createHealthRoutes({ getClientCount, checkDatabase }) {
    const router = express.Router();

    // Liveness: confirma que el proceso Express puede responder. No consulta
    // dependencias externas, de modo que un monitor puede diferenciar un
    // proceso caído de una dependencia (por ejemplo MySQL) no disponible.
    router.get('/health', (_req, res) => {
        res.setHeader('Cache-Control', 'no-store, private');
        res.json({
            ok: true,
            status: 'UP',
            app: 'UP',
            ts: new Date().toISOString()
        });
    });

    // Readiness: confirma que la aplicación y su dependencia transaccional
    // principal están listas para recibir tráfico. No revela datos de conexión.
    router.get('/ready', async (_req, res) => {
        try {
            if (checkDatabase) await checkDatabase();
            res.setHeader('Cache-Control', 'no-store, private');
            res.json({
                ok: true,
                status: 'READY',
                app: 'UP',
                db: 'UP',
                ts: new Date().toISOString()
            });
        } catch (_error) {
            res.setHeader('Cache-Control', 'no-store, private');
            res.status(503).json({
                ok: false,
                status: 'NOT_READY',
                app: 'UP',
                db: 'DOWN',
                ts: new Date().toISOString()
            });
        }
    });

    router.get('/version', (_req, res) => {
        res.setHeader('Cache-Control', 'no-store, private');
        try {
            const fs = require('fs');
            const path = require('path');
            const versionFile = path.join(__dirname, '../../public/version.json');
            if (fs.existsSync(versionFile)) {
                const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
                return res.json({
                    ok: true,
                    version: data.version,
                    commit: data.commit,
                    builtAt: data.builtAt,
                    status: data.status || 'built'
                });
            }
        } catch (_e) {}
        res.json({
            ok: true,
            version: '2.1.0',
            commit: 'unknown',
            builtAt: new Date().toISOString()
        });
    });

    return router;
}

module.exports = createHealthRoutes;
