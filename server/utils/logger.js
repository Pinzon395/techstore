'use strict';

const isProduction = process.env.NODE_ENV === 'production';

function logError(err, req, context = 'server') {
    const method = req?.method || 'UNKNOWN';
    const path = req?.originalUrl || req?.path || req?.url || 'unknown-path';
    const message = err?.message || 'Error sin mensaje';
    console.error(`[${context}] ${method} ${path}: ${message}`);

    if (!isProduction && err?.stack) {
        console.error(err.stack);
    }
}

function logWarn(message) {
    console.warn(`[server] ${message}`);
}

module.exports = {
    logError,
    logWarn
};
