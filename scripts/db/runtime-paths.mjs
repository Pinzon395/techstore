import path from 'node:path';

// DATA_DIR is shared across immutable releases. The fallback preserves the
// existing local developer layout until the VPS environment is configured.
export const dataDirectory = path.resolve(
  process.env.DATA_DIR || path.join(process.cwd(), 'server', 'storage')
);

export const backupDirectory = path.resolve(
  process.env.BACKUP_DIR || path.join(dataDirectory, 'backups')
);
