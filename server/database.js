/**
 * ============================================================
 *  server/database.js  — SQLite via sql.js (WebAssembly)
 * ============================================================
 *
 *  sql.js es SQLite compilado a WebAssembly.
 *  No requiere compilación nativa → funciona en cualquier PC
 *  con Node.js sin dependencias de Visual Studio/MSBuild.
 *
 *  La DB se guarda en server/pixon.db como archivo binario.
 *  sql.js la lee al iniciar y la escribe con cada cambio.
 *
 *  TABLAS:
 *  comments   (id, name, stars, text, approved, created_at)
 *
 *  FUTURO marketplace:
 *  products   (id, title, price, stock, image_url, category)
 *  orders     (id, customer, items_json, total, status, date)
 *  users      (id, email, password_hash, role)
 * ============================================================
 */

'use strict';

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, 'pixon.db');

/* Estado del módulo */
let db   = null;   // instancia de sql.js Database
let SQL  = null;   // instancia de sql.js (para crear nuevas DBs)

/* ─────────────────────────────────────────────────────────────
   GUARDAR EN DISCO — sql.js trabaja en memoria.
   Llamar esta función después de CADA INSERT/UPDATE/DELETE
   para persistir los cambios al archivo.
───────────────────────────────────────────────────────────── */
function saveDB() {
    const data = db.export(); // Uint8Array de la DB en memoria
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/* ─────────────────────────────────────────────────────────────
   SEMILLA DE COMENTARIOS
───────────────────────────────────────────────────────────── */
const SEED_COMMENTS = [
    ['Eduardo Álvarez',    5, 'Excelente servicio, dejé mi PC y todas las instalaciones se veían muy limpias y de calidad. Todo un experto.'],
    ['Ana Maria Martínez', 5, 'Pensé que mi equipo estaba perdido, pero me salvaron y además recuperó velocidad. Rápido y confiable.'],
    ['Carlos Rodríguez',   5, 'Mi laptop gamer quedó como nueva. Las temperaturas bajaron 25 °C después del mantenimiento Pro. Recomendado 100%.'],
    ['Laura Gómez',        5, 'Llevé mi impresora que nadie quería reparar. En Pixon PC la dejaron lista en menos de 2 horas. Increíble.'],
];

/* ─────────────────────────────────────────────────────────────
   INICIALIZACIÓN — Asíncrona porque sql.js carga WASM
───────────────────────────────────────────────────────────── */
async function initDB() {
    SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        // Cargar DB existente desde disco
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
        console.log('🗄️  Base de datos cargada:', DB_PATH);
    } else {
        // Primera vez: crear DB en blanco
        db = new SQL.Database();
        console.log('🆕  Base de datos creada:', DB_PATH);
    }

    // Migraciones — idempotentes
    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT    NOT NULL,
            stars      INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5),
            text       TEXT    NOT NULL,
            approved   INTEGER NOT NULL DEFAULT 1,
            created_at TEXT    DEFAULT (datetime('now', 'localtime'))
        );
        CREATE INDEX IF NOT EXISTS idx_comments_date
            ON comments(created_at DESC);
    `);

    // Sembrar si está vacía
    const result = db.exec('SELECT COUNT(*) as c FROM comments');
    const cnt    = result[0]?.values[0][0] || 0;
    if (cnt === 0) {
        SEED_COMMENTS.forEach(([name, stars, text]) => {
            db.run(
                'INSERT INTO comments (name, stars, text) VALUES (?, ?, ?)',
                [name, stars, text]
            );
        });
        console.log('🌱  Semilla de comentarios insertada.');
    }

    // Guardar el estado inicial en disco
    saveDB();

    return db;
}

/* ─────────────────────────────────────────────────────────────
   OPERACIONES CRUD — Exportadas para usar en server.js
───────────────────────────────────────────────────────────── */

/** @returns {Array} Todos los comentarios aprobados, más recientes primero */
function getAllComments() {
    const res = db.exec(`
        SELECT id, name, stars, text, created_at
        FROM comments WHERE approved = 1
        ORDER BY created_at DESC
    `);
    if (!res.length) return [];
    const [cols, ...rows] = [res[0].columns, ...res[0].values];
    return rows.map(row =>
        Object.fromEntries(cols.map((col, i) => [col, row[i]]))
    );
}

/** @returns {object} El comentario recién insertado */
function insertComment({ name, stars, text }) {
    db.run(
        'INSERT INTO comments (name, stars, text) VALUES (?, ?, ?)',
        [name, stars, text]
    );
    // Obtener el registro recién creado
    const res = db.exec('SELECT id, name, stars, text, created_at FROM comments ORDER BY id DESC LIMIT 1');
    const [cols, row] = [res[0].columns, res[0].values[0]];
    saveDB(); // ← Persistir en disco después de cada escritura
    return Object.fromEntries(cols.map((col, i) => [col, row[i]]));
}

module.exports = { initDB, getAllComments, insertComment };
