# Yentl Core Audit — Transcription + Analysis Quality

**Date:** 2026-06-19
**Scope:** The core value prop — transcription, speaker attribution, and the analysis chain (claim extraction → rhetoric → verification → synthesis/meta_read → devil's advocate), plus the eval corpus and its actual measured results.
**Method:** Read-only. Every prompt, route, the meta_read sanitizer, the taxonomy, the scorers, and the recorded result artifacts were read in full. Measured numbers below are quoted from on-disk eval output, not inferred.

**Bottom line:** The analysis *prompt + route architecture* is genuinely sophisticated and well-engineered. The transcription layer is solid on clean English. But the owner's "proven robust on VARIOUS MULTI-SPEAKER inputs" claim is **not supported by the shipped product or the recorded evidence** — because (1) speaker diarization is hard-disabled in production, (2) the impressive speaker-attribution numbers were measured against a *different pipeline configuration than ships*, on 16 short windows, and (3) the analysis-quality (Phase B) thresholds in the corpus spec are explicitly aspirational and never measured at scale.

**Core analysis robustness score: 5.5 / 10** (justified at the end).

---

## 1. Transcription

**Engine:** Deepgram `nova-3`, both batch (`lib/server/deepgram-batch.ts`) and live streaming (`lib/client/deepgram-stream.ts`). Token-mint flow for the browser is clean: server mints a 10-min `usage:write` JWT (`lib/server/deepgram.ts`), the long-lived key never leaves the server, refresh/backoff/drain logic in the stream client is careful and abortable.

**Shared batch options (`TRANSCRIBE_OPTIONS`):** `model:"nova-3"`, `punctuate`, `smart_format`, `utterances:true`, `numerals:true`, `language:"en"`, **`diarize:false`**.
**Live `PARAMS`:** same, plus `interim_results:true`, `utterance_end_ms:1000`, **`diarize:false`**.

**Strengths**
- `numerals:true` + `smart_format` is the right call for factual transcripts (vote counts, dates, currency transcribe to digits, reducing claim-verification noise).
- Streaming has real production hardening: token refresh 30 s before expiry, exponential backoff (3 attempts), graceful `CloseStream` drain with 5 s fallback, per-stream counters (a prior module-level-state bug is documented and fixed).
- File-size-aware routing: ≤50 MB buffered, >50 MB streamed to avoid large serverless allocations; 500 MB / 4 h caps enforced; uploaded blobs are deleted after transcription.

**Measured accuracy (real numbers, `test-corpus/report/corpus-report.json` + `logs/score-wer.log`):**
- Corpus 1: **median WER 8.94%, mean 9.82%, p90 20.6%** — but **only 17 of 100 videos were WER-scored** (the 17 with human YouTube captions as ground truth).
- Per category, the *hardest multi-speaker* buckets have **zero WER coverage**: `cable_news_debate` scored=0, `academic_lecture` scored=0. `1on1_interview` p90 reaches 20.6% and `political_debate` median ~19.6%.
- `medianConfidence` 0.962 (word confidence, healthy); `medianSpeakerConfidence` 0.694 (mediocre — but only meaningful for the corpus, which ran diarize ON; see §2).

**Limitations / fragility**
- **English-only, hard-coded** (`language:"en"` in both paths). No language detection, no multilingual. Non-English audio degrades silently.
- Proper-noun errors are documented (`docs/superpowers/findings/2026-05-17-deepgram-batch-findings.md`): "Stephen Sackur" → "Stephen Sack," which then poisons `web_search` queries in confirmed verification.
- WER "≤15% across all 100" is the README's stated pass bar, but it is only demonstrated on the 17 caption-backed clean-ish samples, not the full 100 and not the overlap-heavy categories.

**Verdict:** Transcription is **solid for clean English** and defensible as an ASR choice. It is **not proven** on overlap-heavy or non-English audio.

---

## 2. Diarization / Speaker Attribution + measured accuracy  ← the central gap

**The decisive finding: production does not diarize.**
- `lib/server/deepgram-batch.ts:36` → `diarize: false`. `lib/client/deepgram-stream.ts:118` → `diarize:false`.
- This is a *deliberate, documented* BIPA / biometric-privacy decision (Illinois BIPA, the Otter.ai / Fireflies case wave). Re-enabling is gated on a consent flow + voiceprint deletion + legal review. The spec (`docs/superpowers/specs/2026-05-28-...-spec.md`) states it plainly: *"Production batch transcription currently uses Deepgram Nova-3 with speaker segmentation disabled... maps missing utterance speakers to speaker 0."*
- Consequence in production: every utterance carries `speaker_id` = null (or collapses to 0), `attribution_status:"not_available"`. The live path's `dominantSpeaker()` margin logic and the whole `attribution_status` machinery only fire **if word-level speaker tags exist — which, with diarize off, they normally do not.**

**The eval measured a different pipeline than ships.**
- The corpus transcripts were produced with **`diarize:"true"`** — confirmed at `scripts/test-corpus/ingest-video.ts:21` and `ingest-all.ts:21`. Verified directly: `cable_008.json` (heavy crosstalk) has `speaker` integers {0,1,2} and `speaker_confidence` on all 1,661 words.
- The scorer (`scripts/test-corpus/score-speaker-attribution.ts`) reads `word.speaker` from those diarized corpus JSONs and compares to a hand-picked `expected_provider_speaker_id`. **So the 99.67% number describes diarization the product disables.**

**The recorded speaker-attribution result (`test-corpus/speaker-attribution/report/speaker-attribution-report.json`):**
```
windows: 16   scored: 16   review_required: 5
mean_speaker_purity:        0.9967
mean_claim_owner_accuracy:  1.0
unsafe_attribution_recall:  1.0
quote_vs_endorsement_errors: 0
```
These look near-perfect, but the denominators are tiny and the methodology is weak for a launch claim:
- **16 windows total** (9 listed in corpus-1 manifest + corpus-2), each **30–120 s**, hand/agent-labeled. Reviewer field = `codex-hard-window` (agent-authored sidecars, not independent human ground truth).
- `unsafe_attribution_recall` and `marker_owner_accuracy` are **`null` on nearly every per-window row** — the summary "1.0 / 1.0" aggregates over only the handful of windows that had any unsafe/marker labels at all. The heavy-crosstalk window `cable_008_panel_open` has **markers=0, unsafe_spans=0** — i.e. the hardest case carried no marker/unsafe labels to test against.
- `speaker_purity` is duration-weighted dominant-speaker overlap against a label that *assumes* the diarized provider IDs are present — circular relative to production reality.
- The proof file itself sets `public_claims_review_status: "review_required_before_public_claims"` — the owner's own gate already flags these numbers cannot back public marketing claims.

**Documented diarization failure mode (`findings` doc):** John Oliver solo monologue with news clips → Deepgram returned **9 "speakers"** (1 real + clip cameos). Clean 2-speaker interviews split correctly. So even with diarize ON, over-splitting on clip-laden monologues is real.

**Attribution UI/merge layer** (`utterance-merge.ts`, `attribution-labels.ts`, `speaker-palette.ts`, `SpeakerBadge.tsx`, `reassign-speaker-menu.tsx`): well-built — merge respects speaker boundaries and a 7-state `AttributionStatus` taxonomy, manual reassignment + split tooling exists. But with diarize off, this rich machinery has **no signal to operate on** in production; it is correction tooling waiting for an attribution source that is switched off.

**Verdict:** There is **no measured multi-speaker attribution accuracy for the shipped configuration.** The numbers that exist are for a diarize-on pipeline, on 16 short windows, with the hardest sub-metrics largely unlabeled. The "robust multi-speaker" claim is **unproven and currently architecturally precluded** by the BIPA gate.

---

## 3. Claim Extraction

**File:** `lib/prompts/extract-claims.ts` (10 KB — the most developed prompt). Route: `app/api/extract-claims/route.ts`, model = Opus via `Output.object({schema})` (Zod-enforced).

This is **sophisticated, not keyword-ish:**
- Explicit **stance taxonomy** (9 values: asserted/denied/quoted/reported/mocked/questioned/corrected/hedged/unclear) — directly handles reported speech, sarcasm, and hedges.
- **Reported-speech splitting:** instructs the model to extract the *embedded* factual claim out of an evaluative wrapper ("they tried to tell you he was a leaker, but that was a lie" → extract "he was a leaker" as the checkable proposition). Two clean claims over one tangled hybrid.
- **Entity anchoring** for verifiability: every named person/org must carry its most specific identifier from context (role, affiliation, date) so downstream `web_search` has a disambiguated target. Real example from replay output: *"Donald Trump received over 77,000,000 votes (in the 2024 U.S. presidential election)."*
- **Ownership block** with `attribution_status` floor: if attribution is unsafe/quote/not_available, the model is told to set `owner_speaker_id:null` and low confidence — explicitly refusing to over-attribute.
- Skips opinions / normative / hypothetical / predictions / questions; dedupes against `RECENT_HASHES`.

**Caveat:** the ownership/attribution inputs the prompt is built to consume are mostly empty in production (diarize off), so the *ownership* sophistication is under-exercised live; the *claim/stance/entity* sophistication is fully active.

**Verdict:** Genuinely strong — among the best parts of the system.

---

## 4. Rhetoric / Fallacy Detection

**File:** `lib/prompts/analyze-rhetoric.ts`. Route uses Opus + Zod schema + ephemeral cache hint.

- **Grounded in the real taxonomy:** the system prompt injects `taxonomyHints()` = the full `ALL` list and **forbids names outside it** ("You may ONLY use names from the TAXONOMY below... Match by canonical_id"). `ALL` = **124 entries: 55 from the owner's book** (`book-entries.json`, 23 bias + 32 fallacy, each with definition + example + how_to_spot + archetype) **+ 69 in `extras.ts`**.
- Requires a **verbatim ≤25-word excerpt**, severity by lay-listener detectability (subtle/clear/blatant), 1–3 sentence rationale, and attribution-awareness (don't assign a marker to the wrong speaker when overlap/quote/missing-speaker makes ownership unsafe).
- Replay evidence (`israel_010`, the antisemitism-distinction category) surfaced **"Dog Whistles," "Loaded Language" ×2, "Appeal to Emotion"** tied to real excerpts — qualitatively on-target.

**Gaps:**
- `taxonomyHints()` sends only `canonical_id + display + definition`. The rich `how_to_spot` arrays and `example` field — the book's actual discriminative signal — are **not** in the prompt. The model gets a name + one-line definition, not the detection heuristics.
- **No measured precision/recall.** The corpus rubric targets "≥80% bias/fallacy precision against the book taxonomy" but that is Phase-B-future and unmeasured.

**Verdict:** Properly taxonomy-grounded and not generic, but its accuracy is unquantified and it underuses the book's own detection cues.

---

## 5. Verification + Citation Integrity

**Two-pass design, both Opus:**
- **Provisional** (`verify-provisional.ts`): fast, **explicitly forbids citing sources** ("You CANNOT browse... DO NOT cite specific sources/URLs/studies"), model-memory only, 8-value label enum (TRUE…OPINION) + 0–100 score. Honest about being provisional.
- **Confirmed** (`verify-confirmed.ts` + `route.ts`): gives the model the **Anthropic `web_search` tool** (`maxUses:5`). The model emits only a thin per-URL stance map (`stance_refs`).

**Citation integrity is the strongest single safeguard in the system (`app/api/verify-confirmed/citations.ts`):**
- URLs/titles are **harvested server-side from the `web_search` source content blocks**, NOT from LLM free-text. The merge uses the harvested citation list as the *canonical universe* of sources; the LLM's stance is matched onto a real URL by normalized lookup. **A hallucinated URL the model invents cannot enter the source list** — it has no matching citation block.
- Defensive `scrubUrl()` truncates JSON-bleed corruption in model-emitted URLs; loose-match is deliberately limited to query/hash variants (won't attach `/article-1`'s stance to `/article-10`).
- Sources are post-processed with domain extraction + `reputation_tier` classification (`lib/reputation`). Replay-verified: the Trump-votes claim returned **10 real sources** (livenowfox.com, cookpolitical.com, cfr.org…) with tiers + stances.

**Risks:**
- Provisional verdicts rest entirely on **model memory with a knowledge cutoff** — stale/wrong on recent events. The prompt mitigates by mapping "insufficient backing" → `UNVERIFIABLE` (replay correctly did this for a "today" time-dependent claim), but a confidently-wrong provisional verdict before confirmed runs is possible.
- Confirmed depends on `web_search` quality; the prompt prefers Reuters/AP/.gov/.edu but the model still *judges* stance per source — stance can be wrong even when the URL is real.
- The pinned model slug is `anthropic/claude-opus-4.7` (`lib/server/anthropic.ts`) — one minor version behind current Opus 4.8; worth a refresh but not a defect.

**Verdict:** Architecturally **excellent** — the server-side citation harvesting is exactly the right anti-hallucination design. Verdict *accuracy* is still unmeasured at scale (target "≥90% truth-grade agreement on 200 human-graded claims" is aspirational).

---

## 6. Synthesis + meta_read (is the sanitizer real or cosmetic?)

**Files:** `lib/prompts/synthesize.ts`, `app/api/synthesize/route.ts`, `lib/synthesis-meta-read.ts`.

**The meta_read sanitizer is REAL logic, not cosmetic.** `sanitizeSynthesisMetaRead()` + `buildSynthesisMetaRead()` independently recompute the expected posture/source_health from the actual evidence and **clamp the model down** when it overstates:
- `sanitizePosture()` forces `insufficient` when there are <2 clean owned claims + <2 markers; downgrades `good_faith`/`bad_faith_risk` → `mixed` when evidence doesn't support the extreme.
- `sanitizeSourceHealth()` is monotonic via `SOURCE_HEALTH_RANK` — it can only ever **lower** the model's source-health claim toward the computed expectation, never raise it.
- `isCleanOwnedSynthesisClaim()` excludes null-owner, unresolved-attribution, and non-assertive-stance (quoted/reported/mocked/questioned) claims from "clean" counts — so a quoted claim can't inflate a speaker's factual grade.
- `scope` is force-copied from the request, not trusted from the model. `uncertainty` has a required-cue checker (`missingUncertaintyCues`) that flags when the sentence fails to mention thin sources / uncertain ownership / partial evidence.
- `assessSynthesisMetaReadQuality()` is a genuine scorer (penalty weights per mismatched field) usable as a gate.

**Caveat:** the conservatism keys off `cleanClaims` and per-speaker `faith_grade`s, which themselves depend on attribution metadata that is sparse in production (diarize off). So the *guardrail* is sound; the *inputs* it guards are thin live.

**Verdict:** The anti-overconfidence design is **the most impressive engineering in the codebase** and meaningfully prevents the model from overstating. Backed by `synthesis-metaread-proof.json`.

---

## 7. Devil's Advocate

**File:** `lib/prompts/devil-advocate.ts`. Route uses **Grok** (`xai/grok-4.1-fast-reasoning`, temp 0.2) — a deliberate cross-model choice for an opposing view.
- Strict structured output (stance, exactly-3 counterarguments, weakest_assumption, exactly-2 questions, confidence) parsed defensively (`parseDevilAdvocateText` strips code fences, slices the JSON object).
- Strong anti-hallucination instructions ("Do not invent facts/sources not present in the input"), attribution-aware, told to keep confidence low on thin transcripts.
- **Note:** unlike the Anthropic routes (which use schema-enforced `Output.object`), this relies on Grok returning parseable JSON and a manual parse → slightly higher malformed-output risk, but the try/catch returns a clean 500.

**Verdict:** Sound design; sensible model diversity.

---

## 8. Taxonomy

- **124 entries** total: 55 book (`book-entries.json`) + 69 `extras.ts`. Book entries are **rich**: definition, real antisemitism-contextual example, `how_to_spot` heuristics (4 each), `archetype`, `further_reading`, `related_canonical_ids`, `wikipedia_slug`. 16 archetypes for grouping (`archetypes.ts`).
- Used correctly as a closed vocabulary the model must match by `canonical_id`.
- **Underused:** only `display + definition` reach the analysis prompt; the discriminative `how_to_spot`/`example` content stays UI-side. The taxonomy's depth is a genuine asset that the *detection step* largely leaves on the table.

**Verdict:** Strong, book-grounded asset; partially leveraged.

---

## 9. Eval-corpus adequacy

**What exists (real, non-trivial):**
- **Corpus 1:** 100 curated YouTube videos, 10 categories × 10, **20.8 h**, transcripts for all 100, audio for 98, manual captions for 17. Categories are well-chosen to stress the product (incl. the two owner-critical ones: Israel/Palestine, Holocaust-education-vs-denial).
- **Corpus 2:** a dedicated *failure-mode* corpus (crosstalk, irony/quoting, identity boundaries, historical memory).
- Tooling is real: WER scorer, speaker-attribution scorer, replay harness, ground-truth fetcher, HTML reports.

**Where it falls short of "proven robust":**
- **WER:** scored on **17/100**; the two hardest multi-speaker categories scored **0**.
- **Speaker attribution:** **16 short windows**, agent-labeled, against a diarize-ON pipeline that doesn't ship.
- **Analysis chain (Phase B) replay:** run on **only 3–4 videos × ~10 utterances each** (`*.replay.json`; `analysis-deploy-*-proof.json`). These are end-to-end **smoke tests** ("does the chain run on yentl.it and return non-empty, schema-valid output" — yes, it does) — **not accuracy measurements** against graded claims.
- The corpus README is candid: Phase B ("≥85% claim recall, ≥90% verification agreement, zero antisemitism false-positives, ≥80% rhetoric precision") is labeled **"future, once Tasks 12–21 ship"** with "starting point" thresholds. **None of these four headline quality numbers has a measured value on disk.**

**Verdict:** Good corpus *infrastructure and curation*; **inadequate executed coverage** to support a "proven robust on various multi-speaker inputs" claim.

---

## 10. Fragility / Failure Modes

- **Malformed model JSON:** LOW risk on all Anthropic routes (Zod `Output.object`). MODERATE on devil-advocate (manual Grok parse). All routes wrap in try/catch → clean 4xx/5xx.
- **Empty / tiny transcript:** handled — meta_read forces `insufficient`, devil-advocate keeps confidence low, claim extraction returns `{claims:[]}`.
- **Single-speaker collapse:** this is the *default* live state (diarize off → everything is speaker 0 / null). Not a crash, but it means per-speaker verdicts and ownership are mostly inert in production.
- **Diarization over-split:** documented (9 "speakers" on a clip-laden monologue) — only reachable with diarize on.
- **Very long input:** request byte caps (24–64 KB JSON) + per-utterance windowing protect the routes; live analysis is a sliding window, not full-session, so length is bounded. Synthesis takes `max 12 KB` source_context.
- **Non-English:** silent degradation (`language:"en"` hard-coded).
- **Proper-noun ASR errors → bad web_search queries:** documented, unmitigated.
- **Provisional stale-knowledge:** confident-but-wrong verdict possible before confirmed pass.
- **Rate limiting / consent / engagement gates:** present on every route (good operational hygiene).

---

## Score: Core Analysis Robustness — 5.5 / 10

**Why not lower:** The *engineering* of the analysis chain is genuinely strong — entity-anchored claim extraction with a real stance taxonomy, taxonomy-locked rhetoric detection, a two-pass verifier whose citations are harvested server-side from the search tool (hallucinated URLs can't enter), and a meta_read sanitizer that independently clamps overconfidence. On the handful of replayed samples it produces correct, well-grounded output. Transcription is solid (~9% WER) on clean English. Eval *infrastructure* is real and the corpus curation is thoughtful.

**Why not higher:** The headline claim — "proven robust on various multi-speaker inputs" — is not met. (1) Speaker diarization is **off in production**, so live multi-speaker attribution effectively does not happen; the whole attribution apparatus has no signal to run on. (2) The only strong attribution numbers (99.67% purity) were measured on a **diarize-ON pipeline that doesn't ship**, over **16 short, agent-labeled windows**, with the hardest sub-metrics largely unlabeled. (3) Analysis-quality was replayed on **~3–4 videos** as smoke tests; **none** of the four corpus quality thresholds (claim recall, verification agreement, antisemitism false-positive rate, rhetoric precision) has a measured value. (4) English-only; documented proper-noun and over-split failure modes are unmitigated.

**It is "solid and sophisticated" in design and on clean single-speaker English. It is NOT "proven robust on multi-speaker inputs" — that specific claim is currently unsupported and, for live audio, architecturally precluded by the BIPA gate.**

### Top quality gaps blocking the "proven robust" claim
1. **Diarization is disabled in prod** — the multi-speaker capability being claimed isn't running. Either ship the BIPA-consent gate to turn diarization on, or stop making multi-speaker claims for live audio.
2. **No measured attribution accuracy for the shipped config** — the 99.67% is for a non-shipping pipeline, 16 windows, agent-labeled. Needs human ground truth and the production (diarize-on, post-consent) config.
3. **Phase B analysis quality is unmeasured** — replay on 3–4 videos × 10 utterances is a smoke test, not accuracy. The four README thresholds have no on-disk values.
4. **WER coverage is 17/100; the hardest multi-speaker categories scored 0** — claims of broadcast-quality WER aren't backed where it matters most.
5. **English-only + proper-noun ASR errors** that degrade verification, both unmitigated.
6. **Rhetoric detection underuses the book** — only definitions reach the prompt; `how_to_spot` cues don't.
