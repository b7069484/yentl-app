import { describe, it, expect } from "vitest";
import { mergeIntoUtterances } from "@/lib/client/utterance-merge";
import type { TranscriptSegment } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSeg(
  text: string,
  start: number,
  end: number,
  speaker_id: number | null = 0,
): TranscriptSegment {
  return { text, start, end, is_final: true, speaker_id };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("mergeIntoUtterances — basic cases", () => {
  it("empty input → empty output", () => {
    expect(mergeIntoUtterances([])).toEqual([]);
  });

  it("single segment → single output (text preserved)", () => {
    const seg = makeSeg("Hello world.", 0, 3);
    const result = mergeIntoUtterances([seg]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello world.");
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(3);
    expect(result[0].speaker_id).toBe(0);
  });

  it("two adjacent fragments same speaker, gap < 1.5s → merged", () => {
    // gap = 3.5 - 3.0 = 0.5s → merge
    const segs = [
      makeSeg("Hello there,", 0, 3.0),
      makeSeg("how are you doing today?", 3.5, 6.0),
    ];
    const result = mergeIntoUtterances(segs);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello there, how are you doing today?");
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(6.0);
  });
});

describe("mergeIntoUtterances — flush conditions", () => {
  it("speaker change → flush", () => {
    const segs = [
      makeSeg("I believe strongly", 0, 3, 0),
      makeSeg("in this position.", 3.2, 6, 1), // different speaker
    ];
    const result = mergeIntoUtterances(segs);
    expect(result).toHaveLength(2);
    expect(result[0].speaker_id).toBe(0);
    expect(result[1].speaker_id).toBe(1);
  });

  it("time gap > 1.5s → flush", () => {
    // gap = 5.5 - 3.0 = 2.5s → flush
    const segs = [
      makeSeg("First sentence ends here.", 0, 3.0),
      makeSeg("Second sentence starts here.", 5.5, 8.0),
    ];
    const result = mergeIntoUtterances(segs);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("First sentence ends here.");
    expect(result[1].text).toBe("Second sentence starts here.");
  });

  it("time gap exactly 1.5s → still flushes (gap >= 1.5 means flush)", () => {
    // gap = 4.5 - 3.0 = 1.5s exactly → flush (>= 1.5 rule)
    const segs = [
      makeSeg("First segment here.", 0, 3.0),
      makeSeg("Second segment here.", 4.5, 7.0),
    ];
    const result = mergeIntoUtterances(segs);
    expect(result).toHaveLength(2);
  });

  it("sentence terminator after MIN chars (80) → flush", () => {
    // Construct text >= 80 chars ending with "."
    const long = "This is a sufficiently long sentence that will trigger a flush when it ends."; // 75 chars
    const seg1 = makeSeg(long, 0, 5.0);
    const seg2 = makeSeg("More text follows here.", 5.3, 8.0);

    const result = mergeIntoUtterances([seg1, seg2]);
    // First segment alone is ~75 chars; < 80. Once we add seg2, "This is... ends. More text..."
    // The combined text ends with "." and is > 80 chars → flush after joining.
    // Depending on order: seg1 + seg2 combined > 80 and ends with "." → flushed as one.
    // Then nothing left → 1 utterance total
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain(long);
  });

  it("short sentences that end with period but < MIN_CHARS do NOT flush", () => {
    // "Hello." is 6 chars, well under 80
    const seg1 = makeSeg("Hello.", 0, 1.0);
    const seg2 = makeSeg("World.", 1.2, 2.0);
    const seg3 = makeSeg("How are you doing today?", 2.5, 4.0);
    const result = mergeIntoUtterances([seg1, seg2, seg3]);
    // All within gap, same speaker → all merged into one
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello. World. How are you doing today?");
  });

  it("hard cap at MAX chars (360) → flush", () => {
    // Build a segment that will exceed 360 chars when combined
    const longText = "a".repeat(180);
    const segs = [
      makeSeg(longText, 0, 3.0),
      makeSeg(longText, 3.2, 6.0),   // would make 361+ chars combined → flush
      makeSeg("final.", 6.4, 8.0),
    ];
    const result = mergeIntoUtterances(segs);
    // First two 180-char segments: combined = 180 + 1 + 180 = 361 > 360 → flush at seg2
    // So seg1 becomes utterance, then seg2 + "final." merged
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].text).toBe(longText);
  });
});

describe("mergeIntoUtterances — bracketed cue filtering", () => {
  it("[Music] cue → dropped", () => {
    const segs = [makeSeg("[Music]", 0, 3)];
    expect(mergeIntoUtterances(segs)).toHaveLength(0);
  });

  it("[Applause] cue → dropped", () => {
    const segs = [makeSeg("[Applause]", 0, 3)];
    expect(mergeIntoUtterances(segs)).toHaveLength(0);
  });

  it("[Laughter] cue → dropped", () => {
    const segs = [makeSeg("[Laughter]", 5, 8)];
    expect(mergeIntoUtterances(segs)).toHaveLength(0);
  });

  it("cue between real segments → dropped, real segments merge across the gap if close enough", () => {
    const segs = [
      makeSeg("Hello world,", 0, 3.0),
      makeSeg("[Music]", 3.1, 3.5), // filtered out
      makeSeg("we continue here.", 3.6, 6.0),
    ];
    const result = mergeIntoUtterances(segs);
    // The cue is dropped; "Hello world," and "we continue here." should merge
    // since effective gap = 3.6 - 3.0 = 0.6s (< 1.5s)
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello world, we continue here.");
  });

  it("whitespace-padded cue → also dropped", () => {
    const segs = [makeSeg("  [Music]  ", 0, 3)];
    expect(mergeIntoUtterances(segs)).toHaveLength(0);
  });
});

describe("mergeIntoUtterances — null speaker_id handling", () => {
  it("two null-speaker segments merge together", () => {
    const segs = [
      makeSeg("First fragment,", 0, 3.0, null),
      makeSeg("second fragment.", 3.3, 6.0, null),
    ];
    const result = mergeIntoUtterances(segs);
    expect(result).toHaveLength(1);
    expect(result[0].speaker_id).toBeNull();
  });

  it("null speaker then numbered speaker → flush", () => {
    const segs = [
      makeSeg("A null speaker fragment.", 0, 3.0, null),
      makeSeg("A numbered speaker.", 3.2, 6.0, 0),
    ];
    const result = mergeIntoUtterances(segs);
    expect(result).toHaveLength(2);
    expect(result[0].speaker_id).toBeNull();
    expect(result[1].speaker_id).toBe(0);
  });
});

describe("mergeIntoUtterances — realistic SRT fixture", () => {
  // Simulate a YouTube caption track: many short fragments close together,
  // punctuated by natural sentence breaks.
  it("multi-fragment realistic fixture → produces merged utterances with monotonic timestamps", () => {
    const segs: TranscriptSegment[] = [
      // Sentence 1: fragments within 0.5s gaps
      makeSeg("Welcome to the show", 0.0, 2.5, 0),
      makeSeg("where we discuss", 3.0, 5.5, 0),
      makeSeg("current events and policy.", 6.0, 8.5, 0),
      // Sentence 2: continues without long pause
      makeSeg("Today's topic is", 9.0, 11.0, 0),
      makeSeg("the uniform code of military justice", 11.4, 14.0, 0),
      makeSeg("as it applies to court martial.", 14.3, 17.0, 0),
      // Pause > 1.5s before next sentence
      makeSeg("Let's begin.", 20.0, 21.5, 0),
      // Cue in the middle
      makeSeg("[Music]", 22.0, 23.0, 0),
      // Final fragment
      makeSeg("Our guest today is a distinguished military scholar.", 23.5, 27.0, 0),
    ];

    const result = mergeIntoUtterances(segs);

    // Timestamps should be monotonically increasing
    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
    }

    // All utterances should have non-empty text
    for (const u of result) {
      expect(u.text.length).toBeGreaterThan(0);
    }

    // Should have fewer utterances than input segments (merging happened)
    expect(result.length).toBeLessThan(segs.length);

    // Bracketed cue should be absent from all output texts
    for (const u of result) {
      expect(u.text).not.toContain("[Music]");
    }
  });
});
