'use strict';

const SENSITIVE_KEY = /password|secret|token|authorization|cookie|clabe|account|cuenta|card|tarjeta/i;

function redactAuditValue(value, depth = 0) {
    if (depth > 6) return '[TRUNCATED]';
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.slice(0, 100).map((entry) => redactAuditValue(entry, depth + 1));
    if (typeof value !== 'object') {
        return typeof value === 'string' ? value.slice(0, 2000) : value;
    }

    const output = {};
    for (const [key, entry] of Object.entries(value)) {
        output[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactAuditValue(entry, depth + 1);
    }
    return output;
}

function requestAuditContext(req) {
    return {
        userId: req?.user?.id || null,
        ip: req?.ip ? String(req.ip).slice(0, 45) : null,
        userAgent: req?.get?.('user-agent') ? String(req.get('user-agent')).slice(0, 255) : null,
        requestId: (req?.id || req?.get?.('x-request-id') || null)?.toString().slice(0, 64)
    };
}

function createAuditWriter() {
    return {
        async write(connection, {
            actor,
            action,
            entity,
            entityId,
            before,
            after,
            metadata
        }) {
            if (!connection || typeof connection.execute !== 'function') {
                throw new TypeError('La auditoria requiere la conexion de la transaccion');
            }
            const safeBefore = redactAuditValue(before);
            const safeAfter = redactAuditValue(after);
            const safeMetadata = redactAuditValue(metadata);
            const diff = { before: safeBefore, after: safeAfter, metadata: safeMetadata };
            await connection.execute(
                `INSERT INTO admin_logs (
                    user_id, action, entity, entity_id, diff, ip, user_agent,
                    request_id, transaction_id, before_data, after_data, metadata
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    actor?.userId || null,
                    String(action).slice(0, 64),
                    String(entity).slice(0, 64),
                    entityId === null || entityId === undefined ? null : String(entityId).slice(0, 64),
                    JSON.stringify(diff),
                    actor?.ip || null,
                    actor?.userAgent || null,
                    actor?.requestId || null,
                    actor?.transactionId || null,
                    safeBefore === undefined ? null : JSON.stringify(safeBefore),
                    safeAfter === undefined ? null : JSON.stringify(safeAfter),
                    safeMetadata === undefined ? null : JSON.stringify(safeMetadata)
                ]
            );
        }
    };
}

module.exports = { createAuditWriter, requestAuditContext, redactAuditValue };
