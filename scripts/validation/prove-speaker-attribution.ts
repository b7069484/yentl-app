#!/usr/bin/env tsx
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { scoreHardWindows } from "../test-corpus/score-speaker-attribution";

const ROOT = process.cwd();
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/speaker-attribution-proof.json");
const SOURCE_BLOCKERS_PATH = join(ROOT, "test-corpus/speaker-attribution/source-blockers.json");

const MIN_SCORED_WINDOWS = 9;
const MIN_MEAN_SPEAKER_PURITY = 0.95;
const MIN_MEAN_CLAIM_OWNER_ACCURACY = 0.95;
const MIN_WINDOW_SPEAKER_PURITY = 0.95;
const MIN_WINDOW_CLAIM_OWNER_ACCURACY = 0.95;
const MIN_UNSAFE_ATTRIBUTION_RECALL = 1;
const MAX_QUOTE_VS_ENDORSEMENT_ERRORS = 0;

async function main() {
  const report = await scoreHardWindows();
  const sourceBlockers = await readSourceBlockers();
  const blockers = buildLaunchBlockers(report, sourceBlockers);
  const reviewRequired = reviewRequiredWindows(report);
  const checks = [
    check("no-missing-transcripts", report.summary.missing_transcripts === 0, {
      missing_transcripts: report.summary.missing_transcripts,
    }),
    check("scored-window-floor", report.summary.scored >= MIN_SCORED_WINDOWS, {
      scored: report.summary.scored,
      min: MIN_SCORED_WINDOWS,
    }),
    check("speaker-purity-floor", gte(report.summary.mean_speaker_purity, MIN_MEAN_SPEAKER_PURITY), {
      actual: report.summary.mean_speaker_purity,
      min: MIN_MEAN_SPEAKER_PURITY,
    }),
    check("claim-owner-accuracy-floor", gte(report.summary.mean_claim_owner_accuracy, MIN_MEAN_CLAIM_OWNER_ACCURACY), {
      actual: report.summary.mean_claim_owner_accuracy,
      min: MIN_MEAN_CLAIM_OWNER_ACCURACY,
    }),
    check("per-window-speaker-purity-floor", perWindowGte(report, "speaker_purity", MIN_WINDOW_SPEAKER_PURITY), {
      min: MIN_WINDOW_SPEAKER_PURITY,
      failures: perWindowFailures(report, "speaker_purity", MIN_WINDOW_SPEAKER_PURITY),
    }),
    check("per-window-claim-owner-accuracy-floor", perWindowGte(report, "claim_owner_accuracy", MIN_WINDOW_CLAIM_OWNER_ACCURACY), {
      min: MIN_WINDOW_CLAIM_OWNER_ACCURACY,
      failures: perWindowFailures(report, "claim_owner_accuracy", MIN_WINDOW_CLAIM_OWNER_ACCURACY),
    }),
    check("unsafe-attribution-recall-floor", gte(report.summary.unsafe_attribution_recall, MIN_UNSAFE_ATTRIBUTION_RECALL), {
      actual: report.summary.unsafe_attribution_recall,
      min: MIN_UNSAFE_ATTRIBUTION_RECALL,
    }),
    check("quote-vs-endorsement-errors", report.summary.quote_vs_endorsement_errors <= MAX_QUOTE_VS_ENDORSEMENT_ERRORS, {
      actual: report.summary.quote_vs_endorsement_errors,
      max: MAX_QUOTE_VS_ENDORSEMENT_ERRORS,
    }),
    check("review-required-windows-named", reviewRequired.length === report.summary.review_required, {
      review_required: report.summary.review_required,
      named_windows: reviewRequired.map((window) => window.window_id),
      public_claims_review_status: reviewRequired.length > 0 ? "review_required_before_public_claims" : "not_required",
    }),
  ];

  const proof = {
    ok: checks.every((item) => item.ok),
    launch_ready: blockers.length === 0 && checks.every((item) => item.ok),
    generated_at: new Date().toISOString(),
    proof: "speaker-attribution-hard-windows",
    public_claims_review_status: reviewRequired.length > 0 ? "review_required_before_public_claims" : "not_required",
    report_path: "test-corpus/speaker-attribution/report/speaker-attribution-report.json",
    summary: report.summary,
    checks,
    source_blockers: sourceBlockers,
    launch_blockers: blockers,
    human_review_required_count: reviewRequired.length,
    human_review_required_windows: reviewRequired,
    scored_windows: report.windows
      .filter((window) => window.label_status === "scored")
      .map((window) => ({
        window_id: window.window_id,
        source_id: window.source_id,
        review_required: window.review_required,
        failure_family: window.failure_family,
        expected_risk: window.expected_risk,
        speaker_purity: window.speaker_purity,
        claim_owner_accuracy: window.claim_owner_accuracy,
        unsafe_attribution_recall: window.unsafe_attribution_recall,
        non_asserted_claim_spans: window.non_asserted_claim_spans,
        unsafe_non_asserted_claim_spans: window.unsafe_non_asserted_claim_spans,
        quote_vs_endorsement_errors: window.quote_vs_endorsement_errors,
        wer: window.wer,
      })),
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(proof, null, 2)}\n`);

  if (!proof.ok) {
    throw new Error(`Speaker-attribution proof failed. Report: ${REPORT_PATH}`);
  }

  console.log(JSON.stringify(proof, null, 2));
}

type SourceBlocker = {
  window_id: string;
  source_id: string;
  blocker_type: "source_mismatch" | "window_mismatch" | "review_required";
  reason: string;
  next_action: string;
  replacement_hint?: string;
};

async function readSourceBlockers(): Promise<SourceBlocker[]> {
  try {
    const parsed = JSON.parse(await readFile(SOURCE_BLOCKERS_PATH, "utf8")) as { blockers?: SourceBlocker[] };
    return Array.isArray(parsed.blockers) ? parsed.blockers : [];
  } catch {
    return [];
  }
}

function buildLaunchBlockers(
  report: Awaited<ReturnType<typeof scoreHardWindows>>,
  sourceBlockers: SourceBlocker[],
) {
  const blockerByWindow = new Map(sourceBlockers.map((blocker) => [blocker.window_id, blocker]));
  return report.windows
    .filter((window) => window.label_status === "missing" || window.label_status === "error")
    .map((window) => ({
      window_id: window.window_id,
      source_id: window.source_id,
      failure_family: window.failure_family,
      expected_risk: window.expected_risk,
      blocker_type: blockerByWindow.get(window.window_id)?.blocker_type ?? "missing_label",
      reason: blockerByWindow.get(window.window_id)?.reason ?? "The hard-window sidecar is missing or invalid.",
      next_action: blockerByWindow.get(window.window_id)?.next_action ?? "Add a reviewed sidecar before treating this window as launch proof.",
      replacement_hint: blockerByWindow.get(window.window_id)?.replacement_hint,
      missing_labels: window.missing_labels,
      review_required: window.review_required,
    }));
}

function reviewRequiredWindows(report: Awaited<ReturnType<typeof scoreHardWindows>>) {
  return report.windows
    .filter((window) => window.review_required)
    .map((window) => ({
      window_id: window.window_id,
      source_id: window.source_id,
      failure_family: window.failure_family,
      expected_risk: window.expected_risk,
      label_status: window.label_status,
      speaker_purity: window.speaker_purity,
      claim_owner_accuracy: window.claim_owner_accuracy,
      unsafe_attribution_recall: window.unsafe_attribution_recall,
      quote_vs_endorsement_errors: window.quote_vs_endorsement_errors,
    }));
}

function check(name: string, ok: boolean, details: Record<string, unknown>) {
  return { name, ok, ...details };
}

function gte(value: number | null, min: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= min;
}

function perWindowGte(
  report: Awaited<ReturnType<typeof scoreHardWindows>>,
  key: "speaker_purity" | "claim_owner_accuracy",
  min: number,
): boolean {
  return perWindowFailures(report, key, min).length === 0;
}

function perWindowFailures(
  report: Awaited<ReturnType<typeof scoreHardWindows>>,
  key: "speaker_purity" | "claim_owner_accuracy",
  min: number,
) {
  return report.windows
    .filter((window) => window.label_status === "scored")
    .filter((window) => {
      const value = window[key];
      return typeof value === "number" && Number.isFinite(value) && value < min;
    })
    .map((window) => ({
      window_id: window.window_id,
      source_id: window.source_id,
      actual: window[key],
      min,
    }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
