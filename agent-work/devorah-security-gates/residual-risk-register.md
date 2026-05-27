# Devorah Residual Risk Register

Date: 2026-05-21

| ID | Risk | Status after first patch | Recommended next action |
|---|---|---|---|
| R-01 | No per-user/IP rate limits or daily quotas on cost-bearing APIs. | Open. Production auth reduces anonymous abuse but does not cap authenticated abuse. | Add route-level rate limits and metering for tokens, uploads, transcription, source previews, and model calls. |
| R-02 | Public Vercel Blob audio persistence and deletion mismatch with privacy copy. | Open. Not touched in this narrow patch. | Replace public Blob behavior or add private/signed access plus deletion on transcription success and failure. |
| R-03 | Consent gate is not a hard pre-capture/pre-transcription blocker. | Open. | Add explicit session-level consent checks before mic, browser-tab capture, file upload, and media URL transcription. |
| R-04 | Engagement gate remains policy-only before verification. | Open. | Implement server-side engagement classifier before provisional/confirmed verification, fail closed on classifier errors, and add refusal tests. |
| R-05 | Media URL ingestion still passes attacker-controlled URLs to downstream services after local validation. | Partially open. OG/source-preview redirects are guarded, but media/Deepgram URL TOCTOU remains. | Fetch/proxy media bytes server-side with IP pinning, or otherwise avoid handing untrusted URLs to Deepgram. |
| R-06 | Extension bridge initial trust is improved but not cryptographically strong. | Partially open. Token is no longer in iframe URL or app-to-parent messages, but the first parent-delivered extension message still establishes the token when no URL token exists. | Move to a `MessageChannel`/port handshake or extension-signed message path that host scripts cannot race or forge. |
| R-07 | Security headers and CSP are still missing. | Open. | Add production CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, and intentional frame policy. |
| R-08 | Dependency audit, `yt-dlp` pinning, and `SECURITY.md` remain unresolved. | Open. | Triage Clerk/js-cookie, Deepgram/ws, Next/PostCSS; pin/checksum `yt-dlp`; add disclosure and scanning workflow. |
| R-09 | Not every model or analysis route has equivalent length caps. | Partially open. Four primary model routes are capped; synth/devil-advocate were not expanded in this patch. | Review and cap all remaining model payload arrays and text fields. |
| R-10 | Production auth can block public preview flows until account story is settled. | Accepted for launch safety. | Coordinate with product-truth lane on demo allowlists, account mode, and intentional public sample routes. |
