import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Phase 1e — client wires the per-call BIPA consent through to the server.
// Multipart path uses FormData; large-file JSON path uses a JSON body. Both
// default to absent (no consent) and only carry the flag when explicitly
// opted-in.

const { mockFetch, mockUpload } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockUpload: vi.fn(),
}));

vi.stubGlobal("fetch", mockFetch);

vi.mock("@vercel/blob/client", () => ({
  upload: (...args: unknown[]) => mockUpload(...args),
}));

vi.mock("@/lib/source-consent", () => ({
  sourceAnalysisConsentHeaders: () => ({}),
  sourceAnalysisConsentPayload: () => ({}),
}));

import { transcribeAudioFile } from "@/lib/client/audio-ingest";

function makeSmallFile(name = "small.wav", sizeBytes = 1024): File {
  // 1 KB so file.size < BLOB_UPLOAD_THRESHOLD_BYTES (4 MB)
  return new File([new Uint8Array(sizeBytes)], name, { type: "audio/wav" });
}

function makeLargeFile(name = "big.wav"): File {
  // 5 MB > 4 MB threshold
  return new File([new Uint8Array(5 * 1024 * 1024)], name, {
    type: "audio/wav",
  });
}

function okJsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("transcribeAudioFile multipart path (Phase 1e BIPA wiring)", () => {
  it("omits bipa_consented when the caller does not opt in", async () => {
    mockFetch.mockResolvedValue(okJsonResponse({ utterances: [], speakers: [] }));

    await transcribeAudioFile(makeSmallFile(), 10);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = mockFetch.mock.calls[0][1].body as FormData;
    expect(body.get("bipa_consented")).toBeNull();
  });

  it("appends bipa_consented='true' when caller passes opts.bipaConsented=true", async () => {
    mockFetch.mockResolvedValue(okJsonResponse({ utterances: [], speakers: [] }));

    await transcribeAudioFile(makeSmallFile(), 10, undefined, undefined, {
      bipaConsented: true,
    });

    const body = mockFetch.mock.calls[0][1].body as FormData;
    expect(body.get("bipa_consented")).toBe("true");
  });

  it("omits bipa_consented when caller passes opts.bipaConsented=false explicitly", async () => {
    mockFetch.mockResolvedValue(okJsonResponse({ utterances: [], speakers: [] }));

    await transcribeAudioFile(makeSmallFile(), 10, undefined, undefined, {
      bipaConsented: false,
    });

    const body = mockFetch.mock.calls[0][1].body as FormData;
    expect(body.get("bipa_consented")).toBeNull();
  });
});

describe("transcribeAudioFile JSON path (Phase 1e BIPA wiring — large files)", () => {
  beforeEach(() => {
    mockUpload.mockResolvedValue({ url: "https://blob.example.com/audio" });
  });

  it("omits bipa_consented from the JSON body when caller does not opt in", async () => {
    mockFetch.mockResolvedValue(okJsonResponse({ utterances: [], speakers: [] }));

    await transcribeAudioFile(makeLargeFile(), 60);

    const jsonBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(jsonBody.bipa_consented).toBeUndefined();
  });

  it("includes bipa_consented: true in the JSON body when caller opts in", async () => {
    mockFetch.mockResolvedValue(okJsonResponse({ utterances: [], speakers: [] }));

    await transcribeAudioFile(makeLargeFile(), 60, undefined, undefined, {
      bipaConsented: true,
    });

    const jsonBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(jsonBody.bipa_consented).toBe(true);
  });
});
