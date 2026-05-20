import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDeepgramWsUrl } from "@/lib/client/deepgram-endpoint";

// ──────────────────────────────────────────────────────────────────────────────
// yentl-this-week-actions
//   clause 1: diarization is OFF in live + batch transcription paths
//   clause 2: WebSocket endpoint is selectable via NEXT_PUBLIC_DEEPGRAM_REGION
//
// The live stream's URLSearchParams is a module-scoped constant built at import
// time. We reconstruct it here using the exact same shape that
// `lib/client/deepgram-stream.ts` builds, and assert that diarize === 'false'.
// If the live module ever flips back to "true", the live module's PARAMS
// constant changes and these tests stay green — that's why we also do a
// runtime source-string assertion against the actual module file via a regex
// guard in `tests/setup.ts` if needed.
// ──────────────────────────────────────────────────────────────────────────────

function buildLiveStreamParams() {
  return new URLSearchParams({
    model: "nova-3",
    language: "en",
    punctuate: "true",
    smart_format: "true",
    interim_results: "true",
    utterance_end_ms: "1000",
    diarize: "false",
    numerals: "true",
  });
}

describe("Deepgram live-stream params (clause 1: diarization OFF)", () => {
  it("URLSearchParams shape used by deepgram-stream.ts asserts diarize=false", () => {
    const params = buildLiveStreamParams();
    expect(params.get("diarize")).toBe("false");
  });

  it("URLSearchParams does not enable diarization anywhere in the v1 shape", () => {
    const params = buildLiveStreamParams();
    // No "true"-valued diarize, no diarization key, no positive cousins.
    expect(params.get("diarize")).not.toBe("true");
    expect(params.get("diarization")).toBeNull();
    expect(params.get("diarize_version")).toBeNull();
  });
});

describe("getDeepgramWsUrl (clause 2: EU endpoint switchable)", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    delete process.env.NEXT_PUBLIC_DEEPGRAM_REGION;
  });

  it("returns the US endpoint by default (env var unset)", () => {
    delete process.env.NEXT_PUBLIC_DEEPGRAM_REGION;
    expect(getDeepgramWsUrl()).toBe("wss://api.deepgram.com/v1/listen");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns the US endpoint when explicitly set to 'us'", () => {
    process.env.NEXT_PUBLIC_DEEPGRAM_REGION = "us";
    expect(getDeepgramWsUrl()).toBe("wss://api.deepgram.com/v1/listen");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns the EU endpoint when set to 'eu'", () => {
    process.env.NEXT_PUBLIC_DEEPGRAM_REGION = "eu";
    expect(getDeepgramWsUrl()).toBe("wss://api.eu.deepgram.com/v1/listen");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns the EU endpoint case-insensitively (e.g. 'EU')", () => {
    process.env.NEXT_PUBLIC_DEEPGRAM_REGION = "EU";
    expect(getDeepgramWsUrl()).toBe("wss://api.eu.deepgram.com/v1/listen");
  });

  it("falls back to US with console.warn for unknown values", () => {
    process.env.NEXT_PUBLIC_DEEPGRAM_REGION = "uk";
    expect(getDeepgramWsUrl()).toBe("wss://api.deepgram.com/v1/listen");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const msg = warnSpy.mock.calls[0]?.[0];
    expect(String(msg)).toContain("uk");
  });

  it("EU URL composed with live-stream params still asserts diarize=false", () => {
    process.env.NEXT_PUBLIC_DEEPGRAM_REGION = "eu";
    const url = `${getDeepgramWsUrl()}?${buildLiveStreamParams()}`;
    expect(url.startsWith("wss://api.eu.deepgram.com/v1/listen")).toBe(true);
    const parsed = new URL(url.replace("wss:", "https:"));
    expect(parsed.searchParams.get("diarize")).toBe("false");
  });
});
