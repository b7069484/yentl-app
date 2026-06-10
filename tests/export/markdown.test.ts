import { describe, it, expect } from "vitest";
import { toMarkdown } from "@/lib/export/markdown";
import type { Session } from "@/lib/types";

describe("toMarkdown", () => {
  const session: Session = {
    title: "Demo",
    started_at: "2026-05-11T10:00:00.000Z",
    ended_at: "2026-05-11T10:05:00.000Z",
    speakers: [],
    source: { kind: "mic" },
    transcript: [
      { text: "Unemployment is at a 30-year low.", start: 0, end: 4, is_final: true, speaker_id: null },
    ],
    claims: [
      {
        id: "1",
        claim_text: "Unemployment is at a 30-year low.",
        utterance_start: 0,
        utterance_end: 4,
        speaker_id: null,
        topic: "Economics",
        topic_secondary: null,
        primary_label: "PARTIAL",
        score: 65,
        annotations: ["cherry-picked timeframe"],
        explanation: "True in absolute terms but selectively framed.",
        status: "confirmed",
        sources: [
          {
            url: "https://reuters.com/x",
            domain: "reuters.com",
            title: "BLS Report",
            reputation_tier: "high",
            stance: "supports",
            excerpt: "The unemployment measure is near a 30-year low.",
          },
        ],
        stance: "reported",
        ownership: {
          owner_speaker_id: null,
          attribution_status: "uncertain",
          attribution_reasons: ["quoted_or_reported_speech"],
          stance: "reported",
          confidence: 0.22,
          source_turn_ids: ["turn-1"],
          source_segment_ids: ["seg-1"],
        },
        document_anchor: {
          kind: "paragraph",
          block_index: 1,
          paragraph_index: 1,
          line_start: 4,
          line_end: 5,
        },
      },
    ],
    markers: [
      {
        id: "m1",
        type: "rhetoric",
        name: "absolutism",
        display: "Absolutism",
        excerpt: "always",
        speaker_id: null,
        start_time: 1,
        end_time: 1.3,
        severity: "subtle",
        explanation: "...",
        attribution_status: "unsafe_overlap",
        attribution_reasons: ["parallel_claim"],
        overlap_class: "parallel_claim",
        source_turn_ids: ["turn-a", "turn-b"],
        source_segment_ids: ["seg-a", "seg-b"],
      },
    ],
    devil_advocate: {
      stance: "A skeptic would ask whether the unemployment claim depends on the chosen timeframe.",
      strongest_counterarguments: [
        "The claim may be true for one measure but false for another.",
        "The timeframe may exclude earlier comparable lows.",
        "The source may use a different unemployment definition.",
      ],
      weakest_assumption: "The weakest assumption is that 30-year low is the relevant baseline.",
      questions: [
        "Which unemployment measure is being used?",
        "What is the comparison period?",
      ],
      confidence: "medium",
      model: "xai/grok-4.1-fast-reasoning",
      at: 1_716_000_000_000,
    },
  };

  it("contains header, transcript, claims, markers sections", () => {
    const md = toMarkdown(session);
    expect(md).toContain("# Demo");
    expect(md).toContain("## Transcript");
    expect(md).toContain("## Claims");
    expect(md).toContain("## Markers");
    expect(md).toContain("Unemployment is at a 30-year low.");
    expect(md).toContain("PARTIAL · 65%");
    expect(md).toContain("Absolutism");
    expect(md).toContain("## Devil's Advocate");
    expect(md).toContain("chosen timeframe");
  });

  it("includes formatted duration when ended", () => {
    const md = toMarkdown(session);
    expect(md).toMatch(/Duration: 300s/);
  });

  it("renders source links and stance metadata", () => {
    const md = toMarkdown(session);
    expect(md).toContain("[BLS Report](https://reuters.com/x)");
    expect(md).toContain("reuters.com · high · supports");
    expect(md).toContain("_Source alignment:_ 1 linked / 0 not direct");
    expect(md).toContain("score 38");
    expect(md).toContain("Evidence: high reputation + excerpt + no image");
    expect(md).toContain("Claim link: unemployment, 30, year");
    expect(md).toContain('Excerpt: "The unemployment measure is near a 30-year low."');
  });

  it("renders claim ownership context so exports do not imply direct assertion", () => {
    const md = toMarkdown(session);
    expect(md).toContain("**Ownership context:**");
    expect(md).toContain("stance reported");
    expect(md).toContain("attribution uncertain");
    expect(md).toContain("owner unresolved");
    expect(md).toContain("confidence 22%");
    expect(md).toContain("quoted or reported speech");
    expect(md).toContain("source Paragraph 2 · lines 4-5");
  });

  it("renders marker attribution context so exports do not imply certain marker ownership", () => {
    const md = toMarkdown(session);
    expect(md).toContain("**Marker attribution context:**");
    expect(md).toContain("attribution unsafe overlap");
    expect(md).toContain("owner unresolved");
    expect(md).toContain("overlap parallel claim");
    expect(md).toContain("reasons parallel claim");
    expect(md).toContain("turns turn-a, turn-b");
    expect(md).toContain("segments seg-a, seg-b");
  });
});
