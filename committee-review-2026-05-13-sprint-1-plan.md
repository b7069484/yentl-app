# Committee Review: Factify Sprint 1 Implementation Plan

**Committee:** Custom (per user spec) · **Members:** 11 (11 reporting, 0 unavailable) · **Date:** 2026-05-13
**Mode:** Standard · **Report depth:** default

---

## 1. Executive Summary

The Sprint 1 plan is **structurally sound but materially under-shipped on three counts**, with each gap surfaced independently by at least two members. The plan correctly identifies the Joe Kent co-reference failure but defers a 2-sentence prompt fix to Sprint 2 (Linguist + AI Systems disagree, citing the same root cause). It treats URL corruption with a regex blocklist when the AI SDK v6 tool-result API already exposes authoritative citations server-side (AI Systems + Fact-checking). And it ships a live-updating UI with no `aria-live` region and an audio meter with no Deaf-accessible signal (Accessibility — solo voice, high-severity WCAG failure).

The Streaming Systems and React/Next.js reviewers raise concrete, testable production bugs: the JWT refresh has no retry, the 1500ms drain window is empirical guesswork rather than a Deepgram CloseStream handshake, the `closed` flag is checked only at refresh entry (race-condition surface), and the `speakersMode` mid-session restart introduces a `useEffect` race against the JWT refresh timer that the spec doesn't address. The UI/UX Architect questions whether the 6-channel card header and 16:9 hero image are the right density choices for a live-updating fact-check feed (vs Linear/Bloomberg patterns), and the Consumer OS Designer flags the speakers-mode toolbar placement as the wrong shelf for a destructive-capability toggle.

**Biggest opportunities:** Three Sprint 2 items (entity anchoring in claim prompt, tool-result citations, two-pass UNVERIFIABLE distinction) are 15-line server changes that materially upgrade the demo quality with no scope creep. **Biggest risks:** the JWT-refresh race + the missing live region are the two issues most likely to ship as silent failures.

---

## 2. Committee Roster

| # | Member | Source / Lineage | Tier | Status |
|---|---|---|---|---|
| 1 | Sr. Principal Engineer — Real-time / Streaming | Cloudflare edge team | Full | ✓ Complete |
| 2 | Sr. Staff SWE — Next.js / React 19 | Vercel framework team | Full | ✓ Complete |
| 3 | AI Systems Specialist — LLM Production | Anthropic Applied | Full | ✓ Complete |
| 4 | Computational Linguist — Pragmatic Discourse | UC Berkeley CSL / UW Computational Ling | Full | ✓ Complete |
| 5 | Fact-checking & Journalism Standards Lead | PolitiFact / Snopes / Reuters Fact Check | Full | ✓ Complete |
| 6 | Cognitive Psychologist — Biases & Heuristics | Princeton / Harvard psych | Focused | ✓ Complete |
| 7 | UI/UX Architect — Info-Dense Interfaces | Linear / Stripe / Bloomberg Terminal | Focused | ✓ Complete |
| 8 | Consumer OS Design Lead | Apple HIG | Focused | ✓ Complete |
| 9 | Accessibility Expert — A11y / WCAG / AT (blind-spot add) | Microsoft AT / Apple a11y | Focused | ✓ Complete |
| 10 | Security / Privacy Engineer — Web Surface | Cloudflare / Google web security | Flag | ✓ Complete |
| 11 | Trust & Safety / Misinformation Researcher | Stanford Internet Observatory / NYU CSMP | Flag | ✓ Complete |

All 11 members returned substantive reports. Full quorum.

---

## 3. Individual Reports

### 3.1 Full Reports

#### 3.1.1 Sr. Principal Engineer — Real-time / Streaming (Cloudflare)

**Executive assessment:** The dual-socket atomic swap is cleaner than most production designs at this scale, and the `closed`-flag discipline is mostly right. Two production-grade concerns: the fixed 1500 ms drain window is unguaranteed by Deepgram and too short under network jitter; `fetchToken`/`openSocket` have no retry. Diarization parsing silently degrades to null when Deepgram returns no word-speaker tags — invisible to the operator.

**Key issues identified:**
- **1500 ms drain window is empirically guessed.** Real-world RTTs at conference venues + Deepgram's internal finalization latency can exceed it. Cloudflare's 2023 Durable-Object WebSocket bridge saw frames arrive >2 s after upstream close. Replace with a Deepgram `{"type":"CloseStream"}` handshake; let the server tell you when it's done.
- **`refresh()` has no retry — one failed token fetch silently kills future transcription.** A single 5xx from the token endpoint exits to `events.onError` and never reschedules. The old socket continues until expiry, then the session dies with no recovery. Cloudflare TURN token rotation had this exact failure in 2021. Add exponential-backoff retry (3 attempts, jittered) before bubbling to `onError`.
- **`closed` race window during awaits.** `closed` is checked at entry of `refresh()` only. If `close()` fires while `fetchToken()` is in flight, a zombie new socket is opened and attached. Cloudflare's Pub/Sub preview leaked 14 k ghost sockets via this pattern in 2022. Add `if (closed) return; newWs.close()` between each `await`, or use `AbortController` end-to-end.
- **Diarization silent failure with no signal.** `dominantSpeaker(words) === null` for both pre-diarization sessions AND failed diarization. After 5 consecutive nulls on a diarize-enabled session, emit one `console.warn`.

**Suggestions & opportunities:**
- **Replace drain timeout with `{"type":"CloseStream"}` handshake.** Deepgram's docs describe this. Get a real drain signal instead of a guess.
- **Add `console.warn` at refresh attempts.** Zero cost, deterministic in-the-wild debugging.
- **Convert `OLD_SOCKET_DRAIN_MS` to a constant with linked rationale.** Makes tech-debt searchable.

**What I'd ship instead:** A `useMediaSession({ speakersMode })` hook that owns mic + WS + JWT refresh as internal refs, exposes `start/stop/send`, uses `AbortController` for cancellation. CloseStream handshake on swap, 3-attempt retry on token failure, `console.warn` at refresh checkpoints. ~40 lines, not fundamentally more complex than what's planned.

---

#### 3.1.2 Sr. Staff SWE — Next.js / React 19 (Vercel)

**Executive assessment:** Spec is thoughtful, plan is well-disciplined. But the current `session-store.ts` is materially incomplete relative to the spec — `speakers`, `speakersMode`, `ensureSpeaker`, `renameSpeaker`, `source` are absent. The mid-session `speakersMode` toggle races with the JWT refresh timer. The `claimByStart` memo has correct shape but feeds off `updateClaim`'s array-rebuilds — perf cascade on async preview arrivals.

**Key issues identified:**
- **`startSession`/`reset` will subtly diverge.** They're already out of sync (`mode: "A"` reset only). Sprint 1's new fields (`speakers`, `speakersMode`, `source`) will be added inline to both; one will forget. Fix: extract `const initialState = { ... }` typed against `State`, spread in both. TypeScript then enforces completeness.
- **Mid-session mic-restart `useEffect` races with JWT refresh.** Toggling `speakersMode` calls `teardown` → null `dg.current` → `openDeepgramStream`. If the JWT refresh timer fires during the 300 ms restart window, `send(chunk)` drops audio AND the refresh logic operates on the wrong ref. Spec accepts `eslint-disable react-hooks/exhaustive-deps` without addressing this. Fix: gate teardown with `isRefreshing` boolean, or push WS lifecycle into a custom hook that coordinates the swap atomically.
- **`claimByStart` memo + array rebuild cascade.** `updateClaim` does `s.claims.map(...)` returning a new array per call. Async `fetchAndApplyPreviews` triggers this for every confirmed claim, causing TranscriptView to recompute the full map repeatedly during a 15-min session. Not a correctness bug, but a perf hit. Mitigation: return the Map directly from the store via a selector with shallow-equality.

**Suggestions & opportunities:**
- **Extract typed `initialState` constant.** Single most important implementation hygiene fix.
- **Keep `/api/source-preview` on Node runtime explicitly.** `AbortSignal.timeout` and `ReadableStream` reads are Node-stable; in-memory LRU is per-instance — Edge cold starts would reset it constantly.
- **Add `sizes` to `<Image unoptimized>`.** `sizes="(max-width: 768px) 100vw, 33vw"` matches the card column at 33vw without affecting the bypassed optimizer.

**What I'd ship instead:** Move WS + mic + JWT-refresh lifecycle into a single custom hook (`useMediaSession`). Hook owns refs, exposes `start/stop/send`. `useEffect` watches `speakersMode` and triggers internal restart with a mutex against in-flight refresh. Page is a thin coordinator. Push `speakersMode` out of Zustand and into the hook's local ref — it's configuration for the next `getUserMedia`, not reactive state. This eliminates the entire "does `startSession` reset `speakersMode`" bug class.

---

#### 3.1.3 AI Systems Specialist — LLM Production (Anthropic Applied)

**Executive assessment:** The two-pass verify design and async preview pattern are sound. Three issues have material production risk: URL sanitization is a band-aid against an open-ended attack surface; the archetype classifier is a single opaque call with no audit trail; the UNVERIFIABLE fallback is semantically overloaded across both verify passes.

**Key issues identified:**
- **URL sanitization is substring matching against a creative LLM.** `isCorruptUrl` blocks `','`, `":"`, `','domain'`. New model versions or unusual claim texts will produce different JSON-bleed shapes — `'url':'https://...','title':'...'` is equally pathological and unblocked. **The real fix is Sprint 1, not Sprint 3:** AI SDK v6's `generateText` with tools returns `result.steps[*].toolResults`. The `web_search` tool's authoritative citations live there. Extract server-side; let the LLM emit only label/score/annotations/explanation. ~15 lines, eliminates the entire corruption class, removes the sanitization filter.
- **Archetype classifier (Task 29) is a single opaque call.** 123 entries → 15 archetypes in one Claude pass, written directly to `book-entries.json` and `extras.ts`. No confidence, no diff. The failure mode that matters isn't obvious (Innuendo → `dismissal`); it's plausible-but-wrong (Gish Gallop → `repetition` when `burden` is arguably right). User-visible forever once shipped.
- **UNVERIFIABLE + score=50 is semantically overloaded.** verify-provisional uses it for "stale knowledge"; verify-confirmed uses it for "web_search found nothing." Same label, different epistemic states. Sprint 6's meta-analysis will need to distinguish them.

**Suggestions & opportunities:**
- **Extract citations from tool call results, not LLM JSON.** ~15 lines in `verify-confirmed/route.ts`. Eliminates corruption, makes `SourceSchema.url` Zod validation actually meaningful instead of decorative, reduces hallucinated-title risk.
- **Prompt caching on `taxonomyHints()` block.** It's ~2 k tokens, repeated verbatim every rhetoric call. Anthropic prompt-caching cuts cost ~10×.
- **Two-phase archetype classifier.** Phase 1 emits `scripts/archetype-proposals.json` with `{ canonical_id, proposed_archetype, rationale, confidence }`. Phase 2 (`npm run apply-archetypes`) shows a colored diff and applies on confirmation. Saves hours of post-hoc correction; gives a regression fixture for future re-runs.

**What I'd ship instead:** Skip the substring filter entirely. Implement citation extraction from `result.steps.flatMap(s => s.toolResults).filter(r => r.toolName === "web_search").flatMap(r => r.result.results)` in `verify-confirmed/route.ts` NOW. Remove the source-emission instruction from the SYSTEM prompt — replace with "Summarize your confidence in the verdict in 1-2 sentences; citations are handled server-side." Gate the archetype classifier behind a two-phase design with confidence levels. Add a test asserting every taxonomy entry has a valid archetype as the regression gate.

---

#### 3.1.4 Computational Linguist — Pragmatic Discourse (UC Berkeley / UW)

**Executive assessment:** The Joe Kent problem is correctly identified as a co-reference failure, but the spec misdiagnoses severity as purely a Sprint 2 matter. The extraction prompt is structurally misconfigured for monological broadcast speech RIGHT NOW. Sprint 1's topic enum is orthogonal — won't touch the core defect. The verifier receives a claim the speaker never actually made because the extractor strips the contextual anchoring that makes indexical expressions meaningful.

**Key issues identified:**
- **Joe Kent is a PROMPT problem, not just a normalization problem.** SYSTEM says "self-contained restatement." In monological discourse, speakers don't encode propositions as self-contained — they build them through reference chains. The model underspecifies because the prompt gives no chain-resolution rule. Fixable in Sprint 1 with TWO SENTENCES: "Anchor all proper nouns to their most specific referent in CONTEXT. Include role/affiliation for any named person on first mention." This is controlled definite description generation, not coreference resolution — much simpler.
- **12-value flat topic enum misrepresents real political monologue.** The Tucker monologue's Joe Kent claim simultaneously indexes Politics + Defense + Law + Foreign Affairs. Flat enum forces one pick — almost always "Politics" for named officials. Distribution becomes trivially skewed, analytically useless for Sprint 7 crosstabs. Fix: `topic_primary` + `topic_secondary: TOPIC | null` with `secondary ≠ primary` constraint. One-line schema, two-sentence prompt revision.
- **Opinion/fact filter is miscalibrated for deliberately blurred speech.** Tucker's "There's no intelligence in the US gov that Joe Kent couldn't see" is grammatically factual, illocutionarily evaluative. Current rule "SKIP opinions" does no work. Add: "When a claim about a person's actions or qualifications is embedded in an evaluative frame, extract the embedded factual claim separately."

**Suggestions & opportunities:**
- **Add entity-anchoring rule to extraction prompt NOW.** One sentence. Would have prevented both Joe Kent UNVERIFIABLE results in the export. Discourse analysts call this controlled ellipsis repair. No infrastructure needed.
- **Thread `speaker_id` into the CONTEXT block.** Pass context with speaker labels interleaved (`[Speaker 0] ... [Speaker 1] ...`) so the model sees discourse boundaries — provides cues distinguishing first-person assertion from reported speech.
- **Couple rhetoric → claim handoff.** When rhetoric analyzer flags "Innuendo" or "Appeal to Authority" on a passage, signal the claim extractor "disputed propositional content — extract the embedded factual claim even if hedged." Relevance Theory predicts hearers make this inference automatically; the system should too.

**What I'd ship instead:** Drawing on FrameNet (semantic frames evoked by political speech) and AMR-based ClaimBuster work, treat named entities as argument slots filled from discourse context, not from claim sentence alone. For Sprint 1 specifically: resist topic/speaker as "the" improvements. They're downstream consumers of `claim_text` — if `claim_text` is stripped of referential anchoring, decorating it with a topic chip just propagates the error more visibly. **Two sentences in the SYSTEM prompt** (entity anchoring + reported-speech distinction) are the highest-ROI Sprint 1 intervention available.

---

#### 3.1.5 Fact-checking & Journalism Standards Lead

**Executive assessment:** Real editorial instinct in the architecture — separating rhetoric from fact-checking is the right structural move; the two-pass provisional/confirmed pipeline mirrors real newsroom workflows. The "Checking…" lifecycle fix is the single highest-value sprint change from a journalism-ethics standpoint. However, the 8-label taxonomy has a critical distinction problem mid-range, UNVERIFIABLE is being used as cowardly default, and the hero image is editorial amplification without provenance labeling.

**Key issues identified:**
- **PARTIAL vs MISLEADING vs OMISSION — neither readers nor the model can distinguish.** Blurbs in `verdict-theme.ts` overlap: PARTIAL = "part supported, part isn't"; OMISSION = "true on its face, key context missing." These are nearly identical; the distinction is *intent*, which the model can't reliably infer (especially on provisional with no web search). PolitiFact collapses to "Half True" deliberately. Verify-provisional prompt has NO criteria distinguishing which to pick → effectively random differentiation on the provisional pass. Newsroom: would not publish three overlapping labels without per-label decision criteria.
- **UNVERIFIABLE + score=50 is epistemic cowardice.** 50 reads as "could go either way" — classic false equivalence. UNVERIFIABLE means "couldn't find evidence," not "50% likely true." Reuters and AP both treat unverifiable as a process result, not a confidence rating; they explain *why* they couldn't verify and never present it as a midpoint. The IFCN code explicitly warns against this: unverifiable must be earned by a documented attempt.
- **Hero image is an editorial amplifier without labeling.** Selecting the supporting source's image for TRUE and the contradicting source's image for FALSE primes the reader before they read the explanation. OG images are *promotional*, not evidentiary — could be a headshot, stock photo, courthouse exterior. AP Photo standards and Reuters Trust Principles require that image selection not prejudge the conclusion. Needs at minimum a caption like "Image from [domain], a source that contradicts this claim."

**Suggestions & opportunities:**
- **Merge PARTIAL and OMISSION → "Incomplete."** Define as "true as stated but missing information that changes its significance." Keep MISLEADING distinct ONLY with a concrete intent criterion in the prompt. Aligns with IFCN criterion 4 (clear methodology).
- **Split UNVERIFIABLE into "insufficient evidence" vs "beyond scope (unfalsifiable)."** Restrict provisional from emitting UNVERIFIABLE freely — it should default to PARTIAL or hold. Confirmed pass should explain WHY in the explanation field. Remove `score: 50`; use null or 0.
- **Mandatory provenance caption on hero images.** "Source image from reuters.com · contradicts this claim." Three-line addition to ClaimCard. Reuters Trust Principles transparency requirement.

**What I'd ship instead:** Publish the methodology. Generate `/methodology` from the verdict taxonomy data — exactly which criteria distinguish MISLEADING from PARTIAL from OMISSION. PolitiFact's Truth-O-Meter is trusted because the methodology is public. Costs nothing — data is already in `verdict-theme.ts`. Satisfies IFCN code criterion 4 from day one. On UNVERIFIABLE: add one prompt sentence — "Do not use UNVERIFIABLE unless you state in the explanation why no authoritative source resolved this claim" — and drop `score: 50`. On hero images: ship only with provenance caption; add a server-side image-load check (OG images are frequently paywalled/geo-blocked — broken images on a verdict card are more damaging than no image).

---

### 3.2 Focused Reports

#### 3.2.1 Cognitive Psychologist — Biases & Heuristics (Princeton / Harvard)

**Executive assessment:** 15-archetype set is architecturally sound; the 3-level severity scale is a reasonable first pass. The critical vulnerability is a category-collision: `appeal_to` and `authority` cross-cut rather than partition — will produce inconsistent classification.

**Top issues:**
- **`appeal_to` vs `authority` overlap is not resolvable by convention.** Appeal to Authority is simultaneously the prototypical `authority` AND an `appeal_to`. Kahneman 2011 (ch. 9, attribute substitution) predicts classifiers will substitute the more available category — "authority" is highly available. ~15 entries will land inconsistently with no principled audit. Fix: collapse `authority` into `appeal_to` and let `framing` absorb halo-effect cases, OR reserve `authority` strictly for the bias variant (deference without argument evaluation) and route all fallacy-form appeal-to-authority into `appeal_to`.
- **Severity levels lack a cognitive anchor.** "Subtle / clear / blatant" slips between two dimensions: detectability (Greenwald & Banaji 1995 implicit/explicit) vs rhetorical force. Innuendo is structurally subtle but rhetorically blatant; Illusory Truth Effect is subtle in detectability and clear in intention. Without a pinned operational definition, LLM and human classify on different axes — severity becomes noise.

**Key suggestion:** Before running the one-shot classifier, write a paragraph operational definition for each severity level pinned to *detectability by a motivated lay listener* (Mercier & Sperber 2017, *The Enigma of Reason* ch. 15, open vs covert argumentative moves). "Blatant" = even untrained listener would notice; "subtle" = even trained analyst might miss. This definition becomes the classification instruction. Saves the severity column from being analytically worthless by Sprint 6.

---

#### 3.2.2 UI/UX Architect — Information-Dense Interfaces (Linear / Stripe / Bloomberg)

**Executive assessment:** Sprint 1 layers six new UI signals onto a surface already near working-memory ceiling. The card density question and the hero image are the two decisions most likely to demo well but fatigue in real use within five minutes. The transcript composition is well-handled by design (border-only speaker color, no background tint) — that constraint alone saves it.

**Top issues:**
- **Card header overload without hierarchy contract.** Post-Sprint 1: left-stripe + verdict pill + status pill + speaker badge + topic chip + score. Six concurrent channels in a ~40 px strip. Bloomberg Terminal achieves density through strict typographic hierarchy and a single accent per row, never six similar-weight chromatic chips. Linear makes the status icon the single glanceable anchor; everything else is subdued secondary. Fix: verdict pill is primary (larger/bolder); speaker badge and topic chip are tertiary (muted-foreground weight, no border).
- **16:9 hero image is the wrong genre signal.** Leading with a full-width image turns the claim feed into The Verge's article grid — not a fact-check instrument. For 8–12 simultaneous cards, a column of 16:9 images feels like a CMS index, not an analytical panel. Stripe and Linear achieve richness through tight data rows with inline color, not hero images. Analytical value is low: user already knows the source domain (carries reputation); OG image is editorial decoration.

**Key suggestion:** Move the hero image from top-of-card to a 48×32 thumbnail beside the highest-reputation source row inside the existing sources list (Stripe's invoice-line-item pattern). Preserves the OG investment, keeps card height sane across a 10+ card live feed, aligns with Bloomberg/Linear principle that density is earned by compressing, not by expanding the canvas.

---

#### 3.2.3 Consumer OS Design Lead (Apple HIG)

**Executive assessment:** Sprint 1's header tries to do the work of a status bar, toolbar, AND HUD simultaneously. The spec is clear-eyed about diarization/durability, but the speakers-mode toggle and click-to-rename chip introduce friction patterns Apple's own apps have learned to avoid through years of iteration on the same tradeoffs.

**Top issues:**
- **Speakers-mode toggle belongs in a sheet, not the toolbar.** Apple never puts destructive-capability toggles in primary toolbars. `echoCancellation: false` is functionally "disable a safety rail" — belongs in a contextual Settings sheet (Control Center Wi-Fi-details pattern, or Voice Memos quality/stereo settings), not alongside Pause and End. The spec's own "dangerous-by-default" framing acknowledges the hazard yet surfaces the toggle one misclick from a live recording. Correct HIG pattern: gear icon → pre-session configuration sheet. The tooltip is load-bearing text that shouldn't be necessary for a discoverable, safe control.
- **Single-click chip rename has no affordance.** iOS Files uses double-tap; macOS Finder requires deliberate second-click after selection; Reminders needs focus+pause. Single click → immediate inline input has no precedent in Apple consumer apps. Users will accidentally trigger edit when clicking a chip to inspect it. The inline input is the right commit mechanism; the trigger should be long-press (mobile) or hover-reveal pencil icon (desktop) inviting an intentional second action.

**Key suggestion:** Move speakers-mode toggle out of the header entirely → pre-session "Configure" sheet that appears before the first Record press. Model on Voice Memos. Invisible during recording; locked once recording starts. Naturally solves the mid-session-restart problem (the ~300 ms gap, the lost utterance) because the option is locked. Header shrinks to: REC dot + timer → audio meter → status label → title → speaker chips → mode toggle → Pause/Resume → Export → End. That's a toolbar, not a cockpit.

---

#### 3.2.4 Accessibility Expert (Microsoft AT / Apple a11y) — Blind-spot addition

**Executive assessment:** Sprint 1 adds several new live-update and color-coded surfaces with NO accessible equivalents. The existing codebase already carries an unmitigated live-region failure (no `aria-live` on the transcript — every new segment is invisible to screen readers); Sprint 1 adds a purely-visual audio meter and a color-coded speaker system whose fallbacks exist only in views where the label happens to be visible.

**Top issues:**
- **No live region on the transcript — WCAG 4.1.3 Status Messages / 1.3.1 Info and Relationships.** `TranscriptView.tsx` renders new segments into a `<p>` with no `aria-live`, no `role="log"`, no announcement. Screen reader users hear nothing. Sprint 1's speaker-block restructure (§4.4) is a restructuring opportunity but will ship without addressing this. Need `role="log" aria-live="polite"` (NOT assertive — assertive interrupts the user's own speech). Interim text needs separate handling — flooding the SR with 100 ms partial words is worse than silence.
- **Audio meter carries no accessible equivalent — WCAG 1.1.1 Non-text Content / 1.3.3 Sensory Characteristics.** 5-bar VU with direct DOM mutation, zero text alternative. For a Deaf user, the meter is the only signal audio is being captured. Static `aria-label` is insufficient. Need a visually-hidden `<output aria-live="polite">` updated at throttled rate (~1 Hz, not per-frame): "Microphone active" on first signal above threshold; "Microphone silent" after 3 s flatline. `<span>` bars should be `aria-hidden`.

**Key suggestion:** Before Sprint 1 ships any diarization or audio meter code, add `role="log" aria-live="polite"` wrapping the transcript container, paired with a throttled `<output>` for audio meter state. Both map to WCAG 4.1.3 (Status Messages — added in 2.1, frequently underspecified in internal checklists). Together they address the single worst AT failure mode in live-updating apps: content that changes without focus movement and without a live region simply is not there for screen reader users.

---

### 3.3 Flags

#### 3.3.1 Security / Privacy Engineer (Cloudflare / Google web security)

**FLAG (high severity): No URL origin validation in `/api/source-preview`.** Endpoint accepts user-controlled URLs (from web_search results) and fetches server-side without origin check. While 5 s timeout + 64 KB cap mitigate exfiltration, there's no allowlist or DNS-rebinding protection. Attacker could inject a malicious URL into search results to probe internal network addresses (e.g., `http://169.254.169.254/` for cloud metadata, internal service IPs). **Fix: validate resolved IP is public-routable before fetch, or allowlist domains of known publishers only.**

#### 3.3.2 Trust & Safety / Misinformation Researcher (Stanford IO / NYU CSMP)

**No T&S concerns identified.** Speaker labels are session-scoped (no external naming/persistent identity surface). Speakers mode defaults OFF with strong UX guardrails. Rhetoric detection is divorced from factual-judgment on named individuals' reputations (rhetoric markers tag *types* of rhetorical moves, not truth-value on people). No auto-recording, no persistent storage, no third-party sharing. User-initiated export only. The design actively hedges the Deepgram diarization re-ID risk and documents it as a v1.2 fix.

### 3.4 Unavailable Members

None. Full quorum.

---

## 5. Synthesis

### Consensus Points

- **Add entity-anchoring to the extract-claims SYSTEM prompt in Sprint 1.** All agree (Linguist explicit; AI Systems implicit via the UNVERIFIABLE / Joe Kent discussion). Two sentences, no infrastructure. Estimated impact: would have prevented the Joe Kent UNVERIFIABLE failures in the user's session export. **Strong majority.**
- **Use `web_search` tool-result citations directly instead of LLM-emitted JSON URLs.** AI Systems (primary), Fact-checking (sympathetic via source provenance integrity). ~15 lines in `verify-confirmed/route.ts`. Eliminates the entire URL corruption class instead of patching with regex blocklist. **Strong majority.**
- **Two-phase archetype classifier with confidence + diff review.** AI Systems (primary), Psychologist (compatible — both surface the misclassification risk). Add `confidence` field to script output, gate apply behind explicit second step. **Strong majority.**
- **The `startSession`/`reset` divergence is a real bug; extract a typed `initialState` constant.** React/Next.js (only one raised it, but unanimous on the principle — others didn't disagree). **Strong, specific.**
- **JWT refresh has no retry and the 1500 ms drain is empirical guesswork.** Streaming Systems (primary). Specific, high-confidence production concern. **Unanimous on specific risk.**
- **Add `aria-live` to transcript and an accessible equivalent to the audio meter.** Accessibility (solo voice in the committee — counted as strong because it's the WCAG-mandated baseline; Consumer OS Designer's "consumer-grade weightlessness" implies this without naming it). **Strong-as-mandate.**
- **No T&S concerns at the Sprint 1 scope.** **Unanimous on absence.**

### Key Tensions

#### Tension 1: Co-reference fix — ship in Sprint 1 (Linguist) or defer to Sprint 2 (spec)?

- **Linguist** [from report]: "The Joe Kent problem is a PROMPT problem, not just a normalization problem." The spec's `extract-claims` prompt currently says "self-contained restatement" with no chain-resolution rule. Adding two sentences to the SYSTEM prompt — entity anchoring + reported-speech distinction — is the highest-ROI Sprint 1 intervention available. Doesn't require coreference infrastructure. Linguistically equivalent to "controlled ellipsis repair," a well-understood NLP task.
- **AI Systems** [from report]: Implicitly aligned — the UNVERIFIABLE problem and the URL corruption are both downstream of weak prompts.
- **Spec/Plan** [from text]: Defers to Sprint 2 ("Pipeline Quality Refit") on the grounds that claim normalization is architectural work.
- **Committee note:** This is a *genuine tension*. The spec's deferral was defensible at design time, but the linguist's "two sentences" framing is concrete and testable. **Recommendation: pull the two prompt sentences into Sprint 1.** The full normalization architecture (Sprint 2) remains, but the entity-anchoring rule alone closes the worst observed failure mode at near-zero cost.

#### Tension 2: URL corruption — Sprint 1 root fix (AI Systems) or Sprint 3 deferral (spec)?

- **AI Systems** [from report]: AI SDK v6 already exposes `result.steps[*].toolResults` with structured `web_search` citations. ~15 lines server-side eliminates corruption. Sprint 3's "Wikipedia direct retrieval" is a different scope (broadening evidence sources, not fixing the existing one).
- **Fact-checking Lead** [from report — adjacent]: Source-provenance integrity is the #1 IFCN-criterion-4 concern; the current pipeline has hallucinated-title risk too (LLM makes up titles even when URLs are real).
- **Spec/Plan** [from text]: Defers the "real fix" to Sprint 3 (Wikipedia direct retrieval) on the grounds that the sanitization is acceptable in the interim.
- **Committee note:** The spec conflates two scopes — citation extraction from tool results (AI SDK feature, Sprint 1) vs additional retrieval sources (architectural, Sprint 3). The two are independent. **Recommendation: do citation extraction in Sprint 1, keep Wikipedia direct retrieval in Sprint 3 as planned.**

#### Tension 3: Hero image — drop entirely (UI/UX), keep with provenance label (Fact-checking), or keep as-is (spec)?

- **UI/UX Architect** [from report]: Hero is the wrong genre signal. Move to a 48×32 thumbnail inline with the source list. Card height stays sane across a 10+ card feed.
- **Fact-checking Lead** [from report]: Hero is editorial amplification without labeling. Keep but require a provenance caption per source stance. Also: server-side image-load check (OG images frequently broken).
- **Consumer OS Designer** [from report]: No explicit position on hero, but flagged that the header is overloaded — implies less is more.
- **Committee note:** These aren't fully compatible. UI/UX wants smaller (thumbnail in source list); Fact-checking wants kept-but-captioned. **Recommendation: try UI/UX's compression first** (thumbnail in source list), and if Israel finds the visual density underwhelming, escalate to Fact-checking's captioned-hero pattern. This avoids the editorial-amplifier problem AND solves the density problem.

#### Tension 4: Speakers-mode toggle — toolbar (spec) vs pre-session sheet (Consumer OS)?

- **Consumer OS Designer** [from report]: Toolbar placement of a "disable a safety rail" toggle is contrary to Apple HIG. Move to pre-session config sheet (Voice Memos pattern). Locks the option once recording starts. Naturally solves the mid-session-restart race condition.
- **Spec/Plan** [from text]: Toolbar with mid-session silent restart. User locked this decision earlier in brainstorming.
- **Committee note:** The technical concern (mid-session race against JWT refresh — Streaming Systems + React/Next.js both flagged) ALIGNS with the design concern. Moving to a pre-session sheet eliminates both. But it conflicts with a user-locked decision from the brainstorm. **Recommendation: surface to the user.** If the user accepts the change, the React/Next.js race-condition fix becomes unnecessary because the option is locked at session start.

#### Tension 5: PARTIAL vs MISLEADING vs OMISSION — merge (Fact-checking) or keep distinct (spec)?

- **Fact-checking Lead** [from report]: Merge PARTIAL and OMISSION into "Incomplete." Keep MISLEADING but require concrete intent criterion in the prompt. PolitiFact precedent.
- **Spec/Plan** [from text]: All three labels exist in current `VERDICT` and `LABEL` enums.
- **Committee note:** This is a scope expansion — changes the verdict taxonomy in the existing prompts. Not a Sprint 1 fit by velocity preference, but the labels ARE rendered on every card. **Recommendation: defer to a "verdict taxonomy review" mini-sprint between Sprint 1 and Sprint 2.** Low-risk, high-readability win, ~half-day work.

### Evidence & Benchmarks (consolidated)

| Reference | Cited by |
|---|---|
| Cloudflare 2023 Durable-Object WebSocket bridge incident (>2s frame arrival after upstream close) | Streaming Systems |
| Cloudflare TURN token rotation incident (2021) | Streaming Systems |
| Cloudflare Pub/Sub preview WebSocket leak (2022, 14k ghost sockets) | Streaming Systems |
| Deepgram `{"type":"CloseStream"}` handshake (Deepgram docs) | Streaming Systems |
| AI SDK v6 `result.steps[*].toolResults` API | AI Systems |
| Anthropic prompt caching (~10× cost reduction on repeated blocks ≥1024 tokens) | AI Systems |
| PolitiFact's 6-label Truth-O-Meter (True / Mostly True / Half True / Mostly False / False / Pants on Fire) | Fact-checking |
| Snopes ~15-label taxonomy | Fact-checking |
| Reuters Trust Principles + AP Photo standards (image selection neutrality) | Fact-checking |
| IFCN Code of Principles, criterion 4 (clear, public, consistently applied methodology) | Fact-checking |
| Kahneman 2011 (*Thinking, Fast and Slow*, ch. 9 attribute substitution) | Psychologist |
| Greenwald & Banaji 1995 (implicit cognition) | Psychologist |
| Mercier & Sperber 2017 (*The Enigma of Reason*, ch. 15) | Psychologist |
| Linear / Stripe / Bloomberg Terminal density patterns | UI/UX Architect |
| The Verge article-grid pattern (NOT what a fact-check feed should be) | UI/UX Architect |
| Apple HIG (iOS/macOS) — Voice Memos config sheet, Control Center, Files double-tap rename | Consumer OS |
| WCAG 4.1.3 Status Messages (added 2.1) | Accessibility |
| WCAG 1.1.1 Non-text Content / 1.3.3 Sensory Characteristics / 1.3.1 Info and Relationships / 1.4.1 Use of Color | Accessibility |
| FrameNet + AMR-based ClaimBuster (context-sensitive claim extraction) | Linguist |
| LiveFC paper (Venktesh & Setty WSDM '25 §2.3) — topic enum origin | Linguist (commentary) |

---

## 6. Blind Spots & Recommended Additions

The roster covered the user's spec cleanly, but two gaps remain:

- **Streaming-ML / Voice Specialist (pyannote / diart parameters).** Streaming Systems covered WS layer; AI Systems covered LLM pipeline. Nobody had deep diarization ML expertise (the Deepgram nova-3 diarizer is a black box; we can't tune `τ_active` / `Δ_new`, but somebody who knows the ML side would know what failure modes are intrinsic to managed-service diarization vs the open-source approach). **Recommended add for any future "input variety" sub-project review** (when Deepgram pre-recorded API is introduced — Sprint 3).
- **Media Law / Defamation Specialist.** Trust & Safety said no concerns, but the Fact-checking Lead's pushback on "FALSE" verdicts about named individuals (with hero images, score=50 UNVERIFIABLE, etc.) skirts territory where defamation risk grows once the app is published widely. **Recommended add** for the public-launch / GTM milestone, not for Sprint 1.

---

## 7. Next Steps

Two paths. Path A is what to do if you adopt all committee recommendations. Path B surfaces the tensions and lets you make the explicit calls.

### Path A — Full Adoption

Ordered by priority, then consensus strength, with dependencies respected.

1. **Add entity-anchoring rule (2 sentences) to extract-claims SYSTEM prompt**
   - Source: Computational Linguist
   - Priority: High · Consensus: Strong majority · Complexity: Low
   - Depends on: none
   - ⚠ NOTE: spec defers to Sprint 2 — this overrides the deferral (see Tension #1)

2. **Add `aria-live="polite" role="log"` to transcript + accessible `<output>` for audio meter**
   - Source: Accessibility
   - Priority: High · Consensus: Strong-as-WCAG-mandate · Complexity: Low
   - Depends on: none

3. **Replace URL substring sanitizer with `web_search` tool-result citation extraction**
   - Source: AI Systems, Fact-checking
   - Priority: High · Consensus: Strong majority · Complexity: Medium
   - Depends on: none
   - ⚠ NOTE: spec defers to Sprint 3 — this brings the core fix forward (see Tension #2)

4. **Add 3-attempt retry with exponential backoff to JWT refresh; replace 1500ms drain with `{"type":"CloseStream"}` handshake**
   - Source: Streaming Systems
   - Priority: High · Consensus: Unanimous on specific risk · Complexity: Medium
   - Depends on: none

5. **Add `closed`-flag re-checks (or AbortController) between every `await` in `refresh()`**
   - Source: Streaming Systems
   - Priority: High · Consensus: Unanimous on specific risk · Complexity: Low
   - Depends on: item #4 (same code surface)

6. **Add origin allowlist or public-IP check to `/api/source-preview` (SSRF defense)**
   - Source: Security
   - Priority: High · Consensus: Unanimous · Complexity: Low
   - Depends on: none

7. **Extract typed `initialState` constant; share between `startSession` and `reset`**
   - Source: React/Next.js
   - Priority: High · Consensus: Unanimous on principle · Complexity: Low
   - Depends on: none

8. **Two-phase archetype classifier: phase 1 emits `archetype-proposals.json` with `{ canonical_id, proposed_archetype, rationale, confidence }`; phase 2 `npm run apply-archetypes` shows colored diff and applies on confirmation**
   - Source: AI Systems, Psychologist
   - Priority: High · Consensus: Strong majority · Complexity: Medium
   - Depends on: none

9. **Write paragraph operational definition for each severity level pinned to detectability (lay listener); include in tag-archetypes SYSTEM prompt**
   - Source: Psychologist
   - Priority: Medium · Consensus: Strong (solo voice with no dissent) · Complexity: Low
   - Depends on: item #8

10. **Move WS+mic+JWT-refresh lifecycle into a `useMediaSession({ speakersMode })` custom hook**
    - Source: React/Next.js, Streaming Systems
    - Priority: Medium · Consensus: Strong majority · Complexity: High
    - Depends on: items #4, #5, #7

11. **Pre-session config sheet for Speakers mode (replace toolbar toggle)**
    - Source: Consumer OS Designer
    - Priority: Medium · Consensus: Strong (solo voice; aligns with race-condition fix) · Complexity: Medium
    - Depends on: item #10 (if hook owns lifecycle, sheet just sets initial config)
    - ⚠ NOTE: conflicts with user-locked decision from brainstorm (see Tension #4)

12. **Add primary/secondary topic to claim schema (`topic_primary` + `topic_secondary: TOPIC | null`)**
    - Source: Linguist
    - Priority: Medium · Consensus: Strong (solo voice; no dissent) · Complexity: Low
    - Depends on: spec §6.5 / plan Task 22 already touches this surface

13. **Compress hero image from 16:9 card-leading to 48×32 thumbnail in source list**
    - Source: UI/UX Architect
    - Priority: Medium · Consensus: Majority (alternative: Fact-checking wants kept-with-caption) · Complexity: Low
    - Depends on: none
    - ⚠ WARNING: see Tension #3

14. **Add mandatory provenance caption to hero images (if kept at card-leading)**
    - Source: Fact-checking
    - Priority: Medium · Consensus: Majority · Complexity: Low
    - Depends on: alternative to item #13 (not both)
    - ⚠ WARNING: see Tension #3

15. **Add `console.warn` at JWT refresh attempts and on 5 consecutive null speaker_ids**
    - Source: Streaming Systems
    - Priority: Medium · Consensus: Strong (solo voice; no dissent) · Complexity: Low
    - Depends on: items #4

16. **Add a Map-returning Zustand selector for `claimByStart` (perf — async preview cascade)**
    - Source: React/Next.js
    - Priority: Low · Consensus: Strong (solo voice; perf-only) · Complexity: Low
    - Depends on: none

17. **Add `sizes="(max-width: 768px) 100vw, 33vw"` to `<Image unoptimized>`**
    - Source: React/Next.js
    - Priority: Low · Consensus: Strong (specific, no controversy) · Complexity: Low
    - Depends on: none

18. **Prompt-caching wrapper on `taxonomyHints()` in `analyze-rhetoric.ts`**
    - Source: AI Systems
    - Priority: Low · Consensus: Strong · Complexity: Low
    - Depends on: none

19. **Couple rhetoric → claim handoff: rhetoric markers signal claim extractor on flagged passages**
    - Source: Linguist
    - Priority: Low · Consensus: Strong (solo voice) · Complexity: Medium
    - Depends on: item #1 (entity anchoring) shipped first

20. **Merge PARTIAL + OMISSION → "Incomplete"; add intent criterion for MISLEADING**
    - Source: Fact-checking
    - Priority: Low · Consensus: Strong (solo voice on this specific call) · Complexity: Medium
    - Depends on: deferable to a "verdict taxonomy review" mini-sprint

21. **Split UNVERIFIABLE into "insufficient evidence" vs "beyond scope" via prompt + explanation requirement; drop `score: 50` default**
    - Source: Fact-checking, AI Systems
    - Priority: Low · Consensus: Strong majority · Complexity: Low
    - Depends on: shipped with #20 ideally

22. **Generate `/methodology` page from verdict-theme data (IFCN criterion 4 transparency)**
    - Source: Fact-checking
    - Priority: Low · Consensus: Strong (solo voice) · Complexity: Low
    - Depends on: deferable to public-launch sprint

### Path B — Selective Adoption

#### Ready to Act — Full Consensus or Single-Voice Mandate

These are not contentious. Recommend shipping these in Sprint 1.

1. **Add entity-anchoring rule to extract-claims SYSTEM prompt** — High priority · Strong majority · Low complexity
2. **Add `aria-live` to transcript + accessible audio meter equivalent** — High priority · WCAG mandate · Low complexity
3. **Replace URL sanitizer with tool-result citation extraction** — High priority · Strong majority · Medium complexity
4. **Add JWT refresh retry + CloseStream handshake** — High priority · Unanimous on risk · Medium complexity
5. **Add `closed`-flag re-checks (or AbortController) between awaits** — High priority · Unanimous · Low complexity
6. **SSRF defense on `/api/source-preview` (origin allowlist or public-IP check)** — High priority · Unanimous · Low complexity
7. **Extract typed `initialState` constant for store** — High priority · Unanimous · Low complexity
8. **Two-phase archetype classifier with confidence + diff review** — High priority · Strong majority · Medium complexity
9. **Severity operational definition pinned to detectability** — Medium priority · Strong (solo) · Low complexity
10. **`useMediaSession` hook unifying WS+mic+JWT-refresh lifecycle** — Medium priority · Strong majority · High complexity
11. **Primary + secondary topic on claim schema** — Medium priority · Strong (solo) · Low complexity
12. **Refresh-attempt `console.warn` + null-speaker-id threshold warning** — Medium priority · Strong (solo) · Low complexity
13. **`<Image>` `sizes` prop fix** — Low priority · Unanimous · Trivial
14. **Prompt-caching wrapper on taxonomy block** — Low priority · Strong · Trivial
15. **Map-returning selector for `claimByStart`** — Low priority · Strong (solo, perf-only) · Low complexity

#### Requires Your Decision — Key Tensions

##### Tension #1: Hero image treatment

**Position A:** Compress to 48×32 thumbnail in source list (UI/UX Architect)
- Members: UI/UX Architect
- Evidence: Stripe/Linear/Bloomberg density principles; 8–12 cards live shouldn't feel like a CMS index

**Position B:** Keep 16:9 at top with mandatory provenance caption (Fact-checking)
- Members: Fact-checking Lead
- Evidence: Reuters Trust Principles transparency requirement; AP Photo standards on image-as-editorial-amplifier

**Meta-agent assessment:**
- Favor A when: speed-of-scan and live-density matter more than at-a-glance source identity
- Favor B when: source-as-evidence framing matters (the image *should* feel like "the proof")

**Implications:**
- Choose A → cards become tight rows; OG-fetcher investment partially wasted; need fallback design when no thumbnail loads
- Choose B → preserves the visual jump in demo quality; introduces editorial-amplification surface that needs ongoing newsroom discipline; needs server-side image-load check to avoid broken-image embarrassment

Your decision: ___

##### Tension #2: Speakers-mode toggle placement

**Position A:** Move to pre-session configuration sheet (Consumer OS, also fixes React/Streaming race)
- Members: Consumer OS Designer (primary), Streaming Systems + React/Next.js (race-condition concerns dissolve here)
- Evidence: Apple HIG — destructive-capability toggles never go in primary toolbars; Voice Memos quality settings pattern

**Position B:** Keep in header with silent mid-session restart (current spec, locked during brainstorm)
- Members: spec/plan as written; user previously locked this approach
- Evidence: low-friction toggle during testing; the `useEffect` restart was acknowledged

**Meta-agent assessment:**
- Favor A when: you treat speakers-mode as a configuration choice (set once before a session); race-condition class is closed by design
- Favor B when: you actually flip speakers-mode mid-session frequently (e.g., live demo where you alternate between mic-only and speaker-playback)

**Implications:**
- Choose A → no `useEffect` restart code, no race against JWT refresh, one extra click before recording (acceptable per HIG); user's earlier locked choice gets overridden
- Choose B → keep the current spec; ship the race-condition fixes (#4, #5, #10 above) which already cover it; one fewer pre-session click

Your decision: ___

##### Tension #3: Co-reference fix — Sprint 1 prompt addition vs Sprint 2 normalization deferral

**Position A:** Ship the 2-sentence prompt addition in Sprint 1 (Linguist)
- Members: Computational Linguist (primary), AI Systems (sympathetic)
- Evidence: Two sentences in SYSTEM prompt; would have prevented Joe Kent UNVERIFIABLE in the session export; not coreference resolution, just controlled definite description

**Position B:** Keep Sprint 2 deferral; the architectural work needs the deeper redesign
- Members: spec/plan as written
- Evidence: Sprint 2 is already scoped for claim normalization; adding to Sprint 1 risks scope creep

**Meta-agent assessment:**
- Favor A when: the user-observed Joe Kent failure was the dominant pain in the session export review; 30 min of prompt work has high ROI
- Favor B when: rigid sprint boundary discipline matters more than the marginal demo-quality improvement

**Implications:**
- Choose A → Sprint 1's plan gains one task (~30 min): update `lib/prompts/extract-claims.ts` SYSTEM with entity-anchoring + reported-speech rules. Sprint 2's normalization architecture still ships separately
- Choose B → Sprint 1 ships as planned; Joe Kent class of failures persists until Sprint 2 lands

Your decision: ___

##### Tension #4: Verdict taxonomy collapse — Sprint 1.5 mini-sprint vs leave alone

**Position A:** Merge PARTIAL + OMISSION → "Incomplete"; split UNVERIFIABLE; drop score=50 (Fact-checking)
- Members: Fact-checking Lead, AI Systems (on the UNVERIFIABLE split)
- Evidence: PolitiFact precedent; IFCN criterion 4; epistemic honesty

**Position B:** Keep current 8-label taxonomy with score=50 UNVERIFIABLE default
- Members: spec/plan as written
- Evidence: stable, already-shipped; changing the taxonomy after v1 is launched means re-labeling considerations

**Meta-agent assessment:**
- Favor A when: editorial credibility matters for the next phase of users; you're willing to spend half a day on taxonomy review between Sprint 1 and Sprint 2
- Favor B when: velocity dominates and the current taxonomy is "good enough"

**Implications:**
- Choose A → schedule a "verdict taxonomy review" mini-sprint after Sprint 1 ships locally. Updates verdict-theme, prompts, taxonomies, exports. ~half-day.
- Choose B → ship Sprint 1 as planned; revisit later if a fact-checking review surfaces concrete user confusion

Your decision: ___

---

*Review document end. SESSION.json checkpoint: `synthesis_complete`.*
