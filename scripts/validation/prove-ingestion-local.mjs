#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const APP_ORIGIN = process.env.YENTL_INGESTION_PROOF_ORIGIN ?? "http://127.0.0.1:3000";
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/ingestion-local-proof.json");
const CONSENT_HEADER = "x-yentl-source-consent";
const CONSENT_VALUE = "source-analysis-v1";
const REQUEST_TIMEOUT_MS = Number(process.env.YENTL_INGESTION_PROOF_TIMEOUT_MS ?? 60000);

const validationUrls = {
  article: `${APP_ORIGIN}/validation/yentl-synthetic-article.html`,
  media: `${APP_ORIGIN}/validation/yentl-synthetic-panel.wav`,
  youtube: "https://www.youtube.com/watch?v=fTznEIZRkLg",
};

async function main() {
  await assertAppIsServing();

  const checks = [];
  checks.push(await runCheck("consent-gate", proveConsentGate));
  checks.push(await runCheck("article-url-ingest", proveArticleUrlIngest));
  checks.push(await runCheck("direct-media-url-ingest", proveDirectMediaUrlIngest));
  checks.push(await runCheck("pdf-document-ingest", provePdfDocumentIngest));
  checks.push(await runCheck("youtube-caption-ingest", proveYouTubeCaptionIngest));

  const failures = checks.filter((check) => !check.ok);
  const report = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    app_origin: APP_ORIGIN,
    validation_urls: validationUrls,
    checks,
    failures: failures.map(({ name, error }) => ({ name, error })),
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    throw new Error(`Ingestion local proof failed. Report: ${REPORT_PATH}`);
  }

  console.log(JSON.stringify(report, null, 2));
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
