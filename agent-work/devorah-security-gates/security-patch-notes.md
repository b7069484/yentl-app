# Devorah Security Launch Gates - First Patch Notes

Date: 2026-05-21
Workspace: `/Users/israelbitton/Live FactCheck`

## Scope

This patch stayed inside the Devorah write scope: listed API/middleware/SSRF/extension files, security tests under `tests/`, and this deliverable folder.

## Risks Reduced

1. Public unauthenticated spend in production:
   - `middleware.ts` now protects production cost-bearing API routes with Clerk.
   - Covered routes include Deepgram token minting, Blob upload token minting, batch transcription, media/youtube ingest, source preview, synthesis, Devil's Advocate, claim extraction, rhetoric analysis, and both verification passes.
   - Keyless local development remains unblocked.

2. Unbounded model-route payloads:
   - Added JSON byte caps plus zod schemas to `extract-claims`, `analyze-rhetoric`, `verify-provisional`, and `verify-confirmed`.
   - Oversized or malformed requests now return `400` or `413` before model calls.

3. Source preview / OG SSRF:
   - `lib/server/og-fetch.ts` now revalidates the initial page URL and redirect targets with the SSRF guard using manual redirects.
   - Publisher image candidates are also revalidated through the SSRF guard before image probing.
   - Private OG image URLs are blocked before validation fetches.

4. Extension bridge token exposure:
   - The app no longer echoes bridge tokens in `window.parent` messages.
   - The content script no longer places the bridge token in the iframe URL.
   - Debug page events scrub `bridgeToken` before dispatch.

## Tests Added Or Updated

- `tests/middleware-security.test.ts`
- `tests/api/model-route-security.test.ts`
- `tests/og-fetch.test.ts`
- `tests/extension-bridge.test.tsx`
- `tests/extension-content-script.test.ts`
- `tests/extension-same-page.test.ts`

## Verification

- `npx vitest run tests/api/model-route-security.test.ts tests/middleware-security.test.ts tests/og-fetch.test.ts` - passed, 22 tests.
- `npx vitest run tests/extension-bridge.test.tsx tests/extension-content-script.test.ts tests/extension-same-page.test.ts` - passed, 18 tests.
- `npx vitest run tests/api/upload-audio.test.ts tests/api/transcribe-batch.test.ts tests/api/media-ingest.test.ts tests/lib-ssrf-guard.test.ts tests/ssrf-guard.test.ts` - passed, 70 tests.
- `npx vitest run tests/middleware-security.test.ts tests/api/model-route-security.test.ts tests/og-fetch.test.ts tests/extension-bridge.test.tsx tests/extension-content-script.test.ts tests/extension-same-page.test.ts` - passed, 40 tests.
- `npx tsc --noEmit` - passed.
- Scoped `npx eslint` over touched files - passed.

## Files Changed

- `middleware.ts`
- `app/api/extract-claims/route.ts`
- `app/api/analyze-rhetoric/route.ts`
- `app/api/verify-provisional/route.ts`
- `app/api/verify-confirmed/route.ts`
- `lib/server/og-fetch.ts`
- `components/session/ExtensionBridge.tsx`
- `extension/content-script.js`
- Security tests listed above.

## Notes

This is a launch-gate patch, not a complete security program. The highest-value remaining work is tracked in `residual-risk-register.md`.
