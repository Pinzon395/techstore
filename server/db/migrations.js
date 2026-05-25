'use strict';

function runtimeMigrationsEnabled() {
    if (process.env.ALLOW_RUNTIME_MIGRATIONS === 'true') return true;
    return process.env.NODE_ENV !== 'production';
}

function warnRuntimeMigrationsDisabled() {
    console.warn('[db] Migraciones runtime desactivadas en produccion. Ejecuta migraciones controladas o define ALLOW_RUNTIME_MIGRATIONS=true temporalmente.');
}

module.exports = {
    runtimeMigrationsEnabled,
    warnRuntimeMigrationsDisabled
};
