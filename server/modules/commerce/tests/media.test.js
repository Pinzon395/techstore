'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { inspectImage, detectImage } = require('../media/image-inspector');
const { LocalMediaStorage } = require('../media/local-media-storage');
const { MediaValidationError, ValidationError } = require('../errors');

const PNG = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.from([0, 0, 0, 13, 73, 72, 68, 82])
]);

test('inspector valida firma magica, MIME y checksum', () => {
    const result = inspectImage(PNG, { declaredMimeType: 'image/png', maxBytes: 1024 });
    assert.equal(result.mimeType, 'image/png');
    assert.equal(result.extension, 'png');
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
    assert.equal(detectImage(PNG).mimeType, 'image/png');
});

test('inspector rechaza MIME falso y exceso de tamano', () => {
    assert.throws(
        () => inspectImage(PNG, { declaredMimeType: 'image/jpeg', maxBytes: 1024 }),
        MediaValidationError
    );
    assert.throws(
        () => inspectImage(PNG, { declaredMimeType: 'image/png', maxBytes: 4 }),
        MediaValidationError
    );
});

test('storage local genera UUID y bloquea traversal', async (t) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pixon-commerce-media-'));
    t.after(async () => fs.rm(root, { recursive: true, force: true }));
    const storage = new LocalMediaStorage({ rootDirectory: root });
    const saved = await storage.save({ buffer: PNG, extension: 'png' });
    assert.match(saved.storageKey, /^[0-9a-f-]{36}\.png$/);
    assert.equal(saved.url.includes(saved.storageKey), true);
    const opened = await storage.open(saved.storageKey);
    assert.equal(opened.sizeBytes, PNG.length);
    const chunks = [];
    for await (const chunk of opened.stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).equals(PNG), true);
    assert.throws(() => storage.resolveKey('../secret.png'), ValidationError);
    await storage.remove(saved.storageKey);
});
