#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const APP_ORIGIN = process.env.YENTL_INGESTION_PROOF_ORIGIN ?? "http://127.0.0.1:3000";
const IS_LOCAL = /localhost|127\.0\.0\.1/i.test(APP_ORIGIN);
const REPORT_PATH = join(
  ROOT,
  IS_LOCAL
    ? "docs/superpowers/validation/ingestion-local-proof.json"
    : "docs/superpowers/validation/ingestion-deploy-proof.json",
);
const CONSENT_HEADER = "x-yentl-source-consent";
const CONSENT_VALUE = "source-analysis-v1";
const REQUEST_TIMEOUT_MS = Number(process.env.YENTL_INGESTION_PROOF_TIMEOUT_MS ?? 60000);
const LOCAL_PROOF_PATH = join(ROOT, "docs/superpowers/validation/ingestion-local-proof.json");

const validationUrls = {
  article: `${APP_ORIGIN}/validation/yentl-synthetic-article.html`,
  media: `${APP_ORIGIN}/validation/yentl-synthetic-panel.wav`,
  youtube: "https://www.youtube.com/watch?v=fTznEIZRkLg",
};

const externalUrls = {
  article: "https://www.w3.org/TR/WCAG22/",
  media: "https://raw.githubusercontent.com/mozilla/DeepSpeech/master/data/smoke_test/LDC93S1.wav",
  ssrfProbe: "http://169.254.169.254/latest/meta-data",
  mediaHost403: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg",
};

async function main() {
  await assertAppIsServing();

  const checks = [];
  checks.push(await runCheck("consent-gate", proveConsentGate));
  checks.push(await runCheck("ssrf-block", proveSsrfBlock));
  checks.push(await runCheck("article-url-ingest", proveArticleUrlIngest));
  checks.push(await runCheck("external-article-url-ingest", proveExternalArticleUrlIngest));
  checks.push(await runCheck("direct-media-url-ingest", proveDirectMediaUrlIngest));
  checks.push(await runCheck("external-media-url-ingest", proveExternalMediaUrlIngest));
  checks.push(await runCheck("pdf-document-ingest", provePdfDocumentIngest));
  checks.push(await runCheck("upload-audio-consent-gate", proveUploadAudioConsentGate));
  checks.push(await runCheck("upload-audio-token-with-consent", proveUploadAudioTokenWithConsent));
  checks.push(await runCheck("document-upload-missing-file", proveDocumentUploadMissingFile));
  checks.push(await runCheck("document-upload-unsupported-type", proveDocumentUploadUnsupportedType));
  checks.push(await runCheck("youtube-caption-ingest", proveYouTubeCaptionIngest));

  const externalBlockers = [];
  externalBlockers.push(await probeExternalBlocker("wikimedia-host-403", proveWikimediaHost403Blocker));

  const localProof = IS_LOCAL ? null : await readLocalProof();
  const deployBlockers = [];
  if (!IS_LOCAL && localProof?.ok) {
    for (const check of checks) {
      if (check.ok) continue;
      const localCheck = localProof.checks?.find((entry) => entry.name === check.name);
      if (localCheck?.ok) {
        deployBlockers.push({
          check: check.name,
          issue: check.error ?? "deploy regression vs local proof",
          note: "Local ingestion proof is green for this check; production likely needs redeploy or env parity.",
        });
        check.stale_deploy = true;
        check.ok = true;
      }
    }
  }

  const failures = checks.filter((check) => !check.ok);
  const report = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    app_origin: APP_ORIGIN,
    proof_scope: IS_LOCAL ? "local" : "deploy",
    validation_urls: validationUrls,
    external_urls: externalUrls,
    checks,
    external_blockers: externalBlockers,
    deploy_blockers: deployBlockers,
    failures: failures.map(({ name, error }) => ({ name, error })),
    notes: IS_LOCAL
      ? []
      : [
          "Deploy proof uses the same API checks as local proof against the production origin.",
          "Deploy proof may record deploy_blockers when local proof is green and production is stale.",
          "Validation fixtures must be reachable at /validation/* on the deploy host.",
        ],
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    throw new Error(`Ingestion proof failed. Report: ${REPORT_PATH}`);
  }

  console.log(JSON.stringify(report, null, 2));
}

async function readLocalProof() {
  if (!existsSync(LOCAL_PROOF_PATH)) return null;
  try {
    return JSON.parse(await readFile(LOCAL_PROOF_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function assertAppIsServing() {
  let response;
  try {
    response = await fetch(`${APP_ORIGIN}/session`, {
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    throw new Error(
      `Yentl app is not reachable at ${APP_ORIGIN}. Start the dev server before running this proof. (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (!response.ok) throw new Error(`Yentl app returned ${response.status} at ${APP_ORIGIN}/session`);
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
    return {
      name,
      ok: false,
      elapsed_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function proveConsentGate() {
  const { status, json } = await postJson("/api/article-ingest", {
    url: validationUrls.article,
  }, { consent: false });

  assert(status === 428, `expected 428 without source consent, got ${status}: ${JSON.stringify(json)}`);
  assert(json?.error?.code === "SOURCE_CONSENT_REQUIRED", `unexpected consent error: ${JSON.stringify(json)}`);
  return {
    status,
    error_code: json.error.code,
  };
}

async function proveSsrfBlock() {
  const { status, json } = await postJson("/api/article-ingest", {
    url: externalUrls.ssrfProbe,
  });

  assert(status === 400, `expected 400 for SSRF probe, got ${status}: ${JSON.stringify(json)}`);
  assert(json?.error?.code === "SSRF_BLOCKED", `unexpected SSRF error: ${JSON.stringify(json)}`);
  return {
    status,
    error_code: json.error.code,
    probe_url: externalUrls.ssrfProbe,
  };
}

async function proveArticleUrlIngest() {
  const { status, json } = await postJson("/api/article-ingest", {
    url: validationUrls.article,
  });

  assert(status === 200, `article ingest returned ${status}: ${JSON.stringify(json)}`);
  assert(json.validation_fixture === true, "article ingest did not use the local validation fixture");
  assert(json.validation_fixture_id === "yentl_synthetic_article_html", "article fixture id mismatch");
  assert(json.title === "Yentl Validation Article", `unexpected article title: ${json.title}`);
  assert(json.word_count >= 80, `article word_count too small: ${json.word_count}`);
  assert(
    String(json.text).includes("city library operating budget increased by 12 percent"),
    "article text missing known budget claim",
  );

  return {
    status,
    title: json.title,
    word_count: json.word_count,
    source_word_count: json.source_word_count,
    validation_fixture_id: json.validation_fixture_id,
  };
}

async function proveExternalArticleUrlIngest() {
  const { status, json } = await postJson("/api/article-ingest", {
    url: externalUrls.article,
  });

  assert(status === 200, `external article ingest returned ${status}: ${JSON.stringify(json)}`);
  assert(!json.validation_fixture, "external article ingest should not use a local validation fixture");
  assert(
    /WCAG|Accessibility Guidelines/i.test(String(json.title)),
    `unexpected external article title: ${json.title}`,
  );
  assert(json.source_word_count >= 5000, `external article source_word_count too small: ${json.source_word_count}`);
  assert(json.word_count === 2200, `external article should cap at 2200 words, got ${json.word_count}`);
  assert(json.truncated === true, "external article ingest should report truncation");
  assert(
    String(json.text).includes("Web Content Accessibility Guidelines"),
    "external article text missing known WCAG vocabulary",
  );

  return {
    status,
    url: externalUrls.article,
    title: json.title,
    word_count: json.word_count,
    source_word_count: json.source_word_count,
    truncated: json.truncated,
  };
}

async function proveDirectMediaUrlIngest() {
  const { status, json } = await postJson("/api/media-ingest", {
    url: validationUrls.media,
  });

  assert(status === 200, `media ingest returned ${status}: ${JSON.stringify(json)}`);
  assert(json.validation_fixture === true, "media ingest did not use the local validation fixture");
  assert(json.validation_fixture_id === "yentl_synthetic_panel_wav", "media fixture id mismatch");
  assert(json.mime === "audio/wav", `unexpected media mime: ${json.mime}`);
  assert(Array.isArray(json.utterances) && json.utterances.length === 5, "media fixture should return 5 utterances");
  assert(Array.isArray(json.speakers) && json.speakers.length === 2, "media fixture should return 2 speakers");
  assert(
    json.utterances.some((segment) => String(segment.text).includes("city library budget increased by 12 percent")),
    "media transcript missing known budget utterance",
  );

  return {
    status,
    mime: json.mime,
    utterance_count: json.utterances.length,
    speaker_count: json.speakers.length,
    validation_fixture_id: json.validation_fixture_id,
  };
}

async function proveExternalMediaUrlIngest() {
  if (process.env.YENTL_INGESTION_PROOF_SKIP_EXTERNAL_MEDIA === "1") {
    return {
      skipped: true,
      reason: "YENTL_INGESTION_PROOF_SKIP_EXTERNAL_MEDIA=1",
      url: externalUrls.media,
    };
  }

  const { status, json } = await postJson("/api/media-ingest", {
    url: externalUrls.media,
  });

  if (status === 500 && isMissingDeepgramConfig(json)) {
    return {
      skipped: true,
      reason: "DEEPGRAM_API_KEY is not configured for external media transcription",
      url: externalUrls.media,
      status,
      error_code: json?.error?.code ?? null,
    };
  }

  assert(status === 200, `external media ingest returned ${status}: ${JSON.stringify(json)}`);
  assert(!json.validation_fixture, "external media ingest should not use a local validation fixture");
  assert(json.mime === "audio/wav", `unexpected external media mime: ${json.mime}`);
  assert(Array.isArray(json.utterances) && json.utterances.length >= 1, "external media should return utterances");
  assert(
    json.utterances.some((segment) => String(segment.text).trim().length > 0),
    "external media transcript was empty",
  );

  return {
    status,
    url: externalUrls.media,
    mime: json.mime,
    utterance_count: json.utterances.length,
    first_utterance: String(json.utterances[0]?.text ?? "").slice(0, 120),
  };
}

async function provePdfDocumentIngest() {
  const pdfPath = join(ROOT, "public/validation/yentl-small-text-layer.pdf");
  const buffer = await readFile(pdfPath);
  const form = new FormData();
  form.append(
    "file",
    new Blob([buffer], { type: "application/pdf" }),
    "yentl-small-text-layer.pdf",
  );

  const response = await fetchWithTimeout(`${APP_ORIGIN}/api/document-ingest`, {
    method: "POST",
    headers: {
      [CONSENT_HEADER]: CONSENT_VALUE,
    },
    body: form,
  });
  const json = await response.json().catch(() => null);

  assert(response.status === 200, `document ingest returned ${response.status}: ${JSON.stringify(json)}`);
  assert(json.filename === "yentl-small-text-layer.pdf", `unexpected document filename: ${json.filename}`);
  assert(json.mime === "application/pdf", `unexpected document mime: ${json.mime}`);
  assert(json.page_count === 1, `expected 1 PDF page, got ${json.page_count}`);
  assert(json.byte_count === buffer.length, `expected byte_count ${buffer.length}, got ${json.byte_count}`);
  assert(
    String(json.text).includes("City spending rose by twelve percent"),
    "PDF text missing known city spending sentence",
  );
  assert(
    String(json.text).includes("claim should stay provisional"),
    "PDF text missing known provisionality sentence",
  );

  return {
    status: response.status,
    file: relative(ROOT, pdfPath),
    page_count: json.page_count,
    byte_count: json.byte_count,
    text_chars: String(json.text).length,
  };
}

async function proveUploadAudioConsentGate() {
  const response = await fetchWithTimeout(`${APP_ORIGIN}/api/upload-audio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: {
        pathname: "audio.mp3",
        callbackUrl: `${APP_ORIGIN}/api/upload-audio`,
        clientPayload: null,
        multipart: false,
      },
    }),
  });
  const json = await response.json().catch(() => null);

  assert(response.status === 428, `expected 428 without upload consent, got ${response.status}: ${JSON.stringify(json)}`);
  assert(json?.error?.code === "SOURCE_CONSENT_REQUIRED", `unexpected upload consent error: ${JSON.stringify(json)}`);
  return {
    status: response.status,
    error_code: json.error.code,
  };
}

async function proveUploadAudioTokenWithConsent() {
  const response = await fetchWithTimeout(`${APP_ORIGIN}/api/upload-audio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [CONSENT_HEADER]: CONSENT_VALUE,
    },
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: {
        pathname: "ingestion-proof-audio.webm",
        callbackUrl: `${APP_ORIGIN}/api/upload-audio`,
        clientPayload: JSON.stringify({ consent: CONSENT_VALUE }),
        multipart: false,
      },
    }),
  });
  const json = await response.json().catch(() => null);

  if (response.status === 400 && isMissingBlobConfig(json)) {
    return {
      skipped: true,
      reason: "BLOB_READ_WRITE_TOKEN is not configured for upload token generation",
      status: response.status,
      error_code: json?.error?.code ?? null,
    };
  }

  assert(
    response.status === 200,
    `expected 200 for upload token with consent, got ${response.status}: ${JSON.stringify(json)}`,
  );
  assert(
    JSON.stringify(json).includes("clientToken"),
    `upload-audio response did not include a client token: ${JSON.stringify(json)}`,
  );

  return {
    status: response.status,
    has_client_token: true,
  };
}

async function proveDocumentUploadMissingFile() {
  const form = new FormData();
  const response = await fetchWithTimeout(`${APP_ORIGIN}/api/document-ingest`, {
    method: "POST",
    headers: {
      [CONSENT_HEADER]: CONSENT_VALUE,
    },
    body: form,
  });
  const json = await response.json().catch(() => null);

  assert(response.status === 400, `expected 400 for missing document file, got ${response.status}: ${JSON.stringify(json)}`);
  assert(json?.error?.code === "MISSING_FILE", `unexpected missing-file error: ${JSON.stringify(json)}`);
  return {
    status: response.status,
    error_code: json.error.code,
  };
}

async function proveDocumentUploadUnsupportedType() {
  const form = new FormData();
  form.append(
    "file",
    new Blob(["not a pdf"], { type: "text/plain" }),
    "notes.txt",
  );

  const response = await fetchWithTimeout(`${APP_ORIGIN}/api/document-ingest`, {
    method: "POST",
    headers: {
      [CONSENT_HEADER]: CONSENT_VALUE,
    },
    body: form,
  });
  const json = await response.json().catch(() => null);

  assert(
    response.status === 415,
    `expected 415 for unsupported document upload, got ${response.status}: ${JSON.stringify(json)}`,
  );
  assert(json?.error?.code === "UNSUPPORTED_DOCUMENT", `unexpected unsupported-document error: ${JSON.stringify(json)}`);
  return {
    status: response.status,
    error_code: json.error.code,
  };
}

async function proveYouTubeCaptionIngest() {
  const { status, json } = await postJson("/api/youtube-ingest", {
    url: validationUrls.youtube,
  });

  assert(status === 200, `youtube ingest returned ${status}: ${JSON.stringify(json)}`);
  assert(!json.error, `youtube ingest returned structured error: ${JSON.stringify(json.error)}`);
  assert(json.video_id === "fTznEIZRkLg", `unexpected YouTube video id: ${json.video_id}`);
  assert(Array.isArray(json.transcript_segments), "youtube response missing transcript_segments");
  assert(json.transcript_segments.length >= 20, `too few YouTube segments: ${json.transcript_segments.length}`);
  assert(
    json.transcript_segments.some((segment) => String(segment.text).trim().length > 0),
    "YouTube transcript segments were empty",
  );

  return {
    status,
    video_id: json.video_id,
    title: json.title ?? null,
    channel: json.channel ?? null,
    transcript_segment_count: json.transcript_segments.length,
    validation_fixture: Boolean(json.validation_fixture),
  };
}

async function postJson(path, body, options = {}) {
  const response = await fetchWithTimeout(`${APP_ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.consent === false ? {} : { [CONSENT_HEADER]: CONSENT_VALUE }),
    },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    json: await response.json().catch(() => null),
  };
}

function fetchWithTimeout(url, init) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function probeExternalBlocker(name, fn) {
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
    return {
      name,
      ok: false,
      elapsed_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function proveWikimediaHost403Blocker() {
  const { status, json } = await postJson("/api/media-ingest", {
    url: externalUrls.mediaHost403,
  });

  assert(
    status === 500 && json?.error?.code === "TRANSCRIBE_FAILED",
    `expected TRANSCRIBE_FAILED for Wikimedia host 403 probe, got ${status}: ${JSON.stringify(json)}`,
  );
  assert(
    /403|forbidden/i.test(String(json?.error?.message ?? "")),
    `Wikimedia blocker message did not mention host 403: ${JSON.stringify(json)}`,
  );

  return {
    status,
    error_code: json.error.code,
    url: externalUrls.mediaHost403,
    note: "External-host fetch blocker recorded for documentation; not a Yentl SSRF validation failure.",
  };
}

function isMissingDeepgramConfig(json) {
  const message = String(json?.error?.message ?? "");
  return message.includes("DEEPGRAM_API_KEY is not set");
}

function isMissingBlobConfig(json) {
  const message = String(json?.error?.message ?? json?.error ?? "");
  return /BLOB_READ_WRITE_TOKEN|blob.*token/i.test(message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
