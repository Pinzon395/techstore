'use strict';

const mysql = require('mysql2/promise');

const isProduction = process.env.NODE_ENV === 'production';

function intFromEnv(name, fallback, min, max) {
    const value = Number(process.env[name]);
    return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

// Única fuente de configuración de MySQL. En producción no hay defaults:
// validateEnv() en server.js aborta el arranque si falta una variable.
function createPoolFromEnv() {
    return mysql.createPool({
        host:               process.env.DB_HOST     || (isProduction ? undefined : '127.0.0.1'),
        port:               intFromEnv('DB_PORT', 3306, 1, 65535),
        user:               process.env.DB_USER     || (isProduction ? undefined : 'pixon_app'),
        password:           process.env.DB_PASSWORD || '',
        database:           process.env.DB_NAME     || (isProduction ? undefined : 'pixon'),
        waitForConnections: true,
        // Hosting compartido limita max_user_connections; 8 cubre el tráfico
        // del sitio + jobs internos sin saturar el servidor MySQL.
        connectionLimit:    intFromEnv('DB_CONNECTION_LIMIT', 8, 1, 50),
        queueLimit:         intFromEnv('DB_QUEUE_LIMIT', 200, 0, 10000),
        connectTimeout:     intFromEnv('DB_CONNECT_TIMEOUT_MS', 10000, 1000, 60000),
        enableKeepAlive:    true,
        keepAliveInitialDelay: 10000,
        charset:            'utf8mb4',
        timezone:           'Z',
        dateStrings:        true,
        namedPlaceholders:  false
    });
}

module.exports = { createPoolFromEnv };
