# Commerce module

Modulo CommonJS aislado para el catalogo comercial central de Pixon PC. No inicia
el servidor ni crea su propio pool.

## Integracion

Despues de sesiones y Passport, y antes del error handler global:

```js
const { createCommerceModule } = require('./modules/commerce');

const commerce = createCommerceModule({ pool: getDB() });
commerce.mount(app);
```

Montajes que expone la factory:

- `GET /api/commerce/catalog`
- `GET /api/commerce/catalog/categories`
- `GET /api/commerce/catalog/badges`
- `GET /api/commerce/catalog/:slug`
- `/api/admin/commerce/*` para administracion y RBAC
- `GET /api/commerce/media/:storageKey` para imagenes autorizadas

Exitos: `{ "ok": true, "data": ..., "meta": ... }`.

Errores: `{ "ok": false, "error": { "code": "...", "message": "..." } }`.

Los importes salen como strings decimales. Nunca se exponen `cost_reference`,
datos de auditoria o identificadores de storage en las rutas publicas.

La factory tambien expone `legacyAdapter` para que endpoints existentes de
`products`, `services`, `builds` y `components` resuelvan el item central por
`catalog_legacy_links` sin duplicar ni reescribir el legado.

## Subida de imagenes

`POST /api/admin/commerce/catalog/:id/media` recibe una sola imagen binaria por
request con `Content-Type: image/jpeg`, `image/png` o `image/webp`. Opcionalmente:

- `X-Alt-Text`
- `X-Sort-Order`
- `X-Is-Primary: true`

El nombre fisico siempre es un UUID generado por servidor. Se validan MIME
declarado, firma magica, tamano y SHA-256. La implementacion local puede
reemplazarse inyectando un adapter con `save`, `open` y `remove`.

## Filtros publicos

`q`, `type`, `status`, `condition`, `brand`, `category`, `featured`, `minPrice`,
`maxPrice`, `availability`, `sort`, `page`, `pageSize`.

`availability`: `AVAILABLE`, `UNAVAILABLE`, `LOW_STOCK`, `OUT_OF_STOCK`,
`RESERVED`, `SOLD`.

`sort`: `featured`, `newest`, `price_asc`, `price_desc`, `name` o `name_asc`.
