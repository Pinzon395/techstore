'use strict';

const express = require('express');

function createHealthRoutes({ getClientCount, checkDatabase }) {
    const router = express.Router();

    router.get('/health', async (_req, res) => {
        try {
            if (checkDatabase) await checkDatabase();
            res.setHeader('Cache-Control', 'no-store, private');
            res.json({
                ok: true,
                status: 'UP',
                app: 'UP',
                db: 'UP',
                ts: new Date().toISOString()
            });
        } catch (_error) {
            res.setHeader('Cache-Control', 'no-store, private');
            res.status(503).json({
                ok: false,
                status: 'DOWN',
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
