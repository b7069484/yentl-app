# TV Room Mode

Date: 2026-06-09 03:29 EDT

## Product Change

- Added `/tv` as a read-only room display route for the active Yentl session, with validation-sample hydration via `?demo=validation&sample=...`.
- Added `components/session/tv-dashboard.tsx` with:
  - Empty-state entry for starting a session or loading the validation sample.
  - Large-screen session header with source/status, session/library links, and room metrics.
  - Synthesis summary, latest claims, transcript-now panel, and rhetoric-signal panel.
  - Claim and marker drilldown links back into the normal session detail route.
- Added product entry points:
  - Homepage `Room mode` CTA and `Room display` use-case row.
  - Active-session toolbar `Room` link with mobile-sized touch target.

## Verification

- Focused tests:
  - `npx vitest run tests/tv-dashboard.test.tsx tests/public-entry-pages.test.tsx tests/session-shell.test.tsx`
  - Result: 3 files passed, 52 tests passed.
- Production build:
  - `npm run build:automation`
  - Result: passed; `/tv` appears as a dynamic route in the Next build output.
- Typecheck:
  - `npx tsc --noEmit`
  - Result: passed.
- Diff hygiene:
  - `git diff --check`
  - Result: passed.

## Browser Proof

- `http://127.0.0.1:3000/tv` at 1280x720:
  - Empty state rendered `Open a Yentl session on the big screen.`
  - `Start a session` linked to `/session`.
  - `Load sample` linked to `/tv?demo=validation&sample=solo_005`.
  - No horizontal overflow and no console errors.
- `http://127.0.0.1:3000/tv?demo=validation&sample=solo_005` at 1280x720:
  - Validation sample hydrated into room mode.
  - Rendered `Yentl's Read`, `Latest Claims`, `Transcript Now`, and `Rhetoric Signals`.
  - Session and Library links were present.
  - 2 claim detail links were present.
  - Metrics rendered: 8 transcript lines, 2 claims, 0 markers, 1 linked source with 1 high-reputation source.
  - No console errors.
- Same sample at 390x844:
  - No horizontal overflow.
  - Core headings remained visible: validation title, `Yentl's Read`, `Latest Claims`, `Transcript Now`, `Rhetoric Signals`.

## Remaining Product Gap

This is the first TV/room-display slice. It proves a responsive web TV surface and active-session/sample entry points, but it is not yet a native Apple TV/Android TV app or a shareable remote TV session receiver.
