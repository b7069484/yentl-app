import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopicStrip } from "@/components/session/topic-strip";
import type { TopicSegment } from "@/components/session/topic-strip";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SEG_3: TopicSegment[] = [
  { topic: "CLIMATE", count: 5, colorClass: "bg-teal-soft", textColorClass: "text-teal-2", borderColorClass: "border-teal-25" },
  { topic: "ECONOMY", count: 3, colorClass: "bg-purple-soft", textColorClass: "text-purple", borderColorClass: "border-purple-25" },
  { topic: "HEALTH", count: 2, colorClass: "bg-cream-2", textColorClass: "text-ink-2", borderColorClass: "border-line" },
];

function buildHref(topic: string) {
  return `/session?topic=${topic}`;
}

// ─── 1. Renders 3 segments → 3 anchor elements ────────────────────────────────

describe("TopicStrip – segment rendering", () => {
  it("renders 3 <a> elements when 3 segments are provided", () => {
    const { container } = render(
      <TopicStrip segments={SEG_3} buildHref={buildHref} />,
    );
    const anchors = container.querySelectorAll("a");
    expect(anchors.length).toBe(3);
  });

  it("each anchor href matches buildHref(topic)", () => {
    const { container } = render(
      <TopicStrip segments={SEG_3} buildHref={buildHref} />,
    );
    const anchors = Array.from(container.querySelectorAll("a"));
    const hrefs = anchors.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/session?topic=CLIMATE");
    expect(hrefs).toContain("/session?topic=ECONOMY");
    expect(hrefs).toContain("/session?topic=HEALTH");
  });
});

// ─── 2. Each segment has flex: count in its style ────────────────────────────

describe("TopicStrip – flex proportions", () => {
  it("each segment link has the correct flex value in its inline style", () => {
    const { container } = render(
      <TopicStrip segments={SEG_3} buildHref={buildHref} />,
    );
    const anchors = Array.from(container.querySelectorAll("a"));
    // Inline styles come out as `flex: N` — check each one matches its count
    SEG_3.forEach((seg, i) => {
      const style = (anchors[i] as HTMLElement).style.flex;
      // style.flex may be a string like "5" or "5 1 0%" depending on UA
      expect(String(style)).toContain(String(seg.count));
    });
  });
});

// ─── 3. Each segment shows topic name AND count ───────────────────────────────

describe("TopicStrip – segment text content", () => {
  it("renders the topic name inside each segment", () => {
    render(<TopicStrip segments={SEG_3} buildHref={buildHref} />);
    expect(screen.getByText("CLIMATE")).toBeTruthy();
    expect(screen.getByText("ECONOMY")).toBeTruthy();
    expect(screen.getByText("HEALTH")).toBeTruthy();
  });

  it("renders the claim count inside each segment", () => {
    render(<TopicStrip segments={SEG_3} buildHref={buildHref} />);
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });
});

// ─── 4. Empty segments → "No topics yet" placeholder ─────────────────────────

describe("TopicStrip – empty state", () => {
  it('renders "No topics yet" when segments is empty', () => {
    render(<TopicStrip segments={[]} buildHref={buildHref} />);
    expect(screen.getByText("No topics yet")).toBeTruthy();
  });

  it("renders no anchor elements when segments is empty", () => {
    const { container } = render(
      <TopicStrip segments={[]} buildHref={buildHref} />,
    );
    const anchors = container.querySelectorAll("a");
    expect(anchors.length).toBe(0);
  });
});

// ─── 5. Heading text ─────────────────────────────────────────────────────────

describe("TopicStrip – heading", () => {
  it('renders the heading "Topics in play"', () => {
    render(<TopicStrip segments={SEG_3} buildHref={buildHref} />);
    expect(screen.getByText("Topics in play")).toBeTruthy();
  });

  it('also shows the heading when segments is empty', () => {
    render(<TopicStrip segments={[]} buildHref={buildHref} />);
    expect(screen.getByText("Topics in play")).toBeTruthy();
  });
});
