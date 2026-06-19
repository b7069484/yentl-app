# Yentl Backend & Pipeline Audit — 2026-06-19

**Scope:** Every route under `app/api/**` (19 routes), every file under `lib/server/**`, the integration clients, and `lib/db/*`. Pre-launch readiness review. **READ-ONLY** — nothing was modified.

**Method:** Direct reads + grep of every route and lib; three parallel sub-audits cross-checked against source. Auth posture is governed by `proxy.ts` (Next.js 16's renamed `middleware.ts`), which is load-bearing for every route.

**Backend production-readiness score: 6.5 / 10.** The engineering is sober and defensively written — consistent zod validation, oversized-body guards, per-stage try/catch, SSRF guard, fail-closed rate-limiting, correct per-user data isolation (no IDOR), least-privilege Deepgram tokens, and a remarkably resilient synthesis-recovery path. What holds the score down are a small number of concrete launch-blockers that are mostly **operational/config** rather than architectural: unverified model slugs that fail the whole product closed, auth that is only enabled by an env var, fabricated-verdict fixture paths fenced off only by env+NODE_ENV, two SSRF gaps, and a YouTube pipeline that will rot on datacenter IPs.

---

## 0. Cross-cutting infrastructure (applies to all routes)

### Auth model — `proxy.ts`
- Clerk middleware. Two modes: **clerk-configured** (`auth.protect()`) vs **keyless** (404 for protected routes in prod).
- `isCostBearingApiRoute` set (`proxy.ts:18-31`): analyze-rhetoric, deepgram/token, devil-advocate, extract-claims, media-ingest, source-preview, synthesize, transcribe-batch, upload-audio, verify-confirmed, verify-provisional, youtube-ingest.
- **These cost-bearing routes are Clerk-protected ONLY when `YENTL_REQUIRE_AUTH === "1"` AND `isProduction`** (`proxy.ts:35,51,58`). If that env var is unset in prod, every paid endpoint is **public** — guarded only by the consent header (a public constant) and IP rate-limit.
- `/api/sessions` and `/api/sessions/[id]` are **not in any matcher** — no edge auth. Their auth comes entirely from `requireCloudUser()` (Clerk `auth()`) inside `cloud-session-store.ts`. That is the correct layer for per-user data, but the edge does nothing for them.
- `/api/corpus-sample` and `/api/project-flow-comments` are in `isInternalApiRoute` → 404 (keyless) or `auth.protect()` in prod.

### Consent — `lib/server/consent.ts` + `lib/source-consent.ts`
- Header `x-yentl-source-consent: source-analysis-v1` OR a `clientPayload` JSON `{consent:"source-analysis-v1"}`. Missing → **HTTP 428** `SOURCE_CONSENT_REQUIRED`.
- **This is legal/UX gating, NOT a security control.** The value is a hardcoded public constant shipped in client code (`lib/source-consent.ts:2`). Any client can assert consent. It must not be mistaken for abuse protection — rate-limit and the engagement gate are the real guards.

### Rate limiting — `lib/server/rate-limit.ts`
- Upstash/KV Redis when configured (`UPSTASH_REDIS_REST_URL`+`TOKEN` or `KV_*`), else an **in-memory `Map`** (per-instance, NOT shared across serverless instances → effective limit = `limit × instanceCount`).
- On Redis failure → **fail-CLOSED 503** `RATE_LIMIT_UNAVAILABLE` (`rate-limit.ts:235-238`). Correct posture, but an Upstash blip hard-blocks all ingestion.
- Identity = leftmost `x-forwarded-for` IP (`rate-limit.ts:51`), SHA-256 truncated. **Behind Vercel the leftmost XFF is attacker-controlled** → per-IP buckets are evadable by header rotation. Prefer `x-vercel-forwarded-for`.
- Buckets: liveToken 30/min, uploadToken 40/min, transcription 240/min, sourceIngest 120/min, model 240/min, preview 240/min.

### SSRF guard — `lib/server/ssrf-guard.ts`
- `assertSafeUrl()` — http/https only, `dns.lookup({all:true})`, blocks every private/reserved/CGNAT/link-local range incl. `169.254` (AWS metadata), fail-closed on bad input/DNS.
- **Self-documented TOCTOU gap** (`ssrf-guard.ts:84-89`): validates DNS at submission; the downstream fetcher re-resolves independently → DNS-rebind window. Explicitly deferred "out of scope for v1.2."

### AI clients — `anthropic.ts`, `grok.ts`, `ai-call.ts`
- Models are bare strings auto-routed through Vercel AI Gateway. `opus = "anthropic/claude-opus-4.7"` (`anthropic.ts:5`); `grok = process.env.YENTL_GROK_MODEL || "xai/grok-4.1-fast-reasoning"` (`grok.ts:4`).
- Auth = `VERCEL_OIDC_TOKEN` (from `vercel env pull`). **No API key in app code; no secret is ever logged** (verified across all three files). `ai-call.ts` is a thin timeout(30s)/retry(3)/abort wrapper that preserves gateway OIDC auth.
- **No guard for a missing/expired OIDC token** — failure surfaces as a cryptic SDK throw inside each route's catch (generic 500), or — in the engagement gate — as a blanket 503 refusing *all* claims.

### Security events — `lib/server/security-events.ts`
- `emitSecurityEvent` is a **structured `console.*` logger only** — no Sentry/SIEM/persistence. On Vercel these land in ephemeral Function logs, not alertable without a drain. A classifier outage (which fails the whole product closed) is effectively invisible.

---

## 1. Per-route findings

### `POST /api/extract-claims` — `app/api/extract-claims/route.ts`
- **Purpose:** First analysis stage — extract checkable claims from one utterance + context.
- **Inputs/headers:** zod `ExtractClaimsRequest` (`.strict()`, utterance ≤4 000, context ≤12 000, etc.). Rate-limit `model`. Oversized-body guard 32 KB (413). **No consent gate, no edge auth unless `YENTL_REQUIRE_AUTH=1`.**
- **External:** Opus via gateway, `Output.object({schema})`.
- **Outputs:** 200 `ExtractClaimsResponse`; 400 invalid JSON/request; 413; 429/503; 500 "extraction failed".
- **Error handling:** Strong. Body parse wrapped (`:54-58`), safeParse (`:60-63`), model call wrapped (`:74-85`). Structured-output mode means a malformed model response throws and is caught → 500 (no unguarded parse).
- **Real vs fixture:** Fixture short-circuit `:65-72` (youtube + document analysis fixtures) — hard-off in prod (see §3).

### `POST /api/analyze-rhetoric` — `app/api/analyze-rhetoric/route.ts`
- **Purpose:** Detect rhetoric/bias/fallacy markers in a transcript window.
- **Inputs:** zod `.strict()` (window ≤16 000). Rate-limit `model`. Oversized-body 64 KB. Uses ephemeral prompt cache hint (`:68-70`).
- **Error handling:** Strong, same shape as extract-claims. Fixture short-circuit `:50-57`.
- **Outputs:** 200/400/413/429/503/500.

### `POST /api/verify-provisional` — `app/api/verify-provisional/route.ts`
- **Purpose:** Fast first-pass verdict on a single claim (no web search).
- **Inputs:** zod `.strict()` (claim_text ≤2 000). Rate-limit `model`. Oversized-body 24 KB.
- **Engagement gate:** `enforceEngagementGate(claim_text, …)` (`:53-54`) — can 403/422/503 before the model call.
- **Error handling:** Strong. Fixture short-circuit `:56-63`.

### `POST /api/verify-confirmed` — `app/api/verify-confirmed/route.ts` + `citations.ts`
- **Purpose:** Authoritative verdict **with Anthropic web_search** (`webSearch_20260209`, `maxUses:5`, `:75`) + citation extraction + domain reputation.
- **Inputs:** zod `.strict()`. Rate-limit `model`. Oversized-body 24 KB. Engagement gate (`:56-57`).
- **External:** Opus + web_search tool; `mergeStanceWithCitations` (`citations.ts`), `classifyDomain`/`extractDomain` (`lib/reputation`).
- **Citations (`citations.ts`):** **Best-in-class defensive code.** URLs are harvested from authoritative `type:"source"` content blocks (cannot be hallucinated by the LLM), with a legacy-shape fallback; `ld+json`/URL parsing is fully try/caught (`normalizeUrl :86-96`); `scrubUrl :80-84` truncates JSON-bleed corruption in model-emitted URLs; loose-match is deliberately narrowed to query/hash variants to avoid `/article-1` ↔ `/article-10` cross-attachment (`safeLooseUrlMatch :152-158`). Unmatched citations default stance to `"mixed"` rather than dropping the link.
- **Error handling:** Strong; whole model+merge block wrapped (`:68-97`) → 500.
- **Risk:** `maxDuration=60` + 5 web-search round-trips can occasionally brush the timeout on slow searches (→ 500). Acceptable.

### `POST /api/synthesize` — `app/api/synthesize/route.ts`
- **Purpose:** Final cross-claim synthesis (verdict counts, per-speaker grades, `meta_read`).
- **Inputs:** zod `SynthesizeRequest.safeParse`. Rate-limit `model`.
- **⚠️ Error handling gap (MEDIUM-1):** `const body = await req.json();` at **`synthesize/route.ts:33` is NOT wrapped in try/catch, and there is NO oversized-body guard** — unlike *every* sibling model route. A malformed/empty/oversized body throws → **unhandled 500**, and a large body is parsed unbounded (no 413). This is the one inconsistent route in the analysis chain.
- **Resilience (excellent):** On model error the route attempts, in order: `recoverSynthesisOutput` (salvage JSON from `error.text`/`error.cause.value`, handling partial/tool-tail-corrupted output, `:160-263`), then `localSynthesisFallback` for billing failures (`statusCode 402` / "insufficient_funds", `:265-322`), then 500. Output is post-processed by `sanitizeSynthesisOutput` which **recomputes `factual_grade` deterministically from the input claims** (`:112-138`) — the model cannot fabricate a grade unsupported by the claim ledger. This is genuinely robust.
- **Fixture short-circuit:** `:41-52` (youtube + media + document fixtures).

### `POST /api/devil-advocate` — `app/api/devil-advocate/route.ts`
- **Purpose:** Steelman/devil's-advocate critique of utterances (Grok).
- **Inputs:** Rate-limit `model` first; `content-length > 64KB → 413` (`:16-29`, spoofable); JSON parse wrapped → 400; zod safeParse → 400.
- **Model:** `grok` via wrapper, temp 0.2; **JSON parse safety:** uses `parseDevilAdvocateText()` (not raw `JSON.parse`) (`:56`). Error → generic 500, full error logged.
- **Fixture short-circuit:** `:44-47` (document fixture, gated).

### `POST /api/upload-audio` — `app/api/upload-audio/route.ts`
- **Purpose:** Mint short-lived Vercel Blob client-upload tokens so the browser uploads media DIRECTLY to Blob (bypasses Vercel's 4.5 MB function-body limit). Store is **private**; cap 500 MB.
- **Inputs:** `@vercel/blob` `HandleUploadBody`. Consent enforced on token branch (`:68-71`) AND inside `onBeforeGenerateToken` (`:78`). Rate-limit `uploadToken`.
- **⚠️ Error handling gap (MEDIUM-2):** `const body = (await request.json())` at **`:65` is OUTSIDE the try/catch** (`:73`) → malformed body throws an unhandled 500 instead of the intended 400.
- **Outputs:** 200 token/ack; 428; 429/503; 400 on thrown error. Missing `BLOB_READ_WRITE_TOKEN` → `handleUpload` throws → 400 (misleading status for a server-config error).

### `POST /api/transcribe-batch` — `app/api/transcribe-batch/route.ts`
- **Purpose:** Deepgram batch transcription — three input shapes: multipart file, JSON `{blob_url}`, JSON `{url}`. `maxDuration=300`. Caps: 500 MB, 4 h, 50 MB stream threshold.
- **Inputs:** Consent gate (`:79`). Rate-limit `transcription`.
- **External:** Deepgram (`transcribeFile`/`transcribeStream`/`transcribeUrl`); Blob `get()` (private read) + `del()` cleanup in `finally`.
- **Error handling:** Strong — each Deepgram call individually wrapped; `del()` wrapped; defensive rejection of async/callback response shape. Fully synchronous Deepgram (no callback set → no polling fragility).
- **⚠️ SSRF gap (CRITICAL-2):** the JSON `{url}` branch passes an arbitrary non-blob URL straight to `transcribeUrl` → Deepgram **with NO `assertSafeUrl` call**. Unlike `media-ingest`, this route never SSRF-checks. Deepgram does the fetch (external egress, less severe than self-fetch), but it's an open-redirector/exfil vector inconsistent with media-ingest.
- **⚠️ Timeout mismatch (HIGH-2):** accepts up to 4 h audio but `maxDuration=300` (5 min). Multi-hour files exceed the function limit → killed → 500, with the blob already uploaded and `del()` cleanup skipped on a hard timeout.
- **MEDIUM-3:** blob access (`private`/`public`) inferred from `.public.` hostname substring (`:34-40`) → wrong heuristic → "uploaded audio was unavailable" 500 on a valid upload.
- **Fixture short-circuit** at `:128-131` / `:206-209` (gated).

### `POST /api/media-ingest` — `app/api/media-ingest/route.ts`
- **Purpose:** Direct media-URL (.mp3/.mp4) ingestion → SSRF → MIME check → Deepgram. `maxDuration=300`.
- **Inputs:** Consent gate (`:31`). Rate-limit `sourceIngest`.
- **Error handling — good.** Body parse wrapped; **`assertSafeUrl` IS called (`:60`)** before any fetch; each stage isolated.
- **⚠️ TOCTOU (CRITICAL-1):** `assertSafeUrl` validates DNS once (`:60`), then `checkMediaMime` HEAD re-resolves DNS **from Yentl's own server** (`:68`), then Deepgram re-resolves to fetch. The HEAD from our server is the dangerous one — a low-TTL rebind can pass validation then resolve to an internal IP / cloud metadata. Same root as the guard's documented gap.
- **LOW:** `checkMediaMime` accepts `application/octet-stream`/empty by trusting the URL path extension (`media-mime.ts:83-89`) — a host can serve arbitrary bytes under a `.mp3` path.

### `POST /api/article-ingest` — `app/api/article-ingest/route.ts`
- **Purpose:** Fetch a web article and extract readable text (hand-rolled regex, no library). `maxDuration=30`. Caps: 2 MB HTML, 2 200 words, 12 s fetch, 4 redirects.
- **Inputs:** Consent gate (`:43`). Rate-limit `sourceIngest`.
- **SSRF:** `assertSafeUrl` at `:61` AND **re-validated on every redirect hop** (`:134`) — best SSRF posture of the fetch-back routes for the redirect case.
- **⚠️ Unguarded extraction + ReDoS (HIGH-1):** the extraction block (`:88-115`) is **outside any try/catch**; `removeReadablePageChrome` (4× full-document replace) and `extractFirstAttributeBlock` (nested quantifiers) run on attacker-controlled ≤2 MB HTML within the 30 s budget. A crafted page can throw (→ unhandled 500) or pin CPU to the limit (cheap request → expensive function = DoS amplification).
- **Outputs:** 200; 400; 413 PAGE_TOO_LARGE; 422 NO_READABLE_TEXT (handled explicitly, `:89-95`); 428; 429/503.
- **UX:** regex extraction is brittle vs SPA/JS-rendered pages → frequent 422 for real users.
- **LOW:** `content-length` trusted for the pre-read cap (`:158`); chunked-without-length bypasses it but the post-read `.length` check (`:84`) catches it after buffering.

### `POST /api/source-preview` — `app/api/source-preview/route.ts`
- **Purpose:** Batch OG/Twitter/schema.org preview cards (≤20 URLs). `maxDuration=15`. No consent (non-analytic). Rate-limit `preview`.
- **Error handling — exemplary, the most defensive route.** `Promise.allSettled` (`:50`) → **never 500**; SSRF block returns a structured `image_status:"blocked"` preview, not an error; `og-fetch.ts` re-validates SSRF on every redirect, caps read at 64 KB, 5 s timeout, `ld+json` parse try/caught, top-level catch → `null`.
- **LOW:** in-memory LRU cache is per-instance; SVG passes the `image/` content-type check (stored-XSS only if rendered unsanitized downstream — out of scope here, worth flagging).

### `POST /api/youtube-ingest` — `app/api/youtube-ingest/route.ts`
- **Purpose:** YouTube URL → transcript segments.
- **Inputs:** `{url}`. Consent gate (`:34`). Rate-limit `sourceIngest`.
- **External:** `fetchOEmbed` (best-effort), `fetchCaptions` → Innertube (`youtubei.js`) → `youtube-transcript` → yt-dlp subprocess.
- **Error handling:** Solid — caption fetch wrapped, body parse guarded, no unhandled 500 in the handler. **Quirk:** structured errors (`INVALID_URL`/`NO_CAPTIONS`/`PRIVATE`/`NETWORK_ERROR`) return **HTTP 200** with `{error:{…}}` (`:120`); only `YT_DLP_MISSING` returns 500 (`:107`). Naive callers reading status will mis-handle.
- **Fixture:** `loadYouTubeValidationFixture` (`:84`) — one TED video, **null in production**.
- **⚠️ Pipeline fragility (HIGH-3) — see §2.3.**

### `GET /api/youtube-preview` — `app/api/youtube-preview/route.ts`
- **Purpose:** Lightweight metadata/thumbnail preview. GET. Rate-limit `preview`. No consent/auth (read-only metadata).
- **External:** `fetchOEmbed` only (`.catch(()=>null)`), static thumbnail fallback. Effectively non-throwing.
- **LOW:** returns hardcoded `caption_precheck:"checked-on-fetch"` — does **not** actually check caption availability, so a preview can show a video that then fails ingest with `NO_CAPTIONS`.

### `POST /api/deepgram/token` — `app/api/deepgram/token/route.ts`
- **Purpose:** Mint a ~10-min Deepgram streaming JWT (`usage:write` only) so the long-lived key never reaches the browser. POST + OPTIONS. Rate-limit `liveToken` (30/min). Consent-gated.
- **CORS:** tight allowlist (`localhost`, `127.0.0.1`, `https://yentl.it`, `YENTL_EXTENSION_ORIGINS`, plus `chrome-extension://*` **only in non-prod**). Correct least-privilege token design.
- **Error handling:** whole handler try/caught → 500 (logged). Missing `DEEPGRAM_API_KEY` → 500.
- **⚠️ Abuse (HIGH-4 if `YENTL_REQUIRE_AUTH` unset):** mints **billable** tokens; without the Clerk gate it's reachable by anyone sending the public consent constant, throttled only by a spoofable-IP bucket.

### `GET/POST/DELETE /api/sessions` — `app/api/sessions/route.ts`
- **Purpose:** List/save/clear the signed-in user's cloud sessions.
- **Auth:** Clerk `auth()` via `requireCloudUser()` inside the store. **No `DATABASE_URL` → graceful 503 `cloud_unavailable`** (not a crash) because the DB client is imported **lazily** (`await import` after `ensureCloudConfigured()`).
- **Error handling:** every handler fully wrapped; `parseJsonBody` throws `CloudSessionError(400)` on bad JSON (`:9-19`). Validation is hand-rolled `assertSession()` (duck-typing + ISO-date checks), not zod, but thorough; name clamped to 160 chars.
- **MEDIUM-4:** `MAX_CLOUD_SESSIONS=200` caps list reads only — **no insert-side row/byte quota**; `jsonb data` blobs are unbounded → an authed user can store many large sessions (storage-cost abuse).

### `GET/PATCH/DELETE /api/sessions/[id]` — `app/api/sessions/[id]/route.ts`
- **IDOR — NOT vulnerable (verified).** Every store op scopes by **both** `id` and `clerkUserId`: `loadCloudSession`/`renameCloudSession`/`deleteCloudSession` use `where(and(eq(id), eq(clerkUserId)))` → cross-tenant id returns **404**, not data; `saveCloudSession` calls `ensureSessionOwnership` → **409** on someone else's id. No cross-tenant read or write.
- Unauth request reaches handler → clean **401 `signed_out`** from `requireCloudUser()`.

### `GET/POST /api/project-flow-comments` — `app/api/project-flow-comments/route.ts`
- **Purpose:** Internal design-review tool — persists reviewer comments to `.project/review-comments/*.json(l)` on disk. No consent, no rate-limit, no in-handler auth — protected **only** by `isInternalApiRoute` (404/`auth.protect()` in prod).
- **MEDIUM-5:** POST `fs.mkdir/writeFile/appendFile` under `process.cwd()` (`:45-47`) — on Vercel the FS is read-only except `/tmp` → in prod this **throws uncaught → 500** (shielded by the matcher, but dead/fragile code in the prod bundle). The GET handler is try/caught. `.project/` is not in `.gitignore`/`.vercelignore`, so comment files may ship into the deployment.

### `GET /api/corpus-sample` — `app/api/corpus-sample/route.ts` (1 026 lines)
- **Purpose:** Demo/validation endpoint serving **fully synthetic, hardcoded** fact-check workspaces for a closed allow-list of sample IDs (`solo_005`, `cable_008`, `israel_010`, + 3 in-code synthetic). `model` fields say `"validation-fixture"`.
- **Gating: correctly fenced** — `validationDemoEnabled()` returns 404 unless `NODE_ENV !== "production"` OR `YENTL_ENABLE_VALIDATION_DEMO === "1"`; hard-off if `YENTL_DISABLE_VALIDATION_DEMO === "1"`. **404 in production by default.** No auth/rate-limit (acceptable only because it 404s in prod).
- **LOW DoS:** re-reads + CSV-parses `test-corpus/videos.csv` in full on every non-synthetic request (`:726-728`), no caching — bounded by the 3-ID allow-list + prod-404.

---

## 2. Pipeline traces (where each breaks)

### 2.1 File upload → upload-audio → transcribe-batch → Deepgram → analysis
- Client branches on 4 MB. **<4 MB:** multipart → transcribe-batch multipart branch → `Readable.fromWeb` (>50 MB) or Buffer → Deepgram. **≥4 MB:** client `upload()` direct to **private** Blob with consent header+payload → token minted by upload-audio → browser gets `blob_url` → JSON POST → `transcribePrivateBlobUrl` does authenticated server-side `get()` → `transcribeStream` → Deepgram → `del()` in `finally`.
- **Blob auth:** YES — private store, server reads via SDK token; the URL alone is not publicly fetchable. **Size:** capped at mint (500 MB) and re-checked server-side. **Polling:** none — synchronous Deepgram.
- **Break points:** `upload-audio:65` unguarded body parse (MEDIUM-2); `transcribe-batch:34-40` public/private mis-classification (MEDIUM-3); **Deepgram 300 s timeout on multi-hour audio (HIGH-2)**; missing `BLOB_READ_WRITE_TOKEN`/`DEEPGRAM_API_KEY` → 4xx/5xx; `del()` failure → orphaned blob (logged).

### 2.2 Direct media URL → media-ingest → Deepgram
- `assertSafeUrl` (`:60`) → `checkMediaMime` HEAD (`:68`) → `transcribeUrl` hands the same URL to Deepgram (`:79`).
- **Break point — CRITICAL-1:** DNS-rebind TOCTOU. The `checkMediaMime` HEAD executes from Yentl's own server and can hit internal services if a low-TTL domain rebinds between `assertSafeUrl` and the HEAD.

### 2.3 YouTube URL → youtube-ingest (+ youtube-preview)
- Order in `fetchCaptions()` (`youtube-captions.ts:615`): **(1) Innertube** primary — `PRIVATE` thrown immediately (correct), `NO_CAPTIONS`/other falls through; **(2) youtube-transcript** scraping (en/en-US/en-GB), `PRIVATE` rethrow else fall through; **(3) yt-dlp** subprocess (`player_client=mweb,tv_embedded,web`, 60 s timeout).
- **yt-dlp binary on Vercel: wired correctly.** `package.json` `vercel-build` downloads to `bin/yt-dlp`; `next.config.ts` `outputFileTracingIncludes["/api/youtube-ingest"]=["./bin/yt-dlp"]` bundles it; `yt-dlp-binary.ts:50` checks `bin/yt-dlp` first. The three agree.
- **Break points:**
  - **HIGH-3 (most likely post-launch breakage):** anonymous, **cookieless / no-PO-token** Innertube + yt-dlp on datacenter IPs. YouTube increasingly serves SABR-only + bot-checks ("Sign in to confirm you're not a bot") to anonymous datacenter requests. Captions that work locally will intermittently return `NO_CAPTIONS`/`NETWORK_ERROR` from Vercel. **No cookie/PO-token escape hatch exists in the code.**
  - **MEDIUM-6:** `vercel-build` curls `.../releases/latest/download/yt-dlp_linux` (unpinned `latest`) with `curl -sSL` (**no `--fail`, no verify**) → a 404/HTML error page still `chmod +x`-es into a junk binary; build does not fail loudly.
  - No-caption videos cost 3 sequential network round-trips + a 60 s-capped subprocess before answering → worst-case latency can brush the function timeout.
  - `youtube-preview` `caption_precheck` is a stub → preview/ingest expectation gap (LOW).

### 2.4 Web article URL → article-ingest + source-preview
- `assertSafeUrl` (`:61`) → re-assert per redirect hop (`:134`) → manual-redirect fetch (12 s, 2 MB) → `isReadableContentType` → hand-rolled regex extraction.
- **Break points:** **HIGH-1** unguarded extraction + ReDoS; SPA pages → routine 422 (UX); `content-length` trust (LOW).

### 2.5 Live mic → deepgram/token → client streaming
- Token route mints a 10-min `usage:write` JWT; client streams directly to Deepgram. Clean. Risk is HIGH-4 (token-mint abuse if `YENTL_REQUIRE_AUTH` unset).

### 2.6 Analysis chain data contract (extract-claims → analyze-rhetoric → verify-* → synthesize → devil-advocate)
- Every stage uses the AI SDK **`Output.object({schema})`** with a zod schema, so a malformed model response **throws inside the SDK and is caught** by the route's try/catch → clean 500 — **there is no place in the chain where a raw `JSON.parse` of model output runs unguarded** (citations.ts and synthesize's recovery path both wrap their parses).
- The one exception to the otherwise-uniform input hardening is **synthesize's unguarded request-body parse (MEDIUM-1)** — that's a *request* 500, not a model-output 500.
- Synthesize additionally **recomputes verdict grades from the input claim ledger** (`sanitizeSynthesisOutput`), so the final verdict cannot drift from the structured claim data even if the model hallucinates a grade. Strong contract.

---

## 3. Fixture / synthetic-data exposure (launch hygiene — latent CRITICAL)

Fixture modules are imported by **~10 production routes** (extract-claims, analyze-rhetoric, verify-provisional, verify-confirmed, synthesize, devil-advocate, transcribe-batch, media-ingest, article-ingest, youtube-ingest). Each route calls a fixture function **before** the real model/fetch; a non-null return short-circuits to **canned content** (`model:"validation-fixture"`).

A fixture fires only if BOTH hold: (1) an **enable gate**, and (2) a **magic-string match** in the user's input (e.g. `"city spending rose by twelve percent"+"source trail"`, `"welcome to the yentl validation panel"`, the synthetic YouTube video id / "hans rosling"+"global population growth").

**Two inconsistent gating patterns exist:**
- **Analysis + youtube fixtures** (`document-validation-analysis-fixtures.ts:115-118`, `youtube-validation-analysis-fixtures.ts:105-106`, `youtube-validation-fixtures.ts:38`): `if (NODE_ENV === "production") return false/null` — **hard-off in prod, NO opt-in.**
- **Ingest + corpus fixtures** (`validation-article-fixtures.ts:32-34`, `validation-media-fixtures.ts:61-63`, corpus route `:205-209`): off in prod **UNLESS `YENTL_ENABLE_VALIDATION_DEMO === "1"`** — **can be turned on in prod via env.**

**As currently configured, real users are NOT served fake analysis** (the env flag is not in any committed config; a user would also have to type the exact seeded strings). But the blast radius is severe: a fact-checking product whose credibility *is* the product ships code paths returning fabricated verdicts fenced off only by `NODE_ENV` + one env var. A stray `YENTL_ENABLE_VALIDATION_DEMO=1` copy-pasted into the prod env (or a "demo mode" toggle) would serve fake fact-checks with no visible warning.

---

## 4. Severity-ranked issues

### CRITICAL
- **C1 — Unverified model slugs fail the whole product closed.** `lib/server/anthropic.ts:5` `anthropic/claude-opus-4.7` (and `grok.ts:4` `xai/grok-4.1-fast-reasoning`) are hardcoded and could not be verified live (read-only audit). Opus drives the engagement gate (`engagement-gate.ts:111`), which on any model error returns **503 `CLAIM_SCOPE_UNAVAILABLE` refusing EVERY claim** (`:118-130`). If the slug is wrong/retired, the core fact-check path is a total outage. **Impact:** product-wide. **Fix:** verify both slugs resolve on the gateway (`curl -s https://ai-gateway.vercel.sh/v1/models`) and add a startup/first-call assertion that surfaces a clear operator error instead of a cryptic SDK throw.
- **C2 — DNS-rebind TOCTOU on server-side fetch-back.** `ssrf-guard.ts:84-89` (acknowledged) → `media-ingest.ts:68` `checkMediaMime` HEAD and `article-ingest.ts:136` redirect fetch re-resolve DNS from Yentl's own server after validation. **Impact:** SSRF to internal services / cloud metadata. **Fix:** resolve once, pin the validated IP, fetch by IP with a `Host` header (or a `lookup` hook that re-checks the connected socket address).
- **C3 — `transcribe-batch` JSON `{url}` branch has NO SSRF guard.** `transcribe-batch/route.ts` non-blob URL → `transcribeUrl` → Deepgram with no `assertSafeUrl`. **Impact:** arbitrary-URL fetch initiated via Yentl (Deepgram egress); inconsistent with media-ingest. **Fix:** call `assertSafeUrl(url)` in the non-blob branch.
- **C4 (latent) — Fabricated-verdict fixtures opt-in-able in production.** §3. **Impact:** fake fact-checks served to real users if `YENTL_ENABLE_VALIDATION_DEMO=1` ever set in prod. **Fix:** (a) confirm the flag is unset in the Vercel prod env; (b) standardize all fixtures to the hard-off-in-prod pattern (no prod opt-in); (c) add a CI assertion that fails the build if the flag is set in a prod-targeted env.

### HIGH
- **H1 — Cost-bearing routes are public unless `YENTL_REQUIRE_AUTH=1`.** `proxy.ts:35,51,58`. **Impact:** anyone with the public consent constant can mint Deepgram tokens / run ingest/model calls → direct $ abuse. **Fix:** verify `YENTL_REQUIRE_AUTH=1` in prod; make it fail-closed / assert at boot.
- **H2 — Deepgram batch exceeds `maxDuration` for long media.** Accepts 4 h, `maxDuration=300`. **Impact:** large legitimate uploads fail late after blob cost, no cleanup. **Fix:** lower the accepted duration to what fits 300 s, raise `maxDuration` (plan limits), or move to Deepgram's async-callback model.
- **H3 — YouTube pipeline rots on datacenter IPs (cookieless/no PO token).** §2.3. **Impact:** intermittent caption failures from Vercel; most-likely post-launch breakage. **Fix:** pin yt-dlp version, plan a cookie/PO-token path, deploy a live ingest canary with alerting.
- **H4 — Unguarded extraction + ReDoS in article-ingest.** `article-ingest.ts:88-115`. **Impact:** crafted page → unhandled 500 or CPU pinned to 30 s (DoS amplification). **Fix:** wrap extraction in try/catch (→422); bound/simplify the catastrophic-backtracking regexes or use a streaming parser.
- **H5 — No real security-event sink.** `security-events.ts` is console-only. **Impact:** a classifier outage (which refuses all claims) and abuse spikes are invisible. **Fix:** wire to Sentry/Axiom or a Vercel log drain before launch.
- **H6 — Inconsistent fixture gating across files.** §3. **Impact:** "all fixtures are off in prod" is a false assumption for half of them. **Fix:** one pattern (hard-off-in-prod).

### MEDIUM
- **M1 — `synthesize/route.ts:33` request body parse unguarded + no oversized-body cap.** Unhandled 500 on malformed/empty/oversized body; unbounded parse. **Fix:** wrap parse → 400, add a `content-length` 413 guard like the sibling routes.
- **M2 — `upload-audio/route.ts:65` body parse outside try/catch.** Unhandled 500 instead of 400. **Fix:** move inside try/catch.
- **M3 — Blob access type inferred from hostname substring** (`transcribe-batch:34-40`). Wrong heuristic → 500 on valid upload. **Fix:** derive from the known store config / the access used at upload.
- **M4 — No per-user session row/byte quota** (`cloud-session-store.ts`); `jsonb data` unbounded. **Fix:** insert-side row + payload-size limits.
- **M5 — `project-flow-comments` POST writes to read-only serverless FS, unguarded → uncaught 500;** dev tool shipped to prod. **Fix:** gate by `NODE_ENV` in-handler; exclude from prod bundle; add `.project/` to `.vercelignore`.
- **M6 — `vercel-build` yt-dlp download is unpinned (`latest`) and unchecked (`curl -sSL`, no `--fail`).** Silent junk binary on a bad download. **Fix:** `curl --fail`, pin a release tag, run `./bin/yt-dlp --version` as a build gate.
- **M7 — Rate-limit identity uses spoofable leftmost `x-forwarded-for`** (`rate-limit.ts:51`). Per-IP buckets evadable. **Fix:** prefer `x-vercel-forwarded-for`.
- **M8 — `lib/db/client.ts:6` throws at module load if `DATABASE_URL` unset.** Guest fallback depends entirely on lazy-import discipline; any future static `import { db }` hard-crashes that route in DB-less envs. **Fix:** lazy-init `db`, throw on first use.

### LOW
- **L1 — In-memory rate-limit & preview cache are per-instance** (effective limit × instance count). Ensure Redis in prod.
- **L2 — `content-length` trusted for article-ingest pre-read size gate** (mitigated post-read).
- **L3 — `checkMediaMime` trusts URL path extension for `octet-stream`/empty** content-type.
- **L4 — `youtube-preview` `caption_precheck` is a stub** → preview/ingest expectation gap.
- **L5 — `youtube-ingest` returns client-fixable errors as HTTP 200** → naive callers mis-handle.
- **L6 — SVG passes `og-fetch` image content-type check** (stored-XSS only if rendered unsanitized downstream).
- **L7 — `corpus-sample` re-parses CSV on every request, no caching** (bounded by prod-404 + 3-ID allow-list).

---

## 5. What is REAL vs synthetic

- **Real:** the entire live transcription (Deepgram batch + streaming), media/article/youtube ingestion, the full analysis chain (extract-claims → analyze-rhetoric → verify-provisional → verify-confirmed-with-web-search → synthesize → devil-advocate), citation harvesting, domain reputation, cloud session store, Deepgram token minting, SSRF guard, rate-limit, consent, engagement gate.
- **Synthetic/fixture (gated, off in prod by default):** `corpus-sample` (entirely synthetic demo), and the fixture short-circuits in the ~10 routes listed in §3. Real users are not served fixtures as currently configured — **contingent on `YENTL_ENABLE_VALIDATION_DEMO` being unset in prod.**

---

## 6. Pre-launch checklist (operator actions, in priority order)
1. **Verify `anthropic/claude-opus-4.7` and `xai/grok-4.1-fast-reasoning` resolve on the gateway.** (C1 — total-outage risk.)
2. **Confirm `YENTL_REQUIRE_AUTH=1` in the Vercel prod env.** (H1 — open paid endpoints.)
3. **Confirm `YENTL_ENABLE_VALIDATION_DEMO` is unset in prod** + standardize fixture gating. (C4.)
4. Add `assertSafeUrl` to the transcribe-batch `{url}` branch (C3) and pin/IP-validate fetch-back (C2).
5. Wrap `synthesize` (M1) and `upload-audio` (M2) body parses; wrap article-ingest extraction (H4).
6. Wire a real security-event sink (H5); confirm Redis configured in prod (L1).
7. Resolve the Deepgram long-media timeout (H2); pin + verify the yt-dlp build download (M6); plan the YouTube cookie/PO-token path + canary (H3).
