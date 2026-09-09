'use strict';

const fs = require('fs');
const path = require('path');

// These defaults preserve the current local layout. Production must set
// DATA_DIR to the shared directory outside a release (for example
// /opt/pixon/shared/data).
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'storage'));

function configuredDirectory(variable, fallback) {
    const value = String(process.env[variable] || '').trim();
    return path.resolve(value || fallback);
}

const paths = Object.freeze({
    dataDir,
    mediaDir: configuredDirectory('MEDIA_DIR', path.join(dataDir, 'commerce-media')),
    proofDir: configuredDirectory('UPLOAD_DIR', path.join(dataDir, 'commerce-payment-proofs')),
    cacheDir: configuredDirectory('CACHE_DIR', path.join(dataDir, 'cache')),
    backupDir: configuredDirectory('BACKUP_DIR', path.join(dataDir, 'backups')),
    tempDir: configuredDirectory('TEMP_DIR', path.join(dataDir, 'tmp'))
});

function ensurePersistentDirectories() {
    for (const directory of Object.values(paths)) {
        fs.mkdirSync(directory, { recursive: true, mode: 0o750 });
    }
    return paths;
}

module.exports = { ...paths, ensurePersistentDirectories };
