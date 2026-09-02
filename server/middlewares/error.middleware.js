'use strict';

const { logError } = require('../utils/logger');

const isProduction = process.env.NODE_ENV === 'production';

function inferErrorCode(status, err) {
    if (err?.code && typeof err.code === 'string') return err.code;
    if (status === 400) return 'VALIDATION_ERROR';
    if (status === 401) return 'UNAUTHENTICATED';
    if (status === 403) return 'UNAUTHORIZED';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status === 422) return 'UNPROCESSABLE_ENTITY';
    if (status === 429) return 'RATE_LIMIT_EXCEEDED';
    return 'INTERNAL_ERROR';
}

function errorHandler(err, req, res, _next) {
    logError(err, req);
    if (res.headersSent) return;

    const status = Number.isInteger(err?.status) && err.status >= 400 ? err.status : (Number.isInteger(err?.statusCode) && err.statusCode >= 400 ? err.statusCode : 500);
    const message = status >= 500
        ? 'Error interno del servidor'
        : (err?.message || 'Solicitud no valida');

    const code = inferErrorCode(status, err);
    const correlation_id = req?.correlationId || null;

    const payload = {
        ok: false,
        success: false,
        code,
        error: message,
        message,
        correlation_id
    };

    if (!isProduction && status >= 500 && err?.message) {
        payload.detail = err.message;
    }

    res.status(status).json(payload);
}

module.exports = { errorHandler, inferErrorCode };

