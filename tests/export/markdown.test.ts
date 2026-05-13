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
          },
        ],
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
      },
    ],
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
  });

  it("includes formatted duration when ended", () => {
    const md = toMarkdown(session);
    expect(md).toMatch(/Duration: 300s/);
  });

  it("renders source links and stance metadata", () => {
    const md = toMarkdown(session);
    expect(md).toContain("[BLS Report](https://reuters.com/x)");
    expect(md).toContain("reuters.com · high · supports");
  });
});
