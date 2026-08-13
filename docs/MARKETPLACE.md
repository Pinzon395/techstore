# Marketplace Pixon PC

Estado del código: implementado sobre el catálogo commerce existente. La activación en una base concreta requiere aplicar las migraciones `002` a `006` después del backup cifrado obligatorio.

## Arquitectura

- Express mantiene el único backend y monta API pública en `/api/commerce`, API de cuenta en `/api/me` y administración RBAC en `/api/admin/commerce`.
- Astro genera tienda, detalle de publicaciones, carrito, checkout, seguimiento y las vistas incorporadas al admin existente. La interacción vive en `public/scripts/` y cumple la CSP sin handlers nuevos inline.
- MariaDB es autoridad de precios, promociones, stock, reservas, folios, pedidos y pagos. `Money` opera en unidades menores y la persistencia usa `DECIMAL(12,2)`.
- Los comprobantes son cuerpo raw, nunca JSON/base64. Se guardan fuera de `public/` con UUID, permisos restrictivos, magic bytes, MIME real, extensión, tamaño y SHA-256.

## Tablas añadidas por `003_commerce_orders.sql`

`commerce_counters`, `commerce_orders`, `commerce_order_items`, `commerce_payments`, `commerce_order_status_history`, `commerce_inventory_movements`, `commerce_order_inventory_reservations`, `commerce_bundle_items`, `commerce_promotions`, `commerce_promotion_items`, `commerce_notifications` y `commerce_settings`.

Los items conservan snapshots de nombre, SKU, tipo, costo y precios. Las reservas conservan además el snapshot operativo de componentes físicos de bundles.

## Administración extensible (`004_commerce_admin_catalog.sql`)

La migración `004` agrega `catalog_product_kinds` y `catalog_product_kind_attributes`. La familia estable (`EQUIPMENT`, `HARDWARE`, `PRODUCT`, `SERVICE`, `BUNDLE`) sigue siendo compatible con la tienda y cada artículo puede indicar un subtipo extensible como `LAPTOP`, `GAMING_PC`, `CPU`, `GPU`, `RAM`, `STORAGE`, `PART` o `PERIPHERAL`. El formulario obtiene su ficha y atributos desde la API; agregar otro subtipo no exige construir otro formulario.

También añade código interno, modelo, IVA informativo, ubicación, proveedor, video y palabras clave SEO. Los movimientos incorporan cantidades anterior/nueva y razones operativas adicionales. Las rutas administrativas directas protegidas son `/admin/commerce`, `/admin/commerce/store`, `/admin/commerce/sales`, `/admin/commerce/orders`, `/admin/commerce/payments`, `/admin/commerce/inventory`, `/admin/commerce/promotions` y `/admin/commerce/payment-methods`; el hash antiguo se conserva únicamente como compatibilidad.

## Estados y transiciones

Flujo normal: `PENDING_PAYMENT → PAYMENT_REVIEW → PAID → PREPARING → READY → COMPLETED`.

El rechazo de comprobante vuelve de `PAYMENT_REVIEW` a `PENDING_PAYMENT`. La cancelación sólo es válida desde estados abiertos; antes del pago libera reserva y después del pago registra devolución. Todo cambio crea historial y las operaciones administrativas relevantes crean auditoría.

## Endpoints principales

Públicos y cuenta:

- `POST /api/commerce/orders`
- `GET /api/commerce/orders/:folio` — exige sesión propietaria o `X-Customer-Email` coincidente
- `POST /api/commerce/orders/:folio/payment-proof`
- `GET /api/commerce/settings/payment-methods`
- `GET /api/commerce/promotions`
- `GET /api/me/orders`

Administración:

- `GET /api/admin/commerce/orders`
- `GET /api/admin/commerce/orders/:id`
- `PATCH /api/admin/commerce/orders/:id/status`
- `PATCH /api/admin/commerce/orders/:id/ticket`
- `POST /api/admin/commerce/orders/:id/payments/:pid/approve`
- `POST /api/admin/commerce/orders/:id/payments/:pid/reject`
- `GET /api/admin/commerce/payments`
- `GET /api/admin/commerce/inventory/movements`
- `GET /api/admin/commerce/inventory/items`
- `POST /api/admin/commerce/inventory/adjust`
- `GET /api/admin/commerce/product-kinds`
- `POST /api/admin/commerce/catalog/:id/duplicate`
- `POST /api/admin/commerce/catalog/:id/hide`
- `DELETE /api/admin/commerce/catalog/:id`
- CRUD `/api/admin/commerce/promotions`
- `GET|PUT /api/admin/commerce/settings/payment-methods`
- `GET /api/admin/commerce/notifications`
- `GET /api/admin/commerce/reports/dashboard`

Las mutaciones requieren same-origin y `X-Requested-With: fetch`. Los endpoints admin aplican permisos específicos.

## Pedido, inventario y concurrencia

Crear un pedido bloquea las filas del catálogo en orden estable, recalcula precios y promociones, valida disponibilidad, reserva componentes físicos, genera el folio con contador atómico, persiste snapshots, pago, historial, movimientos y notificación dentro de una sola transacción.

La llave de idempotencia se serializa mediante una fila de contador antes de buscar/crear el pedido. Una respuesta perdida puede reintentarse sin duplicar venta. La restricción única es una segunda defensa.

La aprobación bloquea pago y pedido. Sólo consume reservas `RESERVED`, descuenta `stock_quantity`, reduce `reserved_quantity`, registra `SALE` y marca equipos sin stock como `SOLD`. Una segunda aprobación devuelve replay sin consumir inventario. Un mantenimiento automático libera reservas vencidas cada cinco minutos y el mismo proceso se ejecuta de forma oportunista en tráfico de pedidos.

## Configuración bancaria

Los métodos se guardan en `commerce_settings.payment_methods`. Transferencia inicia desactivada y sin beneficiario, banco, cuenta, CLABE ni tarjeta. Para activarla el admin debe configurar al menos una cuenta, CLABE o tarjeta. No existe una cuenta bancaria codificada en frontend, correo o controladores. La auditoría redacta claves sensibles.

## Promociones

Se soportan `PERCENT`, `FIXED`, `SALE_PRICE` y `BUNDLE_PRICE`, con alcance por artículo, categoría o marca. Las reglas pueden exigir cupón, cantidad mínima o subtotal mínimo y limitar usos globales o por cliente. La evaluación es autoritativa en backend y ordena por prioridad; `stackable` permite acumular reglas compatibles y `stop_processing` detiene reglas posteriores. Fechas, elegibilidad y consumo se validan dentro de la transacción del pedido.

## Refunds y devoluciones

`commerce_refunds` registra reembolsos parciales y totales sin permitir superar el monto aprobado. La fila de pago se bloquea para serializar solicitudes concurrentes, cada operación usa idempotencia y el estado agregado del pago pasa a `PARTIALLY_REFUNDED` o `REFUNDED`. Los refunds manuales requieren confirmación administrativa; los externos quedan en procesamiento hasta la respuesta real del proveedor.

Una devolución física es una entidad distinta en `commerce_returns` y `commerce_return_items`. Recibir una devolución configurada para reingreso actualiza stock una sola vez y crea un movimiento `RETURN`; reembolsar dinero no altera inventario por sí mismo.

## Proveedores externos

Stripe, PayPal y Mercado Pago tienen adaptadores reales para refunds, verificación de webhooks e idempotencia. Se configuran desde variables de entorno y el admin solo recibe estado de disponibilidad, nunca credenciales. Un proveedor no puede habilitarse hasta que sus variables obligatorias existan. No hay modo simulado: sin credenciales permanece desactivado.

- `POST /api/commerce/webhooks/:provider`
- `GET|PUT /api/admin/commerce/settings/payment-providers`
- `GET /api/admin/commerce/payments/:pid/refunds`
- `POST /api/admin/commerce/orders/:id/payments/:pid/refunds`
- `POST /api/admin/commerce/refunds/:rid/complete`
- `POST /api/admin/commerce/refunds/:rid/cancel`
- `POST /api/admin/commerce/orders/:id/returns`
- `PATCH /api/admin/commerce/returns/:rid/status`

Las variables requeridas están enumeradas en `.env.example`. La creación/captura de pagos externos y sus pruebas de extremo a extremo requieren cuentas, credenciales y endpoints de webhook reales del ambiente objetivo.

## Despliegue y QA

```bash
npm run db:migrate:plan
npm run db:backup:encrypted
npm run db:backup:verify -- <archivo.pixonbak>
npm run db:migrate
npm run db:migrate:verify
npm run db:commerce:verify
npm run test:commerce
npm run test:commerce:e2e
npm run typecheck
npm run build
npm run check
npm run check:indexation
npm run check:inline-handlers
npm run check:all-pages
```

`DB_BACKUP_KEY` debe tener al menos 20 caracteres y conservarse fuera de Git. Nunca se debe saltar el backup para aplicar las migraciones.
