# Configurar Cache Rules en Cloudflare para HTML

## El problema

Aunque `vercel.json` envia los headers correctos:

```
Cache-Control: public, max-age=600, s-maxage=86400, stale-while-revalidate=86400
```

Cloudflare por defecto **NO cachea HTML** en su CDN. Solo cachea
automaticamente CSS, JS, imagenes y fuentes. El HTML llega al
navegador con buen `Cache-Control` (10 min en cliente, 24h CDN
segun el header), pero `cf-cache-status: DYNAMIC` significa que
**cada visitante hace un viaje al origen** (Vercel/Express).

Verificacion actual:

```
$ curl -sI https://pixon.com.mx/ | grep -i cache
Cache-Control: public, max-age=600, s-maxage=86400, stale-while-revalidate=86400
cf-cache-status: DYNAMIC   <-- DEBERIA SER HIT
```

Recursos estaticos si funcionan:

```
$ curl -sI https://pixon.com.mx/favicon.png | grep -iE "cache|age"
Cache-Control: public, max-age=31536000
Age: 422393
cf-cache-status: HIT   <-- correcto
```

---

## Solucion: Cache Rule en Dashboard

### Paso 1 — Crear la regla

1. Inicia sesion en https://dash.cloudflare.com
2. Selecciona el dominio **pixon.com.mx**
3. Menu lateral: **Caching → Cache Rules**
4. Click en **"Create rule"**

### Paso 2 — Configurar el matching

**Rule name:** `Cache HTML pages from origin`

**When incoming requests match...** (elige *Custom filter expression*):

Opcion simple (recomendada) — cachear por hostname + path:

```
(http.host eq "pixon.com.mx" and not http.request.uri.path matches "^/(api|admin)")
```

O con UI: usa el builder visual con estos campos:

| Field | Operator | Value |
|---|---|---|
| Hostname | equals | `pixon.com.mx` |
| AND URI Path | does not start with | `/api` |
| AND URI Path | does not start with | `/admin` |

### Paso 3 — Configurar el cacheo

En **"Then"**:

- **Cache eligibility:** `Eligible for cache`
- **Edge TTL:** selecciona `Use cache-control header from origin`
  - Esto respeta el `s-maxage=86400` que Vercel envia
- **Browser TTL:** `Use cache-control header from origin`
  - Respeta `max-age=600` que envia al cliente

### Paso 4 — Guardar y desplegar

Click **Deploy**. Propaga en 1-2 minutos.

---

## Verificacion

Despues de propagar, prueba:

```bash
# Primera visita: MISS (origen)
curl -sI https://pixon.com.mx/ | grep -i cf-cache-status
# cf-cache-status: MISS

# Segunda visita inmediata: HIT (CDN)
curl -sI https://pixon.com.mx/ | grep -iE "cf-cache-status|age"
# cf-cache-status: HIT
# Age: 5
```

Tambien prueba paginas interiores:

```bash
for url in / /reparaciones /paquetes /optimizacion /contacto; do
  echo -n "$url -> "
  curl -sI "https://pixon.com.mx$url" | grep -i cf-cache-status
done
```

Esperado: todas con `HIT` despues de la primera visita.

---

## Por que importa

**Beneficio cuantitativo:** sin cache rule, cada visita unica
genera una request al origen. Con la regla:

- Latencia HTML baja de ~300-800ms (origen) a ~50-100ms (edge Cloudflare)
- LCP mejora directamente porque el HTML llega antes
- Origen recibe ~95% menos requests (al estar cacheado 24h en cada uno
  de los ~300 datacenters de Cloudflare)
- Mejor INP / Core Web Vitals
- Resilencia: si Vercel/Express se cae 1 min, los visitantes siguen
  recibiendo HTML cacheado

**SWR (stale-while-revalidate):** el header tiene `swr=86400`. Esto
permite que despues de las 24h de validez, Cloudflare entregue
contenido stale al usuario MIENTRAS revalida en background. El
usuario nunca espera. Solo funciona si la Cache Rule respeta
"Use cache-control from origin".

---

## Edge case: invalidacion al hacer deploy

Cuando hagas un deploy nuevo y quieras invalidar el cache:

1. Cloudflare Dashboard → Caching → Configuration
2. **Custom Purge** → "Purge by hostname" → `pixon.com.mx`

O via API:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

Alternativa mas elegante: bumpear `cache-buster.js` a una version
nueva (ya tienen ese sistema en el repo). Pero como Cloudflare cachea
el HTML, los visitantes con HTML viejo seguiran cargando el
cache-buster viejo hasta que su navegador re-pida (max 10 min). Para
emergencias, usa el Custom Purge.

---

## Estado actual

- [ ] Cache Rule creada en Cloudflare Dashboard
- [ ] Verificado que `/` devuelve `cf-cache-status: HIT` en la 2da visita
- [ ] Verificado que `/reparaciones` devuelve `HIT`
- [ ] Probado purge cache manual al hacer deploy

Marca cada checkbox cuando completes el paso.

---

## Referencias

- Documentacion oficial: https://developers.cloudflare.com/cache/how-to/cache-rules/
- Cache-control vs Cloudflare TTL: https://developers.cloudflare.com/cache/concepts/cache-control/
- Stale-while-revalidate en Cloudflare: https://developers.cloudflare.com/cache/about/cache-control/#cache-control-directives
