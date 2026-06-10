import { describe, expect, it } from "vitest";
import {
  formatRhetoricTranscriptLine,
  markerAttributionForSpan,
  rhetoricTranscriptWindowForSegments,
} from "@/lib/client/orchestrator";
import { MarkerSchema, SYSTEM_PREFIX } from "@/lib/prompts/analyze-rhetoric";
import type { TranscriptSegment } from "@/lib/types";

function segment(overrides: Partial<TranscriptSegment> = {}): TranscriptSegment {
  return {
    id: "seg-1",
    text: "The budget claim is repeated with loaded framing.",
    start: 10,
    end: 14,
    is_final: true,
    speaker_id: 1,
    attribution_status: "confident",
    attribution_reasons: ["single_speaker_high_confidence"],
    overlap_class: "none",
    turn_id: "turn-1",
    ...overrides,
  };
}

describe("rhetoric marker attribution context", () => {
  it("threads segment attribution metadata into rhetoric transcript lines", () => {
    const line = formatRhetoricTranscriptLine(segment());

    expect(line).toContain("[10s]");
    expect(line).toContain("speaker=Speaker 1");
    expect(line).toContain("attribution=confident");
    expect(line).toContain("overlap=none");
    expect(line).toContain("turn=turn-1");
    expect(line).toContain("segment=seg-1");
    expect(line).toContain(":: The budget claim is repeated");
  });

  it("keeps the rhetoric window to recent segments while preserving metadata", () => {
    const win = rhetoricTranscriptWindowForSegments([
      segment({ id: "old", start: 0, end: 1, text: "old line" }),
      segment({ id: "recent", start: 80, end: 82, text: "recent line" }),
    ], 90);

    expect(win).not.toContain("old line");
    expect(win).toContain("segment=recent");
    expect(win).toContain("recent line");
  });

  it("derives unsafe marker attribution from overlapping transcript evidence", () => {
    const attribution = markerAttributionForSpan(
      { start_time: 12, end_time: 16 },
      [
        segment({
          id: "seg-a",
          start: 11,
          end: 15,
          turn_id: "turn-a",
          speaker_id: 1,
          attribution_status: "unsafe_overlap",
          attribution_reasons: ["parallel_claim"],
          overlap_class: "parallel_claim",
        }),
        segment({
          id: "seg-b",
          start: 13,
          end: 17,
          turn_id: "turn-b",
          speaker_id: 2,
          attribution_status: "unsafe_overlap",
          attribution_reasons: ["parallel_claim"],
          overlap_class: "parallel_claim",
        }),
      ],
    );

    expect(attribution).toEqual({
      attribution_status: "unsafe_overlap",
      attribution_reasons: ["parallel_claim"],
      overlap_class: "parallel_claim",
      source_turn_ids: ["turn-a", "turn-b"],
      source_segment_ids: ["seg-a", "seg-b"],
    });
  });

  it("does not let model attribution upgrade unsafe transcript spans", () => {
    const attribution = markerAttributionForSpan(
      { start_time: 12, end_time: 16 },
      [
        segment({
          id: "seg-a",
          start: 11,
          end: 15,
          turn_id: "turn-a",
          speaker_id: 1,
          attribution_status: "unsafe_overlap",
          attribution_reasons: ["parallel_claim"],
          overlap_class: "parallel_claim",
        }),
        segment({
          id: "seg-b",
          start: 13,
          end: 17,
          turn_id: "turn-b",
          speaker_id: 2,
          attribution_status: "unsafe_overlap",
          attribution_reasons: ["parallel_claim"],
          overlap_class: "parallel_claim",
        }),
      ],
      {
        attribution_status: "confident",
        attribution_reasons: ["single_speaker_high_confidence"],
        overlap_class: "none",
        source_turn_ids: ["invented-turn"],
        source_segment_ids: ["invented-segment"],
      },
    );

    expect(attribution).toEqual({
      attribution_status: "unsafe_overlap",
      attribution_reasons: ["parallel_claim"],
      overlap_class: "parallel_claim",
      source_turn_ids: ["turn-a", "turn-b"],
      source_segment_ids: ["seg-a", "seg-b"],
    });
  });

  it("keeps model attribution only when it is at least as conservative as transcript evidence", () => {
    const attribution = markerAttributionForSpan(
      { start_time: 10, end_time: 14 },
      [segment({ id: "seg-a", turn_id: "turn-a", attribution_status: "confident" })],
      {
        attribution_status: "uncertain",
        attribution_reasons: ["dominant_speaker_low_margin"],
        source_turn_ids: ["turn-a"],
        source_segment_ids: ["seg-a"],
      },
    );

    expect(attribution).toEqual({
      attribution_status: "uncertain",
      attribution_reasons: ["dominant_speaker_low_margin"],
      overlap_class: "none",
      source_turn_ids: ["turn-a"],
      source_segment_ids: ["seg-a"],
    });
  });

  it("preserves model-provided marker attribution ids when the schema accepts them", () => {
    const parsed = MarkerSchema.parse({
      type: "rhetoric",
      name: "loaded_language",
      display: "Loaded language",
      excerpt: "everything collapses",
      start_time: 12,
      end_time: 16,
      severity: "clear",
      explanation: "The phrase intensifies the threat framing.",
      attribution_status: "uncertain",
      attribution_reasons: ["dominant_speaker_low_margin"],
      overlap_class: "competitive_interruption",
      source_turn_ids: ["turn-a"],
      source_segment_ids: ["seg-a"],
    });

    expect(parsed.attribution_status).toBe("uncertain");
    expect(parsed.source_turn_ids).toEqual(["turn-a"]);
    expect(SYSTEM_PREFIX).toContain("Copy only turn/segment ids");
  });
});
