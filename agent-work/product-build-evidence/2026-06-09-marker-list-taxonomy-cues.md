# Marker list taxonomy cues

Date: 2026-06-09

## Product gap

The marker-list target calls for taxonomy icons, quote context, severity,
related/learning orientation, and mobile marker filters. Rows already linked to
marker detail and had taxonomy asset icons, severity, quote, time, speaker, and
archetype, but the list did not give the user a compact cue for what the
detected pattern means or what to look for.

## Changes

- Added a marker-type pill to each marker row (`Fallacy`, `Bias`, or
  `Rhetoric`).
- Added a compact `Watch for:` cue sourced from the taxonomy entry's first
  `how_to_spot` item, falling back to the taxonomy definition when needed.
- Kept rows linked to the marker detail route, where the deeper learning route
  remains available.
- Added focused coverage using the real `slippery_slope` taxonomy entry.

## Browser verification

Target:
`http://localhost:3000/session?demo=validation&sample=cable_008&view=markers`

Viewport: 390 x 844

Observed:

- The rendered title was `All markers`.
- The validation sample rendered six marker rows.
- Marker rows showed a marker type cue and `Watch for:` learning copy.
- The first marker row fit inside the 390px viewport at 358px wide.
- The `Export filtered markers` button remained 44px.
- The marker list showed no horizontal overflow at 390px.

## Verification

- `npx vitest run tests/filtered-list.test.tsx tests/filter-selectors.test.ts`
- Browser check at 390 x 844 for marker row count, taxonomy cue, target sizing,
  and overflow
- `npm run build:automation`
- `npx tsc --noEmit`
- `git diff --check`
