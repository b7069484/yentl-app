#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const APP_ORIGIN = process.env.YENTL_DEVICE_CANARY_ORIGIN ?? "https://yentl.it";
const MANIFEST_PATH = process.env.YENTL_DEVICE_CANARY_MANIFEST
  ? resolvePath(process.env.YENTL_DEVICE_CANARY_MANIFEST)
  : join(ROOT, "agent-work/validation/mobile-device-canaries.json");
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/mobile-device-canary-proof.json");
const MAX_AGE_DAYS = Number(process.env.YENTL_DEVICE_CANARY_MAX_AGE_DAYS ?? 14);

const REQUIRED_PLATFORMS = ["ios", "android"];
const REQUIRED_FLOWS = [
  "share_text",
  "share_web_url",
  "share_media_url",
  "file_picker_audio_video",
  "file_picker_text_document",
  "microphone_capture",
  "pwa_install_open",
  "saved_session_restore",
];

async function main() {
  const checks = [];
  let manifest = null;
  let manifestStatus = "loaded";

  if (!existsSync(MANIFEST_PATH)) {
    manifestStatus = "missing_manifest";
  } else {
    try {
      manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    } catch (error) {
      manifestStatus = "invalid_manifest_json";
      checks.push(failedCheck("manifest-json", error));
    }
  }

  const runs = Array.isArray(manifest?.runs) ? manifest.runs : [];
  const proofScope = isLocalOrigin(APP_ORIGIN) ? "local" : "deploy";
  const productionLike = proofScope === "deploy";
  const requiredMissing = requiredMissingItems(runs);

  if (manifestStatus === "loaded") {
    checks.push(await runCheck("manifest-origin", () => proveManifestOrigin(manifest)));
    for (const platform of REQUIRED_PLATFORMS) {
      checks.push(await runCheck(`device-${platform}`, () => provePlatformRun(platform, runs)));
    }
  }

  const failures = checks.filter((check) => !check.ok);
  const report = {
    ok: manifestStatus === "loaded" &&
      productionLike &&
      requiredMissing.length === 0 &&
      failures.length === 0,
    launch_ready: false,
    generated_at: new Date().toISOString(),
    app_origin: APP_ORIGIN,
    proof_scope: proofScope,
    production_like: productionLike,
    report_path: "docs/superpowers/validation/mobile-device-canary-proof.json",
    manifest_path: relative(ROOT, MANIFEST_PATH),
    manifest_status: manifestStatus,
    max_age_days: MAX_AGE_DAYS,
    required_platforms: REQUIRED_PLATFORMS,
    required_flows: REQUIRED_FLOWS,
    required_missing: requiredMissing,
    platform_summary: platformSummary(runs),
    checks,
    failures: failures.map(({ name, error }) => ({ name, error })),
    next_action: nextAction(manifestStatus, productionLike, requiredMissing, failures),
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    throw new Error(`Mobile device canary is not launch-ready. Report: ${REPORT_PATH}`);
  }
}

function proveManifestOrigin(manifest) {
  const origin = String(manifest?.app_origin ?? APP_ORIGIN);
  assert(!isLocalOrigin(origin), "physical device proof must target a deployed origin, not localhost");
  assert(origin === APP_ORIGIN, `manifest app_origin ${origin} does not match ${APP_ORIGIN}`);
  return { app_origin: origin };
}

function provePlatformRun(platform, runs) {
  const run = runs.find((entry) => normalizePlatform(entry?.platform) === platform);
  assert(run, `missing ${platform} device run`);
  assert(typeof run.device_model === "string" && run.device_model.trim(), `${platform} run missing device_model`);
  assert(typeof run.os_version === "string" && run.os_version.trim(), `${platform} run missing os_version`);
  assert(typeof run.browser === "string" && run.browser.trim(), `${platform} run missing browser`);
  assert(typeof run.tested_at === "string" && run.tested_at.trim(), `${platform} run missing tested_at`);
  const testedAt = new Date(run.tested_at);
  assert(Number.isFinite(testedAt.getTime()), `${platform} tested_at is not a valid date`);
  const ageDays = (Date.now() - testedAt.getTime()) / (24 * 60 * 60 * 1000);
  assert(ageDays <= MAX_AGE_DAYS, `${platform} run is stale: ${ageDays.toFixed(1)} days old`);

  const flows = Array.isArray(run.flows) ? run.flows : [];
  const missing = missingFlows(flows);
  assert(missing.length === 0, `${platform} missing passing flow(s): ${missing.join(", ")}`);

  let evidenceCount = 0;
  for (const flow of flows.filter((entry) => REQUIRED_FLOWS.includes(entry?.id))) {
    assert(flow.status === "pass", `${platform} ${flow.id} status is not pass`);
    assert(Array.isArray(flow.evidence) && flow.evidence.length > 0, `${platform} ${flow.id} missing evidence`);
    for (const evidencePath of flow.evidence) {
      const resolved = resolvePath(String(evidencePath));
      assert(existsSync(resolved), `${platform} ${flow.id} evidence does not exist: ${evidencePath}`);
      assert(statSync(resolved).size > 0, `${platform} ${flow.id} evidence is empty: ${evidencePath}`);
      evidenceCount += 1;
    }
  }

  return {
    platform,
    device_model: run.device_model,
    os_version: run.os_version,
    browser: run.browser,
    tested_at: run.tested_at,
    age_days: Number(ageDays.toFixed(2)),
    passing_flows: REQUIRED_FLOWS.length,
    evidence_count: evidenceCount,
  };
}

function requiredMissingItems(runs) {
  const missing = [];
  for (const platform of REQUIRED_PLATFORMS) {
    const run = runs.find((entry) => normalizePlatform(entry?.platform) === platform);
    if (!run) {
      missing.push(`${platform}:run`);
      continue;
    }
    for (const flow of missingFlows(Array.isArray(run.flows) ? run.flows : [])) {
      missing.push(`${platform}:${flow}`);
    }
  }
  return missing;
}

function missingFlows(flows) {
  return REQUIRED_FLOWS.filter((flowId) => {
    const flow = flows.find((entry) => entry?.id === flowId);
    return !flow || flow.status !== "pass";
  });
}

function platformSummary(runs) {
  return Object.fromEntries(REQUIRED_PLATFORMS.map((platform) => {
    const run = runs.find((entry) => normalizePlatform(entry?.platform) === platform);
    return [platform, {
      present: Boolean(run),
      passing_flows: Array.isArray(run?.flows)
        ? REQUIRED_FLOWS.filter((flowId) => run.flows.some((flow) => flow.id === flowId && flow.status === "pass")).length
        : 0,
      required_flows: REQUIRED_FLOWS.length,
      device_model: run?.device_model ?? null,
      os_version: run?.os_version ?? null,
      browser: run?.browser ?? null,
    }];
  }));
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

function failedCheck(name, error, elapsedMs = 0) {
  return {
    name,
    ok: false,
    elapsed_ms: elapsedMs,
    error: error instanceof Error ? error.message : String(error),
  };
}

function nextAction(manifestStatus, productionLike, requiredMissing, failures) {
  if (manifestStatus === "missing_manifest") {
    return `Create ${relative(ROOT, MANIFEST_PATH)} with real iOS and Android canary results and evidence files.`;
  }
  if (manifestStatus === "invalid_manifest_json") {
    return "Fix the mobile device canary manifest JSON.";
  }
  if (!productionLike) {
    return "Run the physical device canary against the deployed production origin, not localhost.";
  }
  if (requiredMissing.length > 0) {
    return `Complete missing device proof item(s): ${requiredMissing.join(", ")}.`;
  }
  if (failures.length > 0) {
    return "Repair the failed device canary checks and rerun.";
  }
  return "Physical iOS and Android device canaries passed.";
}

function normalizePlatform(value) {
  const normalized = String(value ?? "").toLowerCase().trim();
  if (normalized === "iphone" || normalized === "ipad") return "ios";
  return normalized;
}

function isLocalOrigin(value) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(value);
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
