'use strict';

const crypto = require('crypto');
const path = require('path');
const { MediaValidationError } = require('../errors');

const PROOF_FORMATS = Object.freeze({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf'
});

function detectProof(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mimeType: 'image/jpeg', extension: 'jpg' };
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        return { mimeType: 'image/png', extension: 'png' };
    }
    if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        return { mimeType: 'image/webp', extension: 'webp' };
    }
    if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return { mimeType: 'application/pdf', extension: 'pdf' };
    return null;
}

function sanitizeOriginalName(value, fallbackExtension) {
    const base = path.basename(String(value || `comprobante.${fallbackExtension}`))
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/[^\p{L}\p{N}._ -]/gu, '_')
        .slice(0, 255);
    return base || `comprobante.${fallbackExtension}`;
}

function inspectPaymentProof(buffer, { declaredMimeType, originalName, maxBytes = 10 * 1024 * 1024 } = {}) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new MediaValidationError('El comprobante esta vacio');
    if (buffer.length > maxBytes) throw new MediaValidationError('El comprobante excede el tamano permitido', { maxBytes });
    const declared = String(declaredMimeType || '').split(';', 1)[0].trim().toLowerCase();
    const detected = detectProof(buffer);
    if (!detected || !PROOF_FORMATS[detected.mimeType]) {
        throw new MediaValidationError('Comprobante no valido. Usa JPEG, PNG, WebP o PDF');
    }
    if (declared && declared !== detected.mimeType) {
        throw new MediaValidationError('El MIME declarado no coincide con el contenido real');
    }
    const safeName = sanitizeOriginalName(originalName, detected.extension);
    const providedExtension = path.extname(safeName).slice(1).toLowerCase();
    const compatible = detected.extension === 'jpg' ? ['jpg', 'jpeg'] : [detected.extension];
    if (providedExtension && !compatible.includes(providedExtension)) {
        throw new MediaValidationError('La extension no coincide con el contenido real');
    }
    return {
        ...detected,
        originalName: safeName,
        sizeBytes: buffer.length,
        sha256: crypto.createHash('sha256').update(buffer).digest('hex')
    };
}

module.exports = { PROOF_FORMATS, detectProof, inspectPaymentProof, sanitizeOriginalName };

