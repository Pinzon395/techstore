# Techstore — Deuda técnica clasificada (2026-10-03)

Nada de lo siguiente bloquea el despliegue en Hostinger. Borrar legado solo con:
runtime references=0 · reemplazo verificado · producción PASS · rollback disponible.

## Legado (KEEP hasta POWER_OFF_TEST=PASS, luego retirar)

| Elemento | Referencias runtime Hostinger | Acción |
|---|---|---|
| `worker/`, `wrangler.toml`, `tools/deploy-cloudflare.mjs` (Worker vivo hoy en pixon.com.mx) | 0 | Retirar ruta + Worker tras cutover |
| Hyperdrive / Aiven (Aiven ENOTFOUND) | 0 | Dar de baja tras cutover |
| Cloudflare Tunnel, `Encender_Web.bat`, `Apagar_Web.bat`, `SETUP.bat`, `server/start-with-monitor.js`, `server/monitor.js` | 0 | Detener servicios locales tras cutover; archivar |
| `server/_legacy_sqlite/`, `server/migrate-to-mariadb.js`, devDependency `better-sqlite3` | 0 (solo script `migrate:legacy`) | Eliminar junto con el script |
| ~73 scripts CDP sin versionar en `tools/` (`cdp-*`, `inspect-*`, `click-*`…) de automatizaciones previas de hPanel | 0 (no están en Git ni en el ZIP) | Borrar localmente |
| `pixon-app.zip`, `release.tar.gz`, `release-prod.tar.gz`, `release-prod.zip` en la raíz | 0 (ignorados) | Borrar; el release canónico es `release/` |
| R2 `pixon-media`, `pixon-backups` | 0 en runtime | KEEP `pixon-backups` (offsite). `pixon-media` solo tras probar persistencia en Hostinger |

## Deuda de código (prioridad)

1. **Alta** — Endpoints públicos de cita (`GET /api/appointments/:id`, cancel, reschedule) se autorizan por conocer el UUID v4 (modelo de URL-capacidad). Añadir token de gestión firmado por cita o verificación de teléfono/email.
2. **Alta** — Rotar `RESEND_API_KEY` (expuesta en el historial público); considerar `git filter-repo` + force-push solo si el riesgo lo justifica (la rotación es lo esencial).
3. **Media** — Rutas duplicadas muertas en `server.js`: `GET /api/appointments/config|availability`, `GET /api/admin/appointments`, `PATCH /api/admin/appointments/config` (los routers del módulo se montan antes y las sombrean). Eliminar tras confirmar contrato del admin UI.
4. **Media** — Respuestas 500 del módulo de citas devuelven `err.message` crudo; unificar con `errorHandler` (contrato `code`/`correlation_id`).
5. **Media** — `server/server.js` monolítico (~1 980 líneas): extraer tickets/admin a módulos como commerce/appointments.
6. **Media** — El build reescribe archivos versionados (`public/sw.js`, `public/version.json`, `public/cache-buster.js`, `public/scripts/pwa-register.js`): ensucia el árbol tras cada build local. Generar en `dist/` únicamente.
7. **Baja** — `GET /auth/logout` (logout vía GET, CSRF de cierre de sesión). Pasar a POST.
8. **Baja** — `queueLimit`/`connectionLimit` calibrar con `max_user_connections` real de Hostinger.
9. **Baja** — Advisories solo de desarrollo/build (astro, @astrojs/node, sharp/libvips, postcss, js-yaml, brace-expansion…): no alcanzables en runtime (Express sirve `dist/` estático). Actualizar Astro en una tarea aparte con regresión visual.
10. **Baja** — Sin tests automáticos de navbar/SEO en CI; existen auditorías (`check:links`, `check:indexation`, `check:jsonld`) a ejecutar antes de cada release.
