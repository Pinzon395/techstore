# Legacy Archive

This directory is a read-only archive of pre-Astro assets and migration helpers.

Rules:

- Do not import files from `tools/legacy/**` in production code.
- Do not edit these files for new behavior.
- If a legacy file is still useful, migrate the relevant behavior into `src/`,
  `public/`, or `server/` and cover it with the normal build/audit flow.
- Delete legacy files only in a dedicated cleanup step after confirming no
  references exist outside `tools/legacy/**`.

Current groups:

- `root-components/`: old component implementations kept for reference.
- `root-public-scripts/`: old browser scripts replaced by `public/scripts/`.
- `root-scripts/`: one-off migration or repair scripts.
- `root-styles/`: old global CSS snapshots.
