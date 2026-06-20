# Service Architecture

Service pages should scale from data first.

## Data Layer

- Source of truth: `src/data/services/**`.
- Aggregator and route index: `src/data/services.ts`.
- Dynamic route generation should use `SERVICE_ROUTES`.

## Rendering Rules

- Service flags live in `src/lib/service-page-rules.ts`.
- Special view selection lives in `src/lib/service-view-registry.ts`.
- `src/pages/servicios/[categoria]/[servicio].astro` should focus on layout,
  legacy fallback markup, and composition.

## CSS Rules

- Shared site CSS belongs in `src/styles/global.css` and should stay small.
- Route-specific public CSS belongs in `public/styles/**` and must be linked by
  the page or view that actually needs it.
- Legacy CSS is allowed only as a temporary dependency while old views are
  migrated.

## Image Rules

- Astro pages should reference WebP/AVIF for local raster images.
- Run `npm run check:images` before shipping.
- Run `npm run check:images:inventory` when deciding what to optimize or remove.
