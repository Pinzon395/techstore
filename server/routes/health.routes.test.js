'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const http = require('http');
const createHealthRoutes = require('./health.routes');

async function request(app, path) {
    const server = await new Promise((resolve) => {
        const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });

    try {
        const { port } = server.address();
        return await new Promise((resolve, reject) => {
            http.get({ host: '127.0.0.1', port, path }, (response) => {
                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => { body += chunk; });
                response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
            }).on('error', reject);
        });
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

test('health is liveness and does not depend on MySQL', async () => {
    const app = express();
    app.use('/api', createHealthRoutes({
        checkDatabase: async () => { throw new Error('database unavailable'); }
    }));

    const result = await request(app, '/api/health');
    assert.equal(result.status, 200);
    assert.equal(result.body.status, 'UP');
    assert.equal(result.body.app, 'UP');
    assert.equal('db' in result.body, false);
});

test('ready reports database availability without leaking connection details', async () => {
    const app = express();
    app.use('/api', createHealthRoutes({ checkDatabase: async () => {} }));

    const result = await request(app, '/api/ready');
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.status, 'READY');
    assert.equal(result.body.db, 'UP');
});

test('ready returns 503 when the database check fails', async () => {
    const app = express();
    app.use('/api', createHealthRoutes({
        checkDatabase: async () => { throw new Error('database unavailable'); }
    }));

    const result = await request(app, '/api/ready');
    assert.equal(result.status, 503);
    assert.equal(result.body.status, 'NOT_READY');
    assert.equal(result.body.db, 'DOWN');
    assert.equal(JSON.stringify(result.body).includes('database unavailable'), false);
});
