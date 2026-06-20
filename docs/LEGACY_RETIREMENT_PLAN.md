# Legacy Retirement Plan

Goal: remove old assets without breaking routes, admin workflows, or visual regressions.

## Policy

`tools/legacy/**` is an archive. Production code should not depend on it.

Before deleting a legacy group:

1. Search references with `rg "tools/legacy|root-components|root-public-scripts|root-styles"`.
2. Run `npm run build`.
3. Run visual screenshots for representative public pages.
4. Keep deletion in a dedicated commit/change set.

## Priority

1. `tools/legacy/root-styles/`
   Old CSS snapshots. Keep until service/global CSS cleanup is stable for one release.

2. `tools/legacy/root-public-scripts/`
   Old browser scripts. Verify modern equivalents under `public/scripts/`.

3. `tools/legacy/root-components/`
   Old UI references. Migrate only if a component is still needed.

4. `tools/legacy/root-scripts/`
   One-off migration scripts. Delete after confirming no current workflow references them.

## Current Safe Boundary

New work should use:

- `src/components/**` for Astro components.
- `src/data/services/**` for service data.
- `src/lib/**` for service routing, SEO, schema, and helper logic.
- `public/styles/**` only for explicitly route-scoped CSS loaded by a page or view.
