'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { GooglePlacesClient } = require('../google-places.client');
const { createGoogleReviewsModule } = require('../google-reviews.routes');

const silent = { info() {}, error() {} };

function placeResponse() {
    return {
        id: 'ChIJtest',
        displayName: { text: 'Pixon PC' },
        rating: 4.9,
        userRatingCount: 37,
        googleMapsUri: 'https://maps.google.com/?cid=1',
        googleMapsLinks: { reviewsUri: 'https://maps.google.com/reviews', writeAReviewUri: 'https://maps.google.com/write' },
        reviews: [
            { name: 'places/ChIJtest/reviews/a', rating: 5, text: { text: 'Excelente servicio' }, relativePublishTimeDescription: 'hace una semana', publishTime: '2026-10-15T00:00:00Z', authorAttribution: { displayName: 'Ana' } },
            { name: 'places/ChIJtest/reviews/b', rating: 5, text: { text: '' }, authorAttribution: { displayName: 'Sin texto' } }
        ]
    };
}

function mockFetch(calls, { fail = false } = {}) {
    return async (url, init) => {
        calls.push({ url, headers: init.headers });
        if (fail) return { ok: false, status: 403, json: async () => ({ error: { message: 'API key not valid' } }) };
        if (url.endsWith(':searchText')) return { ok: true, status: 200, json: async () => ({ places: [{ id: 'ChIJtest' }] }) };
        return { ok: true, status: 200, json: async () => placeResponse() };
    };
}

test('sin clave no llama a Google', async () => {
    const calls = [];
    const client = new GooglePlacesClient({ apiKey: '', fetchImpl: mockFetch(calls), logger: silent });
    assert.deepEqual(await client.getPlace(), { ok: false, reason: 'UNCONFIGURED' });
    assert.equal(calls.length, 0);
});

test('resuelve place id, mapea reseñas, descarta vacías y usa caché', async () => {
    const calls = [];
    let now = 1_000;
    const client = new GooglePlacesClient({ apiKey: 'k', placeId: '', fetchImpl: mockFetch(calls), now: () => now, ttlMs: 60_000, logger: silent });
    const first = await client.getPlace();
    assert.equal(first.ok, true);
    assert.equal(first.data.rating, 4.9);
    assert.equal(first.data.total, 37);
    assert.equal(first.data.reviews.length, 1);
    assert.equal(first.data.reviews[0].name, 'Ana');
    assert.equal(calls.length, 2); // searchText + details
    assert.equal(calls[1].headers['X-Goog-Api-Key'], 'k');
    await client.getPlace();
    assert.equal(calls.length, 2, 'dentro del TTL no vuelve a consultar');
    now += 61_000;
    await client.getPlace();
    assert.equal(calls.length, 3, 'tras el TTL consulta solo details (place id recordado)');
});

test('si Google falla conserva los últimos datos buenos', async () => {
    const calls = [];
    let now = 0;
    let fail = false;
    const fetchImpl = async (url, init) => mockFetch(calls, { fail })(url, init);
    const client = new GooglePlacesClient({ apiKey: 'k', placeId: 'ChIJtest', fetchImpl, now: () => now, ttlMs: 1000, logger: silent });
    assert.equal((await client.getPlace()).ok, true);
    fail = true;
    now += 2000;
    const stale = await client.getPlace();
    assert.equal(stale.ok, true);
    assert.equal(stale.data.total, 37);
});

test('endpoint /api/reviews/google combina Places y reseñas aprobadas sin duplicar', async () => {
    const calls = [];
    const placesClient = new GooglePlacesClient({ apiKey: 'k', placeId: 'ChIJtest', fetchImpl: mockFetch(calls), logger: silent });
    const pool = {
        async execute(sql) {
            if (/FROM google_reviews/.test(sql)) {
                return [[
                    { id: 1, reviewer_display_name: 'Ana', star_rating: 5, comment: 'Excelente servicio', google_create_time: '2026-10-15', review_url: '' },
                    { id: 2, reviewer_display_name: 'Luis', star_rating: 5, comment: 'Rápido y claro', google_create_time: '2026-10-10', review_url: '' }
                ]];
            }
            return [[]];
        }
    };
    const mod = createGoogleReviewsModule({ pool, requireAdmin: (_q, _r, n) => n(), rateLimiter: (_q, _r, n) => n(), dbEmitter: null, placesClient });
    const app = express();
    app.use('/api/reviews', mod.publicRouter);
    const server = app.listen(0);
    try {
        const { port } = server.address();
        const body = await (await fetch(`http://127.0.0.1:${port}/api/reviews/google`)).json();
        assert.equal(body.source, 'google_places');
        assert.equal(body.total, 37);
        assert.equal(body.rating, 4.9);
        assert.deepEqual(body.reviews.map((r) => r.name), ['Ana', 'Luis']);
    } finally {
        server.close();
    }
});
