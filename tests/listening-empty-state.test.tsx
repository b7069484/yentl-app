import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ─── Mock AudioMeter ───────────────────────────────────────────────────────────
// AudioMeter uses AudioContext + RAF which don't exist in jsdom.
// We mock it to a simple test double that renders a recognisable element.
vi.mock("@/components/session/AudioMeter", () => ({
  AudioMeter: ({ stream }: { stream: MediaStream | null }) => (
    <div data-testid="audio-meter" data-stream={stream ? "present" : "null"} />
  ),
}));

import { ListeningEmptyState } from "@/components/session/listening-empty-state";

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ListeningEmptyState", () => {
  it("renders the headline 'Listening for first words…'", () => {
    render(<ListeningEmptyState micStream={null} />);
    expect(screen.getByText("Listening for first words…")).toBeTruthy();
  });

  it("renders the subtitle", () => {
    render(<ListeningEmptyState micStream={null} />);
    expect(
      screen.getByText(
        "Speak naturally. Yenta will transcribe, fact-check, and surface biases live.",
      ),
    ).toBeTruthy();
  });

  it("renders exactly 3 skeleton rows with animate-pulse class", () => {
    const { container } = render(<ListeningEmptyState micStream={null} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    // 3 skeleton hint rows + any pulse on the dot = at least 3
    // The spec requires exactly 3 skeleton hint rows; we count elements
    // that are the skeleton rows (bg-cream-2 rounded h-2.5 animate-pulse)
    const skeletonRows = container.querySelectorAll(".bg-cream-2.rounded.h-2\\.5.animate-pulse");
    expect(skeletonRows.length).toBe(3);
  });

  it("renders <AudioMeter /> (mocked)", () => {
    render(<ListeningEmptyState micStream={null} />);
    expect(screen.getByTestId("audio-meter")).toBeTruthy();
  });

  it("passes null stream to AudioMeter when micStream is null", () => {
    render(<ListeningEmptyState micStream={null} />);
    const meter = screen.getByTestId("audio-meter");
    expect(meter.getAttribute("data-stream")).toBe("null");
  });

  it("passes stream to AudioMeter when micStream is provided", () => {
    // jsdom may not have MediaStream — use a plain object cast to the type
    const stream = {} as MediaStream;
    render(<ListeningEmptyState micStream={stream} />);
    const meter = screen.getByTestId("audio-meter");
    expect(meter.getAttribute("data-stream")).toBe("present");
  });

  it("has py-12 padding and centers content in max-w-[480px]", () => {
    const { container } = render(<ListeningEmptyState micStream={null} />);
    // Outer wrapper has py-12
    const outer = container.firstElementChild;
    expect(outer?.className).toContain("py-12");
    // Inner centered div
    const inner = outer?.firstElementChild;
    expect(inner?.className).toContain("max-w-[480px]");
  });
});
