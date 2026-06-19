# Yentl — Full Pre-Launch Audit (2026-06-19)

Reb Faivele's `cheshbon hanefesh` for Reb Yisroel. Independent audit: 5 parallel deep-code agents + live pipeline testing (real API calls) + 11 real-browser screenshots. Sub-reports in this folder (`01`–`05`). Screenshots in `./screenshots/`.

## Bottom line up front

**The engine is real and sophisticated (~8/10). The productization and launch-readiness are not there yet (~3–4/10).** The prior handoff's headline "**8.6/10, prod deploy authorized**" is **not supported** by independent evidence — five agents independently landed at 5–6.5, and the repo's *own* top-level aggregator `release-readiness-proof.json` says **`launch_ready: false`** with 6 blockers and 246 dirty files. The 8.6 conflated "our unit suite + fixture proofs are green" with "proven for real users."

Most urgent fact: **production (yentl.it) is broken right now** on two ingest paths, because the fix sits in an undeployed dirty tree.

| Layer | Independent score | One-line verdict |
|---|---|---|
| Core analysis engine (claims/rhetoric/verify/synthesis) | **8 / 10** | Genuinely sharp; the best part of the codebase |
| Backend / pipelines | **6.5 / 10** | Sober data-plane; 4 config-level CRITICALs |
| Transcription + **multi-speaker** | **5.5 / 10** | Diarization is **disabled in prod**; "proven multi-speaker" is unsupported |
| Frontend UX vs "simple + glanceable" | **5 / 10** | Beautiful analyst console; not yet glanceable |
| Proof battery / launch-readiness | **3 / 10 external** | ~50% synthetic; aggregator says not ready |

## What's genuinely strong (azamra first — and it's earned)

I tested the chain with **real model calls, live**. It works and it's smart:

- **Claim extraction** decomposed *"unemployment fell to 3.5%, lowest in 50 years"* into **two distinct claims** and gracefully degraded speaker attribution (`attribution_status: not_available`).
- **Rhetoric/fallacy detection** caught **4 of 4 planted fallacies** — ad hominem, false dilemma, appeal to fear, appeal to popularity — each with the exact excerpt, severity, and explanation. The taxonomy is real: **124 entries** (your 55 book entries + 69 extras) injected into the prompt, names locked to the taxonomy.
- **Verification, provisional tier:** correctly ruled the Great Wall myth **FALSE (95)**.
- **Verification, confirmed tier:** ruled a real claim **TRUE (98) with real bls.gov citations** — and the citation system **harvests URLs server-side from the web-search source blocks**, so a hallucinated URL *cannot* enter the source list. This is the strongest safeguard in the system.
- **The meta-read sanitizer** (`lib/synthesis-meta-read.ts`) independently recomputes posture/source-health and **clamps the model down** when evidence is thin — real logic, not cosmetic.
- **Backend hygiene:** uniform Zod `.strict()` validation, no IDOR (every session query scoped by `and(id, clerkUserId)`), no unguarded model-output `JSON.parse`, least-privilege Deepgram tokens, a synthesis-recovery path that recomputes verdicts from the claim ledger so the model can't fabricate a verdict.
- **Test suite is real and clean:** I had it run — **176 files / 1836 tests pass, `tsc` clean, lint clean, ~47s, 0 flakes.** (Narrow: jsdom only, no real integrations — but honest within its scope.)
- **Compliance posture is thoughtful:** explicit GDPR 9(2)(a) consent, "no server-side audio/transcript persistence in v1," named-processor disclosure, AI-generated disclaimers.

## What I proved works live (real calls, local dev)

| Pipeline | Result |
|---|---|
| `youtube-ingest` (captions) | ✅ 241 real segments from a TED video |
| `article-ingest` (readability) | ✅ real Wikipedia extraction |
| `document-ingest` (PDF) | ✅ clean text extraction (the prod-incident fix works locally) |
| `extract-claims` (model) | ✅ 2-claim decomposition, 10.4s |
| `analyze-rhetoric` (model) | ✅ 4/4 fallacies |
| `verify-provisional` (model) | ✅ FALSE/95 |
| `verify-confirmed` (model) | ✅ TRUE/98 + real citations |
| AI Gateway / OIDC token | ✅ still valid locally |

## Critical issues (launch blockers)

### A. Production is broken *right now*
- **`document-ingest` → 500 / Next error page on yentl.it** (I hit it live). Fix is in the **undeployed** dirty tree.
- **`youtube-ingest` → `{"code":"PRIVATE"}` on yentl.it** for a public TED video that **works locally**. YouTube blocks caption fetches from Vercel's datacenter IPs (anonymous, cookieless Innertube/yt-dlp hits the bot-wall). This is the flagship "point it at a video" source — broken in prod.
- Prod is pinned behind the repo; the single fastest readiness lever is **commit → CI → deploy → post-deploy battery**.

### B. The multi-speaker claim is unsupported (your headline ask)
- **`diarize: false` is hard-coded** in both `lib/server/deepgram-batch.ts:36` and `lib/client/deepgram-stream.ts:118` ("DISABLED in v1"). It's a deliberate **BIPA/biometric-privacy** decision (the Otter/Fireflies lawsuit wave), gated on a future consent flow + voiceprint deletion + legal review.
- **Consequence:** for live/real audio, every utterance collapses to speaker 0/null. All the rich per-speaker machinery (the beautiful per-speaker verdict cards you see in the demo) **has no signal to run on in production** — those cards only populate from baked-in fixtures.
- The **99.67% speaker-attribution** number was measured on a **non-shipping** `diarize:true` pipeline, on 16 short agent-labeled windows. The proof file itself flags `review_required_before_public_claims`.
- **WER**: median 8.94% — but on **17 of 100** corpus videos; the two hardest multi-speaker categories (`cable_news_debate`, `academic_lecture`) scored **zero**.
- **Real Deepgram STT is never exercised** by the proof battery (replay uses a transcript stored on disk). My own live `media-ingest` test was MIME-gated before transcription — so end-to-end real audio→transcript is genuinely unproven.
- Known unmitigated failure modes: a single-speaker monologue returning **9 "speakers"**; English-only hard-coding; proper-noun errors poisoning web search ("Stephen Sackur"→"Stephen Sack").

**The honest fork:** either (1) light up diarization behind the consent gate and re-measure with human ground truth, or (2) scope the public claim to single-speaker / clean-English until it's measured. You cannot currently say "proven robust on multi-speaker."

### C. Backend config-level CRITICALs (mostly env/ops, not architecture)
1. **Hard-coded model slug** `anthropic/claude-opus-4.7` (`lib/server/anthropic.ts:5`). It drives the engagement gate, which on *any* model error **returns 503 and refuses every claim**. If that slug is wrong/retired, the whole fact-check path is a total outage. Verify against the live gateway before launch.
2. **Paid endpoints are public unless `YENTL_REQUIRE_AUTH=1`** (`proxy.ts`). Consent is a public constant; rate-limit key is a spoofable `x-forwarded-for`. If that var isn't set in prod, anyone can mint billable Deepgram tokens + run model calls. Confirm in Vercel prod env.
3. **Fabricated-verdict fixtures can be enabled by `YENTL_ENABLE_VALIDATION_DEMO=1`** for ingest/corpus routes. As shipped, users aren't served fakes — but a stray flag would serve fake fact-checks. Standardize all fixtures to hard-off-in-prod.
4. **SSRF gaps:** DNS-rebind TOCTOU on `media-ingest`/`article-ingest` server-side fetch-back, and **`transcribe-batch`'s `{url}` branch hands an arbitrary URL to Deepgram with no `assertSafeUrl`.**
5. **No security response headers** (HSTS / nosniff / Referrer-Policy / Permissions-Policy / CSP) — `yentl-hardening-pass` clause 9 requires them; confirmed absent. *(Being fixed now — see below.)*
6. **No security-event sink** — a classifier/model outage is currently invisible.

### D. UX is an analyst console, not a glanceable consumer signal (your other headline)
Verified against live screenshots:
- **No single dominant verdict.** The Watch screen stacks ~7 regions; 4 equal-weight signal cards (CURRENT READ / LANGUAGE HEAT / EVIDENCE STATE / LIVE STATE) compete — the eye has nowhere to land.
- **TV "room mode" isn't glanceable:** the biggest element on screen is the **video's clickbait title**; the verdict is a *paragraph of prose*; "signals" are tiny metric counts. Nothing readable across a room.
- **Four competing verdict vocabularies that disagree.** The canonical `verdict-theme.ts` maps to 5 clean consumer phrases — but the chip actually rendered (`chips.tsx`) shows raw taxonomy ("Mostly True / Partial / Misleading / Omission"), and two more hardcoded color maps live in `claim-row.tsx` and `claim-detail.tsx`. The same claim reads "Supported" in one place and "Mostly True" beside it.
- **Contrast fails:** the most-rendered `VerdictChip` is ~10px saturated text on a same-hue wash ≈ **1.9:1** (WCAG AA needs 4.5:1). True/false rests on red/green hue (colorblind failure); markers carry **no icon** — "inflammatory" is a 9px word.
- **Jargon leaks to users:** Meta-Read, Language heat, Pulse, Counter-read, Devil's Advocate, Provisional/Confirmed, archetype, UNV.
- **Onboarding friction:** `/session` opens onto a **4-required-checkbox GDPR wall before any value is shown**; the home hero has 6 CTAs; new users are never pointed at the pre-loaded high-rhetoric demo (which is the most glanceable thing you have).

*Keep:* the `synthesis-card` ("Yentl's Read") is the one consumer-legible signal — make it the spine everywhere. `listening-empty-state` is exemplary. TV's big-serif idea is right (just point it at the verdict, not the title).

### E. The proof battery oversells
- `ingestion-deploy-proof.json` reads `ok:true, failures:[]` **while prod is 500-ing** (it marks any prod failure "ok" if the local counterpart passed; the real failures hide in `deploy_blockers`).
- Analysis deploy proof "passes" with **0 verified claims** (assertions only need `markers≥1 || claims≥1`).
- `extension-latency-samples.json` reports a "first transcript" latency from a run where `live_transcription_proven:false` and `requested_runs:0` (it re-aggregated old JSON, never ran).
- Cloud-sync proofs "pass" by proving the feature is **off** (503/401).
- *To the team's credit:* 3 proofs correctly **fail** rather than fake-pass (large-real-media, mobile-device, sensitive-attribution), real YouTube *caption* ingest is genuinely proven, and the deploy verify path really calls Opus + web-search.

## The untested gap (what a paying user hits, never tested)
Real 30–45 min multi-speaker debate · real noisy phone recording · real WER/STT accuracy · captionless live tab-audio capture · real cost/latency/concurrency under load · authenticated cross-device cloud sync · real Chrome Web Store install · real iOS/Android devices · current prod parity (broken now) · legal/DPIA/TIA signoff.

## What it'll take to launch — phased

**Phase 0 — Unblock prod (hours).** Commit + deploy the dirty tree (clears the doc-ingest 500); verify the 3 env CRITICALs (model slug live, `YENTL_REQUIRE_AUTH=1`, demo flag unset); add security headers; run the post-deploy battery. → prod healthy again.

**Phase 1 — Make the core claims true (days).** Fix YouTube-on-prod (PO-token/proxy/cookies, or pivot to user-side capture); patch the 3 SSRF gaps + wire a security-event sink; run **real** Deepgram STT + a **real** multi-speaker debate end-to-end with human ground truth; **decide diarization** (consent-gated ON + re-measure, or scope the claim down). This is the heart of "prove transcription + analysis are robust."

**Phase 2 — The consumer-glanceable redesign (1–2 weeks).** Unify on one verdict vocabulary (`verdict-theme.ts`, render `.short`); fix chip contrast (solid fills, near-black/white, larger); **one dominant verdict per screen**, demote the rest; markers get one bold severity-scaled icon + plain word ("Inflammatory"); make TV/Watch point at the verdict not the title; defer consent to actual capture; de-jargon; point first-run at the pre-loaded demo. This is the biggest lift and the center of your ask.

**Phase 3 — External launch proofs + legal.** Chrome Web Store install, real-device canaries, authed cloud sync, load test, DPA/DPIA/TIA signoff, the 2026-05-26 external-launch checklist.

## How I'll use Grok Build (the swarm you flagged) + my own agents
`grok 0.2.56` is headless with `--agents` (inline swarm defs), `--best-of-n` (parallel attempts, pick best), `--check` (self-verify), `--worktree` (isolation), `--effort max`. Allocation plan:
- **Grok worktree swarm** → mechanical, parallelizable, well-specced fixes: SSRF patches + tests, security headers, the full screenshot/state matrix (100+ states from `03`'s inventory), the verdict-vocabulary unification sweep across `chips.tsx`/`claim-row.tsx`/`claim-detail.tsx`.
- **Grok `--best-of-n`** → design-y problems with a wide solution space: the glanceable Watch/TV redesign, the dominant-verdict component.
- **My Claude agents** → judgment-heavy synthesis, adversarial verification of grok's output, and the "does it actually work for a real user" gates (no rubber-stamping).
- **Me** → live browser verification, real-pipeline proof, orchestration, and the final emes on readiness.

## Immediate next action
Per your spawned task, I'm implementing the **security response headers** now (`next.config` `headers()`, not middleware — honoring the app's deliberate no-middleware design), with a test and a live-curl verification. It's the one fix that's already mandated, scoped, and safe. Everything else above is for us to prioritize together.
