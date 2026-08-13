'use strict';

const express = require('express');
const { ah } = require('../../../middlewares/async.middleware');
const { CATALOG_PERMISSIONS } = require('../constants');
const { requestAuditContext } = require('../audit');
const { sendData } = require('../response');
const {
    validatePublicFilters,
    validateAdminFilters,
    parseSlug
} = require('../validation');

function paginationMeta(filters, total) {
    return {
        page: filters.page,
        page_size: filters.pageSize,
        total,
        total_pages: Math.ceil(total / filters.pageSize),
        has_next: filters.page * filters.pageSize < total,
        has_previous: filters.page > 1
    };
}

function createPublicCatalogRoutes({ service }) {
    const router = express.Router();

    router.get('/catalog', ah(async (req, res) => {
        const filters = validatePublicFilters(req.query);
        const result = await service.listPublic(filters);
        return sendData(res, result.items, { meta: paginationMeta(filters, result.total) });
    }));

    router.get('/catalog/categories', ah(async (_req, res) => {
        return sendData(res, await service.listCategories(true));
    }));

    router.get('/catalog/badges', ah(async (_req, res) => {
        return sendData(res, await service.listBadges(true));
    }));

    router.get('/catalog/:slug', ah(async (req, res) => {
        const slug = parseSlug(req.params.slug, { required: true });
        return sendData(res, await service.getPublicBySlug(slug));
    }));

    return router;
}

function createAdminCatalogRoutes({ service, permissionService, mediaMaxBytes }) {
    const router = express.Router();
    const canView = permissionService.requirePermission(CATALOG_PERMISSIONS.VIEW);
    const canCreate = permissionService.requirePermission(CATALOG_PERMISSIONS.CREATE);
    const canUpdate = permissionService.requirePermission(CATALOG_PERMISSIONS.UPDATE);
    const canPublish = permissionService.requirePermission(CATALOG_PERMISSIONS.PUBLISH);
    const canArchive = permissionService.requirePermission(CATALOG_PERMISSIONS.ARCHIVE);
    const canDelete = permissionService.requirePermission(CATALOG_PERMISSIONS.DELETE);
    const canManageMedia = permissionService.requirePermission(CATALOG_PERMISSIONS.MEDIA_MANAGE);

    router.get('/catalog', canView, ah(async (req, res) => {
        const filters = validateAdminFilters(req.query);
        const result = await service.listAdmin(filters);
        return sendData(res, result.items, { meta: paginationMeta(filters, result.total) });
    }));

    router.get('/product-kinds', canView, ah(async (_req, res) => {
        return sendData(res, await service.listProductKinds());
    }));

    router.post('/catalog', canCreate, ah(async (req, res) => {
        return sendData(res, await service.createItem(req.body, requestAuditContext(req)), { status: 201 });
    }));

    router.get('/catalog/:id', canView, ah(async (req, res) => {
        return sendData(res, await service.getAdminById(req.params.id));
    }));

    router.patch('/catalog/:id', canUpdate, ah(async (req, res) => {
        return sendData(res, await service.updateItem(req.params.id, req.body, requestAuditContext(req)));
    }));

    router.post('/catalog/:id/publish', canPublish, ah(async (req, res) => {
        return sendData(res, await service.publishItem(req.params.id, requestAuditContext(req)));
    }));

    router.post('/catalog/:id/archive', canArchive, ah(async (req, res) => {
        return sendData(res, await service.archiveItem(req.params.id, requestAuditContext(req)));
    }));

    router.post('/catalog/:id/hide', canPublish, ah(async (req, res) => {
        return sendData(res, await service.hideItem(req.params.id, requestAuditContext(req)));
    }));

    router.post('/catalog/:id/duplicate', canCreate, ah(async (req, res) => {
        return sendData(res, await service.duplicateItem(req.params.id, requestAuditContext(req)), { status: 201 });
    }));

    router.delete('/catalog/:id', canDelete, ah(async (req, res) => {
        return sendData(res, await service.deleteItem(req.params.id, requestAuditContext(req)));
    }));

    router.put('/catalog/:id/categories', canUpdate, ah(async (req, res) => {
        return sendData(res, await service.replaceCategories(
            req.params.id, req.body?.category_ids, requestAuditContext(req)
        ));
    }));

    router.put('/catalog/:id/badges', canUpdate, ah(async (req, res) => {
        return sendData(res, await service.replaceBadges(
            req.params.id, req.body?.badge_ids, requestAuditContext(req)
        ));
    }));

    router.put('/catalog/:id/attributes', canUpdate, ah(async (req, res) => {
        return sendData(res, await service.replaceAttributes(
            req.params.id, req.body?.attributes, requestAuditContext(req)
        ));
    }));

    const rawImage = express.raw({
        type: ['image/jpeg', 'image/png', 'image/webp'],
        limit: mediaMaxBytes
    });
    router.post('/catalog/:id/media', canManageMedia, rawImage, ah(async (req, res) => {
        return sendData(res, await service.uploadMedia(req.params.id, {
            buffer: req.body,
            contentType: req.get('content-type'),
            altText: req.get('x-alt-text') || req.get('x-file-name'),
            sortOrder: req.get('x-sort-order'),
            primary: req.get('x-is-primary')
        }, requestAuditContext(req)), { status: 201 });
    }));

    router.patch('/catalog/:id/media/:mediaId', canManageMedia, ah(async (req, res) => {
        return sendData(res, await service.updateMedia(
            req.params.id, req.params.mediaId, req.body, requestAuditContext(req)
        ));
    }));

    router.delete('/catalog/:id/media/:mediaId', canManageMedia, ah(async (req, res) => {
        return sendData(res, await service.deleteMedia(
            req.params.id, req.params.mediaId, requestAuditContext(req)
        ));
    }));

    router.get('/categories', canView, ah(async (_req, res) => {
        return sendData(res, await service.listCategories(false));
    }));

    router.post('/categories', canCreate, ah(async (req, res) => {
        return sendData(res, await service.createCategory(req.body, requestAuditContext(req)), { status: 201 });
    }));

    router.patch('/categories/:id', canUpdate, ah(async (req, res) => {
        return sendData(res, await service.updateCategory(req.params.id, req.body, requestAuditContext(req)));
    }));

    router.put('/categories/:id/attributes', canUpdate, ah(async (req, res) => {
        return sendData(res, await service.replaceCategoryAttributes(
            req.params.id, req.body?.attributes, requestAuditContext(req)
        ));
    }));

    router.get('/badges', canView, ah(async (_req, res) => {
        return sendData(res, await service.listBadges(false));
    }));

    router.post('/badges', canCreate, ah(async (req, res) => {
        return sendData(res, await service.createBadge(req.body, requestAuditContext(req)), { status: 201 });
    }));

    router.patch('/badges/:id', canUpdate, ah(async (req, res) => {
        return sendData(res, await service.updateBadge(req.params.id, req.body, requestAuditContext(req)));
    }));

    router.get('/attribute-definitions', canView, ah(async (_req, res) => {
        return sendData(res, await service.listAttributeDefinitions());
    }));

    router.post('/attribute-definitions', canCreate, ah(async (req, res) => {
        return sendData(res, await service.createAttributeDefinition(
            req.body, requestAuditContext(req)
        ), { status: 201 });
    }));

    router.patch('/attribute-definitions/:id', canUpdate, ah(async (req, res) => {
        return sendData(res, await service.updateAttributeDefinition(
            req.params.id, req.body, requestAuditContext(req)
        ));
    }));

    return router;
}

module.exports = { createPublicCatalogRoutes, createAdminCatalogRoutes, paginationMeta };
