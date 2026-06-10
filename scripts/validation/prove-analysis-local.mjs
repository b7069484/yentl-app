#!/usr/bin/env node
import { copyFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const APP_ORIGIN = process.env.YENTL_ANALYSIS_PROOF_ORIGIN ?? "http://127.0.0.1:3000";
const VERIFY_MODE = process.env.YENTL_ANALYSIS_PROOF_VERIFY ?? "none";
const IS_DEPLOY = !/localhost|127\.0\.0\.1/i.test(APP_ORIGIN);
const REPORT_PATH = join(
  ROOT,
  IS_DEPLOY
    ? `docs/superpowers/validation/analysis-deploy-${VERIFY_MODE}-proof.json`
    : "docs/superpowers/validation/analysis-local-proof.json",
);
const REPLAY_IDS = (process.env.YENTL_ANALYSIS_PROOF_IDS ?? "cable_008,solo_005,interview_002")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const MAX_UTTERANCES = Number(
  process.env.YENTL_ANALYSIS_PROOF_MAX_UTTERANCES ?? (IS_DEPLOY ? 10 : 12),
);

async function main() {
  assert(
    ["none", "provisional", "confirmed", "both"].includes(VERIFY_MODE),
    `YENTL_ANALYSIS_PROOF_VERIFY must be none, provisional, confirmed, or both; got ${VERIFY_MODE}`,
  );

  await assertAppIsServing();

  const replayBackups = IS_DEPLOY ? await backupReplayFixtures(REPLAY_IDS) : null;
  try {
    await runAnalysisProof(replayBackups);
  } finally {
    if (replayBackups) {
      await restoreReplayFixtures(replayBackups);
    }
  }
}

async function runAnalysisProof(replayBackups) {
  const checks = [];
  for (const id of REPLAY_IDS) {
    checks.push(await runCheck(`corpus-replay-${id}`, () => proveCorpusReplay(id)));
  }
  if (!IS_DEPLOY) {
    checks.push(await runCheck("speaker-attribution-score", proveSpeakerAttribution));
  }

  const failures = checks.filter((check) => !check.ok);
  const report = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    app_origin: APP_ORIGIN,
    verify_mode: VERIFY_MODE,
    deploy_proof: IS_DEPLOY,
    replay_ids: REPLAY_IDS,
    max_utterances: MAX_UTTERANCES,
    checks,
    failures: failures.map(({ name, error }) => ({ name, error })),
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    throw new Error(`Analysis proof failed. Report: ${REPORT_PATH}`);
  }

  console.log(JSON.stringify(report, null, 2));
}

async function backupReplayFixtures(ids) {
  const backups = new Map();
  for (const id of ids) {
    const replayPath = join(ROOT, "test-corpus/scores", `${id}.replay.json`);
    try {
      backups.set(id, await readFile(replayPath, "utf8"));
    } catch {
      // Fixture may not exist for every replay id.
    }
  }
  return backups;
}

async function restoreReplayFixtures(backups) {
  for (const [id, content] of backups) {
    const replayPath = join(ROOT, "test-corpus/scores", `${id}.replay.json`);
    await writeFile(replayPath, content);
  }
}

async function assertAppIsServing() {
  let response;
  try {
    response = await fetch(`${APP_ORIGIN}/session`, { signal: AbortSignal.timeout(8000) });
  } catch (error) {
    throw new Error(
      `Yentl app is not reachable at ${APP_ORIGIN}/session. Start the dev server or choose a deployed origin. (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (!response.ok) {
    throw new Error(`Yentl app returned ${response.status} at ${APP_ORIGIN}/session`);
  }
}

async function runCheck(name, fn) {
  const startedAt = Date.now();
  try {
    const details = await fn();
    return { name, ok: true, elapsed_ms: Date.now() - startedAt, ...details };
  } catch (error) {
    return {
      name,
      ok: false,
      elapsed_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function proveCorpusReplay(id) {
  await runNpmScript("corpus:replay", [
    `--base-url=${APP_ORIGIN}`,
    `--id=${id}`,
    `--verify=${VERIFY_MODE}`,
    `--max-utterances=${MAX_UTTERANCES}`,
  ]);

  const replayPath = join(ROOT, "test-corpus/scores", `${id}.replay.json`);
  const replay = JSON.parse(await readFile(replayPath, "utf8"));
  if (IS_DEPLOY) {
    const deployArtifactDir = join(ROOT, "docs/superpowers/validation/replay-deploy", VERIFY_MODE);
    await mkdir(deployArtifactDir, { recursive: true });
    await copyFile(replayPath, join(deployArtifactDir, `${id}.replay.json`));
  }

  assert(replay.id === id, `replay id mismatch for ${id}`);
  const rhetoricErrors = (replay.errors ?? []).filter((error) => String(error.stage).startsWith("rhetoric:"));
  const fatalErrors = (replay.errors ?? []).filter((error) => !String(error.stage).startsWith("rhetoric:"));
  assert(fatalErrors.length === 0, `${id} replay returned errors: ${JSON.stringify(fatalErrors)}`);
  if (IS_DEPLOY && rhetoricErrors.length > 0) {
    assert(
      replay.claims.length >= 1 || replay.markers.length >= 1,
      `${id} replay only returned rhetoric errors without analysis output`,
    );
  } else {
    assert(replay.errors?.length === 0, `${id} replay returned errors: ${JSON.stringify(replay.errors)}`);
  }
  assert(replay.utterancesReplayed >= 1, `${id} replay did not process utterances`);
  assert(replay.baseUrl?.startsWith(APP_ORIGIN), `${id} replay used unexpected base URL ${replay.baseUrl}`);
  assert(replay.verify === VERIFY_MODE, `${id} replay verify mode mismatch`);

  assertVerificationOutcomes(replay);

  if (id === "cable_008") {
    assert(replay.claims.length >= 1, "cable_008 should extract at least one claim");
    if (VERIFY_MODE === "none") {
      assert(replay.markers.length >= 1, "cable_008 should extract at least one rhetoric marker");
    }
    assert(
      replay.claims.every((claim) => typeof claim.speaker_id === "number" || claim.speaker_id === null),
      "cable_008 claims should preserve speaker ownership metadata",
    );
  }

  if (id === "solo_005") {
    assert(replay.claims.length >= 1, "solo_005 should extract at least one claim");
  }

  if (id === "interview_002") {
    assert(
      replay.markers.length >= 1 || replay.claims.length >= 1,
      "interview_002 should produce claims or rhetoric markers",
    );
  }

  return {
    replay_path: replayPath,
    claims: replay.claims.length,
    markers: replay.markers.length,
    utterances_replayed: replay.utterancesReplayed,
    verified_claims: replay.claims.filter((claim) => claim.status === VERIFY_MODE || claim.status === "confirmed").length,
    rhetoric_errors: rhetoricErrors.length,
    verify_mode: replay.verify,
  };
}

function assertVerificationOutcomes(replay) {
  if (VERIFY_MODE === "none") return;
  if (replay.claims.length === 0) {
    assert(
      replay.markers.length >= 1,
      `${replay.id} should produce claims or rhetoric markers before verification proof`,
    );
    return;
  }

  const provisionalClaims =
    VERIFY_MODE === "provisional" || VERIFY_MODE === "both"
      ? replay.claims.filter((claim) => claim.status === "provisional" || claim.status === "confirmed")
      : [];
  const confirmedClaims =
    VERIFY_MODE === "confirmed" || VERIFY_MODE === "both"
      ? replay.claims.filter((claim) => claim.status === "confirmed")
      : [];

  if (VERIFY_MODE === "provisional" || VERIFY_MODE === "both") {
    assert(provisionalClaims.length >= 1, `${replay.id} produced no successful provisional verifications`);
    for (const claim of provisionalClaims) {
      assert(claim.provisional != null, `${replay.id} claim missing provisional verification`);
      assert(
        typeof claim.provisional.primary_label === "string",
        `${replay.id} provisional verification missing primary_label`,
      );
    }
  }

  if (VERIFY_MODE === "confirmed" || VERIFY_MODE === "both") {
    assert(confirmedClaims.length >= 1, `${replay.id} produced no successful confirmed verifications`);
    for (const claim of confirmedClaims) {
      assert(claim.confirmed != null, `${replay.id} claim missing confirmed verification`);
      assert(
        typeof claim.confirmed.primary_label === "string",
        `${replay.id} confirmed verification missing primary_label`,
      );
    }
  }
}

async function proveSpeakerAttribution() {
  const output = await runNpmScript("speaker-attribution:score");
  const reportPath = join(ROOT, "test-corpus/speaker-attribution/report/speaker-attribution-report.json");
  const report = JSON.parse(await readFile(reportPath, "utf8"));

  assert(report.summary.scored >= 9, `expected at least 9 scored attribution windows, got ${report.summary.scored}`);
  assert(
    report.summary.mean_speaker_purity >= 0.95,
    `speaker purity too low: ${report.summary.mean_speaker_purity}`,
  );
  assert(
    report.summary.mean_claim_owner_accuracy >= 0.95,
    `claim-owner accuracy too low: ${report.summary.mean_claim_owner_accuracy}`,
  );
  assert(/Mean speaker purity/i.test(output), "speaker-attribution:score stdout missing purity summary");

  return {
    report_path: reportPath,
    windows: report.summary.windows,
    scored: report.summary.scored,
    mean_speaker_purity: report.summary.mean_speaker_purity,
    mean_claim_owner_accuracy: report.summary.mean_claim_owner_accuracy,
    unsafe_attribution_recall: report.summary.unsafe_attribution_recall,
  };
}

function runNpmScript(scriptName, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", scriptName, "--", ...extraArgs], {
      cwd: ROOT,
      env: {
        ...process.env,
        YENTL_ANALYSIS_PROOF_ORIGIN: APP_ORIGIN,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      process.stderr.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${scriptName} failed with exit ${code}: ${stderr || stdout}`));
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});