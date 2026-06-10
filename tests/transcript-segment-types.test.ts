import { describe, expectTypeOf, it } from "vitest";
import type {
  ASRWord,
  AttributionReason,
  AttributionStatus,
  AudioFeatures,
  ClaimCard,
  ClaimOwnership,
  ClaimStance,
  ConversationTurn,
  DocumentAnchor,
  OverlapClass,
  RhetoricMarker,
  SourceAudioKind,
  SpeakerDistribution,
  TranscriptSegment,
} from "@/lib/types";

describe("TranscriptSegment extended schema (Phase 1a)", () => {
  it("preserves words[] when present", () => {
    const seg: TranscriptSegment = {
      text: "Hello world",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: 0,
      words: [
        { text: "Hello", start: 0, end: 0.5, confidence: 0.95, speaker: 0, speaker_confidence: 0.9 },
      ],
    };

    expectTypeOf(seg.words).toEqualTypeOf<ASRWord[] | undefined>();
  });

  it("allows speaker_id to be null with attribution_status = not_available", () => {
    const seg: TranscriptSegment = {
      text: "Hello",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: null,
      attribution_status: "not_available",
    };

    expectTypeOf(seg.attribution_status).toEqualTypeOf<AttributionStatus | undefined>();
  });

  it("supports overlap_class and source_audio_kind", () => {
    const seg: TranscriptSegment = {
      text: "Yes",
      start: 0,
      end: 0.3,
      is_final: true,
      speaker_id: 1,
      overlap_class: "backchannel_continuer",
      source_audio_kind: "text_import",
    };

    expectTypeOf(seg.overlap_class).toEqualTypeOf<OverlapClass | undefined>();
    expectTypeOf(seg.source_audio_kind).toEqualTypeOf<SourceAudioKind | undefined>();
  });

  it("supports document anchors for imported text review", () => {
    const seg: TranscriptSegment = {
      text: "The claim appears in the second paragraph.",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: 0,
      source_audio_kind: "text_import",
      document_anchor: {
        kind: "paragraph",
        block_index: 1,
        paragraph_index: 1,
        line_start: 4,
        line_end: 5,
      },
    };

    expectTypeOf(seg.document_anchor).toEqualTypeOf<DocumentAnchor | undefined>();
  });

  it("accepts audio_features for prosody persistence", () => {
    const seg: TranscriptSegment = {
      text: "Hello",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: 0,
      audio_features: { rms: 0.42, peak_rms: 0.71 },
    };

    expectTypeOf(seg.audio_features).toEqualTypeOf<AudioFeatures | undefined>();
  });

  it("supports speaker distribution and attribution reasons", () => {
    const seg: TranscriptSegment = {
      text: "We overlap here",
      start: 2,
      end: 4,
      is_final: true,
      speaker_id: 0,
      speaker_distribution: [{ speaker_id: 0, word_count: 3, duration: 1.6, mean_confidence: 0.82 }],
      attribution_reasons: ["dominant_speaker_low_margin"],
    };

    expectTypeOf(seg.speaker_distribution).toEqualTypeOf<SpeakerDistribution[] | undefined>();
    expectTypeOf(seg.attribution_reasons).toEqualTypeOf<AttributionReason[] | undefined>();
  });

  it("allows claim stance on claim cards", () => {
    const claim: ClaimCard = {
      id: "claim-1",
      claim_text: "The program doubled participation.",
      utterance_start: 0,
      utterance_end: 4,
      speaker_id: 0,
      topic: "programs",
      topic_secondary: null,
      primary_label: "UNVERIFIABLE",
      score: 0.5,
      annotations: [],
      explanation: "Needs source review.",
      status: "checking",
      sources: [],
      stance: "hedged",
    };

    expectTypeOf(claim.stance).toEqualTypeOf<ClaimStance | undefined>();
  });

  it("supports conversation turns as attribution records", () => {
    const turn: ConversationTurn = {
      id: "turn-1",
      start: 4,
      end: 9,
      speaker_id: null,
      attribution_status: "unsafe_overlap",
      attribution_reasons: ["parallel_claim"],
      overlap_class: "parallel_claim",
      segment_ids: ["seg-a", "seg-b"],
      word_range: { start_index: 12, end_index: 24 },
    };

    expectTypeOf(turn.attribution_status).toEqualTypeOf<AttributionStatus>();
    expectTypeOf(turn.overlap_class).toEqualTypeOf<OverlapClass>();
  });

  it("supports optional claim ownership without breaking old claim cards", () => {
    const ownership: ClaimOwnership = {
      owner_speaker_id: null,
      attribution_status: "uncertain",
      attribution_reasons: ["quoted_or_reported_speech"],
      stance: "quoted",
      confidence: 0.41,
      source_turn_ids: ["turn-quote"],
      source_segment_ids: ["seg-quote"],
    };

    const claimWithOwnership: ClaimCard = {
      id: "claim-owned",
      claim_text: "The program was cancelled.",
      utterance_start: 2,
      utterance_end: 5,
      speaker_id: null,
      topic: "programs",
      topic_secondary: null,
      primary_label: "UNVERIFIABLE",
      score: 0.5,
      annotations: [],
      explanation: "Ownership is uncertain because the text is quoted.",
      status: "checking",
      sources: [],
      ownership,
    };

    const legacyClaim: ClaimCard = {
      id: "claim-legacy",
      claim_text: "The venue opened in 2020.",
      utterance_start: 0,
      utterance_end: 3,
      speaker_id: 0,
      topic: "venues",
      topic_secondary: null,
      primary_label: "UNVERIFIABLE",
      score: 0.5,
      annotations: [],
      explanation: "Needs source review.",
      status: "checking",
      sources: [],
    };

    expectTypeOf(claimWithOwnership.ownership).toEqualTypeOf<ClaimOwnership | undefined>();
    expectTypeOf(legacyClaim.ownership).toEqualTypeOf<ClaimOwnership | undefined>();
  });

  it("allows claim cards to carry imported document anchors", () => {
    const claim: ClaimCard = {
      id: "claim-anchored",
      claim_text: "The repair was delayed.",
      utterance_start: 0,
      utterance_end: 3,
      speaker_id: 0,
      topic: "infrastructure",
      topic_secondary: null,
      primary_label: "UNVERIFIABLE",
      score: 0.5,
      annotations: [],
      explanation: "Needs source review.",
      status: "checking",
      sources: [],
      document_anchor: {
        kind: "paragraph",
        block_index: 1,
        paragraph_index: 1,
        line_start: 4,
        line_end: 5,
      },
    };

    expectTypeOf(claim.document_anchor).toEqualTypeOf<DocumentAnchor | undefined>();
  });

  it("supports optional rhetoric attribution metadata without breaking old markers", () => {
    const markerWithAttribution: RhetoricMarker = {
      id: "marker-owned",
      type: "rhetoric",
      name: "appeal_to_fear",
      display: "Appeal to fear",
      excerpt: "If this passes, everything collapses.",
      speaker_id: null,
      start_time: 12,
      end_time: 16,
      severity: "clear",
      explanation: "Flagged but owner is unsafe because two speakers overlap.",
      attribution_status: "unsafe_overlap",
      attribution_reasons: ["parallel_claim"],
      overlap_class: "parallel_claim",
      source_turn_ids: ["turn-a", "turn-b"],
      source_segment_ids: ["seg-a", "seg-b"],
    };

    const legacyMarker: RhetoricMarker = {
      id: "marker-legacy",
      type: "bias",
      name: "loaded_language",
      display: "Loaded language",
      excerpt: "A disastrous decision.",
      speaker_id: 0,
      start_time: 20,
      end_time: 22,
      severity: "subtle",
      explanation: "Language is emotionally loaded.",
    };

    expectTypeOf(markerWithAttribution.attribution_status).toEqualTypeOf<AttributionStatus | undefined>();
    expectTypeOf(markerWithAttribution.attribution_reasons).toEqualTypeOf<AttributionReason[] | undefined>();
    expectTypeOf(markerWithAttribution.overlap_class).toEqualTypeOf<OverlapClass | undefined>();
    expectTypeOf(legacyMarker.source_turn_ids).toEqualTypeOf<string[] | undefined>();
  });
});
