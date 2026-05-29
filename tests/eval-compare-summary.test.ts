import { describe, it, expect } from "vitest";
import {
  compareSummaries,
  DEFAULT_TOLERANCES,
  formatReport,
  type TrimodalSummary,
} from "@/lib/eval/compare-summary";

function makeSummary(
  candidates: Array<{
    id: string;
    urlWer?: number;
    audioWer?: number;
    timingDrift?: number;
    claimJaccardYt?: number;
    claimJaccardAudio?: number;
    markerOverlapYt?: number;
    markerOverlapAudio?: number;
    revisionEvents?: number;
  }>,
): TrimodalSummary {
  return {
    results: candidates.map((c) => ({
      candidate: { id: c.id },
      comparisons: {
        youtubeUrlVsSrt: c.urlWer !== undefined ? { wer: c.urlWer } : undefined,
        audioProductionVsSrt:
          c.audioWer !== undefined ? { wer: c.audioWer } : undefined,
        youtubeTimingDriftS: c.timingDrift,
      },
      crossMode: {
        claimJaccard: {
          srt_vs_youtube_url: c.claimJaccardYt,
          srt_vs_audio_production: c.claimJaccardAudio,
        },
        markerNameOverlap: {
          srt_vs_youtube_url: c.markerOverlapYt,
          srt_vs_audio_production: c.markerOverlapAudio,
        },
        explicitRevisionEvents: c.revisionEvents,
      },
    })),
  };
}

describe("compareSummaries (Phase 1d Task 3)", () => {
  it("PASSes with no regressions when current matches baseline", () => {
    const baseline = makeSummary([{ id: "alpha", urlWer: 0.1, timingDrift: 1 }]);
    const current = makeSummary([{ id: "alpha", urlWer: 0.1, timingDrift: 1 }]);
    const r = compareSummaries(baseline, current);
    expect(r.regressions).toEqual([]);
  });

  it("flags WER regression beyond tolerance", () => {
    const baseline = makeSummary([{ id: "alpha", urlWer: 0.1 }]);
    const current = makeSummary([{ id: "alpha", urlWer: 0.2 }]);
    const r = compareSummaries(baseline, current);
    expect(r.regressions).toHaveLength(1);
    expect(r.regressions[0].metric).toBe("youtubeUrlVsSrt.wer");
  });

  it("ignores WER changes within tolerance", () => {
    const baseline = makeSummary([{ id: "alpha", urlWer: 0.1 }]);
    const current = makeSummary([{ id: "alpha", urlWer: 0.12 }]);
    const r = compareSummaries(baseline, current);
    expect(r.regressions).toHaveLength(0);
  });

  it("flags absolute timing drift over hard ceiling regardless of baseline", () => {
    const baseline = makeSummary([{ id: "alpha", timingDrift: 1 }]);
    const current = makeSummary([{ id: "alpha", timingDrift: 10 }]);
    const r = compareSummaries(baseline, current);
    expect(r.regressions.some((x) => x.metric === "youtubeTimingDriftS")).toBe(
      true,
    );
  });

  it("treats abs(drift) for negative drift values", () => {
    const baseline = makeSummary([{ id: "alpha", timingDrift: 0 }]);
    const current = makeSummary([{ id: "alpha", timingDrift: -8 }]);
    const r = compareSummaries(baseline, current);
    expect(r.regressions.some((x) => x.metric === "youtubeTimingDriftS")).toBe(
      true,
    );
  });

  it("marks a drift improvement when |current| << |baseline|", () => {
    // Baseline has 6s of drift (within ceiling), current has 0.5s — should be
    // flagged as an improvement, not a regression.
    const baseline = makeSummary([{ id: "alpha", timingDrift: 6 }]);
    // Inflate ceiling so the absolute check doesn't fire on baseline.
    const tolerances = { ...DEFAULT_TOLERANCES, timingDriftAbsS: 8 };
    const current = makeSummary([{ id: "alpha", timingDrift: 0.5 }]);
    const r = compareSummaries(baseline, current, tolerances);
    expect(r.regressions).toEqual([]);
    expect(r.improvements.some((x) => x.metric === "youtubeTimingDriftS")).toBe(
      true,
    );
  });

  it("flags claim Jaccard drop beyond tolerance", () => {
    const baseline = makeSummary([{ id: "alpha", claimJaccardYt: 0.8 }]);
    const current = makeSummary([{ id: "alpha", claimJaccardYt: 0.5 }]);
    const r = compareSummaries(baseline, current);
    expect(r.regressions.some((x) =>
      x.metric.includes("claimJaccard.srt_vs_youtube_url"),
    )).toBe(true);
  });

  it("warns about new candidates not in baseline", () => {
    const baseline = makeSummary([{ id: "alpha", urlWer: 0.1 }]);
    const current = makeSummary([
      { id: "alpha", urlWer: 0.1 },
      { id: "beta", urlWer: 0.05 },
    ]);
    const r = compareSummaries(baseline, current);
    expect(r.warnings.some((w) => w.includes("beta"))).toBe(true);
  });

  it("warns about baseline candidates missing from current run", () => {
    const baseline = makeSummary([
      { id: "alpha", urlWer: 0.1 },
      { id: "beta", urlWer: 0.05 },
    ]);
    const current = makeSummary([{ id: "alpha", urlWer: 0.1 }]);
    const r = compareSummaries(baseline, current);
    expect(r.warnings.some((w) => w.includes("beta"))).toBe(true);
  });

  it("formatReport reflects PASS vs FAIL state in the first line", () => {
    const baseline = makeSummary([{ id: "alpha", urlWer: 0.1 }]);
    const ok = compareSummaries(baseline, makeSummary([{ id: "alpha", urlWer: 0.1 }]));
    expect(formatReport(ok)).toContain("PASS");

    const bad = compareSummaries(baseline, makeSummary([{ id: "alpha", urlWer: 0.5 }]));
    expect(formatReport(bad)).toContain("FAIL");
  });
});
