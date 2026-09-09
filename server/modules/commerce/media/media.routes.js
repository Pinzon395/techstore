'use strict';

const express = require('express');
const { PUBLIC_CATALOG_STATUSES } = require('../constants');
const { ah } = require('../../../middlewares/async.middleware');
const { NotFoundError } = require('../errors');

const MIME_BY_EXTENSION = Object.freeze({
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
});

function createMediaRoutes({ repository, storage, permissionService }) {
    const router = express.Router();

    router.get('/:storageKey', ah(async (req, res) => {
        const media = await repository.findMediaByStorageKey(req.params.storageKey);
        if (!media) throw new NotFoundError('Imagen');

        const publicItem = PUBLIC_CATALOG_STATUSES.includes(media.item_status)
            && media.item_deleted_at === null
            && media.published_at !== null
            && !(media.item_status === 'SOLD' && media.sold_display_mode === 'HIDE');
        if (!publicItem) {
            const authenticated = typeof req.isAuthenticated === 'function'
                ? req.isAuthenticated()
                : Boolean(req.user);
            if (!authenticated || !await permissionService.hasPermission(req.user, 'catalog.view')) {
                throw new NotFoundError('Imagen');
            }
        }

        const variant = typeof req.query.variant === 'string' ? req.query.variant : '';
        const requestedKey = ['thumb', 'card', 'large'].includes(variant)
            ? storage.variantKey(media.storage_key, variant)
            : media.storage_key;
        let file;
        let servedKey = requestedKey;
        try {
            file = await storage.open(requestedKey);
        } catch (error) {
            if (!variant) throw error;
            servedKey = media.storage_key;
            file = await storage.open(media.storage_key);
        }
        const extension = servedKey.split('.').pop().toLowerCase();
        res.set({
            'Content-Type': variant ? (MIME_BY_EXTENSION[extension] || 'application/octet-stream') : (media.mime_type || MIME_BY_EXTENSION[extension] || 'application/octet-stream'),
            'Content-Length': String(file.sizeBytes),
            'Cache-Control': publicItem ? 'public, max-age=31536000, immutable' : 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox"
        });
        file.stream.on('error', (error) => res.destroy(error));
        file.stream.pipe(res);
    }));

    return router;
}

module.exports = { createMediaRoutes };
