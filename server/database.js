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
const { EventEmitter } = require('events');
const crypto = require('crypto');

const dbEmitter = new EventEmitter();

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

async function insertComment({ name, stars, text, user_email }) {
    // Los comentarios entran como pendientes (approved=0)
    const [info] = await pool.execute(
        'INSERT INTO comments (name, stars, text, approved, user_email) VALUES (?, ?, ?, 0, ?)',
        [name, stars, text, user_email || null]
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
    } else if (user.role_id !== role_id || user.avatar_url !== avatar) {
        await pool.execute(
            'UPDATE users SET role_id = ?, avatar_url = ?, last_login_at = NOW() WHERE id = ?',
            [role_id, avatar, user.id]
        );
        user.role_id    = role_id;
        user.avatar_url = avatar;
        user.role       = role_id === 1 ? 'admin' : 'cliente';
    } else {
        await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
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
    const [info] = await pool.execute(
        'INSERT INTO faqs (category, icon, question, answer, display_order) VALUES (?, ?, ?, ?, ?)',
        [category, icon, question, answer, display_order || 0]
    );
    const [[newRow]] = await pool.execute('SELECT * FROM faqs WHERE id = ?', [info.insertId]);
    return newRow;
}

async function updateFaq(id, { category, icon, question, answer, display_order }) {
    const [info] = await pool.execute(
        'UPDATE faqs SET category = ?, icon = ?, question = ?, answer = ?, display_order = ? WHERE id = ?',
        [category, icon, question, answer, display_order, id]
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
    getAllBuildsAdmin,
    insertBuildAdmin
};
