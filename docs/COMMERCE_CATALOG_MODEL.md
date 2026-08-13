# Modelo del catálogo comercial

La migración `server/sql/migrations/002_commerce_catalog.sql` introduce el primer corte del motor comercial sin retirar las tablas actuales. Durante la transición, `products`, `services`, `builds` y `components` continúan disponibles para las rutas heredadas; el código nuevo debe leer y escribir el catálogo central.

## Límites del primer corte

Este corte incorpora:

- RBAC normalizado mediante `permissions` y `role_permissions`.
- Auditoría ampliada y compatible con `admin_logs.diff`.
- Catálogo central, categorías jerárquicas y clasificación muchos-a-muchos.
- Atributos tipados, definiciones por categoría y valores por artículo.
- Multimedia extensible a imágenes, video, documentos y reportes.
- Badges administrables y asignaciones con vigencia.
- Adaptadores persistentes al esquema comercial legado.

Inventario serializado, reservas, bundles operativos, promociones, carrito, pedidos y pagos pertenecen a migraciones posteriores. `catalog_items.stock_quantity` es la proyección de disponibilidad del primer corte, no sustituye el futuro ledger de inventario.

## Entidad central

`catalog_items` representa cualquier elemento vendible. Los tipos están controlados por `catalog_item_types`: `PRODUCT`, `EQUIPMENT`, `HARDWARE`, `SERVICE` y `BUNDLE`. Los estados provienen de `catalog_item_statuses`: `DRAFT`, `ACTIVE`, `RESERVED`, `SOLD`, `OUT_OF_STOCK`, `HIDDEN` y `ARCHIVED`.

Las condiciones también están normalizadas. Un servicio usa `NOT_APPLICABLE`; un equipo puede usar `NEW`, `OPEN_BOX`, `USED`, `REFURBISHED` o `FOR_PARTS`.

Reglas importantes:

- `public_id` es la identidad pública; `id` queda reservado para relaciones internas.
- `cost_reference` es privado y jamás debe formar parte de un DTO público.
- `sale_price`, si existe, no puede superar `base_price`.
- `reserved_quantity` no puede superar `stock_quantity`.
- `version` permite bloqueo optimista en ediciones administrativas.
- `sold_display_mode` acepta `KEEP_VISIBLE`, `HIDE` o `REDIRECT`.
- Las bajas comerciales se expresan con estado y `deleted_at`; no se deben borrar ventas históricas.

## Categorías y atributos

`catalog_categories` usa una autorrelación `parent_id` y slugs globalmente únicos. `catalog_item_categories` permite varias categorías, pero una columna generada e índice único garantizan como máximo una categoría primaria por artículo.

Las definiciones viven en `catalog_attribute_definitions`. El nombre técnico es `attribute_key` para evitar la palabra reservada `key`. Los tipos posibles son `TEXT`, `INTEGER`, `DECIMAL`, `BOOLEAN`, `DATE` y `JSON`.

`catalog_item_attribute_values` dispone de una columna física por familia de tipo y exige exactamente un valor no nulo. La aplicación además debe comprobar que la columna elegida corresponde con `catalog_attribute_definitions.data_type`; esa regla cruza tablas y no puede expresarse mediante un `CHECK` local.

## Multimedia

`catalog_media` acepta una ubicación pública (`url`) o una clave de almacenamiento (`storage_key`). Para cargas nuevas deben guardarse MIME detectado, tamaño y SHA-256; el nombre original del navegador no es una ruta confiable.

La columna generada `primary_item_id` garantiza como máximo una imagen principal por artículo. `legacy_source_type` y `legacy_source_id` hacen idempotente la importación de `product_images` y `component_images`.

## Compatibilidad heredada

`catalog_legacy_links` es el único puente polimórfico admitido. No se agregan claves foráneas desde el catálogo hacia tablas heredadas porque cada tipo apunta a una tabla distinta.

Mapeo inicial:

| Origen | Tipo central | Particularidad |
| --- | --- | --- |
| `products` | `PRODUCT` | Conserva precio, SEO, stock e imágenes. |
| `products` + `builds` | `BUNDLE` | Un build comparte el mismo `catalog_item` que su product; recibe enlaces `PRODUCT` y `BUILD`. |
| `services` | `SERVICE` | No controla stock y conserva duración/garantía como atributos. |
| `components` | `HARDWARE` | Conserva marca, stock, costo, atributos, specs e imágenes. |

El backfill no altera las fuentes. Los `public_id` importados son UUID con formato estable derivados del tipo y el identificador heredado. Esto permite reanudar una aplicación interrumpida entre DDL y DML. Si un SKU colisiona entre fuentes se deja `NULL` en el catálogo y se conserva el valor original en `source_snapshot`; no se inventa una identidad comercial. Si un slug colisiona, se añade un sufijo determinista.

## Auditoría y permisos

`admin_logs.diff` permanece para no romper el panel actual. Las operaciones nuevas pueden guardar además `before_data`, `after_data`, `metadata`, `request_id` y un `transaction_id CHAR(36)`. El registro de auditoría debe insertarse con la misma conexión y transacción que la modificación de negocio.

El acceso efectivo debe ser la unión de permisos del rol (`role_permissions`) y excepciones existentes de usuario (`user_permissions`). El seed concede todos los permisos al rol `admin`, conserva las capacidades editoriales del rol `editor` y solo lectura de inventario al rol `tecnico`.

## Verificación posterior a la migración

Antes de habilitar el módulo, staging debe comprobar que no haya fuentes sin enlace:

```sql
SELECT 'products' source, COUNT(*) missing
FROM products p
LEFT JOIN catalog_legacy_links l
  ON l.legacy_entity_type = 'PRODUCT' AND l.legacy_entity_id = p.id
WHERE l.catalog_item_id IS NULL
UNION ALL
SELECT 'services', COUNT(*)
FROM services s
LEFT JOIN catalog_legacy_links l
  ON l.legacy_entity_type = 'SERVICE' AND l.legacy_entity_id = s.id
WHERE l.catalog_item_id IS NULL
UNION ALL
SELECT 'builds', COUNT(*)
FROM builds b
LEFT JOIN catalog_legacy_links l
  ON l.legacy_entity_type = 'BUILD' AND l.legacy_entity_id = b.id
WHERE l.catalog_item_id IS NULL
UNION ALL
SELECT 'components', COUNT(*)
FROM components c
LEFT JOIN catalog_legacy_links l
  ON l.legacy_entity_type = 'COMPONENT' AND l.legacy_entity_id = c.id
WHERE l.catalog_item_id IS NULL;
```

También deben revisarse warnings del cliente SQL: los enlaces e importaciones multimedia usan `INSERT IGNORE` para no sobrescribir relaciones o una imagen principal ya administrada durante un reinicio parcial. La consulta de reconciliación anterior convierte cualquier omisión inesperada en un hallazgo visible antes de habilitar el módulo.

## Rollback

La activación se controla en aplicación, no eliminando tablas. El rollback operativo consiste en desactivar el módulo nuevo y mantener las rutas heredadas. No se deben ejecutar `DROP TABLE` automáticos después de que el catálogo reciba escritura propia: a partir de ese momento sus datos ya no son reconstruibles únicamente desde las tablas anteriores.
