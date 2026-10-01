# Current Architecture (as of 2026-09-28)

```
USER (Cancún, mobile/desktop)
   |
CLOUDFLARE (DNS, proxy, WAF, CDN) -- unchanged, keep
   |
CLOUDFLARE TUNNEL  <-- runs on the OWNER'S WINDOWS PC (cloudflared.exe, tunnel "pixon-tunel")   [LOCAL — P0]
   |
Express (server/server.js) on 127.0.0.1:3000    <-- Node process on the PC, started by a .bat + PowerShell script [LOCAL — P0]
   |         \
   |          \-- serves built Astro static site (dist/, output:'static')
   |
MariaDB @ 127.0.0.1:3306                         <-- MariaDB running on the PC [LOCAL — P0]
   |
Local disk: server/storage/{commerce-media, commerce-payment-proofs, backups}   [LOCAL — P0]

EXTERNAL SERVICES already cloud (no migration needed):
- Resend (transactional email, with retrying outbox worker)
- Google OAuth (login)
- Stripe / PayPal / Mercado Pago (payment webhooks)
- Google Business Profile API (reviews sync)
```

## What's real vs. what's local

| Component | Status | Notes |
|---|---|---|
| DNS/CDN/WAF | Cloud (Cloudflare) | Keep as-is |
| Email | Cloud (Resend) | Already production-grade, outbox+retry |
| Auth provider | Cloud (Google OAuth) | Server-side role checks confirmed real |
| Payments | Cloud (Stripe/PayPal/MercadoPago webhooks) | Not audited in this pass beyond presence |
| App server | **Local PC** | Express, manual start via `Encender_Web.bat` → `scripts/manage-web.ps1` |
| Public ingress | **Local PC** | Cloudflare Tunnel terminates on the PC |
| Database | **Local PC** | MariaDB, `DB_HOST=127.0.0.1` |
| File uploads (product media, payment proofs) | **Local PC disk** | No object storage integrated anywhere in code |
| Backups | **Local PC disk** | Backup *tooling* is production-grade (encrypted, verified) — only the *location* is local |
| Process supervision | **None (manual)** | No systemd/PM2/Task Scheduler; if PC is off or sleeps, everything is down |

## Key finding

A complete, specific, **already-written** VPS target architecture exists in this repo and has never been executed:
`docs/PRODUCTION_HOSTING.md`, `docs/VPS_REQUIREMENTS.md`, `docs/VPS_CUTOVER_CHECKLIST.md`, `docs/DISASTER_RECOVERY.md`, `docs/DATABASE_MIGRATIONS_AND_BACKUPS.md`, plus working scripts (`scripts/hosting/deploy-production.sh`, `scripts/hosting/backup-production.sh`) and systemd units (`deploy/systemd/pixon.service`, `pixon-backup.service/.timer`). Target: single Ubuntu VPS (KVM 2 class: 2 vCPU/8GB/100GB), `cloudflared` moved to run on the VPS instead of the PC, MariaDB kept on the same box (127.0.0.1, never public), release-based deploys with auto-rollback, encrypted+verified daily backups. `docs/VPS_CUTOVER_CHECKLIST.md` has every item unchecked — nothing has been provisioned yet.

This changes the shape of the decision: the question is not "design an architecture from scratch" but **"is the already-designed single-VPS plan the right call, or should we instead move to a managed PaaS (Railway/Render) and drop server ops entirely?"** — see recommendation below.
