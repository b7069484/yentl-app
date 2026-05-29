import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  buildLiveSignalSummary,
  WatchSignalBoard,
  ExtensionSignalStrip,
} from "@/components/session/live-signal";
import type { LiveSignalSummary } from "@/components/session/live-signal";

// Phase 1a Task 6 regression: "Rhetoric heat" → "Language heat" relabel.
// Only the user-visible label changes; the data field `rhetoricHeat` is unchanged.

function makeFakeSummary(): LiveSignalSummary {
  const base = buildLiveSignalSummary({
    claims: [],
    markers: [],
    liveState: {
      label: "Live state",
      value: "Listening",
      detail: "Session active.",
      tone: "green",
    },
  });
  return base;
}

describe("LiveSignal — Language Heat relabel (Phase 1a Task 6)", () => {
  it("WatchSignalBoard renders 'Language heat' and not 'Rhetoric heat'", () => {
    const summary = makeFakeSummary();
    const { getByText, queryByText } = render(
      <WatchSignalBoard summary={summary} />,
    );
    expect(getByText(/language heat/i)).toBeTruthy();
    expect(queryByText(/rhetoric heat/i)).toBeNull();
  });

  it("ExtensionSignalStrip renders 'Language heat' and not 'Rhetoric heat'", () => {
    const summary = makeFakeSummary();
    const { getByText, queryByText } = render(
      <ExtensionSignalStrip summary={summary} />,
    );
    expect(getByText(/language heat/i)).toBeTruthy();
    expect(queryByText(/rhetoric heat/i)).toBeNull();
  });

  it("buildLiveSignalSummary still produces a rhetoricHeat field (data field name unchanged)", () => {
    const summary = makeFakeSummary();
    expect(summary.rhetoricHeat).toBeDefined();
    expect(summary.rhetoricHeat.tone).toBeDefined();
    expect(summary.rhetoricHeat.value).toBeDefined();
  });
});
