/**
 * ============================================================
 *  server/database.js  → MariaDB via mysql2/promise (pool)
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
const { cancunToday } = require('./modules/dashboard/period');

const dbEmitter = new EventEmitter();

// SECURITY-2 (C1) → Allow-list para HTML de respuestas de FAQ.
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
    pool = createPoolFromEnv();

    // Probar conexión real
    const [rows] = await pool.query('SELECT 1 AS ok');
    if (!rows[0] || rows[0].ok !== 1) {
        throw new Error('MariaDB no respondió a SELECT 1');
    }

    console.log(`🗄️  MariaDB conectada → ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    // Reconciliar citas huérfanas sin ticket
    reconcileOrphanAppointments(pool).catch((err) => {
        console.error('[reconcile] Error en reconciliación automática de citas:', err);
    });

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
    // M4 → guardar user_id ademas de email (FK SET NULL si el usuario se borra)
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
   ADMIN_LOGS → auditoria de acciones admin (SECURITY-3 M6)
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
        // M5 → usuario existente: NO sobrescribir role_id en cada login.
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
    // C1 → sanitiza answer y icon antes de guardar
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
    // C1 → sanitiza tambien al actualizar
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
   PAGE VIEWS → Analytics
───────────────────────────────────────────────────────────── */

async function trackPageView({ path, title, referrer, user_agent, ip, session_id, user_id }) {
    const ipv4 = String(ip || '').match(/(\d{1,3}\.){3}\d{1,3}$/)?.[0];
    const ipBin = ipv4 ? Buffer.from(ipv4.split('.').map(n => parseInt(n, 10))) : null;
    await pool.execute(
        `INSERT INTO page_views (path, title, referrer, user_agent, ip, session_id, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [path, title || null, referrer || null, user_agent || null, ipBin, session_id || null, user_id || null]
    );
    // Mantener el agregado alineado con la fuente cruda: fecha de Cancún y
    // sesiones distintas, no un contador de "únicos" por cada vista.
    await pool.execute(
        `INSERT INTO page_views_daily (date, path, views, unique_visitors)
         SELECT CURDATE(), ?, 1, COUNT(DISTINCT COALESCE(session_id,CONCAT('view-',id)))
         FROM page_views WHERE DATE(created_at) = CURDATE() AND path = ?
         ON DUPLICATE KEY UPDATE views = views + 1, unique_visitors = VALUES(unique_visitors)`,
        [path, path]
    );
}

async function trackConversionEvent({ event_name, path, locale, referrer, utm_source, utm_medium, utm_campaign, session_id, user_id }) {
    await pool.execute(
        `INSERT INTO conversion_events
          (event_name, path, locale, referrer, utm_source, utm_medium, utm_campaign, session_id, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [event_name, path, locale, referrer || null, utm_source || null, utm_medium || null, utm_campaign || null, session_id || null, user_id || null]
    );
}

async function getPageViewsDaily(days = 30) {
    const [rows] = await pool.execute(
        `SELECT DATE(created_at) AS date,
                COUNT(*) AS views,
                COUNT(DISTINCT session_id) AS unique_visitors
         FROM page_views
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
           AND COALESCE(path,'') NOT LIKE '/admin%'
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
           AND COALESCE(path,'') NOT LIKE '/admin%'
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
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
           AND COALESCE(path,'') NOT LIKE '/admin%'`
    );
    const [perMinute] = await pool.execute(
        `SELECT
            FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(created_at) / 60) * 60) AS minute,
            COUNT(*) AS views,
            COUNT(DISTINCT session_id) AS visitors
         FROM page_views
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
           AND COALESCE(path,'') NOT LIKE '/admin%'
         GROUP BY minute
         ORDER BY minute ASC`,
        [minutesWindow]
    );
    const [windowTotals] = await pool.execute(
        `SELECT COUNT(*) AS views,
                COUNT(DISTINCT session_id) AS visitors
         FROM page_views
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
           AND COALESCE(path,'') NOT LIKE '/admin%'`,
        [minutesWindow]
    );
    const [lastViews] = await pool.execute(
        `SELECT path, title, created_at
         FROM page_views
         WHERE COALESCE(path,'') NOT LIKE '/admin%'
         ORDER BY created_at DESC
         LIMIT ?`,
        [recentLimit]
    );
    const [groupedPages] = await pool.execute(
        `SELECT
            normalized_path AS path,
            MAX(title) AS title,
            MAX(created_at) AS last_seen,
            COUNT(*) AS total_views,
            COUNT(*) AS week_views,
            SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS today_views,
            SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE) THEN 1 ELSE 0 END) AS window_views,
            COUNT(DISTINCT COALESCE(session_id, CONCAT('view-', id))) AS week_visitors
         FROM (
            SELECT
                id,
                title,
                created_at,
                session_id,
                CASE
                    WHEN TRIM(TRAILING '/' FROM SUBSTRING_INDEX(path, '?', 1)) = '' THEN '/'
                    ELSE TRIM(TRAILING '/' FROM SUBSTRING_INDEX(path, '?', 1))
                END AS normalized_path
            FROM page_views
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
              AND COALESCE(path,'') NOT LIKE '/admin%'
         ) pv
         GROUP BY normalized_path
         ORDER BY week_views DESC, last_seen DESC
         LIMIT ?`,
        [minutesWindow, recentLimit]
    );
    return {
        active: active[0]?.active ?? 0,
        window_views: windowTotals[0]?.views ?? 0,
        window_visitors: windowTotals[0]?.visitors ?? 0,
        per_minute: perMinute,
        last_views: lastViews,
        grouped_pages: groupedPages,
        window_minutes: minutesWindow,
        ts: Date.now(),
    };
}

async function getPageViewsSummary() {
    const [totalViews] = await pool.execute("SELECT COUNT(*) as total FROM page_views WHERE COALESCE(path,'') NOT LIKE '/admin%'");
    const [todayViews] = await pool.execute(
        `SELECT COUNT(*) as total FROM page_views WHERE DATE(created_at) = CURDATE() AND COALESCE(path,'') NOT LIKE '/admin%'`
    );
    const [uniqueToday] = await pool.execute(
        `SELECT COUNT(DISTINCT session_id) as total FROM page_views WHERE DATE(created_at) = CURDATE() AND COALESCE(path,'') NOT LIKE '/admin%'`
    );
    const [topReferrer] = await pool.execute(
        `SELECT referrer, COUNT(*) as total FROM page_views
         WHERE referrer IS NOT NULL AND referrer != '' AND COALESCE(path,'') NOT LIKE '/admin%'
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
function deriveNextAction(repair) {
    if (!repair) return 'Revisar expediente';
    const status = repair.status || 'new';
    switch (status) {
        case 'new':
            return 'Confirmar recepción y disponibilidad de cita';
        case 'received':
            return 'Realizar diagnóstico técnico inicial';
        case 'diagnosing':
            return repair.estimated_cost ? 'Enviar cotización al cliente' : 'Registrar costo y diagnóstico';
        case 'contacted':
            return 'Esperar respuesta o coordinar con cliente';
        case 'quoted':
            return 'Esperar aprobación de presupuesto';
        case 'approved':
            return 'Iniciar reparación en taller';
        case 'in_progress':
            return 'Realizar pruebas de estabilidad';
        case 'waiting_parts':
            return 'Monitorear llegada de refacciones';
        case 'ready':
            return 'Contactar cliente para entrega de equipo';
        case 'delivered':
            return 'Garantía activa';
        case 'cancelled':
            return 'Ticket cancelado';
        case 'eliminado':
            return 'Ticket archivado';
        default:
            return 'Revisar expediente';
    }
}

function mapRepairWithDerived(repair) {
    if (!repair) return null;
    return {
        ...repair,
        next_action: deriveNextAction(repair)
    };
}

async function getAllRepairsAdmin() {
    const [rows] = await pool.execute(`
        SELECT r.*, u.name as user_name, u.email as user_email,
               (SELECT ra.technician_id FROM repair_assignments ra WHERE ra.repair_id = r.id AND ra.released_at IS NULL ORDER BY ra.assigned_at DESC LIMIT 1) AS technician_id,
               (SELECT t.name FROM repair_assignments ra JOIN technicians t ON t.id = ra.technician_id WHERE ra.repair_id = r.id AND ra.released_at IS NULL ORDER BY ra.assigned_at DESC LIMIT 1) AS technician_name
        FROM repairs r
        LEFT JOIN users u ON u.id = r.user_id
        WHERE r.deleted_at IS NULL
        ORDER BY r.created_at DESC
    `);
    return rows.map(mapRepairWithDerived);
}

async function getRepairAdminById(id) {
    const [rows] = await pool.execute(`
        SELECT r.*, u.name as user_name, u.email as user_email,
               (SELECT ra.technician_id FROM repair_assignments ra WHERE ra.repair_id = r.id AND ra.released_at IS NULL ORDER BY ra.assigned_at DESC LIMIT 1) AS technician_id,
               (SELECT t.name FROM repair_assignments ra JOIN technicians t ON t.id = ra.technician_id WHERE ra.repair_id = r.id AND ra.released_at IS NULL ORDER BY ra.assigned_at DESC LIMIT 1) AS technician_name
        FROM repairs r
        LEFT JOIN users u ON u.id = r.user_id
        WHERE r.id = ? AND r.deleted_at IS NULL
        LIMIT 1
    `, [id]);
    return mapRepairWithDerived(rows[0] || null);
}

const REPAIR_STATUS_VALUES = new Set(['new', 'received', 'diagnosing', 'contacted', 'quoted', 'approved', 'in_progress', 'waiting_parts', 'ready', 'delivered', 'cancelled', 'eliminado']);
const REPAIR_PRIORITY_VALUES = new Set(['low', 'normal', 'high', 'urgent']);
const APPOINTMENT_STATUS_VALUES = new Set(['pendiente_confirmacion', 'confirmada', 'reagendada', 'cancelada', 'completada']);
const REPAIR_AUDIT_FIELDS = [
    'status', 'priority', 'diagnostic', 'notes_internal', 'estimated_cost', 'final_cost',
    'appointment_type', 'appointment_date', 'appointment_time', 'appointment_datetime',
    'appointment_delivery_method', 'appointment_note', 'appointment_status',
    'promised_at', 'delivered_at', 'warranty_until'
];

function repairUpdateError(message) {
    const error = new Error(message);
    error.status = 422;
    error.code = 'INVALID_REPAIR_UPDATE';
    return error;
}

function nullableText(value, maxLength) {
    if (value === null || value === undefined || value === '') return null;
    return String(value).trim().slice(0, maxLength);
}

function nullableMoney(value, fieldLabel) {
    if (value === null || value === undefined || value === '') return null;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount > 99_999_999.99) {
        throw repairUpdateError(`${fieldLabel} debe ser un importe valido y no negativo.`);
    }
    return amount.toFixed(2);
}

function nullableDate(value, fieldLabel) {
    if (value === null || value === undefined || value === '') return null;
    const normalized = String(value).trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T12:00:00Z`))) {
        throw repairUpdateError(`${fieldLabel} no es una fecha valida.`);
    }
    return normalized;
}

function nullableTime(value) {
    if (value === null || value === undefined || value === '') return null;
    const normalized = String(value).trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(normalized)) {
        throw repairUpdateError('La hora de la cita no es valida.');
    }
    return normalized.length === 5 ? `${normalized}:00` : normalized;
}

function nullableDateTime(value, fieldLabel) {
    if (value === null || value === undefined || value === '') return null;
    const normalized = String(value).trim().replace('T', ' ');
    if (!/^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(normalized)) {
        throw repairUpdateError(`${fieldLabel} no es una fecha y hora valida.`);
    }
    return normalized.length === 16 ? `${normalized}:00` : normalized;
}

function auditValue(value) {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return value.toISOString();
    return String(value);
}

function buildRepairDiff(before, after) {
    return Object.fromEntries(REPAIR_AUDIT_FIELDS.flatMap((field) => {
        const previous = auditValue(before[field]);
        const next = auditValue(after[field]);
        return previous === next ? [] : [[field, { before: previous, after: next }]];
    }));
}

async function updateRepairAdmin(id, data) {
    const fields = [];
    const values = [];
    const has = (field) => Object.prototype.hasOwnProperty.call(data, field);
    const set = (field, value) => {
        fields.push(`${field} = ?`);
        values.push(value);
    };

    if (has('status')) {
        if (!REPAIR_STATUS_VALUES.has(String(data.status))) throw repairUpdateError('Estado de ticket no reconocido.');
        set('status', String(data.status));
    }
    if (has('priority')) {
        if (!REPAIR_PRIORITY_VALUES.has(String(data.priority))) throw repairUpdateError('Prioridad no reconocida.');
        set('priority', String(data.priority));
    }
    if (has('diagnostic')) set('diagnostic', nullableText(data.diagnostic, 10_000));
    if (has('notes_internal')) set('notes_internal', nullableText(data.notes_internal, 20_000));
    if (has('estimated_cost')) set('estimated_cost', nullableMoney(data.estimated_cost, 'El costo estimado'));
    if (has('final_cost')) set('final_cost', nullableMoney(data.final_cost, 'El costo final'));
    if (has('appointment_type')) set('appointment_type', nullableText(data.appointment_type, 60));
    if (has('appointment_date')) set('appointment_date', nullableDate(data.appointment_date, 'La fecha de cita'));
    if (has('appointment_time')) set('appointment_time', nullableTime(data.appointment_time));
    if (has('appointment_datetime')) {
        const appointmentDateTime = nullableDateTime(data.appointment_datetime, 'La fecha de cita');
        set('appointment_datetime', appointmentDateTime);
        set('appointment_at', appointmentDateTime);
    }
    if (has('appointment_delivery_method')) set('appointment_delivery_method', nullableText(data.appointment_delivery_method, 80));
    if (has('appointment_note')) set('appointment_note', nullableText(data.appointment_note, 3_000));
    if (has('appointment_status')) {
        if (!APPOINTMENT_STATUS_VALUES.has(String(data.appointment_status))) throw repairUpdateError('Estado de cita no reconocido.');
        set('appointment_status', String(data.appointment_status));
    }
    if (has('promised_at')) set('promised_at', nullableDateTime(data.promised_at, 'La fecha prometida'));
    if (has('delivered_at') && !(has('status') && String(data.status) === 'delivered' && !data.delivered_at)) {
        set('delivered_at', nullableDateTime(data.delivered_at, 'La fecha de entrega'));
    }
    if (has('warranty_until')) set('warranty_until', nullableDate(data.warranty_until, 'La vigencia de garantia'));

    if (has('status') && String(data.status) === 'delivered' && !data.delivered_at) {
        fields.push('delivered_at = COALESCE(delivered_at, NOW())');
    }
    if (has('status') && String(data.status) === 'cancelled' && !has('appointment_status')) {
        fields.push("appointment_status = IF(appointment_status = 'completada', appointment_status, 'cancelada')");
    }

    if (fields.length === 0) return getRepairAdminById(id);

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[previous]] = await connection.execute(
            'SELECT * FROM repairs WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
            [id]
        );
        if (!previous) {
            await connection.rollback();
            return null;
        }

        // Optimistic Concurrency Control
        if (data.expected_updated_at) {
            const prevUpdated = previous.updated_at instanceof Date ? previous.updated_at.toISOString() : String(previous.updated_at || '');
            const expected = String(data.expected_updated_at).trim();
            if (prevUpdated && expected && !prevUpdated.startsWith(expected.slice(0, 19)) && !expected.startsWith(prevUpdated.slice(0, 19))) {
                await connection.rollback();
                const conflictErr = new Error('El ticket fue modificado por otro usuario. Por favor recarga el expediente para ver los cambios más recientes.');
                conflictErr.status = 409;
                conflictErr.code = 'CONFLICT';
                throw conflictErr;
            }
        }

        values.push(id);
        await connection.execute(`UPDATE repairs SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, values);
        const [[updated]] = await connection.execute('SELECT * FROM repairs WHERE id = ?', [id]);
        const nextStatus = updated.status;
        if (previous.status !== nextStatus) {
            await connection.execute(
                `INSERT INTO repair_status_history (repair_id,old_status,new_status,comment,changed_by)
                 VALUES (?,?,?,?,?)`,
                [id, previous.status, nextStatus, String(data.status_comment || '').trim().slice(0, 500) || null, data.changed_by || null]
            );

            // Sincronizar automáticamente con appointments si existe cita vinculada
            if (nextStatus === 'received') {
                await connection.execute(
                    `UPDATE appointments SET status = 'DEVICE_RECEIVED', device_received_at = COALESCE(device_received_at, NOW()), updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ? AND status IN ('CONFIRMED', 'CHECKED_IN')`,
                    [id]
                ).catch(() => {});
            } else if (nextStatus === 'in_progress') {
                await connection.execute(
                    `UPDATE appointments SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ? AND status IN ('CONFIRMED', 'CHECKED_IN', 'DEVICE_RECEIVED')`,
                    [id]
                ).catch(() => {});
            } else if (nextStatus === 'delivered' || nextStatus === 'ready') {
                await connection.execute(
                    `UPDATE appointments SET status = 'COMPLETED', completed_at = COALESCE(completed_at, NOW()), updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ? AND status NOT IN ('COMPLETED', 'DEVICE_DELIVERED')`,
                    [id]
                ).catch(() => {});
            } else if (nextStatus === 'cancelled') {
                await connection.execute(
                    `UPDATE appointments SET status = 'CANCELLED_BY_ADMIN', cancelled_at = COALESCE(cancelled_at, NOW()), updated_at = CURRENT_TIMESTAMP WHERE ticket_id = ? AND status NOT IN ('COMPLETED', 'DEVICE_DELIVERED')`,
                    [id]
                ).catch(() => {});
            }
        }

        const auditDiff = buildRepairDiff(previous, updated);
        delete auditDiff.status;
        if (Object.keys(auditDiff).length) {
            const appointmentFields = new Set([
                'appointment_type', 'appointment_date', 'appointment_time', 'appointment_datetime',
                'appointment_delivery_method', 'appointment_note', 'appointment_status'
            ]);
            const action = Object.keys(auditDiff).every((field) => appointmentFields.has(field))
                ? 'actualizacion_cita'
                : 'actualizacion';
            await connection.execute(
                `INSERT INTO admin_logs (user_id,action,entity,entity_id,diff,ip,user_agent)
                 VALUES (?,?,?,?,?,?,?)`,
                [
                    data.changed_by || null,
                    action,
                    'repair',
                    String(id),
                    JSON.stringify(auditDiff),
                    data.audit_context?.ip ? String(data.audit_context.ip).slice(0, 45) : null,
                    data.audit_context?.user_agent ? String(data.audit_context.user_agent).slice(0, 255) : null
                ]
            );
        }
        await connection.commit();
        return getRepairAdminById(id);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function generateUniqueTicketCode(connection) {
    for (let attempt = 0; attempt < 10; attempt++) {
        const code = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
        const [[existing]] = await connection.execute('SELECT id FROM repairs WHERE ticket_code = ? LIMIT 1', [code]);
        if (!existing) return code;
    }
    return `PIX${Date.now().toString(36).slice(-5).toUpperCase()}`;
}

async function reconcileOrphanAppointments(dbPool = pool) {
    if (!dbPool) return;
    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();
        const [orphans] = await connection.execute(
            'SELECT * FROM appointments WHERE ticket_id IS NULL FOR UPDATE'
        );
        for (const apt of orphans) {
            const ticketCode = await generateUniqueTicketCode(connection);
            const deviceType = (apt.device_summary || 'Equipo').slice(0, 40);
            const serviceSummary = apt.planned_service_summary || apt.service_type || 'Revisión técnica';
            const reportedIssue = [
                `Servicio agendado: ${serviceSummary}`,
                apt.customer_notes ? `Nota del cliente: ${apt.customer_notes}` : null,
                apt.address_line ? `Ubicación: ${apt.address_line}` : null
            ].filter(Boolean).join('\n');
            const internalNotes = `Cita histórica reconciliada (${apt.location_type === 'ON_SITE' ? 'Domicilio' : 'Taller'}). Cliente: ${apt.customer_name}`;

            const [repairResult] = await connection.execute(
                `INSERT INTO repairs (
                    ticket_code, user_id, device_type, device_brand, device_model,
                    reported_issue, contact_phone, contact_email, priority,
                    notes_internal, status, appointment_type, appointment_date,
                    appointment_time, appointment_datetime, appointment_status, appointment_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    ticketCode, apt.customer_id || null, deviceType, '', '',
                    reportedIssue, apt.customer_phone, apt.customer_email || null,
                    'normal', internalNotes,
                    apt.status === 'COMPLETED' ? 'ready' : (apt.status && apt.status.includes('CANCELLED') ? 'cancelled' : 'new'),
                    apt.appointment_type || 'DROP_OFF',
                    String(apt.start_at).slice(0, 10),
                    String(apt.start_at).slice(11, 16),
                    apt.start_at,
                    apt.status === 'COMPLETED' ? 'completada' : (apt.status && apt.status.includes('CANCELLED') ? 'cancelada' : 'confirmada'),
                    apt.start_at
                ]
            );
            await connection.execute(
                'UPDATE appointments SET ticket_id = ? WHERE id = ?',
                [repairResult.insertId, apt.id]
            );
        }
        await connection.commit();
        if (orphans.length > 0) {
            console.log(`[reconcile] Vinculadas ${orphans.length} citas huérfanas a tickets oficiales en repairs.`);
        }
    } catch (err) {
        await connection.rollback();
        console.error('[reconcile] Error reconciliando citas huérfanas:', err);
    } finally {
        connection.release();
    }
}

async function insertRepairAdmin(data) {
    const { user_id, user_name, device_type, device_brand, device_model, reported_issue, contact_phone, contact_email, priority, status, is_b2b, b2b_company, b2b_quantity, b2b_type, b2b_frequency, b2b_invoice, appointment_type, appointment_date, appointment_time, appointment_datetime, appointment_delivery_method, appointment_note, appointment_status } = data;
    
    const allowedStatus = new Set(['new', 'received', 'diagnosing', 'contacted', 'quoted', 'approved', 'in_progress', 'waiting_parts', 'ready', 'delivered', 'cancelled']);
    const priorityMap = {
        quote: 'low',
        normal: 'normal',
        work_school: 'high',
        urgent: 'urgent',
        low: 'low',
        high: 'high'
    };
    const cleanPriority = priorityMap[String(priority || 'normal')] || 'normal';
    const cleanStatus = allowedStatus.has(String(status || 'new')) ? String(status || 'new') : 'new';
    
    let internalNotes = 'Cliente: ' + (user_name || 'Sin nombre');
    if (is_b2b) {
        internalNotes += `\nB2B Info: Empresa: ${b2b_company || ''}, Cantidad: ${b2b_quantity || ''}, Tipo: ${b2b_type || ''}, Frec: ${b2b_frequency || ''}, Factura: ${b2b_invoice || ''}`;
    }

    const connection = await pool.getConnection();
    try {
        const ticket_code = await generateUniqueTicketCode(connection);
        const [info] = await connection.execute(
            `INSERT INTO repairs (ticket_code, user_id, device_type, device_brand, device_model, reported_issue, contact_phone, contact_email, priority, notes_internal, status, appointment_type, appointment_date, appointment_time, appointment_datetime, appointment_delivery_method, appointment_note, appointment_status, appointment_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ticket_code, user_id || null, device_type, device_brand || '', device_model || '', reported_issue,
                contact_phone, contact_email || null, cleanPriority, internalNotes, cleanStatus,
                appointment_type || null, appointment_date || null, appointment_time || null, appointment_datetime || null,
                appointment_delivery_method || null, appointment_note || null, appointment_status || 'pendiente_confirmacion',
                appointment_datetime || null
            ]
        );
        const [[newRow]] = await connection.execute('SELECT * FROM repairs WHERE id = ?', [info.insertId]);
        return mapRepairWithDerived(newRow);
    } finally {
        connection.release();
    }
}

async function getActiveTechnicians() {
    const [rows] = await pool.execute(
        'SELECT id, name, specialty FROM technicians WHERE is_active = 1 ORDER BY name ASC'
    );
    return rows;
}

async function assignRepairTechnician(repairId, technicianId, context = {}) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[repair]] = await connection.execute('SELECT id FROM repairs WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [repairId]);
        if (!repair) return null;
        const [[technician]] = technicianId
            ? await connection.execute('SELECT id, name FROM technicians WHERE id = ? AND is_active = 1 LIMIT 1', [technicianId])
            : [[null]];
        if (technicianId && !technician) throw repairUpdateError('El responsable seleccionado no está disponible.');

        const [[current]] = await connection.execute(
            `SELECT technician_id FROM repair_assignments
             WHERE repair_id = ? AND released_at IS NULL ORDER BY assigned_at DESC LIMIT 1`,
            [repairId]
        );
        if (current) await connection.execute(
            'UPDATE repair_assignments SET released_at = NOW() WHERE repair_id = ? AND released_at IS NULL',
            [repairId]
        );
        if (technician) await connection.execute(
            'INSERT INTO repair_assignments (repair_id, technician_id) VALUES (?, ?)',
            [repairId, technician.id]
        );
        await connection.execute(
            `INSERT INTO admin_logs (user_id,action,entity,entity_id,diff,ip,user_agent)
             VALUES (?,?,?,?,?,?,?)`,
            [
                context.changed_by || null,
                'asignacion_responsable',
                'repair',
                String(repairId),
                JSON.stringify({ technician: { before: current?.technician_id || null, after: technician?.name || null } }),
                context.audit_context?.ip ? String(context.audit_context.ip).slice(0, 45) : null,
                context.audit_context?.user_agent ? String(context.audit_context.user_agent).slice(0, 255) : null
            ]
        );
        await connection.commit();
        return getRepairAdminById(repairId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getTicketHistory(id) {
    const [[repair]] = await pool.execute(
        `SELECT id,ticket_code,created_at FROM repairs WHERE id = ? LIMIT 1`,
        [id]
    );
    if (!repair) return [];

    const [statusRows, auditRows] = await Promise.all([
        pool.execute(
            `SELECT h.id,h.old_status,h.new_status,h.comment,h.created_at,
                    u.name user_name,u.email user_email
             FROM repair_status_history h
             LEFT JOIN users u ON u.id = h.changed_by
             WHERE h.repair_id = ?
             ORDER BY h.created_at DESC,h.id DESC`,
            [id]
        ).then(([rows]) => rows),
        pool.execute(
            `SELECT l.id,l.action,l.diff,l.created_at,u.name user_name,u.email user_email
             FROM admin_logs l
             LEFT JOIN users u ON u.id = l.user_id
             WHERE l.entity IN ('repair','repair_appointment') AND l.entity_id = ?
             ORDER BY l.created_at DESC,l.id DESC`,
            [String(id)]
        ).then(([rows]) => rows)
    ]);

    const creationAudit = auditRows.find((row) => row.action === 'create');
    const history = [{
        id: `created-${repair.id}`,
        action: 'creacion',
        created_at: repair.created_at,
        user_name: creationAudit?.user_name || null,
        user_email: creationAudit?.user_email || null,
        diff: {}
    }];

    history.push(...statusRows.map((row) => ({
        id: `status-${row.id}`,
        action: 'cambio_de_estado',
        created_at: row.created_at,
        user_name: row.user_name,
        user_email: row.user_email,
        diff: {
            status: { before: row.old_status, after: row.new_status },
            ...(row.comment ? { comment: { before: null, after: row.comment } } : {})
        }
    })));

    for (const row of auditRows) {
        if (row.action === 'create') continue;
        let diff;
        try { diff = typeof row.diff === 'string' ? JSON.parse(row.diff) : row.diff; } catch { diff = null; }
        if (!diff || typeof diff !== 'object') continue;
        const usefulDiff = Object.fromEntries(Object.entries(diff).filter(([field]) => field !== 'ticket_code'));
        if (!Object.keys(usefulDiff).length) continue;
        history.push({
            id: `audit-${row.id}`,
            action: row.action || 'actualizacion',
            created_at: row.created_at,
            user_name: row.user_name,
            user_email: row.user_email,
            diff: usefulDiff
        });
    }

    return history.sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
}

async function getRecentTickets(limit = 8) {
    const safeLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 8));
    const [rows] = await pool.execute(
        `SELECT r.id,r.ticket_code,r.device_type,r.device_brand,r.device_model,r.status,
                r.priority,r.created_at,r.updated_at,u.name user_name
         FROM repairs r
         LEFT JOIN users u ON u.id = r.user_id
         WHERE r.deleted_at IS NULL
         ORDER BY r.created_at DESC,r.id DESC
         LIMIT ?`,
        [safeLimit]
    );
    return rows.map(mapRepairWithDerived);
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
    const today = cancunToday();
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

    const capacity = Number(exception?.capacity_override || setting?.capacity || 3);

    const [aptRows] = await pool.execute(
        `SELECT start_at, duration_minutes, capacity_units FROM appointments
         WHERE DATE(start_at) = ?
           AND status IN ('TEMPORARY_HOLD', 'PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'DEVICE_RECEIVED', 'IN_PROGRESS', 'CUSTOMER_ARRIVED')
           AND (reservation_expires_at IS NULL OR reservation_expires_at > NOW())`,
        [date]
    );

    const [blockRows] = await pool.execute(
        `SELECT start_time, end_time, is_all_day FROM appointment_blocks WHERE date = ?`,
        [date]
    );

    const hasAllDayBlock = blockRows.some(b => Boolean(b.is_all_day));
    if (hasAllDayBlock) return { available: false, message: 'Este día está bloqueado por el taller.', slots: [], detailedSlots: [] };

    const slots = [];
    const detailedSlots = [];

    for (let mins = timeToMinutes(start); mins + slotMinutes <= timeToMinutes(end); mins += slotMinutes) {
        const slot = minutesToTime(mins);
        const slotEndMins = mins + slotMinutes;

        // Check blocks
        const isBlocked = blockRows.some(b => {
            const bStart = timeToMinutes(b.start_time);
            const bEnd = timeToMinutes(b.end_time);
            return Math.max(mins, bStart) < Math.min(slotEndMins, bEnd);
        });

        if (isBlocked) continue;

        // Calculate capacity used
        let used = 0;
        for (const apt of aptRows) {
            const aptStart = String(apt.start_at).slice(11, 16);
            const aStartMins = timeToMinutes(aptStart);
            const aEndMins = aStartMins + Number(apt.duration_minutes || 30);
            if (Math.max(mins, aStartMins) < Math.min(slotEndMins, aEndMins)) {
                used += Number(apt.capacity_units || 1);
            }
        }

        const remaining = Math.max(0, capacity - used);
        if (remaining > 0) {
            slots.push(slot);
            detailedSlots.push({
                time: slot,
                total_capacity: capacity,
                used_capacity: used,
                remaining_capacity: remaining,
                state: used === 0 ? 'AVAILABLE' : 'PARTIAL'
            });
        }
    }

    return {
        available: slots.length > 0,
        message: slots.length ? '' : 'Este día está lleno.',
        slots,
        detailedSlots
    };
}

async function getAdminAppointments({ from, to } = {}) {
    const start = from || cancunToday();
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

// M3 → version publica: nunca expone cost, compare_price, stock_alert, sku.
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


/* ─────────────────────────────────────────────────────────
   USER REPAIRS - Tickets del cliente
───────────────────────────────────────────────────────── */
async function getUserRepairs(userId) {
    const [rows] = await pool.execute(`
        SELECT r.*, u.name as user_name, u.email as user_email
        FROM repairs r
        LEFT JOIN users u ON u.id = r.user_id
        WHERE r.user_id = ? AND r.deleted_at IS NULL
        ORDER BY r.created_at DESC
    `, [userId]);
    return rows.map(mapRepairWithDerived);
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
    getActiveTechnicians,
    assignRepairTechnician,
    softDeleteRepairAdmin,
    getTicketHistory,
    getRecentTickets,
    deriveNextAction,
    generateUniqueTicketCode,
    mapRepairWithDerived,
    reconcileOrphanAppointments,
    getAppointmentConfig,
    saveAppointmentConfig,
    getAppointmentAvailability,
    getAdminAppointments,
    getAllBuildsAdmin,
    getAllBuildsPublic,
    insertBuildAdmin,
    logAdminAction,
    /* ─────────────────────────────────────────────────────────
       PAGE VIEWS → Analytics
    ───────────────────────────────────────────────────────── */
    trackPageView,
    trackConversionEvent,
    getPageViewsDaily,
    getPageViewsTop,
    getPageViewsSummary,
    getLiveAnalytics
};
