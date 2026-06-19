#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const SPEAKER_PROOF_PATH = join(ROOT, "docs/superpowers/validation/speaker-attribution-proof.json");
const MANIFEST_PATH = process.env.YENTL_ATTRIBUTION_REVIEW_MANIFEST
  ? resolvePath(process.env.YENTL_ATTRIBUTION_REVIEW_MANIFEST)
  : join(ROOT, "agent-work/validation/sensitive-attribution-reviews.json");
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/sensitive-attribution-review-proof.json");
const MAX_AGE_DAYS = Number(process.env.YENTL_ATTRIBUTION_REVIEW_MAX_AGE_DAYS ?? 30);
const APPROVED_STATUS = "approved_for_public_claims";

async function main() {
  const checks = [];
  const speakerProof = await readJson(SPEAKER_PROOF_PATH);
  const requiredWindows = Array.isArray(speakerProof?.human_review_required_windows)
    ? speakerProof.human_review_required_windows
    : [];
  let manifest = null;
  let manifestStatus = "loaded";

  if (!existsSync(MANIFEST_PATH)) {
    manifestStatus = requiredWindows.length > 0 ? "missing_manifest" : "not_required";
  } else {
    try {
      manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    } catch (error) {
      manifestStatus = "invalid_manifest_json";
      checks.push(failedCheck("manifest-json", error));
    }
  }

  const reviews = Array.isArray(manifest?.reviews) ? manifest.reviews : [];
  const requiredMissing = requiredWindows
    .filter((window) => !reviews.some((review) => review?.window_id === window.window_id))
    .map((window) => window.window_id);

  checks.push(check("speaker-attribution-proof-present", speakerProof?.ok === true, {
    proof_path: relative(ROOT, SPEAKER_PROOF_PATH),
    speaker_proof_ok: speakerProof?.ok === true,
  }));

  if (manifestStatus === "loaded") {
    checks.push(await runCheck("manifest-context", () => proveManifestContext(manifest, speakerProof)));
    for (const window of requiredWindows) {
      checks.push(await runCheck(`review-${window.window_id}`, () => proveWindowReview(window, reviews)));
    }
  }

  const failures = checks.filter((item) => !item.ok);
  const publicClaimsReviewStatus = requiredWindows.length === 0
    ? "not_required"
    : manifestStatus === "loaded" && requiredMissing.length === 0 && failures.length === 0
      ? APPROVED_STATUS
      : "review_required_before_public_claims";
  const report = {
    ok: speakerProof?.ok === true &&
      (requiredWindows.length === 0 ||
        (manifestStatus === "loaded" && requiredMissing.length === 0 && failures.length === 0)),
    launch_ready: false,
    generated_at: new Date().toISOString(),
    report_path: "docs/superpowers/validation/sensitive-attribution-review-proof.json",
    speaker_proof_path: "docs/superpowers/validation/speaker-attribution-proof.json",
    speaker_proof_generated_at: speakerProof?.generated_at ?? null,
    manifest_path: relative(ROOT, MANIFEST_PATH),
    manifest_status: manifestStatus,
    public_claims_review_status: publicClaimsReviewStatus,
    max_age_days: MAX_AGE_DAYS,
    required_window_count: requiredWindows.length,
    reviewed_window_count: reviews.filter((review) => requiredWindows.some((window) => window.window_id === review?.window_id)).length,
    required_missing: requiredMissing,
    required_windows: requiredWindows.map((window) => ({
      window_id: window.window_id,
      source_id: window.source_id,
      failure_family: window.failure_family,
      expected_risk: window.expected_risk,
    })),
    checks,
    failures: failures.map(({ name, error }) => ({ name, error })),
    next_action: nextAction(manifestStatus, requiredMissing, failures, requiredWindows.length),
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    throw new Error(`Sensitive attribution review is not launch-ready. Report: ${REPORT_PATH}`);
  }
}

function proveManifestContext(manifest, speakerProof) {
  if (typeof manifest.speaker_proof_generated_at === "string") {
    assert(
      manifest.speaker_proof_generated_at === speakerProof.generated_at,
      "manifest speaker_proof_generated_at does not match the current speaker-attribution proof",
    );
  }
  return {
    speaker_proof_generated_at: speakerProof.generated_at ?? null,
    manifest_speaker_proof_generated_at: manifest.speaker_proof_generated_at ?? null,
  };
}

function proveWindowReview(window, reviews) {
  const review = reviews.find((entry) => entry?.window_id === window.window_id);
  assert(review, `missing review for ${window.window_id}`);
  assert(review.status === APPROVED_STATUS, `${window.window_id} status must be ${APPROVED_STATUS}`);
  assert(review.public_claims_allowed === true, `${window.window_id} public_claims_allowed must be true`);
  assert(typeof review.reviewer === "string" && review.reviewer.trim(), `${window.window_id} missing reviewer`);
  assert(typeof review.reviewed_at === "string" && review.reviewed_at.trim(), `${window.window_id} missing reviewed_at`);
  const reviewedAt = new Date(review.reviewed_at);
  assert(Number.isFinite(reviewedAt.getTime()), `${window.window_id} reviewed_at is not a valid date`);
  const ageDays = (Date.now() - reviewedAt.getTime()) / (24 * 60 * 60 * 1000);
  assert(ageDays <= MAX_AGE_DAYS, `${window.window_id} review is stale: ${ageDays.toFixed(1)} days old`);
  assert(typeof review.notes === "string" && review.notes.trim().length >= 20, `${window.window_id} review notes are too short`);
  if (typeof review.source_id === "string") {
    assert(review.source_id === window.source_id, `${window.window_id} source_id does not match current proof`);
  }
  if (typeof review.failure_family === "string") {
    assert(review.failure_family === window.failure_family, `${window.window_id} failure_family does not match current proof`);
  }

  return {
    window_id: window.window_id,
    source_id: window.source_id,
    failure_family: window.failure_family,
    expected_risk: window.expected_risk,
    status: review.status,
    reviewer: review.reviewer,
    reviewed_at: review.reviewed_at,
    age_days: Number(ageDays.toFixed(2)),
  };
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function runCheck(name, fn) {
  const startedAt = Date.now();
  try {
    const details = fn();
    return {
      name,
      ok: true,
      elapsed_ms: Date.now() - startedAt,
      ...details,
    };
  } catch (error) {
    return failedCheck(name, error, Date.now() - startedAt);
  }
}

function check(name, ok, details) {
  return { name, ok, ...details };
}

function failedCheck(name, error, elapsedMs = 0) {
  return {
    name,
    ok: false,
    elapsed_ms: elapsedMs,
    error: error instanceof Error ? error.message : String(error),
  };
}

function nextAction(manifestStatus, requiredMissing, failures, requiredWindowCount) {
  if (requiredWindowCount === 0) {
    return "No sensitive attribution review is required by the current speaker proof.";
  }
  if (manifestStatus === "missing_manifest") {
    return `Create ${relative(ROOT, MANIFEST_PATH)} with approvals for every required sensitive attribution window.`;
  }
  if (manifestStatus === "invalid_manifest_json") {
    return "Fix the sensitive attribution review manifest JSON.";
  }
  if (requiredMissing.length > 0) {
    return `Add review approval(s) for: ${requiredMissing.join(", ")}.`;
  }
  if (failures.length > 0) {
    return "Repair the failed review checks and rerun.";
  }
  return "Sensitive attribution review passed.";
}

function resolvePath(value) {
  if (value.startsWith("/")) return value;
  return join(ROOT, value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
