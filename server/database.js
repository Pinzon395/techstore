/**
 * ============================================================
 *  server/database.js  — SQLite via better-sqlite3
 * ============================================================
 *
 *  Migración completada a better-sqlite3.
 *  Evita el error 'disk image malformed' en Windows y mejora
 *  drásticamente la concurrencia usando el modo WAL.
 *
 *  ESQUEMA COMPLETO - FASE 1:
 *  - users, comments, addresses, products, services
 *  - cart_items, orders, order_items, reviews
 * ============================================================
 */

'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const { EventEmitter } = require('events');
const crypto = require('crypto');

const dbEmitter = new EventEmitter();
const DB_PATH = path.join(__dirname, 'pixon.db');

let db = null;

function initDB() {
    // Abrir o crear la base de datos
    db = new Database(DB_PATH);
    
    // Configurar modo WAL (Write-Ahead Logging) para mejor rendimiento/concurrencia y cero bloqueos
    db.pragma('journal_mode = WAL');
    
    console.log('🗄️  Base de datos cargada/creada con better-sqlite3:', DB_PATH);

    // Crear el Schema Completo (Fase 1 y Futuro)
    db.exec(`
        -- 1. Usuarios y Autenticación
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            google_id TEXT UNIQUE,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            avatar TEXT,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Comentarios (Reseñas del inicio - RÍO DE COMENTARIOS)
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
            text TEXT NOT NULL,
            approved INTEGER NOT NULL DEFAULT 1,
            user_email TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );
        CREATE INDEX IF NOT EXISTS idx_comments_date ON comments(created_at DESC);

        -- 3. Direcciones
        CREATE TABLE IF NOT EXISTS addresses (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            street TEXT,
            city TEXT,
            state TEXT,
            zip TEXT,
            phone TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- 4. Productos (Catálogo)
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            stock INTEGER DEFAULT 0,
            image_url TEXT,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 5. Servicios
        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            base_price REAL,
            description TEXT
        );

        -- 6. Carrito de Compras
        CREATE TABLE IF NOT EXISTS cart_items (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );

        -- 7. Órdenes
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pending', -- pending, paid, shipped, delivered, cancelled
            shipping_address_id TEXT,
            stripe_session_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );

        -- 8. Items de la orden
        CREATE TABLE IF NOT EXISTS order_items (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            product_id TEXT,
            service_id TEXT,
            quantity INTEGER NOT NULL,
            price_at_time REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );

        -- 9. Reseñas de Productos/Servicios
        CREATE TABLE IF NOT EXISTS reviews (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            product_id TEXT,
            service_id TEXT,
            rating INTEGER CHECK(rating BETWEEN 1 AND 5),
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- 10. Preguntas Frecuentes (FAQs)
        CREATE TABLE IF NOT EXISTS faqs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            icon TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 11. Búsquedas de FAQ sin respuesta
        CREATE TABLE IF NOT EXISTS faq_unanswered (
            query TEXT PRIMARY KEY,
            count INTEGER DEFAULT 1,
            first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Semilla de comentarios (solo si está vacía)
    const cnt = db.prepare('SELECT COUNT(*) as c FROM comments').get().c;
    if (cnt === 0) {
        const insertStmt = db.prepare('INSERT INTO comments (name, stars, text) VALUES (?, ?, ?)');
        const seedComments = [
            ['Eduardo Álvarez',    5, 'Excelente servicio, dejé mi PC y todas las instalaciones se veían muy limpias y de calidad. Todo un experto.'],
            ['Ana Maria Martínez', 5, 'Pensé que mi equipo estaba perdido, pero me salvaron y además recuperó velocidad. Rápido y confiable.'],
            ['Carlos Rodríguez',   5, 'Mi laptop gamer quedó como nueva. Las temperaturas bajaron 25 °C después del mantenimiento Pro. Recomendado 100%.'],
            ['Laura Gómez',        5, 'Llevé mi impresora que nadie quería reparar. En Pixon PC la dejaron lista en menos de 2 horas. Increíble.'],
        ];
        
        const insertMany = db.transaction((comments) => {
            for (const c of comments) insertStmt.run(c[0], c[1], c[2]);
        });
        insertMany(seedComments);
        console.log('🌱  Semilla de comentarios insertada.');
    }

    // MIGRACIÓN: agregar user_email si la columna no existe (bases de datos antiguas)
    const cols = db.prepare('PRAGMA table_info(comments)').all();
    if (!cols.some(c => c.name === 'user_email')) {
        db.exec('ALTER TABLE comments ADD COLUMN user_email TEXT');
        console.log('🔧  Migración: columna user_email agregada a comments.');
    }

    // MIGRACIÓN: agregar phone a users
    const userCols = db.prepare('PRAGMA table_info(users)').all();
    if (!userCols.some(c => c.name === 'phone')) {
        db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
        console.log('🔧  Migración: columna phone agregada a users.');
    }

    // Semilla de FAQs (solo si está vacía)
    const faqCnt = db.prepare('SELECT COUNT(*) as c FROM faqs').get().c;
    if (faqCnt === 0) {
        try {
            const fs = require('fs');
            const faqsSeed = JSON.parse(fs.readFileSync(path.join(__dirname, 'faqs_seed.json'), 'utf8'));
            const insertFaqStmt = db.prepare('INSERT INTO faqs (category, icon, question, answer, display_order) VALUES (?, ?, ?, ?, ?)');
            const insertManyFaqs = db.transaction((faqsList) => {
                let order = 0;
                for (const f of faqsList) {
                    insertFaqStmt.run(f.category, f.icon, f.question, f.answer, order++);
                }
            });
            insertManyFaqs(faqsSeed);
            console.log('🌱  Semilla de FAQs insertada (' + faqsSeed.length + ' preguntas).');
        } catch(e) {
            console.error('Error insertando semilla de FAQs:', e.message);
        }
    }

    return Promise.resolve(db);
}

// Exponer instancia de DB pura (útil para better-sqlite3-session-store)
function getDB() {
    return db;
}

/* ─────────────────────────────────────────────────────────────
   OPERACIONES DE USUARIOS
───────────────────────────────────────────────────────────── */

function updateUserProfile(id, { phone }) {
    if (!id) return false;
    const info = db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone, id);
    return info.changes > 0;
}

function getAllUsersAdmin() {
    return db.prepare('SELECT id, name, email, avatar, role, phone, created_at FROM users ORDER BY created_at DESC').all();
}

/* ─────────────────────────────────────────────────────────────
   OPERACIONES DE COMENTARIOS
───────────────────────────────────────────────────────────── */

function getAllComments() {
    return db.prepare(`
        SELECT id, name, stars, text, created_at
        FROM comments WHERE approved = 1
        ORDER BY created_at DESC
    `).all();
}

function insertComment({ name, stars, text, user_email }) {
    // Los comentarios entran como pendientes (approved=0) hasta que el admin los apruebe
    const info = db.prepare(
        'INSERT INTO comments (name, stars, text, approved, user_email) VALUES (?, ?, ?, 0, ?)'
    ).run(name, stars, text, user_email || null);
    const newRow = db.prepare(
        'SELECT id, name, stars, text, approved, user_email, created_at FROM comments WHERE id = ?'
    ).get(info.lastInsertRowid);

    // NO emitimos 'new-comment' todavía: el admin debe aprobar primero
    // Notificar solo al admin panel (si está escuchando)
    dbEmitter.emit('admin-pending', newRow);

    return newRow;
}

// Útil para un futuro endpoint de borrado desde panel admin
function deleteComment(id) {
    const info = db.prepare('DELETE FROM comments WHERE id = ?').run(id);
    if (info.changes > 0) {
        dbEmitter.emit('db-sync'); // Fuerza a recargar carrusel en todos los clientes
    }
    return info.changes > 0;
}

// Retorna TODOS los comentarios (pendientes + aprobados) para el panel admin
// Incluye user_email para trazabilidad
function getAllCommentsAdmin() {
    return db.prepare(`
        SELECT id, name, stars, text, approved, user_email, created_at
        FROM comments
        ORDER BY created_at DESC
    `).all();
}

// Aprobar un comentario: lo pone visible en el carrusel público
function approveComment(id) {
    const info = db.prepare('UPDATE comments SET approved = 1 WHERE id = ?').run(id);
    if (info.changes > 0) {
        const comment = db.prepare('SELECT id, name, stars, text, created_at FROM comments WHERE id = ?').get(id);
        dbEmitter.emit('new-comment', comment); // Transmitir al río de comentarios público
    }
    return info.changes > 0;
}

/* ─────────────────────────────────────────────────────────────
   OPERACIONES DE USUARIOS (OAuth)
───────────────────────────────────────────────────────────── */

function findOrCreateGoogleUser(profile) {
    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id);
    const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
    const name = profile.displayName;
    const avatar = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;
    
    // Asignar rol admin si el correo coincide con el del .env
    const role = (email === process.env.ADMIN_EMAIL) ? 'admin' : 'user';

    if (!user) {
        const newId = crypto.randomUUID();
        db.prepare('INSERT INTO users (id, google_id, email, name, avatar, role) VALUES (?, ?, ?, ?, ?, ?)')
          .run(newId, profile.id, email, name, avatar, role);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
    } else if (user.role !== role || user.avatar !== avatar) {
        // Actualizar el rol o avatar si cambió
        db.prepare('UPDATE users SET role = ?, avatar = ? WHERE id = ?').run(role, avatar, user.id);
        user.role = role;
        user.avatar = avatar;
    }
    return user;
}

function getUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/* ─────────────────────────────────────────────────────────────
   OPERACIONES DE FAQs
───────────────────────────────────────────────────────────── */

function getAllFaqs() {
    return db.prepare('SELECT * FROM faqs ORDER BY display_order ASC, id ASC').all();
}

function insertFaq({ category, icon, question, answer, display_order }) {
    const info = db.prepare(
        'INSERT INTO faqs (category, icon, question, answer, display_order) VALUES (?, ?, ?, ?, ?)'
    ).run(category, icon, question, answer, display_order || 0);
    return db.prepare('SELECT * FROM faqs WHERE id = ?').get(info.lastInsertRowid);
}

function updateFaq(id, { category, icon, question, answer, display_order }) {
    const info = db.prepare(
        'UPDATE faqs SET category = ?, icon = ?, question = ?, answer = ?, display_order = ? WHERE id = ?'
    ).run(category, icon, question, answer, display_order, id);
    return info.changes > 0;
}

function deleteFaq(id) {
    const info = db.prepare('DELETE FROM faqs WHERE id = ?').run(id);
    return info.changes > 0;
}

function logUnansweredFaq(query) {
    // Upsert
    const stmt = db.prepare(`
        INSERT INTO faq_unanswered (query, count, first_seen, last_seen) 
        VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(query) DO UPDATE SET 
            count = count + 1,
            last_seen = CURRENT_TIMESTAMP
    `);
    stmt.run(query);
}

function getUnansweredFaqs() {
    return db.prepare('SELECT * FROM faq_unanswered ORDER BY count DESC, last_seen DESC').all();
}

function clearUnansweredFaqs() {
    const info = db.prepare('DELETE FROM faq_unanswered').run();
    return info.changes;
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
    clearUnansweredFaqs
};
