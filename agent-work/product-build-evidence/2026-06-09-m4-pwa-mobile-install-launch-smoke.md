# M4 PWA/Mobile Install And Launch Smoke

Timestamp: 2026-06-09 22:46 EDT

## Scope

- Added installable PNG app icons from the existing Yentl mark:
  - `public/icon-192.png`
  - `public/icon-512.png`
  - `public/icon-maskable-512.png`
- Updated app metadata and manifest icon entries so the PWA advertises standard and maskable PNG icons.
- Kept share target and file-handler launch contracts covered by tests.
- Hardened validation-demo gating so `YENTL_DISABLE_VALIDATION_DEMO=1` and `NEXT_PUBLIC_YENTL_DISABLE_VALIDATION_DEMO=1` override explicit enable flags.
- Preserved local validation demos for dev/test, while proving the launch posture keeps internal corpus/project surfaces hidden.

## Files

- `app/layout.tsx`
- `app/manifest.ts`
- `app/session/page.tsx`
- `app/api/corpus-sample/route.ts`
- `components/session/validation-sample-hydrator.tsx`
- `components/session/extension-panel-view.tsx`
- `components/session/ingest-panes/audio-ingest-pane.tsx`
- `components/session/ingest-panes/media-url-ingest-pane.tsx`
- `components/session/ingest-panes/text-ingest-pane.tsx`
- `components/session/ingest-panes/web-url-ingest-pane.tsx`
- `components/session/ingest-panes/youtube-ingest-pane.tsx`
- `lib/server/validation-article-fixtures.ts`
- `lib/server/validation-media-fixtures.ts`
- `tests/manifest.test.ts`
- `tests/api/corpus-sample.test.ts`
- `tests/validation-media-fixtures.test.ts`
- `tests/session-page.test.tsx`

## Verification

- Focused PWA/mobile tests passed:
  - `npm run test:run -- tests/api/corpus-sample.test.ts tests/validation-media-fixtures.test.ts tests/session-page.test.tsx tests/manifest.test.ts tests/public-entry-pages.test.tsx tests/pwa-file-launch-handler.test.tsx tests/source-picker.test.tsx tests/launch-files.test.ts`
  - 8 files, 84 tests.
- Typecheck passed:
  - `npx tsc --noEmit`
- Lint passed with 0 errors and the existing 18-warning baseline:
  - `npm run lint`
- Full regression passed:
  - `npm run test:run`
  - 148 files, 1661 tests.
- Automation build passed:
  - `npm run build:automation`
- Production build passed:
  - `npm run build`
- Launch smoke passed against a temporary production server with validation demos disabled:
  - `PORT=3011 YENTL_DISABLE_VALIDATION_DEMO=1 NEXT_PUBLIC_YENTL_DISABLE_VALIDATION_DEMO=1 npm run start`
  - `YENTL_SMOKE_BASE_URL=http://localhost:3011 npm run smoke:launch`
  - Confirmed manifest share target, public entry pages, public contact page, guest-first session entry, internal corpus sample 404, and internal project surfaces hidden.

## Browser Proof

- `http://127.0.0.1:3000/mobile`:
  - 390x844, 430x932, and 768x1024 rendered with no horizontal overflow and 0 console errors.
  - Visible headings included `Yentl on iOS, Android, and mobile web.`, share/import paths, saved work, room display, microphone, and files.
- `http://127.0.0.1:3000/session`:
  - 390x844, 430x932, and 768x1024 rendered with no horizontal overflow and 0 console errors.
  - Visible headings included `Choose your source path`, `Live`, `URL`, and `File`.

## Notes

- Port 3011 was used only for the temporary launch-smoke server and was stopped after proof.
- The normal local dev server may still expose validation demos when explicitly enabled for development.
- No automations, cron jobs, staging, commits, pushes, deployments, or dependency installs were performed.
