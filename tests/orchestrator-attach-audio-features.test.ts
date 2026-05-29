import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSession } from "@/lib/client/session-store";
import {
  attachAudioFeatures,
  onFinalUtterance,
  recordRmsSample,
} from "@/lib/client/orchestrator";
import type { TranscriptSegment } from "@/lib/types";

// Phase 1a PR #8 follow-up #2: the audio_features mutation must land BEFORE
// `appendFinal()` commits the segment to the Zustand store. The original
// `onFinalUtterance` did the mutation AFTER appendFinal at every caller,
// which works by reference today but goes silently stale the moment Phase E
// surfaces RMS via `useSession(s => s.transcript[i].audio_features)` — Zustand
// subscribers fire on `set()`, not on post-commit mutations of the stored
// object. Fix: split the mutation into a synchronous `attachAudioFeatures`
// helper that callers invoke before `appendFinal`, and remove the inline
// mutation from `onFinalUtterance`.

function makeSegment(overrides: Partial<TranscriptSegment> = {}): TranscriptSegment {
  return {
    text: "test utterance",
    start: 0,
    end: 1,
    is_final: true,
    speaker_id: null,
    ...overrides,
  };
}

describe("orchestrator: attachAudioFeatures (Phase 1a follow-up #2)", () => {
  beforeEach(() => {
    useSession.getState().reset();
    // Drain rolling RMS state so each test starts from a known baseline.
    recordRmsSample(0);
    attachAudioFeatures(makeSegment());
  });

  it("attaches { rms, peak_rms } from the rolling RMS state", () => {
    recordRmsSample(0.42);
    const seg = makeSegment();

    attachAudioFeatures(seg);

    expect(seg.audio_features).toEqual({ rms: 0.42, peak_rms: 0.42 });
  });

  it("resets peak_rms after attaching so the next segment starts fresh", () => {
    recordRmsSample(0.7);
    attachAudioFeatures(makeSegment());

    const seg2 = makeSegment();
    attachAudioFeatures(seg2);

    expect(seg2.audio_features?.peak_rms).toBe(0);
    // latestRms is rolling — stays until AudioMeter emits a new sample.
    expect(seg2.audio_features?.rms).toBe(0.7);
  });

  it("after attachAudioFeatures → appendFinal, store carries audio_features on first read", () => {
    recordRmsSample(0.5);
    const seg = makeSegment();

    attachAudioFeatures(seg);
    useSession.getState().appendFinal(seg);

    const stored = useSession.getState().transcript[0];
    expect(stored.audio_features).toEqual({ rms: 0.5, peak_rms: 0.5 });
  });

  it("onFinalUtterance does NOT mutate segment.audio_features (callers must call attachAudioFeatures themselves)", async () => {
    // Stub fetch so onFinalUtterance's /api/extract-claims call short-circuits.
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "stubbed",
      json: async () => ({ error: { message: "stubbed" } }),
    } as Response);

    try {
      const seg = makeSegment();
      expect(seg.audio_features).toBeUndefined();

      await onFinalUtterance(seg);

      // The mutation must NOT happen inside onFinalUtterance. If it does,
      // the legacy stale-subscriber bug regresses for any caller that calls
      // appendFinal before onFinalUtterance.
      expect(seg.audio_features).toBeUndefined();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
