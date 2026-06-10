import { describe, expect, it } from "vitest";
import { dominantSpeaker } from "@/lib/client/deepgram-stream";
import { attributeMarker } from "@/lib/client/orchestrator";
import type { ASRWord, TranscriptSegment } from "@/lib/types";

const word = (
  text: string,
  start: number,
  end: number,
  speaker?: number,
): ASRWord => ({
  text,
  start,
  end,
  confidence: 0.9,
  ...(typeof speaker === "number" ? { speaker, speaker_confidence: 0.9 } : {}),
});

describe("dominantSpeaker", () => {
  it("returns null for empty input", () => {
    expect(dominantSpeaker([])).toBe(null);
  });

  it("returns null when no word has a speaker tag", () => {
    const words: ASRWord[] = [word("a", 0, 1)];
    expect(dominantSpeaker(words)).toBe(null);
  });

  it("returns the only speaker when all words share one tag", () => {
    const words: ASRWord[] = [word("a", 0, 1, 0), word("b", 1, 2, 0)];
    expect(dominantSpeaker(words)).toBe(0);
  });

  it("returns the dominant weighted speaker when mixed", () => {
    const words: ASRWord[] = [
      word("a", 0, 1, 0),
      word("b", 1, 2, 1),
      word("c", 2, 3, 0),
      word("d", 3, 4, 0),
    ];
    expect(dominantSpeaker(words)).toBe(0);
  });

  it("ignores words missing the speaker field", () => {
    const words: ASRWord[] = [word("a", 0, 1), word("b", 1, 2, 1), word("c", 2, 3)];
    expect(dominantSpeaker(words)).toBe(1);
  });
});

const seg = (start: number, end: number, speaker_id: number | null): TranscriptSegment => ({
  text: "x", start, end, is_final: true, speaker_id,
});

describe("attributeMarker", () => {
  const transcript: TranscriptSegment[] = [
    seg(0, 5, 0),
    seg(5, 10, 1),
    seg(10, 15, 0),
  ];

  it("returns the single overlapping speaker", () => {
    expect(attributeMarker({ start_time: 1, end_time: 3 } as never, transcript)).toBe(0);
    expect(attributeMarker({ start_time: 6, end_time: 8 } as never, transcript)).toBe(1);
  });

  it("returns null when overlap spans multiple speakers", () => {
    expect(attributeMarker({ start_time: 4, end_time: 7 } as never, transcript)).toBe(null);
  });

  it("returns null when no overlap", () => {
    expect(attributeMarker({ start_time: 100, end_time: 200 } as never, transcript)).toBe(null);
  });

  it("ignores segments with null speaker_id", () => {
    const t: TranscriptSegment[] = [seg(0, 5, null), seg(5, 10, 1)];
    expect(attributeMarker({ start_time: 1, end_time: 3 } as never, t)).toBe(null);
    expect(attributeMarker({ start_time: 6, end_time: 8 } as never, t)).toBe(1);
  });
});
