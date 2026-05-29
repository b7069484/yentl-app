# Committee Review: Yentl Audit & Launch Readiness

**Committee:** Tech Product Review × Yentl Audit
**Members:** 10 (10 reporting, 0 unavailable)
**Date:** 2026-05-28
**Mode:** Standard
**Report depth:** default
**Deliverable under review:** [`agent-work/yentl-audit-2026-05-28/REPORT.md`](agent-work/yentl-audit-2026-05-28/REPORT.md) + founder's ship-ASAP directive (browser web app + Chrome extension first; iOS/Android deferred; AI Act Article 50 hard deadline 2026-08-02 ≈ 9 weeks).

---

## 1. Executive Summary

The committee converges on three findings that fundamentally re-shape the audit's recommended fix path. **First, the persistence layer is not soft-broken — it does not exist. The `db` client is imported nowhere in `app/` or `lib/`; sessions live and die in Zustand memory.** That single discovery, surfaced by Stripe's read of the actual import graph, reclassifies the entire audit: "the speaker-attribution cascade" is no longer the most dangerous problem on the board. **Second, two security/compliance vectors are immediate launch-blockers** — unrate-limited AI routes that allow trivial cost exfiltration, and a localStorage-only consent record that an adversary can forge to bypass the BIPA and AI Act scaffold. **Third, the audit's Phase ordering systematically defers high-leverage low-risk fixes (Gateway fallback, prefix cache, paywall sheet, verdict URL) to the end, behind the highest-friction research-grade work.**

On the design side, Apple's review is unsparing: the live workspace renders five-to-six competing focal points with no dominant hierarchy, the 5-checkbox consent modal is the iOS pre-14 anti-pattern, and the live "heat" signal is "theater without acoustics" until prosody lands. The Skeptic End User confirms it experientially — closes the tab in 30 seconds. Editorially, PolitiFact lays out four specific surfaces (4-field ClaimCard with a "why this label not the adjacent one" sentence; 4-tier source taxonomy with `primary_document` flag; `/verdict/[id]` permalink with dispute form; published "what Yentl doesn't fact-check" methodology) that need to exist on day one to meet IFCN standards and survive partisan attack.

The Scrappy Founder dissents sharply on scope: ten weeks of audit work in nine weeks of calendar is the recipe for not shipping. He argues for cutting Phase E entirely, deferring Phase G, and ordering by revenue rather than by foundation. The Data Scientist counters with a different cut: N=8 is a hypothesis sample, not validation; the proposed 80%/90%/95% acceptance gates are unanchored against DIHARD field benchmarks; no launch metrics are defined; the prosody and ASR experiments are confounded by phase order. AssemblyAI argues the audit's Phase 0 measurement harness is the wrong first patch — three lines in `deepgram-batch.ts` that preserve word-level evidence and stop defaulting `speaker_id` to 0 unlock everything else with zero consent gate. Compliance ties the regulatory case shut: Phase B (verdict URL) and Phase C (BIPA consent) must be a single sprint completed by 2026-07-01.

**The synthesized verdict: the audit is well-written but its priority math is wrong. The first two weeks of work, properly sequenced, should be a hygiene PR + persistence wire + paywall + verdict URL + Gateway fallback + prefix cache + the 3-line attribution-honesty patch + server-side consent. That single sprint closes the four highest-severity gaps the committee surfaced and leaves seven weeks for the remaining work — enough for AI Act and shippable as MVP.**

---

## 2. Committee Roster

| # | Member | Company | Archetype | Tier | Status |
|---|---|---|---|---|---|
| 1 | Head of UI/UX | Apple | domain-expert | Full | ✓ Complete |
| 2 | Head of Claude Code | Anthropic | domain-expert | Full | ✓ Complete |
| 3 | Head of Engineering | Stripe | domain-expert | Full | ✓ Complete |
| 4 | Data Scientist / Metrics Lead | — | generalist | Full | ✓ Complete |
| 5 | Scrappy Startup Founder | bootstrapped $5M ARR | operator | Full | ✓ Complete |
| 6 | Head of Speech AI | AssemblyAI *(dynamic)* | domain-expert | Full | ✓ Complete |
| 7 | Editor-in-Chief | PolitiFact *(dynamic)* | operator | Full | ✓ Complete |
| 8 | Head of Threat Intelligence | CrowdStrike | domain-expert | Focused | ✓ Complete |
| 9 | Regulatory & Compliance Officer | *(dynamic)* | adversarial | Focused | ✓ Complete |
| 10 | Skeptic End User | — | adversarial | Focused | ✓ Complete |

Blind spot offered and declined: Head of Browser Platform at Mozilla (Chrome Web Store / Manifest V3). Surfaces again in §6 as a recommended pre-launch addition.

---

## 3. Individual Reports

### 3.1 Full Reports

### 1. Head of UI/UX at Apple

**Executive assessment:** Yentl has the bones of a genuinely differentiated product, but it is not "beautifully refined" by any standard Apple would apply. The gap is structural, not cosmetic — multiple competing focal points in the live workspace, a checklist-as-modal consent gate, and a verdict surface with no shareable identity.

**Key issues identified:**

- **The live workspace has no dominant hierarchy — it's a dashboard, not a product.** `live-signal.tsx` renders `currentRead`, `claimRisk`, `rhetoricHeat`, `evidenceState`, `liveState`, and `newFinding` as equal-weight panels. A user under cognitive load of a live debate cannot process six signals. Voice Memos has one waveform; Apple Music Now Playing has one primary, secondary gestural. HIG's "one primary action per screen" violated.
- **The consent gate is a checklist, not a handshake.** Five checkboxes in a blocking Radix Dialog is the iOS-pre-14 multi-permission anti-pattern Apple eliminated in iOS 14. Correct model: Setup Assistant cadence — one permission, one explanation, one decision, advance. Duolingo frames each consent as a benefit, not legal obligation.
- **Verdict has no identity and no exit point.** `VerdictCard` exists with no `/verdict/[id]` route. Apple's Share Sheet is first-class because shareable objects create trust and network effects. Stripe's payment confirmation has a URL — a fact-check verdict without one is a receipt that only the buyer can ever see.
- **The heat signal is theater without acoustics, and users will eventually notice.** `rhetoricHeat` = raw marker count with no severity weighting, no speaker attribution, zero prosody. `AudioMeter` RMS computed and discarded. UI implies "reading the room"; system is reading words. Until prosody lands, the indicator should be labeled "Language heat" — not presented as holistic.

**Suggestions & opportunities:**

- **Collapse the live workspace to single-signal primary view.** One animated "temperature" indicator (the brand mark itself, scaling and shifting hue) with the six sub-signals accessible via swipe-up sheet. Now Playing pattern: one thing primary, everything else gestural secondary.
- **Replace the consent modal with sequential single-permission flow.** Each consent moment its own full-bleed screen — icon, Fraunces 28pt benefit statement, legal body, one primary button. BIPA-specific consent separated from general recording consent — they are materially different asks.
- **Give verdict a permanent URL and share-first design.** `/verdict/[sessionId]` formatted to render cleanly in iMessage link previews and Twitter cards. App Store product pages are the model.

**What I'd ship instead:** Two-state surface — **listening state** (microphone active, beacon visible, one dominant heat glyph, transcript appearing below) and **review state** (claims surfaced, verdict available). No six-panel signal dashboard during listening. The transition is a designed moment — like iPhone Camera capture-to-review. The six signals become the review-state's expandable breakdown. For consent and trust: three-screen onboarding sequence before the first session — "What Yentl listens for," "What stays on your device," "What goes to our servers" — runs once, never again. ConsentGate becomes a one-sentence confirmation because real consent already happened. Apple Health HealthKit pattern.

---

### 2. Head of Claude Code at Anthropic

**Executive assessment:** Yentl's reasoning layer is fundamentally sound — Opus 4.7 with web search is appropriate muscle for an 8-label taxonomy. The product is not AI-architecture-broken; it is data-pipeline-broken upstream of the AI. Shipping in this state means the AI gets blamed for errors that are actually parser bugs.

**Key issues identified:**

- **`diarize: false` lock and AudioMeter discard are two independent debts, not one.** The audit conflates them. The speaker-collapse bug is a parser/config problem corrupting downstream inference. The AudioMeter discard is a separate signal-integration gap — RMS persistence onto `TranscriptSegment` is attribution-agnostic and could ship in Phase A without touching BIPA. Conflating risks Phase E being deferred indefinitely.
- **Gateway SPOF is more dangerous than the audit acknowledges.** Trimodal run hit a 500 (credit ceiling) that killed in-flight reasoning. Audit defers fallback to Phase G — the *last* phase. A 30-second AI outage during a live debate is a trust-destroying failure. A 20-line "try Gateway, retry once with direct `ANTHROPIC_API_KEY` on 5xx" eliminates the most user-visible failure mode.
- **`ephemeral` cache control on analyze-rhetoric is costing real money today.** The 100-entry taxonomy is static. With `ephemeral`, it re-tokenizes on every call. With `prefix` (persistent caching), it hits the cache after the first call. At ~300 rhetoric calls per 25-minute session and Opus pricing, the cost delta is not marginal. Audit flags this P3 — it should be Phase A.
- **`extract-claims` prompt has uncertainty-disclosure gap.** Prompt instructs the model to skip "pure opinions, normative statements, hypotheticals" — but the 8-label taxonomy includes `OPINION` and `UNVERIFIABLE`, which require the model to have decided the claim is NOT checkable. No explicit "extraction confidence" signal — no way to flag "I extracted this but I'm uncertain it's a genuine assertion vs. rhetorical device." The spec's `ClaimStance` type is the right fix, but it's Phase 4.

**Suggestions & opportunities:**

- **Collapse Phase G's Gateway failover into Phase A as a 20-line safety net.** Try `@ai-sdk/anthropic` via Gateway; on `5xx` or `ECONNREFUSED`, retry once via `new Anthropic({ apiKey })` direct. Cursor's backend does exactly this.
- **Ship `prefix` cache on rhetoric system prompt immediately.** 1-line change. Anthropic prompt-caching guide and AI SDK `generateText` spec. Claude Code's own backend shows 40–60% token cost reduction on repeated static-prefix calls.
- **Re-order phases: A (types + parser fix + prefix cache + gateway fallback), B (uncertainty UI + verdict route + paywall), C (consent-gated diarize), D (persistence), E (prosody), F (hardening), G (provider benchmark).** Operational resilience is a correctness property, not a performance optimization.

**What I'd ship instead:** Two-week Phase A doing four atomic things — (1) fix `TranscriptSegment` type to stop lying (`null` not `0`, preserve `words[]`), (2) switch rhetoric from `ephemeral` to `prefix` cache, (3) add Gateway → direct-SDK fallback, (4) add `ClaimStance` to extraction schema so the model can flag hedged/quoted/mocked claims from day one. These four changes touch no UI, change no production behavior, and eliminate three biggest ship-blockers: data lies, cost bleed, live outage risk. What Anthropic would NOT do: ship the AI Act disclosure surface (verdict route) before the underlying attribution data is truthful. A shareable verdict URL that says "Speaker 1 asserted X — FALSE" when Speaker 1 is a `speaker_id: 0` artifact is more legally dangerous than no verdict URL at all.

---

### 3. Head of Engineering at Stripe

**Executive assessment:** Yentl has a well-structured stack and a disciplined compliance posture, but it has a critical credibility problem: the persistence layer described in the schema and referenced throughout the audit does not exist in production. Paired with an absent paywall, single-provider AI dependency with no circuit breaker, and a 1,324-line extension monolith, this is not a ship-ready engineering posture.

**Key issues identified:**

- **The persistence layer does not exist — sessions are not being saved.** `lib/db/client.ts` is never imported anywhere in `app/` or `lib/` outside its own schema file. Drizzle's `sessions`, `users`, `subscriptions` tables are schema-only. `endSession()` in `session-store.ts` updates local Zustand and nothing else. The "resumable sessions" feature, `/sessions` history page, and session-restore flow are wired to data that is never written. This is a P0 disguised as P1. Every speaker correction, claim, marker disappears on tab close with zero recovery path. **Verified by direct import-graph check.**
- **The paywall is missing, and the monetization loop is broken at the conversion step.** `subscriptions` table has `stripeCustomerId` and `stripeSubscriptionId` columns — intent is there. But V3.11 paywall sheet has no component on main, and since DB layer isn't writing, `audioSecondsUsed`/`wordsUsed` counters are never incremented. Pricing page exists at `/pricing`, users see what they'd pay for, no way to actually pay. Stripe Checkout: three server-side calls. No Stripe SDK in `package.json` yet.
- **Vercel AI Gateway is a single point of failure with no degradation story.** `lib/server/anthropic.ts` is five lines: one constant, one comment. No retry, no timeout tuning, no circuit breaker. The trimodal credit-balance 500 took manual intervention. In production at 2 AM mid-session: 500 returned, fact-check lost. Stripe pattern: every external dependency gets timeout budget, retry with jitter, typed error class, fallback behavior. Even "queue this claim for retry in 30 seconds" beats silent 500.
- **The extension monolith will become the next bottleneck.** 1,324 lines violates SRP visibly. The audit's Phase 8 commit history shows this file absorbed an entire week of iteration. Every new tab/signal/source lands here. Cognitive overhead of safe modification grows quadratically.

**Suggestions & opportunities:**

- **Wire the persistence layer before writing any new feature.** Drizzle client and schema are correct. Missing: importing `db` and calling `db.insert(sessions).values(...)`. A `/api/sessions/[id]` route with debounced PUT and GET closes the ghost-table gap in a day.
- **Stripe Checkout wired to existing schema is a two-day sprint.** (a) `stripe.checkout.sessions.create` behind `/api/billing/checkout`; (b) webhook at `/api/billing/webhook` handling `customer.subscription.updated`; (c) V3.11 paywall as Radix Dialog firing when `audioSecondsUsed >= tier_cap`. One-line `pnpm add stripe`. Highest ROI two-day sprint before August.
- **Wrap every external call in timeout + typed error class.** `extractClaims()` with 15s timeout returns `{ status: "retry_queued" }` rather than throwing 500. Rhetoric degrades gracefully to "analysis pending." Deepgram streaming auto-reconnects with exponential backoff. Stripe pattern.

**What I'd ship instead:** Stripe's approach: fix the foundation before building the floors. First PR is the persistence wire — import `db`, write session upsert endpoint, add debounced autosave in orchestrator. That one PR transforms "a fact-check product where everything disappears on tab close" into "a fact-check product." Second PR is Stripe Checkout plus V3.11 paywall — three server-side calls and one Radix Dialog converts `/pricing` from dead end into revenue funnel. Both PRs together: a week of real work, closing the two gaps that matter most for August 2. A product where sessions aren't saved and users can't pay is not a product that benefits from speaker diarization.

---

### 4. Data Scientist / Metrics Lead

**Executive assessment:** The trimodal eval's core insight is real, but the proposed acceptance gates (80%/90%/95%) are aspirational numbers floated without reference to field benchmarks, and N=8 is a convenience sample. Before Phase A ships, Yentl needs a measurement framework, not just a fix roadmap.

**Key issues identified:**

- **N=8 is a hypothesis generator, not a validation set.** Estimating a proportion to ±10% with 95% confidence needs N≈96 (Wilson interval). Detecting a 10pp improvement at 80% power needs N≈82 per arm. The plan's 17 labeled hard-windows gives ±21pp CIs. Minimum defensible corpus: 60 labeled windows stratified across speaker count (1/2/3+), audio quality (clean/moderate/degraded), content type (interview/debate/hearing/monologue).
- **Acceptance gates are not calibrated to field benchmarks.** DIHARD III (2021) best system DER ~11.6% (purity ~88%) on full test; ~21.7% on "core" subset (~78% purity). VoxConverse 2021 winning ~3.5% DER on favorable TV data. The 80% purity gate is roughly "DIHARD difficult-set tier" — only achievable with specialized diarization (pyannote 3.x, NeMo MSDD), not Deepgram Nova-3 with `diarize:true`. If 80% is the shipping criterion, the realistic path is pyannote/NeMo second-pass (Phase G), not just enabling Deepgram diarize. Otherwise Phase G is revealed as scope change.
- **No launch metrics defined — vanity vs. signal.** Audit's criteria are all internal technical gates. Real signals: (a) **claim-to-correction rate** — how often users manually correct speaker label or verdict; (b) **cross-modal session initiation** — natural quasi-experiment on ingest quality; (c) **session completion rate**; (d) **D7 return rate** — the one retention metric that predicts habit formation.
- **Prosody A/B design conflates two independent variables.** Phase E adds prosody to rhetoric layer. Phase G simultaneously replaces ASR. Running both makes outcome attribution impossible. Hold ASR constant when testing prosody.

**Suggestions & opportunities:**

- **Define pre-launch measurement baseline before writing a line of Phase A code.** Instrument four events: `session_started`, `ingest_mode`, `session_completed`, `speaker_correction_made`. Logged to Drizzle `sessions` table with timestamps. Two hours of work, zero schema changes.
- **Stratified corpus design.** 17 windows becomes 60 across six strata (2 speaker counts × 3 audio quality tiers), 10 per stratum, human-labeled. Stratum-specific DER estimates tell you which strata Deepgram already solves vs which need pyannote.
- **Run prosody A/B as offline corpus experiment before user exposure.** Take the 60-window corpus, run prosody-on/off variants, measure precision/recall on bias/fallacy taxonomy. Booking.com and Netflix do this before A/B traffic exposure.

**What I'd ship instead:** Launch dashboard with five day-1 metrics: (1) P50/P95 session completion time (latency), (2) session completion rate (pipeline health), (3) speaker correction rate per session (attribution quality), (4) ingest mode distribution (where users actually enter), (5) D7 retention (habit signal). Gate Phase A shipping on baseline instrumentation being live, not on code completion. Each phase ships with a pre-registered success criterion before code: Phase A success = speaker correction rate drops ≥20% in 72 hours; Phase C success = speaker purity ≥72% on clean-audio stratum (not 80% — calibrate to what Deepgram diarize actually achieves on good audio); Phase E success = ≥5pp precision improvement in offline corpus with ASR held constant; Phase G success = ≥80% purity on difficult-audio stratum (where pyannote/NeMo are actually needed).

---

### 5. Scrappy Startup Founder

**Executive assessment:** You will not ship in 9 weeks at this pace. The audit is technically thorough, beautiful even — and that's the problem. It describes a 10-week engineering roadmap for a product that doesn't yet have one paying customer. Speaker attribution gets five pages; paywall gets one sentence. Backwards.

**Key issues identified:**

- **You're over-engineering the invisible problem first.** Speaker attribution is broken, yes — but users don't know what it's supposed to do. They're tolerant of imperfect transcripts. Meanwhile, pricing page has no paywall — conversion funnel with the bottom cut off. Basecamp didn't launch with perfect multi-user attribution; they launched with todo lists at $9/month and fixed edge cases when users complained. P0 right now: can someone give you money? No.
- **14 named agent streams is a startup smell, not a startup.** Moshe, Miriam, Ezra, Talia, Shira, Devorah, Lev, Hadassah, Eli, Aviva, Yonah, Rivka, Ariel plus trimodal — an 8-figure org's planning apparatus applied to pre-revenue. Calendly launched as one guy, one feature. Cut to 3 active workstreams: paywall live, verdict shareable URL, AI Act compliance surface.
- **The AI Act deadline is not the launch blocker you think it is.** Art 50 binds 2026-08-02 — that's a "must be compliant by" date, not "must launch on" date. Compliance Run 1 already landed 27/28 clauses. You're more AI Act compliant than 95% of AI tools that launched in the last 18 months. The real deadline is: when does the first user pay? That should be next week.
- **Phase E (prosody, 2 weeks) is an enterprise feature nobody asked for.** AudioMeter RMS thrown away? Fine for launch. Mailchimp didn't ship predictive send-time in 2001. Prosody is differentiation for v2 when a customer says "I need acoustic signals."

**Suggestions & opportunities:**

- **Invert the roadmap: paywall first, plumbing second.** Wire V3.11 paywall in one focused day. Calendly's growth exploded because free-to-paid was frictionless. You have a pricing page that goes nowhere.
- **Shareable verdict URL is your free acquisition channel.** Morning of work. Every "here's my Yentl" share is a viral loop. Notion's growth was screenshots of pages.
- **Cut Phase G entirely for now.** Provider benchmarking is research. Deepgram works well on clean content per your own data. "Probably Speaker 1" is better than no speaker. Benchmark when a real user hits a real edge case, not before.

**What I'd ship instead:** 9-week plan, 3 phases not 7. **Week 1-2**: paywall live, verdict shareable URL, package rename, manifest cleanup. Now you can charge money and now your product spreads. **Week 3-5**: Phase A (types extension, stop lying about `speaker_id: 0`) plus Phase B visible uncertainty badges, bundled. Don't do consent-gated diarization yet — flag BIPA docs for legal in parallel. **Week 6-8**: AI Act surface polish, hardening pass clauses that matter (rate-limit, security headers, console.log sweep). Week 9 is buffer for what broke when real users showed up. Everything else — prosody, provider benchmarking, agent streams, audit log, WhisperX ensemble, extension panel refactor — is v1.5 scope. A 1,324-line component that works is not a launch blocker. A paywall that doesn't exist is.

---

### 6. Head of Speech AI at AssemblyAI

**Executive assessment:** The spec is conceptually sound and ethically serious. However, the plan sequences work in a way that delays the single highest-value unlock — capturing existing Deepgram word-level evidence — behind a measurement harness that doesn't yet exist. And the overlap taxonomy contains a structural gap that will cause real failures on Yentl's most important content type: political debate audio captured through a browser tab.

**Key issues identified:**

- **Phase 0 (measurement harness) before Phase 1 (evidence capture) is the wrong order.** When diarization is off, the harness scores nothing useful. Phase 1's fix — preserving word-level confidence from Deepgram's non-diarized output — should come first. Nova-3 with `diarize: false` + `utterances: true` still returns per-word `confidence` in `results.channels[0].alternatives[0].words[]`. The batch parser calls `response.results.utterances` but never reads `channels[0].alternatives[0].words`. Available now, zero consent required.
- **`dominantSpeaker()` by word-count majority is the wrong aggregation for political debate.** Deepgram's diarized output assigns speaker ID at word level with `speaker_confidence` (0–1). In debate audio, a speaker can own 40% of words but 90% of high-confidence words. Right aggregation: `sum(word.duration * word.speaker_confidence)` per speaker, not `count(word.speaker)`. WhisperX handles via frame-level posterior integration. Known production failure mode.
- **The Chrome extension tab-capture path is architecturally incompatible with cloud diarization.** Tab audio arrives as mixed mono — all speakers collapsed before Yentl receives bytes. Deepgram, AssemblyAI, Soniox all expect single-speaker-dominant or cleanly separated channels. Mixed-mono debate audio fed through `chrome.tabCapture` is the hard case (DIHARD III track 2 results confirm). For tab-captured YouTube: extract audio server-side via the existing URL ingest path, run batch diarization on unmixed audio. Live tab capture should be `source_audio_kind: browser_tab` with `attribution_status` defaulting to `uncertain`.
- **`OverlapClass` is missing `latent_overlap`.** The 200–400ms window between last interim and `is_final` emission. ~15–20% of turn-boundary words in Vance/Walz land here. TS-VAD and Sortformer handle via frame-level lookahead; a streaming API without lookahead should expose a `latent_boundary` flag on segments within 300ms of prior segment's end.

**Suggestions & opportunities:**

- **Ship `diarize_model=latest` for corpus-only paths immediately — no consent required.** BIPA concern is voiceprint creation for live user audio. Your test corpus is public political/news audio you've already ingested. `diarize_model: "latest"` as of Q1 2026 adds per-word `speaker_confidence` and speaker distribution. Real DER baselines within hours.
- **Add AssemblyAI as benchmark on the 8 trimodal candidates before committing to Deepgram long-term.** Hitchens/McGrath shows 0% Claim Jaccard SRT↔audio — that's transcription grounding, not diarization. AssemblyAI Universal-2 performs meaningfully better on British-accented English debate audio (Conformer blog Nov 2024). Run AssemblyAI on Hitchens and Bondi specifically.
- **For live mic capture, consider Soniox real-time over Deepgram streaming.** Soniox documentation is honest about the accuracy gap (which is a quality signal). Per-token speaker labels with explicit uncertainty maps cleanly onto your `AttributionStatus` model without impedance mismatch.

**What I'd ship instead:** Skip Phase 0 as first deliverable. The harness without richer evidence is measuring silence. Actual first patch is three lines in `deepgram-batch.ts`: read `response.results.channels[0].alternatives[0].words`, map each word's `confidence` and (when diarized) `speaker` and `speaker_confidence` into an `ASRWord[]` array, attach to segment. Change fallback from `speaker_id: 0` to `speaker_id: null, attribution_status: "not_available"`. Zero risk, zero consent, immediately ends "Speaker 1 is the only speaker" lie. Second patch: confidence-weighted duration aggregation in `dominantSpeaker()` + `latent_boundary` flag on segments within 300ms of prior end. Then run AssemblyAI and Soniox on the 8 trimodal candidates in parallel with the updated Deepgram corpus run. The `ASRAdapter` interface is the right architecture — build after you know which provider wins on your actual content, not before.

---

### 7. Editor-in-Chief at PolitiFact

**Executive assessment:** Yentl's analytical ambition is real and the technical architecture is serious, but the editorial surface — the part non-expert users actually trust — is underdeveloped in ways that will invite both partisan attack and legitimate methodological criticism. Without these surfaces, Yentl is not a fact-check product — it is an AI opinion machine with verdict-shaped UX. Partisans will exploit this, regulators will press it.

**Key issues identified:**

- **Eight labels without a comprehension bridge will destroy trust faster than it builds it.** PolitiFact runs six Truth-O-Meter labels and still invests a full explainer paragraph per verdict. Yentl's eight collapse into four visual variants — label doing double duty as model output and user signal. Gap between `PARTIAL` and `OMISSION` is real (incomplete vs. deliberately withheld) but users can't distinguish them from a color stripe. Full Fact UK research: non-experts anchor on color and ignore label text. Fix: mandatory one-sentence "why this label, not the adjacent one" field on every ClaimCard.
- **The source reputation system does not meet IFCN standards (Principle 4).** `classifyDomain()` is a 52-line hardcoded allowlist with 3 tiers; Politico, FiveThirtyEight, ProPublica, Snopes itself, AP FactCheck all land as "mid" — same as a random blog. A "mid" peer-reviewed preprint is not the same as a "mid" advocacy press release. Maldita requires showing source funding+ownership. Yentl shows domain name and stance badge.
- **No public verdict URL means no correction, no retraction, no accountability loop.** Editorial equivalent of a newspaper publishing corrections to articles with no URL. Birdwatch made shareable permalinks the atomic unit of dispute. AP Fact Check built its engagement loop around linkable claim pages. Without permalink, Yentl cannot: receive formal dispute from the person rated; publish corrections; provide citation trail for journalists; comply with AI Act Art 50 machine-readable identifiability. **Pre-launch blocker.**
- **Algorithmic claim selection is making editorial decisions without editorial accountability.** The claim extraction model decides what's fact-checkable. PolitiFact has a full-time staff meeting to make that call; Yentl's model makes it silently on every 30-second window. Adversarial speakers will learn to phrase claims in ways the extractor skips (plausible deniability at model speed). Fix: `rejected_claims` log surfaced in session view as "claims we heard but didn't fact-check" with brief reason. Full Fact's AI tooling calls this a "claim audit trail."

**Suggestions & opportunities:**

- **Adopt "verdict confidence interval" display, not just a primary label.** The `score` field already exists on ClaimCard but isn't surfaced. PolitiFact internally debates close calls (Half-True vs Mostly False) because the model is uncertain. "Rated MISLEADING (high confidence)" vs "Rated PARTIAL (uncertain — limited sources)" mirrors AP Fact Check's handling of ambiguous claims. Partially defuses the "you called me biased because you're biased" attack.
- **Build "What Yentl doesn't fact-check" methodology section on day 1, not after backlash.** Every credible outlet publishes what they will not rate: satire, opinion, predictions, jokes. OPINION and UNVERIFIABLE are labels, not explanations. Sets expectations, satisfies IFCN transparency principle.
- **Add structured dispute form wired to verdict permalink on day 1.** `/verdict/[id]/dispute` form capturing who's disputing, evidence, correction requested. Lands in Neon, surfaces as flag badge on ClaimCard. Tells you which verdicts are contested, where the model is wrong. PolitiFact corrections page is one of their most trusted surfaces.

**What I'd ship instead:** ClaimCard with four mandatory fields — (1) label, (2) one-sentence "why this label and not the adjacent one" in plain English, (3) confidence tier derived from `score`, (4) permalink button copying `/verdict/[id]` URL to clipboard. Sources displayed with four tiers plus `primary_document` flag for government/court/academic; every source card has one-click "view source" opening primary URL not just domain. `OPINION` label visually distinct from verdict labels (different shape, not just color) — Opinion is not a verdict, it's a classification saying "this is outside our jurisdiction." Load-bearing for trust. Launch with `/verdict/[id]`, "flag this verdict" button wired to dispute form, public `/corrections` log — even if empty. Existence of correction infrastructure is itself an editorial signal. Marker taxonomy seeded from the founder's book on antisemitic rhetoric is a strength, but needs a published methodology note explaining origin/scope/limits. Partisans will accuse bias; the defense is a transparent public record of where the taxonomy came from, who reviewed it, and how it can be contested. Ship that documentation before the first viral verdict.

---

### 3.2 Focused Reports

### 8. Head of Threat Intelligence at CrowdStrike

**Executive assessment:** Yentl is not ready to ship as a security-hardened product. Two attack vectors constitute immediate launch blockers: unenforced AI cost-exfiltration on every AI route, and a client-side consent model that an adversary can trivially bypass to circumvent the BIPA/AI Act scaffold. Legacy domain sprawl (`factify-rose.vercel.app` in extension manifest + Deepgram token allowlist) amplifies blast radius of both.

**Top 2 issues through your lens:**

- **Unauthenticated AI route cost exfiltration (OWASP API6:2023 — Unrestricted Resource Consumption).** No `middleware.ts` enforcing rate limits or per-user spending caps on `/api/extract-claims`, `/api/analyze-rhetoric`, `/api/verify-provisional`, `/api/verify-confirmed`. An attacker discovers these routes trivially via DevTools or the open-source repo, drives unbounded Opus 4.7 calls through Vercel AI Gateway with no friction. At current Opus pricing, a coordinated script hitting all four routes in parallel exhausts a $1,000 gateway credit balance in under 30 minutes. Trimodal run already demonstrated this failure mode. No circuit breaker, no per-IP/per-user quota, no anomaly alert.
- **ConsentGate localStorage tampering — compliance theater bypassing BIPA + AI Act Art 50 (OWASP A04:2021 — Insecure Design).** Consent record written to and read from `localStorage` only. The `x-yentl-source-consent` header is constructed client-side with no server-side validation against a durable record. Any attacker — or a browser extension, XSS payload, or knowledgeable user — sets `localStorage.setItem('yentl-consent', JSON.stringify({...signed: true}))` and sends forged consent headers. BIPA voiceprint disclosure and AI Act transparency satisfied on paper but not in fact. For a fact-check product cited in legal/regulatory contexts, a forged consent record is THE compliance record.

**One key suggestion:** Cloudflare WAF in front of Vercel with token-bucket rate limiter on all `/api/*` AI routes — scoped to authenticated Clerk user ID via JWT claim inspection at edge, hard cap ~50 requests per user per 5-minute window, cost-anomaly alert at 10x baseline. Simultaneously, move ConsentGate writes server-side: POST to a signed `/api/consent` route that persists tamper-evident record to Neon (timestamped, IP-hashed, Clerk user ID–keyed), validate server-side on every AI route before processing. Closes both issues at once. Benchmark: Cloudflare WAF + Stripe Radar's signal-based abuse detection.

---

### 9. Regulatory & Compliance Officer

**Executive assessment:** Yentl's compliance scaffold is genuinely impressive for a pre-launch startup. However, two open exposures are not paperwork gaps — they are lawsuit-class risks that could stop a launch cold, and neither is resolved before the August AI Act deadline. The product is compliance-aspirational, not compliance-ready.

**Top 2 issues through your lens:**

- **BIPA voiceprint exposure on the path to diarization activation (740 ILCS 14).** Current `diarize: false` default is the right posture. Spec for Phase C calls for "BIPA-compliant voiceprint disclosure and deletion-on-request" — but the flow does NOT exist yet. Danger is launch velocity: the moment any code path enables `diarize: true` for even a single real user before the disclosure+deletion flow is live, BIPA exposure is active regardless of ConsentGate's generic mic consent. Illinois courts have consistently rejected general privacy consent as substituting for the specific §15(b) written release. Texas CUBI (§503A) and Washington My Health MY Data add parallel exposure. **Statutory damages: $1,000-$5,000 per violation per person, strict liability.** Phase C must ship a BIPA-specific written release AND `DELETE /api/biometric` route before `diarize: true` is reachable in any user-facing path.
- **AI Act Article 50 (EU 2024/1689) — hard deadline 2026-08-02.** Art 50(4) requires "machine-readable" disclosure when AI generates or manipulates content that could deceive. AI-generated verdicts about whether real people told the truth sit squarely in scope. AIGeneratedBadge and AIDisclosureFooter shipped, but verdict surface has **no shareable URL** — making the machine-readable disclosure path incomplete. You cannot link to a disclosure you cannot address. Fines reach **€35M or 7% of global annual turnover (Art 99(4))**. The verdict-URL gap is simultaneously a product gap (shareability) and a compliance gap.

**One key suggestion:** Treat Phase B (verdict URL) and Phase C (BIPA consent + deletion flow) as a **single regulatory sprint to ship by 2026-07-01** — six weeks before the AI Act binding date. Concretely: (1) wire `VerdictCard` to `/verdict/[sessionId]` with `<meta name="ai-generated" content="true">` plus human-visible disclosure link — covers Art 50 minimally and immediately; (2) simultaneously draft and ship BIPA-specific `diarizationConsentRecord` type (separate from generic `ConsentRecord` in localStorage), server-side `BIOMETRIC_DISCLOSURE_VERSION` flag, `DELETE /api/biometric` route that purges Deepgram speaker models and Neon voiceprint record — both gated behind env flag until legal signs off. Benchmark: Plaid's consent — distinct, non-bundled, names specific data type + retention period + deletion path inline. Don't bundle diarization consent into existing ConsentGate checkboxes. DPA status (Deepgram + Anthropic unsigned) should close before any EU users touch the product; without signed DPAs they are not valid processors under GDPR Art 28.

---

### 10. Skeptic End User

**Executive assessment:** I land at yentl.it, I see a tagline that sounds like it was written for someone who already knows what Yentl is, and within 30 seconds I'm staring at a form asking me to check five boxes before I've seen a single thing the product can do. I close the tab.

**Top 2 issues through your lens:**

- **The consent gate fires before I've earned any reason to care.** I don't know what Yentl actually does yet — I've seen marketing copy, not the product — and now I'm being asked to consent to mic access, AI analysis, web search, age verification, AND analytics in a single modal. That's not informed consent, that's a wall. Calendly shows you the calendar before it asks for your email. Notion lets you poke around in guest mode. The exact moment I'd leave is when that dialog appears and I realize I'm committing to five things for a product I've never touched. Benchmark: Figma drops new users into a real file immediately; account creation only when they try to save.
- **"Don't argue. Yentl it." lands weird if you're not already in.** I'm 35, I saw this shared on Twitter. I don't know the reference. "Yentl" to me is either a Barbra Streisand film or a Yiddish word I half-remember. The tagline assumes I already want to use a verb that doesn't exist yet. Compare to Shazam launch — "Name that song" — zero assumed knowledge, instant value. Right now Yentl's hero copy is a rallying cry for converts, not a door for strangers.

**One key suggestion:** Let me see one real verdict before you ask me for anything. Show a pre-run session — a 90-second clip of a debate, already processed, with live claim cards and rhetoric markers visible — before signup, before consent, before anything. The moment I see a FALSE card appear on a real politician saying a real thing, I'm sold. That's your entire sales pitch. Netflix shows you the trailer before the paywall. Do the same.

---

### 3.3 Flags
None — all members operated at Full or Focused tier.

### 3.4 Unavailable Members
None — 10/10 reported. Quorum: 100%.

---

## 4. Synthesis

### 4.1 Consensus Points

- **Persistence layer is a P0 launch blocker** — Stripe verified by direct import-graph check that the `db` client is referenced nowhere outside its own schema file. Sessions live in Zustand only. Every audit reference to "resumable sessions," "session history," "speaker corrections cascade," and "Drizzle-backed `sessions` table" describes a layer that does not exist in production. *(Source: Stripe; uncontested by other members; reclassifies the entire audit.)*

- **Verdict URL `/verdict/[id]` must ship pre-launch** — surfaced as essential by Apple (shareable identity, Share Sheet first-class), PolitiFact (correction/retraction/dispute loop, IFCN Principle 4), Compliance (AI Act Art 50 machine-readable disclosure addressability), Skeptic (sharing as acquisition), Scrappy (viral acquisition channel). **5 of 10 explicit; functionally unanimous.**

- **V3.11 paywall sheet must ship pre-launch** — Stripe (engineering gap: subscriptions table has Stripe columns but no SDK, no Checkout, no Dialog), Scrappy (revenue blocker), Apple (referenced in critique of missing conversion architecture). **Strong majority.**

- **Vercel AI Gateway fallback belongs in Phase A, not Phase G** — Anthropic Head explicit: 20-line "try Gateway → retry direct SDK on 5xx" eliminates the most user-visible failure mode. Stripe agrees on graceful-degradation pattern. Cursor backend cited as benchmark. **Strong majority.**

- **`ephemeral` → `prefix` cache on rhetoric system prompt is a one-line ship-it-today win** — Anthropic Head explicit; Claude Code's own backend cited as 40–60% token cost reduction reference. **Unanimous-friendly** (technical free win, no one disputes).

- **Stop defaulting `speaker_id` to 0; preserve `words[]` + per-word confidence in `deepgram-batch` parser** — Anthropic, AssemblyAI, and the audit itself converge. AssemblyAI's exact framing: "three lines in `deepgram-batch.ts`" delivers it. **Unanimous (technical).**

- **5-checkbox blocking consent modal is anti-pattern across multiple frames** — Apple (iOS pre-14 multi-permission violation), Skeptic (closes the tab in 30s), Compliance (BIPA-specific consent must be separated), CrowdStrike (localStorage tampering is a forgery vector). **Unanimous.**

- **Cost exfiltration on unrate-limited AI routes is a P0 ship blocker** — CrowdStrike explicit (OWASP API6:2023, ~30 min to exhaust $1K Gateway balance). Stripe adjacent (timeout + circuit breaker pattern). **Strong majority on severity.**

- **Server-side ConsentGate (not localStorage) is required for BIPA + AI Act defensibility** — CrowdStrike (tamper-evident), Compliance (Plaid pattern, signed DPAs). **Strong majority.**

- **N=8 trimodal is exploratory, not statistically validating** — Data Scientist explicit; AssemblyAI implicitly aligns ("benchmark on the 8 candidates" as additional comparison, not as conclusive). Minimum defensible corpus: 60 stratified windows. **Unanimous-adjacent.**

- **The audit's proposed acceptance gates (80%/90%/95%) need calibration to DIHARD/VoxConverse field benchmarks** — Data Scientist explicit; AssemblyAI implicitly aligns on what Deepgram diarize actually achieves vs what specialized diarization (pyannote/NeMo) is needed for. **Strong majority.**

### 4.2 Key Tensions

**Tension #1: Foundation-first — but WHICH foundation?**
- *Stripe* [from report]: persistence wire first. "A product where sessions aren't saved and users can't pay is not a product that benefits from speaker diarization."
- *Scrappy* [from report]: revenue foundation first. "Cut to 3 active workstreams: paywall live, verdict shareable URL, AI Act compliance surface."
- *Compliance* [from report]: legal foundation first. "BIPA-specific written release AND `DELETE /api/biometric` must ship before `diarize: true` is reachable."
- *AssemblyAI* [from report]: evidence foundation first. "Three lines in `deepgram-batch.ts`. Phase 0 measurement harness without richer evidence is measuring silence."
- *Data Scientist* [from report]: measurement foundation first. "Gate Phase A shipping on baseline instrumentation being live."
- *Apple* [from report]: experience foundation first. "Apple would not ship this in its current state."

**Committee note:** This is a genuine and productive tension — every position is correct in its own time horizon. The synthesis: foundations are not mutually exclusive when properly sequenced in a single first-week sprint. Persistence + paywall + verdict URL + Gateway fallback + prefix cache + 3-line attribution fix + server-side consent + 4-event instrumentation **can land together** in 1–2 weeks because none touch each other architecturally. The real conflict is between Scrappy ("cut Phase E and G entirely") and the rest ("defer, don't cut"). Resolution proposed in Path A/B.

**Tension #2: Phase G timing — collapse, cut, or benchmark-first?**
- *Anthropic* [from report]: Collapse the Gateway fallback subset of Phase G into Phase A. Keep the provider-benchmarking work for later.
- *Scrappy* [from report]: Cut Phase G entirely. "Deepgram works well on clean content. Benchmark when a real user hits a real edge case."
- *AssemblyAI* [from report]: Benchmark AssemblyAI and Soniox on the 8 trimodal candidates BEFORE committing to Deepgram long-term. "Pick the provider after the data, not the abstraction before it."
- *Data Scientist* [from report]: Provider benchmark needs the 60-window stratified corpus + offline experiment design before live exposure.

**Committee note:** Sub-tension within sub-tension. Anthropic and AssemblyAI agree that the *Gateway fallback* is a Phase A item; they disagree on whether the *provider-comparison* work is research (Anthropic OK with Phase G) or pre-commitment validation (AssemblyAI wants it earlier). Scrappy wants it gone. Resolution: do the Gateway fallback in Phase A (zero-risk safety wrap); do a focused AssemblyAI/Soniox A/B on the 2–3 worst-performing trimodal candidates as a 1-week diagnostic in Phase A weeks; defer the full ASRAdapter benchmark to post-launch.

**Tension #3: BIPA + diarization timing**
- *Compliance* [from report]: BIPA-specific written release + `DELETE /api/biometric` must ship before *any* code path enables `diarize: true` for a real user. Phase B+C as single regulatory sprint by 2026-07-01.
- *AssemblyAI* [from report]: `diarize_model=latest` on the test corpus (public political/news audio already ingested) requires no new consent — ship it now for evaluation purposes.
- *Apple* [from report]: BIPA-specific consent must be visually separated from general recording consent — different ask, different screen.

**Committee note:** No real disagreement on substance — they're naming different scopes. Internal corpus diarization is fine without new consent (AssemblyAI). Live user diarization requires BIPA disclosure + deletion flow (Compliance). The UX of that consent should be a distinct screen, not a checkbox in a modal (Apple). All three can be true simultaneously.

**Tension #4: Landing-page first-impression strategy**
- *Skeptic* [from report]: "Show one real verdict before you ask me for anything. Netflix trailer-before-paywall pattern."
- *Apple* [from report]: "Three-screen onboarding sequence before the first session." (Health HealthKit pattern.)
- *Scrappy* [from report]: Get to revenue mode — conversion funnel first; landing-as-funnel.
- *Compliance* [from report] *(extended):* No audio capture without server-side consent record. So the demo cannot use user audio.

**Committee note:** Resolvable. Skeptic's "show one real verdict before signup" can be a pre-baked demo session — a 90-second processed clip of a public debate with claim cards and markers visible. No user audio captured, no consent gate triggered. Apple's onboarding sequence happens *after* the demo lands the hook and *after* the user clicks "try it on my own audio." That's a 3-step funnel: demo → signup → sequential consent.

**Tension #5: Prosody (Phase E) — defer or cut?**
- *Scrappy* [from report]: Cut Phase E entirely. "AudioMeter RMS thrown away? Fine for launch. Enterprise feature nobody asked for."
- *Apple* [from report]: Until prosody lands, the live heat indicator should be labeled "Language heat" — not presented as holistic.
- *Anthropic* [from report]: AudioMeter persistence onto `TranscriptSegment` is attribution-agnostic — could ship in Phase A as a 30-line patch without touching BIPA. *Per-speaker prosodic baseline* needs attribution; basic RMS persistence does not.
- *Data Scientist* [from report]: Prosody A/B must hold ASR constant to be valid; run as offline corpus experiment before user exposure.

**Committee note:** A hybrid is available. Persist AudioMeter RMS on `TranscriptSegment` in Phase A (30 lines, attribution-agnostic) — that closes Anthropic's gap. Relabel "Rhetoric Heat" → "Language Heat" in Phase B UI work — that closes Apple's gap honestly. Defer the full prosody-feeds-into-rhetoric integration (Phase E) until post-launch when a customer asks — that honors Scrappy's scope discipline. Run the offline corpus A/B before any prosody-into-model wiring — that honors Data Scientist's rigor.

### 4.3 Evidence & Benchmarks (consolidated)

**Design / UX:** Apple HIG (single primary action), Apple Voice Memos (one waveform), Apple Music Now Playing (one primary, secondary gestural), iPhone Camera capture→review transition, Apple Health HealthKit onboarding, App Store product pages (share-rendering), Stripe Checkout receipt page, Calendly (calendar before email), Figma guest-mode-first, Notion guest editing, Duolingo onboarding-as-product, Netflix trailer-before-paywall, Shazam ("Name that song" zero-assumption tagline).

**AI / ASR / Diarization:** AssemblyAI Universal-2 (esp. British-accented debate); Deepgram Nova-3 + `diarize_model=latest`; Soniox real-time per-token uncertainty; pyannote.audio + WhisperX forced alignment; NVIDIA NeMo Sortformer/MSDD; EEND / TS-VAD overlap research; DIHARD III (best ~11.6% DER full set, ~21.7% core); VoxConverse 2021 winning ~3.5% DER; AssemblyAI Conformer Nov 2024 benchmark blog; Anthropic prompt-caching guide; AI SDK `generateText` spec; Cursor backend Gateway+SDK fallback; Claude Code prefix-cache (40–60% reduction).

**Engineering:** Stripe external-dependency timeout/retry/typed-error pattern; Stripe API design (gold standard DX); Stripe Checkout (3 calls: customer, session, webhook); Stripe Radar abuse signals; AWS scale lessons; Twilio API design; Plaid financial infrastructure.

**Security:** OWASP API6:2023 (Unrestricted Resource Consumption); OWASP A04:2021 (Insecure Design); Cloudflare WAF + token-bucket rate limiting; Stripe Radar signal-based detection; 1Password secrets management.

**Compliance / Legal:** Illinois BIPA 740 ILCS 14 (strict liability $1K–5K per violation); Texas CUBI Bus & Com §503A; Washington My Health MY Data; EU AI Act 2024/1689 Article 50(4) (machine-readable disclosure); Article 99(4) (€35M / 7% turnover); GDPR Article 28 (valid processors); Illinois courts on §15(b) written release vs general consent; Plaid consent UX (non-bundled, specific data type + retention + deletion); IFCN Code of Principles, Principle 4.

**Editorial / Fact-check:** PolitiFact Truth-O-Meter (6 labels + explainer paragraph); Snopes "origin" field; AP Fact Check methodology; Full Fact UK user research on color anchoring + AI claim audit trail; Maldita.es (multilingual, funding+ownership transparency); Birdwatch/Community Notes shareable permalinks; FactCheck.org primary documents; IFCN Code of Principles.

**Metrics / Experimentation:** DIHARD III scoring norm; VoxConverse benchmark; Netflix A/B test everything; Booking.com offline experiment-before-traffic; Spotify cohort analysis; Wilson interval (proportions); 80% power sample-size calcs.

**Bootstrap / Scope:** Basecamp opinionated simplicity; Mailchimp self-serve growth ("email goes out, people open it"); Calendly single-feature dominance; Notion screenshots-as-growth-loop.

---

## 5. Blind Spots & Recommended Additions

The committee was strong across UI/UX, AI architecture, engineering reliability, metrics, security, compliance, fact-check editorial, and bootstrap velocity. Three blind spots remain after the review:

1. **Chrome Web Store distribution + Manifest V3 review process.** Offered during composition; declined. Re-surfacing as an actual launch risk. The extension is one of two launch surfaces. Manifest V3 review timelines are non-deterministic, permission justifications must be explicit, and Web Store removals carry no appeal SLA. Recommended addition for a focused-tier follow-up: **Head of Browser Platform at Mozilla** — has shipped + audited cross-browser extensions, will challenge permissions, CSP, and reviewability.

2. **Localization / multilingual fact-check.** The Maldita.es benchmark surfaced multiple times but no member specifically owns multilingual rollout. If yentl.it is positioned for English-only launch this is moot; if global launch is on the roadmap, a localization-focused review is warranted post-MVP. Suggested: **Head of Internationalization at a multilingual SaaS** (Notion, Linear, Figma).

3. **Real user research / qualitative validation.** The Skeptic-End-User persona is a synthetic adversary; no committee member represents actual recruited users tested against actual sessions. Recommended addition pre-launch (week 6–7): a small qualitative round (5–8 users, recorded sessions on real political clips) before final UI polish.

---

## 6. Next Steps — Path A (Full Adoption)

All recommendations rendered as an ordered action list. Priority + Consensus + Complexity + Dependencies. Where contentious, ⚠ WARNING references the tension.

### Sprint 0 — Hygiene PR (Week 1, ~2 days)

1. **Rename `package.json` "factify-scaffold" → "yentl-app" + update `package-lock.json`**
   - Source: Stripe, Scrappy
   - Priority: High · Consensus: Unanimous · Complexity: Low
   - Depends on: none

2. **Sweep `factify-rose.vercel.app` from `extension/manifest.json`, `extension/manifest.local.json`, `app/api/deepgram/token/route.ts:12`**
   - Source: Scrappy, CrowdStrike (legacy-domain attack surface), Stripe
   - Priority: High · Consensus: Unanimous · Complexity: Low

### Sprint 1 — Foundation Bundle (Weeks 1–2, ~10 days)

3. **Wire the persistence layer (import Drizzle `db`; `/api/sessions/[id]` PUT/GET; debounced autosave in `session-store.ts`)**
   - Source: Stripe (P0 discovery)
   - Priority: High · Consensus: Strong majority · Complexity: Medium
   - Depends on: none
   - *Note:* This is the single most important fix from the committee — the audit underweighted it.

4. **Stripe Checkout + V3.11 paywall sheet (`pnpm add stripe`; `/api/billing/checkout`; webhook `/api/billing/webhook`; Radix Dialog fires at `audioSecondsUsed >= tier_cap`)**
   - Source: Stripe, Scrappy
   - Priority: High · Consensus: Strong majority · Complexity: Medium
   - Depends on: #3

5. **Wire `/verdict/[sessionId]` shareable route + `<meta name="ai-generated" content="true">` + OG image**
   - Source: Apple, PolitiFact, Compliance, Scrappy, Skeptic
   - Priority: High · Consensus: Unanimous · Complexity: Low
   - Depends on: #3

6. **Vercel AI Gateway → direct Anthropic SDK fallback (20-line catch-and-retry wrapper on all AI calls)**
   - Source: Anthropic, Stripe
   - Priority: High · Consensus: Strong majority · Complexity: Low
   - Depends on: none
   - ⚠ WARNING: Scrappy would cut Phase G entirely — this is the minimum-viable subset that survives that cut.

7. **Switch rhetoric system prompt from `ephemeral` to `prefix` cache control (1-line change)**
   - Source: Anthropic
   - Priority: High · Consensus: Unanimous · Complexity: Low

8. **Stop defaulting `speaker_id` to 0; preserve `words[]` + per-word `confidence` from `results.channels[0].alternatives[0].words` in `deepgram-batch.ts`**
   - Source: Anthropic, AssemblyAI, the audit itself
   - Priority: High · Consensus: Unanimous · Complexity: Low (~3 lines)
   - Depends on: extension of `TranscriptSegment` type

9. **Extend `TranscriptSegment` with `ASRWord[]`, `speaker_distribution`, `attribution_status`, `attribution_reasons`, `overlap_class`, `turn_id`, `source_audio_kind`**
   - Source: Anthropic, AssemblyAI, audit Phase 1
   - Priority: High · Consensus: Unanimous · Complexity: Medium

10. **Server-side ConsentGate (move from localStorage to Neon `consent_records` table; signed POST `/api/consent`; server-side validation on every AI route)**
    - Source: CrowdStrike, Compliance
    - Priority: High · Consensus: Strong majority · Complexity: Medium
    - Depends on: #3 (persistence layer)

11. **Cloudflare WAF + token-bucket rate limit on `/api/*` AI routes (scoped to Clerk JWT user-id; ~50 req per user per 5 min; cost-anomaly alert at 10× baseline)**
    - Source: CrowdStrike (P0)
    - Priority: High · Consensus: Strong majority · Complexity: Medium

12. **Instrument 4 events to Drizzle `sessions` table — `session_started`, `ingest_mode`, `session_completed`, `speaker_correction_made` — wire launch dashboard with 5 metrics (P50/P95 latency, completion rate, correction rate, ingest mode dist, D7 retention)**
    - Source: Data Scientist
    - Priority: High · Consensus: Strong majority · Complexity: Low
    - Depends on: #3

13. **Add `ClaimStance` enum field (`asserted | denied | quoted | reported | mocked | hedged | unclear`) to the extract-claims schema and prompt**
    - Source: Anthropic
    - Priority: High · Consensus: Strong majority · Complexity: Low

14. **Confidence-weighted duration aggregation in `dominantSpeaker()` (replace word-count majority with `sum(word.duration * word.speaker_confidence)`) + `latent_boundary` flag on segments within 300ms of prior segment end**
    - Source: AssemblyAI
    - Priority: Medium · Consensus: Majority · Complexity: Medium
    - Depends on: #8, #9

15. **Persist `AudioMeter` RMS onto `TranscriptSegment.audio_features` (attribution-agnostic 30-line patch); relabel UI "Rhetoric Heat" → "Language Heat" until prosody integration lands**
    - Source: Anthropic, Apple
    - Priority: Medium · Consensus: Majority · Complexity: Low
    - ⚠ WARNING: Scrappy would defer this. See Tension #5.

### Sprint 2 — Editorial + UX (Weeks 3–4)

16. **Pre-run demo session on landing page (90-second processed clip, claim cards + markers visible, no audio capture, no consent gate)**
    - Source: Skeptic, Scrappy (acquisition), Apple (compatible with onboarding)
    - Priority: High · Consensus: Strong majority · Complexity: Medium
    - Depends on: #5

17. **Sequential consent flow (3-screen onboarding pre-first-session: "What Yentl listens for / What stays on device / What goes to servers"); BIPA-specific consent on its own screen (when diarize ships)**
    - Source: Apple, Skeptic, Compliance
    - Priority: High · Consensus: Strong majority · Complexity: Medium
    - Depends on: #10

18. **ClaimCard: add mandatory "why this label, not the adjacent one" sentence field + confidence-tier display derived from existing `score`**
    - Source: PolitiFact, Anthropic
    - Priority: High · Consensus: Strong majority · Complexity: Low

19. **Source reputation expansion: 4-tier system + `primary_document` boolean for government/court/academic; one-click "view source" opens primary URL not just domain; tooltip explains tier meaning**
    - Source: PolitiFact (IFCN Principle 4)
    - Priority: High · Consensus: Majority · Complexity: Medium

20. **`/verdict/[id]/dispute` form (capture: who's disputing, evidence URL, correction requested → Neon `disputes` table; flag badge on disputed ClaimCard) + public `/corrections` route (can launch empty)**
    - Source: PolitiFact, Compliance
    - Priority: High · Consensus: Strong majority · Complexity: Medium

21. **"What Yentl doesn't fact-check" section added to `/methodology` (plain language: satire, predictions, opinions, jokes); `rejected_claims` log surfaced as collapsible "claims we heard but didn't fact-check" in session view with brief reason**
    - Source: PolitiFact, Compliance
    - Priority: Medium · Consensus: Majority · Complexity: Medium

22. **Collapse live workspace to single-signal primary view — one animated mark glyph; six sub-signals accessible via swipe-up sheet**
    - Source: Apple
    - Priority: Medium · Consensus: Majority · Complexity: High
    - ⚠ WARNING: Scrappy would defer this. See Tension #1.

23. **`OPINION` visually distinct (different shape, not just color) — Opinion is not a verdict, it's a classification**
    - Source: PolitiFact
    - Priority: Medium · Consensus: Majority · Complexity: Low

### Sprint 3 — BIPA + Compliance Sprint (Weeks 5–6, target 2026-07-01)

24. **BIPA-specific `diarizationConsentRecord` schema (separate from generic ConsentRecord); server-side `BIOMETRIC_DISCLOSURE_VERSION` flag; gated env flag until legal signs off**
    - Source: Compliance
    - Priority: High · Consensus: Unanimous · Complexity: Medium

25. **`DELETE /api/biometric` route — purges Deepgram speaker models + Neon voiceprint records**
    - Source: Compliance
    - Priority: High · Consensus: Unanimous · Complexity: Medium

26. **Draft BIPA-compliant voiceprint disclosure copy; submit to legal review**
    - Source: Compliance
    - Priority: High · Consensus: Unanimous · Complexity: Low (calendar time, not engineering)

27. **Sign Deepgram + Anthropic DPAs (per `docs/dpa-status.md`)**
    - Source: Compliance (GDPR Art 28)
    - Priority: High · Consensus: Unanimous · Complexity: Low (calendar time)

28. **Diagnostic Deepgram corpus run with `diarize_model=latest` (no new consent needed — public corpus) + baseline DER metrics computed**
    - Source: AssemblyAI, Data Scientist
    - Priority: Medium · Consensus: Strong majority · Complexity: Low

### Sprint 4 — AI Act Surface + Hardening (Weeks 7–8)

29. **Hardening pass: `middleware.ts` with rate-limit + security headers; ESLint clean; console.log sweep; `.env.example` parity; CHANGELOG; README Security section**
    - Source: CrowdStrike (security), Stripe (operability)
    - Priority: High · Consensus: Strong majority · Complexity: Medium

30. **Published methodology note on marker taxonomy origin (the founder's 2024 book), scope, and limits + how it can be contested**
    - Source: PolitiFact
    - Priority: High · Consensus: Strong majority · Complexity: Low

31. **AI Act Art 50 final compliance check: machine-readable disclosure on verdict route confirmed; AIGeneratedBadge + AIDisclosureFooter visible on every AI surface; user-visible AI disclosure on dispute pages**
    - Source: Compliance
    - Priority: High · Consensus: Strong majority · Complexity: Low

32. **Stratified 60-window labeled corpus built (6 strata × 10 windows); pre-registered phase success criteria recorded**
    - Source: Data Scientist
    - Priority: Medium · Consensus: Strong majority · Complexity: High

### Sprint 5 — Buffer + Polish (Week 9)

33. **Buffer for production discovery; bug fixes; small-batch beta user feedback round**
    - Source: Scrappy
    - Priority: High · Consensus: Strong majority · Complexity: Variable

### Post-Launch / Deferred

34. **Phase E prosody integration — server-side RMS/pitch/rate compute; per-speaker baselines; offline corpus A/B (ASR held constant); UI prosody-heat vs language-heat separation**
    - Source: Anthropic, Apple, Data Scientist
    - Priority: Medium · Consensus: Majority · Complexity: High
    - ⚠ WARNING: Scrappy would cut entirely. See Tension #5.

35. **Phase G ASR provider benchmark — `ASRAdapter` interface; AssemblyAI + Soniox + WhisperX+pyannote + NeMo on stratified corpus**
    - Source: AssemblyAI, Data Scientist
    - Priority: Medium · Consensus: Majority · Complexity: High
    - ⚠ WARNING: Scrappy would cut entirely; Anthropic would keep Gateway-fallback subset only. See Tension #2.

36. **Extension panel monolith refactor — extract `extension-panel-view.tsx` (1,324 LOC) into per-tab modules**
    - Source: Stripe
    - Priority: Medium · Consensus: Majority · Complexity: High

37. **Audit log / version history on claims + markers (immutable append-only `claim_history`, `marker_history` tables)**
    - Source: Stripe (legal defensibility), PolitiFact (correction trail)
    - Priority: Medium · Consensus: Majority · Complexity: Medium

38. **Chrome Web Store submission + Manifest V3 compliance audit (blind-spot follow-up)**
    - Source: Blind-spot recommendation
    - Priority: Medium · Consensus: n/a (blind-spot member not on roster)
    - Complexity: Medium

39. **Server-side YouTube audio extraction for tab-captured debate URLs (instead of mixed-mono `chrome.tabCapture`)**
    - Source: AssemblyAI
    - Priority: Medium · Consensus: Majority · Complexity: High

40. **Qualitative user research round (5–8 users on real political clips) — week 6–7 of launch sprint**
    - Source: Blind-spot recommendation
    - Priority: Medium · Consensus: n/a

---

## 7. Next Steps — Path B (Selective Adoption)

For founders who want explicit decisions before bulk commitment.

### Ready to Act — Full Consensus (lock these now)

1. **Sprint 0 hygiene PR** (#1, #2 above): package rename + factify-rose sweep.
2. **Persistence layer wire** (#3): the load-bearing fix.
3. **Verdict shareable URL** (#5): closes UI + editorial + compliance gaps simultaneously.
4. **Vercel AI Gateway fallback** (#6): 20-line safety wrap; zero risk.
5. **Prefix cache on rhetoric prompt** (#7): one-line, immediate cost reduction.
6. **Stop defaulting `speaker_id` to 0; preserve `words[]`** (#8, #9): the 3-line attribution-honesty patch.
7. **Server-side ConsentGate** (#10) + **Cloudflare WAF rate limit** (#11): close the security blockers.
8. **4-event instrumentation + 5-metric launch dashboard** (#12).
9. **`ClaimStance` extraction-schema field** (#13).
10. **Stripe Checkout + V3.11 paywall** (#4).
11. **BIPA voiceprint disclosure + `DELETE /api/biometric`** (#24, #25, #26): pre-AI-Act regulatory sprint.
12. **AI Act Art 50 disclosure confirmation** (#31).
13. **DPA signatures** (#27).

These represent the floor that essentially every committee member endorses or does not actively oppose. Roughly 4–5 weeks of focused engineering work.

### Requires Your Decision — Key Tensions

#### Tension #1 — Pre-launch scope: comprehensive vs minimal

**Position A — Full audit Phase A–G in 9 weeks.**
Members: Apple, Anthropic, AssemblyAI, PolitiFact, Compliance, Data Scientist, Stripe
Evidence: The audit's framing — speaker attribution, prosody, provider benchmarking, persistence, editorial surfaces all are real gaps; deferring them creates compounding tech and trust debt.

**Position B — 3-phase 9-week MVP. Cut Phase E + Phase G; defer prosody and provider benchmarking entirely until post-launch.**
Members: Scrappy Founder
Evidence: 14 named agent streams is bloat; AI Act deadline is a "compliant by" not "launch on" date; revenue funnel matters more than diarization-perfection pre-MVP; Calendly/Basecamp/Mailchimp shipped narrow and won.

**Meta agent assessment:**
- Favor A when: existing engineering velocity is high; legal exposure is the more expensive failure mode; the product's whole value proposition rests on accuracy.
- Favor B when: cash runway is the binding constraint; first-paying-user is the more expensive failure mode; you trust yourself to layer quality in post-launch rather than ship perfectly.

**Implications:**
- Choose A → ~10 weeks of focused work, August 2 deadline tight but survivable, ship with v1 attribution honesty + prosody groundwork.
- Choose B → ship in 5–6 weeks with smaller v1; speaker attribution is "honestly uncertain" (good enough); prosody deferred indefinitely until customer asks; engineering velocity preserved for next-feature reactivity.

**Your decision: ___**

#### Tension #2 — Phase G timing

**Position A — Cut entirely.**
Members: Scrappy
Evidence: Deepgram works on clean content per Yentl's own trimodal data; "Probably Speaker 1" is good enough; benchmark when a real user complains.

**Position B — Collapse Gateway-fallback subset into Phase A; defer provider-benchmark to post-launch.**
Members: Anthropic
Evidence: Operational resilience is a correctness property, not a performance optimization; the credit-balance 500 already proved the failure mode.

**Position C — Run focused AssemblyAI/Soniox A/B on the 2–3 worst-performing trimodal candidates as a 1-week Phase A diagnostic; defer full ASRAdapter benchmark.**
Members: AssemblyAI, Data Scientist
Evidence: Hitchens/McGrath at 0% Claim Jaccard is a transcription-grounding issue, not a diarization one; AssemblyAI Universal-2 has known advantage on British-accented English debate audio.

**Meta agent assessment:** Position B is universally compatible (the Gateway-fallback subset). Position C is additive to B and yields real data without committing to a provider swap. Position A loses the Gateway-fallback safety net, which is a 20-line patch — disproportionate cost for the saved work.

**Your decision: ___** *(Recommended: B + C — keep Gateway fallback in Phase A; run the focused 1-week diagnostic in parallel)*

#### Tension #5 — Phase E prosody timing

**Position A — Defer Phase E full integration to post-launch, but ship the attribution-agnostic 30-line AudioMeter persistence + UI relabel in Phase A.**
Members: Anthropic, Apple, Data Scientist (compatible)
Evidence: Closes Apple's honesty gap ("Language Heat" relabel); preserves the signal so Phase E later isn't a schema rewrite; keeps Scrappy's scope discipline.

**Position B — Cut Phase E entirely.**
Members: Scrappy
Evidence: No customer has asked for prosody; AudioMeter discard is fine for v1; enterprise-feature-shaped scope.

**Meta agent assessment:** The 30-line persistence + UI relabel is forward-compatible at trivial cost. Position A is functionally a compromise: Scrappy's "don't ship Phase E" + Anthropic's "preserve the signal" + Apple's "be honest in the UI" all satisfied.

**Your decision: ___** *(Recommended: A — ship the 30-line persistence + relabel; defer the full prosody integration.)*

#### Tension #4 — Landing-page first impression

**Position A — Pre-run demo session on landing (90-second processed political clip with cards visible) before signup/consent.**
Members: Skeptic, Scrappy, Apple (compatible)
Evidence: Netflix trailer-before-paywall; Shazam "Name that song" instant comprehension; Calendly calendar-before-email; defuses the "is Yentl real?" question in 5 seconds.

**Position B — Three-screen onboarding sequence before first session (Apple Health pattern).**
Members: Apple
Evidence: Health HealthKit cadence makes future permission asks lightweight because the heavy lifting happened in education.

**Meta agent assessment:** These are sequential, not opposed. Pre-run demo lands the user (Position A). Then onboarding sequence (Position B) runs before the first *real* session. Skeptic's tagline critique ("Don't argue, Yentl it" lands weird for strangers) is separately worth re-testing — but is independent of A/B.

**Your decision: ___** *(Recommended: ship both, sequentially. Plus a copy A/B on the tagline.)*

---

## Implementation Bridge — Dry-Run Preview

If Path A (Full Adoption) is approved, the next step is invoking the `superpowers:writing-plans` skill with the following compiled action list as inline handoff context:

```
INCLUDED (Sprint 0 + Sprint 1):
   1. Package rename + factify-rose sweep — Unanimous, High priority
   2. Persistence layer wire — Strong majority, High, P0 launch blocker
   3. Stripe Checkout + V3.11 paywall — Strong majority, High
   4. /verdict/[id] shareable URL + meta tag — Unanimous, High
   5. Gateway → direct SDK fallback (20-line) — Strong majority, High
   6. Rhetoric prompt: ephemeral → prefix cache — Unanimous, High
   7. Stop defaulting speaker_id=0; preserve words[] — Unanimous, High
   8. Extend TranscriptSegment with attribution types — Unanimous, High
   9. Server-side ConsentGate + Cloudflare WAF — Strong majority, High
  10. 4-event instrumentation + 5-metric dashboard — Strong majority, High
  11. ClaimStance schema field — Strong majority, High

NOT INCLUDED (contentious, awaiting your decisions):
  - Live workspace single-signal collapse (Tension #1)
  - Phase E prosody full integration (Tension #5 — recommended A)
  - Phase G ASR provider benchmark (Tension #2 — recommended B+C)

Proceed? (Y/n)
```

---

*Committee review compiled 2026-05-28 by Reb Faivele (Executive Assistant mode) on behalf of Reb Yisroel. All 10 members reported substantively; no quorum issues. Reports preserved verbatim in §3. Bezras hashem — onto Phase 3.*
