import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mock fns so vi.mock can reference them
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

import { transcribeUrl, transcribeFile } from "@/lib/server/deepgram-batch";

const ORIGINAL_BIPA_ENV = process.env.YENTL_ENABLE_BIPA_DIARIZE;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEEPGRAM_API_KEY = "test-key";
  // Make Deepgram return a minimal valid response so the parser doesn't throw.
  // We only care about the options the SDK was called with.
  const okResponse = {
    metadata: { request_id: "x", model_info: { name: "nova-3", version: "x", arch: "nova" }, model_uuid: "x" },
    results: { channels: [], utterances: [] },
  };
  mockTranscribeUrl.mockResolvedValue(okResponse);
  mockTranscribeFile.mockResolvedValue(okResponse);
});

afterEach(() => {
  delete process.env.DEEPGRAM_API_KEY;
  if (ORIGINAL_BIPA_ENV === undefined) delete process.env.YENTL_ENABLE_BIPA_DIARIZE;
  else process.env.YENTL_ENABLE_BIPA_DIARIZE = ORIGINAL_BIPA_ENV;
});

describe("deepgram-batch BIPA gate (Phase 1d Task 5)", () => {
  it("defaults to diarize:false when YENTL_ENABLE_BIPA_DIARIZE is unset", async () => {
    delete process.env.YENTL_ENABLE_BIPA_DIARIZE;

    await transcribeUrl("https://example.com/a.mp3");
    expect(mockTranscribeUrl).toHaveBeenCalledTimes(1);
    const calledWith = mockTranscribeUrl.mock.calls[0][0];
    expect(calledWith.diarize).toBe(false);
    expect(calledWith.diarize_model).toBeUndefined();
  });

  it("keeps diarize:false when env flag is '1' BUT bipaConsented is omitted (defense in depth)", async () => {
    process.env.YENTL_ENABLE_BIPA_DIARIZE = "1";

    await transcribeUrl("https://example.com/a.mp3"); // no opts at all
    const calledWith = mockTranscribeUrl.mock.calls[0][0];
    expect(calledWith.diarize).toBe(false);
    expect(calledWith.diarize_model).toBeUndefined();
  });

  it("keeps diarize:false when env flag is '1' BUT bipaConsented is explicitly false", async () => {
    process.env.YENTL_ENABLE_BIPA_DIARIZE = "1";

    await transcribeUrl("https://example.com/a.mp3", { bipaConsented: false });
    const calledWith = mockTranscribeUrl.mock.calls[0][0];
    expect(calledWith.diarize).toBe(false);
  });

  it("sets diarize:true ONLY when env flag is '1' AND bipaConsented is true", async () => {
    process.env.YENTL_ENABLE_BIPA_DIARIZE = "1";

    await transcribeUrl("https://example.com/a.mp3", { bipaConsented: true });
    const calledWith = mockTranscribeUrl.mock.calls[0][0];
    expect(calledWith.diarize).toBe(true);
    expect(calledWith.diarize_model).toBe("latest");
  });

  it("keeps diarize:false when bipaConsented is true BUT env flag is unset (env is the kill switch)", async () => {
    delete process.env.YENTL_ENABLE_BIPA_DIARIZE;

    await transcribeUrl("https://example.com/a.mp3", { bipaConsented: true });
    const calledWith = mockTranscribeUrl.mock.calls[0][0];
    expect(calledWith.diarize).toBe(false);
  });

  it("keeps diarize:false for any env value other than the exact string '1' (even with bipaConsented true)", async () => {
    for (const value of ["0", "true", "yes", "TRUE", " 1", "1 ", ""]) {
      process.env.YENTL_ENABLE_BIPA_DIARIZE = value;
      mockTranscribeUrl.mockClear();
      await transcribeUrl("https://example.com/a.mp3", { bipaConsented: true });
      const calledWith = mockTranscribeUrl.mock.calls[0][0];
      expect(calledWith.diarize, `unexpected diarize=true for env value '${value}'`).toBe(false);
    }
  });

  it("the file path uses the same dual gate", async () => {
    process.env.YENTL_ENABLE_BIPA_DIARIZE = "1";
    await transcribeFile(Buffer.from("audio bytes"), "audio/wav", { bipaConsented: true });
    expect(mockTranscribeFile).toHaveBeenCalledTimes(1);
    const calledWith = mockTranscribeFile.mock.calls[0][1];
    expect(calledWith.diarize).toBe(true);
    expect(calledWith.diarize_model).toBe("latest");
  });
});
