import { describe, expect, it } from "vitest";
import { dominantSpeaker } from "@/lib/client/deepgram-stream";

type W = { word: string; start: number; end: number; speaker?: number };

describe("dominantSpeaker", () => {
  it("returns null for empty input", () => {
    expect(dominantSpeaker([])).toBe(null);
  });

  it("returns null when no word has a speaker tag", () => {
    const words: W[] = [{ word: "a", start: 0, end: 1 }];
    expect(dominantSpeaker(words)).toBe(null);
  });

  it("returns the only speaker when all words share one tag", () => {
    const words: W[] = [
      { word: "a", start: 0, end: 1, speaker: 0 },
      { word: "b", start: 1, end: 2, speaker: 0 },
    ];
    expect(dominantSpeaker(words)).toBe(0);
  });

  it("returns the mode speaker when mixed", () => {
    const words: W[] = [
      { word: "a", start: 0, end: 1, speaker: 0 },
      { word: "b", start: 1, end: 2, speaker: 1 },
      { word: "c", start: 2, end: 3, speaker: 0 },
      { word: "d", start: 3, end: 4, speaker: 0 },
    ];
    expect(dominantSpeaker(words)).toBe(0);
  });

  it("ignores words missing the speaker field", () => {
    const words: W[] = [
      { word: "a", start: 0, end: 1 },
      { word: "b", start: 1, end: 2, speaker: 1 },
      { word: "c", start: 2, end: 3 },
    ];
    expect(dominantSpeaker(words)).toBe(1);
  });
});
