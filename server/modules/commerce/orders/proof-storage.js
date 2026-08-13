'use strict';

const crypto = require('crypto');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { NotFoundError, ValidationError } = require('../errors');

const PROOF_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|pdf)$/i;

class PaymentProofStorage {
    constructor({ rootDirectory }) {
        if (!rootDirectory) throw new TypeError('rootDirectory es obligatorio');
        this.rootDirectory = path.resolve(rootDirectory);
    }

    resolveKey(key) {
        if (!PROOF_KEY_PATTERN.test(String(key || ''))) throw new ValidationError('Clave de comprobante no valida');
        const resolved = path.resolve(this.rootDirectory, key);
        if (path.dirname(resolved) !== this.rootDirectory) throw new ValidationError('Ruta de comprobante no valida');
        return resolved;
    }

    async save(buffer, extension) {
        await fsPromises.mkdir(this.rootDirectory, { recursive: true, mode: 0o750 });
        const key = `${crypto.randomUUID()}.${extension}`;
        await fsPromises.writeFile(this.resolveKey(key), buffer, { flag: 'wx', mode: 0o640 });
        return key;
    }

    async remove(key) {
        try { await fsPromises.unlink(this.resolveKey(key)); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    }

    async open(key) {
        const target = this.resolveKey(key);
        try {
            const stat = await fsPromises.stat(target);
            if (!stat.isFile()) throw new NotFoundError('Comprobante');
            return { stream: fs.createReadStream(target), sizeBytes: stat.size };
        } catch (error) {
            if (error?.code === 'ENOENT') throw new NotFoundError('Comprobante');
            throw error;
        }
    }
}

module.exports = { PaymentProofStorage, PROOF_KEY_PATTERN };

