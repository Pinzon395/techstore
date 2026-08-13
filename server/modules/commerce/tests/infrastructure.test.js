'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runTransaction } = require('../transaction');
const { createAuditWriter, redactAuditValue } = require('../audit');
const { createPermissionService, permissionCandidates } = require('../permissions');

function fakeConnection({ workError } = {}) {
    const calls = [];
    return {
        calls,
        async query(sql) { calls.push(['query', sql]); },
        async beginTransaction() { calls.push(['begin']); },
        async commit() { calls.push(['commit']); },
        async rollback() { calls.push(['rollback']); },
        release() { calls.push(['release']); },
        async execute(sql, params) {
            calls.push(['execute', sql, params]);
            if (workError) throw workError;
            return [{ affectedRows: 1 }];
        }
    };
}

test('runTransaction confirma y libera la misma conexion', async () => {
    const connection = fakeConnection();
    const pool = { async getConnection() { return connection; } };
    const result = await runTransaction(pool, async (tx) => {
        assert.equal(tx, connection);
        return 'ok';
    });
    assert.equal(result, 'ok');
    assert.deepEqual(connection.calls.map((call) => call[0]), ['query', 'begin', 'commit', 'release']);
});

test('runTransaction revierte al fallar', async () => {
    const connection = fakeConnection();
    const pool = { async getConnection() { return connection; } };
    await assert.rejects(() => runTransaction(pool, async () => {
        throw new Error('boom');
    }, { maxRetries: 0 }), /boom/);
    assert.deepEqual(connection.calls.map((call) => call[0]), ['query', 'begin', 'rollback', 'release']);
});

test('auditoria escribe en la conexion transaccional y redacta secretos', async () => {
    const connection = fakeConnection();
    await createAuditWriter().write(connection, {
        actor: { userId: 'u1', requestId: 'r1', transactionId: 't1' },
        action: 'catalog.update', entity: 'catalog_item', entityId: 9,
        before: { price: '10.00', token: 'secret' }, after: { price: '9.00' }
    });
    const execute = connection.calls.find((call) => call[0] === 'execute');
    assert.match(execute[1], /INSERT INTO admin_logs/);
    assert.equal(execute[2][0], 'u1');
    assert.match(execute[2][4], /\[REDACTED\]/);
    assert.deepEqual(redactAuditValue({ password: 'x', nested: { ok: true } }), {
        password: '[REDACTED]', nested: { ok: true }
    });
});

test('permisos soportan grant directo, wildcard y admin legado', async () => {
    assert.deepEqual(permissionCandidates('catalog.update'), ['catalog.update', 'catalog.*', '*']);
    const pool = {
        async execute(sql) {
            if (sql.includes('FROM users')) return [[{ role_id: 4, role_code: 'cliente', is_staff: 0 }]];
            if (sql.includes('FROM user_permissions')) return [[{ allowed: 1 }]];
            throw new Error(`Consulta inesperada: ${sql}`);
        }
    };
    const service = createPermissionService({ pool });
    assert.equal(await service.hasPermission({ id: 'u1' }, 'catalog.view'), true);

    const adminPool = {
        async execute(sql) {
            if (sql.includes('FROM users')) return [[{ role_id: 1, role_code: 'admin', is_staff: 1 }]];
            throw new Error('No debe consultar grants para admin legado');
        }
    };
    assert.equal(await createPermissionService({ pool: adminPool }).hasPermission(
        { id: 'admin' }, 'catalog.delete'
    ), true);
});
