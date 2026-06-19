# M4 Mobile Source-Path Proof - 2026-06-11

## Scope

Expanded the mobile/PWA browser proof from broad entry pages into the actual
source-specific intake paths a mobile user will hit.

## Product Path Proven

`npm run mobile:proof:local` now checks 14 route surfaces at `390px`, `430px`,
and `768px`:

- `/mobile`
- `/session`
- `/session?source=youtube`
- `/session?source=web-url`
- `/session?source=media-url`
- `/session?source=audio-file`
- `/session?source=text-doc`
- `/session?source=claim`
- `/session?source=browser-tab`
- `/session?title=Shared%20note&text=The%20claim%20is%20specific.`
- `/session?title=Shared%20article&url=https%3A%2F%2Fexample.com%2Farticle`
- `/session?title=Shared%20clip&url=https%3A%2F%2Fexample.com%2Fclip.mp3`
- `/sessions`
- `/tv?demo=validation&sample=cable_008`

The proof fails on horizontal overflow, console/runtime errors, or missing
route-specific mobile text.

## Artifact

- `docs/superpowers/validation/mobile-pwa-local-proof.json`

Latest proof summary:

```json
{
  "ok": true,
  "generated_at": "2026-06-11T18:12:10.893Z",
  "widths": [390, 430, 768],
  "route_count": 14,
  "check_count": 42,
  "failures": []
}
```

## What This Closes

- Mobile source routes now prove their expected intake panes instead of only
  proving that `/session` renders.
- Web/article share URLs route into web-page ingest.
- Direct-media share URLs route into direct-media ingest.
- Browser-tab capture on mobile is explicitly routed to the desktop Chrome
  extension limit/hand-off surface.

## Verification

```bash
node --check scripts/validation/prove-mobile-pwa-local.mjs
npx vitest run tests/mobile-pwa-proof-script.test.ts tests/public-entry-pages.test.tsx tests/manifest.test.ts tests/ux-flow-dashboard.test.tsx tests/sessions-library-page.test.tsx
npm run mobile:proof:local
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
```

Results:

- Static mobile proof tests: 5 files, 39 tests passed.
- Mobile browser proof: passed, 14 route surfaces, 42 checks, 0 failures.
- TypeScript: passed.
- Lint: passed.
- Full Vitest: 162 files, 1718 tests passed.
- Automation build: passed, 42/42 static pages.
