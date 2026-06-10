import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ingestion local proof script", () => {
  const source = readFileSync("scripts/validation/prove-ingestion-local.mjs", "utf8");

  it("covers the launch-critical source-ingest API paths", () => {
    expect(source).toContain('runCheck("consent-gate"');
    expect(source).toContain('runCheck("article-url-ingest"');
    expect(source).toContain('runCheck("direct-media-url-ingest"');
    expect(source).toContain('runCheck("pdf-document-ingest"');
    expect(source).toContain('runCheck("youtube-caption-ingest"');
  });

  it("uses deterministic local validation fixtures where available", () => {
    expect(source).toContain("/validation/yentl-synthetic-article.html");
    expect(source).toContain("/validation/yentl-synthetic-panel.wav");
    expect(source).toContain("public/validation/yentl-small-text-layer.pdf");
    expect(source).toContain("yentl_synthetic_article_html");
    expect(source).toContain("yentl_synthetic_panel_wav");
  });

  it("fails on missing consent, empty transcripts, and weak extraction", () => {
    expect(source).toContain("SOURCE_CONSENT_REQUIRED");
    expect(source).toContain("word_count >= 80");
    expect(source).toContain("utterances.length === 5");
    expect(source).toContain("transcript_segments.length >= 20");
  });

  it("writes a compact JSON proof artifact", () => {
    expect(source).toContain("docs/superpowers/validation/ingestion-local-proof.json");
    expect(source).toContain("generated_at");
    expect(source).toContain("checks");
    expect(source).toContain("failures");
  });
});
