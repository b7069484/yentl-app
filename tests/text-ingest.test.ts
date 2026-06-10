import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mammoth mock ─────────────────────────────────────────────────────────────
// Must be at module level so vitest hoists it before any imports execute.
// text-ingest.ts does: mammoth = await import("mammoth"); mammoth.extractRawText(...)
// The default export is cast to an object with extractRawText, so we expose it on
// both the named export and the default export to cover both access patterns.
vi.mock("mammoth", () => {
  const extractRawText = vi.fn().mockResolvedValue({ value: "Extracted text" });
  return {
    default: { extractRawText },
    extractRawText,
  };
});

import {
  buildDocumentOutline,
  parsePlainText,
  parseArticleText,
  parseDocx,
  parsePdf,
  parsePdfWithMetadata,
  parseTimedText,
} from "@/lib/client/text-ingest";

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── parsePlainText ──────────────────────────────────────────────────────────

describe("parsePlainText — basic sentence splitting", () => {
  it("plain text, 3 sentences, no speakers → 3 segments, monotonic timestamps, all speaker_id=0", () => {
    const raw = "The sky is blue. Water is wet. Fire is hot.";
    const segs = parsePlainText(raw, { withSpeakers: false });
    expect(segs.length).toBe(3);
    expect(segs.every((s) => s.speaker_id === 0)).toBe(true);
    expect(segs.every((s) => s.is_final)).toBe(true);
    // Monotonic: each start >= previous end
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].start).toBeGreaterThanOrEqual(segs[i - 1].end);
    }
  });

  it("empty input → []", () => {
    expect(parsePlainText("", { withSpeakers: false })).toEqual([]);
    expect(parsePlainText("   \n\n  ", { withSpeakers: false })).toEqual([]);
  });

  it("is_final is true for all segments", () => {
    const segs = parsePlainText("Hello world.", { withSpeakers: true });
    expect(segs.every((s) => s.is_final)).toBe(true);
  });
});

describe("parsePlainText — speaker detection", () => {
  it("speaker labels enabled: David: Hi.\\n\\nMira: Hello there. → 2 segments, distinct speaker_ids (0 and 1)", () => {
    const raw = "David: Hi.\n\nMira: Hello there.";
    const segs = parsePlainText(raw, { withSpeakers: true });
    expect(segs.length).toBe(2);
    expect(segs[0].speaker_id).toBe(0);
    expect(segs[1].speaker_id).toBe(1);
    // Text should not include the speaker label
    expect(segs[0].text).not.toMatch(/^David:/);
    expect(segs[1].text).not.toMatch(/^Mira:/);
  });

  it("speaker labels disabled but text has labels → labels NOT stripped, treated as part of text, all speaker_id=0", () => {
    const raw = "David: Hi.\n\nMira: Hello there.";
    const segs = parsePlainText(raw, { withSpeakers: false });
    expect(segs.every((s) => s.speaker_id === 0)).toBe(true);
    // Labels are kept in text
    const allText = segs.map((s) => s.text).join(" ");
    expect(allText).toMatch(/David:/);
  });

  it("multiple sentences in one paragraph by same speaker → multiple segments, same speaker_id", () => {
    const raw = "David: First sentence. Second sentence. Third sentence.";
    const segs = parsePlainText(raw, { withSpeakers: true });
    expect(segs.length).toBe(3);
    expect(segs.every((s) => s.speaker_id === 0)).toBe(true);
    // Text content is clean (no label prefix)
    expect(segs[0].text.trim()).toMatch(/^First sentence/);
  });

  it("mixed speakers across paragraphs with continuations → correct speaker_id attribution", () => {
    // Mira's paragraph has two lines — second line is continuation
    const raw = "David: Opening claim here.\n\nMira: Counter argument.\nMira keeps talking.\n\nDavid: Final response.";
    const segs = parsePlainText(raw, { withSpeakers: true });
    const davidId = 0;
    const miraId = 1;
    // First paragraph: David
    expect(segs[0].speaker_id).toBe(davidId);
    // Middle paragraphs: Mira
    const miraSegs = segs.filter((s) => s.speaker_id === miraId);
    expect(miraSegs.length).toBeGreaterThanOrEqual(1);
    // Last paragraph: David again
    expect(segs[segs.length - 1].speaker_id).toBe(davidId);
  });

  it("first encountered speaker → id 0, second → id 1, consistent across document", () => {
    const raw = "Alice: First.\n\nBob: Second.\n\nAlice: Third.";
    const segs = parsePlainText(raw, { withSpeakers: true });
    const aliceId = segs[0].speaker_id;
    const bobSeg = segs.find((s) => s.speaker_id !== aliceId);
    expect(aliceId).toBe(0);
    expect(bobSeg?.speaker_id).toBe(1);
    // Alice's third paragraph still has id 0
    expect(segs[segs.length - 1].speaker_id).toBe(0);
  });

  it("line-by-line transcript labels without blank lines create separate speaker turns", () => {
    const raw = [
      "David: The board approved the repair budget.",
      "Mira: But the mayor said the cost estimate changed.",
      "David: That means the public number is stale.",
    ].join("\n");

    const segs = parsePlainText(raw, { withSpeakers: true });

    expect(segs).toEqual([
      expect.objectContaining({
        text: "The board approved the repair budget.",
        speaker_id: 0,
        source_audio_kind: "text_import",
        document_anchor: expect.objectContaining({
          kind: "speaker_turn",
          block_index: 0,
          line_start: 1,
          line_end: 1,
          speaker_label: "David",
        }),
      }),
      expect.objectContaining({
        text: "But the mayor said the cost estimate changed.",
        speaker_id: 1,
        source_audio_kind: "text_import",
        document_anchor: expect.objectContaining({
          kind: "speaker_turn",
          block_index: 1,
          line_start: 2,
          line_end: 2,
          speaker_label: "Mira",
        }),
      }),
      expect.objectContaining({
        text: "That means the public number is stale.",
        speaker_id: 0,
        source_audio_kind: "text_import",
        document_anchor: expect.objectContaining({
          kind: "speaker_turn",
          block_index: 2,
          line_start: 3,
          line_end: 3,
          speaker_label: "David",
        }),
      }),
    ]);
  });

  it("supports numeric transcript labels and timestamp-prefixed labels", () => {
    const raw = [
      "Speaker 1: The hearing starts with a budget claim.",
      "[00:12] Speaker 2: The source document says otherwise.",
    ].join("\n");

    const segs = parsePlainText(raw, { withSpeakers: true });

    expect(segs).toEqual([
      expect.objectContaining({ text: "The hearing starts with a budget claim.", speaker_id: 0 }),
      expect.objectContaining({ text: "The source document says otherwise.", speaker_id: 1 }),
    ]);
  });
});

describe("parsePlainText — label punctuation variants", () => {
  it("David: label (colon) → detected and stripped", () => {
    const segs = parsePlainText("David: Hello world.", { withSpeakers: true });
    expect(segs[0].speaker_id).toBe(0);
    expect(segs[0].text).not.toMatch(/David:/);
  });

  it("David — label (em dash) → detected and stripped", () => {
    const segs = parsePlainText("David — Hello world.", { withSpeakers: true });
    expect(segs[0].speaker_id).toBe(0);
    expect(segs[0].text).not.toMatch(/David\s*—/);
  });

  it("David – label (en dash) → detected and stripped", () => {
    const segs = parsePlainText("David – Hello world.", { withSpeakers: true });
    expect(segs[0].speaker_id).toBe(0);
    expect(segs[0].text).not.toMatch(/David\s*–/);
  });
});

describe("parsePlainText — timestamps", () => {
  it("plain paragraphs keep document anchors for review", () => {
    const raw = "First paragraph has a claim.\n\nSecond paragraph has context.";
    const segs = parsePlainText(raw, { withSpeakers: false });

    expect(segs[0]).toEqual(expect.objectContaining({
      source_audio_kind: "text_import",
      document_anchor: expect.objectContaining({
        kind: "paragraph",
        block_index: 0,
        paragraph_index: 0,
        line_start: 1,
        line_end: 1,
        char_start: 0,
        char_end: "First paragraph has a claim.".length,
        quote_text: "First paragraph has a claim.",
      }),
    }));
    expect(segs[1]).toEqual(expect.objectContaining({
      source_audio_kind: "text_import",
      document_anchor: expect.objectContaining({
        kind: "paragraph",
        block_index: 1,
        paragraph_index: 1,
        line_start: 3,
        line_end: 3,
      }),
    }));
  });

  it("persists block-relative quote offsets for each sentence in a paragraph", () => {
    const raw = "First sentence here. Second sentence carries the audit claim.";
    const segs = parsePlainText(raw, { withSpeakers: false });
    const second = "Second sentence carries the audit claim.";

    expect(segs[1].document_anchor).toMatchObject({
      kind: "paragraph",
      block_index: 0,
      char_start: raw.indexOf(second),
      char_end: raw.indexOf(second) + second.length,
      quote_text: second,
    });
  });

  it("timestamps are monotonically increasing across all segments", () => {
    const raw = "First sentence here. Second sentence here.\n\nThird sentence. Fourth sentence.";
    const segs = parsePlainText(raw, { withSpeakers: false });
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].start).toBeGreaterThanOrEqual(segs[i - 1].end);
    }
  });

  it("start and end are in seconds (positive, end > start for non-empty text)", () => {
    const segs = parsePlainText("Hello world, this is a test.", { withSpeakers: false });
    expect(segs[0].start).toBeGreaterThanOrEqual(0);
    expect(segs[0].end).toBeGreaterThan(segs[0].start);
    expect(segs[0].end).toBeLessThan(10);
  });

  it("10k words → produces correct # segments, timestamps stay monotonic", () => {
    // Build 10k word text in paragraphs of ~50 words each
    // sentence = 10 words, repeat 50 times per paragraph = 500 words per paragraph
    // 20 paragraphs = 10000 words
    const sentence = "The quick brown fox jumps over the lazy dog today. ";
    const paragraph = sentence.repeat(50); // ~500 words
    const raw = Array.from({ length: 20 }, () => paragraph).join("\n\n");
    // word count
    const wordCount = raw.trim().split(/\s+/).length;
    expect(wordCount).toBeGreaterThan(9000);

    const segs = parsePlainText(raw, { withSpeakers: false });
    expect(segs.length).toBeGreaterThan(0);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].start).toBeGreaterThanOrEqual(segs[i - 1].end);
    }
    expect(segs[segs.length - 1].end).toBeLessThan(24 * 60 * 60);
  });
});

describe("parseArticleText — bounded readable chunks", () => {
  it("keeps compact multi-paragraph articles as multiple reviewable chunks", () => {
    const raw = [
      "The city library operating budget increased by 12 percent this year, according to the mayor's office budget memo.",
      "The same memo says the library's technology grant expired at the end of the previous fiscal year.",
      "At Ridgeview Middle School, administrators reported a 22 percent drop in missed assignments after phone lockers were introduced.",
      "The school board chair argued every social platform should be banned by Friday or classroom learning would collapse.",
      "A local researcher said the useful question is which platforms create measurable distraction and which students are affected.",
    ].join("\n\n");

    const segs = parseArticleText(raw);

    expect(segs.length).toBeGreaterThan(1);
    expect(segs[0].document_anchor).toEqual(expect.objectContaining({
      kind: "article_chunk",
      paragraph_index: 0,
    }));
    expect(segs[1].document_anchor).toEqual(expect.objectContaining({
      kind: "article_chunk",
      paragraph_index: expect.any(Number),
    }));
    expect(segs.map((segment) => segment.text).join("\n\n")).toContain("Ridgeview Middle School");
  });

  it("chunks long article text into paragraph-sized segments instead of sentence fragments", () => {
    const paragraph = "Fact checking helps readers compare a claim with reliable evidence. ".repeat(45);
    const raw = [paragraph, paragraph, paragraph, paragraph].join("\n\n");

    const segs = parseArticleText(raw, { chunkWords: 90, maxWords: 220 });

    expect(segs.length).toBeGreaterThan(1);
    expect(segs.length).toBeLessThan(8);
    expect(segs.every((s) => s.speaker_id === 0)).toBe(true);
    expect(segs.every((s) => s.is_final)).toBe(true);
    expect(segs[0]).toEqual(expect.objectContaining({
      source_audio_kind: "text_import",
      document_anchor: expect.objectContaining({ kind: "article_chunk", block_index: 0, paragraph_index: 0 }),
    }));
    expect(segs[0].end).toBeLessThan(60);
    expect(segs.map((s) => s.text.split(/\s+/).length).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(220);
  });
});

describe("buildDocumentOutline — document map", () => {
  it("prefers headings when the document has section titles", () => {
    const outline = buildDocumentOutline(`# Executive Summary
The city audit found delayed disclosures.

## Budget Finding
The repair fund changed after the first vote.`);

    expect(outline).toEqual([
      expect.objectContaining({
        kind: "heading",
        label: "Executive Summary",
        preview: "The city audit found delayed disclosures.",
        line_start: 1,
      }),
      expect.objectContaining({
        kind: "heading",
        label: "Budget Finding",
        preview: "The repair fund changed after the first vote.",
        line_start: 4,
      }),
    ]);
  });

  it("falls back to opening paragraphs when no headings are present", () => {
    const outline = buildDocumentOutline(
      "The opening paragraph gives enough context for the first source block.\n\nThe second paragraph previews the rest of the document.",
    );

    expect(outline).toEqual([
      expect.objectContaining({
        kind: "paragraph",
        label: "Paragraph 1",
        preview: "The opening paragraph gives enough context for the first source block.",
        paragraph_index: 0,
      }),
      expect.objectContaining({
        kind: "paragraph",
        label: "Paragraph 2",
      }),
    ]);
  });
});

// ─── parseDocx ───────────────────────────────────────────────────────────────

describe("parseDocx — mammoth integration (mocked)", () => {
  // Helper: get the mocked extractRawText function with correct type
  async function getMockedExtractRawText() {
    const mod = (await import("mammoth")).default as unknown as {
      extractRawText: ReturnType<typeof vi.fn>;
    };
    return mod.extractRawText;
  }

  beforeEach(async () => {
    // Reset call history between tests without replacing the implementation.
    const fn = await getMockedExtractRawText();
    fn.mockClear();
    fn.mockResolvedValue({ value: "Extracted text" });
  });

  it("calls mammoth extractRawText with arrayBuffer from the file and returns value", async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    const mockFile = {
      arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      name: "test.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    } as unknown as File;

    const result = await parseDocx(mockFile);

    // Verify the file's arrayBuffer() was called
    expect(mockFile.arrayBuffer).toHaveBeenCalledTimes(1);

    // Verify mammoth.extractRawText was called with the arrayBuffer
    const fn = await getMockedExtractRawText();
    expect(fn).toHaveBeenCalledWith({
      arrayBuffer: expect.any(ArrayBuffer),
    });

    // Verify the extracted text is returned
    expect(result).toBe("Extracted text");
  });
});

describe("parsePdf — document-ingest metadata", () => {
  it("returns extracted text and preserves page metadata from the route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filename: "audit.pdf",
        mime: "application/pdf",
        text: "# Findings\nThe audit was published by the city.",
        page_count: 7,
        byte_count: 12345,
      }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["pdf bytes"], "audit.pdf", { type: "application/pdf" });
    const result = await parsePdfWithMetadata(file);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/document-ingest",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-yentl-source-consent": "source-analysis-v1",
        }),
        body: expect.any(FormData),
      }),
    );
    expect(result).toMatchObject({
      text: "# Findings\nThe audit was published by the city.",
      filename: "audit.pdf",
      mime: "application/pdf",
      pageCount: 7,
      byteCount: 12345,
    });
    expect(result.outline[0]).toMatchObject({
      kind: "heading",
      label: "Findings",
    });
  });

  it("keeps parsePdf backwards-compatible by returning text only", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: "Plain PDF text with enough words for outline context.",
        byte_count: 10,
      }),
    } as Response));

    const file = new File(["pdf bytes"], "plain.pdf", { type: "application/pdf" });

    await expect(parsePdf(file)).resolves.toBe("Plain PDF text with enough words for outline context.");
  });
});

describe("parseTimedText — SRT and VTT", () => {
  it("parses SRT cues into timed transcript segments", () => {
    const srt = `1
00:00:01,000 --> 00:00:03,500
First caption line.

2
00:00:04,000 --> 00:00:05,000
Second caption line.`;

    const segments = parseTimedText(srt, "srt");
    expect(segments).toEqual([
      expect.objectContaining({
        text: "First caption line.",
        start: 1,
        end: 3.5,
        is_final: true,
        source_audio_kind: "srt_vtt",
        document_anchor: expect.objectContaining({ kind: "caption_cue", block_index: 0, cue_index: 0 }),
      }),
      expect.objectContaining({
        text: "Second caption line.",
        start: 4,
        end: 5,
        is_final: true,
        source_audio_kind: "srt_vtt",
        document_anchor: expect.objectContaining({ kind: "caption_cue", block_index: 1, cue_index: 1 }),
      }),
    ]);
  });

  it("parses VTT cues into timed transcript segments", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:02.000
Hello <b>there</b>.
`;

    const segments = parseTimedText(vtt, "vtt");
    expect(segments).toEqual([
      expect.objectContaining({
        text: "Hello there.",
        start: 1,
        end: 2,
        is_final: true,
        source_audio_kind: "srt_vtt",
        document_anchor: expect.objectContaining({ kind: "caption_cue", block_index: 0, cue_index: 0 }),
      }),
    ]);
  });
});
