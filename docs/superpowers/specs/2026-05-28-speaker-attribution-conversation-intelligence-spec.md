# Yentl speaker attribution and conversation intelligence spec

Date: 2026-05-28
Status: Draft for implementation planning
Workspace: `/Users/israelbitton/Live FactCheck`
Companion plan: `docs/superpowers/plans/2026-05-28-speaker-attribution-conversation-intelligence-plan.md`

## Purpose

Yentl cannot produce clean fact-checks or rhetoric markers unless it can tell who endorsed which words. The current transcription layer is accurate enough on many clean English samples, but the product still loses the speaker and conversation evidence needed for contested, multi-speaker, clipped, quoted, and overlapping speech.

This spec defines the next architecture for speaker attribution, overlap handling, and claim ownership. It is intentionally narrower than "solve all conversation understanding." The first goal is to prevent confident wrong attribution and create a measurable path to better attribution.

## Product principle

Yentl must never treat uncertain speaker attribution as certain product truth.

If a claim, quote, interruption, or marker cannot be safely assigned, the system should say `speaker uncertain`, explain why, and avoid attaching a fact-check or rhetoric marker to the wrong person. A useful uncertain result is better than a polished false result.

## Current system truth

Production batch transcription currently uses Deepgram Nova-3 with speaker segmentation disabled. `lib/server/deepgram-batch.ts` sets `diarize: false` and maps missing utterance speakers to speaker `0`.

Live streaming also disables diarization in `lib/client/deepgram-stream.ts` with `diarize=false`. The live path can compute a dominant speaker only if word speaker tags exist, but they normally do not.

The core `TranscriptSegment` type stores only text, start, end, final status, and one nullable `speaker_id`. It does not preserve word timestamps, word confidence, speaker confidence, speaker distribution, overlap state, source channel, or attribution safety.

Downstream claim extraction inherits `segment.speaker_id` wholesale. Rhetoric analysis receives a timestamped transcript window without speaker/floor-state information. Manual reassignment and segment splitting exist, but they are correction tools, not an automatic attribution system.

The corpora are richer than production. `scripts/test-corpus/ingest-all.ts` used Deepgram with `diarize=true`, `utterances=true`, and `paragraphs=true`, so corpus artifacts contain more speaker evidence than the live product currently keeps.

## Evidence from local studies

Corpus 1 has 100 videos and 20.8 hours of transcript evidence, with 17 caption-backed WER scores and median WER around 8.94 percent. That supports the basic ASR choice for clean-ish English, but the hardest cable-news overlap rows have weak manual scoring coverage.

Corpus 2 is the correct failure-mode corpus. It targets chaotic conversation mechanics, quoting and irony, identity boundaries, historical memory, science uncertainty, legal/institutional speech, misinformation gradients, rhetoric, cross-cultural register, and platform-native clipped discourse. Phase B replay and human sidecars are still the missing proof layer.

Prior local findings show Deepgram performs well on clean two-speaker interviews but can over-split monologues with clips, e.g. one dominant speaker plus many clip/cameo speakers. Other reports already identify the data-model gap: word timings, word confidence, speaker confidence, speaker distribution, crosstalk warnings, and unsafe-attribution states are discarded too early.

## External research and provider facts

Deepgram's current docs recommend `diarize_model=latest` for batch diarization and note that pre-recorded output can include per-word `speaker` and `speaker_confidence`; streaming still uses `diarize=true` and returns speaker without speaker confidence:
https://developers.deepgram.com/docs/diarization/

AssemblyAI streaming exposes turn-level `speaker_label` plus word-level speaker labels, with accuracy improving as embedding context accumulates:
https://www.assemblyai.com/docs/streaming/label-speakers-and-separate-channels

Soniox explicitly warns that real-time diarization has higher speaker attribution errors than async diarization because async has full-audio context:
https://soniox.com/docs/stt/concepts/speaker-diarization

pyannote.audio provides open-source speaker diarization building blocks including speech activity detection, speaker change detection, overlapped speech detection, and speaker embeddings:
https://github.com/pyannote/pyannote-audio

NVIDIA NeMo provides both end-to-end diarization through Sortformer and cascaded diarization with VAD, speaker embeddings, clustering, and MSDD:
https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/asr/speaker_diarization/models.html

EEND and TS-VAD are important because ordinary clustering-based diarization struggles with overlap. EEND models diarization directly and TS-VAD predicts each target speaker's activity per frame:
https://arxiv.org/abs/1909.06247
https://arxiv.org/abs/2005.07272

DIHARD's diarization scoring frames the right evaluation category: speaker-attributed time is its own task, measured against human reference segmentation:
https://dihardchallenge.github.io/dihard1/overview.html

## Target architecture

The upgrade should be layered. No single provider flag or LLM prompt is enough.

1. ASR evidence capture
2. ASR normalization
3. Turn and overlap builder
4. Speaker-attribution safety model
5. Claim ownership and stance model
6. Marker attribution model
7. UI uncertainty and correction layer
8. Evaluation and provider benchmark loop

## Data model

New and extended types should be additive where possible. Stored sessions should remain readable; old sessions can default new fields to `unknown` or `not_available`.

```ts
export type ASRProvider =
  | "deepgram"
  | "assemblyai"
  | "soniox"
  | "whisperx_pyannote"
  | "nemo"
  | "unknown";

export type ASRWord = {
  word: string;
  start: number;
  end: number;
  confidence: number | null;
  speaker_id: SpeakerId | null;
  speaker_confidence: number | null;
  provider_word_id?: string;
};

export type AttributionStatus =
  | "confident"
  | "probable"
  | "uncertain"
  | "unsafe_overlap"
  | "quote_or_clip"
  | "manual_corrected"
  | "not_available";

export type AttributionReason =
  | "single_speaker_high_confidence"
  | "dominant_speaker_low_margin"
  | "speaker_change_mid_segment"
  | "short_backchannel"
  | "competitive_interruption"
  | "parallel_claim"
  | "crowd_or_bleed"
  | "quoted_or_reported_speech"
  | "provider_missing_speaker"
  | "manual_user_action";

export type SpeakerDistribution = {
  speaker_id: SpeakerId | null;
  word_count: number;
  duration: number;
  mean_confidence: number | null;
};

export type OverlapClass =
  | "none"
  | "backchannel_continuer"
  | "collaborative_completion"
  | "competitive_interruption"
  | "repair_initiation"
  | "parallel_claim"
  | "crowd_or_bleed"
  | "unknown_overlap";

export type ConversationTurn = {
  id: string;
  start: number;
  end: number;
  speaker_id: SpeakerId | null;
  attribution_status: AttributionStatus;
  attribution_reasons: AttributionReason[];
  overlap_class: OverlapClass;
  segment_ids: string[];
  word_range: { start_index: number; end_index: number } | null;
};

export type ClaimStance =
  | "asserted"
  | "denied"
  | "quoted"
  | "reported"
  | "mocked"
  | "questioned"
  | "corrected"
  | "hedged"
  | "unclear";

export type ClaimOwnership = {
  owner_speaker_id: SpeakerId | null;
  attribution_status: AttributionStatus;
  attribution_reasons: AttributionReason[];
  stance: ClaimStance;
  confidence: number;
  source_turn_ids: string[];
  source_segment_ids: string[];
};
```

`TranscriptSegment` should gain:

- `id`
- `provider`
- `words`
- `speaker_distribution`
- `attribution_status`
- `attribution_reasons`
- `overlap_class`
- `turn_id`
- `source_audio_kind`: `mic`, `browser_tab`, `youtube_caption`, `uploaded_media`, `media_url`, `text_import`, `corpus_fixture`, `unknown`

`ClaimCard` should gain `ownership: ClaimOwnership`.

`RhetoricMarker` should gain attribution status, attribution reasons, overlap class, and source turn ids.

## Attribution semantics

Speaker ID answers "whose voice does the ASR provider think this is?"

Claim ownership answers "who is responsible for the proposition Yentl is fact-checking?"

Those are not always the same. A speaker can quote, mock, read, report, deny, or correct another person's words. Yentl must model stance before attaching the fact-check to a participant.

The first implementation should support these safe behaviors:

- Clean single-speaker segment: attach with `confident`.
- Clean two-speaker turn: attach to the speaker with high word and duration majority.
- Short "yeah", "right", "mm-hm" during another person's long turn: classify as `backchannel_continuer`, normally no claim owner.
- Interrupted fragment: preserve text but mark claim ownership `uncertain` unless the proposition is complete and speaker evidence is strong.
- Two substantive speakers at once: classify as `parallel_claim`, do not attach a claim to either speaker without stronger evidence.
- Clip, quoted media, audience chant, crowd bleed, or inserted source: mark `quote_or_clip` or `crowd_or_bleed`, and avoid treating it as the host's endorsed claim without explicit context.
- Reported/quoted harmful or false words: use stance `quoted` or `reported`, not `asserted`.

## Evaluation requirements

No production claim of "robust speaker attribution" is allowed until hard windows are hand-labeled and scored.

Minimum hard-window pack:

- `cable_008`
- `political_010`
- `israel_010`
- `holocaust_010`
- `solo_001`
- `solo_003`
- `c2_mech_01`
- `c2_mech_05`
- `c2_quote_02`
- `c2_quote_09`
- `c2_ident_10`
- `c2_rhet_03`
- `c2_platform_03`
- two clean 1-on-1 interview controls
- two clean solo controls

Each labeled window should include:

- audio start/end
- transcript words
- word-level speaker owner where audible
- speaker turns
- overlap intervals
- overlap class
- claim candidates
- claim owner
- claim stance
- quote/refutation boundaries
- unsafe attribution spans
- expected marker owner, if any

Required metrics:

- WER on hard windows
- DER or equivalent speaker-time error
- speaker attribution purity
- claim-owner accuracy
- unsafe-attribution recall
- quote-vs-endorsement error rate
- marker-owner accuracy
- backchannel false-claim rate
- interruption inversion count
- p50/p95 first interim and first final latency for live paths
- cost per audio minute and per analyzed session

Initial gates:

- Speaker attribution purity >= 80 percent on hard windows.
- Claim-owner accuracy >= 90 percent on hard windows.
- Unsafe-attribution recall >= 95 percent.
- Quote-vs-endorsement critical errors = 0 on the required quotation subset.
- No heavy-overlap row can pass solely because multiple speakers were detected.

## Provider strategy

Short-term production path:

- Keep diarization off by default unless the consent and legal gate allows it.
- For approved batch/corpus evaluation, use Deepgram `diarize_model=latest`.
- Preserve word-level evidence even when the product does not yet expose it.
- Stop defaulting unknown speakers to speaker `0`.

Medium-term provider benchmark:

- Create an `ASRAdapter` interface and benchmark identical windows across Deepgram batch, Deepgram streaming, AssemblyAI, Soniox, WhisperX plus pyannote, and NeMo.
- Compare by claim-owner accuracy and unsafe-attribution recall, not just WER.
- Keep provider output normalized into the same `ASRWord`, `ConversationTurn`, and `ClaimOwnership` schema.

Long-term advanced path:

- Evaluate overlap-aware diarization such as EEND-style or TS-VAD-style pipelines for difficult uploaded/offline audio.
- Consider optional speaker enrollment only with explicit consent, deletion, and legal review.
- Prefer true channel separation over diarization when source channels are available.

## Consent and privacy gate

The existing BIPA/voiceprint comments in code must remain respected. Any production diarization that creates or processes biometric voiceprints requires:

- explicit prior user consent
- voiceprint disclosure in plain language
- deletion-on-request flow
- privacy policy and subprocessors update
- legal review before launch
- product copy that does not overclaim accuracy

Internal corpus and research runs must use approved local artifacts and should not quietly change production defaults.

## UI requirements

The transcript and claims UI should surface attribution truth without making the user decode internals.

Required states:

- `Speaker 1` / named speaker when attribution is confident.
- `Probably Speaker 1` when confidence is useful but not definitive.
- `Speaker uncertain` when overlap or low confidence makes attribution unsafe.
- `Clip or quoted audio` when the text appears to be inserted media or reported speech.
- `Overlapping speech` when two substantive voices are active.
- `Manually corrected` after user intervention.

Claims and markers should show their owner and stance:

- `Speaker 2 asserted`
- `Speaker 1 quoted`
- `Audience interruption`
- `Uncertain owner due overlap`

Manual correction should remain available, but corrections should add audit metadata rather than silently rewriting provenance.

## Non-goals

This spec does not require:

- immediate live production diarization without consent
- speaker identity recognition across sessions
- biometric speaker enrollment
- perfect transcription in crosstalk
- video active-speaker detection
- full source separation in v1
- replacing Deepgram before benchmarking

## Risks

The largest technical risk is measuring the wrong thing. WER can look good while claim ownership fails. The implementation must evaluate speaker ownership and stance, not only raw transcript words.

The largest product risk is overconfidence. A wrong named speaker on a sensitive fact-check is worse than no speaker label.

The largest privacy risk is re-enabling diarization without the consent/deletion/legal path that the code comments already require.

## Acceptance

This spec is ready to build when:

- the companion implementation plan is accepted
- the hard-window fixture list is approved
- consent-gated vs internal-only diarization behavior is decided
- the first patch is limited to evidence preservation and evaluation, not broad UI promises

