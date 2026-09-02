'use strict';

const isProduction = process.env.NODE_ENV === 'production';

function maskEmail(email) {
    if (!email || typeof email !== 'string') return '';
    const clean = email.trim();
    const parts = clean.split('@');
    if (parts.length !== 2) return '***';
    const [user, domain] = parts;
    const maskedUser = user.length <= 2 ? `${user[0] || ''}***` : `${user[0]}***${user[user.length - 1]}`;
    return `${maskedUser}@${domain}`;
}

function maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return '***';
    return `***${digits.slice(-4)}`;
}

function structuredLog({
    level = 'info',
    event = 'general',
    entity_type = null,
    entity_id = null,
    correlation_id = null,
    provider = null,
    status = 'ok',
    message = '',
    data = null
}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        event,
        entity_type,
        entity_id: entity_id ? String(entity_id) : null,
        correlation_id: correlation_id || null,
        provider,
        status,
        message
    };
    if (data && typeof data === 'object') {
        entry.data = data;
    }
    const line = JSON.stringify(entry);
    if (level === 'error') {
        console.error(line);
    } else if (level === 'warn') {
        console.warn(line);
    } else {
        console.log(line);
    }
    return entry;
}

function logError(err, req, context = 'server') {
    const method = req?.method || 'UNKNOWN';
    const path = req?.originalUrl || req?.path || req?.url || 'unknown-path';
    const message = err?.message || 'Error sin mensaje';
    const correlation_id = req?.correlationId || null;

    structuredLog({
        level: 'error',
        event: 'http_error',
        entity_type: context,
        correlation_id,
        status: 'error',
        message: `[${context}] ${method} ${path}: ${message}`
    });

    if (!isProduction && err?.stack) {
        console.error(err.stack);
    }
}

function logWarn(message, context = 'server', correlationId = null) {
    structuredLog({
        level: 'warn',
        event: 'warning',
        entity_type: context,
        correlation_id: correlationId,
        status: 'warn',
        message: `[${context}] ${message}`
    });
}

module.exports = {
    logError,
    logWarn,
    structuredLog,
    maskEmail,
    maskPhone
};

