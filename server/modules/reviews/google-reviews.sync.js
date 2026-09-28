'use strict';

const { GoogleBusinessProfileClient } = require('./google-business-profile.client');

const ACCESS_TOKEN_SAFETY_MARGIN_MS = 60 * 1000;
const PUBSUB_DEBOUNCE_MS = 30 * 1000; // coalesce ráfagas de notificaciones en una sola sync (regla 5)

/**
 * Orquesta la sincronización con Google Business Profile:
 *  - refresca el access token cuando hace falta
 *  - trae TODAS las reseñas (paginado) vía accounts.locations.reviews.list
 *  - hace upsert (nunca duplica), aplica la política de "cambio material -> PENDING"
 *  - marca como REMOVED lo que Google ya no devuelve
 *  - deja el estado de sincronización listo para el panel admin (regla 47)
 *
 * Si faltan credenciales/aprobación de Google, NO lanza: devuelve
 * { ok:false, reason:'EXTERNAL_REQUIRED' } para que el resto de la app
 * (rutas, cron) siga funcionando sin bloquear el desarrollo local (regla 29).
 */
class GoogleReviewsSyncService {
    constructor({ repository, dbEmitter }) {
        this.repository = repository;
        this.dbEmitter = dbEmitter;
        this.client = new GoogleBusinessProfileClient({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectUri: this._resolveRedirectUri()
        });
        this.accountId = process.env.GOOGLE_REVIEWS_ACCOUNT_ID || null;
        this.locationId = process.env.GOOGLE_REVIEWS_LOCATION_ID || null;
        this._pubsubDebounceTimer = null;
        this._syncInFlight = null;
    }

    _resolveRedirectUri() {
        const explicit = String(process.env.GOOGLE_REVIEWS_OAUTH_CALLBACK_URL || '').trim();
        if (explicit) return explicit;
        const base = String(process.env.PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
        return base ? `${base}/api/admin/google-reviews/oauth/callback` : '';
    }

    /** Estado legible para el admin: qué falta configurar exactamente. */
    async getConnectionStatus() {
        const missingEnv = [];
        if (!this.client.clientId) missingEnv.push('GOOGLE_CLIENT_ID');
        if (!this.client.clientSecret) missingEnv.push('GOOGLE_CLIENT_SECRET');
        if (!this.client.redirectUri) missingEnv.push('GOOGLE_REVIEWS_OAUTH_CALLBACK_URL o PUBLIC_SITE_URL');
        if (!this.accountId) missingEnv.push('GOOGLE_REVIEWS_ACCOUNT_ID');
        if (!this.locationId) missingEnv.push('GOOGLE_REVIEWS_LOCATION_ID');

        const credentials = await this.repository.getOAuthCredentials();
        const syncState = await this.repository.getSyncState();

        let status = 'NOT_CONFIGURED';
        if (missingEnv.length === 0 && credentials) status = 'CONNECTED';
        else if (missingEnv.length <= 2 /* solo faltan account/location, ya hay client+oauth */ && credentials) status = 'NEEDS_LOCATION';
        else if (this.client.isConfigured && !credentials) status = 'NEEDS_AUTHORIZATION';

        return {
            status, // NOT_CONFIGURED | NEEDS_AUTHORIZATION | NEEDS_LOCATION | CONNECTED
            missingEnv,
            authorizedBy: credentials?.authorized_by || null,
            authorizedAt: credentials?.authorized_at || null,
            lastSyncedAt: syncState?.last_synced_at || null,
            lastSyncStatus: syncState?.last_sync_status || 'NEVER',
            lastError: syncState?.last_error || null,
            averageRating: syncState?.average_rating || null,
            totalReviewCount: syncState?.total_review_count || null
        };
    }

    async _getValidAccessToken() {
        const credentials = await this.repository.getOAuthCredentials();
        if (!credentials) return null;

        const expiresAt = new Date(credentials.access_token_expires_at).getTime();
        if (Number.isFinite(expiresAt) && expiresAt - ACCESS_TOKEN_SAFETY_MARGIN_MS > Date.now()) {
            return credentials.access_token;
        }

        const refreshed = await this.client.refreshAccessToken(credentials.refresh_token);
        const expiresAtNew = new Date(Date.now() + (refreshed.expiresInSeconds || 3500) * 1000);
        await this.repository.updateAccessToken({ accessToken: refreshed.accessToken, accessTokenExpiresAt: expiresAtNew });
        return refreshed.accessToken;
    }

    /**
     * Ejecuta una sincronización completa. `trigger`: 'MANUAL' | 'CRON' | 'PUBSUB'.
     * Deduplica ejecuciones concurrentes (una sync a la vez).
     */
    async runSync({ trigger = 'MANUAL' } = {}) {
        if (this._syncInFlight) return this._syncInFlight;
        this._syncInFlight = this._runSyncInternal({ trigger }).finally(() => {
            this._syncInFlight = null;
        });
        return this._syncInFlight;
    }

    async _runSyncInternal({ trigger }) {
        if (!this.client.isConfigured || !this.accountId || !this.locationId) {
            return { ok: false, reason: 'EXTERNAL_REQUIRED', detail: 'Faltan credenciales OAuth o accountId/locationId de Google.' };
        }

        let accessToken;
        try {
            accessToken = await this._getValidAccessToken();
        } catch (error) {
            await this.repository.updateSyncState({
                last_sync_status: 'ERROR',
                last_error: `OAuth: ${error.message}`,
                last_sync_trigger: trigger
            });
            return { ok: false, reason: 'OAUTH_ERROR', detail: error.message };
        }

        if (!accessToken) {
            return { ok: false, reason: 'EXTERNAL_REQUIRED', detail: 'Google Business Profile no está autorizado todavía.' };
        }

        try {
            const { reviews, averageRating, totalReviewCount } = await this.client.listAllReviews({
                accessToken, accountId: this.accountId, locationId: this.locationId
            });

            const seenIds = [];
            const newlyPending = [];
            for (const apiReview of reviews) {
                const { row, isNew, wasResetToPending } = await this.repository.upsertFromApi(apiReview, { locationId: this.locationId });
                seenIds.push(row.google_review_id);
                if (isNew || wasResetToPending) newlyPending.push(row);
            }
            const removedCount = await this.repository.markMissingAsRemoved(seenIds, this.locationId);

            await this.repository.updateSyncState({
                account_id: this.accountId,
                location_id: this.locationId,
                average_rating: averageRating ?? null,
                total_review_count: totalReviewCount ?? null,
                last_synced_at: new Date(),
                last_sync_trigger: trigger,
                last_sync_status: 'OK',
                last_error: null,
                ...(trigger === 'PUBSUB' ? { last_pubsub_at: new Date() } : {})
            });

            // Notifica al admin igual que un comentario local nuevo (misma
            // infraestructura SSE, sin crear otro canal — regla 33).
            for (const review of newlyPending) {
                this.dbEmitter?.emit('admin-pending', {
                    type: 'google_review',
                    id: `google-${review.id}`,
                    review_id: review.id,
                    name: review.reviewer_display_name,
                    stars: review.star_rating,
                    text: review.comment,
                    created_at: review.google_create_time
                });
            }

            return { ok: true, total: reviews.length, newlyPending: newlyPending.length, removed: removedCount };
        } catch (error) {
            await this.repository.updateSyncState({
                last_sync_status: 'ERROR',
                last_error: error.message,
                last_sync_trigger: trigger
            });
            return { ok: false, reason: 'API_ERROR', detail: error.message };
        }
    }

    /** Punto de entrada para el webhook de Pub/Sub: debounce por ráfagas (regla 5). */
    scheduleDebouncedSync() {
        if (this._pubsubDebounceTimer) clearTimeout(this._pubsubDebounceTimer);
        this._pubsubDebounceTimer = setTimeout(() => {
            this._pubsubDebounceTimer = null;
            this.runSync({ trigger: 'PUBSUB' }).catch((error) => {
                console.error('[google-reviews] Sync disparada por Pub/Sub falló:', error.message);
            });
        }, PUBSUB_DEBOUNCE_MS);
        this._pubsubDebounceTimer.unref?.();
    }
}

module.exports = { GoogleReviewsSyncService };
