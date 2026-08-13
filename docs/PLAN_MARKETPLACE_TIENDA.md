# Plan — Marketplace Pixon PC (tienda + pedidos + pagos + admin)

Fecha: 2026-08-12
Estado: implementado en código; activación de migraciones pendiente del backup cifrado obligatorio
Origen: brief "PIXON PC — MARKETPLACE PROFESIONAL + E-COMMERCE DE SERVICIOS + PANEL ADMINISTRATIVO"

---

## 0. Decisiones de arquitectura (ya acordadas)

- **Puerto único 3000.** No se toca `PORT`, ni el túnel (`pixon-tunel` → `localhost:3000`), ni `trustedOrigins`, ni CORS. Todo se sirve desde el mismo Express: sitio, API y tienda. MariaDB sigue en 3306.
- **Mismo stack del repo.** Astro estático + scripts vanilla en `public/scripts/` + CSS con custom properties. **No se agrega React ni ningún framework nuevo**: el proyecto no lo usa y las convenciones existentes (CSP estricta, `externalize-inline-js`, presupuesto de handlers inline) ya resuelven la interactividad.
- **Mismo origen siempre.** El frontend consume `/api/commerce/*` con rutas relativas y `credentials: 'include'`; mutaciones con header `X-Requested-With: fetch` (exigencia CSRF del server).
- **Se construye sobre lo existente.** El catálogo commerce (`catalog_items`, tipos EQUIPMENT/HARDWARE/SERVICE/BUNDLE, condiciones, badges con vigencia, media, RBAC) ya está hecho. Este plan NO lo reescribe: lo extiende con el flujo transaccional.
- **Identidad visual existente.** Tokens reales de Pixon: `--store-ink: #071f3a`, `--store-blue: #0b5ed7`, `--store-cyan: #37c5e8`, `--store-sky: #eaf8fc`, `--store-warm: #f2b441` (`src/styles/store.css`), Kanit para headings, Red Hat Display para cuerpo. El admin oscuro usa `admin.css` / `admin-commerce.css`. Nada de paletas genéricas.
- **Proceso de diseño mandatado por AGENTS.md** en cada vista: Taste Skill → Impeccable (shape/critique/audit/polish/harden) → microinteracciones sutiles. Checklist de entrega de AGENTS.md (1 H1, SEO local Cancún, NAP, mobile first, CTA arriba/medio/final, textos fuera del hero en `#071F3A`).

---

## 1. Estado actual (lo que ya existe y se reusa)

### Backend
- `server/modules/commerce/`: catálogo completo con `runTransaction`, auditoría en `admin_logs` (con redacción de datos bancarios), `Money` en centavos, validadores, envelope `{ok,data,meta}`.
- Endpoints públicos: `GET /api/commerce/catalog` (+filtros/paginación), `/categories`, `/badges`, `/:slug`, `/api/commerce/media/:key`.
- Endpoints admin: CRUD catálogo, publicar/archivar, categorías, badges, atributos, upload de imágenes (magic bytes + sha256, storage local UUID).
- **Permisos ya sembrados en migración 002**: `orders.view/manage`, `payments.view/approve`, `inventory.view/adjust`, `promotions.manage`, `reports.view` — otorgados a admin. Solo falta tablas y endpoints.
- Patrón de emails Resend (`server/services/email.service.js`: layout de marca + fire-and-forget con `Promise.allSettled`).
- Patrón de tickets (rate limit + validación + insert + folio + emails + audit) clonable para pedidos.
- `catalog_items` ya soporta: `sale_price` (promoción por item), `reserved_quantity`, estados RESERVED/SOLD, `sold_display_mode` (KEEP_VISIBLE para "ofertas que ya volaron"), `track_stock`, `minimum_stock`, optimistic locking (`version`).

### Frontend
- `/tienda` (`src/pages/tienda.astro` + `src/styles/store.css` + `public/scripts/store.js`): grid con filtros, paginación y detalle en `<dialog>`.
- Admin: `src/pages/admin/admin.astro` con vista `commerce` (`CommerceCatalogView.astro` + `public/scripts/admin-commerce.js`).
- `/cuenta` ya muestra "mis tickets" — patrón directo para "mis pedidos".
- Convenciones: página = `Base + Navbar + main + Footer`, estilos por página en `src/styles/*.css` vía `extraStyles`, scripts externos con `?v=YYYYMMDD-N`, iconos del sprite `/assets/icons/sprite.svg`.

### Huecos (lo que NO existe)
- Pedidos, items de pedido, pagos con comprobante, movimientos de inventario, composición de bundles, motor de promociones, notificaciones en BD, emails de pedido.
- Carrito, checkout, páginas de pedido/seguimiento, subida de comprobante.
- Las tablas `orders/payments/cart_items/coupons` de `01-schema.sql` son un borrador huérfano sin código: **no se tocan** (su retiro es tema de `LEGACY_RETIREMENT_PLAN.md`). Las tablas nuevas van con prefijo `commerce_` para no colisionar.

---

## 2. Modelo de datos — migración `server/sql/migrations/003_commerce_orders.sql`

Tablas nuevas (todas aditivas, `IF NOT EXISTS`, convención del runner `npm run db:migrate` con preflight de backup):

- `commerce_orders` — `id`, `folio` UNIQUE formato `PIX-YYYY-NNNNNN`, `user_id` NULL (invitado) / FK users, snapshot contacto (`customer_name`, `customer_phone`, `customer_email`), `subtotal`, `discount_total`, `total` (DECIMAL(12,2)), `currency`, `status` ENUM: `PENDING_PAYMENT → PAYMENT_REVIEW → PAID → PREPARING → READY → COMPLETED | CANCELLED`, `delivery_method`, `delivery_note`, `created_at/updated_at`, índices por status/fecha/user.
- `commerce_order_items` — FK `order_id`, FK `catalog_item_id`, snapshots (`title_snapshot`, `sku_snapshot`, `unit_price`, `quantity`, `line_total`), `item_type_snapshot`.
- `commerce_payments` — FK `order_id`, `method` (`BANK_TRANSFER`, `CASH`, `TERMINAL`), `amount`, `status` (`PENDING/UNDER_REVIEW/APPROVED/REJECTED`), comprobante: `storage_key`, `mime`, `size_bytes`, `checksum_sha256`, `uploaded_at`, `reviewed_by`, `reviewed_at`, `rejection_reason`.
- `commerce_order_status_history` — FK order, `from_status`, `to_status`, `actor` (user_id o 'customer'/'system'), `note`, `created_at` (timeline del pedido, brief §37/§72).
- `commerce_inventory_movements` — FK `catalog_item_id`, `qty_delta`, `reason` (`SALE/RESERVE/RELEASE/ADJUSTMENT/RETURN`), `reference_order_id`, `created_by`, `created_at` (brief §64).
- `commerce_bundle_items` — FK bundle `catalog_item_id` → FK componente `catalog_item_id` + `quantity` (paquetes, brief §24/§77).
- `commerce_promotions` — `name`, `type` (`PERCENT/FIXED/SALE_PRICE/BUNDLE_PRICE`), `value`, alcance (`scope`: ITEM/CATEGORY), `badge_id`, `starts_at/ends_at`, `status` (`DRAFT/ACTIVE/SCHEDULED/ENDED`), `presentation` JSON (título, texto, banner) + tabla puente `commerce_promotion_items`.
- `commerce_notifications` — `recipient` (admin broadcast o user_id), `type`, `payload` JSON, `read_at` (campana admin, brief §81).
- `commerce_settings` — clave/valor JSON para datos bancarios de transferencia (beneficiario, banco, CLABE — placeholder del brief §80), toggles de métodos de pago.
- Generador de folio: tabla `commerce_counters` (`name` PK, `value`) incrementada dentro de la misma transacción del pedido → `PIX-2026-000184`.

---

## 3. Backend — endpoints nuevos

Módulo nuevo `server/modules/commerce/orders/` (mismo patrón factory/router que catalog), montado desde `server/modules/commerce/index.js`. Todo con `runTransaction` + `createAuditWriter` + `requirePermission`.

### Públicos / cliente
| Endpoint | Qué hace |
|---|---|
| `POST /api/commerce/orders` | Checkout. Valida items contra BD (precios SIEMPRE server-side), verifica disponibilidad, crea pedido + items + reserva stock (`reserved_quantity`) + historial + folio, todo en una transacción. Rate limit tipo ticket. Responde folio + total. Emails fire-and-forget. |
| `GET /api/commerce/orders/:folio` | Consulta pública de seguimiento: folio + email del cliente (ambos requeridos). Devuelve estado, timeline, totales, datos de transferencia si `status=PENDING_PAYMENT` (leyendo `commerce_settings`). |
| `POST /api/commerce/orders/:folio/payment-proof` | Upload de comprobante (raw body como media de catálogo; añadir PDF al image-inspector). Valida folio+email. Pasa pedido a `PAYMENT_REVIEW`, pago a `UNDER_REVIEW`, notifica admin. |
| `GET /api/me/orders` | Pedidos del usuario autenticado (para `/cuenta`). |

### Admin (`/api/admin/commerce/...`)
| Endpoint | Permiso | Qué hace |
|---|---|---|
| `GET /orders` (+ filtros estado/fecha) | `orders.view` | Tabla de pedidos con badges-resumen (pendientes, por verificar…) |
| `GET /orders/:id` | `orders.view` | Detalle: cliente, items, totales, pago, historial |
| `PATCH /orders/:id/status` | `orders.manage` | Transiciones válidas + historial + email al cliente |
| `POST /orders/:id/payments/:pid/approve` | `payments.approve` | En una transacción: pago→APPROVED, pedido→PAID, descuenta stock real, libera reserva, registra `inventory_movements` (SALE), marca item SOLD si era unidad única, emails |
| `POST /orders/:id/payments/:pid/reject` | `payments.approve` | Rechazo con motivo + email |
| `GET /inventory/movements` | `inventory.view` | Timeline de movimientos |
| `POST /inventory/adjust` | `inventory.adjust` | Ajuste manual con motivo + movimiento |
| CRUD `/promotions` | `promotions.manage` | Activas/programadas/finalizadas, métricas básicas |
| `GET/PUT /settings/payment-methods` | `orders.manage` | Datos de transferencia y toggles |
| `GET /notifications`, `POST /notifications/:id/read` | `orders.view` | Campana |

### Emails nuevos (`email.service.js`, mismo layout de marca)
`notifyOwnerOrderCreated`, `notifyCustomerOrderCreated` (con CLABE/referencia desde settings), `notifyCustomerPaymentReview`, `notifyCustomerPaymentApproved`, `notifyCustomerOrderReady`, `notifyCustomerOrderCompleted`. A diferencia de tickets, aquí sí se escribe al correo de contacto del pedido (es una confirmación de compra).

---

## 4. Storefront (público) — Astro + vanilla JS

Convenciones: una página = `src/pages/<ruta>.astro` + `src/styles/store.css` (extender, no duplicar) + `public/scripts/store-*.js` con `?v=`. Un solo H1, canonical, JSON-LD (Product/Offer en detalle), textos fuera del hero en `#071F3A`, mobile first, sin handlers inline (presupuesto CSP), skeletons en vez de spinners.

1. **Home**: sección "Equipos y ofertas disponibles" (componente `src/components/home/HomeStoreHighlights.astro`) alimentada por `/api/commerce/catalog?featured=1&pageSize=6` + enlace "Ver toda la tienda →".
2. **`/tienda`**: hero compacto con buscador (sugerencias mientras escribe: productos/servicios/categorías), accesos rápidos de categorías (iconografía lineal del sprite, no emojis como iconografía principal), banner de promoción activa (desde `commerce_promotions`), grid con sistema de badges consistente (máx. 2 por card), filtros (sidebar desktop / bottom-sheet móvil) conectados a los query params que la API ya soporta.
3. **Detalle de producto** `/tienda/[slug].astro`:
   - `getStaticPaths()` consultando el catálogo en build time (misma máquina, acceso a MariaDB) → páginas con SEO real (H1 "Laptop ASUS TUF Gaming F15 en Cancún", JSON-LD Product). Entran al sitemap gratis vía `generate-sitemap.mjs`.
   - Items publicados después del último build: la página `/tienda` los sigue mostrando con el dialog actual (fallback). El rebuild ocurre en cada arranque vía `Encender_Web.bat`; se documenta que publicar ↔ rebuild para página estática. (Si la fricción se vuelve real, se evalúa SSR híbrido con `@astrojs/node` solo para `/tienda/*` — decisión diferida, NO en este plan.)
   - Layout: galería + panel comercial (precio anterior/actual, ahorro, stock, garantía, CTA), bloque de confianza junto al CTA, especificaciones (EAV del catálogo), estado del equipo (técnico/estético/batería/detalles — atributos), "qué incluye", servicios complementarios con checkboxes que actualizan el total (items SERVICE relacionados), similares.
   - Item SOLD con `sold_display_mode=KEEP_VISIBLE`: página atenuada, badge VENDIDO, "Avísame si llega algo similar" (form → `commerce_notifications`), similares. Nunca 404.
4. **`/tienda/promociones`**: activas / terminan pronto (solo con `ends_at` real — prohibida falsa urgencia) / últimas unidades / "ofertas que ya volaron" (SOLD).
5. **Carrito**: `localStorage` (anónimo, sin endpoints nuevos), drawer mini-carrito al agregar, página `/carrito` con resumen. Precios siempre re-validados contra `/api/commerce/catalog` antes de checkout.
6. **Checkout** `/checkout`: stepper Carrito→Datos→Pago→Confirmación, 2 columnas desktop / 1 móvil con resumen plegable, métodos: transferencia/efectivo/terminal (según `commerce_settings`). POST crea pedido → redirige a `/pedido/<folio>`.
7. **`/pedido/[folio]`**: éxito + estado + total + card de transferencia (beneficiario/banco/CLABE/referencia=folio, botones copiar) + upload de comprobante (drag&drop, preview, formatos/tamaño) + timeline de estados + relación con ticket de soporte. Todo vía `GET/POST /api/commerce/orders/:folio` con email.
8. **`/cuenta`**: nueva sección "Mis pedidos" (cards con folio, fecha, total, estado) consumiendo `/api/me/orders`.
9. **B2B**: cards "Pixon Empresas" en categoría servicios con CTA a ticket B2B (flujo de tickets existente).

---

## 5. Panel admin (extender el existente, no crear otro)

Nuevas vistas dentro de `src/pages/admin/admin.astro` (mismo patrón `view-*` + scripts en `public/scripts/admin-*.js` + estilos `admin-commerce.css`), tema oscuro existente:

- **Dashboard comercial**: periodo (hoy/7d/30d/año), cards (ventas, ganancia bruta si hay `cost_reference`, pedidos, pagos por verificar, equipos disponibles, stock bajo), gráfica de ingresos (SVG/CSS simple, sin librería pesada), actividad reciente (desde `commerce_notifications`).
- **Pedidos**: tabla con badges-resumen, detalle (cliente, items, totales, historial), visor de comprobante grande con monto/referencia esperados y acciones **Aprobar pago** (modal de confirmación) / **Rechazar** / **Solicitar otro**, acciones de estado del pedido, enlace al ticket relacionado.
- **Inventario**: cards (stock total, valor, disponibles, reservados, bajo stock), tabs por tipo, tabla de equipos únicos (SKU, costo, precio, estado, entrada), movimientos.
- **Catálogo**: al flujo de creación actual se le suma wizard por pasos (tipo → información → precio con rentabilidad [costo real/ganancia/margen] → inventario → multimedia → preview) y acciones rápidas (duplicar, marcar reservado/vendido, crear promoción). Creador de paquetes (items + precio normal calculado + precio paquete + ahorro).
- **Promociones**: tabs activas/programadas/finalizadas, wizard (tipo, alcance, duración, presentación), métricas (vendidos, ingresos).
- **Pagos**: bandeja por estado; **Configuración → métodos de pago** (form de transferencia con preview de lo que verá el cliente).
- **Campana de notificaciones** en la barra admin.
- Empty states, toasts, modales de confirmación y skeletons consistentes en todo lo nuevo.

---

## 6. Fases de ejecución (orden y criterio de salida)

| Fase | Contenido | Criterio de salida |
|---|---|---|
| **1. Backend pedidos** | Migración 003 + módulo orders/payments/inventory/promotions/settings/notifications + emails + permisos (ya sembrados) | `npm run db:migrate` aplica limpio; endpoints responden con envelope estándar; flujo completo probado con curl: crear pedido → subir comprobante → aprobar → stock/SOLD/movimientos/emails |
| **2. Storefront núcleo** | Home section, /tienda (buscador, categorías, banner promo, badges, filtros), detalle con getStaticPaths + página vendida, /tienda/promociones | `npm run build` + `npm run check` + `check:indexation` + `check:all-pages` verdes; SEO y mobile OK |
| **3. Compra** | Carrito + drawer, /carrito, /checkout, /pedido/[folio] (transferencia + comprobante + timeline), /cuenta mis pedidos | Flujo cliente completo de punta a punta en local |
| **4. Admin** | Dashboard, pedidos+comprobantes, inventario, wizard catálogo, promociones, pagos, configuración, campana | Flujo admin completo: publicar equipo → recibir pedido → aprobar pago → item SOLD |
| **5. Pulido** | Estados vacíos/carga/error, toasts, microinteracciones, accesibilidad, B2B cards, "avísame", QA total | Checklist AGENTS.md completo + auditorías del repo verdes |

Cada fase termina con: `npm run build`, `npm run check`, `check:indexation`, `check:inline-handlers`, y verificación manual en mobile 390px.

---

## 7. Restricciones técnicas permanentes

- CSP: **cero handlers inline** (`scriptSrcAttr 'none'`); JS externo en `public/scripts/` con cache-busting `?v=YYYYMMDD-N`; estilos inline permitidos pero auditados.
- `express.json` global = 10 kb: comprobantes van por raw body como la media de catálogo (añadir PDF al inspector).
- CSRF: toda mutación con `X-Requested-With: fetch`.
- SEO: 1 H1 por página, canonical exacto, `/admin`, `/cuenta`, `/carrito`, `/checkout`, `/pedido/*` con `noindex` (el generador de sitemap ya excluye por meta/prefijo — registrar los nuevos prefijos privados en `tools/generate-sitemap.mjs`).
- Nunca inventar stock, reseñas, contadores ni urgencia (brief §102): todo badge/contador sale de la BD.
- Datos bancarios solo desde `commerce_settings` (el `9463408967308` del brief es placeholder, jamás hardcodeado).

## 8. Decisiones diferidas (documentadas, fuera de este plan)

- SSR híbrido para `/tienda/*` si el rebuild por publicación resulta insuficiente.
- Proveedores de pago reales (Mercado Pago / Stripe): el brief los marca como "futura integración"; aquí solo se prepara la UX de métodos.
- App React/Vite y app Tauri consumiendo esta API: viables después sobre los mismos endpoints `/api/commerce/*` (mismo origen o token), no forman parte de este plan.
