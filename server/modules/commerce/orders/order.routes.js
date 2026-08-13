'use strict';

const express = require('express');
const { ah } = require('../../../middlewares/async.middleware');
const { AuthenticationError, NotFoundError } = require('../errors');
const { requestAuditContext } = require('../audit');
const { sendData } = require('../response');
const { positiveId } = require('../validation');
const {
    validateCreateOrder, validateFolio, validateLookupEmail, validateStatus
} = require('./order-validation');

function paginationMeta(result) {
    return {
        page: result.page,
        page_size: result.pageSize,
        total: result.total,
        total_pages: Math.ceil(result.total / result.pageSize),
        has_next: result.page * result.pageSize < result.total,
        has_previous: result.page > 1
    };
}

function requireAuthenticated(req, _res, next) {
    const authenticated = typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : Boolean(req.user);
    if (!authenticated || !req.user?.id) return next(new AuthenticationError());
    return next();
}

function createPublicOrderRoutes({ orderService, settingsService, promotionService, providerService, proofMaxBytes }) {
    const router = express.Router();

    router.get('/settings/payment-methods', ah(async (_req, res) => {
        return sendData(res, await settingsService.getPaymentMethods(undefined, { enabledOnly: true }));
    }));

    router.get('/promotions', ah(async (_req, res) => sendData(res, await promotionService.listPublic())));

    router.post('/webhooks/:provider', ah(async (req, res) => {
        const result = await providerService.handleWebhook(req.params.provider, req.body, req.headers, req.query);
        return sendData(res, result);
    }));

    router.post('/orders', ah(async (req, res) => {
        const input = validateCreateOrder(req.body, req.get('x-idempotency-key'));
        const actor = { ...requestAuditContext(req), userId: req.user?.id || null };
        const result = await orderService.create(input, actor);
        return sendData(res, result.order, { status: result.replayed ? 200 : 201, meta: { idempotency_replayed: result.replayed } });
    }));

    router.get('/orders/:folio', ah(async (req, res) => {
        const folio = validateFolio(req.params.folio);
        const rawEmail = req.query.email || req.get('x-customer-email');
        const email = rawEmail ? validateLookupEmail(rawEmail) : null;
        const userId = req.user?.id || null;
        if (!email && !userId) throw new NotFoundError('Pedido');
        return sendData(res, await orderService.lookup(folio, { email, userId }));
    }));

    const rawProof = express.raw({
        type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        limit: proofMaxBytes
    });
    router.post('/orders/:folio/payment-proof', rawProof, ah(async (req, res) => {
        const folio = validateFolio(req.params.folio);
        const rawEmail = req.query.email || req.get('x-customer-email');
        const email = rawEmail ? validateLookupEmail(rawEmail) : null;
        const userId = req.user?.id || null;
        if (!email && !userId) throw new NotFoundError('Pedido');
        const actor = { ...requestAuditContext(req), userId };
        const order = await orderService.uploadProof(folio, { email, userId }, {
            buffer: req.body,
            contentType: req.get('content-type'),
            fileName: req.get('x-file-name')
        }, actor);
        return sendData(res, order, { status: 201 });
    }));

    return router;
}

function createMeOrderRoutes({ orderService }) {
    const router = express.Router();
    router.get('/orders', requireAuthenticated, ah(async (req, res) => {
        const result = await orderService.listMine(req.user.id, req.query);
        return sendData(res, result.rows, { meta: paginationMeta(result) });
    }));
    return router;
}

function createAdminOrderRoutes({
    adminService, inventoryService, promotionService, settingsService,
    notifications, permissionService, proofStorage, runTransaction, pool,
    refundService, returnService, providerService
}) {
    const router = express.Router();
    const canViewOrders = permissionService.requirePermission('orders.view');
    const canManageOrders = permissionService.requirePermission('orders.manage');
    const canViewPayments = permissionService.requirePermission('payments.view');
    const canApprovePayments = permissionService.requirePermission('payments.approve');
    const canRefundPayments = permissionService.requirePermission('payments.refund');
    const canViewInventory = permissionService.requirePermission('inventory.view');
    const canAdjustInventory = permissionService.requirePermission('inventory.adjust');
    const canManagePromotions = permissionService.requirePermission('promotions.manage');
    const canViewReports = permissionService.requirePermission('reports.view');

    router.get('/orders', canViewOrders, ah(async (req, res) => {
        const result = await adminService.list(req.query);
        return sendData(res, result.rows, { meta: { ...paginationMeta(result), summary: result.summary } });
    }));
    router.get('/orders/:id', canViewOrders, ah(async (req, res) => sendData(res, await adminService.detail(req.params.id))));
    router.patch('/orders/:id/status', canManageOrders, ah(async (req, res) => {
        validateStatus(req.body?.status);
        return sendData(res, await adminService.updateStatus(req.params.id, req.body, requestAuditContext(req)));
    }));
    router.patch('/orders/:id/ticket', canManageOrders, ah(async (req, res) => {
        return sendData(res, await adminService.linkTicket(req.params.id, req.body, requestAuditContext(req)));
    }));
    router.post('/orders/:id/payments/:pid/approve', canApprovePayments, ah(async (req, res) => {
        const result = await adminService.approvePayment(req.params.id, req.params.pid, requestAuditContext(req));
        return sendData(res, result.order, { meta: { idempotency_replayed: result.replayed } });
    }));
    router.post('/orders/:id/payments/:pid/reject', canApprovePayments, ah(async (req, res) => {
        return sendData(res, await adminService.rejectPayment(req.params.id, req.params.pid, req.body, requestAuditContext(req)));
    }));
    router.get('/payments/:pid/refunds', canViewPayments, ah(async (req, res) => {
        return sendData(res, await refundService.list(req.params.pid));
    }));
    router.post('/orders/:id/payments/:pid/refunds', canRefundPayments, ah(async (req, res) => {
        const result = await refundService.request(req.params.id, req.params.pid, req.body, requestAuditContext(req));
        return sendData(res, result.refund, { status: result.replayed ? 200 : 201, meta: { idempotency_replayed: result.replayed } });
    }));
    router.post('/refunds/:rid/complete', canRefundPayments, ah(async (req, res) => {
        return sendData(res, await refundService.complete(req.params.rid, req.body, requestAuditContext(req)));
    }));
    router.post('/refunds/:rid/cancel', canRefundPayments, ah(async (req, res) => {
        return sendData(res, await refundService.cancel(req.params.rid, requestAuditContext(req)));
    }));
    router.post('/orders/:id/returns', canManageOrders, ah(async (req, res) => {
        return sendData(res, await returnService.request(req.params.id, req.body, requestAuditContext(req)), { status: 201 });
    }));
    router.patch('/returns/:rid/status', canManageOrders, ah(async (req, res) => {
        return sendData(res, await returnService.updateStatus(req.params.rid, req.body, requestAuditContext(req)));
    }));

    router.get('/payments', canViewPayments, ah(async (req, res) => {
        const query = {
            ...req.query,
            q: req.query.q || '',
            status: req.query.order_status || undefined,
            payment_status: req.query.payment_status || undefined
        };
        const result = await adminService.list(query);
        return sendData(res, result.rows, { meta: { ...paginationMeta(result), summary: result.summary } });
    }));
    router.get('/payment-proofs/:key', canViewPayments, ah(async (req, res) => {
        const [[payment]] = await pool.execute('SELECT proof_mime FROM commerce_payments WHERE proof_storage_key = ? LIMIT 1', [req.params.key]);
        if (!payment) throw new NotFoundError('Comprobante');
        const file = await proofStorage.open(req.params.key);
        res.set({
            'Content-Type': payment.proof_mime,
            'Content-Length': String(file.sizeBytes),
            'Cache-Control': 'private, no-store',
            'Content-Disposition': 'inline',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox"
        });
        file.stream.on('error', (error) => res.destroy(error));
        file.stream.pipe(res);
    }));

    router.get('/inventory/movements', canViewInventory, ah(async (req, res) => {
        const result = await inventoryService.listMovements(req.query);
        return sendData(res, result.rows, { meta: { ...paginationMeta(result), summary: result.summary } });
    }));
    router.get('/inventory/items', canViewInventory, ah(async (req, res) => {
        const result = await inventoryService.listItems(req.query);
        return sendData(res, result.rows, { meta: { page: result.page, page_size: result.pageSize, total: result.total } });
    }));
    router.post('/inventory/adjust', canAdjustInventory, ah(async (req, res) => {
        return sendData(res, await inventoryService.adjust(req.body, requestAuditContext(req)), { status: 201 });
    }));
    router.get('/catalog/:id/bundle-items', canViewOrders, ah(async (req, res) => {
        return sendData(res, await inventoryService.getBundle(req.params.id));
    }));
    router.put('/catalog/:id/bundle-items', canManagePromotions, ah(async (req, res) => {
        return sendData(res, await inventoryService.replaceBundle(req.params.id, req.body, requestAuditContext(req)));
    }));

    router.get('/promotions', canManagePromotions, ah(async (req, res) => {
        const result = await promotionService.listAdmin(req.query);
        return sendData(res, result.rows, { meta: paginationMeta(result) });
    }));
    router.get('/promotions/:id', canManagePromotions, ah(async (req, res) => sendData(res, await promotionService.getAdmin(req.params.id))));
    router.post('/promotions', canManagePromotions, ah(async (req, res) => {
        return sendData(res, await promotionService.save(null, req.body, requestAuditContext(req)), { status: 201 });
    }));
    router.put('/promotions/:id', canManagePromotions, ah(async (req, res) => {
        return sendData(res, await promotionService.save(req.params.id, req.body, requestAuditContext(req)));
    }));
    router.patch('/promotions/:id', canManagePromotions, ah(async (req, res) => {
        return sendData(res, await promotionService.save(req.params.id, req.body, requestAuditContext(req)));
    }));
    router.delete('/promotions/:id', canManagePromotions, ah(async (req, res) => {
        return sendData(res, await promotionService.remove(req.params.id, requestAuditContext(req)));
    }));

    router.get('/settings/payment-methods', canManageOrders, ah(async (_req, res) => {
        return sendData(res, await settingsService.getPaymentMethods());
    }));
    router.put('/settings/payment-methods', canManageOrders, ah(async (req, res) => {
        return sendData(res, await settingsService.updatePaymentMethods(req.body, requestAuditContext(req)));
    }));
    router.get('/settings/payment-providers', canManageOrders, ah(async (_req, res) => {
        return sendData(res, await providerService.readiness());
    }));
    router.put('/settings/payment-providers', canManageOrders, ah(async (req, res) => {
        return sendData(res, await providerService.updateConfigs(req.body, requestAuditContext(req)));
    }));

    router.get('/notifications', canViewOrders, ah(async (req, res) => {
        const result = await notifications.listAdmin(req.query);
        return sendData(res, result.rows, { meta: { ...paginationMeta(result), unread: result.unread } });
    }));
    router.post('/notifications/:id/read', canViewOrders, ah(async (req, res) => {
        const id = positiveId(req.params.id, 'id');
        const changed = await runTransaction(pool, (connection) => notifications.markRead(connection, id));
        return sendData(res, { id, read: changed });
    }));

    router.get('/reports/dashboard', canViewReports, ah(async (req, res) => sendData(res, await adminService.dashboard(req.query))));

    return router;
}

module.exports = { createPublicOrderRoutes, createMeOrderRoutes, createAdminOrderRoutes, paginationMeta, requireAuthenticated };
