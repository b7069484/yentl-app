#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";

const ROOT = process.cwd();
const FROM_EXISTING = process.env.YENTL_EXTENSION_LATENCY_FROM_EXISTING === "1";
const RUNS = Math.max(1, Number(process.env.YENTL_EXTENSION_LATENCY_RUNS ?? 3));
const OUTPUT_PATH = resolveRootOrAbsolute(
  process.env.YENTL_EXTENSION_LATENCY_OUTPUT ??
    "docs/superpowers/validation/extension-latency-samples.json",
);
const LOCAL_PROOF_PATH = join(ROOT, "docs/superpowers/validation/installed-extension-local-proof.json");
const EXTERNAL_PROOF_PATH = join(ROOT, "docs/superpowers/validation/installed-extension-external-proof.json");
const PROOF_SCRIPT = "scripts/validation/prove-installed-extension-local.mjs";
const LATENCY_KEYS = [
  "total_ms",
  "media_ready_ms",
  "capture_invocation_ms",
  "panel_injection_ms",
  "first_transcript_wait_ms",
  "first_transcript_event_ms",
  "manual_capture_wait_ms",
];

async function main() {
  const samples = FROM_EXISTING ? samplesFromExistingProofs() : runLiveSamples();
  if (samples.length === 0) {
    throw new Error("No extension latency samples were available.");
  }

  const report = {
    ok: samples.every((sample) => sample.ok),
    generated_at: new Date().toISOString(),
    source: FROM_EXISTING ? "existing-proof-artifacts" : "live-proof-runs",
    requested_runs: FROM_EXISTING ? 0 : RUNS,
    sample_count: samples.length,
    app_origin: firstDefined(samples.map((sample) => sample.app_origin)),
    target_urls: unique(samples.map((sample) => sample.target_url).filter(Boolean)),
    invocation_paths: unique(samples.map((sample) => sample.invocation_path).filter(Boolean)),
    proof_modes: unique(samples.map((sample) => sample.proof_mode).filter(Boolean)),
    latency_ms: summarizeLatency(samples),
    samples,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

function runLiveSamples() {
  const samples = [];
  for (let index = 1; index <= RUNS; index += 1) {
    const env = {
      ...process.env,
      YENTL_EXTENSION_PROOF_HEADLESS: process.env.YENTL_EXTENSION_PROOF_HEADLESS ?? "1",
    };
    execFileSync(process.execPath, [PROOF_SCRIPT], {
      cwd: ROOT,
      env,
      encoding: "utf8",
      stdio: "pipe",
    });
    samples.push(readProofSample(LOCAL_PROOF_PATH, index));
  }
  return samples;
}

function samplesFromExistingProofs() {
  return [LOCAL_PROOF_PATH, EXTERNAL_PROOF_PATH]
    .filter((path) => existsSync(path))
    .map((path, index) => readProofSample(path, index + 1));
}

function readProofSample(path, index) {
  const proof = JSON.parse(readFileSync(path, "utf8"));
  return {
    sample_index: index,
    proof_path: relative(ROOT, path),
    generated_at: proof.generated_at,
    ok: Boolean(proof.ok),
    external_proof: Boolean(proof.external_proof),
    proof_mode: proof.external_proof ? "external" : "local",
    app_origin: proof.app_origin ?? null,
    target_url: proof.target_url ?? null,
    headless: Boolean(proof.headless),
    invocation_path: proof.proof?.invocation_path ?? null,
    panel_injection_proven: Boolean(proof.proof?.panel_injection_proven),
    tab_capture_stream_id_available: Boolean(proof.proof?.tab_capture_stream_id_available),
    live_transcription_proven: Boolean(proof.proof?.live_transcription_proven),
    page_text_proven: Boolean(proof.proof?.page_text_proven),
    latency_ms: proof.latency_ms ?? {},
    failure_reason: proof.failure_reason ?? null,
  };
}

function summarizeLatency(samples) {
  const summary = {};
  for (const key of LATENCY_KEYS) {
    const values = samples
      .map((sample) => sample.latency_ms?.[key])
      .filter((value) => typeof value === "number" && Number.isFinite(value));
    summary[key] = values.length
      ? {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
          values,
        }
      : {
          count: 0,
          min: null,
          max: null,
          avg: null,
          values: [],
        };
  }
  return summary;
}

function unique(values) {
  return [...new Set(values)];
}

function firstDefined(values) {
  return values.find((value) => value != null) ?? null;
}

function resolveRootOrAbsolute(path) {
  return isAbsolute(path) ? path : join(ROOT, path);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
