/**
 * Phase 1d Task 3 — trimodal eval regression gate. Pure functions that compare
 * two `summary.json` files produced by `scripts/experiments/yentl-trimodal-eval.ts`
 * and report per-candidate regressions across the integrity metrics the eval
 * exposes.
 *
 * Why this exists: the trimodal eval found URL caption drift up to 467.6s,
 * cross-mode claim Jaccard as low as 0%, and per-candidate WER gaps that
 * matter for product integrity. Without a gate, fixes regress silently the
 * moment a downstream change ships. This comparator + the baseline JSON
 * checked into `agent-work/yentl-trimodal-evaluation/baselines/` is the gate.
 *
 * The comparator is intentionally pure — feed it two parsed summary objects,
 * receive a structured report. CI wiring and disk IO live in
 * `scripts/eval/check-baseline.ts`.
 */

export type TrimodalSummary = {
  results: TrimodalCandidateResult[];
};

export type TrimodalCandidateResult = {
  candidate: { id: string };
  comparisons?: {
    youtubeUrlVsSrt?: { wer?: number };
    audioProductionVsSrt?: { wer?: number };
    youtubeTimingDriftS?: number;
  };
  crossMode?: {
    claimJaccard?: {
      srt_vs_youtube_url?: number;
      srt_vs_audio_production?: number;
      youtube_url_vs_audio_production?: number;
    };
    markerNameOverlap?: {
      srt_vs_youtube_url?: number;
      srt_vs_audio_production?: number;
      youtube_url_vs_audio_production?: number;
    };
    provisionalDisagreements?: unknown[];
    explicitRevisionEvents?: number;
  };
};

/**
 * Per-metric regression tolerances. Each tolerance describes the maximum
 * acceptable degradation from baseline:
 *
 *   - `wer`               : max increase in WER (e.g., 0.05 = up to 5 pp worse)
 *   - `timingDriftAbsS`   : hard ceiling on absolute drift in seconds for any
 *                           single candidate (regardless of baseline). The
 *                           URL caption fix in Phase 1d Task 1 should drive
 *                           every candidate well under this.
 *   - `claimJaccardDrop`  : max drop in claim Jaccard (e.g., 0.1 = up to
 *                           10 percentage points worse)
 *   - `markerOverlapDrop` : max drop in marker overlap
 *   - `revisionEventsMin` : new runs must emit at least this many events
 *                           per candidate (0 today; Phase 1e wires emission)
 */
export type Tolerances = {
  wer: number;
  timingDriftAbsS: number;
  claimJaccardDrop: number;
  markerOverlapDrop: number;
  revisionEventsMin: number;
};

export const DEFAULT_TOLERANCES: Tolerances = {
  wer: 0.05,
  timingDriftAbsS: 5,
  claimJaccardDrop: 0.1,
  markerOverlapDrop: 0.1,
  revisionEventsMin: 0,
};

export type Regression = {
  candidateId: string;
  metric: string;
  baseline: number | null;
  current: number | null;
  delta: number | null;
  reason: string;
};

export type CompareReport = {
  baselineRun: string;
  currentRun: string;
  regressions: Regression[];
  improvements: Regression[];
  warnings: string[];
};

function getCandidate(
  summary: TrimodalSummary,
  id: string,
): TrimodalCandidateResult | undefined {
  return summary.results.find((r) => r.candidate.id === id);
}

function checkWer(
  candidateId: string,
  metric: string,
  baseline: number | undefined,
  current: number | undefined,
  tolerance: number,
  out: { regressions: Regression[]; improvements: Regression[] },
) {
  if (baseline === undefined || current === undefined) return;
  const delta = current - baseline;
  const entry: Regression = {
    candidateId,
    metric,
    baseline,
    current,
    delta,
    reason: `${metric} changed by ${(delta * 100).toFixed(1)} pp (tolerance ${(tolerance * 100).toFixed(1)} pp)`,
  };
  if (delta > tolerance) out.regressions.push(entry);
  else if (delta < -tolerance / 2) out.improvements.push(entry);
}

function checkDrop(
  candidateId: string,
  metric: string,
  baseline: number | undefined,
  current: number | undefined,
  tolerance: number,
  out: { regressions: Regression[]; improvements: Regression[] },
) {
  if (baseline === undefined || current === undefined) return;
  const delta = current - baseline; // negative delta = drop
  const entry: Regression = {
    candidateId,
    metric,
    baseline,
    current,
    delta,
    reason: `${metric} changed by ${(delta * 100).toFixed(1)} pp (tolerance −${(tolerance * 100).toFixed(1)} pp)`,
  };
  if (-delta > tolerance) out.regressions.push(entry);
  else if (delta > tolerance / 2) out.improvements.push(entry);
}

function checkTimingDrift(
  candidateId: string,
  baseline: number | undefined,
  current: number | undefined,
  hardCeilingAbsS: number,
  out: { regressions: Regression[]; improvements: Regression[]; warnings: string[] },
) {
  if (current === undefined) return;
  if (Math.abs(current) > hardCeilingAbsS) {
    out.regressions.push({
      candidateId,
      metric: "youtubeTimingDriftS",
      baseline: baseline ?? null,
      current,
      delta: baseline === undefined ? null : current - baseline,
      reason: `URL caption timing drift |${current.toFixed(2)}s| exceeds ${hardCeilingAbsS}s hard ceiling`,
    });
    return;
  }
  if (baseline === undefined) return;
  const delta = Math.abs(current) - Math.abs(baseline);
  if (delta > hardCeilingAbsS / 2) {
    out.regressions.push({
      candidateId,
      metric: "youtubeTimingDriftS",
      baseline,
      current,
      delta,
      reason: `URL caption drift increased ${delta.toFixed(2)}s from baseline`,
    });
  } else if (delta < -hardCeilingAbsS / 4) {
    out.improvements.push({
      candidateId,
      metric: "youtubeTimingDriftS",
      baseline,
      current,
      delta,
      reason: `URL caption drift reduced ${(-delta).toFixed(2)}s from baseline`,
    });
  }
}

function checkRevisionEvents(
  candidateId: string,
  current: number | undefined,
  minimum: number,
  out: { regressions: Regression[] },
) {
  if (current === undefined) return;
  if (current < minimum) {
    out.regressions.push({
      candidateId,
      metric: "explicitRevisionEvents",
      baseline: minimum,
      current,
      delta: current - minimum,
      reason: `explicitRevisionEvents=${current} is below required minimum ${minimum}`,
    });
  }
}

export function compareSummaries(
  baseline: TrimodalSummary,
  current: TrimodalSummary,
  tolerances: Tolerances = DEFAULT_TOLERANCES,
  baselineRun = "<baseline>",
  currentRun = "<current>",
): CompareReport {
  const report: CompareReport = {
    baselineRun,
    currentRun,
    regressions: [],
    improvements: [],
    warnings: [],
  };

  const seen = new Set<string>();
  for (const cur of current.results) {
    const id = cur.candidate.id;
    seen.add(id);
    const base = getCandidate(baseline, id);
    if (!base) {
      report.warnings.push(`New candidate not in baseline: ${id}`);
      continue;
    }

    checkWer(
      id,
      "youtubeUrlVsSrt.wer",
      base.comparisons?.youtubeUrlVsSrt?.wer,
      cur.comparisons?.youtubeUrlVsSrt?.wer,
      tolerances.wer,
      report,
    );
    checkWer(
      id,
      "audioProductionVsSrt.wer",
      base.comparisons?.audioProductionVsSrt?.wer,
      cur.comparisons?.audioProductionVsSrt?.wer,
      tolerances.wer,
      report,
    );
    checkTimingDrift(
      id,
      base.comparisons?.youtubeTimingDriftS,
      cur.comparisons?.youtubeTimingDriftS,
      tolerances.timingDriftAbsS,
      report,
    );
    checkDrop(
      id,
      "claimJaccard.srt_vs_youtube_url",
      base.crossMode?.claimJaccard?.srt_vs_youtube_url,
      cur.crossMode?.claimJaccard?.srt_vs_youtube_url,
      tolerances.claimJaccardDrop,
      report,
    );
    checkDrop(
      id,
      "claimJaccard.srt_vs_audio_production",
      base.crossMode?.claimJaccard?.srt_vs_audio_production,
      cur.crossMode?.claimJaccard?.srt_vs_audio_production,
      tolerances.claimJaccardDrop,
      report,
    );
    checkDrop(
      id,
      "markerNameOverlap.srt_vs_youtube_url",
      base.crossMode?.markerNameOverlap?.srt_vs_youtube_url,
      cur.crossMode?.markerNameOverlap?.srt_vs_youtube_url,
      tolerances.markerOverlapDrop,
      report,
    );
    checkDrop(
      id,
      "markerNameOverlap.srt_vs_audio_production",
      base.crossMode?.markerNameOverlap?.srt_vs_audio_production,
      cur.crossMode?.markerNameOverlap?.srt_vs_audio_production,
      tolerances.markerOverlapDrop,
      report,
    );
    checkRevisionEvents(
      id,
      cur.crossMode?.explicitRevisionEvents,
      tolerances.revisionEventsMin,
      report,
    );
  }

  for (const base of baseline.results) {
    if (!seen.has(base.candidate.id)) {
      report.warnings.push(
        `Baseline candidate missing from current run: ${base.candidate.id}`,
      );
    }
  }

  return report;
}

export function formatReport(report: CompareReport): string {
  const lines: string[] = [];
  lines.push(`Trimodal eval comparison`);
  lines.push(`  baseline: ${report.baselineRun}`);
  lines.push(`  current : ${report.currentRun}`);
  lines.push("");
  if (report.regressions.length === 0) {
    lines.push(`PASS — no regressions across ${report.improvements.length} improvements + ${report.warnings.length} warnings`);
  } else {
    lines.push(`FAIL — ${report.regressions.length} regression(s):`);
    for (const r of report.regressions) {
      lines.push(`  - [${r.candidateId}] ${r.metric}: ${r.reason}`);
    }
  }
  if (report.improvements.length > 0) {
    lines.push("");
    lines.push(`Improvements (${report.improvements.length}):`);
    for (const r of report.improvements) {
      lines.push(`  + [${r.candidateId}] ${r.metric}: ${r.reason}`);
    }
  }
  if (report.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const w of report.warnings) lines.push(`  ! ${w}`);
  }
  return lines.join("\n");
}
