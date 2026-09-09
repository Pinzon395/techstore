'use strict';

const path = require('path');
const express = require('express');
const { CatalogRepository } = require('./catalog/catalog.repository');
const { CatalogService } = require('./catalog/catalog.service');
const { LegacyCatalogAdapter } = require('./catalog/legacy.adapter');
const { createPublicCatalogRoutes, createAdminCatalogRoutes } = require('./catalog/catalog.routes');
const { createPermissionService } = require('./permissions');
const { createAuditWriter } = require('./audit');
const { LocalMediaStorage } = require('./media/local-media-storage');
const { createMediaRoutes } = require('./media/media.routes');
const { commerceErrorHandler } = require('./response');
const { DEFAULT_MEDIA_MAX_BYTES } = require('./constants');
const { runTransaction } = require('./transaction');
const { PaymentProofStorage } = require('./orders/proof-storage');
const { PromotionService } = require('./orders/promotion.service');
const { SettingsService } = require('./orders/settings.service');
const { CommerceNotificationService } = require('./orders/notification.service');
const { InventoryService } = require('./orders/inventory.service');
const { OrderService } = require('./orders/order.service');
const { AdminOrderService } = require('./orders/admin-order.service');
const { PaymentProviderService } = require('./orders/payment-provider.service');
const { RefundService, ReturnService } = require('./orders/refund.service');
const {
    createPublicOrderRoutes,
    createMeOrderRoutes,
    createAdminOrderRoutes
} = require('./orders/order.routes');
const emailService = require('../../services/email.service');
const persistentPaths = require('../../config/persistent-paths');

function createCommerceModule({
    pool,
    dashboardService,
    mediaStorage,
    mediaDirectory = persistentPaths.mediaDir,
    mediaMaxBytes = DEFAULT_MEDIA_MAX_BYTES,
    proofDirectory = persistentPaths.proofDir,
    proofMaxBytes = 10 * 1024 * 1024,
    legacyAdminBypass = true
}) {
    if (!pool) throw new TypeError('createCommerceModule requiere pool');

    const repository = new CatalogRepository(pool);
    const permissionService = createPermissionService({ pool, legacyAdminBypass });
    const audit = createAuditWriter();
    const storage = mediaStorage || new LocalMediaStorage({ rootDirectory: mediaDirectory });
    const service = new CatalogService({
        pool,
        repository,
        audit,
        storage,
        mediaMaxBytes
    });
    const legacyAdapter = new LegacyCatalogAdapter({ repository });

    const proofStorage = new PaymentProofStorage({ rootDirectory: proofDirectory });
    const notifications = new CommerceNotificationService({ pool });
    const providerService = new PaymentProviderService({ pool, runTransaction, audit });
    const settingsService = new SettingsService({ pool, runTransaction, audit, providerService });
    const promotionService = new PromotionService({ pool, runTransaction, audit });
    const inventoryService = new InventoryService({ pool, runTransaction, audit, notifications });
    const orderService = new OrderService({
        pool, runTransaction, promotionService, settingsService, inventoryService,
        notifications, audit, proofStorage, proofMaxBytes, emails: emailService
    });
    const adminOrderService = new AdminOrderService({
        pool, runTransaction, orderService, inventoryService, notifications,
        settingsService, audit, emails: emailService, dashboardService
    });
    const refundService = new RefundService({ pool, runTransaction, audit, providerService });
    const returnService = new ReturnService({ pool, runTransaction, audit });
    let maintenanceTimer = null;

    const publicRouter = createPublicCatalogRoutes({ service });
    const adminRouter = createAdminCatalogRoutes({ service, permissionService, mediaMaxBytes });
    const mediaRouter = createMediaRoutes({ repository, storage, permissionService });
    publicRouter.use(createPublicOrderRoutes({
        orderService, settingsService, promotionService, providerService, proofMaxBytes
    }));
    adminRouter.use(createAdminOrderRoutes({
        adminService: adminOrderService,
        inventoryService,
        promotionService,
        settingsService,
        notifications,
        permissionService,
        proofStorage,
        runTransaction,
        pool,
        refundService,
        returnService,
        providerService
    }));
    const meRouter = createMeOrderRoutes({ orderService });

    return {
        publicRouter,
        adminRouter,
        mediaRouter,
        meRouter,
        errorHandler: commerceErrorHandler,
        service,
        repository,
        legacyAdapter,
        permissionService,
        storage,
        proofStorage,
        orderService,
        adminOrderService,
        refundService,
        returnService,
        providerService,
        startMaintenance({ intervalMs = 5 * 60 * 1000 } = {}) {
            if (maintenanceTimer) return maintenanceTimer;
            const run = () => orderService.runReservationMaintenance().catch((error) => {
                console.error('[commerce-maintenance] No se pudieron liberar reservas vencidas:', error.message);
            });
            maintenanceTimer = setInterval(run, Math.max(60_000, intervalMs));
            maintenanceTimer.unref?.();
            run();
            return maintenanceTimer;
        },
        stopMaintenance() {
            if (maintenanceTimer) clearInterval(maintenanceTimer);
            maintenanceTimer = null;
        },
        mounts: Object.freeze({
            public: '/api/commerce',
            admin: '/api/admin/commerce',
            media: '/api/commerce/media',
            me: '/api/me'
        }),
        mount(app) {
            if (!app || typeof app.use !== 'function') throw new TypeError('mount requiere Express app');
            app.use('/api/commerce/media', mediaRouter);
            app.use('/api/commerce', publicRouter);
            app.use('/api/admin/commerce', adminRouter);
            app.use('/api/me', meRouter);
            app.use(commerceErrorHandler);
            this.startMaintenance();
            return app;
        }
    };
}

module.exports = createCommerceModule;
module.exports.createCommerceModule = createCommerceModule;
module.exports.commerceErrorHandler = commerceErrorHandler;
