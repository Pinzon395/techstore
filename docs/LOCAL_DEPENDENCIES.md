# Local (PC) Dependencies — Migration Requirements

| Dependency | Current location | Used by | Production requirement | Migration required? | Target solution | Risk if not fixed |
|---|---|---|---|---|---|---|
| Public ingress | Cloudflare Tunnel (`cloudflared.exe`) running on the owner's Windows PC, tunnel `pixon-tunel` | All public traffic to pixon.com.mx | Must run 24/7 independent of any personal computer | YES | Same Cloudflare Tunnel, but the daemon runs on the VPS instead of the PC (`docs/PRODUCTION_HOSTING.md` already specifies this) | Site goes down whenever the PC is off/asleep/rebooted |
| App server | `node server/server.js`, started manually via `Encender_Web.bat` → `scripts/manage-web.ps1`, no supervisor | Entire backend + static site serving | Must auto-restart on crash/reboot, run without a logged-in user | YES | `systemd` unit `deploy/systemd/pixon.service` (already written, hardened: NoNewPrivileges/PrivateTmp/ProtectHome) | No auto-recovery from crash; requires the owner to be home to restart it |
| Database | MariaDB on `127.0.0.1:3306` on the PC | Everything (users, appointments, orders, repairs, sessions) | Persistent, backed up, reachable only from the app | YES | Same MariaDB engine, installed on the VPS, bound to 127.0.0.1 (no engine migration needed — schema/migrations already portable via `scripts/db/migrate.mjs`) | Total data loss if the PC dies; no uptime independent of the PC |
| Uploaded files (product media, payment proofs) | Local disk under `server/storage/` (or `DATA_DIR` if set) | Store/commerce module, order proof-of-payment | Must survive redeploys and be reachable without depending on the PC's filesystem | YES | Simplest: same local-disk model, but on the VPS's persistent path (`/opt/pixon/shared/data`, already coded in `persistent-paths.js`). No S3/R2 client exists in the code today — adding one is an *optional* future hardening step, not required for a single-VPS architecture | Files disappear if the PC's disk fails or folder is lost |
| Backups | Encrypted backup files land on local PC disk | Disaster recovery | Must exist independent of the PC, ideally with an offsite copy | YES (location only — the backup *tooling* is already production-grade) | Same scripts (`backup-encrypted.mjs`) writing to the VPS, with `BACKUP_DIR` outside the app's release folders; add periodic sync to Cloudflare R2 for offsite copy (optional but recommended given backups are the only real safety net) | A single-disk VPS with local-only backups still has one point of failure for backups specifically |
| Startup/monitoring | Windows-specific: `.bat` files, `manage-web.ps1`, `server/monitor.js` assuming a persistently running Node process on Windows | Local ops convenience | Must work on Linux without the owner's involvement | YES | `systemd` timers replace `monitor.js`'s scheduling role; `pixon-backup.timer` already written for daily 02:15 UTC backups | Backups/health checks stop silently if the PC is off; nobody notices until data is needed |
| Dev-only local URLs (`localhost:3001` Vite proxy, `trustedOrigins` dev entries, `/auth/dev-login` local-IP gate) | Code, environment-gated | Local development only | None — these are correctly scoped to dev/non-production already | NO | Keep as-is; just make sure `NODE_ENV=production` and `PUBLIC_SITE_URL=https://pixon.com.mx` are set correctly on the VPS `.env` | Low — already guarded in code |

## Non-findings (checked, not present)

- No hardcoded `C:\` / `D:\` absolute paths in application code.
- No PM2 configuration.
- No Windows Task Scheduler entries.
- No local/dev SMTP — email already goes through Resend (cloud).

## Git hygiene flag (unrelated to migration, needs a decision before any commit)

`git status` currently shows **staged**: `GameSir Connect Installer.exe`, `Microsoft.Management.Deployment.winmd`, `Microsoft.Services.Store.winmd` at the repo root — these are Windows game-controller/Store runtime files, unrelated to the project, almost certainly staged by accident. Recommend unstaging and deleting them before the next commit; flagging here rather than acting unilaterally.
