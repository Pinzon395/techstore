# Cloudflare edge para Pixon PC

El sitio Astro ya genera HTML estatico en `dist/`, por lo que la ruta mas rapida y de menor riesgo es servir el front desde Cloudflare Pages o desde el servidor actual detras de Cloudflare con cache en edge. La API, auth, sesiones, tickets y admin siguen viviendo en Express + MariaDB.

## Opcion recomendada: Cloudflare Pages para el front

Configuracion del proyecto en Cloudflare Pages:

```text
Framework preset: Astro
Build command: npm run build
Build output directory: dist
Node version: 20.19 o superior
Production branch: main
Custom domain: pixon.com.mx
```

Archivos ya preparados:

- `public/_headers`: headers de seguridad y cache para Cloudflare Pages.
- `public/_redirects`: redirects canonicos y legados que Pages aplica en edge.

Importante: Pages sirve el front estatico. Para que `/api/*` y `/auth/*` sigan en el mismo dominio, se necesita una ruta separada en Cloudflare hacia el backend Express, normalmente con un Worker reverse-proxy o manteniendo el dominio principal apuntando al origin actual y moviendo el front a un subdominio. No migres Express a Pages Functions sin redisenar sesiones, MariaDB y OAuth.

## Opcion conservadora: origin actual + Cloudflare Tunnel

Si mantienes `npm run start` y Cloudflare Tunnel, activa estas reglas en Cloudflare:

1. Cache Rule para HTML:
   - When URI path does not start with `/api/` and does not start with `/auth/`
   - Eligible for cache: true
   - Edge TTL: respect origin headers
   - Browser TTL: respect origin headers

2. Cache Rule para assets:
   - URI path starts with `/_astro/`, `/assets/`, `/scripts/`, `/styles/` o `/components/`
   - Edge TTL: respect origin headers
   - Browser TTL: respect origin headers

3. Bypass cache para dinamico:
   - URI path starts with `/api/`, `/auth/` o `/admin`
   - Cache eligibility: bypass

4. Speed:
   - Brotli: on
   - Early Hints: on
   - HTTP/2 and HTTP/3: on
   - Auto Minify: off para JS/CSS si ya se minifica en build

## Politica de cache usada

- HTML: `max-age=0` en navegador y `s-maxage=3600` para edge, con stale while revalidate.
- Assets de Astro con hash: `max-age=31536000, immutable`.
- Imagenes y assets publicos no versionados: cache de 30 dias en navegador y 7 dias en edge.
- `sw.js` y `cache-buster.js`: `no-store` para evitar service workers viejos.

## Verificacion despues del deploy

```powershell
npm run build
node --check server\server.js
curl -I https://pixon.com.mx/
curl -I https://pixon.com.mx/_astro/
curl -I https://pixon.com.mx/sw.js
curl https://pixon.com.mx/api/health
```

Revisa que `/api/health` no venga cacheado y que HTML/assets muestren los `Cache-Control` esperados.
