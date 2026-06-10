import { describe, expect, it } from "vitest";
import { buildLiveSignalSummary } from "@/components/session/live-signal";

describe("Live signal language heat relabel", () => {
  it("uses Language heat instead of the legacy marker-driven indicator label", () => {
    const summary = buildLiveSignalSummary({
      claims: [],
      markers: [],
      liveState: {
        label: "Live state",
        value: "Listening",
        detail: "Waiting for speech.",
        tone: "amber",
      },
    });

    expect(summary.rhetoricHeat.label).toBe("Language heat");
    expect(summary.rhetoricHeat.label).not.toMatch(/rhetoric/i);
  });
});
