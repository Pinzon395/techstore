# DEPLOYMENT.md — Runbook de Deploy Pixon PC

## Arquitectura actual

```
Código fuente (main)
      │
      ▼
npm run build          ← genera dist/ + version.json
      │
      ▼
npx wrangler deploy    ← sube dist/ + worker/ a Cloudflare Workers
      │
      ▼
pixon.com.mx           ← CDN global de Cloudflare
```

El servidor local Express (puerto 3001) **solo se usa en desarrollo/staging**.  
Producción pública = Cloudflare Workers + Assets.

---

## Pipeline de deploy a Cloudflare (el comando correcto)

```bash
npm run deploy:cf
```

Este comando ejecuta en secuencia:
1. **Pre-flight**: verifica git clean, wrangler.toml, worker/index.js
2. **Build**: `npm run build` (genera version stamp, WebP, sitemap, etc.)
3. **Deploy**: `npx wrangler deploy`
4. **Verify**: `node tools/verify-production-deploy.mjs` (espera 5s, luego valida)

Si algún paso falla, el proceso se aborta y producción no se toca.

### Modo dry-run (solo build, sin deploy)

```bash
npm run deploy:cf:dry
```

### Solo verificar producción (sin build ni deploy)

```bash
npm run verify:prod
```

---

## Prerrequisitos

1. **Wrangler autenticado**:
   ```bash
   npx wrangler login
   ```

2. **Variables de entorno en Cloudflare** (ya configuradas):
   - Se gestionan desde el dashboard de Cloudflare o con `npx wrangler secret put`

3. **Working tree limpio**: el script aborta si hay cambios sin commitear.

---

## Diagnosing "¿sí se subió?"

Cada build genera un `version.json` único. Para verificar:

```bash
# ¿Qué versión tiene producción?
curl -s https://pixon.com.mx/version.json

# ¿Qué versión tiene el build local?
cat dist/version.json

# Comparar ambas automáticamente
npm run verify:prod
```

El output de `verify:prod` incluye:
- ✓ Versión sincronizada / ✗ Versión DESINCRONIZADA
- Estado de CF-Cache-Status del HTML
- Cache-Control del Service Worker
- HTTP 200 en páginas críticas

---

## Cloudflare Cache / Service Worker

### HTML — por qué nunca queda cachado

El worker en `worker/index.js` sirve assets estáticos de `dist/`.
Cloudflare Workers sirve HTML con `Cache-Control: no-store` por defecto para rutas de navegación.
**Si ves CF-Cache-Status: HIT en HTML**, revisar las Page Rules / Cache Rules en el dashboard de Cloudflare.

### Service Worker — por qué los usuarios ven la versión nueva

Cada `npm run build` actualiza `CACHE_NAME` en `public/sw.js` con el timestamp+commit actual.
El nuevo SW activa `self.skipWaiting()` → limpia cachés anteriores → los usuarios ven el nuevo contenido en la siguiente carga.

### Si un usuario sigue viendo versión vieja

1. ¿Producción tiene la versión correcta?
   ```bash
   npm run verify:prod
   ```

2. ¿El SW viejo está atascado?
   El usuario puede abrir DevTools → Application → Service Workers → "Unregister" y recargar.

3. ¿Cloudflare tiene caché de HTML?
   Revisar CF-Cache-Status en los headers y purgar desde el dashboard si es necesario.

---

## Wrangler config (wrangler.toml)

| Campo | Valor | Descripción |
|-------|-------|-------------|
| `name` | `pixon-cloud` | Nombre del Worker en Cloudflare |
| `main` | `worker/index.js` | Punto de entrada del Worker |
| `[assets].directory` | `./dist` | Assets estáticos del build |
| `routes` | `pixon.com.mx/*` | Dominios que maneja el Worker |
| `[[hyperdrive]]` | dos bindings | Conexión a DB (fresco + cached) |

---

## Rollback

Cloudflare guarda las últimas versiones del Worker. Para hacer rollback:

```bash
# Listar versiones anteriores
npx wrangler deployments list

# Revertir a una versión anterior
npx wrangler rollback
```

---

## Checklist pre-deploy

- [ ] `git status` limpio (todo commiteado en `main`)
- [ ] Build local funciona: `npm run deploy:cf:dry`
- [ ] Variables secretas de entorno actualizadas si hay cambios
- [ ] No hay migraciones de DB pendientes sin ejecutar

## Checklist post-deploy

- [ ] `npm run verify:prod` pasa sin errores
- [ ] `/version.json` en producción coincide con local
- [ ] Verificar manualmente `/servicios/telefono/reparacion-humedad-iphone`
- [ ] Verificar manualmente `/optimizacion`
- [ ] Tickets y formularios de contacto operativos
