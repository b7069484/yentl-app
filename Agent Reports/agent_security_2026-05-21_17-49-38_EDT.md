# Yentl Security Audit Report

Agent: agent_security  
Date: 2026-05-21 17:49 EDT  
Workspace: `/Users/israelbitton/Live FactCheck`  
Branch: `codex/yentl-functional-samples-extension-handoff`  
HEAD inspected: `af3f5ae` (`Preserve extension panel workspace and exports`)  
Mode: audit-only. No app source files were changed by this audit. This report is the only file created.

## 1. Scope

Focused audit of the latest local worktree for:

- Security posture of built product surfaces.
- Security implications of planned/in-progress architecture visible in docs and code.
- Authentication, authorization, API abuse, data handling, privacy, browser extension, SSRF, prompt/model safety, supply chain, CI, and local secret hygiene.
- Vulnerabilities, mitigations, and recommended best practices.

This was not a penetration test against a deployed host. It was a local codebase and configuration audit.

## 2. Current App Inventory

The app is a Next.js application with React 19 and Next 16, using:

- Clerk for sign-in pages and middleware (`@clerk/nextjs`).
- Deepgram for live and batch transcription.
- Vercel AI Gateway with Anthropic Opus for claim extraction, rhetoric analysis, synthesis, and verification.
- xAI/Grok via Vercel AI Gateway for the "Devil's Advocate" panel.
- Vercel Blob for large audio upload handling.
- Neon/Drizzle schema prepared for users, sessions, and subscriptions, but no active server route using the DB layer found in this audit.
- Browser-side IndexedDB session storage for saved sessions.
- A Chrome Manifest V3 extension scaffold for same-page browser tab capture.
- Public trust/compliance pages and docs: DPIA, DPA status, engagement gate, privacy, terms, subprocessors, methodology, accessibility.

Important worktree note: `git status --short` showed 186 dirty entries before this report was written. This audit therefore describes the live local working tree, not a clean committed release.

## 3. Audit Trail

Read-only commands and inspections performed:

- `git status --short`, `git branch --show-current`, `git rev-parse --short HEAD`, `git log -1`.
- `rg --files`, targeted `rg` over auth, engagement gate, SSRF, storage, postMessage, fetch, filesystem writes, and dangerous DOM APIs.
- Manual review of all 14 `app/api/**/route.ts` handlers.
- Manual review of `middleware.ts`, `app/layout.tsx`, `next.config.ts`, `vercel.json`, `.gitignore`, GitHub Actions workflow, extension files, client orchestrators, Deepgram helpers, SSRF guard, OG preview fetcher, prompts, privacy/compliance docs.
- `npm audit --json`.
- `npm audit --omit=dev --json`.
- `npm ls @clerk/nextjs @clerk/shared js-cookie next postcss ws drizzle-kit esbuild --depth=4`.
- Redacted local secret scan. The scanner reported file path, line, type, and match length only, not token values.
- Tracked-file-only redacted secret scan.

Commands intentionally not run:

- No `npm audit fix`, no dependency upgrade, no formatter, no build, no test suite, no migration command, no `git add`, no `git commit`.

## 4. Executive Summary

Yentl has several good security instincts already present: explicit docs, size and duration caps for audio, a canonical SSRF guard, structured output schemas for LLM responses, short-lived Deepgram browser tokens, static escaping in report export, and an extension bridge token. But the current runtime still has serious launch-blocking gaps.

The highest-risk theme is that the expensive and sensitive processing APIs are public and unauthenticated. Anyone who can reach the deployment can mint Deepgram browser tokens, issue Vercel Blob upload tokens, transcribe large media, and call model-backed analysis endpoints. The second major theme is policy/runtime drift: the docs describe explicit consent and engagement gating, but the code path does not enforce either as a hard pre-processing gate. The third major theme is user media privacy: large audio uploads are public Vercel Blob URLs and are not deleted after transcription, while the privacy copy says v1 is in-memory/no persistence.

## 5. Severity Table

| ID | Severity | Area | Short finding |
|---|---:|---|---|
| S-01 | Critical | API abuse/auth | Public unauthenticated processor APIs can mint tokens, upload, transcribe, and spend model budget. |
| S-02 | Critical | Privacy/media | Large audio uses public Vercel Blob URLs with no deletion path, contradicting no-persistence claims. |
| S-03 | High | Legal/product safety | Engagement gate is documented but not enforced before verification. |
| S-04 | High | Consent/privacy | Consent is a dismissible reminder, not a hard pre-capture consent gate. |
| S-05 | High | SSRF | SSRF guard has DNS rebinding/redirect gaps and OG image fetch lacks revalidation. |
| S-06 | High | Dependencies | `npm audit` reports 5 high prod vulnerabilities, primarily Clerk -> js-cookie. |
| S-07 | High | Extension messaging | Extension panel leaks bridge token to parent page and accepts tokened messages from parent. |
| S-08 | Medium | App hardening | No app-level security headers or CSP found in Next config. |
| S-09 | Medium | Input/cost controls | Several model routes accept unbounded JSON without request schemas or length caps. |
| S-10 | Medium | Local secret hygiene | Ignored local envs and untracked `.claude/` worktrees contain secret-looking values; root `.claude/` is untracked. |
| S-11 | Medium | Supply chain | Vercel build downloads latest `yt-dlp` binary without pinning/checksum. |
| S-12 | Medium | CI/security process | No project `SECURITY.md`; CI has no security scan gate and references direct Anthropic secret in a comment/env path. |

## 6. Findings

### S-01 - Public unauthenticated processor APIs

Evidence:

- `middleware.ts` protects only `/session(.*)` and `/account(.*)` while the matcher includes APIs but does not call `auth.protect()` for them.
- `app/api/deepgram/token/route.ts` mints a Deepgram token on any POST.
- `app/api/upload-audio/route.ts` says "No user auth layer in this app - all uploads are anonymous" and issues client upload tokens.
- `app/api/transcribe-batch/route.ts` accepts multipart uploads up to 500 MB and JSON `blob_url`/`url`.
- Model-backed routes (`extract-claims`, `verify-provisional`, `verify-confirmed`, `analyze-rhetoric`, `synthesize`, `devil-advocate`) accept direct POSTs.

Impact:

- Cost exhaustion through Deepgram, Vercel Blob, Vercel AI Gateway, Anthropic, and Grok.
- Anonymous upload abuse and storage abuse.
- Bot-driven DoS against long-duration functions.
- Public token minting for Deepgram live transcription.

Recommended mitigation:

- Protect all cost-bearing `/api/*` routes with Clerk auth in production.
- Add route-level allowlists for routes that must remain public, for example static taxonomy or limited corpus demo routes.
- Add rate limits per user, IP, and route. Put strict burst and daily quotas on token mint, upload-token mint, transcription, verification, and source preview.
- Bind Deepgram token issuance to an authenticated user/session and restrict token TTL/scope where the vendor supports it.
- Add server-side metering: audio seconds, upload bytes, model calls, web-search calls.
- Add bot protection or proof-of-work/captcha only where anonymous demo access is intentionally allowed.

### S-02 - Public Blob audio persistence contradicts privacy claims

Evidence:

- `lib/client/audio-ingest.ts` uploads large files with `access: "public"` through Vercel Blob.
- `app/api/upload-audio/route.ts` sets `cacheControlMaxAge: 3600`, logs completed blob URLs, and does not delete uploaded media.
- Privacy/DPIA language says v1 does not persist audio or transcripts server-side and processing is in-memory/ephemeral.

Impact:

- Uploaded audio may be accessible by anyone with the public Blob URL until deleted or expired by storage lifecycle.
- Sensitive audio can remain outside user control after transcription.
- This is a direct mismatch with the stated privacy posture and likely a launch blocker for GDPR/CPRA/Law 25 claims.

Recommended mitigation:

- Do not use public Blob access for user audio. Use private blob access or a server-mediated signed URL flow with very short TTLs.
- Delete blobs immediately after Deepgram transcription completes, including failure paths.
- Redact blob URLs from logs.
- Add integration tests asserting deletion behavior.
- Update privacy copy to distinguish local browser persistence, temporary Blob storage, processor retention, and user-saved IndexedDB sessions.

### S-03 - Engagement gate is documented but not enforced

Evidence:

- `docs/engagement-gate.md` explicitly says the document is "Policy document only" and runtime implementation is elsewhere.
- `lib/client/orchestrator.ts` sends extracted claims directly to `verifyProvisional` and `verifyConfirmed`.
- No runtime `EngagementDecision`, `ENGAGE_CAUTIOUSLY`, `REFUSE_INAPPROPRIATE`, or hard refusal implementation was found in `app/` or `lib/` outside docs/UI copy.

Impact:

- Claims involving private individuals, harassment vectors, doxxing, hate speech, extremist content, CSAM references, or defamation-trap setups can be forwarded to model verification and produce verdict-like outputs.
- This undercuts the primary mitigation named in the DPIA for defamation risk.

Recommended mitigation:

- Insert a server-side engagement gate between claim extraction and both verification passes.
- Fail closed: parse errors and classifier failures should produce `REFUSE_INAPPROPRIATE` or at minimum no verification.
- Store refusal/decline state in the claim model without exposing harmful details.
- Add tests for private-person accusation, doxxing, hate, extremism, CSAM, and defamation-trap examples.
- Update methodology/changelog only after the runtime behavior exists.

### S-04 - Consent is a dismissible reminder, not a hard gate

Evidence:

- `components/session/TwoPartyDisclosure.tsx` only stores a `localStorage` dismissal flag.
- `app/session/layout.tsx` starts a mic session once the mic source is selected and Space is pressed; no separate explicit consent state is checked.
- Extension docs list "Add user-visible permission and consent copy for recording third-party audio" under still-needed work.

Impact:

- GDPR explicit consent and two-party recording warnings are not enforced as hard preconditions.
- Users can dismiss the banner once and later record without renewed explicit acknowledgment.
- Browser tab capture can involve third-party media/audio, raising higher consent and platform-policy risk.

Recommended mitigation:

- Add a blocking consent step before microphone, browser-tab capture, upload transcription, and media URL transcription.
- Capture explicit choices: user audio, third-party/room audio, special-category data acknowledgment, processor transfer acknowledgment.
- Add a session-level consent object to client state and require it before starting any capture/transcription.
- Re-prompt after material time or source changes, especially for browser tab capture.

### S-05 - SSRF gaps remain in media and preview fetching

Evidence:

- `lib/server/ssrf-guard.ts` documents the DNS-rebinding TOCTOU gap.
- `app/api/media-ingest/route.ts` calls `assertSafeUrl`, then `checkMediaMime`, then passes the URL to Deepgram.
- `lib/server/media-mime.ts` performs a `fetch(..., redirect: "follow")` after the initial guard.
- `app/api/source-preview/route.ts` checks only the submitted source URL, then `lib/server/og-fetch.ts` follows redirects and separately HEADs parsed OG image URLs without SSRF revalidation.

Impact:

- DNS rebinding or redirect chains can cause server-side fetches to reach private/internal addresses.
- OG image validation can be abused as a second-order SSRF vector.
- Deepgram resolves the media URL independently, outside Yentl's DNS validation.

Recommended mitigation:

- Implement a hardened fetch/proxy layer that resolves, connects, and streams bytes itself with IP pinning and private-range checks at connection time.
- Disable automatic redirects or re-run SSRF validation on every redirect target.
- Revalidate OG image URLs before HEAD/fetch and block private IPs, non-http schemes, suspicious ports, and overly large responses.
- For media ingestion, prefer uploading bytes to Deepgram after server-side safe fetch rather than passing attacker-controlled URLs to Deepgram.

### S-06 - Dependency audit reports production vulnerabilities

Evidence from `npm audit --omit=dev --json`:

- 8 production vulnerabilities: 5 high, 3 moderate.
- High cluster: `@clerk/nextjs` -> `@clerk/backend`/`@clerk/react`/`@clerk/shared` -> `js-cookie <=3.0.5`, advisory GHSA-qjx8-664m-686j.
- Moderate: `next` -> bundled `postcss <8.5.10`, advisory GHSA-qx2v-qp2m-jg93.
- Moderate: `ws >=8.0.0 <8.20.1`, advisory GHSA-58qx-3vcg-4xpx, pulled through `@deepgram/sdk`.

Evidence from full `npm audit --json`:

- 12 total vulnerabilities: 5 high, 7 moderate.
- Dev-only moderate chain includes `drizzle-kit` -> `@esbuild-kit/esm-loader` -> `esbuild <=0.24.2`.

Important note:

- Some `npm audit` fix suggestions looked semver-suspicious, including suggested major/downgrade-looking versions. Do not blindly run `npm audit fix --force`; triage package advisories against current vendor releases and lockfile behavior.

Recommended mitigation:

- Prioritize Clerk/js-cookie because it is auth-adjacent and production.
- Update `ws` via Deepgram SDK or lockfile override if safe.
- Triage Next/PostCSS with Next release notes and verify whether the bundled PostCSS is exploitable in this app's usage.
- Add `npm audit --omit=dev --audit-level=high` or a curated security scanner to CI after the current findings are triaged.

### S-07 - Extension bridge token can be exposed to the host page

Evidence:

- `components/session/ExtensionBridge.tsx` posts bridge messages to `window.parent` with target origin `"*"`.
- The same file accepts extension messages from `window.parent` when `msg.bridgeToken` matches, without an origin check in extension-panel mode.
- The iframe parent is the third-party page where the content script injected the panel. Scripts on that page can observe `message` events from the iframe.

Impact:

- A hostile page can learn the bridge token and send fake `page-text`, `transcript-final`, or `capture-status` messages into the Yentl iframe.
- This can poison transcript/claim analysis and potentially cause model calls on attacker-provided text under the user's session context.

Recommended mitigation:

- Do not send bridge tokens to `window.parent` with `"*"`.
- Use a `MessageChannel` established by the content script and pass a port to the iframe, then process messages only on that port.
- Treat host page text and audio as untrusted input and label provenance explicitly.
- Consider signing extension-origin messages in the extension service worker if the app needs to distinguish extension content-script messages from arbitrary page scripts.

### S-08 - Missing app-level security headers and CSP

Evidence:

- `next.config.ts` has no `headers()` configuration.
- No app-level CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or `frame-ancestors` policy was found.

Impact:

- Weaker XSS containment and clickjacking protection.
- No explicit browser limits for microphone/camera/geolocation/payment.
- Extension iframe needs intentional framing rules; without them, deployment behavior may become permissive or inconsistent.

Recommended mitigation:

- Add a production CSP tailored to actual needs: app origin, Deepgram WebSocket, Vercel AI/API routes, YouTube iframe, Vercel Blob, static assets.
- Add `frame-ancestors` that allows only intended extension/side-panel contexts and denies arbitrary framing where possible.
- Add HSTS on production domain, `nosniff`, strict referrer policy, and a `Permissions-Policy` that limits microphone to self and explicitly denies unused capabilities.

### S-09 - Unbounded JSON and schema gaps on model routes

Evidence:

- `extract-claims`, `verify-provisional`, `verify-confirmed`, and `analyze-rhetoric` call `req.json()` and feed body fields into prompts without request zod schemas or length caps.
- `synthesize` and `devil-advocate` have request schemas, but the schemas do not enforce meaningful max lengths on utterance text arrays.

Impact:

- Attackers can send large payloads to amplify model cost or hit function memory/time limits.
- Prompt-injection and data-exfiltration attempts can be embedded in source context and transcript text.
- Malformed JSON can produce unhandled route errors in some handlers.

Recommended mitigation:

- Add request schemas to every API route with `.max()` limits for claim text, source context, transcript windows, utterance counts, and per-utterance length.
- Enforce `Content-Type: application/json` where applicable.
- Add model call timeouts and cancellation.
- Add prompt-injection tests where transcript text asks the model to ignore system instructions, reveal secrets, or bypass engagement gate.

### S-10 - Local secret hygiene and untracked workspace risk

Evidence:

- `.env.local` is ignored by `.gitignore`, which is good.
- Redacted scan found live secret-looking values in ignored local env files and nested worktrees.
- `git status --short` reports `?? .claude/`, meaning the root `.claude/` directory itself is untracked in this repo view.
- Tracked-file scan found no clear tracked secret value; one OpenAI-like match in `.project/research/yentl-expansion-research.html` was a URL slug false positive, and `test-key` values in tests are placeholders.

Impact:

- A broad `git add .` or archive/share action can accidentally include local worktree metadata, generated research artifacts, or nested env files depending on Git behavior and user action.
- Local reports or dashboards can accidentally quote secret values if scans are not redacted.

Recommended mitigation:

- Add root ignores for `.claude/`, `.claire/`, and any local-only agent worktree folders that should never be versioned.
- Add a pre-commit secret scanner such as gitleaks, detect-secrets, or GitHub secret scanning.
- Rotate any real keys that may have been copied into local generated artifacts, especially if those artifacts leave the machine.
- Keep reports redacted by default.

### S-11 - Unpinned `yt-dlp` binary download in build

Evidence:

- `package.json` `vercel-build` downloads `https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux` and chmods it before `next build`.
- No version pin, checksum, or signature verification is present.

Impact:

- Build reproducibility risk.
- If the upstream release asset, network path, or GitHub account is compromised, the deployment can bundle a malicious executable.

Recommended mitigation:

- Pin an exact `yt-dlp` release version.
- Verify SHA256 or signature before chmod/execution.
- Consider vendoring through a trusted package manager path or a controlled internal artifact.
- Log the binary version in build metadata.

### S-12 - Security process gaps

Evidence:

- No project-level `SECURITY.md` was found outside `node_modules`.
- `README.md` says "See SECURITY.md if present," but it is not present.
- CI runs typecheck, lint, and tests, while a11y is gated by a variable. There is no dependency audit, secret scan, or SAST gate.
- CI a11y env comments reference `ANTHROPIC_API_KEY`, while project docs say AI Gateway/OIDC should be used rather than direct Anthropic keys.

Impact:

- Vulnerability reporting path is unclear.
- Security regressions can land without automated warning.
- Secret inventory can drift.

Recommended mitigation:

- Add `SECURITY.md` with reporting contact, supported versions, and disclosure expectations.
- Add dependency audit and secret scanning to CI.
- Add branch protection requiring security checks.
- Remove direct-provider key references if AI Gateway/OIDC is the intended architecture.

## 7. Positive Findings

- `.env*` and `.vercel` are ignored at the root.
- Deepgram browser token is short-lived, and the long-lived API key stays server-side.
- Audio upload/transcription paths have size and duration caps.
- Media URL ingestion has a real SSRF guard, even though it needs redirect/rebinding hardening.
- `yt-dlp` invocation uses `spawn` with argument arrays and validates YouTube video IDs, which reduces shell-injection risk.
- LLM outputs use structured schemas in several routes.
- Report HTML generation escapes claim/source content.
- Extension pages have a basic MV3 CSP.
- The content script validates app-origin messages from the iframe.
- Tests exist for SSRF guard, upload/transcribe paths, extension bridge/offscreen behavior, and many UI flows.

## 8. Planned/Documented Security Work Still Not Runtime-Complete

From code and docs, these items appear planned or partially implemented:

- Engagement gate runtime classifier.
- True pre-capture consent gate.
- Deepgram EU endpoint routing for EU/EEA users.
- Formal Transfer Impact Assessments for Deepgram, Anthropic, and Vercel.
- Quebec Law 25 PIA.
- Chrome Web Store release hardening: signed build, popup diagnostics, explicit recording permission copy, pause/resume handshake, installed-extension integration harness.
- Auth-connected saved sessions, cross-device sync, and subscription quotas.
- Manual screen-reader testing.

## 9. Priority Remediation Plan

### Before any public preview with real keys

1. Protect or disable all cost-bearing APIs.
2. Remove anonymous Deepgram token minting.
3. Disable public Blob upload path or make it private and auto-deleting.
4. Add rate limits and quotas.
5. Rotate exposed/local keys if any generated artifacts have left the machine.
6. Add root ignores for agent worktrees and run a proper secret scanner.

### Before real user testing

1. Add explicit consent gating before capture or transcription.
2. Add request schemas and length caps to every model/transcription route.
3. Harden media and OG preview SSRF handling.
4. Patch or triage production dependency audit findings.
5. Add basic security headers/CSP.
6. Fix extension bridge token exposure.

### Before commercial launch

1. Implement and test the engagement gate.
2. Align privacy/terms/DPIA with actual storage behavior, including IndexedDB and Blob.
3. Complete TIAs and Quebec PIA.
4. Add `SECURITY.md`, security CI, and a dependency update policy.
5. Add owner checks/RLS/encryption/deletion workflows before enabling server-side saved sessions.
6. Pin and verify `yt-dlp`.

## 10. Suggested Security Tests To Add

- Unauthenticated requests to every sensitive `/api/*` route return 401/403 in production mode.
- Per-user and per-IP rate limits block repeated token/upload/model calls.
- Media URL SSRF tests for redirects to `127.0.0.1`, `169.254.169.254`, IPv6 loopback, DNS rebinding simulation, and nonstandard ports.
- OG preview tests where `og:image` points to localhost/private IP.
- Engagement gate tests for private-person crime accusation, doxxing, hate, extremism, CSAM, and defamation traps.
- Consent tests proving mic/browser-tab/audio upload/media URL cannot start before explicit consent.
- Extension hostile-page test: parent page tries to replay or forge bridge messages after observing app messages.
- Blob lifecycle test: uploaded object is deleted after success and after transcription failure.
- Prompt-injection tests for all model routes.

## 11. Bottom Line

The project is security-aware, but not security-ready for public deployment with live credentials. The core blockers are API exposure, media persistence, missing engagement gate, missing hard consent, SSRF hardening, and extension message integrity. Treat these as launch gates, not polish items.

The good news: the architecture is close enough that the mitigations are straightforward. The code already has central seams for middleware, ingestion routes, SSRF utilities, orchestrator flow, and extension bridge handling. The next security pass should be implementation-focused and test-backed.
