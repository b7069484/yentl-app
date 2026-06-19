# M7 Launch Smoke Mobile/PWA/TV Proof - 2026-06-11

## Scope

Raised the launch smoke bar so a release candidate cannot pass while dropping the mobile/PWA file-handler contract, the mobile entry page, the TV room entry page, or video Blob upload-token readiness.

## Product/Proof Change

- `scripts/launch-smoke.ts` now verifies:
  - manifest `start_url`, display mode, display override, launch handler, share target, and `/session` file handler;
  - required file-handler MIME/extension pairs for text, Markdown, PDF, DOCX, MP3, WAV, audio WebM, MP4, MOV, and video WebM;
  - `/mobile` renders the mobile/PWA entry and native-shell boundary copy;
  - `/tv` renders the room-mode entry surface;
  - optional Blob-token smoke requests `launch-smoke-video.mp4` instead of an audio-only WebM path.
- Added `YENTL_SMOKE_SKIP_INTERNAL=1` as an explicit local-only release-candidate smoke switch. Production smoke remains strict by default and still checks internal demo/project exposure unless this flag is intentionally set.
- `tests/launch-smoke-script.test.ts` now locks the mobile, TV, PWA file-handler, and video Blob-token smoke coverage.

## Proof

Focused/static proof:

```bash
npx vitest run tests/launch-smoke-script.test.ts
npx tsc --noEmit
git diff --check
```

Result: 1 file passed, 4 tests passed; typecheck and diff check passed.

Rendered local smoke:

```bash
YENTL_SMOKE_BASE_URL=http://localhost:3000 YENTL_SMOKE_SKIP_INTERNAL=1 npm run smoke:launch
```

Result:

- manifest PWA/share/file-handler contract: passed
- public entry pages: passed
- mobile/PWA entry page: passed
- TV room entry page: passed
- public contact page: passed
- guest-first session entry: passed
- internal exposure checks: explicitly skipped for local smoke only
- optional rate-limit/blob checks: skipped unless requested

Broad verification:

```bash
npm run lint
npm run test:run
npm run build:automation
```

Results:

- Lint: passed.
- Full Vitest: 170 files passed, 1807 tests passed.
- Automation build: passed, 42/42 static pages.

## Boundary

This local smoke proves the release-candidate app surface and manifest contract. Production smoke still needs to be rerun after deploy without `YENTL_SMOKE_SKIP_INTERNAL=1`, and with `YENTL_SMOKE_BLOB_TOKEN=1` when Blob storage is configured for the target deployment.
