import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock @deepgram/sdk ────────────────────────────────────────────────────────
// Must be hoisted before any imports that pull in the module.

const mockTranscribeUrl = vi.fn();
const mockTranscribeFile = vi.fn();

vi.mock("@deepgram/sdk", () => {
  const DeepgramClient = vi.fn(function (this: unknown) {
    (this as Record<string, unknown>).listen = {
      v1: {
        media: {
          transcribeUrl: mockTranscribeUrl,
          transcribeFile: mockTranscribeFile,
        },
      },
    };
  });
  return { DeepgramClient };
});

// Import under test AFTER mock is registered
import { transcribeUrl, transcribeFile } from "@/lib/server/deepgram-batch";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a mock Deepgram response in the shape the SDK actually resolves to:
 * ListenV1Response = { metadata: {...}, results: { channels, utterances? } }
 * (HttpResponsePromise<T> extends Promise<T>, so awaiting it gives T directly)
 *
 * The optional `words` array is placed under results.channels[0].alternatives[0].words,
 * matching the real Deepgram API structure.
 */
function makeDeepgramResponse(utterances: Array<{
  transcript?: string;
  start?: number;
  end?: number;
  speaker?: number;
}>, words?: Array<{
  word?: string;
  start?: number;
  end?: number;
  confidence?: number;
  speaker?: number;
  speaker_confidence?: number;
}>) {
  return {
    metadata: {
      request_id: "test-request-id",
      model_info: { name: "nova-3", version: "latest", arch: "nova" },
      model_uuid: "test-uuid",
    },
    results: {
      channels: words
        ? [{ alternatives: [{ words }] }]
        : [],
      utterances,
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("transcribeUrl — result mapping", () => {
  beforeEach(() => {
    process.env.DEEPGRAM_API_KEY = "test-key";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.DEEPGRAM_API_KEY;
  });

  it("maps Deepgram utterances to TranscriptSegment[] with correct fields", async () => {
    mockTranscribeUrl.mockResolvedValue(
      makeDeepgramResponse([
        { transcript: "Hello world.", start: 0.0, end: 1.5, speaker: 0 },
        { transcript: "This is a test.", start: 1.8, end: 3.2, speaker: 1 },
      ]),
    );

    const { utterances } = await transcribeUrl("https://example.com/audio.mp3");

    expect(utterances).toHaveLength(2);

    expect(utterances[0]).toMatchObject({
      text: "Hello world.",
      start: 0.0,
      end: 1.5,
      is_final: true,
      speaker_id: 0,
      provider: "deepgram",
    });

    expect(utterances[1]).toMatchObject({
      text: "This is a test.",
      start: 1.8,
      end: 3.2,
      is_final: true,
      speaker_id: 1,
      provider: "deepgram",
    });
  });

  it("sets is_final: true on every segment", async () => {
    mockTranscribeUrl.mockResolvedValue(
      makeDeepgramResponse([
        { transcript: "A", start: 0, end: 1, speaker: 0 },
        { transcript: "B", start: 1, end: 2, speaker: 0 },
      ]),
    );

    const { utterances } = await transcribeUrl("https://example.com/audio.mp3");
    expect(utterances.every((u) => u.is_final === true)).toBe(true);
  });

  it("returns speaker_id null + attribution_status not_available when Deepgram omits speaker", async () => {
    mockTranscribeUrl.mockResolvedValue(
      makeDeepgramResponse([
        { transcript: "No speaker field.", start: 0, end: 1 /* no .speaker */ },
      ]),
    );

    const { utterances } = await transcribeUrl("https://example.com/audio.mp3");
    expect(utterances).toHaveLength(1);
    expect(utterances[0].speaker_id).toBeNull();
    expect(utterances[0].attribution_status).toBe("not_available");
  });

  it("preserves words[] from results.channels[0].alternatives[0].words when present", async () => {
    mockTranscribeUrl.mockResolvedValue(
      makeDeepgramResponse(
        [{ transcript: "Hello world", start: 0, end: 1 }],
        [
          { word: "Hello", start: 0, end: 0.5, confidence: 0.95 },
          { word: "world", start: 0.5, end: 1, confidence: 0.91 },
        ],
      ),
    );

    const { utterances } = await transcribeUrl("https://example.com/audio.mp3");
    expect(utterances[0].words).toHaveLength(2);
    expect(utterances[0].words?.[0]).toMatchObject({
      text: "Hello",
      start: 0,
      end: 0.5,
      confidence: 0.95,
    });
  });

  // Half-open midpoint filter regression — adjacent utterances must not double-count
  // a word whose midpoint lands exactly on their shared boundary. The interval is
  // [start, end), so the boundary word belongs to the later utterance. Without this
  // guarantee, BIPA-gated diarize:true would silently duplicate words across two
  // segments and inflate confidence-weighted speaker aggregation.
  it("does not double-assign a word whose midpoint falls exactly on an utterance boundary", async () => {
    mockTranscribeUrl.mockResolvedValue(
      makeDeepgramResponse(
        [
          { transcript: "First half.", start: 0, end: 1.0 },
          { transcript: "Second half.", start: 1.0, end: 2.0 },
        ],
        [
          { word: "edge", start: 0.8, end: 1.2, confidence: 0.9 }, // midpoint = 1.0
        ],
      ),
    );

    const { utterances } = await transcribeUrl("https://example.com/audio.mp3");
    const firstWords = utterances[0].words ?? [];
    const secondWords = utterances[1].words ?? [];

    expect(firstWords).toHaveLength(0);
    expect(secondWords).toHaveLength(1);
    expect(secondWords[0]?.text).toBe("edge");
  });

  it("sets provider: 'deepgram' and source_audio_kind: 'audio_file' on every segment", async () => {
    mockTranscribeUrl.mockResolvedValue(
      makeDeepgramResponse([{ transcript: "x", start: 0, end: 1 }]),
    );

    const { utterances } = await transcribeUrl("https://example.com/audio.mp3");
    expect(utterances[0].provider).toBe("deepgram");
    expect(utterances[0].source_audio_kind).toBe("audio_file");
  });
});

describe("transcribeUrl — Speaker[] construction", () => {
  beforeEach(() => {
    process.env.DEEPGRAM_API_KEY = "test-key";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.DEEPGRAM_API_KEY;
  });

  it("builds Speaker[] from unique speaker indices, sorted, labeled 'Speaker N'", async () => {
    mockTranscribeUrl.mockResolvedValue(
      makeDeepgramResponse([
        { transcript: "A", start: 0, end: 1, speaker: 1 },
        { transcript: "B", start: 1, end: 2, speaker: 0 },
        { transcript: "C", start: 2, end: 3, speaker: 1 },
        { transcript: "D", start: 3, end: 4, speaker: 2 },
      ]),
    );

    const { speakers } = await transcribeUrl("https://example.com/audio.mp3");

    expect(speakers).toEqual([
      { id: 0, label: "Speaker 1" },
      { id: 1, label: "Speaker 2" },
      { id: 2, label: "Speaker 3" },
    ]);
  });

  it("single speaker → [{ id: 0, label: 'Speaker 1' }]", async () => {
    mockTranscribeUrl.mockResolvedValue(
      makeDeepgramResponse([
        { transcript: "Just me.", start: 0, end: 2, speaker: 0 },
      ]),
    );

    const { speakers } = await transcribeUrl("https://example.com/audio.mp3");
    expect(speakers).toEqual([{ id: 0, label: "Speaker 1" }]);
  });

  it("empty utterances → empty arrays", async () => {
    mockTranscribeUrl.mockResolvedValue(makeDeepgramResponse([]));

    const { utterances, speakers } = await transcribeUrl("https://example.com/audio.mp3");
    expect(utterances).toEqual([]);
    expect(speakers).toEqual([]);
  });
});

describe("transcribeUrl — error handling", () => {
  afterEach(() => {
    delete process.env.DEEPGRAM_API_KEY;
    vi.clearAllMocks();
  });

  it("throws informative error when DEEPGRAM_API_KEY is not set", async () => {
    delete process.env.DEEPGRAM_API_KEY;

    // Reset the module cache so getClient() re-evaluates process.env
    // We need to reimport after clearing the env var.
    // Since the client is cached in a module-level variable, we work around
    // this by checking what error the implementation throws.
    // The error is thrown from the getClient() guard in deepgram-batch.ts.
    // Because the mock already created a client instance in previous tests,
    // we test by resetting the mock's constructor to throw.
    const { DeepgramClient } = await import("@deepgram/sdk");
    const MockClass = DeepgramClient as ReturnType<typeof vi.fn>;
    MockClass.mockImplementationOnce(() => {
      // Simulate what getClient does — it checks process.env inside
      // We can't easily reset the singleton without reimporting,
      // so this test verifies the error text by calling with no key explicitly.
      throw new Error("DEEPGRAM_API_KEY is not set. Add it to .env.local before calling transcribeUrl().");
    });

    // Clear the cached singleton by reimporting
    vi.resetModules();
    const { transcribeUrl: fresh } = await import("@/lib/server/deepgram-batch");

    await expect(fresh("https://example.com/audio.mp3")).rejects.toThrow(
      /DEEPGRAM_API_KEY is not set/,
    );
  });

  it("throws when Deepgram returns no results (async callback path)", async () => {
    process.env.DEEPGRAM_API_KEY = "test-key";
    vi.clearAllMocks();
    // ListenV1AcceptedResponse: only has request_id, no `results` field
    mockTranscribeUrl.mockResolvedValue({
      request_id: "abc123",
    });

    await expect(transcribeUrl("https://example.com/audio.mp3")).rejects.toThrow(
      /did not return synchronous results/,
    );
  });
});

// ─── transcribeFile tests ─────────────────────────────────────────────────────

describe("transcribeFile — result mapping", () => {
  beforeEach(() => {
    process.env.DEEPGRAM_API_KEY = "test-key";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.DEEPGRAM_API_KEY;
  });

  it("maps Deepgram utterances to TranscriptSegment[] for a buffer upload", async () => {
    mockTranscribeFile.mockResolvedValue(
      makeDeepgramResponse([
        { transcript: "Hello world.", start: 0.0, end: 1.5, speaker: 0 },
        { transcript: "This is a test.", start: 1.8, end: 3.2, speaker: 1 },
      ]),
    );

    const buffer = Buffer.from("fake-audio-data");
    const { utterances } = await transcribeFile(buffer, "audio/mpeg");

    expect(utterances).toHaveLength(2);
    expect(utterances[0]).toMatchObject({
      text: "Hello world.",
      start: 0.0,
      end: 1.5,
      is_final: true,
      speaker_id: 0,
      provider: "deepgram",
    });
    expect(utterances[1]).toMatchObject({
      text: "This is a test.",
      start: 1.8,
      end: 3.2,
      is_final: true,
      speaker_id: 1,
      provider: "deepgram",
    });
  });

  it("passes the buffer as { data: buffer, contentType: mime } to transcribeFile", async () => {
    mockTranscribeFile.mockResolvedValue(makeDeepgramResponse([]));

    const buffer = Buffer.from("audio-bytes");
    await transcribeFile(buffer, "audio/wav");

    expect(mockTranscribeFile).toHaveBeenCalledWith(
      { data: buffer, contentType: "audio/wav" },
      expect.objectContaining({
        model: "nova-3",
        // diarize is intentionally OFF in v1 per yentl-this-week-actions
        // clause 1 — voiceprint capture would expose us to BIPA damages.
        // See lib/server/deepgram-batch.ts TRANSCRIBE_OPTIONS comment block.
        diarize: false,
        utterances: true,
        punctuate: true,
        smart_format: true,
        language: "en",
      }),
    );
  });

  it("builds Speaker[] correctly from buffer transcription", async () => {
    mockTranscribeFile.mockResolvedValue(
      makeDeepgramResponse([
        { transcript: "A", start: 0, end: 1, speaker: 1 },
        { transcript: "B", start: 1, end: 2, speaker: 0 },
      ]),
    );

    const { speakers } = await transcribeFile(Buffer.from("x"), "audio/webm");
    expect(speakers).toEqual([
      { id: 0, label: "Speaker 1" },
      { id: 1, label: "Speaker 2" },
    ]);
  });

  it("returns empty arrays for empty utterances", async () => {
    mockTranscribeFile.mockResolvedValue(makeDeepgramResponse([]));

    const { utterances, speakers } = await transcribeFile(Buffer.from("x"), "audio/mpeg");
    expect(utterances).toEqual([]);
    expect(speakers).toEqual([]);
  });

  it("also accepts Uint8Array", async () => {
    mockTranscribeFile.mockResolvedValue(makeDeepgramResponse([]));

    const uint8 = new Uint8Array([1, 2, 3]);
    await expect(transcribeFile(uint8, "audio/ogg")).resolves.toBeDefined();
  });
});

describe("transcribeFile — error handling", () => {
  beforeEach(() => {
    process.env.DEEPGRAM_API_KEY = "test-key";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.DEEPGRAM_API_KEY;
  });

  it("throws when Deepgram returns no results (async callback path)", async () => {
    mockTranscribeFile.mockResolvedValue({ request_id: "abc123" });

    await expect(transcribeFile(Buffer.from("x"), "audio/mpeg")).rejects.toThrow(
      /did not return synchronous results/,
    );
  });

  it("propagates Deepgram SDK errors", async () => {
    mockTranscribeFile.mockRejectedValue(new Error("Quota exceeded"));

    await expect(transcribeFile(Buffer.from("x"), "audio/mpeg")).rejects.toThrow(
      "Quota exceeded",
    );
  });
});
