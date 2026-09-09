'use strict';

const express = require('express');

function createHealthRoutes({ getClientCount, checkDatabase }) {
    const router = express.Router();

    router.get('/health', async (_req, res) => {
        try {
            if (checkDatabase) await checkDatabase();
            res.json({
                ok: true,
                ts: new Date().toISOString(),
                clients: getClientCount(),
                db: 'ok'
            });
        } catch (_error) {
            res.status(503).json({ ok: false, db: 'unavailable' });
        }
    });

    return router;
}

module.exports = createHealthRoutes;
