import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("text/document fixtures proof script", () => {
  const source = readFileSync("scripts/validation/prove-text-document-fixtures.ts", "utf8");

  it("covers TXT, Markdown, DOCX, SRT, and VTT validation fixtures", () => {
    expect(source).toContain('runCheck("txt-transcript"');
    expect(source).toContain('runCheck("markdown-document"');
    expect(source).toContain('runCheck("docx-document"');
    expect(source).toContain('runCheck("srt-captions"');
    expect(source).toContain('runCheck("vtt-captions"');
  });

  it("uses the local validation fixture files", () => {
    expect(source).toContain("public/validation/yentl-synthetic-transcript.txt");
    expect(source).toContain("public/validation/yentl-synthetic-transcript.md");
    expect(source).toContain("public/validation/yentl-small-brief.docx");
    expect(source).toContain("public/validation/yentl-synthetic-captions.srt");
    expect(source).toContain("public/validation/yentl-synthetic-captions.vtt");
  });

  it("asserts speaker turns, outlines, DOCX vocabulary, and timed cues", () => {
    expect(source).toContain("speaker_turn");
    expect(source).toContain("buildDocumentOutline");
    expect(source).toContain("parseDocx");
    expect(source).toContain("parseTimedText");
    expect(source).toContain('segments.length === 5');
    expect(source).toContain("source_audio_kind");
  });

  it("writes a compact JSON proof artifact", () => {
    expect(source).toContain("docs/superpowers/validation/text-document-fixtures-proof.json");
    expect(source).toContain("generated_at");
    expect(source).toContain("checks");
    expect(source).toContain("failures");
  });
});