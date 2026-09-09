# Recuperación ante pérdida de VPS

1. Crear Ubuntu LTS nuevo, usuario `pixon`, SSH por clave, Node `22.17.0`, MariaDB, `cloudflared`; aplicar firewall y la configuración MariaDB versionada.
2. Recrear `/opt/pixon/{releases,shared/data}` con dueño `pixon`. Restaurar `/opt/pixon/shared/.env` desde el gestor seguro de secretos, no desde Git.
3. Crear `pixon_db` y usuario `pixon_app` local. Copiar el último backup cifrado y sus manifests; validar con `npm run db:backup:verify -- ARCHIVO`; restaurar solo sobre la DB nueva con `npm run db:backup:restore -- ARCHIVO --force`.
4. Extraer el archive de archivos persistentes a `/opt/pixon/shared/data`, validar el `.sha256` y permisos. No restaurar `tmp/`.
5. Desplegar el último commit/release con `scripts/hosting/deploy-production.sh`, instalar/activar systemd y comprobar `/api/health`.
6. Crear/conectar Tunnel nuevo, probar con hostname de staging noindex, luego cambiar el routing Cloudflare. Confirmar Google OAuth, media, ticket, cita, carrito, admin, correo y webhooks.

RPO efectivo depende del último backup y sync offsite: solo backup diario implica hasta 24 horas de writes perdidos. RTO depende de crear VPS/restaurar datos; no se declara SLA hasta realizar un simulacro completo de restore.
