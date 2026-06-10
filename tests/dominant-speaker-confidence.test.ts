import { describe, expect, it } from "vitest";
import { dominantSpeaker, isLatentBoundary } from "@/lib/client/deepgram-stream";
import type { ASRWord, TranscriptSegment } from "@/lib/types";

const word = (
  text: string,
  start: number,
  end: number,
  speaker: number | null,
  speakerConfidence: number,
): ASRWord => ({
  text,
  start,
  end,
  confidence: 0.9,
  speaker,
  speaker_confidence: speakerConfidence,
});

describe("dominantSpeaker confidence weighting", () => {
  it("weights speakers by duration times speaker confidence instead of word count", () => {
    const words: ASRWord[] = [
      word("short", 0, 0.1, 0, 0.8),
      word("bursty", 0.1, 0.2, 0, 0.8),
      word("aside", 0.2, 0.3, 0, 0.8),
      word("substantive", 0.3, 2.3, 1, 0.9),
    ];

    expect(dominantSpeaker(words)).toBe(1);
  });

  it("returns null when no word carries speaker information", () => {
    const words: ASRWord[] = [
      { text: "unknown", start: 0, end: 0.5, confidence: 0.9 },
      { text: "speaker", start: 0.5, end: 1, confidence: 0.9, speaker: null },
    ];

    expect(dominantSpeaker(words)).toBe(null);
  });

  it("returns null when the top speaker margin is too narrow", () => {
    const words: ASRWord[] = [
      word("first", 0, 1, 0, 1),
      word("second", 1, 1.95, 1, 0.98),
    ];

    expect(dominantSpeaker(words)).toBe(null);
  });
});

describe("isLatentBoundary", () => {
  const prior: TranscriptSegment = {
    text: "first",
    start: 0,
    end: 1,
    is_final: true,
    speaker_id: 0,
  };

  it("flags a segment that starts within the latent speaker-boundary window", () => {
    const next: TranscriptSegment = {
      text: "second",
      start: 1.25,
      end: 2,
      is_final: true,
      speaker_id: 1,
      latent_boundary: true,
    };

    expect(isLatentBoundary(next, prior)).toBe(true);
  });

  it("does not flag a segment outside the latent speaker-boundary window", () => {
    const next: TranscriptSegment = {
      text: "second",
      start: 1.3,
      end: 2,
      is_final: true,
      speaker_id: 1,
    };

    expect(isLatentBoundary(next, prior)).toBe(false);
  });
});
