'use strict';

const mysql = require('mysql2/promise');

function createPoolFromEnv() {
    return mysql.createPool({
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
        dateStrings:        true,
        namedPlaceholders:  false
    });
}

module.exports = { createPoolFromEnv };
