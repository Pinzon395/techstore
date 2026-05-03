const fs = require('fs');
const mysql = require('mysql2/promise');

async function runSQL() {
    try {
        const mariadb = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'PinzonRood395/2026',
            database: 'pixon_db',
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
