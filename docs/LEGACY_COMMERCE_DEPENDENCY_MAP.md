# Legacy commerce dependency map

## Canonical transactional commerce

`catalog_items` plus `commerce_*` is the canonical source for the public store,
cart, checkout, orders, payments, reservations, promotions and inventory.
New transactional commerce must not write `products` or `builds`.

## Active legacy builds boundary

| Entity / endpoint | Readers | Writers | Status | Retirement condition |
| --- | --- | --- | --- | --- |
| `products` + `builds` | `getAllBuildsPublic`, `getAllBuildsAdmin`, `/api/builds`, `/api/admin/builds`, admin Builds view | `insertBuildAdmin` via `POST /api/admin/builds` | Active legacy | Move the admin Builds workflow and its public consumers to `catalog_items`, then verify historical build attributes are represented. |
| `product_images` | legacy build queries | legacy build creation | Active legacy | Migrate image references with the build records. |
| `/api/builds` | public build consumers | none | Active legacy API | Deprecate only after callers use a catalog-backed endpoint. |
| `/api/admin/builds` | `public/scripts/admin.js` | `public/scripts/admin.js` | Active legacy API | Replace admin view before removal. |

## Guardrail

Do not delete legacy tables, endpoints, or data during this phase. The migration
order is: stop new legacy writes, migrate readers, validate catalog parity,
deprecate endpoints, then retire in a separately approved migration.
