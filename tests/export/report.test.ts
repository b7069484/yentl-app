import { describe, it, expect } from "vitest";
import { toReport } from "@/lib/export/report";
import type { Session } from "@/lib/types";

const SAMPLE: Session = {
  title: "Demo",
  started_at: "2026-05-11T10:00:00.000Z",
  ended_at: "2026-05-11T10:05:00.000Z",
  transcript: [
    { text: "Unemployment is at a 30-year low.", start: 0, end: 4, is_final: true },
  ],
  claims: [
    {
      id: "1",
      claim_text: "Unemployment is at a 30-year low.",
      utterance_start: 0,
      utterance_end: 4,
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
          excerpt: "BLS confirms the figure.",
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
      start_time: 1,
      end_time: 1.3,
      severity: "subtle",
      explanation: "Universal phrasing without support.",
    },
  ],
};

describe("toReport", () => {
  it("emits a self-contained HTML document", () => {
    const html = toReport(SAMPLE);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<style>");
    expect(html).toContain("</html>");
    expect(html).toContain("Factify");
  });

  it("includes title, transcript, claim, and marker content", () => {
    const html = toReport(SAMPLE);
    expect(html).toContain("Demo");
    expect(html).toContain("Unemployment is at a 30-year low.");
    expect(html).toContain("Partially true");
    expect(html).toContain("BLS Report");
    expect(html).toContain("Absolutism");
  });

  it("escapes HTML in user-supplied text", () => {
    const evil: Session = {
      ...SAMPLE,
      title: "<script>alert('x')</script>",
      transcript: [
        { text: "He said \"hi\" & meant it.", start: 0, end: 1, is_final: true },
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
