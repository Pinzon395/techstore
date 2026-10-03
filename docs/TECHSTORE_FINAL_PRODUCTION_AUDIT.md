# Techstore / Pixon PC — Auditoría final de producción (2026-10-03)

Regla de evidencia: PASS = probado en el entorno indicado. Aquí se distingue
**LOCAL_REAL** (servidor real + MySQL/MariaDB real restaurada desde el backup de producción,
release limpio extraído del ZIP) de **HOSTINGER** (aún sin acceso: el navegador no está conectado
y no hay sesión hPanel en esta ejecución).

## Fuente de verdad

- Backup del estado previo: rama `backup/pre-final-production-20261003`, tag `pre-final-production-20261003` (en `5b45a64`).
- `LOCAL_HEAD` = `main` con los commits de esta ejecución; `GITHUB_MAIN_HEAD` = `5b45a64` (sin push).
- `RELEASE_HEAD` = el SHA en `release/release-manifest.json`.

## Package / runtime (leído de `package.json`, no asumido)

NODE_ENGINE=`>=20.0.0 <=22.x` (.nvmrc 22.17.0) · INSTALL=`npm ci` · BUILD=`npm run build` ·
START=`npm start` → `node server/server.js` · OUTPUT_DIR=`dist` · PORT=`process.env.PORT`.

## Defectos encontrados y corregidos

| # | Severidad | Defecto | Evidencia | Corrección |
|---|---|---|---|---|
| 1 | CRÍTICA | `/auth/dev-login` activo en producción si `req.ip` local o `req.hostname === 'localhost'`; detrás del proxy de Hostinger `X-Forwarded-Host: localhost` o un proxy sin XFF daban sesión **admin** a cualquiera. Además open redirect (`returnTo`). | `server/server.js` | En producción la ruta no existe (404, verificado por smoke). En dev solo `socket.remoteAddress` local y `safeInternalReturnTo`. |
| 2 | CRÍTICA | `POST /api/appointments/:id/confirm-payment` público: marcaba cualquier cita como `PAID/CONFIRMED` con un `payment_id` arbitrario. | `appointment.routes.js` | `requireAdmin`. |
| 3 | ALTA | Reservas concurrentes: 5 holds simultáneos → **4 deadlocks** (`ER_LOCK_DEADLOCK`, HTTP 400) con capacidad 3 libre; clientes reales perdían la cita. | e2e-calendar LOCAL_REAL | `GET_LOCK` por día (MySQL/MariaDB) antes de la transacción. Ahora: 3 éxitos / 2×409, slot lleno, cero sobreventa. |
| 4 | ALTA | `reschedule` público no validaba capacidad → sobreventa al reprogramar a un slot lleno. | código + e2e | `_assertSlotCapacity` + lock del día; 409 `SLOT_NO_LONGER_AVAILABLE` (probado). Solo citas activas. |
| 5 | ALTA | Clave real de Resend embebida en `worker/index.(m)js` y bundles `tmp/*` versionados; repo **público**. | secret scan | Eliminada del árbol, `tmp/` des-versionado. **ROTAR la clave** (sigue en el historial). |
| 6 | ALTA | `npm ci` con `NODE_ENV=production` (como en Hostinger) omitía Astro ⇒ `npm run build` fallaba. | reproducido en `C:\Temp\pixon-production-test` | `.npmrc include=dev`. |
| 7 | MEDIA | `/api/admin/tickets/recent` capturado por `/api/admin/tickets/:id` → 400 "ID invalido" (widget del dashboard roto). | e2e-admin | `:id(\\d+)`. |
| 8 | MEDIA | CORS/CSRF sin `www.pixon.com.mx` ni preview; `localhost` permitido en producción. | código | Orígenes desde env (`APP_URL`, `PUBLIC_SITE_URL`, `CORS_EXTRA_ORIGINS`); localhost solo en dev. |
| 9 | MEDIA | `customer_id` del body aceptado en holds públicos (asociar citas a otro usuario). | código | Solo admin puede fijarlo. |
| 10 | MEDIA | Holds/reschedule/cancel públicos sin rate-limit; HTML de emails con nombre sin escapar. | código | `appointmentLimiter` (20/10 min); sanitización de nombre/servicio y formato fecha/hora. |
| 11 | MEDIA | Advisories prod: mysql2 (auth downgrade), qs, undici, body-parser, dompurify, ip-address. | `npm audit --omit=dev` | Overrides/versiones parcheadas → **0 vulnerabilidades prod**. |
| 12 | BAJA | Pool sin límite de cola, sin timeout; zona horaria `America/Mexico_City` en stats SSE (negocio = Cancún). | código | `DB_CONNECTION_LIMIT=8`, `queueLimit=200`, `connectTimeout`, keepalive; Cancún en todo el server. |
| 13 | BAJA | Sin access log ni duración por request; correlation id aceptado sin validar (inyección en logs). | código | Log JSON (`timestamp, level, method, route, status, correlation_id, duration_ms`) sin query/cookies; id validado. |
| 14 | BAJA | `trust proxy` fijo en 1 (con Cloudflare proxied el rate-limit vería IPs de Cloudflare). | código | `TRUST_PROXY_HOPS` (default 1). |

## Evidencia de pruebas (LOCAL_REAL)

- Restore drill: dump `pixon_full_production_backup_mysql8.sql` → BD temporal `test_pixon_restore`: 99 tablas (98 + `job_runs`), **16 567/16 567 filas**, **116/116 FKs**. MariaDB local sin escrituras posteriores al dump (última: 2026-09-29).
- Unit/integration: db-infra 14/14, commerce 48/48, appointments 11/11, admin-agenda 3/3, policy 6/6, admin-ui OK.
- `tools/e2e-admin-production.mjs` (dev, BD restaurada): auth/roles, 14 lecturas admin, repairs create/read/update/status/history/listado/soft-delete, tienda create/update/no-público/delete, logout → **PASS**.
- `tools/e2e-calendar-production.mjs`: config, navegación 2 meses, slots, timezone, concurrencia 5→3/2 sin sobreventa, slot lleno, reschedule rechazado, visibilidad admin, confirmación admin, cancelación, slot liberado, limpieza → **PASS**.
- Release limpio (`git archive` → extraído → `NODE_ENV=production npm ci` → `npm run build` → `npm start`): `dist/version.json.commit` = SHA del release; `postdeploy-smoke` **22/22 PASS** (health, ready, version, 7 páginas incl. `/optimizacion`, `/en/pc-optimization`, ambas de humedad, 404 real, robots/sitemap, lecturas DB, admin protegido, dev-login 404, CSRF 403, CORS foráneo rechazado, headers de seguridad, correlation id).
- Fallos controlados: sin variables críticas → `Variables de entorno obligatorias faltantes: …` y exit 1; BD caída → `Bootstrap fallido: connect ECONNREFUSED` y exit 1.

## Secret scan

| FILE | SECRET_TYPE | ROTATE_REQUIRED |
|---|---|---|
| `worker/index.js`, `worker/index.mjs`, `tmp/*deploy*/index.js` (historial Git, repo público) | RESEND_API_KEY (= la clave actual de `.env`) | **SÍ** |
| `INSTRUCTIVO_TECNICO.md` (historial, eliminado en `cd39711`) | GOOGLE_CLIENT_SECRET antiguo (≠ el actual) | No (ya rotado) |
| `docs/HOSTINGER_PRODUCTION.md` (versión previa) | SESSION_SECRET de ejemplo | No usar ese valor |
| ZIP de release | — | ZIP_SECRET_SCAN=PASS |

## Pendiente que exige Hostinger (no verificable sin hPanel)

Despliegue, `DB_HOST` real, importación/conteo en `u493813761_pixondb`, DB_READ/DB_WRITE desde
Node Hostinger, preview E2E, persistencia de archivos tras redeploy, OAuth y email en dominio
real, cutover DNS/SSL, pruebas desde datos móviles y prueba con la PC apagada.
