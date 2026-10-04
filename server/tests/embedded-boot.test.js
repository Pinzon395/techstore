'use strict';

// Regresión Hostinger: el host carga server/server.js con require() desde un
// wrapper y sirve el `app` exportado (require.main !== module). Antes, bootstrap()
// no se ejecutaba y todas las rutas respondían "Cannot GET".
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');

const SERVER = path.join(__dirname, '..', 'server.js');
const WRAPPER = `
const http = require('http');
const app = require(${JSON.stringify(SERVER)});
const srv = http.createServer(app).listen(0, '127.0.0.1', () => {
  console.log('PORT=' + srv.address().port);
});
`;

function startEmbedded(env) {
    const child = spawn(process.execPath, ['-e', WRAPPER], {
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '';
    child.stderr.on('data', (chunk) => { out += chunk; });
    const port = new Promise((resolve, reject) => {
        child.stdout.on('data', (chunk) => {
            out += chunk;
            const m = out.match(/PORT=(\d+)/);
            if (m) resolve(Number(m[1]));
        });
        child.on('exit', (code) => reject(new Error(`wrapper salió (${code}): ${out}`)));
    });
    return { child, port };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('modo embebido: registra health/ready/version y no responde "Cannot GET" con DB caída', async (t) => {
    const { child, port } = startEmbedded({
        NODE_ENV: 'production',
        SESSION_SECRET: 'x'.repeat(48),
        DB_HOST: '127.0.0.1',
        DB_PORT: '1',
        DB_USER: 'nobody',
        DB_PASSWORD: 'nobody',
        DB_NAME: 'nobody',
        GOOGLE_CALLBACK_URL: 'https://pixon.com.mx/auth/google/callback'
    });
    t.after(() => child.kill());
    const base = `http://127.0.0.1:${await port}`;

    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, 'UP');

    const version = await fetch(`${base}/api/version`);
    assert.equal(version.status, 200);
    assert.ok((await version.json()).commit);

    // Dar tiempo a que initDB falle (ECONNREFUSED) sin matar el proceso.
    await wait(1500);
    assert.equal(child.exitCode, null, 'el proceso embebido no debe salir si falla la DB');

    const ready = await fetch(`${base}/api/ready`);
    assert.equal(ready.status, 503);
    assert.equal((await ready.json()).db, 'DOWN');

    const other = await fetch(`${base}/api/comments`);
    assert.equal(other.status, 503);
    assert.doesNotMatch(await other.text(), /Cannot GET/);
});
