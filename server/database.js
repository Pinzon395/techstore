/**
 * ============================================================
 *  server/database.js  â¬ MariaDB via mysql2/promise (pool)
 * ============================================================
 *
 *  Reemplaza la versión anterior basada en better-sqlite3.
 *  API pública (nombres de funciones) es la misma, pero todas
 *  las funciones ahora son ASYNC. Los handlers en server.js
 *  deben usar await.
 *
 *  Variables de entorno requeridas:
 *    DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 * ============================================================
 */

'use strict';

require('dotenv').config();
const DOMPurify = require('isomorphic-dompurify');
const { EventEmitter } = require('events');
const crypto = require('crypto');
const { createPoolFromEnv } = require('./db/connection');
const { runtimeMigrationsEnabled, warnRuntimeMigrationsDisabled } = require('./db/migrations');

const dbEmitter = new EventEmitter();

// SECURITY-2 (C1) â¬ Allow-list para HTML de respuestas de FAQ.
// Solo etiquetas de formato basico. Sin script, iframe, on*, etc.
const FAQ_HTML_CONFIG = {
    ALLOWED_TAGS: ['br', 'b', 'i', 'strong', 'em', 'a', 'code', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'rel', 'target'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i
};
function sanitizeFaqAnswer(html) {
    return DOMPurify.sanitize(String(html || ''), FAQ_HTML_CONFIG);
}
// Icon de FAQ es solo clases Font Awesome: deja a-z 0-9 espacio guion.
function sanitizeFaqIcon(icon) {
    return String(icon || 'fa-solid fa-circle-question').replace(/[^a-z0-9\- ]/gi, '').slice(0, 64);
}

let pool = null;

/* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
   INICIALIZACIÓN
â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */

async function initDB() {
    pool = createPoolFromEnv();

    // Probar conexión real
    const [rows] = await pool.query('SELECT 1 AS ok');
    if (!rows[0] || rows[0].ok !== 1) {
        throw new Error('MariaDB no respondió a SELECT 1');
    }

    console.log(`ðxï¸  MariaDB conectada â  ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    if (runtimeMigrationsEnabled()) {
        await runRuntimeMigrations();
    } else {
        warnRuntimeMigrationsDisabled();
    }

    return pool;
}

async function runRuntimeMigrations() {
    // Migracion: comments.stars TINYINT -> DECIMAL(2,1) (soporta medias estrellas)
    try {
        const [cols] = await pool.query(
            "SELECT DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'stars'"
        );
        if (cols[0] && cols[0].DATA_TYPE === 'tinyint') {
            console.log('Migrando comments.stars TINYINT -> DECIMAL(2,1) para soportar medias estrellas...');
            await pool.query(
                'ALTER TABLE comments MODIFY COLUMN stars DECIMAL(2,1) UNSIGNED NOT NULL'
            );
            console.log('Columna comments.stars migrada a DECIMAL(2,1)');
        }
    } catch (err) {
        console.warn('No se pudo verificar/migrar comments.stars:', err.message);
    }

    try {
        const [cols] = await pool.query(
            "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repairs' AND COLUMN_NAME = 'status'"
        );
        if (cols[0] && (!String(cols[0].COLUMN_TYPE || '').includes("'contacted'") || !String(cols[0].COLUMN_TYPE || '').includes("'eliminado'"))) {
            console.log('Migrando repairs.status para estados extendidos del taller...');
            await pool.query(
                "ALTER TABLE repairs MODIFY COLUMN status ENUM('new','received','diagnosing','contacted','quoted','approved','in_progress','waiting_parts','ready','delivered','cancelled','eliminado') NOT NULL DEFAULT 'received'"
            );
            console.log('Columna repairs.status actualizada');
        }
    } catch (err) {
        console.warn('No se pudo verificar/migrar repairs.status:', err.message);
    }

    await ensureAppointmentSchema();
    await ensureAnalyticsSchema();
}

async function ensureAppointmentSchema() {
    const repairColumns = [
        ['appointment_type', "VARCHAR(60) NULL"],
        ['appointment_date', "DATE NULL"],
        ['appointment_time', "TIME NULL"],
        ['appointment_datetime', "DATETIME NULL"],
        ['appointment_delivery_method', "VARCHAR(80) NULL"],
        ['appointment_note', "TEXT NULL"],
        ['appointment_status', "ENUM('pendiente_confirmacion','confirmada','reagendada','cancelada','completada') NOT NULL DEFAULT 'pendiente_confirmacion'"],
        ['deleted_at', "TIMESTAMP NULL"],
        ['deleted_by', "CHAR(36) NULL"]
    ];

    for (const [column, definition] of repairColumns) {
        try {
            const [cols] = await pool.query(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repairs' AND COLUMN_NAME = ?",
                [column]
            );
            if (!cols.length) await pool.query(`ALTER TABLE repairs ADD COLUMN ${column} ${definition}`);
        } catch (err) {
            console.warn(`No se pudo verificar/migrar repairs.${column}:`, err.message);
        }
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS appointment_settings (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            weekday TINYINT UNSIGNED NOT NULL UNIQUE,
            is_open TINYINT(1) NOT NULL DEFAULT 1,
            start_time TIME NULL,
            end_time TIME NULL,
            slot_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30,
            allowed_types VARCHAR(160) NOT NULL DEFAULT 'recepcion,diagnostico,entrega,otro',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS appointment_exceptions (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL UNIQUE,
            status ENUM('closed','normal','only_pickup','only_dropoff','only_diagnostic','custom_hours') NOT NULL DEFAULT 'normal',
            start_time TIME NULL,
            end_time TIME NULL,
            slot_minutes SMALLINT UNSIGNED NULL,
            allowed_types VARCHAR(160) NULL,
            reason VARCHAR(255) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
    `);

    const defaults = [
        [0, 0, null, null, 30, ''],
        [1, 1, '10:00:00', '19:00:00', 30, 'recepcion,diagnostico,entrega,otro'],
        [2, 1, '10:00:00', '19:00:00', 30, 'recepcion,diagnostico,entrega,otro'],
        [3, 1, '10:00:00', '19:00:00', 30, 'recepcion,diagnostico,entrega,otro'],
        [4, 1, '10:00:00', '19:00:00', 30, 'recepcion,diagnostico,entrega,otro'],
        [5, 1, '10:00:00', '19:00:00', 30, 'recepcion,diagnostico,entrega,otro'],
        [6, 1, '10:00:00', '15:00:00', 30, 'recepcion,diagnostico,entrega,otro']
    ];
    for (const row of defaults) {
        await pool.execute(
            `INSERT INTO appointment_settings (weekday, is_open, start_time, end_time, slot_minutes, allowed_types)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE weekday = weekday`,
            row
        );
    }
}

async function ensureAnalyticsSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS page_views (
            id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            path        VARCHAR(255) NOT NULL,
            title       VARCHAR(255) DEFAULT NULL,
            referrer    VARCHAR(512) DEFAULT NULL,
            user_agent  VARCHAR(512) DEFAULT NULL,
            ip          VARBINARY(16) DEFAULT NULL,
            session_id  VARCHAR(128) DEFAULT NULL,
            user_id     CHAR(36) DEFAULT NULL,
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_page_views_date (created_at),
            KEY idx_page_views_path (path(64), created_at),
            KEY idx_page_views_session (session_id(64))
        ) ENGINE=InnoDB
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS page_views_daily (
            id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            date        DATE NOT NULL,
            path        VARCHAR(255) NOT NULL,
            views       INT UNSIGNED NOT NULL DEFAULT 0,
            unique_visitors INT UNSIGNED NOT NULL DEFAULT 0,
            UNIQUE KEY idx_daily_path (date, path(64)),
            KEY idx_daily_date (date, views DESC)
        ) ENGINE=InnoDB
    `);
}


/** Devuelve el pool. Útil para integraciones externas (session store). */
function getDB() {
    if (!pool) throw new Error('Pool no inicializado. Llama a initDB() primero.');
    return pool;
}

/** Convierte avatar_url â  avatar para mantener compat con el código antiguo. */
function mapUserCompat(row) {
    if (!row) return null;
    return { ...row, avatar: row.avatar_url ?? null };
}

/* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
   COMENTARIOS
â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */

async function getAllComments() {
    const [rows] = await pool.execute(`
        SELECT id, name, stars, text, created_at
        FROM comments
        WHERE approved = 1
        ORDER BY created_at DESC
    `);
    return rows;
}

async function getAllCommentsAdmin() {
    const [rows] = await pool.execute(`
        SELECT id, name, stars, text, approved, user_email, created_at
        FROM comments
        ORDER BY created_at DESC
    `);
    return rows;
}

async function insertComment({ name, stars, text, user_id, user_email }) {
    // Los comentarios entran como pendientes (approved=0)
    // M4 â¬ guardar user_id ademas de email (FK SET NULL si el usuario se borra)
    const [info] = await pool.execute(
        'INSERT INTO comments (user_id, name, stars, text, approved, user_email) VALUES (?, ?, ?, ?, 0, ?)',
        [user_id || null, name, stars, text, user_email || null]
    );
    const [[newRow]] = await pool.execute(
        'SELECT id, name, stars, text, approved, user_email, created_at FROM comments WHERE id = ?',
        [info.insertId]
    );
    // Notificar SOLO al panel admin (espera aprobación antes de salir al carrusel público)
    dbEmitter.emit('admin-pending', newRow);
    return newRow;
}

async function approveComment(id) {
    const [info] = await pool.execute(
        'UPDATE comments SET approved = 1 WHERE id = ?',
        [id]
    );
    if (info.affectedRows > 0) {
        const [[comment]] = await pool.execute(
            'SELECT id, name, stars, text, created_at FROM comments WHERE id = ?',
            [id]
        );
        dbEmitter.emit('new-comment', comment); // río de comentarios público
    }
    return info.affectedRows > 0;
}

async function deleteComment(id) {
    const [info] = await pool.execute('DELETE FROM comments WHERE id = ?', [id]);
    if (info.affectedRows > 0) {
        dbEmitter.emit('db-sync'); // fuerza recarga del carrusel
    }
    return info.affectedRows > 0;
}

/* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
   ADMIN_LOGS â¬ auditoria de acciones admin (SECURITY-3 M6)
â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */

/**
 * Registra una accion administrativa en admin_logs.
 * Llamarlo desde los handlers admin tras la operacion.
 *   logAdminAction({ user_id, action, entity, entity_id, diff, ip, user_agent })
 */
async function logAdminAction({ user_id, action, entity, entity_id, diff, ip, user_agent }) {
    try {
        await pool.execute(
            `INSERT INTO admin_logs (user_id, action, entity, entity_id, diff, ip, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id || null,
                String(action).slice(0, 64),
                String(entity).slice(0, 64),
                entity_id != null ? String(entity_id).slice(0, 64) : null,
                diff ? JSON.stringify(diff) : null,
                ip ? String(ip).slice(0, 45) : null,
                user_agent ? String(user_agent).slice(0, 255) : null
            ]
        );
    } catch (e) {
        // El logging nunca debe romper la operacion principal
        console.error('admin_log fail:', e.message);
    }
}

/* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
   USUARIOS (OAuth + perfil)
â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */

async function findOrCreateGoogleUser(profile) {
    const email  = profile.emails?.[0]?.value || null;
    const name   = profile.displayName;
    const avatar = profile.photos?.[0]?.value || null;
    // role_id 1 = admin, 4 = cliente (ver tabla `roles`)
    const role_id = (email === process.env.ADMIN_EMAIL) ? 1 : 4;

    let [[user]] = await pool.execute(
        `SELECT u.*, r.code AS role
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.google_id = ?`,
        [profile.id]
    );

    if (!user) {
        // Usuario nuevo: solo aqui se asigna role_id segun ADMIN_EMAIL.
        const newId = crypto.randomUUID();
        await pool.execute(
            `INSERT INTO users (id, google_id, email, name, avatar_url, role_id, last_login_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [newId, profile.id, email, name, avatar, role_id]
        );
        [[user]] = await pool.execute(
            `SELECT u.*, r.code AS role
             FROM users u
             LEFT JOIN roles r ON r.id = u.role_id
             WHERE u.id = ?`,
            [newId]
        );
    } else {
        // M5 â¬ usuario existente: NO sobrescribir role_id en cada login.
        // Si manana promueves manualmente a un usuario en el panel, no se pierde.
        // Solo refrescamos avatar y last_login_at.
        if (user.avatar_url !== avatar) {
            await pool.execute(
                'UPDATE users SET avatar_url = ?, last_login_at = NOW() WHERE id = ?',
                [avatar, user.id]
            );
            user.avatar_url = avatar;
        } else {
            await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
        }
    }

    return mapUserCompat(user);
}

async function getUserById(id) {
    const [[user]] = await pool.execute(
        `SELECT u.*, r.code AS role
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? AND u.deleted_at IS NULL`,
        [id]
    );
    return mapUserCompat(user);
}

async function updateUserProfile(id, { phone }) {
    if (!id) return false;
    const [info] = await pool.execute(
        'UPDATE users SET phone = ? WHERE id = ?',
        [phone, id]
    );
    return info.affectedRows > 0;
}

async function getAllUsersAdmin() {
    const [rows] = await pool.execute(
        `SELECT u.id, u.name, u.email, u.avatar_url AS avatar, r.code AS role,
                u.phone, u.created_at, u.is_active, u.last_login_at
         FROM users u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.deleted_at IS NULL
         ORDER BY u.created_at DESC`
    );
    return rows;
}

/* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
   FAQs
â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */

async function getAllFaqs() {
    const [rows] = await pool.execute(
        'SELECT * FROM faqs ORDER BY display_order ASC, id ASC'
    );
    return rows;
}

async function insertFaq({ category, icon, question, answer, display_order }) {
    // C1 â¬ sanitiza answer y icon antes de guardar
    const cleanAnswer = sanitizeFaqAnswer(answer);
    const cleanIcon   = sanitizeFaqIcon(icon);
    const [info] = await pool.execute(
        'INSERT INTO faqs (category, icon, question, answer, display_order) VALUES (?, ?, ?, ?, ?)',
        [category, cleanIcon, question, cleanAnswer, display_order || 0]
    );
    const [[newRow]] = await pool.execute('SELECT * FROM faqs WHERE id = ?', [info.insertId]);
    return newRow;
}

async function updateFaq(id, { category, icon, question, answer, display_order }) {
    // C1 â¬ sanitiza tambien al actualizar
    const cleanAnswer = sanitizeFaqAnswer(answer);
    const cleanIcon   = sanitizeFaqIcon(icon);
    const [info] = await pool.execute(
        'UPDATE faqs SET category = ?, icon = ?, question = ?, answer = ?, display_order = ? WHERE id = ?',
        [category, cleanIcon, question, cleanAnswer, display_order, id]
    );
    return info.affectedRows > 0;
}

async function deleteFaq(id) {
    const [info] = await pool.execute('DELETE FROM faqs WHERE id = ?', [id]);
    return info.affectedRows > 0;
}

async function logUnansweredFaq(query) {
    await pool.execute(
        `INSERT INTO faq_unanswered (query, count, first_seen, last_seen)
         VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE count = count + 1, last_seen = CURRENT_TIMESTAMP`,
        [query]
    );
}

async function getUnansweredFaqs() {
    const [rows] = await pool.execute(
        'SELECT * FROM faq_unanswered ORDER BY count DESC, last_seen DESC'
    );
    return rows;
}

async function clearUnansweredFaqs() {
    const [info] = await pool.execute('DELETE FROM faq_unanswered');
    return info.affectedRows;
}

/* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
   PAGE VIEWS â¬ Analytics
â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */

async function trackPageView({ path, title, referrer, user_agent, ip, session_id, user_id }) {
    const ipv4 = String(ip || '').match(/(\d{1,3}\.){3}\d{1,3}$/)?.[0];
    const ipBin = ipv4 ? Buffer.from(ipv4.split('.').map(n => parseInt(n, 10))) : null;
    await pool.execute(
        `INSERT INTO page_views (path, title, referrer, user_agent, ip, session_id, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [path, title || null, referrer || null, user_agent || null, ipBin, session_id || null, user_id || null]
    );
    // Upsert daily aggregate
    const today = new Date().toISOString().slice(0, 10);
    await pool.execute(
        `INSERT INTO page_views_daily (date, path, views, unique_visitors)
         VALUES (?, ?, 1, 1)
         ON DUPLICATE KEY UPDATE views = views + 1, unique_visitors = unique_visitors + 1`,
        [today, path]
    );
}

async function getPageViewsDaily(days = 30) {
    const [rows] = await pool.execute(
        `SELECT DATE(created_at) AS date,
                COUNT(*) AS views,
                COUNT(DISTINCT session_id) AS unique_visitors
         FROM page_views
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY DATE(created_at)
         ORDER BY date DESC`,
        [days]
    );
    return rows;
}

async function getPageViewsTop(limit = 20, days = 30) {
    const [rows] = await pool.execute(
        `SELECT path,
                COUNT(*) AS views,
                COUNT(DISTINCT session_id) AS unique_visitors
         FROM page_views
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY path
         ORDER BY views DESC
         LIMIT ?`,
        [days, limit]
    );
    return rows;
}

/**
 * Datos para el dashboard "live" del admin:
 *  - active: sesiones únicas con actividad en los últimos 5 min
 *  - per_minute: vistas agrupadas por minuto en los últimos 30 min (para sparkline)
 *  - last_views: últimas N vistas con path + tiempo relativo
 */
async function getLiveAnalytics(minutesWindow = 30, recentLimit = 12) {
    const [active] = await pool.execute(
        `SELECT COUNT(DISTINCT session_id) AS active
         FROM page_views
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
    );
    const [perMinute] = await pool.execute(
        `SELECT
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:00') AS minute,
            COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS visitors
         FROM page_views
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
         GROUP BY minute
         ORDER BY minute ASC`,
        [minutesWindow]
    );
    const [windowTotals] = await pool.execute(
        `SELECT COUNT(*) AS views,
                COUNT(DISTINCT session_id) AS visitors
         FROM page_views
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [minutesWindow]
    );
    const [lastViews] = await pool.execute(
        `SELECT path, title, created_at
         FROM page_views
         ORDER BY created_at DESC
         LIMIT ?`,
        [recentLimit]
    );
    return {
        active: active[0]?.active ?? 0,
        window_views: windowTotals[0]?.views ?? 0,
        window_visitors: windowTotals[0]?.visitors ?? 0,
        per_minute: perMinute,
        last_views: lastViews,
        window_minutes: minutesWindow,
        ts: Date.now(),
    };
}

async function getPageViewsSummary() {
    const [totalViews] = await pool.execute('SELECT COUNT(*) as total FROM page_views');
    const [todayViews] = await pool.execute(
        `SELECT COUNT(*) as total FROM page_views WHERE DATE(created_at) = CURDATE()`
    );
    const [uniqueToday] = await pool.execute(
        `SELECT COUNT(DISTINCT session_id) as total FROM page_views WHERE DATE(created_at) = CURDATE()`
    );
    const [topReferrer] = await pool.execute(
        `SELECT referrer, COUNT(*) as total FROM page_views
         WHERE referrer IS NOT NULL AND referrer != ''
         GROUP BY referrer ORDER BY total DESC LIMIT 5`
    );
    return {
        totalViews: totalViews[0].total,
        todayViews: todayViews[0].total,
        uniqueToday: uniqueToday[0].total,
        topReferrers: topReferrer
    };
}

/* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
   TALLER Y TICKETS (Repairs)
â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
async function getAllRepairsAdmin() {
    const [rows] = await pool.execute(`
        SELECT r.*, u.name as user_name, u.email as user_email
        FROM repairs r
        LEFT JOIN users u ON u.id = r.user_id
        WHERE r.deleted_at IS NULL
        ORDER BY r.created_at DESC
    `);
    return rows;
}

async function getRepairAdminById(id) {
    const [rows] = await pool.execute(`
        SELECT r.*, u.name as user_name, u.email as user_email
        FROM repairs r
        LEFT JOIN users u ON u.id = r.user_id
        WHERE r.id = ? AND r.deleted_at IS NULL
        LIMIT 1
    `, [id]);
    return rows[0] || null;
}

async function updateRepairAdmin(id, data) {
    const allowedStatus = new Set(['new', 'received', 'diagnosing', 'contacted', 'quoted', 'approved', 'in_progress', 'waiting_parts', 'ready', 'delivered', 'cancelled', 'eliminado']);
    const allowedPriority = new Set(['low', 'normal', 'high', 'urgent']);
    const allowedAppointmentStatus = new Set(['pendiente_confirmacion', 'confirmada', 'reagendada', 'cancelada', 'completada']);
    const fields = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(data, 'status') && allowedStatus.has(String(data.status))) {
        fields.push('status = ?');
        values.push(String(data.status));
    }
    if (Object.prototype.hasOwnProperty.call(data, 'priority') && allowedPriority.has(String(data.priority))) {
        fields.push('priority = ?');
        values.push(String(data.priority));
    }
    if (Object.prototype.hasOwnProperty.call(data, 'diagnostic')) {
        fields.push('diagnostic = ?');
        values.push(data.diagnostic ? String(data.diagnostic).trim() : null);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'notes_internal')) {
        fields.push('notes_internal = ?');
        values.push(data.notes_internal ? String(data.notes_internal).trim() : null);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'estimated_cost')) {
        fields.push('estimated_cost = ?');
        const amount = Number(data.estimated_cost);
        values.push(data.estimated_cost === '' || data.estimated_cost === null || data.estimated_cost === undefined || !Number.isFinite(amount) ? null : amount);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'final_cost')) {
        fields.push('final_cost = ?');
        const amount = Number(data.final_cost);
        values.push(data.final_cost === '' || data.final_cost === null || data.final_cost === undefined || !Number.isFinite(amount) ? null : amount);
    }
    ['appointment_type', 'appointment_date', 'appointment_time', 'appointment_datetime', 'appointment_delivery_method', 'appointment_note'].forEach(field => {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            fields.push(`${field} = ?`);
            values.push(data[field] ? String(data[field]).trim() : null);
        }
    });
    if (Object.prototype.hasOwnProperty.call(data, 'appointment_datetime')) {
        fields.push('appointment_at = ?');
        values.push(data.appointment_datetime ? String(data.appointment_datetime).trim() : null);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'appointment_status') && allowedAppointmentStatus.has(String(data.appointment_status))) {
        fields.push('appointment_status = ?');
        values.push(String(data.appointment_status));
    }

    if (fields.length === 0) return getRepairAdminById(id);

    values.push(id);
    await pool.execute(`UPDATE repairs SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, values);
    return getRepairAdminById(id);
}

async function softDeleteRepairAdmin(id, deleted_by) {
    const [info] = await pool.execute(
        `UPDATE repairs
         SET status = 'eliminado', deleted_at = NOW(), deleted_by = ?, appointment_status = IF(appointment_status = 'completada', appointment_status, 'cancelada')
         WHERE id = ? AND deleted_at IS NULL`,
        [deleted_by || null, id]
    );
    return info.affectedRows > 0;
}

async function insertRepairAdmin(data) {
    const { user_id, user_name, device_type, device_brand, device_model, reported_issue, contact_phone, contact_email, priority, is_b2b, b2b_company, b2b_quantity, b2b_type, b2b_frequency, b2b_invoice, appointment_type, appointment_date, appointment_time, appointment_datetime, appointment_delivery_method, appointment_note, appointment_status } = data;
    const ticket_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const priorityMap = {
        quote: 'low',
        normal: 'normal',
        work_school: 'high',
        urgent: 'urgent',
        low: 'low',
        high: 'high'
    };
    const cleanPriority = priorityMap[String(priority || 'normal')] || 'normal';
    
    let internalNotes = 'Cliente: ' + (user_name || 'Sin nombre');
    if (is_b2b) {
        internalNotes += `\nB2B Info: Empresa: ${b2b_company || ''}, Cantidad: ${b2b_quantity || ''}, Tipo: ${b2b_type || ''}, Frec: ${b2b_frequency || ''}, Factura: ${b2b_invoice || ''}`;
    }

    const [info] = await pool.execute(
        `INSERT INTO repairs (ticket_code, user_id, device_type, device_brand, device_model, reported_issue, contact_phone, contact_email, priority, notes_internal, status, appointment_type, appointment_date, appointment_time, appointment_datetime, appointment_delivery_method, appointment_note, appointment_status, appointment_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            ticket_code, user_id || null, device_type, device_brand || '', device_model || '', reported_issue,
            contact_phone, contact_email || null, cleanPriority, internalNotes,
            appointment_type || null, appointment_date || null, appointment_time || null, appointment_datetime || null,
            appointment_delivery_method || null, appointment_note || null, appointment_status || 'pendiente_confirmacion',
            appointment_datetime || null
        ]
    );
    const [[newRow]] = await pool.execute('SELECT * FROM repairs WHERE id = ?', [info.insertId]);
    return newRow;
}

function normalizeAppointmentType(type) {
    const value = String(type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (value.includes('entrega')) return 'entrega';
    if (value.includes('diagnostico')) return 'diagnostico';
    if (value.includes('recepcion')) return 'recepcion';
    return value || 'recepcion';
}

function allowedTypesForStatus(status, fallback) {
    if (status === 'only_pickup') return 'recepcion,diagnostico';
    if (status === 'only_dropoff') return 'entrega';
    if (status === 'only_diagnostic') return 'diagnostico';
    return fallback || 'recepcion,diagnostico,entrega,otro';
}

function timeToMinutes(value) {
    const [h, m] = String(value || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function minutesToTime(minutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}:${m}`;
}

async function getAppointmentConfig() {
    const [settings] = await pool.execute('SELECT * FROM appointment_settings ORDER BY weekday ASC');
    const [exceptions] = await pool.execute('SELECT * FROM appointment_exceptions ORDER BY date ASC');
    return { settings, exceptions };
}

async function saveAppointmentConfig({ settings = [], exceptions = [] }) {
    for (const row of settings) {
        await pool.execute(
            `INSERT INTO appointment_settings (weekday, is_open, start_time, end_time, slot_minutes, allowed_types)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE is_open = VALUES(is_open), start_time = VALUES(start_time), end_time = VALUES(end_time), slot_minutes = VALUES(slot_minutes), allowed_types = VALUES(allowed_types)`,
            [
                Number(row.weekday),
                row.is_open ? 1 : 0,
                row.start_time || null,
                row.end_time || null,
                Number(row.slot_minutes) || 30,
                row.allowed_types || 'recepcion,diagnostico,entrega,otro'
            ]
        );
    }
    for (const row of exceptions) {
        if (!row.date) continue;
        await pool.execute(
            `INSERT INTO appointment_exceptions (date, status, start_time, end_time, slot_minutes, allowed_types, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status = VALUES(status), start_time = VALUES(start_time), end_time = VALUES(end_time), slot_minutes = VALUES(slot_minutes), allowed_types = VALUES(allowed_types), reason = VALUES(reason)`,
            [row.date, row.status || 'closed', row.start_time || null, row.end_time || null, row.slot_minutes || null, row.allowed_types || null, row.reason || null]
        );
    }
    return getAppointmentConfig();
}

async function getAppointmentAvailability(date, type) {
    const requestedType = normalizeAppointmentType(type);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
        return { available: false, message: 'Selecciona un día disponible.', slots: [] };
    }
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) return { available: false, message: 'No se permiten fechas pasadas.', slots: [] };

    const weekday = new Date(`${date}T12:00:00`).getDay();
    const [[setting]] = await pool.execute('SELECT * FROM appointment_settings WHERE weekday = ?', [weekday]);
    const [[exception]] = await pool.execute('SELECT * FROM appointment_exceptions WHERE date = ?', [date]);
    const status = exception?.status || 'normal';
    if (status === 'closed' || !setting?.is_open) return { available: false, message: 'Este día está bloqueado por el taller.', slots: [] };

    const start = exception?.start_time || setting.start_time;
    const end = exception?.end_time || setting.end_time;
    const slotMinutes = Number(exception?.slot_minutes || setting.slot_minutes || 30);
    const allowed = allowedTypesForStatus(status, exception?.allowed_types || setting.allowed_types)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    if (!allowed.includes(requestedType) && !allowed.includes('otro')) {
        return { available: false, message: 'Este día no está disponible para ese tipo de visita.', slots: [] };
    }
    if (!start || !end || slotMinutes <= 0) return { available: false, message: 'Este día no tiene horario configurado.', slots: [] };

    const [occupiedRows] = await pool.execute(
        `SELECT appointment_time FROM repairs
         WHERE appointment_date = ? AND appointment_time IS NOT NULL
           AND deleted_at IS NULL
           AND COALESCE(appointment_status, 'pendiente_confirmacion') NOT IN ('cancelada')`,
        [date]
    );
    const occupied = new Set(occupiedRows.map(row => String(row.appointment_time).slice(0, 5)));
    const slots = [];
    for (let mins = timeToMinutes(start); mins + slotMinutes <= timeToMinutes(end); mins += slotMinutes) {
        const slot = minutesToTime(mins);
        if (!occupied.has(slot)) slots.push(slot);
    }
    return { available: slots.length > 0, message: slots.length ? '' : 'Este día está lleno.', slots };
}

async function getAdminAppointments({ from, to } = {}) {
    const start = from || new Date().toISOString().slice(0, 10);
    const end = to || start;
    const [rows] = await pool.execute(
        `SELECT r.*, u.name as user_name, u.email as user_email
         FROM repairs r
         LEFT JOIN users u ON u.id = r.user_id
         WHERE r.appointment_date BETWEEN ? AND ?
           AND r.deleted_at IS NULL
         ORDER BY r.appointment_date ASC, r.appointment_time ASC`,
        [start, end]
    );
    return rows;
}

/* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
   ENSAMBLES Y PRODUCTOS (Builds)
â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
async function getAllBuildsAdmin() {
    const [rows] = await pool.execute(`
        SELECT p.*, b.build_category, b.performance_tier,
               (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
        FROM products p
        JOIN builds b ON p.id = b.id
        WHERE p.deleted_at IS NULL
        ORDER BY p.created_at DESC
    `);
    return rows;
}

// M3 â¬ version publica: nunca expone cost, compare_price, stock_alert, sku.
// Solo campos seguros para mostrar en /api/builds y la tienda.
async function getAllBuildsPublic() {
    const [rows] = await pool.execute(`
        SELECT p.id, p.title, p.slug, p.description, p.price, p.is_featured,
               b.build_category, b.performance_tier,
               b.estimated_fps_1080p, b.estimated_fps_1440p, b.warranty_months,
               (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
        FROM products p
        JOIN builds b ON p.id = b.id
        WHERE p.deleted_at IS NULL AND p.is_active = 1
        ORDER BY p.is_featured DESC, p.created_at DESC
    `);
    return rows;
}

async function insertBuildAdmin({ title, description, price, build_category, performance_tier, image_url }) {
    // Generar un slug simple
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // 1. Insertar producto
        const [pInfo] = await connection.execute(
            'INSERT INTO products (type, title, slug, description, price) VALUES (?, ?, ?, ?, ?)',
            ['build', title, slug, description || '', price || 0]
        );
        const productId = pInfo.insertId;
        
        // 2. Insertar build
        await connection.execute(
            'INSERT INTO builds (id, build_category, performance_tier) VALUES (?, ?, ?)',
            [productId, build_category || 'gaming', performance_tier || 'mid']
        );
        
        // 3. Insertar imagen si hay
        if (image_url) {
            await connection.execute(
                'INSERT INTO product_images (product_id, url, is_primary) VALUES (?, ?, 1)',
                [productId, image_url]
            );
        }
        
        await connection.commit();
        
        const [[newRow]] = await connection.execute(`
            SELECT p.*, b.build_category, b.performance_tier 
            FROM products p JOIN builds b ON p.id = b.id WHERE p.id = ?`, 
            [productId]
        );
        return newRow;
    } catch (e) {
        await connection.rollback();
        throw e;
    } finally {
        connection.release();
    }
}


/* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
   USER REPAIRS - Tickets del cliente
â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
async function getUserRepairs(userId) {
    const [rows] = await pool.execute(`
        SELECT r.*, u.name as user_name, u.email as user_email
        FROM repairs r
        LEFT JOIN users u ON u.id = r.user_id
        WHERE r.user_id = ? AND r.deleted_at IS NULL
        ORDER BY r.created_at DESC
    `, [userId]);
    return rows;
}

module.exports = {
    initDB,
    getDB,
    dbEmitter,
    getAllComments,
    getAllCommentsAdmin,
    insertComment,
    deleteComment,
    approveComment,
    findOrCreateGoogleUser,
    getUserById,
    updateUserProfile,
    getAllUsersAdmin,
    getAllFaqs,
    insertFaq,
    updateFaq,
    deleteFaq,
    logUnansweredFaq,
    getUnansweredFaqs,
    clearUnansweredFaqs,
    getAllRepairsAdmin,
    getUserRepairs,
    getRepairAdminById,
    updateRepairAdmin,
    insertRepairAdmin,
    softDeleteRepairAdmin,
    getAppointmentConfig,
    saveAppointmentConfig,
    getAppointmentAvailability,
    getAdminAppointments,
    getAllBuildsAdmin,
    getAllBuildsPublic,
    insertBuildAdmin,
    logAdminAction,
    /* â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬
       PAGE VIEWS â¬ Analytics
    â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬â¬ */
    trackPageView,
    getPageViewsDaily,
    getPageViewsTop,
    getPageViewsSummary,
    getLiveAnalytics
};
