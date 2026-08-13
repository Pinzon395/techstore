'use strict';

const { ValidationError, ConflictError } = require('../errors');
const { positiveId } = require('../validation');

const LEGACY_TYPES = new Set(['PRODUCT', 'SERVICE', 'BUILD', 'COMPONENT']);

class LegacyCatalogAdapter {
    constructor({ repository }) {
        this.repository = repository;
    }

    normalizeType(value) {
        const type = String(value || '').trim().toUpperCase();
        if (!LEGACY_TYPES.has(type)) {
            throw new ValidationError('Tipo de entidad legada no soportado', {
                allowed: [...LEGACY_TYPES]
            });
        }
        return type;
    }

    async resolvePublic(legacyType, legacyId) {
        return this.repository.findPublicLegacyItem(
            this.normalizeType(legacyType),
            positiveId(legacyId, 'legacy_id')
        );
    }

    async link(connection, { catalogItemId, legacyType, legacyId, sourceSnapshot }) {
        const type = this.normalizeType(legacyType);
        const id = positiveId(legacyId, 'legacy_id');
        const existing = await this.repository.findLegacyLink(connection, type, id, { forUpdate: true });
        if (existing && Number(existing.catalog_item_id) !== Number(catalogItemId)) {
            throw new ConflictError('La entidad legada ya esta enlazada a otra publicacion');
        }
        if (!existing) {
            await this.repository.createLegacyLink(
                connection, positiveId(catalogItemId, 'catalog_item_id'), type, id, sourceSnapshot
            );
        }
        return { catalog_item_id: catalogItemId, legacy_entity_type: type, legacy_entity_id: id };
    }
}

module.exports = { LegacyCatalogAdapter, LEGACY_TYPES };
