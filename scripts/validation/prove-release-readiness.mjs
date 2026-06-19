#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/release-readiness-proof.json");
const STRICT = process.env.YENTL_RELEASE_READINESS_STRICT === "1";

const LOCAL_PROOFS = [
  {
    id: "session-ux-local",
    path: "docs/superpowers/validation/session-ux-local-proof.json",
    requirement: "Core session UX, saved-session roundtrip, and restore flow have local browser proof.",
  },
  {
    id: "ingestion-api-local",
    path: "docs/superpowers/validation/ingestion-local-proof.json",
    requirement: "Core ingestion API paths and validation fixtures pass locally.",
  },
  {
    id: "ingestion-ui-local",
    path: "docs/superpowers/validation/ingestion-ui-local-proof.json",
    requirement: "Rendered ingestion UI handoff flows pass locally.",
  },
  {
    id: "text-document-fixtures",
    path: "docs/superpowers/validation/text-document-fixtures-proof.json",
    requirement: "Text, document, caption, and PDF fixtures are covered.",
  },
  {
    id: "synthesis-metaread",
    path: "docs/superpowers/validation/synthesis-metaread-proof.json",
    requirement: "Full-session synthesis and meta-read quality gates pass.",
  },
  {
    id: "speaker-attribution",
    path: "docs/superpowers/validation/speaker-attribution-proof.json",
    requirement: "Multi-speaker hard-window scoring gate passes.",
  },
  {
    id: "mobile-pwa-local",
    path: "docs/superpowers/validation/mobile-pwa-local-proof.json",
    requirement: "Mobile/PWA route rendering has local browser proof.",
  },
  {
    id: "pwa-native-contract",
    path: "docs/superpowers/validation/pwa-native-contract-proof.json",
    requirement: "PWA install, share, launch-handler, and file-handler contract passes.",
  },
  {
    id: "cloud-sync-local",
    path: "docs/superpowers/validation/cloud-sync-local-proof.json",
    requirement: "Saved-session cloud-sync API reports a safe local mode.",
  },
  {
    id: "extension-local",
    path: "docs/superpowers/validation/installed-extension-local-proof.json",
    requirement: "Installed Chrome extension local proof passes.",
  },
  {
    id: "extension-external",
    path: "docs/superpowers/validation/installed-extension-external-proof.json",
    requirement: "Installed Chrome extension external media proof passes.",
  },
  {
    id: "extension-store-readiness",
    path: "docs/superpowers/validation/extension-store-readiness.json",
    requirement: "Chrome Web Store package/readiness checks pass.",
  },
  {
    id: "a11y-local",
    path: "docs/superpowers/validation/a11y-local-proof.json",
    requirement: "Local accessibility proof passes.",
  },
];

const DEPLOY_PROOFS = [
  "docs/superpowers/validation/ingestion-deploy-proof.json",
  "docs/superpowers/validation/analysis-deploy-both-proof.json",
  "docs/superpowers/validation/cloud-sync-deploy-proof.json",
  "docs/superpowers/validation/a11y-deploy-proof.json",
  "docs/superpowers/validation/trust-copy-deploy-proof.json",
];

const EXTERNAL_PROOFS = [
  {
    id: "sensitive-attribution-review",
    path: "docs/superpowers/validation/sensitive-attribution-review-proof.json",
    requirement: "Human/editorial review approves all sensitive speaker-attribution windows before public launch claims.",
  },
  {
    id: "mobile-device-canary",
    path: "docs/superpowers/validation/mobile-device-canary-proof.json",
    requirement: "Physical iOS and Android share, file picker, microphone, install/open, and restore canaries pass.",
  },
  {
    id: "large-real-media-canary",
    path: "docs/superpowers/validation/large-real-media-canary-proof.json",
    requirement: "Large real phone-recorded audio/video canaries pass through production Blob upload and transcription.",
  },
];

async function main() {
  const localProofs = LOCAL_PROOFS.map(readProofStatus);
  const deployProofs = DEPLOY_PROOFS.map((path) => readProofStatus({
    id: path.replace(/^docs\/superpowers\/validation\//, "").replace(/\.json$/, ""),
    path,
    requirement: "Production/deployed proof artifact exists and passes.",
  }));
  const externalProofs = EXTERNAL_PROOFS.map(readProofStatus);
  const blockers = [
    ...localProofBlockers(localProofs),
    ...externalLaunchBlockers(localProofs, deployProofs, externalProofs),
  ];
  const advisory = advisoryItems(localProofs, deployProofs);
  const git = gitSnapshot();
  const report = {
    ok: true,
    launch_ready: blockers.length === 0,
    generated_at: new Date().toISOString(),
    strict: STRICT,
    report_path: "docs/superpowers/validation/release-readiness-proof.json",
    local_proof_summary: {
      total: localProofs.length,
      passed: localProofs.filter((proof) => proof.ok).length,
      failed: localProofs.filter((proof) => !proof.ok).length,
    },
    deploy_proof_summary: {
      total: deployProofs.length,
      passed: deployProofs.filter((proof) => proof.ok).length,
      failed: deployProofs.filter((proof) => !proof.ok).length,
    },
    external_proof_summary: {
      total: externalProofs.length,
      passed: externalProofs.filter((proof) => proof.ok).length,
      failed: externalProofs.filter((proof) => !proof.ok).length,
    },
    blockers,
    advisory,
    git,
    local_proofs: localProofs,
    deploy_proofs: deployProofs,
    external_proofs: externalProofs,
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(report, null, 2));

  if (STRICT && !report.launch_ready) {
    throw new Error(`Release readiness strict gate failed with ${blockers.length} blocker(s).`);
  }
}

function readProofStatus(spec) {
  const absolute = join(ROOT, spec.path);
  if (!existsSync(absolute)) {
    return {
      id: spec.id,
      path: spec.path,
      requirement: spec.requirement,
      ok: false,
      status: "missing",
      generated_at: null,
      details: null,
    };
  }

  try {
    const json = JSON.parse(readFileSync(absolute, "utf8"));
    return {
      id: spec.id,
      path: spec.path,
      requirement: spec.requirement,
      ok: json.ok === true,
      status: json.ok === true ? "passed" : "failed",
      generated_at: json.generated_at ?? null,
      details: summarizeProof(json),
    };
  } catch (error) {
    return {
      id: spec.id,
      path: spec.path,
      requirement: spec.requirement,
      ok: false,
      status: "invalid_json",
      generated_at: null,
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

function summarizeProof(json) {
  return {
    launch_ready: json.launch_ready,
    cloud_mode: json.cloud_mode,
    authenticated_proof_requested: json.authenticated_proof_requested,
    authenticated_proof_skipped: json.authenticated_proof_skipped,
    public_claims_review_status: json.public_claims_review_status,
    human_review_required_count: json.human_review_required_count,
    required_window_count: json.required_window_count,
    reviewed_window_count: json.reviewed_window_count,
    speaker_proof_generated_at: json.speaker_proof_generated_at,
    proof_scope: json.proof_scope,
    production_like: json.production_like,
    manifest_status: json.manifest_status,
    required_missing: json.required_missing,
    case_summary: json.case_summary,
    failures: Array.isArray(json.failures) ? json.failures.length : undefined,
    checks: Array.isArray(json.checks) ? json.checks.length : undefined,
  };
}

function localProofBlockers(localProofs) {
  return localProofs
    .filter((proof) => !proof.ok)
    .map((proof) => ({
      id: `local-proof-${proof.id}`,
      severity: "blocker",
      area: "local-proof",
      status: proof.status,
      summary: `${proof.id} is not passing.`,
      evidence: proof.path,
      next_action: "Rerun or repair the local proof before treating the app as a release candidate.",
    }));
}

function externalLaunchBlockers(localProofs, deployProofs, externalProofs) {
  const blockers = [];
  const speaker = proofById(localProofs, "speaker-attribution");
  const cloudLocal = proofById(localProofs, "cloud-sync-local");
  const cloudDeploy = proofById(deployProofs, "cloud-sync-deploy-proof");
  const sensitiveReview = proofById(externalProofs, "sensitive-attribution-review");
  const mobileDevice = proofById(externalProofs, "mobile-device-canary");
  const largeRealMedia = proofById(externalProofs, "large-real-media-canary");

  if (
    speaker?.details?.public_claims_review_status === "review_required_before_public_claims" &&
    sensitiveReview?.details?.public_claims_review_status !== "approved_for_public_claims"
  ) {
    blockers.push({
      id: "human-review-sensitive-attribution",
      severity: "blocker",
      area: "analysis",
      status: sensitiveReview?.details?.manifest_status ?? sensitiveReview?.status ?? "review_required",
      summary: "Speaker-attribution scoring passes, but sensitive public-claims rows still require human/editorial review.",
      evidence: sensitiveReview?.path ?? "docs/superpowers/validation/sensitive-attribution-review-proof.json",
      count: speaker.details.human_review_required_count,
      reviewed_count: sensitiveReview?.details?.reviewed_window_count,
      next_action: "Create the sensitive attribution review manifest, run npm run analysis:proof:sensitive-review, and approve every required window before public launch claims.",
    });
  }

  if (cloudLocal?.details?.cloud_mode !== "authenticated" || cloudLocal?.details?.authenticated_proof_requested !== true) {
    blockers.push({
      id: "authenticated-cloud-sync-not-proven",
      severity: "blocker",
      area: "cloud-sync",
      status: cloudLocal?.details?.cloud_mode ?? "unknown",
      summary: "Cross-device account-backed saved-session sync has not been proven with a real auth header.",
      evidence: cloudLocal?.path ?? "docs/superpowers/validation/cloud-sync-local-proof.json",
      next_action: "Run cloud sync proof with YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER against a Clerk/database configured environment, then repeat after production deploy.",
    });
  }

  if (cloudDeploy?.details?.cloud_mode !== "authenticated") {
    blockers.push({
      id: "production-authenticated-cloud-sync-not-proven",
      severity: "blocker",
      area: "cloud-sync",
      status: cloudDeploy?.details?.cloud_mode ?? "missing",
      summary: "Production cloud sync proof is not authenticated.",
      evidence: cloudDeploy?.path ?? "docs/superpowers/validation/cloud-sync-deploy-proof.json",
      next_action: "Run authenticated production cloud sync proof after deploy.",
    });
  }

  if (!mobileDevice?.ok || mobileDevice?.details?.production_like !== true) {
    blockers.push({
      id: "physical-ios-android-device-proof-missing",
      severity: "blocker",
      area: "mobile",
      status: mobileDevice?.details?.manifest_status ?? mobileDevice?.status ?? "missing",
      summary: "Physical iOS/Android share sheet, file picker, microphone, install/open, and restore behavior are not yet proven on real devices.",
      evidence: mobileDevice?.path ?? "docs/superpowers/validation/mobile-device-canary-proof.json",
      missing_device_items: Array.isArray(mobileDevice?.details?.required_missing)
        ? mobileDevice.details.required_missing
        : [],
      next_action: "Create the mobile device canary manifest, run npm run mobile:proof:devices against production, and keep evidence files for each required iOS and Android flow.",
    });
  }

  if (!largeRealMedia?.ok || largeRealMedia?.details?.production_like !== true) {
    const missing = Array.isArray(largeRealMedia?.details?.required_missing)
      ? largeRealMedia.details.required_missing
      : [];
    blockers.push({
      id: "large-real-media-production-canaries-missing",
      severity: "blocker",
      area: "ingestion",
      status: largeRealMedia?.details?.manifest_status ?? largeRealMedia?.status ?? "missing",
      summary: "Large real phone-recorded MP4/MOV/WebM and audio upload canaries have not been proven in a production-like Blob + Deepgram environment.",
      evidence: largeRealMedia?.path ?? "docs/superpowers/validation/large-real-media-canary-proof.json",
      missing_media_kinds: missing,
      next_action: "Create the large real media canary manifest, run npm run ingestion:proof:large-real-media against production with Blob and Deepgram configured, and keep the passing proof artifact.",
    });
  }

  blockers.push({
    id: "production-release-smoke-current-tree-missing",
    severity: "blocker",
    area: "release",
    status: "needs_redeploy_and_smoke",
    summary: "The current dirty tree has not been deployed and rerun through production launch smoke.",
    evidence: ".github/workflows/ci.yml",
    next_action: "Commit/push, get CI green, deploy, then run production smoke without YENTL_SMOKE_SKIP_INTERNAL and with Blob token smoke enabled.",
  });

  return blockers;
}

function advisoryItems(localProofs, deployProofs) {
  const newestLocal = newestGeneratedAt(localProofs);
  return deployProofs
    .filter((proof) => proof.ok && proof.generated_at && newestLocal && new Date(proof.generated_at) < newestLocal)
    .map((proof) => ({
      id: `deploy-proof-stale-${proof.id}`,
      severity: "advisory",
      area: "deploy-proof",
      status: "older_than_local_proofs",
      summary: `${proof.id} is older than the newest local proof and should be rerun after deploy.`,
      evidence: proof.path,
      generated_at: proof.generated_at,
    }));
}

function proofById(proofs, id) {
  return proofs.find((proof) => proof.id === id) ?? null;
}

function newestGeneratedAt(proofs) {
  const times = proofs
    .map((proof) => proof.generated_at ? new Date(proof.generated_at) : null)
    .filter((date) => date && !Number.isNaN(date.getTime()));
  if (!times.length) return null;
  return new Date(Math.max(...times.map((date) => date.getTime())));
}

function gitSnapshot() {
  try {
    const branch = execFileSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8" }).trim();
    const shortStatus = execFileSync("git", ["status", "--short"], { cwd: ROOT, encoding: "utf8" });
    const dirtyEntries = shortStatus.split("\n").filter(Boolean);
    return {
      branch,
      dirty_count: dirtyEntries.length,
      clean: dirtyEntries.length === 0,
    };
  } catch (error) {
    return {
      branch: null,
      dirty_count: null,
      clean: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
