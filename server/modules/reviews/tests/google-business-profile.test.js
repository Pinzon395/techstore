'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { bareId } = require('../google-business-profile.client');
const { GoogleReviewsSyncService } = require('../google-reviews.sync');

function fakeRepository(state = {}) {
    const saved = { ...state };
    return {
        saved,
        upserts: [],
        getOAuthCredentials: async () => ({ access_token: 'tok', refresh_token: 'r', access_token_expires_at: new Date(Date.now() + 3600e3) }),
        getSyncState: async () => ({ ...saved }),
        updateSyncState: async (patch) => { Object.assign(saved, patch); },
        upsertFromApi: async function (review) { this.upserts.push(review); return { row: { google_review_id: review.reviewId }, isNew: false }; },
        markMissingAsRemoved: async () => 0,
        updateAccessToken: async () => {}
    };
}

function service(repository, discovered) {
    const prev = { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET, acc: process.env.GOOGLE_REVIEWS_ACCOUNT_ID, loc: process.env.GOOGLE_REVIEWS_LOCATION_ID };
    process.env.GOOGLE_CLIENT_ID = 'id.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    process.env.GOOGLE_REVIEWS_OAUTH_CALLBACK_URL = process.env.GOOGLE_REVIEWS_OAUTH_CALLBACK_URL || 'https://example.test/cb';
    delete process.env.GOOGLE_REVIEWS_ACCOUNT_ID;
    delete process.env.GOOGLE_REVIEWS_LOCATION_ID;
    const svc = new GoogleReviewsSyncService({ repository, dbEmitter: null });
    Object.assign(process.env, { GOOGLE_CLIENT_ID: prev.id || '', GOOGLE_CLIENT_SECRET: prev.secret || '' });
    if (prev.acc) process.env.GOOGLE_REVIEWS_ACCOUNT_ID = prev.acc;
    if (prev.loc) process.env.GOOGLE_REVIEWS_LOCATION_ID = prev.loc;
    svc.calls = { discover: 0, list: [] };
    svc.client.discoverLocation = async () => { svc.calls.discover += 1; return discovered; };
    svc.client.listAllReviews = async (args) => { svc.calls.list.push(args); return { reviews: [{ reviewId: 'r1' }], averageRating: 4.9, totalReviewCount: 40 }; };
    return svc;
}

test('bareId acepta el formato corto y el formato con prefijo', () => {
    assert.equal(bareId('123'), '123');
    assert.equal(bareId('accounts/123'), '123');
    assert.equal(bareId('accounts/1/locations/456'), '456');
    assert.equal(bareId(''), '');
});

test('sin IDs configurados, descubre la ficha una vez y la guarda', async () => {
    const repo = fakeRepository();
    const svc = service(repo, { accountId: '111', locationId: '222', title: 'Pixon PC' });
    const result = await svc.runSync();
    assert.equal(result.ok, true);
    assert.equal(svc.calls.discover, 1);
    assert.deepEqual([svc.calls.list[0].accountId, svc.calls.list[0].locationId], ['111', '222']);
    assert.equal(repo.saved.account_id, '111');
    assert.equal(repo.saved.average_rating, 4.9);

    // Una instancia nueva (reinicio del servidor) usa lo guardado sin volver a descubrir.
    const svc2 = service(repo, null);
    assert.equal((await svc2.runSync()).ok, true);
    assert.equal(svc2.calls.discover, 0);
});

test('si la cuenta autorizada no tiene la ficha, reporta el error sin lanzar', async () => {
    const repo = fakeRepository();
    const svc = service(repo, null);
    const result = await svc.runSync();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'LOCATION_NOT_FOUND');
    assert.equal(repo.saved.last_sync_status, 'ERROR');
    assert.equal(svc.calls.list.length, 0);
});
