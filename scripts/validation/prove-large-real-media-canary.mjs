#!/usr/bin/env node
import { upload } from "@vercel/blob/client";
import { existsSync, statSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const APP_ORIGIN = process.env.YENTL_REAL_MEDIA_CANARY_ORIGIN ?? "https://yentl.it";
const MANIFEST_PATH = process.env.YENTL_REAL_MEDIA_CANARY_MANIFEST
  ? resolvePath(process.env.YENTL_REAL_MEDIA_CANARY_MANIFEST)
  : join(ROOT, "agent-work/validation/large-real-media-canaries.json");
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/large-real-media-canary-proof.json");
const CONSENT_HEADER = "x-yentl-source-consent";
const CONSENT_VALUE = "source-analysis-v1";
const REQUEST_TIMEOUT_MS = Number(process.env.YENTL_REAL_MEDIA_CANARY_TIMEOUT_MS ?? 15 * 60 * 1000);
const MIN_BYTES = Number(process.env.YENTL_REAL_MEDIA_CANARY_MIN_BYTES ?? 4 * 1024 * 1024);
const BLOB_MULTIPART_THRESHOLD_BYTES = Number(
  process.env.YENTL_REAL_MEDIA_CANARY_MULTIPART_BYTES ?? 50 * 1024 * 1024,
);
const MAX_DURATION_SEC = 4 * 60 * 60;
const REQUIRED_MEDIA_KINDS = ["audio", "video/mp4", "video/quicktime", "video/webm"];
const ALLOWED_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-m4a",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

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

  const cases = normalizeCases(manifest);
  const requiredMissing = missingRequiredKinds(cases);
  const proofScope = isLocalOrigin(APP_ORIGIN) ? "local" : "deploy";
  const productionLike = proofScope === "deploy";

  if (manifestStatus === "loaded") {
    checks.push(await runCheck("app-reachable", assertAppIsServing));
    if (checks.every((check) => check.ok)) {
      checks.push(await runCheck("blob-token-preflight", () => proveUploadToken(cases[0])));
    }
    if (checks.every((check) => check.ok)) {
      for (const canary of cases) {
        checks.push(await runCheck(`real-media-${canary.id}`, () => proveRealMediaCase(canary)));
      }
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
    report_path: "docs/superpowers/validation/large-real-media-canary-proof.json",
    manifest_path: relative(ROOT, MANIFEST_PATH),
    manifest_status: manifestStatus,
    min_bytes: MIN_BYTES,
    blob_multipart_threshold_bytes: BLOB_MULTIPART_THRESHOLD_BYTES,
    required_media_kinds: REQUIRED_MEDIA_KINDS,
    required_missing: requiredMissing,
    case_summary: {
      total: cases.length,
      audio: cases.filter((canary) => canary.mime.startsWith("audio/")).length,
      video_mp4: cases.filter((canary) => canary.mime === "video/mp4").length,
      video_quicktime: cases.filter((canary) => canary.mime === "video/quicktime").length,
      video_webm: cases.filter((canary) => canary.mime === "video/webm").length,
    },
    checks,
    failures: failures.map(({ name, error }) => ({ name, error })),
    next_action: nextAction(manifestStatus, productionLike, requiredMissing, failures),
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    throw new Error(`Large real media canary is not launch-ready. Report: ${REPORT_PATH}`);
  }
}

function normalizeCases(manifest) {
  const rawCases = Array.isArray(manifest?.cases) ? manifest.cases : [];
  return rawCases.map((entry, index) => {
    const path = typeof entry.path === "string" ? resolvePath(entry.path) : "";
    const id = slug(entry.id ?? entry.label ?? basename(path) ?? `case-${index + 1}`);
    return {
      id,
      path,
      filename: typeof entry.filename === "string" ? entry.filename : basename(path),
      mime: typeof entry.mime === "string" ? entry.mime : inferMime(path),
      duration_sec: Number(entry.duration_sec),
      expected_phrases: Array.isArray(entry.expected_phrases)
        ? entry.expected_phrases.map(String).filter(Boolean)
        : [],
      min_utterances: Number.isFinite(Number(entry.min_utterances))
        ? Number(entry.min_utterances)
        : 1,
      min_speakers: Number.isFinite(Number(entry.min_speakers))
        ? Number(entry.min_speakers)
        : null,
    };
  });
}

function missingRequiredKinds(cases) {
  return REQUIRED_MEDIA_KINDS.filter((kind) => {
    if (kind === "audio") return !cases.some((canary) => canary.mime.startsWith("audio/"));
    return !cases.some((canary) => canary.mime === kind);
  });
}

async function assertAppIsServing() {
  const response = await fetchWithTimeout(`${APP_ORIGIN}/session`);
  assert(response.ok, `Yentl app returned ${response.status} at ${APP_ORIGIN}/session`);
  return { status: response.status };
}

async function proveUploadToken(firstCase) {
  assert(firstCase, "manifest must include at least one canary case");
  const response = await fetchWithTimeout(`${APP_ORIGIN}/api/upload-audio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [CONSENT_HEADER]: CONSENT_VALUE,
    },
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: {
        pathname: firstCase.filename,
        callbackUrl: `${APP_ORIGIN}/api/upload-audio`,
        clientPayload: JSON.stringify({ consent: CONSENT_VALUE }),
        multipart: true,
      },
    }),
  });
  const json = await response.json().catch(() => null);

  assert(response.status === 200, `upload token preflight returned ${response.status}: ${JSON.stringify(json)}`);
  assert(JSON.stringify(json).includes("clientToken"), `upload token response missing clientToken: ${JSON.stringify(json)}`);
  return {
    status: response.status,
    has_client_token: true,
  };
}

async function proveRealMediaCase(canary) {
  validateCanary(canary);
  const buffer = await readFile(canary.path);
  const blob = new Blob([buffer], { type: canary.mime });
  const blobResult = await upload(canary.filename, blob, {
    access: "private",
    handleUploadUrl: `${APP_ORIGIN}/api/upload-audio`,
    headers: {
      [CONSENT_HEADER]: CONSENT_VALUE,
    },
    clientPayload: JSON.stringify({ consent: CONSENT_VALUE }),
    contentType: canary.mime,
    multipart: buffer.length >= BLOB_MULTIPART_THRESHOLD_BYTES,
  });

  const response = await fetchWithTimeout(`${APP_ORIGIN}/api/transcribe-batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [CONSENT_HEADER]: CONSENT_VALUE,
    },
    body: JSON.stringify({
      blob_url: blobResult.url,
      duration_sec: canary.duration_sec,
    }),
  });
  const json = await response.json().catch(() => null);
  assert(response.status === 200, `transcribe-batch returned ${response.status}: ${JSON.stringify(json)}`);
  assert(!json?.validation_fixture, "real media canary must not use a synthetic validation fixture");
  assert(Array.isArray(json?.utterances), "transcribe-batch response missing utterances");
  assert(json.utterances.length >= canary.min_utterances, `expected at least ${canary.min_utterances} utterance(s), got ${json.utterances.length}`);
  assert(
    json.utterances.some((segment) => String(segment.text ?? "").trim().length > 0),
    "transcription returned only empty utterances",
  );
  if (canary.min_speakers !== null) {
    assert(Array.isArray(json.speakers), "transcribe-batch response missing speakers");
    assert(json.speakers.length >= canary.min_speakers, `expected at least ${canary.min_speakers} speaker(s), got ${json.speakers.length}`);
  }

  const transcript = json.utterances.map((segment) => String(segment.text ?? "")).join(" ");
  const missingPhrases = canary.expected_phrases.filter((phrase) => !includesLoose(transcript, phrase));
  assert(missingPhrases.length === 0, `transcript missing expected phrase(s): ${missingPhrases.join(", ")}`);

  return {
    file: relative(ROOT, canary.path),
    mime: canary.mime,
    byte_count: buffer.length,
    duration_sec: canary.duration_sec,
    used_blob_upload: true,
    used_multipart_blob_upload: buffer.length >= BLOB_MULTIPART_THRESHOLD_BYTES,
    utterance_count: json.utterances.length,
    speaker_count: Array.isArray(json.speakers) ? json.speakers.length : null,
    expected_phrase_count: canary.expected_phrases.length,
    transcript_preview: transcript.slice(0, 240),
  };
}

function validateCanary(canary) {
  assert(canary.path, "canary case missing path");
  assert(existsSync(canary.path), `file does not exist: ${canary.path}`);
  const stats = statSync(canary.path);
  assert(stats.size >= MIN_BYTES, `file must be at least ${MIN_BYTES} bytes to exercise Blob upload, got ${stats.size}`);
  assert(ALLOWED_MIME_TYPES.has(canary.mime), `unsupported media MIME type: ${canary.mime}`);
  assert(Number.isFinite(canary.duration_sec) && canary.duration_sec >= 0, "duration_sec must be a non-negative number");
  assert(canary.duration_sec <= MAX_DURATION_SEC, "duration_sec exceeds the 4-hour transcription cap");
}

async function runCheck(name, fn) {
  const startedAt = Date.now();
  try {
    const details = await fn();
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
    return `Create ${relative(ROOT, MANIFEST_PATH)} with real phone-recorded audio, MP4, MOV, and WebM cases.`;
  }
  if (manifestStatus === "invalid_manifest_json") {
    return "Fix the large real media canary manifest JSON.";
  }
  if (!productionLike) {
    return "Run this canary against the deployed production origin, not localhost.";
  }
  if (requiredMissing.length > 0) {
    return `Add missing required media kind(s): ${requiredMissing.join(", ")}.`;
  }
  if (failures.length > 0) {
    return "Repair the failed upload/transcription canary checks and rerun.";
  }
  return "Large real media canary passed.";
}

function fetchWithTimeout(url, init = {}) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

function isLocalOrigin(value) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(value);
}

function resolvePath(value) {
  if (value.startsWith("/")) return value;
  return join(ROOT, value);
}

function inferMime(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a")) return "audio/x-m4a";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return "application/octet-stream";
}

function includesLoose(haystack, needle) {
  return normalizeText(haystack).includes(normalizeText(needle));
}

function normalizeText(value) {
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "case";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
