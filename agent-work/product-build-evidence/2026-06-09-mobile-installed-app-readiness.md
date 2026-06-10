# Mobile Installed-App Readiness

Date: 2026-06-09 03:49 EDT

## Product Change

- Added `/mobile` as a first-class mobile app entry hub.
  - Links into `/session`, `/sessions`, and `/tv`.
  - Includes a share-target simulation link that routes title and URL payloads into `/session`.
  - Separates iOS, Android, and mobile-web expectations without claiming native app behavior.
  - Calls out the real mobile browser limit: open-tab audio capture is not exposed by mobile Safari.
- Updated the web app manifest:
  - Installed app start URL is now `/mobile`.
  - Adds `display_override`, `orientation`, and `launch_handler`.
  - Adds working shortcuts for `/session`, `/sessions`, `/tv`, and `/demo`.
  - Adds real app screenshots from existing visual evidence for narrow and wide form factors.
  - Keeps the existing share target wired to `/session` with `title`, `text`, and `url`.
- Updated app metadata with `applicationName`, manifest URL, iOS standalone web-app hints, and telephone format suppression.
- Added homepage discovery for `/mobile` via CTA and example row.

## Verification

- Focused tests:
  - `npx vitest run tests/manifest.test.ts tests/public-entry-pages.test.tsx tests/source-picker.test.tsx`
  - Result: 3 files passed, 35 tests passed.
- Share-target/session routing tests:
  - `npx vitest run tests/session-page.test.tsx`
  - Result: 1 file passed, 20 tests passed.
  - Covers mobile share-target YouTube URL routing and shared text prefill routing into `/session`.
- Production build, standalone typecheck, and diff hygiene:
  - `npm run build:automation && npx tsc --noEmit && git diff --check`
  - Result: passed.
  - Build output includes `/mobile` and `/manifest.webmanifest`.

## Browser Proof

- `http://127.0.0.1:3000/mobile` at 390x844:
  - Heading rendered: `Yentl on iOS, Android, and mobile web.`
  - iOS, Android, and Mobile web sections were present.
  - Mobile Safari open-tab audio limit was visible.
  - Links to `/session`, `/sessions`, `/tv`, and share-target simulation were present.
  - No horizontal overflow and no console errors.
- Same route at 1280x720:
  - Heading rendered.
  - No horizontal overflow.
- `http://127.0.0.1:3000/manifest.webmanifest`:
  - `start_url` is `/mobile`.
  - `display` is `standalone`.
  - `display_override` includes `standalone`, `minimal-ui`, and `browser`.
  - Shortcuts are `/session`, `/sessions`, `/tv`, and `/demo`.
  - Screenshot form factors are `narrow` and `wide`.
  - Share target action is `/session` with `title`, `text`, and `url` params.

## Remaining Product Gap

This improves mobile installed-web-app readiness and honest iOS/Android handoff paths. It is not a native iOS or Android app shell, and it does not yet implement PWA file-handler payload ingestion.
