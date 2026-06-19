#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const TEMPLATE_DIR = join(ROOT, "agent-work/validation");
const SUMMARY_PATH = join(ROOT, "docs/superpowers/validation/launch-canary-template-summary.json");
const SPEAKER_PROOF_PATH = join(ROOT, "docs/superpowers/validation/speaker-attribution-proof.json");
const DEFAULT_APP_ORIGIN = process.env.YENTL_LAUNCH_CANARY_ORIGIN ?? "https://yentl.it";

const MOBILE_FLOWS = [
  "share_text",
  "share_web_url",
  "share_media_url",
  "file_picker_audio_video",
  "file_picker_text_document",
  "microphone_capture",
  "pwa_install_open",
  "saved_session_restore",
];

const MEDIA_CASES = [
  {
    id: "phone_audio_real_world",
    filename: "replace-with-phone-audio.m4a",
    mime: "audio/mp4",
    path: "agent-work/validation/real-media/replace-with-phone-audio.m4a",
  },
  {
    id: "phone_video_mp4_real_world",
    filename: "replace-with-phone-video.mp4",
    mime: "video/mp4",
    path: "agent-work/validation/real-media/replace-with-phone-video.mp4",
  },
  {
    id: "phone_video_mov_real_world",
    filename: "replace-with-iphone-video.mov",
    mime: "video/quicktime",
    path: "agent-work/validation/real-media/replace-with-iphone-video.mov",
  },
  {
    id: "phone_video_webm_real_world",
    filename: "replace-with-android-or-browser-video.webm",
    mime: "video/webm",
    path: "agent-work/validation/real-media/replace-with-android-or-browser-video.webm",
  },
];

async function main() {
  const speakerProof = await readJson(SPEAKER_PROOF_PATH);
  const requiredWindows = Array.isArray(speakerProof?.human_review_required_windows)
    ? speakerProof.human_review_required_windows
    : [];

  const templates = [
    {
      id: "sensitive-attribution-review",
      path: join(TEMPLATE_DIR, "sensitive-attribution-reviews.template.json"),
      command: "npm run analysis:proof:sensitive-review",
      manifest_path: "agent-work/validation/sensitive-attribution-reviews.json",
      content: sensitiveAttributionTemplate(speakerProof, requiredWindows),
    },
    {
      id: "mobile-device-canaries",
      path: join(TEMPLATE_DIR, "mobile-device-canaries.template.json"),
      command: "npm run mobile:proof:devices",
      manifest_path: "agent-work/validation/mobile-device-canaries.json",
      content: mobileDeviceTemplate(),
    },
    {
      id: "large-real-media-canaries",
      path: join(TEMPLATE_DIR, "large-real-media-canaries.template.json"),
      command: "npm run ingestion:proof:large-real-media",
      manifest_path: "agent-work/validation/large-real-media-canaries.json",
      content: largeRealMediaTemplate(),
    },
  ];

  if (!DRY_RUN) {
    await mkdir(TEMPLATE_DIR, { recursive: true });
    await mkdir(dirname(SUMMARY_PATH), { recursive: true });
  }

  const writtenTemplates = [];
  for (const template of templates) {
    const exists = existsSync(template.path);
    const status = exists && !FORCE ? "exists_skipped" : DRY_RUN ? "dry_run" : "written";
    if (!DRY_RUN && (!exists || FORCE)) {
      await writeFile(template.path, `${JSON.stringify(template.content, null, 2)}\n`);
    }
    writtenTemplates.push({
      id: template.id,
      status,
      path: relative(ROOT, template.path),
      copy_to_manifest_path: template.manifest_path,
      proof_command: template.command,
    });
  }

  const summary = {
    ok: true,
    generated_at: new Date().toISOString(),
    dry_run: DRY_RUN,
    force: FORCE,
    report_path: "docs/superpowers/validation/launch-canary-template-summary.json",
    speaker_proof_path: "docs/superpowers/validation/speaker-attribution-proof.json",
    speaker_proof_generated_at: speakerProof?.generated_at ?? null,
    sensitive_review_required_windows: requiredWindows.length,
    templates: writtenTemplates,
    next_actions: [
      "Copy each .template.json to its matching manifest path only when real evidence is ready.",
      "Replace placeholders with real reviewer/device/media values.",
      "Run each proof command; release readiness remains blocked until these commands pass against real evidence.",
    ],
  };

  if (!DRY_RUN) {
    await writeFile(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`);
  }

  console.log(JSON.stringify(summary, null, 2));
}

function sensitiveAttributionTemplate(speakerProof, requiredWindows) {
  return {
    _template: true,
    _copy_to: "agent-work/validation/sensitive-attribution-reviews.json",
    _proof_command: "npm run analysis:proof:sensitive-review",
    _instructions: [
      "Use this as a worksheet. Do not copy it to the manifest until an editor has reviewed every required window.",
      "The passing manifest must use status approved_for_public_claims and public_claims_allowed true for each window.",
      "Keep notes specific: quote/endorsement boundaries, speaker ownership, and why public-facing claims are safe.",
    ],
    speaker_proof_generated_at: speakerProof?.generated_at ?? "",
    reviews: requiredWindows.map((window) => ({
      window_id: window.window_id,
      source_id: window.source_id,
      failure_family: window.failure_family,
      expected_risk: window.expected_risk,
      status: "pending_editorial_review",
      public_claims_allowed: false,
      reviewer: "",
      reviewed_at: "",
      notes: "",
    })),
  };
}

function mobileDeviceTemplate() {
  return {
    _template: true,
    _copy_to: "agent-work/validation/mobile-device-canaries.json",
    _proof_command: "npm run mobile:proof:devices",
    _instructions: [
      "Run this on physical iOS and Android devices against the deployed app origin.",
      "Every required flow must pass and point to a non-empty local evidence file.",
      "Evidence files can be screenshots, short notes, exported browser logs, or videos kept under agent-work/validation/evidence/mobile/.",
    ],
    app_origin: DEFAULT_APP_ORIGIN,
    runs: ["ios", "android"].map((platform) => ({
      platform,
      device_model: "",
      os_version: "",
      browser: platform === "ios" ? "Safari" : "Chrome",
      tested_at: "",
      flows: MOBILE_FLOWS.map((id) => ({
        id,
        status: "pending",
        evidence: [`agent-work/validation/evidence/mobile/${platform}/${id}.md`],
        notes: "",
      })),
    })),
  };
}

function largeRealMediaTemplate() {
  return {
    _template: true,
    _copy_to: "agent-work/validation/large-real-media-canaries.json",
    _proof_command: "npm run ingestion:proof:large-real-media",
    _instructions: [
      "Use real phone-recorded media, not the deterministic validation fixtures.",
      "Each file must be at least 4 MB unless YENTL_REAL_MEDIA_CANARY_MIN_BYTES is deliberately changed.",
      "Run against a production-like origin with Blob upload and Deepgram configured.",
    ],
    app_origin: DEFAULT_APP_ORIGIN,
    cases: MEDIA_CASES.map((item) => ({
      ...item,
      duration_sec: null,
      expected_phrases: ["replace with an exact phrase spoken in the recording"],
      min_utterances: 1,
      min_speakers: 1,
    })),
  };
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
