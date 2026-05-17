/**
 * Tests for full-content synthesis triggered at endSession time for non-mic sources.
 *
 * Spec:
 *  - runFinalSynthesis() on a non-mic source triggers a synthesis call with the FULL transcript
 *  - runFinalSynthesis() on a mic source does NOT trigger a separate synthesis call
 *  - The full-content synthesis call passes ALL transcript segments, not a trailing slice
 *
 * Implementation: runFinalSynthesis() exported from orchestrator.ts, called by
 * EndSessionDialog after session.endSession() when source.kind !== "mic".
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// fetch is mocked globally for synthesis API calls
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

// ─── Helpers ──────────────────────────────────────────────────────────────────

import type { TranscriptSegment, SessionSource } from "@/lib/types";

function makeSeg(text: string, i: number, speakerId = 0): TranscriptSegment {
  return {
    text,
    start: i * 10,
    end: i * 10 + 9,
    is_final: true,
    speaker_id: speakerId,
  };
}

function successResponse() {
  return Promise.resolve({
    ok: true,
    json: async () => ({
      text: "Full session synthesis.",
      headlines: ["Headline 1", "Headline 2", "Headline 3"],
    }),
  } as Response);
}

async function seedSessionWithSource(
  source: SessionSource,
  segments: TranscriptSegment[],
) {
  const { useSession } = await import("@/lib/client/session-store");
  useSession.getState().reset();
  useSession.getState().setSource(source);
  useSession.getState().startSession("Test session");
  for (const seg of segments) {
    useSession.getState().appendFinal(seg);
  }
  return useSession;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("runFinalSynthesis — non-mic sources get full-transcript synthesis", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFetch.mockReturnValue(successResponse());
  });

  it("Test 1: runFinalSynthesis() triggers a /api/synthesize call for a YouTube source", async () => {
    const youtubeSource: SessionSource = {
      kind: "youtube",
      video_id: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    };
    const segments = Array.from({ length: 25 }, (_, i) => makeSeg(`Segment ${i}.`, i));

    await seedSessionWithSource(youtubeSource, segments);

    const { runFinalSynthesis } = await import("@/lib/client/orchestrator");
    await runFinalSynthesis();

    const synthesisCalls = mockFetch.mock.calls.filter(
      ([url]) => url === "/api/synthesize",
    );
    expect(synthesisCalls.length).toBe(1);
  });

  it("Test 3: runFinalSynthesis() passes ALL transcript segments (not just trailing 20)", async () => {
    const textSource: SessionSource = {
      kind: "text_doc",
      filename: "doc.txt",
      mime: "text/plain",
      byte_count: 500,
    };
    // 50 segments — normal trailing window would only send last 20
    const segments = Array.from({ length: 50 }, (_, i) => makeSeg(`Word ${i}.`, i));

    await seedSessionWithSource(textSource, segments);

    const { runFinalSynthesis } = await import("@/lib/client/orchestrator");
    await runFinalSynthesis();

    const synthesisCalls = mockFetch.mock.calls.filter(
      ([url]) => url === "/api/synthesize",
    );
    expect(synthesisCalls.length).toBe(1);

    const body = JSON.parse(synthesisCalls[0][1].body as string);

    // Full synthesis must include ALL 50 segments, not a trailing slice of 20
    expect(body.utterances).toHaveLength(50);

    // Verify first and last segments are present
    expect(body.utterances[0].text).toBe("Word 0.");
    expect(body.utterances[49].text).toBe("Word 49.");
  });
});

describe("endSession synthesis — mic sources are excluded", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFetch.mockReturnValue(successResponse());
  });

  it("Test 2: runFinalSynthesis() for a mic source does NOT call /api/synthesize", async () => {
    // NOTE: For mic sources, the trailing-window pacer handles synthesis.
    // runFinalSynthesis() must guard against mic sources to avoid double-fire.
    const micSource: SessionSource = { kind: "mic" };
    const segments = Array.from({ length: 10 }, (_, i) => makeSeg(`Mic utterance ${i}.`, i));

    await seedSessionWithSource(micSource, segments);

    const { runFinalSynthesis } = await import("@/lib/client/orchestrator");
    await runFinalSynthesis();

    const synthesisCalls = mockFetch.mock.calls.filter(
      ([url]) => url === "/api/synthesize",
    );
    // Mic sessions rely on the trailing-window pacer — no extra synthesis at endSession
    expect(synthesisCalls.length).toBe(0);
  });
});

describe("runFinalSynthesis — additional source kinds", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFetch.mockReturnValue(successResponse());
  });

  it("fires for audio file source", async () => {
    const audioSource: SessionSource = {
      kind: "audio_file",
      blob_url: "blob:http://localhost/abc123",
      duration_sec: 120,
      filename: "speech.mp3",
      mime: "audio/mpeg",
    };
    const segments = Array.from({ length: 30 }, (_, i) => makeSeg(`Audio word ${i}.`, i));

    await seedSessionWithSource(audioSource, segments);

    const { runFinalSynthesis } = await import("@/lib/client/orchestrator");
    await runFinalSynthesis();

    const synthesisCalls = mockFetch.mock.calls.filter(
      ([url]) => url === "/api/synthesize",
    );
    expect(synthesisCalls.length).toBe(1);
  });

  it("fires for media URL source", async () => {
    const mediaSource: SessionSource = {
      kind: "media_url",
      url: "https://example.com/podcast.mp3",
    };
    const segments = Array.from({ length: 30 }, (_, i) => makeSeg(`Media word ${i}.`, i));

    await seedSessionWithSource(mediaSource, segments);

    const { runFinalSynthesis } = await import("@/lib/client/orchestrator");
    await runFinalSynthesis();

    const synthesisCalls = mockFetch.mock.calls.filter(
      ([url]) => url === "/api/synthesize",
    );
    expect(synthesisCalls.length).toBe(1);
  });

  it("fires for text_doc source", async () => {
    const textSource: SessionSource = {
      kind: "text_doc",
      filename: "essay.pdf",
      mime: "application/pdf",
      byte_count: 1024,
    };
    const segments = Array.from({ length: 30 }, (_, i) => makeSeg(`Text chunk ${i}.`, i));

    await seedSessionWithSource(textSource, segments);

    const { runFinalSynthesis } = await import("@/lib/client/orchestrator");
    await runFinalSynthesis();

    const synthesisCalls = mockFetch.mock.calls.filter(
      ([url]) => url === "/api/synthesize",
    );
    expect(synthesisCalls.length).toBe(1);
  });
});
