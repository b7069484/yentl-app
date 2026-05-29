import { describe, it, expectTypeOf } from "vitest";
import type {
  TranscriptSegment,
  ASRWord,
  SpeakerDistribution,
  AttributionStatus,
  AttributionReason,
  OverlapClass,
  AudioFeatures,
  SourceAudioKind,
  ClaimStance,
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
      source_audio_kind: "browser_tab",
    };
    expectTypeOf(seg.overlap_class).toEqualTypeOf<OverlapClass | undefined>();
    expectTypeOf(seg.source_audio_kind).toEqualTypeOf<SourceAudioKind | undefined>();
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

  it("ClaimStance type is exported and has expected shape", () => {
    expectTypeOf<ClaimStance>().toEqualTypeOf<
      | "asserted"
      | "denied"
      | "quoted"
      | "reported"
      | "mocked"
      | "questioned"
      | "corrected"
      | "hedged"
      | "unclear"
    >();
  });

  it("SpeakerDistribution type is exported", () => {
    const dist: SpeakerDistribution = {
      speaker_id: 0,
      word_count: 5,
      duration: 1.2,
      mean_confidence: 0.88,
    };
    expectTypeOf(dist).toEqualTypeOf<SpeakerDistribution>();
  });

  it("AttributionReason type is exported", () => {
    // Verify a value typed as AttributionReason is assignable to AttributionReason
    const reason: AttributionReason = "single_speaker_high_confidence";
    expectTypeOf(reason).toMatchTypeOf<AttributionReason>();
  });
});
