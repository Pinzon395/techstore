# Producción VPS

> [!WARNING]
> **DEPRECATED / OBSOLETO:** La arquitectura autogestionada en VPS (KVM 2) ha sido reemplazada por **Hostinger Cloud Startup Managed Hosting**. Ver [HOSTINGER_PRODUCTION.md](file:///c:/Users/Usuario/techstore/docs/HOSTINGER_PRODUCTION.md).

## Arquitectura

`Cloudflare -> cloudflared (VPS) -> 127.0.0.1:3000 -> Pixon/Express -> MariaDB 127.0.0.1`.

Código: `/opt/pixon/releases/<release>`; release activa: `/opt/pixon/current`; estado persistente: `/opt/pixon/shared/data`; secretos: `/opt/pixon/shared/.env`. No se escribe en una release.

Persistente: MariaDB, `commerce-media/` (producto + variantes), `commerce-payment-proofs/`, `cache/` (prescindible), `backups/`. Temporal: `tmp/`. Build: `dist/` dentro de cada release.

Jobs: la app ejecuta liberación de reservas commerce, expiración de holds de citas y replay del outbox. El replay usa advisory lock MariaDB, procesa como máximo 10 correos `QUEUED`/`FAILED` por ciclo y no duplica trabajo al tener más de una instancia.

## Primera instalación VPS

1. Ubuntu LTS, usuario `pixon`, Node `22.17.0`, MariaDB y `cloudflared` instalados. Crear `/opt/pixon/{releases,shared/data}` con dueño `pixon:pixon` y modo 0750.
2. Copiar `.env.example` a `/opt/pixon/shared/.env`, completar secretos y usar `DATA_DIR=/opt/pixon/shared/data`. Generar un `SESSION_SECRET` nuevo de al menos 32 caracteres. Nunca usar `root` para la app.
3. Crear base y usuario local: `CREATE USER 'pixon_app'@'localhost' IDENTIFIED BY '...'; GRANT ... ON pixon_db.* TO 'pixon_app'@'localhost';`. MariaDB queda en `127.0.0.1`, sin 3306 público.
4. Instalar `deploy/systemd/pixon.service`, `pixon-backup.service`, `pixon-backup.timer`, `pixon-backup-offsite.service` y `pixon-backup-offsite.timer` en `/etc/systemd/system/`; ejecutar `systemctl daemon-reload && systemctl enable --now pixon pixon-backup.timer pixon-backup-offsite.timer` (el timer offsite queda instalado pero inerte hasta configurar `R2_BACKUP_BUCKET`).
5. Configurar Cloudflare Tunnel con el ejemplo versionado; no exponer el puerto 3000. Cloudflare sigue siendo DNS, SSL, WAF, CDN y cache.

## Deploy

En una checkout limpia del commit deseado: `sudo -u pixon bash scripts/hosting/deploy-production.sh /ruta/a/checkout`.

El script toma lock, crea release inmutable, ejecuta `npm ci`, preflight Linux, typecheck, build y gates estáticos; después hace backup cifrado verificado, aplica migraciones y conmuta el symlink. Si el healthcheck local falla, restaura la release anterior. Las migraciones siguen política expand/deploy/contract: rollback de código no revierte schema destructivo.

Operación: `systemctl status pixon`, `systemctl restart pixon`, `journalctl -u pixon -f`, `systemctl list-timers pixon-backup.timer`, `npm run inventory:hosting`. Health: `curl -fsS http://127.0.0.1:3000/api/health`.

## Backup y restore

El timer diario ejecuta un backup MariaDB cifrado/autenticado (`.pixonbak` + manifest) y un `tar.gz` de archivos persistentes con SHA-256. Retención local: 95 días.

Un segundo timer, `pixon-backup-offsite.timer` (02:45 UTC, 30 min después del backup local), ejecuta `scripts/hosting/backup-offsite-sync.sh`: si `R2_BACKUP_BUCKET` no está configurado, no hace nada (modo solo-local, seguro por defecto). Cuando se activa, cifra el `tar.gz` de archivos con `BACKUP_OFFSITE_KEY` (el backup de DB ya viaja cifrado) y sube ambos a un bucket S3-compatible (Cloudflare R2 recomendado por costo cero de egreso). Activarlo es obligatorio antes de declarar la migración completa (un VPS que muere con su único backup adentro no es backup real) — requiere crear el bucket R2 y sus credenciales, pendiente de aprobación separada para esa cuenta.

Restore DB controlado: `npm run db:backup:verify -- /ruta/archivo.pixonbak` y, solo sobre una DB objetivo confirmada, `npm run db:backup:restore -- /ruta/archivo.pixonbak --force`. Restaurar archivos en `shared/data`, verificar SHA-256, luego reiniciar Pixon.

Drill obligatorio antes de cutover: en staging con `NODE_ENV=test` y una base cuyo nombre incluya `test`, ejecutar `npm run test:hosting:restore`. El comando está bloqueado fuera de esa condición y compara los conteos de todas las tablas antes/después.

## Cutover

1. Inventario y backup lógico en PC; sync inicial de `shared/data` y DB hacia VPS.
2. Staging privado/noindex por Tunnel: probar health, login Google, upload, ticket, cita, carrito y admin.
3. Congelar writes en origen, tomar dump/sync delta final, restaurar VPS, comparar conteos críticos y medios, smoke test.
4. Cambiar únicamente la ruta del Tunnel/edge en Cloudflare; no nameservers. Mantener PC apagada para writes y disponible como rollback 24–72 h.
5. Si falla: revertir ruta Cloudflare al origen anterior antes de reabrir writes. Nunca aceptar writes simultáneos en PC y VPS.

## Seguridad y capacidad

SSH solo con claves para usuario admin/deploy; firewall: SSH restringido, 3306 y 3000 privados. `.env` 0600, datos 0750. Con Tunnel no se requiere HTTP/HTTPS público en origin. Configurar Full (strict), trusted proxy solo Cloudflare/Tunnel y verificar OAuth callback `https://pixon.com.mx/auth/google/callback`.

KVM 2 es el mínimo recomendado: 2 vCPU/8 GB/100 GB deja margen para MariaDB, Node, builds y Sharp. Vigilar CPU, RAM, disco, `/api/health`, conexiones MariaDB y `npm run inventory:hosting`; alertar 80/90/95% de disco. KVM 1 no tiene margen operativo suficiente para builds e imagenes concurrentes.
