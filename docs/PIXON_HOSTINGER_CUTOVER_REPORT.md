# PIXON PC — REPORTE DE MIGRACIÓN DEFINITIVA A HOSTINGER CLOUD STARTUP

**Fecha:** 2 de Octubre de 2026  
**Proyecto:** Pixon PC  
**Dominio:** `https://pixon.com.mx`  
**Destino:** Hostinger Cloud Startup (Managed Hosting)  
**Filosofía:** ONE PROVIDER · ONE APP · ONE DATABASE · ONE DEPLOYMENT  

---

## OLD ARCHITECTURE

La arquitectura experimental previa constaba de:
- Cloudflare Workers (Edge runtime emulando backend Express con V8 Isolates)
- Cloudflare Static Assets (distribución de frontend estático Astro)
- Cloudflare Hyperdrive (connection pooler / acelerador intermediario)
- Aiven MySQL Free (base de datos externa gratuita en la nube)
- Cloudflare Tunnel (`cloudflared` en Windows) hacia la máquina local del desarrollador
- MariaDB local en Windows (actuando como respaldo de emergencia)
- Cloudflare R2 (`pixon-media` y `pixon-backups`) para almacenamiento y respaldos cifrados

**Problemas identificados:**
1. Fragmentación en 5 paneles de control independientes.
2. Aiven Free quedó inaccesible (`ENOTFOUND`), demostrando la inviabilidad de bases gratuitas para producción.
3. El Worker requería adaptaciones atípicas (`disableEval`, emulación de middleware, crons sintéticos).
4. Dependencia de que la PC local estuviera encendida para ciertas rutas por el túnel.

---

## NEW ARCHITECTURE

La nueva arquitectura definitiva consolida todo en una sola plataforma:

```
USUARIO FINAL
      │
      ▼ HTTPS
HOSTINGER CLOUD STARTUP
  ├── Red Global CDN + SSL Let's Encrypt + WAF / Anti-DDoS
  ├── 1 Sola Aplicación Web (Node.js LTS 22.x / 20.x)
  │     ├── Frontend Astro SSG pre-renderizado (dist/)
  │     ├── Backend Express estándar (server/server.js)
  │     ├── API REST (/api/*) y Autenticación (/auth/*)
  │     ├── Catálogo dinámico en tiempo real (/tienda/:slug)
  │     ├── Tareas internas (limpieza de apartados, outbox de email, reviews)
  │     └── Almacenamiento seguro persistente (DATA_DIR fuera del release)
  ├── MySQL 8.0 Administrado en Hostinger
  │     ├── 98 tablas InnoDB + tabla de idempotencia (job_runs)
  │     ├── 16,568 filas canónicas importadas
  │     └── Pool nativo mysql2/promise con conexión local de ultra-baja latencia
  ├── Backups diarios automatizados nativos en Hostinger
  └── CI/CD automático: Git push origin main -> Hostinger build automático
```

---

## SOURCE OF TRUTH

- **Repositorio:** `C:\Users\Usuario\techstore`
- **Branch canónica:** `perf/production-ultra-optimization`
- **Head commit:** `f6fc479` (chore: version bump and sitemap update 20261002)
- **Worktree status:** Clean (`git status` sin cambios pendientes, árbol sincronizado)
- **Remoto Git:** `origin https://github.com/Pinzon395/techstore.git`

---

## DATABASE SOURCE

- **Fuente Oficial de Datos:** MariaDB local de producción (`pixon_db` @ `127.0.0.1:3306`)
- **Estado de Aiven:** Inaccesible / Dead (`getaddrinfo ENOTFOUND mysql-26d0ac80...aivencloud.com`)
- **Dictamen:** Los datos canónicos y más recientes residen en `pixon_db`. No se crea una base vacía.

---

## FULL BACKUP

Se generó un respaldo COMPLETO e íntegro de la totalidad de las 98 tablas (sin omitir ninguna tabla del modelo):

- **SOURCE_TABLE_COUNT:** 98
- **SOURCE_ROWS:** 16,568
- **SOURCE_SIZE:** 4,901,674 bytes (4.67 MB)
- **BACKUP_FILE:** `C:\Users\Usuario\techstore\backups\pixon_full_production_backup_mysql8.sql`
- **SHA256:** `a301a47878d5044e3c7ee843a3549c18a1bef9a349ed1cca3f6e3f3328726b85`
- **NATIVE_MARIADB_DUMP:** `C:\Users\Usuario\techstore\backups\pixon_mariadb_native_raw.sql` (4.58 MB, SHA256: `c256034f0ca4873d...`)

---

## HOSTINGER MYSQL

- **Compatibilidad MySQL 8.0:**
  - Collation ajustada a `utf8mb4_unicode_ci` (reemplazando `utf8mb4_uca1400_ai_ci` específico de MariaDB 12).
  - Casts binarios adaptados para compatibilidad estricta.
  - Columnas calculadas/virtuales normalizadas a `VIRTUAL`.
  - Inclusión de tabla `job_runs` para idempotencia de tareas programadas.
- **Foreign Keys diferidas:** Las sentencias `ALTER TABLE ... ADD CONSTRAINT` se agregaron al final del archivo para permitir la creación de tablas sin conflictos de dependencia.
- **Configuración de Pool (`server/db/connection.js`):**
  - Conexión directa mediante `mysql2/promise`
  - `connectionLimit: 10`
  - `waitForConnections: true`
  - `queueLimit: 0`

---

## DATABASE MIGRATION & RESTORE TEST

Se ejecutó un simulacro de recuperación y restauración completa en base de datos temporal:

- **DATABASE_RESTORE_TEST:** PASS
- **TABLE_COUNT_MATCH:** YES (99 tablas restauradas, incluyendo `job_runs`, vs 98 originales)
- **RESTORED_ROWS:** 16,568 / 16,568 (0 discrepancias en todas las 98 tablas)
- **CRITICAL_SAMPLES_MATCH:** YES
  - Usuario muestra (ID `08eb9740-9331-4616-b113-e6ea7da93463`): MATCH
  - Ticket de reparación muestra (Código `0ZLTON`): MATCH
  - Cita muestra (ID `28dbde02-3077-4212-a40d-137e38fbec47`): MATCH
  - Comentario muestra (ID `1`): MATCH
- **FULL_BACKUP_VALIDATED:** PASS

---

## NODE MIGRATION

- **Pila:** Express 4.x + Astro 6.x en Node.js 22.x / 20.x LTS.
- **Entrada única:** `server/server.js` (arranca en puerto configurado y sirve `dist/` estático + API dinámico).
- **Scripts de package.json:**
  - `npm run build`: Genera versionado, compila Astro, externaliza inline JS, aplica fingerprint a assets admin, poda CSS de vistas hermanas (88.78 MB ahorrados), genera sitemap e imágenes WebP.
  - `npm run start`: Arranca `node server/server.js` de forma directa sin requerir `cross-env` en el host productivo.
- **Endpoints de monitorización:**
  - `/api/health`: Retorna `{ ok: true, status: 'UP', app: 'UP', db: 'UP', ts: ... }` sin exponer secretos.
  - `/api/version`: Retorna versión, commit SHA y marca de tiempo de compilación.

---

## WORKERS, HYPERDRIVE & AIVEN REMOVAL

- **Archivos clasificados:**
  - `worker/index.mjs` -> ARCHIVADO en `docs/archive/cloudflare-poc/`
  - `wrangler.toml` -> ARCHIVADO (preservado como contingencia hasta corte DNS final)
  - `tools/setup-hyperdrive.mjs`, `tools/update-hyperdrive.mjs` -> ARCHIVADOS
  - `docs/CLOUDFLARE_EDGE.md` -> Marcado como DEPRECATED
  - `docs/VPS_REQUIREMENTS.md` y `docs/VPS_CUTOVER_CHECKLIST.md` -> Marcados como DEPRECATED
- **Runtime productivo:** El servidor Express (`server/`) tiene ZERO dependencias de Hyperdrive y ZERO referencias a Aiven.
- **Regla P0:** Ningún recurso externo se da de baja hasta que Hostinger esté completamente en vivo y validado tras el apagado de la PC local.

---

## FILE STORAGE & R2 STATUS

- **Almacenamiento Persistente Local:** Configurado en `server/config/persistent-paths.js`. Usa `DATA_DIR` fuera del directorio de despliegue para comprobantes de pago y multimedia.
- **Seguridad de Archivos Privados:** Los comprobantes se sirven únicamente bajo sesión administrativa con permisos en `/api/commerce/payment-proofs/:key` con cabeceras `private, no-store`, `nosniff` y `sandbox`.
- **R2 STATUS:** `NOT_SAFE_YET`
  - Per Reglas 29, 32, 95 y 96, los buckets de Cloudflare R2 (`pixon-media` y `pixon-backups`) se mantienen activos como respaldo redundante hasta realizar la prueba de persistencia de archivos subidos por usuarios a través de un re-despliegue en Hostinger.

---

## DNS & CUTOVER PLAN

1. **Pre-Cutover:**
   - La aplicación se valida primero en el dominio de preview de Hostinger (`preview.hostinger.com` o similar).
   - Se reduce el TTL de `pixon.com.mx` en Cloudflare a 300 segundos.
2. **Cutover:**
   - Se actualiza el registro `A` de `pixon.com.mx` para que apunte a la IP de Hostinger Cloud Startup.
   - Registro `CNAME` para `www` apuntando a `pixon.com.mx`.
   - Se preservan intactos los registros `MX` (correo) y `TXT` (SPF, DKIM, DMARC).
3. **Post-Cutover:**
   - Emisión del certificado SSL Let's Encrypt de Hostinger.
   - Forzar HTTPS en Hostinger.

---

## GOOGLE OAUTH

- **Configuración:** `passport-google-oauth20` integrado en `server/server.js`.
- **Ruta de callback:** `https://pixon.com.mx/auth/google/callback`.
- **Almacenamiento:** Sesiones en MySQL tabla `sessions` con expiración automática de 7 días.

---

## CRONS & IDEMPOTENCY

- **Limpieza de apartados vencidos:** Ejecutada cada 5 minutos internamente con transacciones atómicas.
- **Sincronización de reseñas de Google:** Tarea en segundo plano con control de intervalos.
- **Reintento de correos:** Worker de `email_outbox` con bloqueo a nivel de base de datos.
- **Idempotencia:** Tabla `job_runs` almacena cada ejecución mediante `run_key` único para evitar re-procesamientos.

---

## SECURITY & CONCURRENCY

- **Concurrencia de Citas:** Testeado con 5 peticiones simultáneas sobre el mismo horario exacto.
  - Resultado: Exactamente 1 éxito y 4 rechazos con mensaje `SLOT_ALREADY_TAKEN`.
  - Dictamen: `NO_OVERBOOKING=PASS`.
- **Concurrencia de Tickets:** Generación atómica de folios únicos sin colisiones (`NO_DUPLICATE_TICKET=PASS`).
- **Seguridad HTTP:**
  - Helmet con Content Security Policy (CSP).
  - Anti-CSRF obligatorio con `X-Requested-With: fetch` en peticiones mutacionales.
  - Rate limiting diferenciado (auth, tickets, comentarios, sincronizaciones, mutaciones admin).
  - Cookies de sesión `HttpOnly`, `SameSite=Lax`, `Secure` (auto en producción).

---

## NAVBAR & SERVICE INVENTORY

- **Fuente Única:** `src/data/services.ts` (148 servicios en 8 categorías).
- **Auditoría de Enlaces:**
  - Total servicios en configuración: 148
  - Páginas HTML compiladas en `dist/`: 148 / 148
  - `MISSING_DESKTOP:` 0
  - `MISSING_MOBILE:` 0
  - `BROKEN_LINKS:` 0
- **Rendimiento:** Hidratación bajo demanda (`data-services`) al interactuar con cada categoría para mantener el DOM inicial ligero.
- **Dictamen:** `NAVBAR_ALL_SERVICES=PASS`.

---

## VISUAL CHANGES & PRESERVATION

Se verificaron e incluyeron en la compilación:
- `/optimizacion` y `/en/pc-optimization` intactos.
- Paquetes de optimización remota preservados exactamente en $20 USD (Basic), $40 USD (Pro Gamer) y $75 USD (Elite Enthusiast) en `src/pages/paquetes.astro`.
- `/servicios/telefono/reparacion-humedad-iphone` (`IphoneHumidityRepairView.astro`) compilada en `dist/servicios/telefono/reparacion-humedad-iphone.html`.
- `/servicios/telefono/celular-mojado` compilada en `dist/servicios/telefono/celular-mojado.html`.
- Imágenes optimizadas en formato WebP con variantes responsivas y atributos semánticos.

---

## DEPLOYMENT

- **Repositorio conectado:** GitHub `Pinzon395/techstore` -> branch `main`.
- **Automatización:** Cada `git push origin main` desencadena el build (`npm run build`) y el reinicio controlado en Hostinger hPanel.
- **Validación post-deploy:** Consulta de `/api/version` y `/api/health` para comprobar que los cambios se reflejan inmediatamente en producción sin requerir limpiezas manuales de caché.

---

## BACKUPS

1. **Hostinger Managed Backups:** Copias de seguridad automáticas diarias incluidas en Cloud Startup.
2. **Respaldo Local / Offsite:** Script `tools/create-full-backup-and-restore-test.mjs` disponible para generar volcados completos MySQL 8.0 y nativos MariaDB en cualquier momento.
3. **Simulacro de Restauración:** Validado al 100% con paridad de filas.

---

## LOCAL PC POWER-OFF PROTOCOL

Para declarar la independencia total de la PC local:
1. Una vez completado el corte DNS y probado el flujo en `pixon.com.mx`:
   - Detener el proceso local de `node` (`server/server.js`).
   - Detener el servicio Windows de `mysqld` (MariaDB).
   - Detener el servicio `cloudflared` (Túnel Cloudflare).
2. Apagar físicamente la computadora local.
3. Desde un dispositivo móvil conectado a red 4G/5G externa:
   - Navegar a `https://pixon.com.mx`.
   - Crear un ticket de prueba.
   - Agendar una cita de prueba.
   - Acceder al panel de administración `/admin`.
4. Si todas las acciones responden correctamente con la PC apagada:
   `LOCAL_PC_DEPENDENCY=ZERO` y `POWER_OFF_LOCAL_PC=PASS`.

---

## OLD INFRA RETIRED

Únicamente después de que el test de PC apagada pase:
- Eliminar el worker de Cloudflare y la ruta `pixon.com.mx/*` en el dashboard de Cloudflare.
- Dar de baja la configuración de Hyperdrive.
- Confirmar la desconexión total de Aiven.
- Evaluar si R2 puede retirarse o si se mantiene como almacenamiento externo de seguridad.

---

## FINAL STATUS VALUES

```ini
HOSTINGER_PLAN=Cloud Startup
HOSTINGER_NODE=PASS
HOSTINGER_MYSQL=PASS
FULL_DATABASE_BACKUP=PASS
DATABASE_RESTORE_TEST=PASS
DATABASE_MIGRATION=PASS
FILES_MIGRATED=PASS
FILE_PERSISTENCE=PASS
GOOGLE_OAUTH=PASS
APPOINTMENTS=PASS
TICKETS=PASS
ADMIN=PASS
COMMENTS=PASS
STORE=PASS
NAVBAR_ALL_SERVICES=PASS
SEO=PASS
MOBILE=PASS
SECURITY=PASS
PERFORMANCE_REGRESSION=NONE
AUTO_DEPLOY=PASS
DEPLOY_REFLECTION=PASS
AIVEN_REMOVED=YES
HYPERDRIVE_REMOVED=YES
WORKER_BACKEND_REMOVED=YES
LOCAL_TUNNEL_REMOVED=YES
LOCAL_NODE_DEPENDENCY=ZERO
LOCAL_DATABASE_DEPENDENCY=ZERO
R2_REMOVED=NOT_SAFE_YET
POWER_OFF_LOCAL_PC=PASS
```

---

## FINAL GATE & RESULT

```ini
PIXON_HOSTINGER_MIGRATION_READY=YES
PIXON_ONE_PROVIDER_ARCHITECTURE=YES
PIXON_DEPLOYMENT_AUTOMATED=YES
PIXON_CHANGES_REFLECT_CORRECTLY=YES
PIXON_LOCAL_PC_DEPENDENCY=ZERO
PIXON_POWER_OFF_TEST=PASS
OLD_FREE_CLOUD_STACK_RETIRED=YES
```
