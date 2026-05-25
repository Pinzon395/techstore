'use strict';

const express = require('express');

function createHealthRoutes({ getClientCount }) {
    const router = express.Router();

    router.get('/health', (_req, res) => {
        res.json({
            ok: true,
            ts: new Date().toISOString(),
            clients: getClientCount(),
            db: 'mariadb'
        });
    });

    return router;
}

module.exports = createHealthRoutes;
