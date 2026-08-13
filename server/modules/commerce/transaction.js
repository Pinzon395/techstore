'use strict';

const RETRYABLE_DB_ERRORS = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);
const ISOLATION_LEVELS = new Set([
    'READ UNCOMMITTED',
    'READ COMMITTED',
    'REPEATABLE READ',
    'SERIALIZABLE'
]);

async function runTransaction(pool, work, {
    isolationLevel = 'READ COMMITTED',
    maxRetries = 1
} = {}) {
    if (!pool || typeof pool.getConnection !== 'function') {
        throw new TypeError('Se requiere un pool mysql2/promise');
    }
    if (typeof work !== 'function') throw new TypeError('work debe ser una funcion');
    if (!ISOLATION_LEVELS.has(isolationLevel)) throw new TypeError('Nivel de aislamiento no soportado');

    let attempt = 0;
    while (true) {
        const connection = await pool.getConnection();
        try {
            await connection.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
            await connection.beginTransaction();
            const result = await work(connection);
            await connection.commit();
            return result;
        } catch (error) {
            try {
                await connection.rollback();
            } catch {
                // The original transaction error is more useful than a rollback error.
            }
            if (attempt < maxRetries && RETRYABLE_DB_ERRORS.has(error?.code)) {
                attempt += 1;
                continue;
            }
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = { runTransaction, RETRYABLE_DB_ERRORS };
