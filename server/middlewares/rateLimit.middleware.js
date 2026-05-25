'use strict';

const rateLimit = require('express-rate-limit');

const rateLimitMessage = (message) => ({
    ok: false,
    success: false,
    error: message,
    message
});

function createLimiter({ windowMs, max, message }) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: rateLimitMessage(message)
    });
}

module.exports = {
    createLimiter,
    rateLimitMessage
};
