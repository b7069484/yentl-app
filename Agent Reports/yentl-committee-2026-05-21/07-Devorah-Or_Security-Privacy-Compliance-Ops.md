# Yentl Committee Report - Security, Privacy, Compliance, Reliability, and Operations

    **Committee member:** Devorah Or  
    **Remit:** Security architecture, privacy, legal/compliance, abuse prevention, reliability, cost controls, launch safety.  
    **Why this name:** Devorah is associated with judgment and leadership; Or means light. This seat shines light on the blockers that cannot be solved by polish.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- `middleware.ts`, `app/api/deepgram/token/route.ts`, `app/api/upload-audio/route.ts`, `app/api/transcribe-batch/route.ts`, `app/api/verify-confirmed/route.ts`, `app/api/source-preview/route.ts`, `lib/server/ssrf-guard.ts`, `next.config.ts`, `.github/workflows/ci.yml`.
- Legal/trust pages: `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/subprocessors/page.tsx`, `docs/dpia.md`, `docs/engagement-gate.md`, `README.md`.
- Extension security: `components/session/ExtensionBridge.tsx`, `extension/content-script.js`, `extension/background.js`, `extension/offscreen.js`.
- Prior security and synthesis reports.
- External cost/storage references: Vercel AI Gateway pricing says pay-as-you-go with no markup and a $5/month free tier before paid credits; Vercel Blob pricing is based on storage, operations, transfer, and edge requests; private/public storage modes exist. Sources: https://vercel.com/docs/ai-gateway/pricing and https://vercel.com/docs/storage/vercel-blob/usage-and-pricing.

## Executive Judgment

Yentl is not safe to expose publicly with real production keys. The launch blocker is not a single CVE; it is the combination of unauthenticated cost-bearing APIs, sensitive media handling, consent/policy drift, and extension bridge risks.

## Strengths

The project has a serious compliance posture in documentation: DPIA, privacy, terms, subprocessors, accessibility, methodology, and engagement-gate policy. There are size and duration caps for audio. The report export escapes static HTML. The SSRF guard exists and is shared. Structured outputs are used in several model routes. The extension architecture uses per-capture bridge tokens in concept.

## Severe Gaps

Public processing APIs are not protected. Middleware protects `/session` and `/account`, but API routes for Deepgram token minting, upload tokens, transcription, source preview, extraction, verification, rhetoric, synthesis, and Devil's Advocate are reachable without app-level auth or quotas.

Upload privacy contradicts privacy copy. The upload route issues Vercel Blob upload tokens anonymously; large media can become public Blob URLs; deletion after transcription is described but not implemented as a hard lifecycle. Privacy says no server persistence.

Consent is not a hard gate. A dismissible banner is not enough for microphone, browser tab, media URL, upload, or third-party audio capture. GDPR/special-category processing claims require stronger behavior.

Engagement gate is documented but not enforced. This is a defamation and harm-amplification risk.

SSRF and fetch risks remain. URL ingestion and OG preview need redirect revalidation, image URL revalidation, private IP blocks, suspicious port blocks, content-length caps, timeouts, and careful logging.

Extension messaging is too trusting. Bridge token exposure through broad `postMessage` patterns should be replaced with origin-checked, channel-based messaging. Host-page content and audio provenance must be treated as untrusted.

Supply-chain and ops gaps remain: `yt-dlp` latest binary download at build time without pin/checksum, no security CI gate, no `SECURITY.md`, no production CSP/security headers, no rate-limit/abuse telemetry, and no public incident process.

## Recommendations

1. Protect every cost-bearing route in production with Clerk/session auth or a deliberate signed guest token with route-specific quota.
2. Add rate limits and quotas by user/IP/session/source: audio seconds, upload bytes, model calls, web searches, source-preview fetches.
3. Use private Blob storage or signed short-lived URLs; delete audio after transcription success and failure; redact media URLs in logs.
4. Add hard source-specific consent state before capture/upload/transcription; re-prompt on source changes or long-running sessions.
5. Implement engagement gate before verification, fail closed on model/schema errors, and store refusal/decline states without harmful verdict output.
6. Harden SSRF guard and preview fetches with redirect/IP revalidation, content-length caps, MIME allowlist, and timeout policy.
7. Add security headers: CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors.
8. Replace extension bridge token leakage with MessageChannel/origin allowlist and explicit app-origin configuration.
9. Pin/checksum `yt-dlp`; add dependency advisory triage; add secret scanning; add `SECURITY.md` and support contact.

## Launch Gates

No public preview with production keys until the above is complete. For a private local demo, use local env keys and explicit cost authorization only.

## Tests And Checks

Add route tests for unauthenticated API denial in production mode, quota exhaustion, upload deletion, private Blob access, SSRF redirect/private IP blocks, extension message origin rejection, CSP/header presence, and engagement-gate fail-closed behavior. Add a CI security job that runs dependency audit, secret scan, and security route tests.
