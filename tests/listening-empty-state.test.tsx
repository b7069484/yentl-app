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

  it("renders exactly 3 skeleton rows", () => {
    const { container } = render(<ListeningEmptyState micStream={null} />);
    // Skeleton rows are aria-hidden divs with bg-cream-2 class inside the skeleton wrapper
    const skeletonRows = container.querySelectorAll(".bg-cream-2.rounded.h-2\\.5");
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

  it("wraps content in a status region with headline and meter", () => {
    const { container } = render(<ListeningEmptyState micStream={null} />);
    // The outer element must be a status region for screen-reader phase announcements
    const outer = container.firstElementChild;
    expect(outer?.getAttribute("role")).toBe("status");
    expect(outer?.getAttribute("aria-live")).toBe("polite");
    // Inner content area exists (structural sanity — not class-bound)
    expect(outer?.firstElementChild).toBeTruthy();
  });
});
