'use strict';

const { CommerceError, PayloadTooLargeError, ValidationError } = require('./errors');
const { logError } = require('../../utils/logger');

function sendData(res, data, { status = 200, meta } = {}) {
    const payload = { ok: true, data };
    if (meta !== undefined) payload.meta = meta;
    return res.status(status).json(payload);
}

function commerceErrorHandler(error, _req, res, next) {
    if (res.headersSent) return next(error);

    if (error?.type === 'entity.too.large' || error?.status === 413) {
        error = new PayloadTooLargeError();
    } else if (error instanceof SyntaxError && error?.status === 400 && 'body' in error) {
        error = new ValidationError('El JSON enviado no es valido');
        error.status = 400;
        error.code = 'INVALID_JSON';
    }

    const known = error instanceof CommerceError;
    const status = known ? error.status : 500;
    const payload = {
        ok: false,
        error: {
            code: known ? error.code : 'INTERNAL_ERROR',
            message: known ? error.message : 'Error interno del servidor'
        }
    };
    if (known && error.details !== undefined) payload.error.details = error.details;

    if (!known) {
        logError(error, _req, 'commerce');
        if (process.env.NODE_ENV === 'test') {
            payload.error.details = { diagnostic: String(error?.message || 'Error interno').slice(0, 500) };
        }
    }
    return res.status(status).json(payload);
}

module.exports = { sendData, commerceErrorHandler };
