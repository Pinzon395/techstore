'use strict';

const ITEM_TYPES = Object.freeze([
    'PRODUCT',
    'EQUIPMENT',
    'HARDWARE',
    'SERVICE',
    'BUNDLE'
]);

const ITEM_CONDITIONS = Object.freeze([
    'NEW',
    'USED',
    'REFURBISHED',
    'OPEN_BOX',
    'FOR_PARTS',
    'NOT_APPLICABLE'
]);

const CATALOG_STATUSES = Object.freeze([
    'DRAFT',
    'ACTIVE',
    'RESERVED',
    'SOLD',
    'OUT_OF_STOCK',
    'HIDDEN',
    'ARCHIVED'
]);

const PUBLIC_CATALOG_STATUSES = Object.freeze([
    'ACTIVE',
    'RESERVED',
    'SOLD',
    'OUT_OF_STOCK'
]);

const CATEGORY_STATUSES = Object.freeze(['ACTIVE', 'HIDDEN', 'ARCHIVED']);
const BADGE_STATUSES = Object.freeze(['ACTIVE', 'HIDDEN', 'ARCHIVED']);
const ATTRIBUTE_STATUSES = Object.freeze(['ACTIVE', 'HIDDEN', 'ARCHIVED']);
const ATTRIBUTE_DATA_TYPES = Object.freeze(['TEXT', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'JSON']);
const MEDIA_TYPES = Object.freeze(['IMAGE', 'VIDEO', 'DOCUMENT', 'TEST_REPORT']);

const CATALOG_PERMISSIONS = Object.freeze({
    VIEW: 'catalog.view',
    CREATE: 'catalog.create',
    UPDATE: 'catalog.update',
    DELETE: 'catalog.delete',
    PUBLISH: 'catalog.publish',
    ARCHIVE: 'catalog.archive',
    MEDIA_MANAGE: 'catalog.media.manage'
});

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const DEFAULT_MEDIA_MAX_BYTES = 8 * 1024 * 1024;

module.exports = {
    ITEM_TYPES,
    ITEM_CONDITIONS,
    CATALOG_STATUSES,
    PUBLIC_CATALOG_STATUSES,
    CATEGORY_STATUSES,
    BADGE_STATUSES,
    ATTRIBUTE_STATUSES,
    ATTRIBUTE_DATA_TYPES,
    MEDIA_TYPES,
    CATALOG_PERMISSIONS,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    DEFAULT_MEDIA_MAX_BYTES
};
