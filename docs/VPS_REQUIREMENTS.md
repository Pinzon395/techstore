# VPS requirements

> [!WARNING]
> **DEPRECATED / OBSOLETO:** La opción VPS no administrado (KVM 2 / Ubuntu / cloudflared) ha sido sustituida por **Hostinger Cloud Startup (Managed Node.js + Managed MySQL)** para simplificar la administración a una sola plataforma sin necesidad de gestionar el sistema operativo. Ver [HOSTINGER_PRODUCTION.md](file:///c:/Users/Usuario/techstore/docs/HOSTINGER_PRODUCTION.md).
- **OS:** Ubuntu LTS.
- **Capacity target:** 2 vCPU, 8 GB RAM and 100 GB SSD minimum.
- **Node.js:** 22.17.0 (the version pinned in `.nvmrc`).
- **MariaDB:** 10.11 LTS or a compatible supported LTS; record the installed version during bootstrap.
- **Required ports:** SSH restricted to administration; MariaDB `3306` and Node `3000` private to the VPS. Public application traffic reaches the origin only through `cloudflared`.
- **Persistent paths:** `/opt/pixon/shared/.env` and `/opt/pixon/shared/data/{commerce-media,commerce-payment-proofs,cache,backups,tmp}`. Releases live in `/opt/pixon/releases`; `/opt/pixon/current` is the active symlink.
- **Services:** `mariadb`, `cloudflared`, `pixon.service`, `pixon-backup.service`, `pixon-backup.timer`, `pixon-backup-offsite.service` and `pixon-backup-offsite.timer` (installed always; inert until offsite credentials are set).
- **Environment variables:** `NODE_ENV`, `PORT`, `DATA_DIR`, `MEDIA_DIR`, `UPLOAD_DIR`, `CACHE_DIR`, `BACKUP_DIR`, `TEMP_DIR`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `PUBLIC_SITE_URL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_BACKUP_KEY`, email and payment-provider variables when enabled; `R2_BACKUP_BUCKET`, `R2_BACKUP_ENDPOINT`, `R2_BACKUP_ACCESS_KEY_ID`, `R2_BACKUP_SECRET_ACCESS_KEY`, `BACKUP_OFFSITE_KEY` once offsite backups are enabled.
- **Jobs:** commerce reservation release, appointment-hold expiration and the MariaDB-locked email-outbox replay run with the application.
- **Backups:** encrypted database backups and checksummed persistent-file archives under `/opt/pixon/shared/data/backups`, synced offsite daily once enabled (see `pixon-backup-offsite.timer`).
- **Additional packages for offsite backup:** `awscli` (used against the R2 S3-compatible endpoint) and `openssl` (already standard on Ubuntu).
