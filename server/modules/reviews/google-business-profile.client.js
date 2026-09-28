'use strict';

const https = require('https');
const crypto = require('crypto');

/**
 * Cliente mínimo (sin dependencias nuevas) para:
 *  - OAuth 2.0 con scope business.manage (cuenta propietaria del Business Profile)
 *  - Google Business Profile API v4: accounts.locations.reviews.list
 *
 * Requiere aprobación de acceso de Google a la Business Profile API (externo,
 * ver GOOGLE_EXTERNAL_REQUIRED en el módulo de sincronización). El código
 * queda listo para conectar en cuanto existan credenciales/aprobación.
 */

const OAUTH_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GBP_API_BASE = 'https://mybusiness.googleapis.com/v4';
const BUSINESS_MANAGE_SCOPE = 'https://www.googleapis.com/auth/business.manage';

function httpsJson(url, { method = 'GET', headers = {}, form, json } = {}) {
    return new Promise((resolve, reject) => {
        const body = form
            ? new URLSearchParams(form).toString()
            : (json ? JSON.stringify(json) : null);
        const requestHeaders = { ...headers };
        if (form) requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        if (json) requestHeaders['Content-Type'] = 'application/json';

        const request = https.request(url, { method, headers: requestHeaders }, (response) => {
            let payload = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => { payload += chunk; });
            response.on('end', () => {
                let data;
                try {
                    data = payload ? JSON.parse(payload) : {};
                } catch (error) {
                    reject(new Error(`Respuesta inválida de Google (${response.statusCode}).`));
                    return;
                }
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    const message = data?.error_description || data?.error?.message || `Google respondió HTTP ${response.statusCode}`;
                    const error = new Error(message);
                    error.statusCode = response.statusCode;
                    error.googleError = data?.error;
                    reject(error);
                    return;
                }
                resolve(data);
            });
        });
        request.setTimeout(10000, () => request.destroy(new Error('La solicitud a Google excedió el tiempo permitido.')));
        request.on('error', reject);
        if (body) request.write(body);
        request.end();
    });
}

class GoogleBusinessProfileClient {
    constructor({ clientId, clientSecret, redirectUri }) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }

    get isConfigured() {
        return Boolean(this.clientId && this.clientSecret && this.redirectUri);
    }

    buildAuthUrl(state) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true',
            scope: BUSINESS_MANAGE_SCOPE,
            state
        });
        return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
    }

    static generateState() {
        return crypto.randomBytes(24).toString('hex');
    }

    async exchangeCodeForTokens(code) {
        const data = await httpsJson(OAUTH_TOKEN_URL, {
            method: 'POST',
            form: {
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectUri,
                grant_type: 'authorization_code'
            }
        });
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresInSeconds: data.expires_in,
            scope: data.scope
        };
    }

    async refreshAccessToken(refreshToken) {
        const data = await httpsJson(OAUTH_TOKEN_URL, {
            method: 'POST',
            form: {
                refresh_token: refreshToken,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'refresh_token'
            }
        });
        return {
            accessToken: data.access_token,
            expiresInSeconds: data.expires_in
        };
    }

    /**
     * GET accounts/{accountId}/locations/{locationId}/reviews
     * Devuelve { reviews, averageRating, totalReviewCount, nextPageToken }.
     */
    async listReviews({ accessToken, accountId, locationId, pageToken }) {
        const url = new URL(`${GBP_API_BASE}/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews`);
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        return httpsJson(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
    }

    /** Lista todas las páginas de reseñas de una ubicación en una sola llamada lógica. */
    async listAllReviews({ accessToken, accountId, locationId }) {
        const reviews = [];
        let pageToken;
        let averageRating = null;
        let totalReviewCount = null;
        do {
            const page = await this.listReviews({ accessToken, accountId, locationId, pageToken });
            reviews.push(...(page.reviews || []));
            averageRating = page.averageRating ?? averageRating;
            totalReviewCount = page.totalReviewCount ?? totalReviewCount;
            pageToken = page.nextPageToken || null;
        } while (pageToken);
        return { reviews, averageRating, totalReviewCount };
    }
}

module.exports = { GoogleBusinessProfileClient, BUSINESS_MANAGE_SCOPE };
