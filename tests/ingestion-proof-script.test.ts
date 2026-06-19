import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ingestion local proof script", () => {
  const source = readFileSync("scripts/validation/prove-ingestion-local.mjs", "utf8");

  it("covers the launch-critical source-ingest API paths", () => {
    expect(source).toContain('runCheck("consent-gate"');
    expect(source).toContain('runCheck("ssrf-block"');
    expect(source).toContain('runCheck("article-url-ingest"');
    expect(source).toContain('runCheck("messy-article-url-ingest"');
    expect(source).toContain('runCheck("external-article-url-ingest"');
    expect(source).toContain('runCheck("direct-media-url-ingest"');
    expect(source).toContain('runCheck("direct-video-url-ingest"');
    expect(source).toContain('runCheck("direct-mov-url-ingest"');
    expect(source).toContain('runCheck("direct-webm-url-ingest"');
    expect(source).toContain('runCheck("uploaded-video-file-ingest"');
    expect(source).toContain('runCheck("uploaded-mov-file-ingest"');
    expect(source).toContain('runCheck("uploaded-webm-file-ingest"');
    expect(source).toContain('runCheck("external-media-url-ingest"');
    expect(source).toContain('runCheck("pdf-document-ingest"');
    expect(source).toContain('runCheck("upload-audio-consent-gate"');
    expect(source).toContain('runCheck("upload-audio-token-with-consent"');
    expect(source).toContain('runCheck("large-media-upload-streaming-contract"');
    expect(source).toContain('runCheck("document-upload-missing-file"');
    expect(source).toContain('runCheck("document-upload-unsupported-type"');
    expect(source).toContain('runCheck("youtube-caption-ingest"');
  });

  it("uses deterministic local validation fixtures where available", () => {
    expect(source).toContain("/validation/yentl-synthetic-article.html");
    expect(source).toContain("/validation/yentl-messy-article.html");
    expect(source).toContain("/validation/yentl-synthetic-panel.wav");
    expect(source).toContain("/validation/yentl-synthetic-panel.mp4");
    expect(source).toContain("/validation/yentl-synthetic-panel.mov");
    expect(source).toContain("/validation/yentl-synthetic-panel.webm");
    expect(source).toContain("public/validation/yentl-synthetic-panel.mp4");
    expect(source).toContain("public/validation/yentl-synthetic-panel.mov");
    expect(source).toContain("public/validation/yentl-synthetic-panel.webm");
    expect(source).toContain("public/validation/yentl-small-text-layer.pdf");
    expect(source).toContain("yentl_synthetic_article_html");
    expect(source).toContain("yentl_messy_article_html");
    expect(source).toContain("yentl_synthetic_panel_wav");
    expect(source).toContain("yentl_synthetic_panel_mp4");
    expect(source).toContain("yentl_synthetic_panel_mov");
    expect(source).toContain("yentl_synthetic_panel_webm");
    expect(source).toContain("video/mp4");
    expect(source).toContain("video/quicktime");
    expect(source).toContain("video/webm");
  });

  it("covers real external article/media targets and SSRF guard behavior", () => {
    expect(source).toContain("https://www.w3.org/TR/WCAG22/");
    expect(source).toContain(
      "https://raw.githubusercontent.com/mozilla/DeepSpeech/master/data/smoke_test/LDC93S1.wav",
    );
    expect(source).toContain("http://169.254.169.254/latest/meta-data");
    expect(source).toContain("SSRF_BLOCKED");
    expect(source).toContain("external_blockers");
    expect(source).toContain("wikimedia-host-403");
  });

  it("fails on missing consent, empty transcripts, and weak extraction", () => {
    expect(source).toContain("SOURCE_CONSENT_REQUIRED");
    expect(source).toContain("MISSING_FILE");
    expect(source).toContain("UNSUPPORTED_DOCUMENT");
    expect(source).toContain("/api/transcribe-batch");
    expect(source).toContain("/api/upload-audio");
    expect(source).toContain("BLOB_UPLOAD_THRESHOLD_BYTES");
    expect(source).toContain("STREAM_THRESHOLD_BYTES");
    expect(source).toContain("word_count >= 80");
    expect(source).toContain("excluded_page_chrome");
    expect(source).toContain("utterances.length === 5");
    expect(source).toContain("transcript_segments.length >= 20");
  });

  it("writes a compact JSON proof artifact", () => {
    expect(source).toContain("docs/superpowers/validation/ingestion-local-proof.json");
    expect(source).toContain("docs/superpowers/validation/ingestion-deploy-proof.json");
    expect(source).toContain("proof_scope");
    expect(source).toContain("deploy_blockers");
    expect(source).toContain("ingestion-local-proof.json");
    expect(source).toContain("generated_at");
    expect(source).toContain("checks");
    expect(source).toContain("failures");
  });
});
