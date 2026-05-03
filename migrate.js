const fs = require('fs');
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');

async function migrate() {
    try {
        console.log('Cargando backup de SQLite en memoria...');
        const sqlite = new Database(':memory:');
        const dump = fs.readFileSync('SQlite_pixon.db.sql', 'utf8');
        sqlite.exec(dump);

        const users = sqlite.prepare('SELECT * FROM users').all();
        const comments = sqlite.prepare('SELECT * FROM comments').all();
        const faqs = sqlite.prepare('SELECT * FROM faqs').all();

        console.log('Conectando a MariaDB...');
        const mariadb = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'PinzonRood395/2026',
            database: 'pixon_db'
        });

        console.log('Migrando usuarios...');
        for (const u of users) {
            const role_id = u.role === 'admin' ? 1 : 4;
            // Evitar meter comillas erróneas en el phone (había un error raro en el dump)
            const cleanPhone = (u.phone && u.phone.includes('UPDATE')) ? null : u.phone;

            await mariadb.execute(
                `INSERT IGNORE INTO users (id, google_id, email, name, avatar_url, role_id, phone, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [u.id, u.google_id, u.email, u.name, u.avatar, role_id, cleanPhone, u.created_at || null]
            );
        }

        console.log('Migrando comentarios...');
        for (const c of comments) {
            await mariadb.execute(
                `INSERT IGNORE INTO comments (id, name, stars, text, approved, user_email, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [c.id, c.name, c.stars, c.text, c.approved, c.user_email, c.created_at || null]
            );
        }

        console.log('Migrando FAQs...');
        for (const f of faqs) {
            const is_active = f.status === 'published' ? 1 : 0;
            await mariadb.execute(
                `INSERT IGNORE INTO faqs (id, category, icon, question, answer, display_order, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [f.id, f.category, f.icon || '', f.question, f.answer, f.display_order || 0, is_active, f.created_at || null]
            );
        }

        console.log(`✅ ¡Migración completada! ${users.length} usuarios, ${comments.length} comentarios y ${faqs.length} FAQs copiados.`);
        await mariadb.end();
    } catch (e) {
        console.error('Error durante la migración:', e);
    }
}

migrate();
