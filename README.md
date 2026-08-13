# Pixon PC

Sitio web de Pixon PC con Astro, Express y MariaDB. El build estatico se genera en `dist/` y el servidor Node sirve el sitio, la API, auth, comentarios, tickets, agenda y panel admin.

## Requisitos

- Node.js 20.19 o superior.
- npm 10 o superior.
- MariaDB 10.11 o superior.
- Git.
- Windows Terminal recomendado para usar `Encender_Web.bat`.
- `cloudflared` solo si vas a publicar con el tunel de Cloudflare.

## Levantar en otra PC rapido

```powershell
git clone https://github.com/Pinzon395/techstore.git
cd techstore
copy .env.example .env
npm ci
npm run build
```

Edita `.env` con los datos reales de MariaDB, Google OAuth y administrador. El archivo `.env` no se sube a Git.

Despues crea la base de datos:

```powershell
mysql -u root -p < server\sql\01-schema.sql
mysql -u root -p pixon_db < server\sql\02-seed.sql
```

Restaura tambien el contenido versionado no sensible:

```powershell
npm run db:restore -- --force
```

El snapshot vive en `server/db/snapshot/content.json`. Incluye catalogo,
servicios, builds, FAQs y configuracion, pero excluye usuarios, sesiones,
tickets, telefonos, correos, IPs, analitica y pagos.

Si vas a usar el usuario recomendado del `.env.example`, crea el usuario de app en MariaDB:

```sql
CREATE USER IF NOT EXISTS 'pixon_app'@'localhost' IDENTIFIED BY 'cambia_esta_password';
CREATE USER IF NOT EXISTS 'pixon_app'@'127.0.0.1' IDENTIFIED BY 'cambia_esta_password';
GRANT ALL PRIVILEGES ON pixon_db.* TO 'pixon_app'@'localhost';
GRANT ALL PRIVILEGES ON pixon_db.* TO 'pixon_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Cambia `cambia_esta_password` por una contraseña real y guardala solo en `.env`. No uses `root` como usuario de la app.

Para arrancar local:

```powershell
npm run start
```

Abre `http://localhost:3000`.

## Scripts rapidos en Windows

- `SETUP.bat`: prepara el proyecto en una PC nueva. Instala dependencias con `npm ci`, crea `.env` si falta y genera `dist/`.
- `INICIAR.bat`: arranca el servidor local en `http://localhost:3000`.
- `Encender_Web.bat`: arranca servidor y Cloudflare Tunnel en dos pestanas de Windows Terminal.

Los `.bat` usan la carpeta donde estan guardados, asi que funcionan aunque clones el repo en otra ruta.

## Variables de entorno

Archivo base: `.env.example`.

Variables principales:

- `PORT`: puerto del servidor Express. En produccion local se usa `3000`.
- `SESSION_SECRET`: secreto largo para cookies de sesion. En produccion es obligatorio.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: conexion MariaDB.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`: login con Google.
- `ADMIN_EMAIL`: email que recibe rol admin al iniciar sesion.
- `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID`: resenas de Google Maps.

## Login Con Google

El login falla con `Error 401: invalid_client` o `OAuth client was not found` cuando `GOOGLE_CLIENT_ID` esta vacio, mal copiado o el cliente fue borrado en Google Cloud.

En Google Cloud Console crea una credencial de tipo **OAuth client ID** para **Web application** y registra estos valores:

```text
Authorized JavaScript origins:
http://localhost:3000
https://pixon.com.mx

Authorized redirect URIs:
http://localhost:3000/auth/google/callback
https://pixon.com.mx/auth/google/callback
```

Luego pega en `.env`:

```env
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_CALLBACK_URL=/auth/google/callback
ADMIN_EMAIL=tu-correo-admin@gmail.com
```

Deja `GOOGLE_CALLBACK_URL=/auth/google/callback` para que el callback use el mismo dominio desde donde se inicia sesion: `localhost` en local y `pixon.com.mx` en produccion.

## Comandos npm

```powershell
npm ci              # instala exactamente lo fijado en package-lock.json
npm run build       # genera dist/
npm run start       # servidor de produccion en PORT o 3000
npm run dev         # servidor Node con nodemon en puerto 3001
npm run dev:astro   # Astro dev server en puerto 4321
npm run setup:local # npm ci + build
npm run db:snapshot # actualiza datos no sensibles versionados
npm run db:restore -- --force # fusiona el snapshot en MariaDB
npm run db:migrate:plan # muestra el plan sin escrituras
npm run db:migrate:verify # verifica esquema de control y checksums sin escrituras
npm run db:migrate -- --backup backups/archivo.pixonbak # aplica con backup validado y lock
npm run db:backup:encrypted # backup logico cifrado en backups/
npm run db:backup:verify -- backups/archivo.pixonbak # autentica backup y manifiesto
npm run db:backup:restore -- backups/archivo.pixonbak --force # restaura backup cifrado
```

## QA, deploy y monitoreo

Documentacion operativa:

- `docs/QA_CHECKLIST.md`: checklist antes de deploy.
- `docs/DEPLOY_MONITORING.md`: pasos de produccion, health check, migraciones, backups y rollback.
- `docs/DATABASE_MIGRATIONS_AND_BACKUPS.md`: checksums, lock, preflight de backup y recuperacion de DDL.
- `docs/MARKETPLACE.md`: pedidos, pagos, inventario, promociones, endpoints y QA del marketplace.
- `docs/SEO_LOCAL_AVANZADO.md`: pendientes SEO local que requieren datos reales.

Validacion minima antes de subir:

```powershell
npm run build
node --check server\server.js
node --check public\scripts\admin.js
node --check public\scripts\comments.js
node --check public\scripts\service-ticket.js
```

En produccion, `SESSION_SECRET` y `DB_BACKUP_KEY` son obligatorios. Ejecuta `npm run db:migrate` durante el deploy antes de iniciar la nueva version; el servidor no modifica el esquema al arrancar.

## Cloudflare Tunnel

Instala `cloudflared`:

```powershell
winget install Cloudflare.cloudflared
cloudflared tunnel login
cloudflared tunnel list
```

El tunnel usado por los scripts se llama `pixon-tunel`. Si en otra PC el tunnel tiene otro nombre, cambia esta linea en `Encender_Web.bat`:

```bat
set "TUNNEL_NAME=pixon-tunel"
```

La configuracion local de Cloudflare vive fuera del repo, normalmente en:

```text
%USERPROFILE%\.cloudflared\config.yml
```

Ejemplo:

```yaml
tunnel: <TUNNEL-ID>
credentials-file: C:\Users\<usuario>\.cloudflared\<TUNNEL-ID>.json

ingress:
  - hostname: pixon.com.mx
    service: http://localhost:3000
  - service: http_status:404
```

## Estructura

```text
techstore/
  src/                  Paginas, componentes y estilos Astro
  public/               Assets publicos, scripts cliente, manifest, sitemap
  server/               Express, API, auth, MariaDB y SQL
  server/sql/           Esquema y seed MariaDB
  tools/                Scripts de migracion, SEO, imagenes y mantenimiento
  tests/                Pruebas Playwright
  dist/                 Build generado, no se sube a Git
```

## Git

Se sube codigo fuente, assets, SQL, lockfile npm y scripts. No se suben:

- `.env`
- `node_modules/`
- `dist/`
- backups de base de datos
- archivos temporales de MariaDB/SQLite

Antes de subir cambios:

```powershell
npm run build
git status
git add .
git commit -m "Describe el cambio"
git push
```

Activa una vez el hook versionado que comprueba la base antes de cada push:

```powershell
npm run setup:git-hooks
```

Si el contenido permitido de MariaDB cambio, el hook actualiza el snapshot y
bloquea el push para que puedas revisarlo y agregarlo al commit. Los backups
completos permanecen en `backups/` y nunca se suben a Git.
