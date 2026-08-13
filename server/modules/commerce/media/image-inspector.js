'use strict';

const { MediaValidationError } = require('../errors');

const IMAGE_FORMATS = Object.freeze({
    'image/jpeg': { extension: 'jpg' },
    'image/png': { extension: 'png' },
    'image/webp': { extension: 'webp' }
});

function detectImage(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { mimeType: 'image/jpeg', extension: 'jpg' };
    }
    if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        return { mimeType: 'image/png', extension: 'png' };
    }
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        return { mimeType: 'image/webp', extension: 'webp' };
    }
    return null;
}

function inspectImage(buffer, { declaredMimeType, maxBytes }) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new MediaValidationError('El cuerpo debe contener una imagen');
    }
    if (buffer.length > maxBytes) {
        throw new MediaValidationError('La imagen excede el tamano permitido', {
            maxBytes,
            receivedBytes: buffer.length
        });
    }

    const declared = String(declaredMimeType || '').split(';', 1)[0].trim().toLowerCase();
    if (!IMAGE_FORMATS[declared]) {
        throw new MediaValidationError('Formato no permitido', {
            allowed: Object.keys(IMAGE_FORMATS)
        });
    }
    const detected = detectImage(buffer);
    if (!detected || detected.mimeType !== declared) {
        throw new MediaValidationError('El contenido del archivo no coincide con su MIME real');
    }

    return {
        ...detected,
        sizeBytes: buffer.length,
        sha256: require('crypto').createHash('sha256').update(buffer).digest('hex')
    };
}

module.exports = { IMAGE_FORMATS, detectImage, inspectImage };
