# Cloud Migration — Options &amp; Cost Comparison (researched 2026-09-28, prices from official pages — verify again before purchase, they change)

Context: app is Astro (static build) served by a single long-running Node/Express process, MariaDB, local-disk uploads, in-process background jobs (setInterval, MariaDB-advisory-lock protected), Resend for email already. Users mostly in Cancún — no provider has a Mexico region; US-East/Central is the practical floor for latency.

## Option A — ECONÓMICA (managed PaaS, minimal ops)

Move the app to Railway (supports a long-running Node process + volumes + a managed MySQL-compatible DB, so **no database engine migration**).

| Item | Provider | Est. monthly |
|---|---|---|
| App (Node, 24/7, small) | Railway Hobby/Pro usage | $10–20 |
| Database (MySQL-compatible, managed) | Railway managed MySQL | $5–15 |
| Uploads | Same disk-based code, on a Railway volume | included above |
| Email | Resend free tier (100/day cap) or Pro if exceeded | $0–20 |
| DNS/WAF/Turnstile | Cloudflare (unchanged) | $0 |
| Uptime monitoring | Paid tier for legit commercial use | $0–10 |
| **Total** | | **≈ $15–65/mo** |

**Trade-off:** the entire already-written VPS toolchain (systemd units, `deploy-production.sh`, hardening) is discarded and replaced with Railway's own deploy flow — real rework, not free. Best if the goal is "never touch a server again," worst if you want to keep the ops investment already made.

## Option B — RECOMENDADA (execute the VPS plan already designed in this repo)

`docs/PRODUCTION_HOSTING.md` / `VPS_REQUIREMENTS.md` already specify: single Ubuntu VPS, 2 vCPU/8GB RAM/100GB SSD ("KVM 2" class), MariaDB co-located at 127.0.0.1, `cloudflared` moved to the VPS, systemd-managed app + daily encrypted-backup timer, release-based deploys with auto-rollback. This is **already built and tested at the design level** — nothing here needs to be re-architected, only provisioned and executed.

| Item | Provider (pick one) | Est. monthly | Note |
|---|---|---|---|
| VPS 2vCPU/8GB/100GB | Hostinger KVM 2 | ~$9–15 promo | Renewal price roughly doubles; budget-tier support reputation — acceptable for low-stakes, riskier for a live paying business |
| VPS 2vCPU/8GB (alt.) | Hetzner (post-2026 price rises) | ~€15–20 (~$16–22) | EU-based company, strong reliability track record, no Mexico proximity edge over US options |
| VPS 8GB (alt.) | DigitalOcean / Vultr | ~$40–48 | Most proven for small-business production, easiest support, priciest of the three |
| Backups offsite copy (optional) | Cloudflare R2 | ~$1–3 | Zero egress fee; cheap insurance on top of local backups |
| DNS/WAF/Tunnel/Turnstile | Cloudflare | $0 | Unchanged |
| Email | Resend (already in use) | $0–20 | Same as today |
| Uptime monitoring | Paid tier (commercial use) | $0–10 | |
| **Total** | | **≈ $10–35/mo** (budget VPS) to **≈ $45–70/mo** (proven VPS) | |

**Why recommended:** zero database engine migration, zero rewrite of deploy/backup/job code — just execute a plan someone already fully designed and scripted. Matches the "no sobreingeniería" and "no reinventar" principles directly. The only real decision left is **which VPS vendor** — cost vs. reliability trade-off (see below).

## Option C — ESCALABLE (same VPS, decoupled for growth)

Everything in Option B, plus: move product/proof uploads to Cloudflare R2 (removes single-disk dependency for media), add a small staging VPS or Cloudflare preview flow for testing migrations before production, add paid error tracking, and budget for a managed DB failover path if traffic grows materially.

| Item | Est. monthly |
|---|---|
| Everything in Option B (proven VPS tier) | ~$45–70 |
| R2 storage for media/proofs | ~$2–8 |
| Staging VPS (small) | ~$5–10 |
| Error tracking (paid tier) | ~$10–30 |
| **Total** | **≈ $65–120/mo** |

Not needed today — revisit if traffic/data volume grows enough to justify it.

## Recommendation

**Option B**, VPS vendor choice pending your input: given this handles real customers, real repair tickets and real payments, leaning toward **DigitalOcean or Hetzner** over Hostinger/Contabo is the safer default despite the higher price — the $25–35/mo difference is small next to the cost of a support/reliability incident on a live business. If budget is the binding constraint, Hostinger KVM 2 (matching the exact spec already written in the docs) is workable, just with eyes open on renewal pricing and support quality.

**Nothing has been purchased or provisioned.** Per your own instruction (§112 of the migration brief), this stops here for your sign-off on: (1) which option, (2) which VPS vendor if Option B.
