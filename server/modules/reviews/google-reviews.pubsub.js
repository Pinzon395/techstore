'use strict';

/**
 * Webhook de Google Cloud Pub/Sub para notificaciones de la Business Profile
 * Notifications API (NEW_REVIEW, UPDATED_REVIEW, ...).
 *
 * Seguridad (regla 30 — no confiar en el payload ciegamente):
 *  1. Token compartido en la URL de push (?token=...), comparado contra
 *     GOOGLE_REVIEWS_PUBSUB_TOKEN. Es el mecanismo que Google documenta para
 *     asegurar endpoints de push sin configurar autenticación OIDC aparte.
 *  2. Estructura del sobre de Pub/Sub validada explícitamente.
 *  3. El campo `data` (base64) se decodifica y se valida como JSON con un
 *     notificationType conocido antes de disparar cualquier sync.
 *
 * Nunca ejecuta lógica de negocio con datos del payload directamente: solo
 * usa la notificación como disparador para volver a consultar la API oficial
 * (accounts.locations.reviews.list), que es la única fuente de verdad.
 */

const KNOWN_NOTIFICATION_TYPES = new Set([
    'NEW_REVIEW',
    'UPDATED_REVIEW',
    'GOOGLE_UPDATE',
    'NEW_CUSTOMER_MEDIA',
    'NEW_QUESTION',
    'UPDATED_QUESTION',
    'NEW_ANSWER',
    'UPDATED_ANSWER'
]);

const REVIEW_NOTIFICATION_TYPES = new Set(['NEW_REVIEW', 'UPDATED_REVIEW']);

function verifyPushToken(req) {
    const expected = String(process.env.GOOGLE_REVIEWS_PUBSUB_TOKEN || '').trim();
    if (!expected) return false; // sin token configurado, el endpoint se mantiene inerte
    const provided = String(req.query?.token || '').trim();
    return provided.length > 0 && provided === expected;
}

function parsePubsubEnvelope(body) {
    if (!body || typeof body !== 'object' || !body.message || typeof body.message !== 'object') {
        return { valid: false, reason: 'Sobre de Pub/Sub con forma inesperada.' };
    }
    const { data } = body.message;
    if (!data || typeof data !== 'string') {
        return { valid: false, reason: 'Pub/Sub message.data ausente.' };
    }
    let decoded;
    try {
        decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    } catch (error) {
        return { valid: false, reason: 'message.data no es JSON válido.' };
    }
    if (!decoded || typeof decoded !== 'object' || !decoded.notificationType) {
        return { valid: false, reason: 'Payload sin notificationType.' };
    }
    if (!KNOWN_NOTIFICATION_TYPES.has(decoded.notificationType)) {
        return { valid: false, reason: `notificationType desconocido: ${decoded.notificationType}` };
    }
    return { valid: true, payload: decoded };
}

/**
 * Handler de Express para POST /api/admin/google-reviews/pubsub.
 * Siempre responde 200/204 rápido (Pub/Sub reintenta agresivamente ante
 * cualquier otro código), y solo dispara sync para eventos de reseñas.
 */
function createPubsubHandler({ syncService, repository }) {
    return async function handlePubsubPush(req, res) {
        if (!verifyPushToken(req)) {
            return res.status(403).json({ success: false, message: 'Token de verificación inválido o no configurado.' });
        }

        const parsed = parsePubsubEnvelope(req.body);
        res.status(204).end(); // liberar la conexión de inmediato; el resto es best-effort

        if (!parsed.valid) {
            console.warn('[google-reviews][pubsub] Notificación ignorada:', parsed.reason);
            return;
        }

        await repository.updateSyncState({ last_pubsub_at: new Date() }).catch(() => {});

        if (REVIEW_NOTIFICATION_TYPES.has(parsed.payload.notificationType)) {
            syncService.scheduleDebouncedSync();
        }
    };
}

module.exports = { createPubsubHandler, parsePubsubEnvelope, verifyPushToken };
