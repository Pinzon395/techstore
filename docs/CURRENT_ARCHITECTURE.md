# Current Architecture — Pixon PC (actualizado 2026-10-03)

## Estado real HOY (verificado con curl el 2026-10-03)

```
USUARIO
  │ HTTPS
CLOUDFLARE (NS ashley/kyrie.ns.cloudflare.com, proxy, WAF)
  │  pixon.com.mx/*  →  Cloudflare Worker (server-timing: worker)
  │                      /api/health 200, /api/version 404, /api/ready 404
  │                      BD del Worker: Aiven (ENOTFOUND, muerta) vía Hyperdrive
  └─ (respaldo histórico) Cloudflare Tunnel → PC Windows → Express + MariaDB local
```

Producción **todavía no corre en Hostinger**. El backend real con datos vigentes
es la MariaDB local de la PC (`pixon_db`, 98 tablas, 16 567 filas; última escritura
2026-09-29, backup del 2026-10-02 vigente).

## Arquitectura objetivo (release listo, pendiente de subir)

```
USUARIO
  │ HTTPS (Let's Encrypt Hostinger)
DNS Cloudflare: A pixon.com.mx / www → IP Hostinger (DNS-only, nube gris)
  │
HOSTINGER Node.js Web App (Node 22.x, 1 proceso)
  npm ci  →  npm run build  →  npm start  (= node server/server.js)
  ├─ Express: estáticos Astro (dist/) + API /api/* + OAuth /auth/*
  ├─ Jobs internos (un solo proceso → una implementación por tarea):
  │    · limpieza de apartados vencidos (cada 5 min, transaccional)
  │    · mantenimiento commerce (apartados de pedidos)
  │    · outbox de email (Resend, con reintentos)
  │    · sync de reseñas Google (si está configurado)
  ├─ Archivos privados/medios: DATA_DIR (fuera del directorio del release)
  └─ Pool mysql2/promise (DB_CONNECTION_LIMIT=8, queue 200, keepalive)
        │
MySQL Hostinger  u493813761_pixondb  (usuario u493813761_pixonusr, puerto 3306,
                 host = el que muestre hPanel → Bases de datos)
```

| Pieza | Proveedor | Fuente de verdad en código |
|---|---|---|
| DNS | Cloudflare | — (inventario en `HOSTINGER_PRODUCTION.md`) |
| Hosting/app | Hostinger Node.js | `package.json` (`build`, `start`), `.nvmrc`, `.npmrc` |
| Config/env | Variables hPanel | `server/server.js#validateEnv`, `.env.example` |
| Base de datos | MySQL Hostinger | `server/db/connection.js` (único pool) |
| Sesiones | tabla `sessions` (express-mysql-session sobre el mismo pool) | `server/server.js` |
| Archivos | disco Hostinger en `DATA_DIR` | `server/config/persistent-paths.js` |
| Email | Resend (dominio pixon.com.mx, DKIM `resend._domainkey`) | `server/services/email.service.js` |
| Login | Google OAuth (`/auth/google/callback`) | `server/server.js` |
| Respaldos | backups Hostinger + dumps locales + R2 `pixon-backups` (se conserva) | `scripts/db/*`, `scripts/hosting/*` |
| Observabilidad | `/api/health`, `/api/ready`, `/api/version`, access log JSON con `correlation_id` | `server/routes/health.routes.js` |

## Despliegue

Temporal: ZIP (`npm run release:build` → `release/release-prod.zip`), ver
`HOSTINGER_PRODUCTION.md`. Futuro: GitHub `Pinzon395/techstore@main` → auto-deploy
Hostinger (bloqueado del lado del proveedor por el mapping del repo).

## Legado (no se usa en el runtime Hostinger; retirar solo tras POWER_OFF_TEST=PASS)

Cloudflare Worker (`worker/`, `wrangler.toml`), Hyperdrive, Aiven (muerta),
Cloudflare Tunnel + `Encender_Web.bat`/`Apagar_Web.bat`, MariaDB local.
