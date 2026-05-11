/**
 * ============================================================
 *  server/database.js  — MariaDB via mysql2/promise (pool)
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
const mysql = require('mysql2/promise');
const DOMPurify = require('isomorphic-dompurify');
const { EventEmitter } = require('events');
const crypto = require('crypto');

const dbEmitter = new EventEmitter();

// SECURITY-2 (C1) — Allow-list para HTML de respuestas de FAQ.
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

/* ─────────────────────────────────────────────────────────────
   INICIALIZACIÓN
───────────────────────────────────────────────────────────── */

async function initDB() {
    pool = mysql.createPool({
        host:               process.env.DB_HOST     || '127.0.0.1',
        port:               +(process.env.DB_PORT   || 3306),
        user:               process.env.DB_USER     || 'pixon_app',
        password:           process.env.DB_PASSWORD || '',
        database:           process.env.DB_NAME     || 'pixon',
        waitForConnections: true,
        connectionLimit:    10,
        queueLimit:         0,
        charset:            'utf8mb4',
        timezone:           'Z',
        dateStrings:        true,        // fechas como strings ISO (consistente con SQLite)
        namedPlaceholders:  false
    });

    // Probar conexión real
    const [rows] = await pool.query('SELECT 1 AS ok');
    if (!rows[0] || rows[0].ok !== 1) {
        throw new Error('MariaDB no respondió a SELECT 1');
    }

    console.log(`🗄️  MariaDB conectada → ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    // Migración: comments.stars TINYINT -> DECIMAL(2,1) (soporta medias estrellas)
    try {
        const [cols] = await pool.query(
            "SELECT DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'stars'"
        );
        if (cols[0] && cols[0].DATA_TYPE === 'tinyint') {
            console.log('🔧 Migrando comments.stars TINYINT → DECIMAL(2,1) para soportar medias estrellas...');
            await pool.query(
                'ALTER TABLE comments MODIFY COLUMN stars DECIMAL(2,1) UNSIGNED NOT NULL'
            );
            console.log('✅ Columna comments.stars migrada a DECIMAL(2,1)');
        }
    } catch (err) {
        console.warn('⚠️  No se pudo verificar/migrar comments.stars:', err.message);
    }

    return pool;
}

/** Devuelve el pool. Útil para integraciones externas (session store). */
function getDB() {
    if (!pool) throw new Error('Pool no inicializado. Llama a initDB() primero.');
    return pool;
}

/** Convierte avatar_url → avatar para mantener compat con el código antiguo. */
function mapUserCompat(row) {
    if (!row) return null;
    return { ...row, avatar: row.avatar_url ?? null };
}

/* ─────────────────────────────────────────────────────────────
   COMENTARIOS
───────────────────────────────────────────────────────────── */

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
    // M4 — guardar user_id ademas de email (FK SET NULL si el usuario se borra)
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

/* ─────────────────────────────────────────────────────────────
   ADMIN_LOGS — auditoria de acciones admin (SECURITY-3 M6)
───────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────
   USUARIOS (OAuth + perfil)
───────────────────────────────────────────────────────────── */

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
        // M5 — usuario existente: NO sobrescribir role_id en cada login.
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

/* ─────────────────────────────────────────────────────────────
   FAQs
───────────────────────────────────────────────────────────── */

async function getAllFaqs() {
    const [rows] = await pool.execute(
        'SELECT * FROM faqs ORDER BY display_order ASC, id ASC'
    );
    return rows;
}

async function insertFaq({ category, icon, question, answer, display_order }) {
    // C1 — sanitiza answer y icon antes de guardar
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
    // C1 — sanitiza tambien al actualizar
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

/* ─────────────────────────────────────────────────────────────
   PAGE VIEWS — Analytics
───────────────────────────────────────────────────────────── */

async function trackPageView({ path, title, referrer, user_agent, ip, session_id, user_id }) {
    const ipBin = ip ? Buffer.from(ip.split('.').map(n => parseInt(n, 10))) : null;
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
        `SELECT date, SUM(views) as views, SUM(unique_visitors) as unique_visitors
         FROM page_views_daily
         WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY date
         ORDER BY date DESC`,
        [days]
    );
    return rows;
}

async function getPageViewsTop(limit = 20, days = 30) {
    const [rows] = await pool.execute(
        `SELECT path, SUM(views) as views, SUM(unique_visitors) as unique_visitors
         FROM page_views_daily
         WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
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
    const [lastViews] = await pool.execute(
        `SELECT path, title, created_at
         FROM page_views
         ORDER BY created_at DESC
         LIMIT ?`,
        [recentLimit]
    );
    return {
        active: active[0]?.active ?? 0,
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

/* ─────────────────────────────────────────────────────────────
   TALLER Y TICKETS (Repairs)
───────────────────────────────────────────────────────────── */
async function getAllRepairsAdmin() {
    const [rows] = await pool.execute(`
        SELECT r.*, u.name as user_name, u.email as user_email
        FROM repairs r
        LEFT JOIN users u ON u.id = r.user_id
        ORDER BY r.created_at DESC
    `);
    return rows;
}

async function insertRepairAdmin({ user_id, user_name, device_type, device_brand, device_model, reported_issue, contact_phone }) {
    const ticket_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [info] = await pool.execute(
        `INSERT INTO repairs (ticket_code, user_id, device_type, device_brand, device_model, reported_issue, contact_phone, notes_internal, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'received')`,
        [ticket_code, user_id || null, device_type, device_brand || '', device_model || '', reported_issue, contact_phone, 'Cliente: ' + (user_name || 'Sin nombre')]
    );
    const [[newRow]] = await pool.execute('SELECT * FROM repairs WHERE id = ?', [info.insertId]);
    return newRow;
}

/* ─────────────────────────────────────────────────────────────
   ENSAMBLES Y PRODUCTOS (Builds)
───────────────────────────────────────────────────────────── */
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

// M3 — version publica: nunca expone cost, compare_price, stock_alert, sku.
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
    insertRepairAdmin,
    getAllBuildsAdmin,
    getAllBuildsPublic,
    insertBuildAdmin,
    logAdminAction,
    /* ─────────────────────────────────────────────────────────
       PAGE VIEWS — Analytics
    ───────────────────────────────────────────────────────── */
    trackPageView,
    getPageViewsDaily,
    getPageViewsTop,
    getPageViewsSummary,
    getLiveAnalytics
};
