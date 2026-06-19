# M4 Mobile/PWA Video Share Contract Proof - 2026-06-11

## Scope

Closed the mobile/PWA drift after the backend media-ingest hardening. The installed app and mobile share paths now have explicit proof for direct video URLs and installed-file launches across MP4, MOV, and WebM.

## Product/Proof Change

- `scripts/validation/prove-pwa-native-contract.ts` now requires launch-ready video MIME types (`video/mp4`, `video/quicktime`, `video/webm`) and proves routing for MP4, MOV, typed WebM, and extension-only WebM.
- `tests/manifest.test.ts` now locks both `audio/webm` and `video/webm` in the manifest file-handler accept map.
- `tests/pwa-file-launch-handler.test.tsx` now proves launched MOV and WebM files stage into the audio/video pane.
- `tests/session-page.test.tsx` now proves mobile share-target direct MP4/MOV/WebM URLs and explicit `source=media-url` MP4/MOV/WebM URLs route into the media pane.
- `scripts/validation/prove-mobile-pwa-local.mjs` now includes a rendered mobile proof route for a shared MP4 direct-media URL.

## Proof

Focused contract/test pass:

```bash
npx vitest run tests/manifest.test.ts tests/pwa-file-launch-handler.test.tsx tests/pwa-native-contract-proof-script.test.ts tests/mobile-pwa-proof-script.test.ts tests/session-page.test.tsx tests/session-route.test.ts
npx tsx scripts/validation/prove-pwa-native-contract.ts
```

Result: 6 files passed, 52 tests passed. PWA/native contract proof passed at `2026-06-12T00:08:24.587Z`.

Rendered mobile proof:

```bash
YENTL_MOBILE_PROOF_ORIGIN=http://localhost:3000 npm run mobile:proof:local
```

Result: passed at `2026-06-12T00:09:56.594Z`, 20 routes across 390, 430, and 768px, 0 failures. The route list now includes `share-target-video-url` for `/session?title=Shared%20video%20clip&url=https%3A%2F%2Fexample.com%2Fclip.mp4`.

Broad verification:

```bash
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
git diff --check
```

Results:

- Typecheck: passed.
- Lint: passed.
- Full Vitest: 170 files passed, 1804 tests passed.
- Automation build: passed, 42/42 static pages.
- Diff check: passed.

## Boundary

- This proves web/PWA manifest, launch routing, mobile route rendering, and share-target URL handoff. It does not replace physical iOS/Android share-sheet/file-picker proof.
- Extension-only `.webm` fallback still infers `audio/webm` when the operating system provides no MIME type; typed `video/webm` launches route as `video/webm`.
