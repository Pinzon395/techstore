# Pixon PC — Runbook de producción en Hostinger (Node.js Web App)

Plan: **Hostinger Unlimited Web Hosting** · Dominio final: `https://pixon.com.mx` ·
Despliegue temporal: **ZIP** (GitHub auto-deploy bloqueado del lado del proveedor).

## 1. Configuración de la app (hPanel → Sitios web → Añadir sitio web → Desplegar app web)

| Campo hPanel | Valor (verificado en `package.json` del release) |
|---|---|
| Framework | Express / Other (Node.js) |
| Node.js | `22.x` (fallback `20.x`; `engines: >=20 <=22.x`, `.nvmrc 22.17.0`) |
| Install | `npm ci` (`.npmrc include=dev` ⇒ instala Astro aunque `NODE_ENV=production`) |
| Build | `npm run build` (genera `dist/` + `dist/version.json` con el SHA del release) |
| Start | `npm start` (= `node server/server.js`) |
| Entry file | `server/server.js` |
| Output dir | `dist` (lo sirve Express; no es un sitio estático) |

## 2. Variables de entorno (hPanel → app → Variables de entorno)

Nunca en Git, ZIP, chat ni capturas. `server/server.js#validateEnv` aborta el arranque si falta una crítica.

```ini
NODE_ENV=production
# PORT lo inyecta Hostinger; no fijarlo salvo que hPanel lo pida
DB_HOST=<host exacto que muestra hPanel → Bases de datos → u493813761_pixondb>
DB_PORT=3306
DB_NAME=u493813761_pixondb
DB_USER=u493813761_pixonusr
DB_PASSWORD=<definir-en-hPanel>
DB_CONNECTION_LIMIT=8
SESSION_SECRET=<definir-en-hPanel: 64+ caracteres aleatorios>
APP_URL=https://pixon.com.mx
PUBLIC_SITE_URL=https://pixon.com.mx
CORS_EXTRA_ORIGINS=<URL temporal de preview Hostinger; vaciar tras el cutover>
TRUST_PROXY_HOPS=1          # 2 solo si Cloudflare queda en modo proxied (nube naranja)
DATA_DIR=/home/u493813761/pixon-data   # FUERA del directorio de la app
GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<definir-en-hPanel>
GOOGLE_CALLBACK_URL=https://pixon.com.mx/auth/google/callback
ADMIN_EMAIL=<correo admin>
RESEND_API_KEY=<definir-en-hPanel: CLAVE NUEVA, la anterior está expuesta>
EMAIL_FROM="Pixon PC <tickets@pixon.com.mx>"
NOTIFICATION_EMAIL=<correo>
```

## 3. Base de datos

1. hPanel → Bases de datos → confirmar que existe `u493813761_pixondb` y anotar el **host**.
2. phpMyAdmin → `u493813761_pixondb` → contar tablas. Si ≠ 99 o vacía: Importar
   `backups/pixon_full_production_backup_mysql8.sql` (SHA256 `7d1d25ba…a1e10c` (el `a301a478…` del reporte anterior no coincide con el archivo actual), 98 tablas +
   `job_runs`, 16 567 filas; restauración probada en BD temporal 2026-10-03: 16 567/16 567 filas,
   116/116 FKs). El archivo contiene datos de clientes: no subirlo a Git ni al ZIP.
3. Con la app arrancada, `GET /api/ready` debe dar `db: "UP"`.

## 4. Archivos (uploads/comprobantes)

Runtime usa disco local en `DATA_DIR` (R2 no se usa en runtime; `pixon-backups` sigue como
respaldo externo). Subir las 4 imágenes de `server/storage/commerce-media/` a
`$DATA_DIR/commerce-media/` (Administrador de archivos). Prueba obligatoria: subir un medio
TEST desde admin → redeploy → verificar que sigue. Si desaparece: `HOSTINGER_FILESYSTEM_NOT_SAFE_FOR_UPLOADS`.

## 5. Despliegue por ZIP (mientras GitHub siga roto)

```bash
git switch main && git status            # árbol limpio
npm run preflight:production             # PREFLIGHT=PASS
npm run release:build                    # release/release-prod.zip + release-manifest.json
# verificar SHA256 del manifest; subir el ZIP en hPanel → app → Subir archivos
npm run smoke:postdeploy -- https://<preview-o-dominio> --expect-commit <sha12>
PIXON_ADMIN_COOKIE="connect.sid=..." npm run e2e:admin -- https://<url>
PIXON_ADMIN_COOKIE="connect.sid=..." npm run e2e:calendar -- https://<url>
```

`PIXON_ADMIN_COOKIE`: tras iniciar sesión con Google como admin, DevTools → Application →
Cookies → `connect.sid`. Exportarla solo en la terminal; los scripts nunca la imprimen.

## 6. Cutover DNS (solo con preview PASS)

Inventario actual (Cloudflare, 2026-10-03) — **no tocar** salvo A/AAAA/CNAME de apex y www:
`TXT google-site-verification`, `_dmarc` (p=quarantine), `resend._domainkey` (DKIM),
`send.pixon.com.mx` (SPF amazonses + MX de Resend). No hay MX en el apex.

1. Cloudflare → Workers → quitar la ruta `pixon.com.mx/*` del Worker (si no, el Worker sigue respondiendo).
2. A `pixon.com.mx` y `www` → IP de Hostinger, **DNS-only** (nube gris) para que Hostinger emita SSL.
3. hPanel → SSL → instalar Let's Encrypt; forzar HTTPS. Express ya redirige `www` → apex.
4. Google Cloud Console → OAuth → confirmar redirect URI `https://pixon.com.mx/auth/google/callback`.
5. `npm run smoke:postdeploy -- https://pixon.com.mx` (incluye http→https y www→apex).
6. Vaciar `CORS_EXTRA_ORIGINS`.

## 7. Futuro: GitHub auto-deploy

Cuando Hostinger resuelva el mapping: repo `Pinzon395/techstore`, rama `main`. Prueba: commit
de marcador → push → `/api/version` cambia de commit sin subida manual.

## 8. Rollback

Volver a subir el ZIP anterior (manifest con SHA previo). DNS: restaurar la ruta del Worker.
BD: backups de Hostinger o el dump local.
