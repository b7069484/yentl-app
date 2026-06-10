import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { RhetoricMarker } from "@/lib/types";
import { MarkerRow } from "@/components/session/marker-row";

function marker(overrides: Partial<RhetoricMarker> = {}): RhetoricMarker {
  return {
    id: "marker-1",
    type: "fallacy",
    name: "slippery-slope",
    display: "Slippery Slope",
    excerpt: "If we allow X, everything will collapse.",
    speaker_id: 0,
    start_time: 90,
    end_time: 95,
    severity: "clear",
    explanation: "The speaker assumes a chain of events without justification.",
    ...overrides,
  };
}

describe("marker attribution UI", () => {
  it("keeps unsafe overlap attribution neutral on MarkerRow", () => {
    render(
      <MarkerRow
        marker={marker({
          attribution_status: "unsafe_overlap",
          attribution_reasons: ["competitive_interruption"],
          overlap_class: "competitive_interruption",
        })}
        speakerLabel="Speaker 1"
        href="/session/detail/marker/marker-1"
      />,
    );

    expect(screen.getByText("Attribution: unsafe overlap · 01:30")).toBeInTheDocument();
    expect(screen.queryByText("Speaker 1 · 01:30")).not.toBeInTheDocument();
  });

  it("still names resolved marker speakers", () => {
    render(
      <MarkerRow
        marker={marker({ attribution_status: "confident" })}
        speakerLabel="Speaker 1"
        href="/session/detail/marker/marker-1"
      />,
    );

    expect(screen.getByText("Speaker 1 · 01:30")).toBeInTheDocument();
  });
});
