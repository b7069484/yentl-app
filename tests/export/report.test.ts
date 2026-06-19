import { describe, it, expect } from "vitest";
import { toReport } from "@/lib/export/report";
import type { Session } from "@/lib/types";

const SAMPLE: Session = {
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
          excerpt: "BLS says unemployment is near a 30-year low.",
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
      explanation: "Universal phrasing without support.",
      attribution_status: "unsafe_overlap",
      attribution_reasons: ["parallel_claim"],
      overlap_class: "parallel_claim",
      source_turn_ids: ["turn-a", "turn-b"],
      source_segment_ids: ["seg-a", "seg-b"],
    },
  ],
  synthesis: {
    text: "Yentl sees a partial unemployment claim with unresolved ownership.",
    headlines: ["Ownership remains unresolved", "One partial claim", "Rhetoric marker present"],
    meta_read: {
      posture: "mixed",
      source_health: "thin",
      scope: "full_session",
      summary: "Across the full session, the read remains mixed.",
      uncertainty: "The strongest uncertainty is unresolved ownership.",
      key_question: "Which source anchors the unemployment timeframe?",
    },
    at: 1_716_000_000_000,
  },
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

describe("toReport", () => {
  it("emits a self-contained HTML document", () => {
    const html = toReport(SAMPLE);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<style>");
    expect(html).toContain("</html>");
    expect(html).toContain("Yentl");
  });

  it("includes title, transcript, claim, and marker content", () => {
    const html = toReport(SAMPLE);
    expect(html).toContain("Demo");
    expect(html).toContain("Unemployment is at a 30-year low.");
    expect(html).toContain("Partially true");
    expect(html).toContain("BLS Report");
    expect(html).toContain("Absolutism");
    expect(html).toContain("Summary");
    expect(html).toContain("Devil's Advocate");
    expect(html).toContain("chosen timeframe");
  });

  it("includes structured synthesis meta-read fields", () => {
    const html = toReport(SAMPLE);
    expect(html).toContain("Meta-read");
    expect(html).toContain("Posture: mixed");
    expect(html).toContain("Source health: thin");
    expect(html).toContain("Scope: full session");
    expect(html).toContain("The strongest uncertainty is unresolved ownership.");
    expect(html).toContain("Which source anchors the unemployment timeframe?");
  });

  it("includes source evidence score, alignment, and highlighted claim links", () => {
    const html = toReport(SAMPLE);
    expect(html).toContain("Alignment 1 linked / 0 not direct");
    expect(html).toContain("reuters.com · high · supports · score 38");
    expect(html).toContain("Evidence: high reputation + excerpt + no image");
    expect(html).toContain("Claim link: unemployment, 30, year");
    expect(html).toContain('<mark class="source-match">unemployment</mark>');
    expect(html).toContain('<mark class="source-match">year</mark>');
  });

  it("includes claim ownership context in the shareable report", () => {
    const html = toReport(SAMPLE);
    expect(html).toContain("Ownership context");
    expect(html).toContain("stance reported");
    expect(html).toContain("attribution uncertain");
    expect(html).toContain("owner unresolved");
    expect(html).toContain("confidence 22%");
    expect(html).toContain("quoted or reported speech");
    expect(html).toContain("source Paragraph 2 · lines 4-5");
  });

  it("includes marker attribution context in the shareable report", () => {
    const html = toReport(SAMPLE);
    expect(html).toContain("Marker attribution context");
    expect(html).toContain("attribution unsafe overlap");
    expect(html).toContain("owner unresolved");
    expect(html).toContain("overlap parallel claim");
    expect(html).toContain("reasons parallel claim");
    expect(html).toContain("turns turn-a, turn-b");
    expect(html).toContain("segments seg-a, seg-b");
  });

  it("escapes HTML in user-supplied text", () => {
    const evil: Session = {
      ...SAMPLE,
      title: "<script>alert('x')</script>",
      transcript: [
        { text: "He said \"hi\" & meant it.", start: 0, end: 1, is_final: true, speaker_id: null },
      ],
      claims: [],
      markers: [],
    };
    const html = toReport(evil);
    expect(html).not.toContain("<script>alert('x')</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;hi&quot;");
    expect(html).toContain("&amp;");
  });

  it("omits ended/duration meta when not ended", () => {
    const open: Session = { ...SAMPLE, ended_at: undefined };
    const html = toReport(open);
    expect(html).not.toContain("ended ");
  });
});
