'use strict';

const { logError } = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';

function errorHandler(err, req, res, _next) {
    logError(err, req);
    if (res.headersSent) return;

    const status = Number.isInteger(err?.status) && err.status >= 400 ? err.status : 500;
    const message = status >= 500
        ? 'Error interno del servidor'
        : (err?.message || 'Solicitud no valida');

    const payload = {
        ok: false,
        success: false,
        error: message,
        message
    };

    if (!isProduction && status >= 500 && err?.message) {
        payload.detail = err.message;
    }

    res.status(status).json(payload);
}

module.exports = { errorHandler };
