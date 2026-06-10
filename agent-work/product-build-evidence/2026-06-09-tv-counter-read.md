# 2026-06-09 TV Counter-Read

## Product slice

- TV room mode now renders a `Counter-read` panel when the session has a fresh, refreshing, or error-state Devil's Advocate brief.
- The panel shows the skeptical stance, three strongest counterarguments, weakest assumption, and two pressure-test questions.
- Long TV titles now wrap across desktop and mobile room-mode widths instead of truncating.
- Validation demo hydration now carries optional `devil_advocate` payloads through both `/tv?demo=validation&sample=...` and `/session?demo=validation&sample=...`.
- The `source_quote_anchors` validation sample now includes a deterministic counter-read so room mode can prove synthesis plus skeptical analysis together.

## Files touched in this slice

- `components/session/tv-dashboard.tsx`
- `components/session/validation-sample-hydrator.tsx`
- `app/session/page.tsx`
- `app/api/corpus-sample/route.ts`
- `tests/tv-dashboard.test.tsx`
- `tests/api/corpus-sample.test.ts`

## Browser proof

- Route: `http://127.0.0.1:3000/tv?demo=validation&sample=source_quote_anchors`
- Desktop/default viewport: `1280x720`
  - Counter-read visible: yes
  - Skeptical stance visible: yes
  - Weakest assumption visible: yes
  - Pressure-test question visible: yes
  - Document horizontal overflow: no (`documentWidth=1280`, `clientWidth=1280`)
  - Visible text overflowers after title fix: none
  - Console errors: none
- Mobile viewport: `390x844`
  - Counter-read visible: yes
  - Skeptical stance visible: yes
  - Weakest assumption visible: yes
  - Pressure-test question visible: yes
  - Document horizontal overflow: no (`documentWidth=390`, `clientWidth=390`)
  - Visible text overflowers: none
  - Console errors: none
- The temporary browser viewport override was reset after mobile verification.

## Gates

- `npm test -- tests/tv-dashboard.test.tsx tests/api/corpus-sample.test.ts` passed: 2 files, 9 tests.
- `npm test -- tests/tv-dashboard.test.tsx` passed after final heading polish: 1 file, 2 tests.
- `npx tsc --noEmit` passed.
- `npm run build` passed after final changes.
- `npm run test:run` passed after final changes: 146 files, 1599 tests.
- `npm run lint` exited 0 with existing warnings in unrelated files.

## Remaining product direction

This does not complete the Yentl goal. It closes one platform/metaview gap: the TV surface now carries the adversarial/counter-read layer instead of showing only the synthesis, claims, transcript, and rhetoric markers.
