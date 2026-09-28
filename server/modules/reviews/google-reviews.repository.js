'use strict';

/**
 * Acceso a datos para reseñas de Google Business Profile.
 * Nunca contiene lógica de red/OAuth: solo lectura/escritura en MariaDB.
 */

const STAR_RATING_MAP = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function starRatingToInt(value) {
    if (typeof value === 'number') return Math.min(5, Math.max(1, Math.round(value)));
    return STAR_RATING_MAP[String(value || '').toUpperCase()] || 0;
}

function toMysqlDatetime(isoString) {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

class GoogleReviewsRepository {
    constructor({ pool }) {
        if (!pool) throw new TypeError('GoogleReviewsRepository requiere pool');
        this.pool = pool;
    }

    /** Solo APPROVED, para el endpoint público. */
    async listApproved({ limit = 50 } = {}) {
        const [rows] = await this.pool.execute(
            `SELECT id, google_review_id, reviewer_display_name, star_rating, comment,
                    google_create_time, google_update_time, review_reply_comment,
                    review_reply_time, review_url, featured
               FROM google_reviews
              WHERE moderation_status = 'APPROVED'
              ORDER BY featured DESC, google_create_time DESC
              LIMIT ?`,
            [Math.max(1, Math.min(200, Number(limit) || 50))]
        );
        return rows;
    }

    /** Todo, para el panel admin (con filtro opcional de estado). */
    async listForAdmin({ status } = {}) {
        const params = [];
        let where = '';
        if (status && ['PENDING', 'APPROVED', 'HIDDEN', 'REMOVED'].includes(status)) {
            where = 'WHERE moderation_status = ?';
            params.push(status);
        }
        const [rows] = await this.pool.execute(
            `SELECT id, google_review_id, location_id, reviewer_display_name, star_rating, comment,
                    google_create_time, google_update_time, review_reply_comment, review_reply_time,
                    review_url, media, moderation_status, featured, approved_by, approved_at,
                    hidden_by, hidden_at, last_synced_at, created_at, updated_at
               FROM google_reviews
               ${where}
              ORDER BY
                CASE moderation_status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 WHEN 'HIDDEN' THEN 2 ELSE 3 END,
                google_create_time DESC`,
            params
        );
        return rows;
    }

    async countPending() {
        const [[row]] = await this.pool.execute(
            `SELECT COUNT(*) AS total FROM google_reviews WHERE moderation_status = 'PENDING'`
        );
        return row.total;
    }

    async findByGoogleId(googleReviewId) {
        const [[row]] = await this.pool.execute(
            `SELECT * FROM google_reviews WHERE google_review_id = ?`,
            [googleReviewId]
        );
        return row || null;
    }

    /**
     * UPSERT de una reseña tal como la devuelve la Business Profile API.
     * Nunca duplica (google_review_id es UNIQUE). Si el texto o el rating
     * cambiaron de forma material en una reseña ya aprobada, la regresa a
     * PENDING en vez de mostrar contenido modificado sin revisar (regla 14).
     * Devuelve { row, isNew, wasResetToPending }.
     */
    async upsertFromApi(apiReview, { locationId }) {
        const googleReviewId = apiReview.reviewId || (apiReview.name || '').split('/').pop();
        if (!googleReviewId) throw new Error('Reseña de Google sin reviewId.');

        const starRating = starRatingToInt(apiReview.starRating);
        const comment = String(apiReview.comment || '').slice(0, 4000);
        const reviewerName = String(apiReview.reviewer?.displayName || 'Cliente de Google').slice(0, 255);
        const createTime = toMysqlDatetime(apiReview.createTime) || toMysqlDatetime(new Date().toISOString());
        const updateTime = toMysqlDatetime(apiReview.updateTime) || createTime;
        const replyComment = apiReview.reviewReply?.comment ? String(apiReview.reviewReply.comment).slice(0, 4000) : null;
        const replyTime = toMysqlDatetime(apiReview.reviewReply?.updateTime);

        const existing = await this.findByGoogleId(googleReviewId);

        if (!existing) {
            const [info] = await this.pool.execute(
                `INSERT INTO google_reviews
                    (google_review_id, location_id, reviewer_display_name, star_rating, comment,
                     google_create_time, google_update_time, review_reply_comment, review_reply_time,
                     moderation_status, last_synced_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW())`,
                [googleReviewId, locationId, reviewerName, starRating, comment, createTime, updateTime, replyComment, replyTime]
            );
            const [[row]] = await this.pool.execute('SELECT * FROM google_reviews WHERE id = ?', [info.insertId]);
            return { row, isNew: true, wasResetToPending: false };
        }

        const materialChange = existing.moderation_status === 'APPROVED' && (
            existing.comment !== comment || Number(existing.star_rating) !== starRating
        );
        const nextStatus = materialChange
            ? 'PENDING'
            : (existing.moderation_status === 'REMOVED' ? 'PENDING' : existing.moderation_status);

        await this.pool.execute(
            `UPDATE google_reviews
                SET reviewer_display_name = ?, star_rating = ?, comment = ?,
                    google_update_time = ?, review_reply_comment = ?, review_reply_time = ?,
                    moderation_status = ?, last_synced_at = NOW()
              WHERE google_review_id = ?`,
            [reviewerName, starRating, comment, updateTime, replyComment, replyTime, nextStatus, googleReviewId]
        );
        const [[row]] = await this.pool.execute('SELECT * FROM google_reviews WHERE google_review_id = ?', [googleReviewId]);
        return { row, isNew: false, wasResetToPending: materialChange || existing.moderation_status === 'REMOVED' };
    }

    /** Regla 15: reseñas que Google ya no devuelve se marcan REMOVED, nunca se dejan indefinidamente. */
    async markMissingAsRemoved(seenGoogleReviewIds, locationId) {
        if (!seenGoogleReviewIds.length) {
            const [result] = await this.pool.execute(
                `UPDATE google_reviews SET moderation_status = 'REMOVED', last_synced_at = NOW()
                  WHERE location_id = ? AND moderation_status <> 'REMOVED'`,
                [locationId]
            );
            return result.affectedRows;
        }
        const placeholders = seenGoogleReviewIds.map(() => '?').join(',');
        const [result] = await this.pool.execute(
            `UPDATE google_reviews SET moderation_status = 'REMOVED', last_synced_at = NOW()
              WHERE location_id = ? AND moderation_status <> 'REMOVED'
                AND google_review_id NOT IN (${placeholders})`,
            [locationId, ...seenGoogleReviewIds]
        );
        return result.affectedRows;
    }

    async setModeration(id, status, actorEmail) {
        if (!['APPROVED', 'HIDDEN', 'PENDING'].includes(status)) {
            throw new Error(`Estado de moderación inválido: ${status}`);
        }
        const fields = ['moderation_status = ?'];
        const params = [status];
        if (status === 'APPROVED') {
            fields.push('approved_by = ?', 'approved_at = NOW()');
            params.push(actorEmail || null);
        }
        if (status === 'HIDDEN') {
            fields.push('hidden_by = ?', 'hidden_at = NOW()');
            params.push(actorEmail || null);
        }
        params.push(id);
        const [result] = await this.pool.execute(
            `UPDATE google_reviews SET ${fields.join(', ')} WHERE id = ?`,
            params
        );
        if (result.affectedRows === 0) return null;
        const [[row]] = await this.pool.execute('SELECT * FROM google_reviews WHERE id = ?', [id]);
        return row;
    }

    async getSyncState() {
        const [[row]] = await this.pool.execute('SELECT * FROM google_reviews_sync_state WHERE id = 1');
        return row;
    }

    async updateSyncState(patch) {
        const allowed = [
            'account_id', 'location_id', 'average_rating', 'total_review_count',
            'google_maps_uri', 'write_review_url', 'last_synced_at', 'last_sync_trigger',
            'last_sync_status', 'last_error', 'last_pubsub_at'
        ];
        const fields = [];
        const params = [];
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(patch, key)) {
                fields.push(`${key} = ?`);
                params.push(patch[key]);
            }
        }
        if (!fields.length) return this.getSyncState();
        await this.pool.execute(
            `UPDATE google_reviews_sync_state SET ${fields.join(', ')} WHERE id = 1`,
            params
        );
        return this.getSyncState();
    }

    async getOAuthCredentials() {
        const [[row]] = await this.pool.execute('SELECT * FROM google_oauth_credentials WHERE id = 1');
        return row || null;
    }

    async saveOAuthCredentials({ scope, accessToken, refreshToken, accessTokenExpiresAt, authorizedBy }) {
        await this.pool.execute(
            `INSERT INTO google_oauth_credentials (id, scope, access_token, refresh_token, access_token_expires_at, authorized_by)
             VALUES (1, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                scope = VALUES(scope),
                access_token = VALUES(access_token),
                refresh_token = VALUES(refresh_token),
                access_token_expires_at = VALUES(access_token_expires_at),
                authorized_by = VALUES(authorized_by)`,
            [scope, accessToken, refreshToken, toMysqlDatetime(accessTokenExpiresAt), authorizedBy || null]
        );
    }

    async updateAccessToken({ accessToken, accessTokenExpiresAt }) {
        await this.pool.execute(
            `UPDATE google_oauth_credentials SET access_token = ?, access_token_expires_at = ? WHERE id = 1`,
            [accessToken, toMysqlDatetime(accessTokenExpiresAt)]
        );
    }

    async clearOAuthCredentials() {
        await this.pool.execute('DELETE FROM google_oauth_credentials WHERE id = 1');
    }
}

module.exports = { GoogleReviewsRepository, starRatingToInt };
