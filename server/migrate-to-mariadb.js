/**
 * ============================================================
 *  server/migrate-to-mariadb.js
 *  Migración de datos: SQLite (pixon.db) → MariaDB (pixon)
 *
 *  REQUISITOS PREVIOS:
 *    1. MariaDB instalada y corriendo en localhost:3306
 *    2. DB 'pixon' creada (ejecutar 01-schema.sql)
 *    3. Seed insertado          (ejecutar 02-seed.sql)
 *    4. Variables en .env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 *    5. Instalar dependencia:   npm install mysql2
 *
 *  USO:
 *    node server/migrate-to-mariadb.js
 *    node server/migrate-to-mariadb.js --dry-run        (no escribe)
 *    node server/migrate-to-mariadb.js --reset-target   (TRUNCA tablas
 *                                                        antes de migrar)
 * ============================================================
 */

'use strict';

require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');

const DRY_RUN = process.argv.includes('--dry-run');
const RESET   = process.argv.includes('--reset-target');

const ROLE_MAP = { admin: 1, tecnico: 2, editor: 3, user: 4, cliente: 4, guest: 5 };

const SQLITE_PATH = path.join(__dirname, 'pixon.db');

(async () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Pixon PC — Migración SQLite → MariaDB');
    console.log('  Modo:', DRY_RUN ? 'DRY-RUN (no escribe)' : 'EJECUCIÓN REAL');
    console.log('═══════════════════════════════════════════════════════════\n');

    const sqlite = new Database(SQLITE_PATH, { readonly: true });
    console.log('✓ SQLite abierto:', SQLITE_PATH);

    const maria = await mysql.createConnection({
        host:     process.env.DB_HOST     || '127.0.0.1',
        port:     +(process.env.DB_PORT   || 3306),
        user:     process.env.DB_USER     || 'pixon_app',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME     || 'pixon',
        timezone: 'Z',
        charset:  'utf8mb4'
    });
    console.log('✓ MariaDB conectada a', process.env.DB_HOST || '127.0.0.1');

    if (RESET && !DRY_RUN) {
        console.log('\n⚠  --reset-target: vaciando tablas destino...');
        await maria.execute('SET FOREIGN_KEY_CHECKS = 0');
        for (const t of ['user_permissions', 'addresses', 'comments', 'reviews',
                         'faq_unanswered', 'faqs', 'sessions', 'users']) {
            await maria.execute(`TRUNCATE TABLE ${t}`);
            console.log('  ↻', t);
        }
        await maria.execute('SET FOREIGN_KEY_CHECKS = 1');
    }

    // ───────── 1) USERS ─────────
    {
        const rows = sqlite.prepare(
            'SELECT id, google_id, email, name, avatar, role, phone, created_at FROM users'
        ).all();
        let inserted = 0;
        for (const u of rows) {
            const role_id = ROLE_MAP[String(u.role || 'cliente').toLowerCase()] || 4;

            // Defensa: limpiar phone si parece un intento de injection o basura
            let phone = u.phone || null;
            if (phone && (/[<>;]|UPDATE|DROP|SELECT|INSERT/i.test(phone))) {
                console.warn(`  ⚠  user ${u.email}: phone sospechoso descartado (${JSON.stringify(phone)})`);
                phone = null;
            }

            if (DRY_RUN) {
                console.log(`  [dry] users <- ${u.email} (role_id=${role_id})`);
            } else {
                await maria.execute(
                    `INSERT INTO users (id, google_id, email, name, avatar_url, phone, role_id, created_at)
                     VALUES (?,?,?,?,?,?,?,?)
                     ON DUPLICATE KEY UPDATE
                       name=VALUES(name),
                       avatar_url=VALUES(avatar_url),
                       phone=VALUES(phone),
                       role_id=VALUES(role_id)`,
                    [u.id, u.google_id, u.email, u.name, u.avatar, phone, role_id, u.created_at]
                );
                inserted++;
            }
        }
        console.log(`✓ users: ${inserted}/${rows.length}`);
    }

    // ───────── 2) COMMENTS ─────────
    {
        const rows = sqlite.prepare(
            'SELECT name, stars, text, approved, user_email, created_at FROM comments ORDER BY id'
        ).all();
        let inserted = 0;
        for (const c of rows) {
            if (DRY_RUN) {
                console.log(`  [dry] comments <- ${c.name} (${c.stars}★)`);
            } else {
                await maria.execute(
                    `INSERT INTO comments (name, stars, text, approved, user_email, created_at)
                     VALUES (?,?,?,?,?,?)`,
                    [c.name, c.stars, c.text, c.approved ? 1 : 0, c.user_email, c.created_at]
                );
                inserted++;
            }
        }
        console.log(`✓ comments: ${inserted}/${rows.length}`);
    }

    // ───────── 3) FAQS ─────────
    {
        const rows = sqlite.prepare(
            'SELECT category, icon, question, answer, display_order, created_at FROM faqs ORDER BY display_order, id'
        ).all();
        let inserted = 0;
        for (const f of rows) {
            if (DRY_RUN) {
                console.log(`  [dry] faqs <- ${String(f.question).slice(0,60)}...`);
            } else {
                await maria.execute(
                    `INSERT INTO faqs (category, icon, question, answer, display_order, created_at)
                     VALUES (?,?,?,?,?,?)`,
                    [f.category, f.icon, f.question, f.answer, f.display_order || 0, f.created_at]
                );
                inserted++;
            }
        }
        console.log(`✓ faqs: ${inserted}/${rows.length}`);
    }

    // ───────── 4) FAQ_UNANSWERED ─────────
    {
        const rows = sqlite.prepare(
            'SELECT query, count, first_seen, last_seen FROM faq_unanswered'
        ).all();
        let inserted = 0;
        for (const r of rows) {
            if (DRY_RUN) {
                console.log(`  [dry] faq_unanswered <- ${r.query}`);
            } else {
                await maria.execute(
                    `INSERT INTO faq_unanswered (query, count, first_seen, last_seen)
                     VALUES (?,?,?,?)
                     ON DUPLICATE KEY UPDATE count=VALUES(count), last_seen=VALUES(last_seen)`,
                    [r.query, r.count, r.first_seen, r.last_seen]
                );
                inserted++;
            }
        }
        console.log(`✓ faq_unanswered: ${inserted}/${rows.length}`);
    }

    // ───────── 5) ADDRESSES (vacía hoy, defensa por si crece antes del cutover) ─────────
    {
        const rows = sqlite.prepare(
            'SELECT user_id, street, city, state, zip, phone FROM addresses'
        ).all();
        let inserted = 0;
        for (const a of rows) {
            if (DRY_RUN) {
                console.log(`  [dry] addresses <- user=${a.user_id}`);
            } else {
                await maria.execute(
                    `INSERT INTO addresses (user_id, street, city, state, zip, phone)
                     VALUES (?,?,?,?,?,?)`,
                    [a.user_id, a.street || 'N/D', a.city || 'N/D', a.state || 'N/D', a.zip || '00000', a.phone]
                );
                inserted++;
            }
        }
        console.log(`✓ addresses: ${inserted}/${rows.length}`);
    }

    // ───────── 6) Tablas que están vacías hoy (products, services, cart_items, orders, order_items, reviews) ─────────
    for (const t of ['products', 'services', 'cart_items', 'orders', 'order_items', 'reviews']) {
        const c = sqlite.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c;
        if (c > 0) {
            console.warn(`  ⚠  Tabla ${t} tiene ${c} filas en SQLite — su esquema cambió, requiere mapeo manual.`);
            console.warn(`     Para preservarlas, edita este script con el mapeo correcto antes de correrlo.`);
        } else {
            console.log(`  ${t}: 0 filas (skip)`);
        }
    }

    // ───────── VERIFICACIÓN ─────────
    console.log('\n--- Verificación de conteos ---');
    const checks = ['users', 'comments', 'faqs', 'faq_unanswered'];
    let ok = true;
    for (const t of checks) {
        const sCount = sqlite.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
        if (DRY_RUN) {
            console.log(`  [dry] ${t}: sqlite=${sCount} | maria=(no verificado)`);
            continue;
        }
        const [[{ c: mCount }]] = await maria.query(`SELECT COUNT(*) c FROM ${t}`);
        const match = sCount === mCount;
        console.log(`  ${match ? '✓' : '✗'} ${t}: sqlite=${sCount} | maria=${mCount}`);
        if (!match) ok = false;
    }

    await maria.end();
    sqlite.close();

    if (DRY_RUN) {
        console.log('\n📋 Dry-run completo. Ejecuta sin --dry-run para escribir.');
        process.exit(0);
    }

    if (!ok) {
        console.error('\n✗ Hubo discrepancias. Revisa los logs antes del cutover.');
        process.exit(1);
    }

    console.log('\n✅ Migración completa. Conteos coinciden.');
})().catch(err => {
    console.error('\n✗ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
});
