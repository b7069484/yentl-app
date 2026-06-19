import { describe, expect, it } from "vitest";
import {
  claimOwnershipForSegment,
  documentAnchorWithClaimQuote,
  transcriptContextLineForPrompt,
} from "@/lib/client/orchestrator";
import type { ClaimOwnership, TranscriptSegment } from "@/lib/types";

function segment(overrides: Partial<TranscriptSegment> = {}): TranscriptSegment {
  return {
    id: "seg-1",
    text: "The city approved the bond.",
    start: 0,
    end: 3,
    is_final: true,
    speaker_id: 1,
    turn_id: "turn-1",
    attribution_status: "confident",
    attribution_reasons: ["single_speaker_high_confidence"],
    overlap_class: "none",
    ...overrides,
  };
}

describe("claimOwnershipForSegment", () => {
  it("uses model ownership when provided", () => {
    const ownership: ClaimOwnership = {
      owner_speaker_id: 2,
      attribution_status: "probable",
      attribution_reasons: ["dominant_speaker_low_margin"],
      stance: "hedged",
      confidence: 0.61,
      source_turn_ids: ["turn-model"],
      source_segment_ids: ["seg-model"],
    };

    expect(claimOwnershipForSegment(segment(), "asserted", ownership)).toEqual(ownership);
  });

  it("falls back to segment attribution for confident ownership", () => {
    const ownership = claimOwnershipForSegment(segment(), "asserted");

    expect(ownership).toEqual({
      owner_speaker_id: 1,
      attribution_status: "confident",
      attribution_reasons: ["single_speaker_high_confidence"],
      stance: "asserted",
      confidence: 0.8,
      source_turn_ids: ["turn-1"],
      source_segment_ids: ["seg-1"],
    });
  });

  it("does not assign an owner for unsafe overlap fallback", () => {
    const ownership = claimOwnershipForSegment(
      segment({
        speaker_id: 1,
        attribution_status: "unsafe_overlap",
        attribution_reasons: ["parallel_claim"],
        overlap_class: "parallel_claim",
      }),
      "asserted",
    );

    expect(ownership.owner_speaker_id).toBeNull();
    expect(ownership.attribution_status).toBe("unsafe_overlap");
    expect(ownership.attribution_reasons).toEqual(["parallel_claim"]);
    expect(ownership.confidence).toBeLessThan(0.3);
  });

  it("clamps invalid model confidence into the 0..1 range", () => {
    const ownership = claimOwnershipForSegment(segment(), "quoted", {
      owner_speaker_id: null,
      attribution_status: "quote_or_clip",
      attribution_reasons: ["quoted_or_reported_speech"],
      stance: "quoted",
      confidence: 2,
      source_turn_ids: [],
      source_segment_ids: [],
    });

    expect(ownership.confidence).toBe(1);
    expect(ownership.source_turn_ids).toEqual(["turn-1"]);
    expect(ownership.source_segment_ids).toEqual(["seg-1"]);
  });
});

describe("transcriptContextLineForPrompt", () => {
  it("keeps speaker, attribution, overlap, turn, and segment metadata in claim context", () => {
    const line = transcriptContextLineForPrompt(segment({
      attribution_status: "unsafe_overlap",
      attribution_reasons: ["parallel_claim"],
      overlap_class: "parallel_claim",
    }));

    expect(line).toContain("[Speaker 1]");
    expect(line).toContain("attribution=unsafe_overlap");
    expect(line).toContain("overlap=parallel_claim");
    expect(line).toContain("turn=turn-1");
    expect(line).toContain("segment=seg-1");
    expect(line).toContain("reasons=parallel_claim");
  });
});

describe("documentAnchorWithClaimQuote", () => {
  it("adds a durable quote range for the best matching sentence inside a segment", () => {
    const text = "The city published the release log on Friday. The audit timeline showed the report was added to the public archive.";
    const quote = "The audit timeline showed the report was added to the public archive.";

    expect(
      documentAnchorWithClaimQuote(
        {
          kind: "paragraph",
          block_index: 0,
          paragraph_index: 0,
          char_start: 12,
          char_end: 12 + text.length,
          quote_text: text,
        },
        text,
        "The audit timeline showed the report was public.",
      ),
    ).toMatchObject({
      kind: "paragraph",
      block_index: 0,
      char_start: 12 + text.indexOf(quote),
      char_end: 12 + text.indexOf(quote) + quote.length,
      quote_text: quote,
    });
  });
});
