# 2026-06-11 M6 Extension Workspace Snapshot Proof

## Scope

Closed the extension-to-full-workspace continuity gap without pretending live
sync exists. A browser-tab extension panel snapshot now has a durable,
room/workspace-friendly validation path that preserves source identity, claims,
markers, synthesis, and export/review routes.

## Product Change

- Added a browser-tab snapshot card to the main session overview for restored or
  captured `browser_tab` sessions with transcript/finding content.
- Added deterministic `extension_snapshot` validation sample data through
  `/api/corpus-sample`.
- Added the sample to the validation lab and runbook.
- Updated the flow atlas so snapshot handoff is no longer marked as missing;
  future live sync remains a separate target state.
- Extended `npm run mobile:proof:local` to include
  `/session?demo=validation&sample=extension_snapshot&view=overview`.

## Proof

In-app browser proof:

- Desktop route:
  `http://127.0.0.1:3000/session?demo=validation&sample=extension_snapshot&view=overview`
- Card rendered: `EXTENSION SNAPSHOT`, `Civic Ledger hearing clip`,
  `news.example`, `Live tab sync is not assumed after the handoff`.
- Links present: Transcript, Claims, and `Open original`.
- Console errors: 0.
- Horizontal overflow: 0.
- 390px viewport check: card rendered at 342px wide, console errors 0,
  horizontal overflow 0.

Repeatable proof artifact:

```json
{
  "ok": true,
  "generated_at": "2026-06-11T20:10:48.910Z",
  "route_count": 18,
  "check_count": 54,
  "failures": 0
}
```

Artifact:

- `docs/superpowers/validation/mobile-pwa-local-proof.json`

## Verification

- `npx vitest run tests/api/corpus-sample.test.ts tests/home-overview.test.tsx tests/project-validation-page.test.tsx tests/extension-panel-view.test.tsx tests/ux-flow-dashboard.test.tsx tests/mobile-pwa-proof-script.test.ts` passed: 6 files, 54 tests.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run test:run` passed: 166 files, 1751 tests.
- `npm run build:automation` passed: 42/42 static pages.
- `npm run mobile:proof:local` passed: 18 route surfaces, 54 width checks, 0 failures.
- `git diff --check` passed.

## Remaining M6 Work

- True live full-workspace sync from an active extension tab remains future work.
- Real article/video/YouTube extension variants still need more exact same-page
  captures.
- Chrome Web Store listing assets and repeated latency sampling remain open.
