'use strict';

class CommerceNotificationService {
    constructor({ pool }) { this.pool = pool; }

    async create(connection, { recipientUserId = null, adminBroadcast = false, type, title, payload = null }) {
        const [result] = await connection.execute(
            `INSERT INTO commerce_notifications (recipient_user_id, admin_broadcast, notification_type, title, payload)
             VALUES (?, ?, ?, ?, ?)`,
            [recipientUserId, adminBroadcast ? 1 : 0, String(type).slice(0, 64), String(title).slice(0, 180), payload ? JSON.stringify(payload) : null]
        );
        return result.insertId;
    }

    async listAdmin({ page = 1, pageSize = 30, unreadOnly = false } = {}) {
        const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
        const safeSize = Math.min(100, Math.max(1, Number.parseInt(pageSize, 10) || 30));
        const unread = unreadOnly === true || unreadOnly === '1' || unreadOnly === 'true';
        const where = `admin_broadcast = 1${unread ? ' AND read_at IS NULL' : ''}`;
        const [[count]] = await this.pool.execute(`SELECT COUNT(*) total, SUM(read_at IS NULL) unread FROM commerce_notifications WHERE ${where}`);
        const [rows] = await this.pool.execute(
            `SELECT id, notification_type, title, payload, read_at, created_at
             FROM commerce_notifications WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [safeSize, (safePage - 1) * safeSize]
        );
        return { rows, total: Number(count.total || 0), unread: Number(count.unread || 0), page: safePage, pageSize: safeSize };
    }

    async markRead(connection, id) {
        const [result] = await connection.execute(
            'UPDATE commerce_notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP()) WHERE id = ? AND admin_broadcast = 1',
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = { CommerceNotificationService };

