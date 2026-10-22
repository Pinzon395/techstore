'use strict';

/**
 * Reseñas en vivo desde Google Maps vía Places API (New).
 *
 * - Fuente pública: rating, total de reseñas y hasta 5 reseñas "más relevantes" que Google elige.
 * - Requiere GOOGLE_PLACES_API_KEY (Google Cloud → APIs → "Places API (New)").
 *   GOOGLE_PLACE_ID es opcional: si falta, se resuelve una vez con searchText y se recuerda en memoria.
 * - El contenido de Google no se guarda en la base de datos (términos de Google Maps Platform);
 *   solo se mantiene en memoria unos minutos para no pagar una consulta por cada visita.
 */

const PLACES_BASE = 'https://places.googleapis.com/v1';
const PLACE_QUERY = 'Pixon PC, Cto. Hacienda Chimay, 77539 Cancún, Q.R., México';
const DETAILS_FIELDS = 'id,displayName,rating,userRatingCount,reviews,googleMapsUri,googleMapsLinks';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 h ≈ 720 consultas/mes: dentro del tope gratuito del SKU con reseñas
const ERROR_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

class GooglePlacesClient {
    constructor({
        apiKey = process.env.GOOGLE_PLACES_API_KEY,
        placeId = process.env.GOOGLE_PLACE_ID,
        ttlMs = Number(process.env.GOOGLE_PLACES_CACHE_MINUTES) * 60 * 1000 || DEFAULT_TTL_MS,
        fetchImpl = globalThis.fetch,
        now = () => Date.now(),
        logger = console
    } = {}) {
        this.apiKey = String(apiKey || '').trim();
        this.placeId = String(placeId || '').trim();
        this.ttlMs = ttlMs;
        this.fetch = fetchImpl;
        this.now = now;
        this.logger = logger;
        this.cache = null; // { data, expires }
        this.inflight = null;
    }

    get isConfigured() {
        return Boolean(this.apiKey);
    }

    async _request(url, { method = 'GET', fieldMask, body } = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await this.fetch(url, {
                method,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': this.apiKey,
                    'X-Goog-FieldMask': fieldMask
                },
                body: body ? JSON.stringify(body) : undefined
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.error?.message || `Google Places respondió HTTP ${response.status}`);
            }
            return data;
        } finally {
            clearTimeout(timer);
        }
    }

    async _resolvePlaceId() {
        if (this.placeId) return this.placeId;
        const search = await this._request(`${PLACES_BASE}/places:searchText`, {
            method: 'POST',
            fieldMask: 'places.id,places.displayName,places.formattedAddress',
            body: { textQuery: PLACE_QUERY, languageCode: 'es', regionCode: 'MX' }
        });
        const id = search.places?.[0]?.id;
        if (!id) throw new Error('No se encontró la ficha de Pixon PC en Google Maps; define GOOGLE_PLACE_ID.');
        this.placeId = id;
        this.logger.info?.(`[google-places] GOOGLE_PLACE_ID resuelto: ${id} (fíjalo en las variables de entorno)`);
        return id;
    }

    static toPublicReview(review, index) {
        return {
            id: review.name || `google-live-${index}`,
            name: review.authorAttribution?.displayName || 'Cliente de Google',
            rating: Number(review.rating) || 0,
            text: review.text?.text || review.originalText?.text || '',
            relative_time: review.relativePublishTimeDescription || '',
            published_at: review.publishTime || '',
            profile_photo_url: review.authorAttribution?.photoUri || '',
            author_uri: review.authorAttribution?.uri || '',
            google_maps_uri: review.googleMapsUri || ''
        };
    }

    async _fetchPlace() {
        const placeId = await this._resolvePlaceId();
        const place = await this._request(
            `${PLACES_BASE}/places/${encodeURIComponent(placeId)}?languageCode=es&regionCode=MX`,
            { fieldMask: DETAILS_FIELDS }
        );
        return {
            place_id: place.id || placeId,
            place_name: place.displayName?.text || 'Pixon PC',
            rating: Number(place.rating) || 0,
            total: Number(place.userRatingCount) || 0,
            google_maps_uri: place.googleMapsUri || '',
            reviews_url: place.googleMapsLinks?.reviewsUri || place.googleMapsUri || '',
            write_review_url: place.googleMapsLinks?.writeAReviewUri || place.googleMapsUri || '',
            reviews: (place.reviews || []).map(GooglePlacesClient.toPublicReview).filter((r) => r.text),
            fetched_at: new Date(this.now()).toISOString()
        };
    }

    /**
     * Devuelve { ok: true, data } o { ok: false, reason }. Nunca lanza: el endpoint público
     * debe seguir respondiendo aunque Google falle o la clave no exista.
     */
    async getPlace() {
        if (!this.isConfigured) return { ok: false, reason: 'UNCONFIGURED' };
        if (this.cache && this.now() < this.cache.expires) return this.cache.result;
        if (!this.inflight) {
            this.inflight = this._fetchPlace()
                .then((data) => {
                    const result = { ok: true, data };
                    this.cache = { result, expires: this.now() + this.ttlMs };
                    return result;
                })
                .catch((error) => {
                    this.logger.error?.(`[google-places] ${error.message}`);
                    // Si hay datos anteriores válidos, se siguen mostrando mientras Google se recupera.
                    const previous = this.cache?.result?.ok ? this.cache.result : null;
                    const result = previous || { ok: false, reason: 'ERROR', detail: error.message };
                    this.cache = { result, expires: this.now() + ERROR_TTL_MS };
                    return result;
                })
                .finally(() => { this.inflight = null; });
        }
        return this.inflight;
    }
}

module.exports = { GooglePlacesClient };
