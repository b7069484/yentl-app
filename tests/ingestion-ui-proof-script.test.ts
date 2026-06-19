import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ingestion UI local proof script", () => {
  const source = readFileSync("scripts/validation/prove-ingestion-ui-local.mjs", "utf8");
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };

  it("walks source-pane validation loaders through the user-facing handoff paths", () => {
    expect(source).toContain('slug: "web-article-validation-ui-handoff"');
    expect(source).toContain('slug: "direct-media-validation-ui-handoff"');
    expect(source).toContain('slug: "direct-video-validation-ui-handoff"');
    expect(source).toContain('slug: "audio-upload-validation-ui-handoff"');
    expect(source).toContain('slug: "video-upload-validation-ui-handoff"');
    expect(source).toContain('slug: "mov-upload-validation-ui-handoff"');
    expect(source).toContain('slug: "webm-upload-validation-ui-handoff"');
    expect(source).toContain('slug: "text-txt-validation-ui-handoff"');
    expect(source).toContain('slug: "text-pdf-validation-ui-handoff"');
    expect(source).toContain('slug: "youtube-validation-ui-handoff"');
    expect(source).toContain('slug: "claim-quick-check-validation-ui-handoff"');
    expect(source).toContain("Load validation article");
    expect(source).toContain("Load validation media URL");
    expect(source).toContain("Load validation video URL");
    expect(source).toContain("Load validation WAV");
    expect(source).toContain("Load validation MP4");
    expect(source).toContain("Load validation MOV");
    expect(source).toContain("Load validation WebM");
    expect(source).toContain("Load validation TXT");
    expect(source).toContain("Load validation PDF");
    expect(source).toContain("PDFs need selectable text");
    expect(source).toContain("Scanned PDFs need OCR elsewhere");
    expect(source).toContain("Load validation YouTube");
    expect(source).toContain("Analyze caption track");
    expect(source).toContain("Load validation claim");
    expect(source).toContain("Check claim");
  });

  it("asserts the backing ingest requests and session destinations", () => {
    expect(source).toContain("/api/article-ingest");
    expect(source).toContain("/api/media-ingest");
    expect(source).toContain("/api/transcribe-batch");
    expect(source).toContain("/api/document-ingest");
    expect(source).toContain("/api/youtube-ingest");
    expect(source).toContain("/api/verify-provisional");
    expect(source).toContain("/api/verify-confirmed");
    expect(source).toContain("/validation/yentl-synthetic-panel.mp4");
    expect(source).toContain("/validation/yentl-synthetic-panel.mov");
    expect(source).toContain("/validation/yentl-synthetic-panel.webm");
    expect(source).toContain("/validation/yentl-synthetic-transcript.txt");
    expect(source).toContain("/validation/yentl-small-text-layer.pdf");
    expect(source).toContain("/session?view=overview");
    expect(source).toContain("/session?view=watch");
    expect(source).toContain("/session/detail/claim/");
  });

  it("fails on missing UI text, missing expected requests, overflow, and console/runtime errors", () => {
    expect(source).toContain("missing expected text");
    expect(source).toContain("missing expected request");
    expect(source).toContain("overflowX > 1");
    expect(source).toContain("Runtime.exceptionThrown");
    expect(source).toContain("console/runtime error");
  });

  it("writes a compact proof artifact and is exposed through package scripts", () => {
    expect(source).toContain('?? "http://localhost:3000"');
    expect(source).toContain("docs/superpowers/validation/ingestion-ui-local-proof.json");
    expect(source).toContain("generated_at");
    expect(source).toContain("checks");
    expect(source).toContain("failures");
    expect(pkg.scripts?.["ingestion:proof:ui"]).toBe(
      "node scripts/validation/prove-ingestion-ui-local.mjs",
    );
  });
});
