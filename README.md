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

Si vas a usar el usuario recomendado del `.env.example`, crea el usuario de app en MariaDB:

```sql
CREATE USER IF NOT EXISTS 'pixon_app'@'localhost' IDENTIFIED BY 'cambia_esta_password';
CREATE USER IF NOT EXISTS 'pixon_app'@'127.0.0.1' IDENTIFIED BY 'cambia_esta_password';
GRANT ALL PRIVILEGES ON pixon_db.* TO 'pixon_app'@'localhost';
GRANT ALL PRIVILEGES ON pixon_db.* TO 'pixon_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Cambia `cambia_esta_password` tambien en `.env`.

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
- `SESSION_SECRET`: secreto largo para cookies de sesion.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: conexion MariaDB.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`: login con Google.
- `ADMIN_EMAIL`: email que recibe rol admin al iniciar sesion.
- `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID`: resenas de Google Maps.

## Comandos npm

```powershell
npm ci              # instala exactamente lo fijado en package-lock.json
npm run build       # genera dist/
npm run start       # servidor de produccion en PORT o 3000
npm run dev         # servidor Node con nodemon en puerto 3001
npm run dev:astro   # Astro dev server en puerto 4321
npm run setup:local # npm ci + build
```

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
