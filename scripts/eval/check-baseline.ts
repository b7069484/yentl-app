#!/usr/bin/env node
/**
 * Phase 1d Task 3 — trimodal eval regression gate CLI.
 *
 * Usage:
 *   npx tsx scripts/eval/check-baseline.ts <baseline.json> <current.json>
 *
 * Exits 0 when no regressions; exits 1 when at least one regression fires.
 * Prints the structured comparison report on stdout.
 *
 * Wire to CI by running the trimodal eval (`scripts/experiments/yentl-trimodal-eval.ts`)
 * with API keys present, then invoke this script against the saved baseline.
 * The baseline lives at
 *   agent-work/yentl-trimodal-evaluation/baselines/<date>-summary.json
 * and is regenerated only when a deliberate metrics shift is approved.
 */

import { readFileSync } from "node:fs";
import { compareSummaries, formatReport, type TrimodalSummary } from "../../lib/eval/compare-summary";

function loadSummary(path: string): TrimodalSummary {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as TrimodalSummary;
}

function main(): number {
  const [, , baselinePath, currentPath] = process.argv;
  if (!baselinePath || !currentPath) {
    console.error("Usage: check-baseline <baseline.json> <current.json>");
    return 2;
  }

  const baseline = loadSummary(baselinePath);
  const current = loadSummary(currentPath);
  const report = compareSummaries(
    baseline,
    current,
    undefined,
    baselinePath,
    currentPath,
  );

  console.log(formatReport(report));
  return report.regressions.length > 0 ? 1 : 0;
}

process.exit(main());
