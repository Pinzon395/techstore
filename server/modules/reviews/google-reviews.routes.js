'use strict';

const express = require('express');
const { toPositiveInt } = require('../../utils/validators');
const { logAdminAction } = require('../../database');
const { GoogleReviewsRepository } = require('./google-reviews.repository');
const { GoogleReviewsSyncService } = require('./google-reviews.sync');
const { GoogleBusinessProfileClient } = require('./google-business-profile.client');
const { createPubsubHandler } = require('./google-reviews.pubsub');

const GOOGLE_REVIEW_SHARE_URL = 'https://share.google/RdsuiK10TObYQxIne';

function starsToPublicShape(row) {
    return {
        id: `google-${row.id}`,
        name: row.reviewer_display_name,
        rating: row.star_rating,
        text: row.comment,
        relative_time: '',
        published_at: row.google_create_time,
        profile_photo_url: '',
        google_maps_uri: row.review_url || ''
    };
}

function toAdminShape(row) {
    return {
        id: row.id,
        source: 'GOOGLE',
        google_review_id: row.google_review_id,
        name: row.reviewer_display_name,
        stars: row.star_rating,
        text: row.comment,
        created_at: row.google_create_time,
        updated_at: row.google_update_time,
        reply: row.review_reply_comment ? { text: row.review_reply_comment, at: row.review_reply_time } : null,
        review_url: row.review_url || null,
        status: row.moderation_status,
        featured: Boolean(row.featured),
        approved_by: row.approved_by,
        approved_at: row.approved_at,
        hidden_by: row.hidden_by,
        hidden_at: row.hidden_at,
        last_synced_at: row.last_synced_at
    };
}

/**
 * Construye ambos routers (público y admin) + arranca nada por sí mismo:
 * el worker de cron se arranca aparte (server/jobs/google-reviews-sync.worker.js).
 */
function createGoogleReviewsModule({ pool, requireAdmin, rateLimiter, dbEmitter }) {
    const repository = new GoogleReviewsRepository({ pool });
    const syncService = new GoogleReviewsSyncService({ repository, dbEmitter });

    /* ── PÚBLICO ───────────────────────────────────────────── */
    const publicRouter = express.Router();

    // Mismo contrato de respuesta que el antiguo passthrough de Places API,
    // para no tocar el frontend (comments.js / home.js ya lo consumen así).
    // Único cambio real: la fuente ahora es nuestra DB, solo APPROVED.
    publicRouter.get('/google', async (_req, res) => {
        const [rows, syncState] = await Promise.all([
            repository.listApproved({ limit: 60 }),
            repository.getSyncState()
        ]);
        res.setHeader('Cache-Control', 'public, max-age=120');
        res.json({
            source: rows.length ? 'google' : 'unconfigured',
            configured: Boolean(syncState?.location_id),
            place_id: syncState?.location_id || null,
            place_name: 'Pixon PC',
            rating: syncState?.average_rating || 0,
            total: syncState?.total_review_count || 0,
            google_maps_uri: syncState?.google_maps_uri || GOOGLE_REVIEW_SHARE_URL,
            reviews_url: syncState?.google_maps_uri || GOOGLE_REVIEW_SHARE_URL,
            write_review_url: syncState?.write_review_url || GOOGLE_REVIEW_SHARE_URL,
            reviews: rows.map(starsToPublicShape)
        });
    });

    // Webhook de Pub/Sub — nunca requiere sesión admin (Google no la tiene);
    // se autentica con el token de la URL (ver google-reviews.pubsub.js).
    publicRouter.post('/pubsub', express.json({ limit: '256kb' }), createPubsubHandler({ syncService, repository }));

    /* ── ADMIN ─────────────────────────────────────────────── */
    const adminRouter = express.Router();
    adminRouter.use(requireAdmin);

    adminRouter.get('/', async (req, res) => {
        const status = ['PENDING', 'APPROVED', 'HIDDEN', 'REMOVED'].includes(req.query.status) ? req.query.status : undefined;
        const rows = await repository.listForAdmin({ status });
        res.json(rows.map(toAdminShape));
    });

    adminRouter.get('/status', async (_req, res) => {
        res.json(await syncService.getConnectionStatus());
    });

    adminRouter.post('/sync', rateLimiter, async (req, res) => {
        const result = await syncService.runSync({ trigger: 'MANUAL' });
        if (!result.ok && result.reason === 'EXTERNAL_REQUIRED') {
            return res.status(409).json({ success: false, reason: result.reason, message: result.detail });
        }
        if (!result.ok) {
            return res.status(502).json({ success: false, reason: result.reason, message: result.detail });
        }
        await logAdminAction({
            user_id: req.user?.id, action: 'sync', entity: 'google_reviews', entity_id: null,
            diff: result, ip: req.ip, user_agent: req.get('user-agent')
        });
        res.json({ success: true, ...result });
    });

    adminRouter.post('/:id/approve', async (req, res) => {
        const id = toPositiveInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID inválido.' });
        const row = await repository.setModeration(id, 'APPROVED', req.user?.email);
        if (!row) return res.status(404).json({ success: false, message: 'Reseña no encontrada.' });
        await logAdminAction({
            user_id: req.user?.id, action: 'approve', entity: 'google_review', entity_id: id,
            diff: null, ip: req.ip, user_agent: req.get('user-agent')
        });
        res.json({ success: true, review: toAdminShape(row) });
    });

    // "Ocultar" nunca borra la reseña de Google ni la fila local (regla 13).
    adminRouter.post('/:id/hide', async (req, res) => {
        const id = toPositiveInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID inválido.' });
        const row = await repository.setModeration(id, 'HIDDEN', req.user?.email);
        if (!row) return res.status(404).json({ success: false, message: 'Reseña no encontrada.' });
        await logAdminAction({
            user_id: req.user?.id, action: 'hide', entity: 'google_review', entity_id: id,
            diff: null, ip: req.ip, user_agent: req.get('user-agent')
        });
        res.json({ success: true, review: toAdminShape(row) });
    });

    // OAuth 2.0 — solo un admin autenticado puede iniciar/objetar la
    // autorización de la cuenta que administra el Business Profile.
    adminRouter.get('/oauth/start', (req, res) => {
        if (!syncService.client.isConfigured) {
            return res.status(409).json({
                success: false,
                reason: 'GOOGLE_EXTERNAL_REQUIRED',
                message: 'Configura GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REVIEWS_OAUTH_CALLBACK_URL antes de autorizar.'
            });
        }
        const state = GoogleBusinessProfileClient.generateState();
        req.session.googleReviewsOAuthState = state;
        res.redirect(syncService.client.buildAuthUrl(state));
    });

    adminRouter.get('/oauth/callback', async (req, res) => {
        const { code, state, error } = req.query;
        if (error) return res.status(400).send(`Autorización de Google cancelada o fallida: ${escapeHtmlLite(error)}`);
        if (!code || !state || state !== req.session.googleReviewsOAuthState) {
            return res.status(400).send('Estado OAuth inválido. Intenta autorizar de nuevo desde el panel.');
        }
        delete req.session.googleReviewsOAuthState;
        try {
            const tokens = await syncService.client.exchangeCodeForTokens(code);
            if (!tokens.refreshToken) {
                return res.status(409).send('Google no devolvió un refresh_token (probablemente ya autorizado antes sin revocar). Revoca el acceso en https://myaccount.google.com/permissions y vuelve a intentar.');
            }
            await repository.saveOAuthCredentials({
                scope: tokens.scope,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                accessTokenExpiresAt: new Date(Date.now() + (tokens.expiresInSeconds || 3500) * 1000),
                authorizedBy: req.user?.email
            });
            await logAdminAction({
                user_id: req.user?.id, action: 'authorize', entity: 'google_reviews_oauth', entity_id: null,
                diff: null, ip: req.ip, user_agent: req.get('user-agent')
            });
            res.redirect('/admin#comments?google=connected');
        } catch (err) {
            res.status(502).send(`No se pudo completar la autorización con Google: ${escapeHtmlLite(err.message)}`);
        }
    });

    return { publicRouter, adminRouter, repository, syncService };
}

function escapeHtmlLite(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

module.exports = { createGoogleReviewsModule };
