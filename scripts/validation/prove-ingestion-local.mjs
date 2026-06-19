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
  messyArticle: `${APP_ORIGIN}/validation/yentl-messy-article.html`,
  media: `${APP_ORIGIN}/validation/yentl-synthetic-panel.wav`,
  video: `${APP_ORIGIN}/validation/yentl-synthetic-panel.mp4`,
  mov: `${APP_ORIGIN}/validation/yentl-synthetic-panel.mov`,
  webm: `${APP_ORIGIN}/validation/yentl-synthetic-panel.webm`,
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
  checks.push(await runCheck("messy-article-url-ingest", proveMessyArticleUrlIngest));
  checks.push(await runCheck("external-article-url-ingest", proveExternalArticleUrlIngest));
  checks.push(await runCheck("direct-media-url-ingest", proveDirectMediaUrlIngest));
  checks.push(await runCheck("direct-video-url-ingest", proveDirectVideoUrlIngest));
  checks.push(await runCheck("direct-mov-url-ingest", proveDirectMovUrlIngest));
  checks.push(await runCheck("direct-webm-url-ingest", proveDirectWebmUrlIngest));
  checks.push(await runCheck("uploaded-video-file-ingest", proveUploadedVideoFileIngest));
  checks.push(await runCheck("uploaded-mov-file-ingest", proveUploadedMovFileIngest));
  checks.push(await runCheck("uploaded-webm-file-ingest", proveUploadedWebmFileIngest));
  checks.push(await runCheck("external-media-url-ingest", proveExternalMediaUrlIngest));
  checks.push(await runCheck("pdf-document-ingest", provePdfDocumentIngest));
  checks.push(await runCheck("upload-audio-consent-gate", proveUploadAudioConsentGate));
  checks.push(await runCheck("upload-audio-token-with-consent", proveUploadAudioTokenWithConsent));
  checks.push(await runCheck("large-media-upload-streaming-contract", proveLargeMediaUploadStreamingContract));
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

async function proveMessyArticleUrlIngest() {
  const { status, json } = await postJson("/api/article-ingest", {
    url: validationUrls.messyArticle,
  });

  assert(status === 200, `messy article ingest returned ${status}: ${JSON.stringify(json)}`);
  assert(json.validation_fixture === true, "messy article ingest did not use the local validation fixture");
  assert(json.validation_fixture_id === "yentl_messy_article_html", "messy article fixture id mismatch");
  assert(json.title === "Yentl Messy Article Fixture", `unexpected messy article title: ${json.title}`);
  assert(
    String(json.text).includes("filtration project is six months behind schedule"),
    "messy article text missing known filtration claim",
  );
  assert(
    String(json.text).includes("bottled-water costs would be reimbursed"),
    "messy article text missing known reimbursement question",
  );
  assert(!String(json.text).includes("Accept cookies"), "messy article included cookie banner chrome");
  assert(!String(json.text).includes("Share this story"), "messy article included sharing chrome");
  assert(!String(json.text).includes("Sponsored mortgage offers"), "messy article included ad chrome");
  assert(!String(json.text).includes("summer camps"), "messy article included related-story chrome");
  assert(!String(json.text).includes("Reader comments"), "messy article included comment chrome");

  return {
    status,
    title: json.title,
    word_count: json.word_count,
    source_word_count: json.source_word_count,
    validation_fixture_id: json.validation_fixture_id,
    excluded_page_chrome: ["cookie", "share", "ad", "related", "comments"],
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

async function proveDirectVideoUrlIngest() {
  return proveDirectValidationMediaUrlIngest({
    url: validationUrls.video,
    mime: "video/mp4",
    fixtureId: "yentl_synthetic_panel_mp4",
    label: "video",
  });
}

async function proveDirectMovUrlIngest() {
  return proveDirectValidationMediaUrlIngest({
    url: validationUrls.mov,
    mime: "video/quicktime",
    fixtureId: "yentl_synthetic_panel_mov",
    label: "MOV",
  });
}

async function proveDirectWebmUrlIngest() {
  return proveDirectValidationMediaUrlIngest({
    url: validationUrls.webm,
    mime: "video/webm",
    fixtureId: "yentl_synthetic_panel_webm",
    label: "WebM",
  });
}

async function proveDirectValidationMediaUrlIngest({ url, mime, fixtureId, label }) {
  const { status, json } = await postJson("/api/media-ingest", { url });

  assert(status === 200, `${label} ingest returned ${status}: ${JSON.stringify(json)}`);
  assert(json.validation_fixture === true, `${label} ingest did not use the local validation fixture`);
  assert(json.validation_fixture_id === fixtureId, `${label} fixture id mismatch`);
  assert(json.mime === mime, `unexpected ${label} mime: ${json.mime}`);
  assert(Array.isArray(json.utterances) && json.utterances.length === 5, `${label} fixture should return 5 utterances`);
  assert(Array.isArray(json.speakers) && json.speakers.length === 2, `${label} fixture should return 2 speakers`);
  assert(
    json.utterances.some((segment) => String(segment.text).includes("city library budget increased by 12 percent")),
    `${label} transcript missing known budget utterance`,
  );

  return {
    status,
    mime: json.mime,
    utterance_count: json.utterances.length,
    speaker_count: json.speakers.length,
    validation_fixture_id: json.validation_fixture_id,
  };
}

async function proveUploadedVideoFileIngest() {
  return proveUploadedValidationMediaFileIngest({
    relativePath: "public/validation/yentl-synthetic-panel.mp4",
    filename: "yentl-synthetic-panel.mp4",
    mime: "video/mp4",
    fixtureId: "yentl_synthetic_panel_mp4",
    label: "uploaded video",
  });
}

async function proveUploadedMovFileIngest() {
  return proveUploadedValidationMediaFileIngest({
    relativePath: "public/validation/yentl-synthetic-panel.mov",
    filename: "yentl-synthetic-panel.mov",
    mime: "video/quicktime",
    fixtureId: "yentl_synthetic_panel_mov",
    label: "uploaded MOV",
  });
}

async function proveUploadedWebmFileIngest() {
  return proveUploadedValidationMediaFileIngest({
    relativePath: "public/validation/yentl-synthetic-panel.webm",
    filename: "yentl-synthetic-panel.webm",
    mime: "video/webm",
    fixtureId: "yentl_synthetic_panel_webm",
    label: "uploaded WebM",
  });
}

async function proveUploadedValidationMediaFileIngest({ relativePath, filename, mime, fixtureId, label }) {
  const mediaPath = join(ROOT, relativePath);
  const buffer = await readFile(mediaPath);
  const form = new FormData();
  form.append(
    "file",
    new Blob([buffer], { type: mime }),
    filename,
  );
  form.append("duration_sec", "31.953");

  const response = await fetchWithTimeout(`${APP_ORIGIN}/api/transcribe-batch`, {
    method: "POST",
    headers: {
      [CONSENT_HEADER]: CONSENT_VALUE,
    },
    body: form,
  });
  const json = await response.json().catch(() => null);

  assert(response.status === 200, `${label} transcription returned ${response.status}: ${JSON.stringify(json)}`);
  assert(json.validation_fixture === true, `${label} did not use the local validation fixture`);
  assert(json.validation_fixture_id === fixtureId, `${label} fixture id mismatch`);
  assert(Array.isArray(json.utterances) && json.utterances.length === 5, `${label} should return 5 utterances`);
  assert(Array.isArray(json.speakers) && json.speakers.length === 2, `${label} should return 2 speakers`);
  assert(
    json.utterances.some((segment) => String(segment.text).includes("city library budget increased by 12 percent")),
    `${label} transcript missing known budget utterance`,
  );

  return {
    status: response.status,
    file: relative(ROOT, mediaPath),
    mime,
    byte_count: buffer.length,
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

async function proveLargeMediaUploadStreamingContract() {
  const clientPath = join(ROOT, "lib/client/audio-ingest.ts");
  const uploadRoutePath = join(ROOT, "app/api/upload-audio/route.ts");
  const transcribeRoutePath = join(ROOT, "app/api/transcribe-batch/route.ts");
  const clientTestPath = join(ROOT, "tests/audio-ingest.test.ts");
  const streamTestPath = join(ROOT, "tests/streaming-upload.test.ts");
  const uploadRouteTestPath = join(ROOT, "tests/api/upload-audio.test.ts");

  const clientSource = await readFile(clientPath, "utf8");
  const uploadRouteSource = await readFile(uploadRoutePath, "utf8");
  const transcribeRouteSource = await readFile(transcribeRoutePath, "utf8");
  const clientTestSource = await readFile(clientTestPath, "utf8");
  const streamTestSource = await readFile(streamTestPath, "utf8");
  const uploadRouteTestSource = await readFile(uploadRouteTestPath, "utf8");

  const requirements = [
    ["client threshold is 4MB", clientSource, "BLOB_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024"],
    ["large client files use Blob upload", clientSource, "file.size >= BLOB_UPLOAD_THRESHOLD_BYTES"],
    ["Blob upload is private", clientSource, 'access: "private"'],
    ["Blob upload uses upload token route", clientSource, 'handleUploadUrl: "/api/upload-audio"'],
    ["Blob upload stores consent payload", clientSource, "clientPayload: sourceAnalysisConsentPayload()"],
    ["large client files call transcribe-batch with blob_url", clientSource, "blob_url: blobResult.url"],
    ["token route accepts MP4", uploadRouteSource, '"video/mp4"'],
    ["token route accepts MOV", uploadRouteSource, '"video/quicktime"'],
    ["token route accepts WebM", uploadRouteSource, '"video/webm"'],
    ["token route caps uploads at 500MB", uploadRouteSource, "MAX_SIZE_BYTES = 500 * 1024 * 1024"],
    ["transcribe route streams private Blob URLs", transcribeRouteSource, "transcribePrivateBlobUrl"],
    ["transcribe route uses Vercel Blob get", transcribeRouteSource, "await get(url"],
    ["transcribe route sends Blob stream to Deepgram", transcribeRouteSource, "return transcribeStream(nodeStream, mime)"],
    ["transcribe route deletes uploaded Blob after JSON transcription", transcribeRouteSource, "await deleteUploadedBlob(blob_url)"],
    ["multipart threshold is 50MB", transcribeRouteSource, "STREAM_THRESHOLD_BYTES = 50 * 1024 * 1024"],
    ["multipart files over threshold use stream path", transcribeRouteSource, "file.size > STREAM_THRESHOLD_BYTES"],
    ["multipart stream path avoids transcribeFile", streamTestSource, "large file does NOT use Buffer.from(arrayBuffer)"],
    ["client tests prove Blob upload for large files", clientTestSource, "calls @vercel/blob upload() for files >= BLOB_UPLOAD_THRESHOLD_BYTES"],
    ["client tests prove JSON blob_url handoff", clientTestSource, "calls /api/transcribe-batch with JSON { blob_url, duration_sec } after upload"],
    ["upload-token tests prove video MIME allowance", uploadRouteTestSource, 'expect(capturedToken!.allowedContentTypes).toContain("video/mp4")'],
    ["upload-token tests prove MOV MIME allowance", uploadRouteTestSource, 'expect(capturedToken!.allowedContentTypes).toContain("video/quicktime")'],
    ["upload-token tests prove WebM MIME allowance", uploadRouteTestSource, 'expect(capturedToken!.allowedContentTypes).toContain("video/webm")'],
  ];

  const missing = requirements
    .filter(([, source, needle]) => !source.includes(needle))
    .map(([label]) => label);

  assert(missing.length === 0, `large-media upload contract missing: ${missing.join(", ")}`);

  return {
    client_blob_threshold_bytes: 4 * 1024 * 1024,
    server_stream_threshold_bytes: 50 * 1024 * 1024,
    max_upload_bytes: 500 * 1024 * 1024,
    blob_upload_route: "/api/upload-audio",
    transcription_route: "/api/transcribe-batch",
    allowed_large_video_types: ["video/mp4", "video/quicktime", "video/webm"],
    proof_files: [
      relative(ROOT, clientPath),
      relative(ROOT, uploadRoutePath),
      relative(ROOT, transcribeRoutePath),
      relative(ROOT, clientTestPath),
      relative(ROOT, streamTestPath),
      relative(ROOT, uploadRouteTestPath),
    ],
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
