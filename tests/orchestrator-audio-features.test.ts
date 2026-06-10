import { beforeEach, describe, expect, it } from "vitest";
import {
  recordRmsSample,
  resetAudioFeatureWindowForTest,
  withAudioFeatures,
} from "@/lib/client/orchestrator";
import type { TranscriptSegment } from "@/lib/types";

const segment = (start: number): TranscriptSegment => ({
  text: "Hello",
  start,
  end: start + 1,
  is_final: true,
  speaker_id: null,
});

describe("orchestrator audio feature window", () => {
  beforeEach(() => {
    resetAudioFeatureWindowForTest();
  });

  it("attaches latest RMS and peak RMS to finalized mic segments", () => {
    recordRmsSample(0.12);
    recordRmsSample(0.48);
    recordRmsSample(0.31);

    const enriched = withAudioFeatures(segment(0));

    expect(enriched.audio_features?.rms).toBeCloseTo(0.31);
    expect(enriched.audio_features?.peak_rms).toBeCloseTo(0.48);
  });

  it("resets peak tracking after a segment is decorated", () => {
    recordRmsSample(0.12);
    recordRmsSample(0.48);
    recordRmsSample(0.31);
    withAudioFeatures(segment(0));

    recordRmsSample(0.34);
    const enriched = withAudioFeatures(segment(1));

    expect(enriched.audio_features?.rms).toBeCloseTo(0.34);
    expect(enriched.audio_features?.peak_rms).toBeCloseTo(0.34);
  });
});
