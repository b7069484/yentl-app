import { describe, expect, it } from "vitest";
import { ExtractClaimsResponse, SYSTEM, userPrompt } from "@/lib/prompts/extract-claims";

describe("extract-claims schema (claim ownership)", () => {
  it("accepts ownership metadata for extracted claims", () => {
    const parsed = ExtractClaimsResponse.parse({
      claims: [
        {
          claim_text: "The audit was hidden from the committee.",
          utterance_start: 10,
          utterance_end: 14,
          topic: "Law",
          topic_secondary: null,
          stance: "reported",
          ownership: {
            owner_speaker_id: null,
            attribution_status: "uncertain",
            attribution_reasons: ["quoted_or_reported_speech"],
            stance: "reported",
            confidence: 0.38,
            source_turn_ids: ["turn-7"],
            source_segment_ids: ["seg-7"],
          },
        },
      ],
    });

    expect(parsed.claims[0].ownership?.owner_speaker_id).toBeNull();
    expect(parsed.claims[0].ownership?.attribution_status).toBe("uncertain");
    expect(parsed.claims[0].ownership?.stance).toBe("reported");
  });

  it("keeps legacy model outputs parseable before ownership is emitted", () => {
    const parsed = ExtractClaimsResponse.parse({
      claims: [
        {
          claim_text: "The city approved a $42 million school repair bond in 2024.",
          utterance_start: 0,
          utterance_end: 5,
          topic: "Politics",
          topic_secondary: null,
        },
      ],
    });

    expect(parsed.claims[0].ownership).toBeUndefined();
  });

  it("prompt instructs the model to emit claim ownership and avoid unsafe owner assignment", () => {
    expect(SYSTEM).toContain("ownership");
    expect(SYSTEM).toContain("owner_speaker_id");
    expect(SYSTEM).toContain("unsafe_overlap");
  });

  it("userPrompt includes structured segment attribution metadata", () => {
    const prompt = userPrompt({
      utterance: "The prior speaker said the audit was hidden.",
      utterance_start: 10,
      utterance_end: 14,
      context: "TRANSCRIPT_CONTEXT: [Speaker 1] prior words",
      recent_hashes: [],
      speaker_id: 1,
      segment_id: "seg-7",
      turn_id: "turn-7",
      attribution_status: "probable",
      attribution_reasons: ["dominant_speaker_low_margin"],
      overlap_class: "none",
      source_audio_kind: "mic",
      document_anchor: {
        kind: "speaker_turn",
        block_index: 2,
        line_start: 5,
        line_end: 5,
        speaker_label: "Mira",
        char_start: 12,
        char_end: 48,
        quote_text: "The prior speaker said the audit was hidden.",
      },
    });

    expect(prompt).toContain("SEGMENT_ATTRIBUTION");
    expect(prompt).toContain("speaker_id: 1");
    expect(prompt).toContain("turn_id: turn-7");
    expect(prompt).toContain("attribution_status: probable");
    expect(prompt).toContain("document_anchor: speaker_turn 3");
    expect(prompt).toContain("speaker_label: Mira");
    expect(prompt).toContain("chars: 12-48");
    expect(prompt).toContain("quote: The prior speaker said the audit was hidden.");
  });
});
