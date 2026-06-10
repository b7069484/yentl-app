# Source Review Runtime Hardening

Date: 2026-06-09

## Scope

Hardened Source Review against malformed or legacy restored text-source payloads after the dev runtime exposed `TypeError: blocks.find is not a function`. This keeps imported-source review from crashing when older persisted document metadata or corrupt restored source state reaches the UI.

## Product Behavior Proven

- Source Review now tolerates non-array `document_meta.outline` values and falls back to paragraph splitting.
- Source Review now ignores invalid outline items instead of trusting persisted shape.
- Source Review now treats non-string restored `initial_text` as unavailable source text and renders the empty state instead of crashing.
- Source block helpers normalize block input before using array methods, preventing `blocks.find` and block filtering crashes from malformed call sites.
- First-block title detection no longer labels a normal complete sentence as `Title`; short heading-like first blocks still retain the `Title` behavior needed for weak title-anchor routing.
- Browser proof on `/session?demo=validation&sample=source_quote_anchors&view=source` showed:
  - 3 source blocks rendered.
  - focused source block rendered.
  - persisted source quote highlight rendered.
  - anchored findings, claims-in-focus, claim map, and source quote sections rendered.
  - desktop `1280 x 720`: `scrollWidth=1280`, `clientWidth=1280`, no horizontal overflow.
  - mobile `390 x 844`: `scrollWidth=390`, `clientWidth=390`, no horizontal overflow.
  - browser console errors: none.

## Files Changed

- `components/session/source-review-view.tsx`
- `tests/source-review-view.test.tsx`

## Gates

- `npm test -- tests/source-review-view.test.tsx`
  - 1 file passed
  - 11 tests passed
- `npx tsc --noEmit`
  - passed
- `npm test -- tests/source-review-view.test.tsx tests/source-router.test.tsx tests/source-evidence.test.ts tests/session-page.test.tsx tests/project-validation-page.test.tsx tests/api/corpus-sample.test.ts`
  - 6 files passed
  - 64 tests passed
- `npm run lint`
  - passed with existing warnings only
- `npm run build`
  - passed
- `npm run test:run`
  - 146 files passed
  - 1591 tests passed

## Notes

- The browser proof used the existing local dev server on port 3000.
- The hardening is intentionally defensive at the view boundary because restored local sessions and loop-generated validation payloads can be older than the current TypeScript types.
