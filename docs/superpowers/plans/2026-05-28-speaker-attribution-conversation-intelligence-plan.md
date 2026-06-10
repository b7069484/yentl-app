# Speaker attribution and conversation intelligence implementation plan

Date: 2026-05-28
Status: Draft plan
Workspace: `/Users/israelbitton/Live FactCheck`
Spec: `docs/superpowers/specs/2026-05-28-speaker-attribution-conversation-intelligence-spec.md`

## Goal

Upgrade Yentl from single-field speaker labels to measured, uncertainty-aware speaker attribution and claim ownership. The first deliverable is not a flashy UI. It is a trustworthy pipeline that preserves ASR evidence, measures hard cases, and refuses to confidently attach claims to the wrong speaker.

## Execution constraints

- Do not re-enable production diarization until the consent and legal gate is explicitly satisfied.
- Do not claim robust speaker attribution until hard-window metrics pass.
- Keep changes additive where possible so old sessions remain readable.
- Do not tune prompts before preserving the underlying word/speaker evidence.
- Do not judge success by WER alone.
- Prefer small, testable patches over a sweeping rewrite.

## Phase 0 - Baseline and hard-window evaluation pack

Purpose: create the measurement harness before changing product behavior.

Files likely touched:

- `test-corpus/speaker-attribution-windows.csv`
- `test-corpus-2/speaker-attribution-windows.csv`
- `test-corpus/speaker-attribution/README.md`
- `scripts/test-corpus/extract-window-audio.ts`
- `scripts/test-corpus/score-speaker-attribution.ts`
- `scripts/test-corpus/report-speaker-attribution.ts`
- `public/corpus-report/`
- `public/corpus-2-report/`

Tasks:

- [ ] Define the first hard-window manifest with `corpus_id`, `source_id`, `start_s`, `end_s`, `failure_family`, `expected_risk`, and `review_required`.
- [ ] Include at minimum `cable_008`, `political_010`, `israel_010`, `holocaust_010`, `solo_001`, `solo_003`, `c2_mech_01`, `c2_mech_05`, `c2_quote_02`, `c2_quote_09`, `c2_ident_10`, `c2_rhet_03`, `c2_platform_03`, two clean interviews, and two clean solos.
- [ ] Add a human sidecar schema for word speaker, turn owner, overlap class, claim owner, claim stance, quote boundary, and unsafe attribution spans.
- [ ] Build a scorer for WER, DER-style speaker-time error, speaker purity, claim-owner accuracy, unsafe-attribution recall, quote-vs-endorsement critical errors, and marker-owner accuracy.
- [ ] Publish a local report section showing hard-window coverage and scores.

Verification:

- [ ] Run scorer on empty/incomplete labels and confirm it reports missing labels cleanly.
- [ ] Run scorer on at least one hand-labeled smoke window.
- [ ] Confirm the report is browser-openable through the Next public path.

Exit criteria:

- Hard-window manifest exists.
- Sidecar schema exists.
- Scorer can fail clearly when labels are missing.
- The team can see which rows block launch claims.

## Phase 1 - Preserve ASR evidence in the data model

Purpose: stop throwing away the evidence needed for attribution.

Files likely touched:

- `lib/types.ts`
- `lib/server/deepgram-batch.ts`
- `lib/client/deepgram-stream.ts`
- `lib/client/session-store.ts`
- `lib/export-actions.ts`
- relevant transcript/session tests

Tasks:

- [ ] Add `ASRWord`, `SpeakerDistribution`, `AttributionStatus`, `AttributionReason`, `OverlapClass`, `ConversationTurn`, and `ClaimOwnership` types.
- [ ] Extend `TranscriptSegment` with stable `id`, `provider`, `words`, `speaker_distribution`, `attribution_status`, `attribution_reasons`, `overlap_class`, `turn_id`, and `source_audio_kind`.
- [ ] Extend `ClaimCard` with optional `ownership`.
- [ ] Extend `RhetoricMarker` with optional attribution status, reasons, overlap class, and source turn ids.
- [ ] Update Deepgram batch parser to preserve `results.channels[0].alternatives[0].words` and utterance-level word arrays when present.
- [ ] Stop defaulting missing batch speaker labels to `0`; use `null` with `attribution_status: "not_available"`.
- [ ] Update live streaming parser to retain final words with confidence and speaker when available.
- [ ] Update store append/export/import logic with safe defaults for older sessions.

Verification:

- [ ] Typecheck passes.
- [ ] Existing session tests pass.
- [ ] Add unit tests for no-speaker Deepgram batch output: expected speaker is `null`, not `0`.
- [ ] Add fixture test proving word-level confidence and speaker confidence survive parsing.

Exit criteria:

- Every new transcript segment can carry word-level evidence.
- Existing product behavior remains stable when diarization is off.
- Unknown speaker no longer masquerades as Speaker 1.

## Phase 2 - Consent-gated Deepgram diarization for batch and evaluation

Purpose: use richer Deepgram diarization where allowed, without violating the current privacy gate.

Files likely touched:

- `lib/server/deepgram-batch.ts`
- `lib/source-consent.ts`
- `app/api/media-ingest/route.ts`
- `app/api/transcribe-upload/route.ts`
- `scripts/test-corpus/ingest-all.ts`
- `scripts/test-corpus/provider-benchmark.ts`

Tasks:

- [ ] Add a server-side diarization mode: `off`, `internal_eval`, `batch_consented`, `live_consented`.
- [ ] Keep production default as `off`.
- [ ] For internal/corpus batch runs, support Deepgram `diarize_model=latest`.
- [ ] Do not send both `diarize` and `diarize_model`.
- [ ] Keep streaming diarization disabled unless the live consent gate is satisfied.
- [ ] Add request metadata to every diarized run showing why diarization was allowed.
- [ ] Add A/B support for Deepgram `diarize_model=v1`, `v2`, and `latest` on the hard-window pack.

Verification:

- [ ] Unit test option builder for each mode.
- [ ] Unit test that production/default mode does not include diarization params.
- [ ] Corpus smoke run on one approved local fixture with `internal_eval`.
- [ ] Confirm output contains speaker and speaker confidence where Deepgram provides it.

Exit criteria:

- Evaluation can use richer diarization.
- Production remains privacy-safe by default.
- The system records why diarization was permitted.

## Phase 3 - Turn builder and speaker-attribution safety model

Purpose: turn word/utterance evidence into product-safe speaker attribution.

Files likely touched:

- `lib/conversation/turn-builder.ts`
- `lib/conversation/speaker-attribution.ts`
- `lib/conversation/overlap-classifier.ts`
- `lib/conversation/types.ts`
- `lib/client/orchestrator.ts`
- `lib/client/ingest-orchestrator.ts`

Tasks:

- [ ] Build turns from word timings, utterance boundaries, gaps, and speaker changes.
- [ ] Compute speaker distributions per segment and per turn.
- [ ] Detect mid-segment speaker changes and mark low-margin dominant-speaker cases as `probable` or `uncertain`.
- [ ] Detect short backchannels by duration, token list, and overlap with another speaker's longer turn.
- [ ] Detect competitive interruptions and repair initiations with lexical cues plus timing.
- [ ] Detect parallel substantive claims and mark attribution unsafe.
- [ ] Detect crowd/bleed/clip-like spans from many short speaker IDs, low confidence, background bursts, or source-specific metadata.
- [ ] Produce `ConversationTurn` records and write their IDs back to transcript segments.

Verification:

- [ ] Unit tests for clean solo, clean interview, short backchannel, speaker switch mid-segment, competitive interruption, parallel claim, crowd/bleed, and clip cameo.
- [ ] Run hard-window scorer before and after the turn builder.
- [ ] Confirm no future context leak in bulk ingest when analyzing earlier segments.

Exit criteria:

- The app can distinguish transcript display segments from attribution turns.
- Uncertain and unsafe ownership are first-class outcomes.
- Hard-window metrics improve or expose targeted failures.

## Phase 4 - Claim ownership and stance before fact-checking

Purpose: fact-check the proposition owner, not just the emitted text segment.

Files likely touched:

- `lib/client/orchestrator.ts`
- `app/api/extract-claims/route.ts`
- `lib/prompts/extract-claims*`
- `lib/types.ts`
- claim extraction tests

Tasks:

- [ ] Extend extract-claims input with speaker labels, turn IDs, attribution status, overlap class, and source context.
- [ ] Extend extract-claims output with `ownership`: owner speaker, attribution status, reasons, stance, confidence, and source turn IDs.
- [ ] Distinguish `asserted`, `denied`, `quoted`, `reported`, `mocked`, `questioned`, `corrected`, `hedged`, and `unclear`.
- [ ] Prevent short backchannels from becoming claim cards unless they contain a substantive factual assertion.
- [ ] For `parallel_claim` and `unsafe_overlap`, allow transcript display but mark claim ownership uncertain or skip extraction when the proposition cannot be responsibly recovered.
- [ ] Store ownership on claim cards and carry it through provisional and confirmed verification.

Verification:

- [ ] Golden prompt tests for quoted false claims, denial/refutation, interrupted repair, backchannel, and parallel claim.
- [ ] Hard-window claim-owner accuracy report.
- [ ] Regression test that old claim cards without `ownership` still render.

Exit criteria:

- Claim ownership is not a blind copy of segment speaker ID.
- Quoted or reported speech is not treated as endorsement without context.
- Unsafe ownership is visible to downstream verification.

## Phase 5 - Marker attribution and rhetoric floor-state

Purpose: stop rhetoric markers from floating free of speaker/interaction context.

Files likely touched:

- `lib/client/orchestrator.ts`
- `app/api/analyze-rhetoric/route.ts`
- `lib/prompts/analyze-rhetoric*`
- marker tests

Tasks:

- [ ] Include speaker labels, attribution status, overlap class, and turn IDs in `transcript_window`.
- [ ] Extend marker output with owner speaker, attribution status, overlap class, stance effect, and `do_not_overread` flag.
- [ ] Require marker explanations to distinguish persuasion, backchannel, interruption, repair, quote, and crowd/bleed when relevant.
- [ ] Do not assign markers to a speaker when overlapping transcript spans contain conflicting or unsafe owners.
- [ ] Preserve `attributeMarker` only as a fallback, not the primary attribution mechanism.

Verification:

- [ ] Golden tests for competitive interruption, cooperative completion, ordinary persuasion, goad, quote/refutation, and crowd bleed.
- [ ] Hard-window marker-owner accuracy report.

Exit criteria:

- Markers can explain both what was said and how the interaction shaped it.
- The system avoids over-labeling legitimate argumentation caused by missing floor-state.

## Phase 6 - UI truth states and correction audit

Purpose: make attribution confidence legible and correctable.

Files likely touched:

- transcript components
- claim card components
- marker components
- session detail panes
- export/report components
- accessibility tests

Tasks:

- [ ] Add transcript badges for `Speaker`, `Probably Speaker`, `Speaker uncertain`, `Overlapping speech`, `Clip or quoted audio`, and `Manually corrected`.
- [ ] Add claim ownership line: e.g. `Speaker 2 asserted`, `Speaker 1 quoted`, `Uncertain owner due overlap`.
- [ ] Add marker ownership line with attribution status.
- [ ] Add an uncertainty detail tooltip or disclosure with reasons.
- [ ] Add correction audit metadata when a user reassigns or splits a segment.
- [ ] Export attribution status and correction provenance in JSON and report outputs.
- [ ] Ensure screen-reader labels do not flood live transcript users.

Verification:

- [ ] Component tests for every attribution state.
- [ ] Browser screenshot pass on desktop and mobile.
- [ ] Keyboard correction path works.
- [ ] Export contains ownership and correction metadata.

Exit criteria:

- The UI no longer implies false certainty.
- Manual correction is traceable.
- Users can understand why attribution is uncertain.

## Phase 7 - Provider benchmark and second-pass diarization

Purpose: choose upgrades by measured value, not vendor hope.

Files likely touched:

- `lib/asr/adapters/*`
- `scripts/test-corpus/provider-benchmark.ts`
- `test-corpus/provider-benchmarks/`
- report pages

Tasks:

- [ ] Define `ASRAdapter` output as normalized `ASRWord[]`, utterances, provider metadata, and cost.
- [ ] Implement Deepgram batch adapter using `diarize_model=latest`.
- [ ] Implement Deepgram streaming replay adapter where feasible.
- [ ] Add optional adapters or exported-result importers for AssemblyAI and Soniox.
- [ ] Add offline/import path for WhisperX plus pyannote results.
- [ ] Add offline/import path for NeMo diarization results.
- [ ] Run every provider on the same hard-window pack.
- [ ] Report WER, DER-style error, claim-owner accuracy, unsafe-attribution recall, latency, and cost.

Verification:

- [ ] Same audio windows produce comparable normalized output.
- [ ] Report shows provider-by-window and provider-by-failure-family results.
- [ ] No provider can be promoted based on WER alone.

Exit criteria:

- The team can decide whether Deepgram tuning is enough, or whether pyannote/NeMo/provider ensemble is worth integrating.

## Phase 8 - Launch gate and product claims

Purpose: keep public claims truthful.

Tasks:

- [ ] Update methodology, privacy, and limitations copy after the implementation truth is known.
- [ ] Update launch criteria with hard-window metrics.
- [ ] Add regression CI for parser defaults and attribution fixture tests.
- [ ] Decide whether live speaker attribution is allowed, limited, or hidden behind "speaker uncertain" until consent and accuracy gates pass.

Launch gates:

- [ ] Speaker attribution purity >= 80 percent on hard windows.
- [ ] Claim-owner accuracy >= 90 percent on hard windows.
- [ ] Unsafe-attribution recall >= 95 percent.
- [ ] Quote-vs-endorsement critical errors = 0 on the required quotation subset.
- [ ] Crosstalk rows have human sidecars and do not pass on speaker-count alone.
- [ ] Consent/deletion/legal gate complete before production diarization.

Exit criteria:

- Product copy matches actual capability.
- The system has objective proof for any claim it makes about speaker attribution.

## Suggested first patch

Start with Phase 1 only:

- add the additive ASR evidence types
- update the Deepgram parsers to preserve words
- change missing batch speaker from `0` to `null`
- add parser tests

This is the cleanest first move because it improves truthfulness immediately without turning on new biometric processing or changing the UI promise.

