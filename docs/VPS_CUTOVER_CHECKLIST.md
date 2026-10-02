# VPS cutover checklist

> [!WARNING]
> **DEPRECATED / OBSOLETO:** Este checklist para VPS KVM 2 ha sido reemplazado por la migración a **Hostinger Cloud Startup (Managed Hosting)**. Ver [HOSTINGER_PRODUCTION.md](file:///c:/Users/Usuario/techstore/docs/HOSTINGER_PRODUCTION.md).

## 0. Pre-purchase (safe to do without spending anything)
- [x] `CURRENT_ARCHITECTURE.md`, `LOCAL_DEPENDENCIES.md`, `COST_COMPARISON.md` written and cross-checked against the live repo.
- [x] Deploy/backup/systemd scripts verified aligned with current `package.json`, `persistent-paths.js` and `.env.example` (no drift found).
- [x] Unrelated staged files (`GameSir Connect Installer.exe`, `*.winmd`) unstaged and gitignored — not committed.
- [x] Offsite-backup path prepared (`scripts/hosting/backup-offsite-sync.sh`, `pixon-backup-offsite.service/.timer`) — inert until an R2 bucket exists.
- [ ] Cloudflare R2 bucket + API token created for offsite backups (owner action; separate from the VPS purchase).

## 1. Provisioning
- [ ] VPS purchased (Hostinger KVM 2, Ubuntu LTS image).
- [ ] SSH key-based access confirmed; password login disabled.
- [ ] Non-root deployment user (`pixon`) created; app never runs as root.
- [ ] Firewall: only SSH open publicly; MariaDB (3306) and Node (3000) bound to 127.0.0.1 only.
- [ ] `fail2ban` installed on SSH if it adds value at this traffic level.
- [ ] OS security updates applied; unattended-upgrades considered.
- [ ] Node 22.17.0 installed (matches `.nvmrc`).
- [ ] MariaDB installed (version recorded), bound to 127.0.0.1, not publicly reachable.
- [ ] `cloudflared` installed **on the VPS** and configured per `deploy/cloudflared/config.yml.example` — not pointed at the Windows PC.
- [ ] `awscli` + `openssl` installed (offsite backup dependency).

## 2. Environment & first deploy
- [ ] `/opt/pixon/shared/.env` populated from `.env.example`, reviewed line-by-line (no values blindly copied from the dev `.env`).
- [ ] New `SESSION_SECRET` generated (≥32 chars) — not reused from dev.
- [ ] `NODE_ENV=production`, `PUBLIC_SITE_URL=https://pixon.com.mx` set correctly.
- [ ] `deploy/systemd/pixon.service`, `pixon-backup.service`, `pixon-backup.timer`, `pixon-backup-offsite.service`, `pixon-backup-offsite.timer` installed; `systemctl enable --now` applied.
- [ ] Initial deploy run via `scripts/hosting/deploy-production.sh` against a clean checkout.
- [ ] `/api/health` responds locally (`curl -fsS http://127.0.0.1:3000/api/health`).

## 3. Data migration (dry run first, on a temporary/technical subdomain — DNS not touched yet)
- [ ] Fresh verified backup taken on the PC (`npm run db:backup:encrypted` + `db:backup:verify`).
- [ ] DB restored on VPS; row counts, foreign keys, indexes compared against source for: users, appointments, orders, repairs/tickets, comments, all business tables.
- [ ] Persistent files (`commerce-media`, `commerce-payment-proofs`) synced to `/opt/pixon/shared/data`; spot-checked for completeness and correct permissions.
- [ ] Restore drill executed per `docs/DATABASE_MIGRATIONS_AND_BACKUPS.md` (`npm run test:hosting:restore` against a `test`-named DB) — table counts match before/after.

## 4. Resilience tests (must pass before cutover)
- [ ] `sudo reboot` on the VPS — MariaDB and Pixon both come back with zero manual steps.
- [ ] `systemctl restart pixon` — app recovers cleanly, `Restart=on-failure` verified by killing the process.
- [ ] A second deploy run (`deploy-production.sh` again) — confirms release-swap + rollback-on-failed-healthcheck path works, not just the happy path.
- [ ] Rollback path deliberately exercised once (e.g. force a failing healthcheck) — confirmed it actually restores the previous release, not assumed from reading the script.
- [ ] Ticket persistence test: create a test ticket, restart Node, restart VPS, redeploy — ticket still present after each step.
- [ ] Upload persistence test: upload a test file, restart/redeploy — file still accessible only to the correct role.

## 5. Functional QA (staging via technical subdomain, before DNS cutover)
- [ ] Public: home, services (device categories), blog, store, English site, B2B, contact forms.
- [ ] Auth: Google OAuth login/logout using an allowed redirect URI for the temporary host.
- [ ] Customer: account, ticket create/view, comments.
- [ ] Admin: login, dashboard, ticket list/status update, store/catalog management.
- [ ] Email: an action that triggers Resend fires correctly with production env vars; simulate a Resend failure and confirm the triggering record (e.g. ticket) still saved.
- [ ] Payments: Stripe/PayPal/Mercado Pago webhook and callback URLs updated for the new host and exercised in sandbox/test mode — no real charges for testing.
- [ ] Background jobs: appointment-hold expiry and email-outbox replay observed running on their interval in `journalctl -u pixon`.

## 6. Observability
- [ ] `journalctl -u pixon` confirmed as the log source; no secrets logged.
- [ ] Disk/RAM/CPU monitoring in place with an alert threshold (e.g. 80/90/95% disk) — `npm run inventory:hosting` or equivalent.
- [ ] External uptime monitor configured against `https://pixon.com.mx` (or the temp host pre-cutover) using a plan whose terms allow commercial use.
- [ ] Offsite backup timer confirmed actually uploading (check the R2 bucket has today's objects), once the bucket exists.

## 7. DNS cutover
- [ ] Final write-freeze on the PC origin.
- [ ] Final DB + files sync to VPS; counts re-verified.
- [ ] Cloudflare Tunnel route switched to the VPS (DNS nameservers untouched).
- [ ] Smoke test immediately after cutover: public, auth, tickets, admin, uploads, email, payments.
- [ ] SEO check: URLs unchanged, 200s, canonical, sitemap, robots, hreflang, schema all intact — no regressions.
- [ ] Performance check: TTFB/LCP/INP/CLS measured on VPS, compared against the pre-migration PC/tunnel baseline (don't assume the VPS is automatically faster).

## 8. Power-off test (the actual definition of done)
- [ ] Old PC origin kept available as rollback for 24–72 h, otherwise idle (no writes accepted there).
- [ ] After the observation window: **fully shut down the Windows PC** and, from a different device/network, confirm: site loads, login works, tickets create/persist, admin works, uploads visible to the right roles, emails send, payments/webhooks process, cron-equivalent jobs still firing.
- [ ] If anything fails with the PC off: migration is **not** complete — document the blocker, bring the PC back only as a temporary rollback, fix, and repeat this section.

## 9. Housekeeping
- [ ] `Encender_Web.bat` / `Apagar_Web.bat` / `scripts/manage-web.ps1` re-scoped in docs as **development-only** tools, never production.
- [ ] Any remaining doc or script implying "turn on the PC / start the tunnel / run Node manually" for production updated or removed.
- [ ] Secrets rotated if any were ever exposed in git history, logs, or shared insecurely.
- [ ] `CURRENT_ARCHITECTURE.md` updated to show Cloudflare → VPS (Node + MariaDB + persistent uploads) → offsite backups, with the PC relabeled as a development workstation only.
