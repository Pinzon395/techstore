'use strict';

const crypto = require('crypto');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { NotFoundError, ValidationError } = require('../errors');

const STORAGE_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;

class LocalMediaStorage {
    constructor({ rootDirectory, publicBaseUrl = '/api/commerce/media' }) {
        if (!rootDirectory) throw new TypeError('rootDirectory es obligatorio');
        this.rootDirectory = path.resolve(rootDirectory);
        this.publicBaseUrl = String(publicBaseUrl).replace(/\/$/, '');
    }

    resolveKey(storageKey) {
        if (!STORAGE_KEY_PATTERN.test(String(storageKey || ''))) {
            throw new ValidationError('Clave de medio no valida');
        }
        const resolved = path.resolve(this.rootDirectory, storageKey);
        if (path.dirname(resolved) !== this.rootDirectory) {
            throw new ValidationError('Ruta de medio no valida');
        }
        return resolved;
    }

    async save({ buffer, extension }) {
        await fsPromises.mkdir(this.rootDirectory, { recursive: true, mode: 0o750 });
        const storageKey = `${crypto.randomUUID()}.${extension}`;
        const target = this.resolveKey(storageKey);
        await fsPromises.writeFile(target, buffer, { flag: 'wx', mode: 0o640 });
        return {
            storageKey,
            url: `${this.publicBaseUrl}/${encodeURIComponent(storageKey)}`
        };
    }

    async remove(storageKey) {
        const target = this.resolveKey(storageKey);
        try {
            await fsPromises.unlink(target);
        } catch (error) {
            if (error?.code !== 'ENOENT') throw error;
        }
    }

    async open(storageKey) {
        const target = this.resolveKey(storageKey);
        try {
            const stat = await fsPromises.stat(target);
            if (!stat.isFile()) throw new NotFoundError('Imagen');
            return { stream: fs.createReadStream(target), sizeBytes: stat.size };
        } catch (error) {
            if (error?.code === 'ENOENT') throw new NotFoundError('Imagen');
            throw error;
        }
    }
}

module.exports = { LocalMediaStorage, STORAGE_KEY_PATTERN };
