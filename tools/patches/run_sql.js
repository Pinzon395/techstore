const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runSQL() {
    try {
        const mariadb = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: +(process.env.DB_PORT || 3306),
            user: process.env.DB_USER || 'pixon_app',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'pixon_db',
            multipleStatements: true
        });

        const sql = fs.readFileSync('./server/sql/03-builder-schema.sql', 'utf8');
        await mariadb.query(sql);
        console.log('✅ Esquema 03-builder-schema.sql aplicado exitosamente.');
        await mariadb.end();
    } catch (e) {
        console.error('Error:', e);
    }
}
runSQL();
