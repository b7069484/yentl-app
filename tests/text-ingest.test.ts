import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { parsePlainText, parseDocx } from "@/lib/client/text-ingest";

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
  it("timestamps are monotonically increasing across all segments", () => {
    const raw = "First sentence here. Second sentence here.\n\nThird sentence. Fourth sentence.";
    const segs = parsePlainText(raw, { withSpeakers: false });
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].start).toBeGreaterThanOrEqual(segs[i - 1].end);
    }
  });

  it("start and end are in ms (positive, end > start for non-empty text)", () => {
    const segs = parsePlainText("Hello world, this is a test.", { withSpeakers: false });
    expect(segs[0].start).toBeGreaterThanOrEqual(0);
    expect(segs[0].end).toBeGreaterThan(segs[0].start);
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
