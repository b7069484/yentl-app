import { describe, it, expect } from "vitest";
import { dominantSpeaker, isLatentBoundary } from "@/lib/client/deepgram-stream";
import type { ASRWord } from "@/lib/types";

describe("dominantSpeaker (confidence-weighted)", () => {
  it("returns null when no words carry speaker info", () => {
    const words: ASRWord[] = [
      { text: "a", start: 0, end: 0.1, confidence: 0.9 },
      { text: "b", start: 0.1, end: 0.2, confidence: 0.9 },
    ];
    expect(dominantSpeaker(words)).toBeNull();
  });

  it("prefers high-confidence speaker even if word count is lower", () => {
    // Speaker 1: 1 word × 1.0s × 0.95 conf = 0.95
    // Speaker 2: 2 words × 0.3s × 0.4 conf = 0.24
    const words: ASRWord[] = [
      { text: "long", start: 0, end: 1, confidence: 0.95, speaker: 1, speaker_confidence: 0.95 },
      { text: "uh", start: 1, end: 1.3, confidence: 0.5, speaker: 2, speaker_confidence: 0.4 },
      { text: "ok", start: 1.3, end: 1.6, confidence: 0.5, speaker: 2, speaker_confidence: 0.4 },
    ];
    expect(dominantSpeaker(words)).toBe(1);
  });

  it("returns null when scores are within 10% margin (low-margin → uncertain)", () => {
    const words: ASRWord[] = [
      { text: "a", start: 0, end: 0.5, confidence: 0.8, speaker: 1, speaker_confidence: 0.5 },
      { text: "b", start: 0.5, end: 1, confidence: 0.8, speaker: 2, speaker_confidence: 0.5 },
    ];
    expect(dominantSpeaker(words)).toBeNull();
  });
});

describe("isLatentBoundary", () => {
  it("returns true when segment.start is within 300ms of prior.end", () => {
    expect(isLatentBoundary({ start: 5.2 }, { end: 5.0 })).toBe(true);
  });

  it("returns false when gap >= 300ms", () => {
    expect(isLatentBoundary({ start: 5.4 }, { end: 5.0 })).toBe(false);
  });

  it("returns false when prior segment is undefined", () => {
    expect(isLatentBoundary({ start: 0 }, undefined)).toBe(false);
  });
});
