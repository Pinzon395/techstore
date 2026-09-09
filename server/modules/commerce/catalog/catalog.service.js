'use strict';

const crypto = require('crypto');
const sharp = require('sharp');
const {
    ValidationError,
    NotFoundError,
    ConflictError,
    InvalidStateError
} = require('../errors');
const { Money } = require('../money');
const { inspectImage } = require('../media/image-inspector');
const { runTransaction } = require('../transaction');
const {
    validateCatalogItem,
    validateCategory,
    validateBadge,
    validateAttributeDefinition,
    validateIdList,
    validateAttributeValues,
    positiveId,
    integerValue,
    booleanValue,
    plainText
} = require('../validation');

function transactionActor(actor) {
    return { ...actor, transactionId: crypto.randomUUID() };
}

async function createMediaVariants(storage, storageKey, buffer) {
    const source = sharp(buffer, { failOn: 'none' }).rotate();
    await Promise.all([
        ['thumb', 320, 72],
        ['card', 640, 82],
        ['large', 1440, 84]
    ].map(async ([name, width, quality]) => {
        const output = await source.clone().resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
        await storage.saveVariant(storageKey, name, output);
    }));
}

function assertPriceRelationship(item) {
    const base = Money.fromDecimal(item.base_price ?? item.pricing?.base_price, item.currency ?? item.pricing?.currency);
    const saleValue = item.sale_price ?? item.pricing?.sale_price;
    if (saleValue !== null && saleValue !== undefined) {
        const sale = Money.fromDecimal(saleValue, item.currency ?? item.pricing?.currency);
        if (sale.compare(base) > 0) {
            throw new ValidationError('El precio promocional no puede superar el precio base', {
                field: 'sale_price'
            });
        }
    }
}

function normalizeTypedAttribute(definition, entry) {
    const base = {
        definition_id: definition.id,
        sort_order: entry.sort_order,
        value_text: null,
        value_number: null,
        value_boolean: null,
        value_date: null,
        value_json: null
    };
    const field = `attribute.${definition.attribute_key}`;
    if (definition.data_type === 'TEXT') {
        base.value_text = plainText(entry.value, { field, max: 4000, required: true, multiline: true });
    } else if (definition.data_type === 'INTEGER' || definition.data_type === 'DECIMAL') {
        const raw = String(entry.value ?? '').trim();
        const pattern = definition.data_type === 'INTEGER'
            ? /^-?(?:0|[1-9]\d{0,11})$/
            : /^-?(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/;
        if (!pattern.test(raw)) {
            throw new ValidationError(`${definition.label} debe ser numerico`, { field });
        }
        base.value_number = raw;
    } else if (definition.data_type === 'BOOLEAN') {
        base.value_boolean = booleanValue(entry.value, { field }) ? 1 : 0;
    } else if (definition.data_type === 'DATE') {
        const raw = String(entry.value ?? '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
            throw new ValidationError(`${definition.label} debe ser una fecha valida`, { field });
        }
        base.value_date = raw;
    } else if (definition.data_type === 'JSON') {
        if (entry.value === undefined) throw new ValidationError(`${definition.label} es obligatorio`, { field });
        const serialized = JSON.stringify(entry.value);
        if (serialized.length > 16000) throw new ValidationError(`${definition.label} es demasiado grande`, { field });
        base.value_json = serialized;
    } else {
        throw new ValidationError('Tipo de atributo no soportado', { definition_id: definition.id });
    }
    return base;
}

class CatalogService {
    constructor({ pool, repository, audit, storage, mediaMaxBytes }) {
        this.pool = pool;
        this.repository = repository;
        this.audit = audit;
        this.storage = storage;
        this.mediaMaxBytes = mediaMaxBytes;
    }

    async listPublic(filters) {
        return this.repository.listPublic(filters);
    }

    async getPublicBySlug(slug) {
        const item = await this.repository.getPublicBySlug(slug);
        if (!item) throw new NotFoundError('Publicacion');
        return item;
    }

    async listAdmin(filters) {
        return this.repository.listAdmin(filters);
    }

    async getAdminById(id) {
        const item = await this.repository.getAdminById(positiveId(id));
        if (!item) throw new NotFoundError('Publicacion');
        return item;
    }

    async listProductKinds() {
        return this.repository.listProductKinds();
    }

    async createItem(payload, actor) {
        const input = validateCatalogItem(payload);
        assertPriceRelationship(input);
        const categoryIds = validateIdList(payload.category_ids || [], 'category_ids');
        const badgeIds = validateIdList(payload.badge_ids || [], 'badge_ids');
        const attributes = validateAttributeValues(payload.attributes || []);
        const txActor = transactionActor(actor);

        const id = await runTransaction(this.pool, async (connection) => {
            if (input.product_kind_code) {
                const kind = await this.repository.getProductKind(input.product_kind_code, connection);
                if (!kind) throw new ValidationError('El tipo de producto no existe o esta desactivado');
                if (kind.item_type !== input.item_type) {
                    throw new ValidationError('El tipo de producto no corresponde a la familia seleccionada');
                }
            }
            await this.#validateRelations(connection, categoryIds, badgeIds);
            const typedAttributes = await this.#normalizeAttributes(connection, attributes);
            const itemId = await this.repository.createItem(connection, {
                ...input,
                public_id: crypto.randomUUID(),
                created_by: txActor.userId,
                updated_by: txActor.userId
            });
            await this.repository.replaceItemCategories(connection, itemId, categoryIds);
            await this.repository.replaceItemBadges(connection, itemId, badgeIds);
            await this.repository.replaceItemAttributes(connection, itemId, typedAttributes);
            await this.audit.write(connection, {
                actor: txActor,
                action: 'catalog.create',
                entity: 'catalog_item',
                entityId: itemId,
                after: { ...input, category_ids: categoryIds, badge_ids: badgeIds, attributes }
            });
            return itemId;
        });
        return this.getAdminById(id);
    }

    async updateItem(idValue, payload, actor) {
        const id = positiveId(idValue);
        const expectedVersion = integerValue(payload?.version, {
            field: 'version', min: 1, max: 2_000_000_000
        });
        const txActor = transactionActor(actor);
        await runTransaction(this.pool, async (connection) => {
            const before = await this.repository.getAdminById(id, connection, { forUpdate: true });
            if (!before) throw new NotFoundError('Publicacion');
            if (before.version !== expectedVersion) {
                throw new ConflictError('La publicacion fue modificada por otra persona', {
                    expected_version: expectedVersion,
                    current_version: before.version
                });
            }
            if (before.status === 'ARCHIVED') {
                throw new InvalidStateError('Una publicacion archivada no puede editarse');
            }

            const changes = validateCatalogItem(payload, {
                partial: true,
                currentCurrency: before.pricing.currency
            });
            const projectedKind = Object.prototype.hasOwnProperty.call(changes, 'product_kind_code')
                ? changes.product_kind_code
                : before.product_kind_code;
            const projectedItemType = changes.item_type ?? before.item_type;
            if (projectedKind) {
                const kind = await this.repository.getProductKind(projectedKind, connection);
                if (!kind) throw new ValidationError('El tipo de producto no existe o esta desactivado');
                if (kind.item_type !== projectedItemType) {
                    throw new ValidationError('El tipo de producto no corresponde a la familia seleccionada');
                }
            }
            const projectedCurrency = changes.currency ?? before.pricing.currency;
            const projected = {
                base_price: changes.base_price ?? before.pricing.base_price,
                sale_price: Object.prototype.hasOwnProperty.call(changes, 'sale_price')
                    ? changes.sale_price
                    : before.pricing.sale_price,
                currency: projectedCurrency
            };
            assertPriceRelationship(projected);

            let categoryIds;
            if (Object.prototype.hasOwnProperty.call(payload, 'category_ids')) {
                categoryIds = validateIdList(payload.category_ids, 'category_ids');
                if (categoryIds.length === 0) {
                    throw new ValidationError('Se requiere al menos una categoria');
                }
            }
            let badgeIds;
            if (Object.prototype.hasOwnProperty.call(payload, 'badge_ids')) {
                badgeIds = validateIdList(payload.badge_ids, 'badge_ids');
            }
            let attributes;
            let typedAttributes;
            if (Object.prototype.hasOwnProperty.call(payload, 'attributes')) {
                attributes = validateAttributeValues(payload.attributes);
                typedAttributes = await this.#normalizeAttributes(connection, attributes);
            }
            await this.#validateRelations(connection, categoryIds || [], badgeIds || []);

            changes.updated_by = txActor.userId;
            const changed = await this.repository.updateItem(connection, id, changes, expectedVersion);
            if (!changed) throw new ConflictError('La publicacion cambio durante la actualizacion');
            if (categoryIds) await this.repository.replaceItemCategories(connection, id, categoryIds);
            if (badgeIds) await this.repository.replaceItemBadges(connection, id, badgeIds);
            if (typedAttributes) await this.repository.replaceItemAttributes(connection, id, typedAttributes);

            await this.audit.write(connection, {
                actor: txActor,
                action: 'catalog.update',
                entity: 'catalog_item',
                entityId: id,
                before,
                after: {
                    ...changes,
                    ...(categoryIds ? { category_ids: categoryIds } : {}),
                    ...(badgeIds ? { badge_ids: badgeIds } : {}),
                    ...(attributes ? { attributes } : {})
                }
            });
        });
        return this.getAdminById(id);
    }

    async publishItem(idValue, actor) {
        const id = positiveId(idValue);
        const txActor = transactionActor(actor);
        await runTransaction(this.pool, async (connection) => {
            const before = await this.repository.getAdminById(id, connection, { forUpdate: true });
            if (!before) throw new NotFoundError('Publicacion');
            if (['ARCHIVED', 'SOLD', 'RESERVED'].includes(before.status)) {
                throw new InvalidStateError(`No se puede publicar desde el estado ${before.status}`);
            }
            assertPriceRelationship(before);
            if (before.categories.length === 0) {
                throw new ValidationError('Asigna al menos una categoria antes de publicar');
            }
            if (!before.short_description || !before.description) {
                throw new ValidationError('Completa la descripcion corta y la descripcion antes de publicar');
            }
            const missingAttributes = await this.repository.findMissingRequiredAttributes(connection, id);
            if (missingAttributes.length > 0) {
                throw new ValidationError('Faltan atributos obligatorios para publicar', {
                    attributes: missingAttributes.map((attribute) => ({
                        id: attribute.id,
                        key: attribute.attribute_key,
                        label: attribute.label
                    }))
                });
            }
            const changed = await this.repository.publishItem(connection, id);
            if (!changed) throw new ConflictError('La publicacion no se pudo activar');
            await this.audit.write(connection, {
                actor: txActor,
                action: 'catalog.publish',
                entity: 'catalog_item',
                entityId: id,
                before: { status: before.status },
                after: { status: 'ACTIVE' }
            });
        });
        return this.getAdminById(id);
    }

    async archiveItem(idValue, actor) {
        const id = positiveId(idValue);
        const txActor = transactionActor(actor);
        await runTransaction(this.pool, async (connection) => {
            const before = await this.repository.getAdminById(id, connection, { forUpdate: true });
            if (!before) throw new NotFoundError('Publicacion');
            if (before.status === 'ARCHIVED') return;
            await this.repository.archiveItem(connection, id, txActor.userId);
            await this.audit.write(connection, {
                actor: txActor,
                action: 'catalog.archive',
                entity: 'catalog_item',
                entityId: id,
                before: { status: before.status },
                after: { status: 'ARCHIVED' }
            });
        });
        return this.getAdminById(id);
    }

    async duplicateItem(idValue, actor) {
        const id = positiveId(idValue);
        const txActor = transactionActor(actor);
        const newId = await runTransaction(this.pool, async (connection) => {
            const before = await this.repository.getAdminById(id, connection, { forUpdate: true });
            if (!before) throw new NotFoundError('Publicacion');
            const suffix = crypto.randomBytes(3).toString('hex');
            const copyId = await this.repository.duplicateItem(connection, id, {
                publicId: crypto.randomUUID(),
                slug: `${String(before.slug).slice(0, 187)}-copia-${suffix}`,
                name: `${String(before.name).slice(0, 168)} (copia)`,
                userId: txActor.userId
            });
            if (!copyId) throw new ConflictError('No fue posible duplicar la publicacion');
            await this.audit.write(connection, {
                actor: txActor,
                action: 'catalog.duplicate',
                entity: 'catalog_item',
                entityId: copyId,
                metadata: { source_id: id }
            });
            return copyId;
        });
        return this.getAdminById(newId);
    }

    async hideItem(idValue, actor) {
        const id = positiveId(idValue);
        const txActor = transactionActor(actor);
        await runTransaction(this.pool, async (connection) => {
            const before = await this.repository.getAdminById(id, connection, { forUpdate: true });
            if (!before) throw new NotFoundError('Publicacion');
            const changed = await this.repository.hideItem(connection, id, txActor.userId);
            if (!changed) throw new InvalidStateError('Solo una publicacion activa puede desactivarse');
            await this.audit.write(connection, {
                actor: txActor, action: 'catalog.hide', entity: 'catalog_item', entityId: id,
                before: { status: before.status }, after: { status: 'HIDDEN' }
            });
        });
        return this.getAdminById(id);
    }

    async deleteItem(idValue, actor) {
        const id = positiveId(idValue);
        const txActor = transactionActor(actor);
        await runTransaction(this.pool, async (connection) => {
            const before = await this.repository.getAdminById(id, connection, { forUpdate: true });
            if (!before) throw new NotFoundError('Publicacion');
            if (!['DRAFT', 'ARCHIVED'].includes(before.status)) {
                throw new InvalidStateError('Solo se pueden eliminar borradores o publicaciones archivadas');
            }
            const changed = await this.repository.softDeleteItem(connection, id, txActor.userId);
            if (!changed) throw new ConflictError('La publicacion cambio antes de eliminarse');
            await this.audit.write(connection, {
                actor: txActor,
                action: 'catalog.delete',
                entity: 'catalog_item',
                entityId: id,
                before,
                after: { deleted: true }
            });
        });
        return { id, deleted: true };
    }

    async replaceCategories(idValue, rawIds, actor) {
        const id = positiveId(idValue);
        const categoryIds = validateIdList(rawIds, 'category_ids');
        if (categoryIds.length === 0) throw new ValidationError('Se requiere al menos una categoria');
        return this.#replaceRelations({
            id,
            actor,
            relation: 'categories',
            validate: async (connection) => this.#validateRelations(connection, categoryIds, []),
            replace: (connection) => this.repository.replaceItemCategories(connection, id, categoryIds),
            after: categoryIds
        });
    }

    async replaceBadges(idValue, rawIds, actor) {
        const id = positiveId(idValue);
        const badgeIds = validateIdList(rawIds, 'badge_ids');
        return this.#replaceRelations({
            id,
            actor,
            relation: 'badges',
            validate: async (connection) => this.#validateRelations(connection, [], badgeIds),
            replace: (connection) => this.repository.replaceItemBadges(connection, id, badgeIds),
            after: badgeIds
        });
    }

    async replaceAttributes(idValue, rawAttributes, actor) {
        const id = positiveId(idValue);
        const attributes = validateAttributeValues(rawAttributes);
        return this.#replaceRelations({
            id,
            actor,
            relation: 'attributes',
            validate: async () => {},
            replace: async (connection) => {
                const typed = await this.#normalizeAttributes(connection, attributes);
                await this.repository.replaceItemAttributes(connection, id, typed);
            },
            after: attributes
        });
    }

    async #replaceRelations({ id, actor, relation, validate, replace, after }) {
        const txActor = transactionActor(actor);
        await runTransaction(this.pool, async (connection) => {
            const before = await this.repository.getAdminById(id, connection, { forUpdate: true });
            if (!before) throw new NotFoundError('Publicacion');
            if (before.status === 'ARCHIVED') throw new InvalidStateError('La publicacion esta archivada');
            await validate(connection);
            await replace(connection);
            await this.repository.touchItem(connection, id, txActor.userId);
            await this.audit.write(connection, {
                actor: txActor,
                action: `catalog.${relation}.replace`,
                entity: 'catalog_item',
                entityId: id,
                before: before[relation],
                after
            });
        });
        return this.getAdminById(id);
    }

    async #validateRelations(connection, categoryIds, badgeIds) {
        const categories = await this.repository.getCategoriesByIds(connection, categoryIds);
        if (categories.length !== categoryIds.length || categories.some((category) => category.status === 'ARCHIVED')) {
            throw new ValidationError('Una o mas categorias no existen o estan archivadas');
        }
        const badges = await this.repository.getBadgesByIds(connection, badgeIds);
        if (badges.length !== badgeIds.length || badges.some((badge) => badge.status === 'ARCHIVED')) {
            throw new ValidationError('Uno o mas badges no existen o estan archivados');
        }
    }

    async #normalizeAttributes(connection, attributes) {
        const ids = attributes.map((entry) => entry.definition_id);
        const definitions = await this.repository.getAttributeDefinitionsByIds(connection, ids);
        if (definitions.length !== ids.length || definitions.some((definition) => definition.status === 'ARCHIVED')) {
            throw new ValidationError('Una o mas definiciones de atributo no existen o estan archivadas');
        }
        const byId = new Map(definitions.map((definition) => [String(definition.id), definition]));
        return attributes.map((entry) => normalizeTypedAttribute(byId.get(String(entry.definition_id)), entry));
    }

    async listCategories(publicView = false) {
        return this.repository.listCategories({ publicView });
    }

    async createCategory(payload, actor) {
        const category = validateCategory(payload);
        const txActor = transactionActor(actor);
        const id = await runTransaction(this.pool, async (connection) => {
            if (category.parent_id && !await this.repository.getCategoryById(category.parent_id, connection)) {
                throw new ValidationError('La categoria padre no existe');
            }
            const createdId = await this.repository.createCategory(connection, category);
            await this.audit.write(connection, {
                actor: txActor, action: 'catalog.category.create', entity: 'catalog_category',
                entityId: createdId, after: category
            });
            return createdId;
        });
        return this.repository.getCategoryById(id);
    }

    async updateCategory(idValue, payload, actor) {
        const id = positiveId(idValue);
        const changes = validateCategory(payload, { partial: true });
        const txActor = transactionActor(actor);
        await runTransaction(this.pool, async (connection) => {
            const before = await this.repository.getCategoryById(id, connection, { forUpdate: true });
            if (!before) throw new NotFoundError('Categoria');
            if (changes.parent_id === id) throw new ValidationError('Una categoria no puede ser su propio padre');
            if (changes.parent_id && !await this.repository.getCategoryById(changes.parent_id, connection)) {
                throw new ValidationError('La categoria padre no existe');
            }
            if (changes.parent_id && await this.repository.categoryWouldCycle(connection, id, changes.parent_id)) {
                throw new ValidationError('La jerarquia de categorias produciria un ciclo');
            }
            await this.repository.updateCategory(connection, id, changes);
            await this.audit.write(connection, {
                actor: txActor, action: 'catalog.category.update', entity: 'catalog_category',
                entityId: id, before, after: changes
            });
        });
        return this.repository.getCategoryById(id);
    }

    async listBadges(publicView = false) {
        return this.repository.listBadges({ publicView });
    }

    async createBadge(payload, actor) {
        return this.#createDictionary({
            payload, actor, validate: validateBadge,
            create: (connection, value) => this.repository.createBadge(connection, value),
            get: (id) => this.repository.getBadgeById(id),
            action: 'catalog.badge.create', entity: 'catalog_badge'
        });
    }

    async updateBadge(idValue, payload, actor) {
        return this.#updateDictionary({
            idValue, payload, actor, validate: validateBadge,
            get: (id, connection) => this.repository.getBadgeById(id, connection),
            update: (connection, id, changes) => this.repository.updateBadge(connection, id, changes),
            action: 'catalog.badge.update', entity: 'catalog_badge'
        });
    }

    async listAttributeDefinitions() {
        return this.repository.listAttributeDefinitions();
    }

    async createAttributeDefinition(payload, actor) {
        return this.#createDictionary({
            payload, actor, validate: validateAttributeDefinition,
            create: (connection, value) => this.repository.createAttributeDefinition(connection, value),
            get: (id) => this.repository.getAttributeDefinitionById(id),
            action: 'catalog.attribute.create', entity: 'catalog_attribute_definition'
        });
    }

    async updateAttributeDefinition(idValue, payload, actor) {
        return this.#updateDictionary({
            idValue, payload, actor, validate: validateAttributeDefinition,
            get: (id, connection) => this.repository.getAttributeDefinitionById(id, connection),
            update: (connection, id, changes) => this.repository.updateAttributeDefinition(connection, id, changes),
            action: 'catalog.attribute.update', entity: 'catalog_attribute_definition'
        });
    }

    async replaceCategoryAttributes(categoryIdValue, payload, actor) {
        const categoryId = positiveId(categoryIdValue);
        if (!Array.isArray(payload)) throw new ValidationError('attributes debe ser una lista');
        const entries = payload.map((entry, index) => ({
            definition_id: positiveId(entry?.definition_id, `attributes[${index}].definition_id`),
            required: booleanValue(entry?.required, { field: `attributes[${index}].required` }),
            sort_order: integerValue(entry?.sort_order, {
                field: `attributes[${index}].sort_order`, min: -32768, max: 32767, fallback: index
            })
        }));
        if (new Set(entries.map((entry) => entry.definition_id)).size !== entries.length) {
            throw new ValidationError('Hay definiciones de atributo duplicadas');
        }
        const txActor = transactionActor(actor);
        await runTransaction(this.pool, async (connection) => {
            const category = await this.repository.getCategoryById(categoryId, connection, { forUpdate: true });
            if (!category) throw new NotFoundError('Categoria');
            const definitions = await this.repository.getAttributeDefinitionsByIds(
                connection, entries.map((entry) => entry.definition_id)
            );
            if (definitions.length !== entries.length) throw new ValidationError('Una definicion no existe');
            await this.repository.replaceCategoryAttributes(connection, categoryId, entries);
            await this.audit.write(connection, {
                actor: txActor, action: 'catalog.category.attributes.replace',
                entity: 'catalog_category', entityId: categoryId, after: entries
            });
        });
        return this.repository.getCategoryById(categoryId);
    }

    async uploadMedia(idValue, { buffer, contentType, altText, sortOrder, primary }, actor) {
        const id = positiveId(idValue);
        const inspected = inspectImage(buffer, {
            declaredMimeType: contentType,
            maxBytes: this.mediaMaxBytes
        });
        const safeAlt = plainText(altText, { field: 'alt_text', max: 255, nullable: true });
        const order = integerValue(sortOrder, {
            field: 'sort_order', min: -32768, max: 32767, fallback: 0
        });
        const isPrimary = booleanValue(primary, { field: 'is_primary', fallback: false });

        const stored = await this.storage.save({ buffer, extension: inspected.extension });
        try {
            await createMediaVariants(this.storage, stored.storageKey, buffer);
        } catch (error) {
            await this.storage.remove(stored.storageKey).catch(() => {});
            throw error;
        }
        const txActor = transactionActor(actor);
        let mediaId;
        try {
            mediaId = await runTransaction(this.pool, async (connection) => {
                const item = await this.repository.getAdminById(id, connection, { forUpdate: true });
                if (!item) throw new NotFoundError('Publicacion');
                if (item.status === 'ARCHIVED') throw new InvalidStateError('La publicacion esta archivada');
                const createdId = await this.repository.addMedia(connection, {
                    catalog_item_id: id,
                    media_type: 'IMAGE',
                    storage_key: stored.storageKey,
                    url: stored.url,
                    mime_type: inspected.mimeType,
                    size_bytes: inspected.sizeBytes,
                    checksum_sha256: inspected.sha256,
                    alt_text: safeAlt || item.name,
                    sort_order: order,
                    is_primary: isPrimary,
                    metadata: { validated_magic_bytes: true }
                });
                await this.repository.touchItem(connection, id, txActor.userId);
                await this.audit.write(connection, {
                    actor: txActor,
                    action: 'catalog.media.create',
                    entity: 'catalog_media',
                    entityId: createdId,
                    after: {
                        catalog_item_id: id,
                        mime_type: inspected.mimeType,
                        size_bytes: inspected.sizeBytes,
                        checksum_sha256: inspected.sha256
                    }
                });
                return createdId;
            });
        } catch (error) {
            await this.storage.remove(stored.storageKey).catch(() => {});
            throw error;
        }
        const row = await this.repository.getMediaById(id, mediaId);
        return this.repository.mapMedia(row);
    }

    async updateMedia(idValue, mediaIdValue, payload, actor) {
        const id = positiveId(idValue);
        const mediaId = positiveId(mediaIdValue, 'media_id');
        const changes = {};
        if (Object.prototype.hasOwnProperty.call(payload || {}, 'alt_text')) {
            changes.alt_text = plainText(payload.alt_text, { field: 'alt_text', max: 255, nullable: true });
        }
        if (Object.prototype.hasOwnProperty.call(payload || {}, 'sort_order')) {
            changes.sort_order = integerValue(payload.sort_order, {
                field: 'sort_order', min: -32768, max: 32767
            });
        }
        if (Object.prototype.hasOwnProperty.call(payload || {}, 'is_primary')) {
            changes.is_primary = booleanValue(payload.is_primary, { field: 'is_primary' });
        }
        if (Object.keys(changes).length === 0) throw new ValidationError('No hay cambios de medio');
        const txActor = transactionActor(actor);
        await runTransaction(this.pool, async (connection) => {
            const before = await this.repository.getMediaById(id, mediaId, connection, { forUpdate: true });
            if (!before) throw new NotFoundError('Imagen');
            await this.repository.updateMedia(connection, id, mediaId, changes);
            await this.repository.touchItem(connection, id, txActor.userId);
            await this.audit.write(connection, {
                actor: txActor, action: 'catalog.media.update', entity: 'catalog_media',
                entityId: mediaId, before, after: changes
            });
        });
        return this.repository.mapMedia(await this.repository.getMediaById(id, mediaId));
    }

    async deleteMedia(idValue, mediaIdValue, actor) {
        const id = positiveId(idValue);
        const mediaId = positiveId(mediaIdValue, 'media_id');
        const txActor = transactionActor(actor);
        const removed = await runTransaction(this.pool, async (connection) => {
            const media = await this.repository.deleteMedia(connection, id, mediaId);
            if (!media) throw new NotFoundError('Imagen');
            await this.repository.touchItem(connection, id, txActor.userId);
            await this.audit.write(connection, {
                actor: txActor, action: 'catalog.media.delete', entity: 'catalog_media',
                entityId: mediaId, before: media
            });
            return media;
        });
        // Soft-delete preserves the binary for audit/history. A retention job may
        // physically purge unreferenced files after the configured recovery window.
        return { id: mediaId, deleted: true };
    }

    async #createDictionary({ payload, actor, validate, create, get, action, entity }) {
        const value = validate(payload);
        const txActor = transactionActor(actor);
        const id = await runTransaction(this.pool, async (connection) => {
            const createdId = await create(connection, value);
            await this.audit.write(connection, {
                actor: txActor, action, entity, entityId: createdId, after: value
            });
            return createdId;
        });
        return get(id);
    }

    async #updateDictionary({ idValue, payload, actor, validate, get, update, action, entity }) {
        const id = positiveId(idValue);
        const changes = validate(payload, { partial: true });
        const txActor = transactionActor(actor);
        await runTransaction(this.pool, async (connection) => {
            const before = await get(id, connection);
            if (!before) throw new NotFoundError('Recurso');
            await update(connection, id, changes);
            await this.audit.write(connection, {
                actor: txActor, action, entity, entityId: id, before, after: changes
            });
        });
        return get(id);
    }
}

module.exports = { CatalogService, assertPriceRelationship, normalizeTypedAttribute };
