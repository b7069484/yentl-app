# Upload Route Console Hardening

Timestamp: 2026-06-09 03:18 EDT

## Product change

- Removed the production `console.log` from `POST /api/upload-audio`'s Vercel Blob `onUploadCompleted` callback.
- Preserved the callback as an intentional no-op because the browser already receives the blob URL synchronously from the upload call.
- Strengthened the upload route test to assert the callback resolves without logging.

## Verification

- `npx vitest run tests/api/upload-audio.test.ts`
  - PASS: 1 file, 9 tests.
- `rg -n "console\\.log" app components lib proxy.ts -g '*.ts' -g '*.tsx'`
  - PASS: no production app/component/lib/proxy `console.log` calls.
- `npx vitest run tests/api/upload-audio.test.ts tests/trust-contact-pages.test.tsx tests/public-entry-pages.test.tsx`
  - PASS: 3 files, 22 tests.
- `npm run build:automation`
  - PASS: Next production build and embedded TypeScript pass.
- `npx tsc --noEmit`
  - PASS after production build.
- `git diff --check`
  - PASS.

## Files

- `app/api/upload-audio/route.ts`
- `tests/api/upload-audio.test.ts`
