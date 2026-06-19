# M4 PWA Native-Contract Proof - 2026-06-11

## Scope

Closed the M4 native-shell decision/proof gap for the current v1 strategy:
Yentl is mobile web/PWA first, with no native iOS or Android store shell shipped
in v1.

## Product Change

- `/mobile` now includes an explicit native-shell status section.
- The mobile page states that the supported v1 mobile surface is the installable
  web app and that native iOS/Android store shells are not shipped in v1.
- The same section explains that installed-capable browsers can hand audio,
  video, captions, PDFs, DOCX, Markdown, and text files into `/session`.

## Proof Artifact

- `docs/superpowers/validation/pwa-native-contract-proof.json`

Latest proof summary:

```json
{
  "ok": true,
  "generated_at": "2026-06-11T18:30:36.776Z",
  "native_shell_status": "not_shipped_v1_pwa_first",
  "check_count": 6,
  "failures": []
}
```

Checks passed:

- `manifest-install-contract`
- `share-target-contract`
- `file-handler-contract`
- `launch-file-routing`
- `asset-contract`
- `mobile-native-shell-copy`

## Browser Proof

`npm run mobile:proof:local` now also checks the rendered native-shell status on
`/mobile` at `390px`, `430px`, and `768px`.

Latest mobile proof:

```json
{
  "ok": true,
  "generated_at": "2026-06-11T18:33:26.446Z",
  "route_count": 17,
  "check_count": 51,
  "failures": []
}
```

## Verification

```bash
npm run pwa:proof:native
npx vitest run tests/pwa-native-contract-proof-script.test.ts tests/manifest.test.ts tests/public-entry-pages.test.tsx tests/pwa-file-launch-handler.test.tsx tests/text-ingest-pane.test.tsx tests/audio-ingest-pane.test.tsx
node --check scripts/validation/prove-mobile-pwa-local.mjs
npx vitest run tests/mobile-pwa-proof-script.test.ts tests/pwa-native-contract-proof-script.test.ts
npm run mobile:proof:local
npx tsc --noEmit
npm run lint
npm run test:run
npm run build:automation
```

Results:

- PWA/native proof: passed, 6 checks, 0 failures.
- Focused PWA/mobile regression: 6 files, 66 tests passed.
- Mobile browser proof: passed, 17 route surfaces, 51 checks, 0 failures.
- TypeScript: passed.
- Lint: passed.
- Full Vitest: 163 files, 1725 tests passed.
- Automation build: passed, 42/42 static pages.
