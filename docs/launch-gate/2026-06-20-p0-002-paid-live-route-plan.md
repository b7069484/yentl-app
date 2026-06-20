# P0-002 Paid-Live Route Classification

Operator: codex-yentl  
Worktree: `/Users/israelbitton/yentl-codex-launch-gate`  
Branch: `codex/launch-gate`

## Owner Decision Applied

Readiness mailbox `MSG-763f9c35` recorded the Owner direction: do not bundle a blanket
`YENTL_REQUIRE_AUTH=1` into the P0-001 document-ingest hotfix. Keep guest/demo surfaces
frictionless, but require auth for genuinely cost-bearing live paths, use the shared
Redis-compatible rate-limit backend, and add Vercel bot/WAF protection through the
Owner deploy-config gate.

## Route Boundary

Demo-open / validation-open:

- Public pages and `/session`.
- `/api/corpus-sample` remains 404 in production unless validation demo is explicitly enabled.
- Deterministic media validation fixtures in `/api/media-ingest` and `/api/transcribe-batch`
  return before paid-live auth when validation demo is explicitly enabled.
- Non-billable metadata/source preview routes stay rate-limited but not sign-in gated.

Paid-live gated before billable work:

- Deepgram token minting: `/api/deepgram/token`.
- Vercel Blob upload-token minting: `/api/upload-audio` token-generation branch.
- Deepgram transcription: `/api/media-ingest`, `/api/transcribe-batch` file/url branches.
- Model calls: `/api/extract-claims`, `/api/analyze-rhetoric`, `/api/synthesize`,
  `/api/devil-advocate`, `/api/verify-provisional`, `/api/verify-confirmed`.

## Implementation

- Added `lib/server/paid-live-gate.ts`.
- Gate is inactive outside production.
- Gate activates with `YENTL_REQUIRE_PAID_LIVE_AUTH=1` (or legacy `YENTL_REQUIRE_AUTH=1`).
- If Clerk is not configured while the production paid-live gate is enabled, the helper fails
  closed with `AUTH_UNAVAILABLE` before billable work.
- If Clerk is configured but no signed-in user is present, the helper returns `AUTH_REQUIRED`
  before billable work.
- Auth failures emit security events: `paid_live_auth_required` or
  `paid_live_auth_unavailable`.

## Deploy-Config Still Needed

These are not changed by code and remain Owner-gated:

- Set `YENTL_REQUIRE_PAID_LIVE_AUTH=1` in Vercel Production.
- Ensure Clerk production env is configured.
- Ensure `YENTL_RATE_LIMIT_BACKEND=redis` and Upstash/KV REST credentials are configured.
- Enable or explicitly defer Vercel bot/WAF protection.
