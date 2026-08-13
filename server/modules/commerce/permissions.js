'use strict';

const { AuthenticationError, AuthorizationError } = require('./errors');

function permissionCandidates(permission) {
    const [namespace] = String(permission).split('.');
    return [permission, `${namespace}.*`, '*'];
}

function createPermissionService({ pool, legacyAdminBypass = true }) {
    if (!pool || typeof pool.execute !== 'function') throw new TypeError('Se requiere pool');
    let capabilityPromise;

    async function detectCapabilities() {
        if (!capabilityPromise) {
            capabilityPromise = pool.execute(
                `SELECT table_name
                 FROM information_schema.tables
                 WHERE table_schema = DATABASE()
                   AND table_name IN ('permissions', 'role_permissions')`
            ).then(([rows]) => new Set(rows.map((row) => row.table_name || row.TABLE_NAME)));
        }
        return capabilityPromise;
    }

    async function hasPermission(user, permission) {
        if (!user?.id) return false;
        const candidates = permissionCandidates(permission);

        const [[identity]] = await pool.execute(
            `SELECT r.id AS role_id, r.code AS role_code, r.is_staff
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.id = ? AND u.is_active = 1 AND u.deleted_at IS NULL
             LIMIT 1`,
            [user.id]
        );
        if (!identity) return false;
        if (legacyAdminBypass && identity.role_code === 'admin') return true;

        const placeholders = candidates.map(() => '?').join(', ');
        const [[direct]] = await pool.execute(
            `SELECT 1 AS allowed
             FROM user_permissions
             WHERE user_id = ? AND permission IN (${placeholders})
             LIMIT 1`,
            [user.id, ...candidates]
        );
        if (direct?.allowed === 1) return true;

        const capabilities = await detectCapabilities();
        if (!capabilities.has('permissions') || !capabilities.has('role_permissions')) return false;

        const [[roleGrant]] = await pool.execute(
            `SELECT 1 AS allowed
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = ? AND p.code IN (${placeholders})
             LIMIT 1`,
            [identity.role_id, ...candidates]
        );
        return roleGrant?.allowed === 1;
    }

    function requirePermission(permission) {
        return async function permissionMiddleware(req, _res, next) {
            try {
                const authenticated = typeof req.isAuthenticated === 'function'
                    ? req.isAuthenticated()
                    : Boolean(req.user);
                if (!authenticated || !req.user?.id) return next(new AuthenticationError());
                if (!await hasPermission(req.user, permission)) {
                    return next(new AuthorizationError(permission));
                }
                return next();
            } catch (error) {
                return next(error);
            }
        };
    }

    return { hasPermission, requirePermission, detectCapabilities };
}

module.exports = { createPermissionService, permissionCandidates };
