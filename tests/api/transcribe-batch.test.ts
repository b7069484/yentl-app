import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock deepgram-batch ──────────────────────────────────────────────────────

const mockTranscribeUrl = vi.fn();
const mockTranscribeFile = vi.fn();
const mockTranscribeStream = vi.fn();
const mockBlobGet = vi.fn();
const mockBlobDel = vi.fn();
const mockAssertSafeUrl = vi.fn();

vi.mock("@/lib/server/deepgram-batch", () => ({
  transcribeUrl: mockTranscribeUrl,
  transcribeFile: mockTranscribeFile,
  transcribeStream: mockTranscribeStream,
}));

vi.mock("@vercel/blob", () => ({
  get: mockBlobGet,
  del: mockBlobDel,
}));

vi.mock("@/lib/server/ssrf-guard", () => ({
  assertSafeUrl: mockAssertSafeUrl,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_UTTERANCES = [
  { text: "Hello world.", start: 0, end: 1.5, is_final: true, speaker_id: 0 },
];

const VALID_SPEAKERS = [{ id: 0, label: "Speaker 1" }];
const LOCAL_VALIDATION_WAV_URL = "http://localhost:3000/validation/yentl-synthetic-panel.wav";
const LOCAL_VALIDATION_MP4_URL = "http://localhost:3000/validation/yentl-synthetic-panel.mp4";
const LOCAL_VALIDATION_MOV_URL = "http://localhost:3000/validation/yentl-synthetic-panel.mov";
const LOCAL_VALIDATION_WEBM_URL = "http://localhost:3000/validation/yentl-synthetic-panel.webm";
const PUBLIC_MEDIA_URL = "https://example.com/audio.mp3";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/transcribe-batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-yentl-source-consent": "source-analysis-v1",
    },
    body: JSON.stringify(body),
  });
}

function makeAudioFile(name = "audio.mp3", type = "audio/mpeg", size = 1024): File {
  const content = "x".repeat(Math.min(size, 100));
  const file = new File([content], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function ssrfError(code: "SSRF_BLOCKED" | "INVALID_URL", message: string): Error {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

/**
 * Creates a Request that advertises multipart/form-data and has a mocked
 * formData() method returning the specified fields. This bypasses the
 * jsdom/Node multipart-parse boundary issue in tests.
 */
function makeMultipartRequest(fields: {
  file?: File | null;
  duration_sec?: string | null;
}): Request {
  const formData = new FormData();
  if (fields.file !== null && fields.file !== undefined) {
    formData.append("file", fields.file);
  }
  if (fields.duration_sec !== null && fields.duration_sec !== undefined) {
    formData.append("duration_sec", fields.duration_sec);
  }

  const req = new Request("http://localhost/api/transcribe-batch", {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data; boundary=boundary",
      "x-yentl-source-consent": "source-analysis-v1",
    },
    body: "placeholder",
  });
  // Override formData() to return our pre-built FormData synchronously
  (req as unknown as Record<string, unknown>).formData = () => Promise.resolve(formData);
  return req;
}

// ─── Tests — JSON path (back-compat) ─────────────────────────────────────────

describe("POST /api/transcribe-batch — JSON path (blob_url)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranscribeUrl.mockResolvedValue({
      utterances: VALID_UTTERANCES,
      speakers: VALID_SPEAKERS,
    });
    mockTranscribeStream.mockResolvedValue({
      utterances: VALID_UTTERANCES,
      speakers: VALID_SPEAKERS,
    });
    mockBlobGet.mockResolvedValue(null);
    mockBlobDel.mockResolvedValue(undefined);
    mockAssertSafeUrl.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with utterances and speakers for valid blob_url", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({ blob_url: "https://blob.vercel-storage.com/audio.mp3", duration_sec: 120 });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.utterances).toEqual(VALID_UTTERANCES);
    expect(json.speakers).toEqual(VALID_SPEAKERS);
  });

  it("guards and transcribes the JSON url path for non-Blob URLs", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({ url: PUBLIC_MEDIA_URL, duration_sec: 120 });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(mockAssertSafeUrl).toHaveBeenCalledWith(PUBLIC_MEDIA_URL);
    expect(mockTranscribeUrl).toHaveBeenCalledWith(PUBLIC_MEDIA_URL);
  });

  it("blocks the JSON url path when assertSafeUrl rejects a private target", async () => {
    mockAssertSafeUrl.mockRejectedValue(
      ssrfError("SSRF_BLOCKED", "URL resolved to a private address"),
    );

    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({ url: PUBLIC_MEDIA_URL, duration_sec: 120 });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/private address/);
    expect(mockTranscribeUrl).not.toHaveBeenCalled();
  });

  it("returns the deterministic local WAV validation transcript for the JSON url path", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({ url: LOCAL_VALIDATION_WAV_URL, duration_sec: 31.953 });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.validation_fixture).toBe(true);
    expect(json.validation_fixture_id).toBe("yentl_synthetic_panel_wav");
    expect(json.utterances).toHaveLength(5);
    expect(json.utterances.map((segment: { start: number }) => segment.start)).toEqual([0, 4, 10, 17, 25]);
    expect(json.utterances[0]).toMatchObject({
      provider: "validation_fixture",
      speaker_id: 0,
      attribution_status: "confident",
      source_audio_kind: "audio_file",
    });
    expect(json.utterances.map((segment: { speaker_id: number | null }) => segment.speaker_id)).toEqual([0, 0, 1, 0, 1]);
    expect(json.speakers).toEqual([
      { id: 0, label: "Moderator" },
      { id: 1, label: "Analyst" },
    ]);
    expect(mockTranscribeUrl).not.toHaveBeenCalled();
    expect(mockTranscribeStream).not.toHaveBeenCalled();
    expect(mockBlobGet).not.toHaveBeenCalled();
  });

  it("returns the deterministic local MP4 validation transcript for the JSON url path", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({ url: LOCAL_VALIDATION_MP4_URL, duration_sec: 31.953 });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.validation_fixture).toBe(true);
    expect(json.validation_fixture_id).toBe("yentl_synthetic_panel_mp4");
    expect(json.utterances).toHaveLength(5);
    expect(json.utterances[1]).toMatchObject({
      provider: "validation_fixture",
      speaker_id: 0,
      source_audio_kind: "audio_file",
    });
    expect(mockTranscribeUrl).not.toHaveBeenCalled();
    expect(mockTranscribeStream).not.toHaveBeenCalled();
    expect(mockBlobGet).not.toHaveBeenCalled();
  });

  it.each([
    [LOCAL_VALIDATION_MOV_URL, "yentl_synthetic_panel_mov"],
    [LOCAL_VALIDATION_WEBM_URL, "yentl_synthetic_panel_webm"],
  ])("returns the deterministic local validation transcript for %s in the JSON url path", async (url, fixtureId) => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({ url, duration_sec: 31.953 });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.validation_fixture).toBe(true);
    expect(json.validation_fixture_id).toBe(fixtureId);
    expect(json.utterances).toHaveLength(5);
    expect(json.utterances[1]).toMatchObject({
      provider: "validation_fixture",
      speaker_id: 0,
      source_audio_kind: "audio_file",
    });
    expect(mockTranscribeUrl).not.toHaveBeenCalled();
    expect(mockTranscribeStream).not.toHaveBeenCalled();
    expect(mockBlobGet).not.toHaveBeenCalled();
  });

  it("requires source analysis consent before transcription", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = new Request("http://localhost/api/transcribe-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blob_url: "https://blob.vercel-storage.com/audio.mp3",
        duration_sec: 120,
      }),
    });
    const res = await POST(req as never);

    expect(res.status).toBe(428);
    expect(mockTranscribeUrl).not.toHaveBeenCalled();
    expect(mockTranscribeStream).not.toHaveBeenCalled();
  });

  it("returns 400 when blob_url is missing", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({ duration_sec: 60 });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/blob_url/);
  });

  it("returns 400 when blob_url is null", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({ blob_url: null });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
  });

  it("returns 400 when duration_sec is missing", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({ blob_url: "https://blob.vercel-storage.com/audio.mp3" });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/duration_sec/);
  });

  it("returns 400 when duration_sec is a non-number (string)", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({
      blob_url: "https://blob.vercel-storage.com/audio.mp3",
      duration_sec: "120",
    });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/duration_sec/);
  });

  it("returns 400 when duration_sec is negative", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({
      blob_url: "https://blob.vercel-storage.com/audio.mp3",
      duration_sec: -1,
    });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/duration_sec/);
  });

  it("returns 400 when duration_sec exceeds 4 hours (14400)", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({
      blob_url: "https://blob.vercel-storage.com/audio.mp3",
      duration_sec: 14401,
    });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/4-hour cap/i);
  });

  it("accepts duration_sec exactly at 4 hours (14400) — boundary passes", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({
      blob_url: "https://blob.vercel-storage.com/audio.mp3",
      duration_sec: 14400,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = new Request("http://localhost/api/transcribe-batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-yentl-source-consent": "source-analysis-v1",
      },
      body: "not json {{{",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 500 with error message when Deepgram throws", async () => {
    mockTranscribeUrl.mockRejectedValue(new Error("Deepgram quota exceeded"));

    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeJsonRequest({ blob_url: "https://blob.vercel-storage.com/audio.mp3", duration_sec: 120 });
    const res = await POST(req as never);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Deepgram quota exceeded/);
  });

  it("streams private Vercel Blob uploads to Deepgram and deletes the blob afterward", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    });
    mockBlobGet.mockResolvedValue({
      statusCode: 200,
      stream,
      blob: { contentType: "audio/mpeg", size: 3 },
    });
    mockTranscribeStream.mockResolvedValue({
      utterances: VALID_UTTERANCES,
      speakers: VALID_SPEAKERS,
    });

    const { POST } = await import("@/app/api/transcribe-batch/route");
    const blobUrl = "https://abc.private.blob.vercel-storage.com/audio.mp3";
    const req = makeJsonRequest({ blob_url: blobUrl, duration_sec: 120 });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(mockBlobGet).toHaveBeenCalledWith(blobUrl, {
      access: "private",
      useCache: false,
    });
    expect(mockTranscribeStream).toHaveBeenCalledOnce();
    expect(mockBlobDel).toHaveBeenCalledWith(blobUrl);
    expect(mockTranscribeUrl).not.toHaveBeenCalled();
  });

  it("logs but does not fail the transcription when private Blob deletion fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
      },
    });
    mockBlobGet.mockResolvedValue({
      statusCode: 200,
      stream,
      blob: { contentType: "audio/mpeg", size: 3 },
    });
    mockTranscribeStream.mockResolvedValue({
      utterances: VALID_UTTERANCES,
      speakers: VALID_SPEAKERS,
    });
    mockBlobDel.mockRejectedValue(new Error("delete denied"));

    const { POST } = await import("@/app/api/transcribe-batch/route");
    const blobUrl = "https://abc.private.blob.vercel-storage.com/audio.mp3";
    const req = makeJsonRequest({ blob_url: blobUrl, duration_sec: 120 });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("blob_deletion_failed"));
    errorSpy.mockRestore();
  });
});

// ─── Tests — multipart/form-data path (new) ──────────────────────────────────

describe("POST /api/transcribe-batch — multipart/form-data path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranscribeFile.mockResolvedValue({
      utterances: VALID_UTTERANCES,
      speakers: VALID_SPEAKERS,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with utterances and speakers for valid file + duration", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("speech.mp3", "audio/mpeg");
    const req = makeMultipartRequest({ file, duration_sec: "120" });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.utterances).toEqual(VALID_UTTERANCES);
    expect(json.speakers).toEqual(VALID_SPEAKERS);
  });

  it("returns the deterministic local WAV validation transcript for the multipart file path", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("yentl-synthetic-panel.wav", "audio/wav");
    const req = makeMultipartRequest({ file, duration_sec: "31.953" });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.validation_fixture).toBe(true);
    expect(json.validation_fixture_id).toBe("yentl_synthetic_panel_wav");
    expect(json.utterances).toHaveLength(5);
    expect(json.utterances[3]).toMatchObject({
      start: 17,
      provider: "validation_fixture",
      speaker_id: 0,
      attribution_status: "confident",
    });
    expect(json.utterances.map((segment: { speaker_id: number | null }) => segment.speaker_id)).toEqual([0, 0, 1, 0, 1]);
    expect(json.speakers).toEqual([
      { id: 0, label: "Moderator" },
      { id: 1, label: "Analyst" },
    ]);
    expect(mockTranscribeFile).not.toHaveBeenCalled();
    expect(mockTranscribeStream).not.toHaveBeenCalled();
  });

  it("returns the deterministic local MP4 validation transcript for the multipart file path", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("yentl-synthetic-panel.mp4", "video/mp4");
    const req = makeMultipartRequest({ file, duration_sec: "31.953" });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.validation_fixture).toBe(true);
    expect(json.validation_fixture_id).toBe("yentl_synthetic_panel_mp4");
    expect(json.utterances).toHaveLength(5);
    expect(json.utterances[3]).toMatchObject({
      start: 17,
      provider: "validation_fixture",
      speaker_id: 0,
      attribution_status: "confident",
    });
    expect(json.speakers).toEqual([
      { id: 0, label: "Moderator" },
      { id: 1, label: "Analyst" },
    ]);
    expect(mockTranscribeFile).not.toHaveBeenCalled();
    expect(mockTranscribeStream).not.toHaveBeenCalled();
  });

  it.each([
    ["yentl-synthetic-panel.mov", "video/quicktime", "yentl_synthetic_panel_mov"],
    ["yentl-synthetic-panel.webm", "video/webm", "yentl_synthetic_panel_webm"],
  ])("returns the deterministic local validation transcript for %s in the multipart file path", async (name, mime, fixtureId) => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile(name, mime);
    const req = makeMultipartRequest({ file, duration_sec: "31.953" });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.validation_fixture).toBe(true);
    expect(json.validation_fixture_id).toBe(fixtureId);
    expect(json.utterances).toHaveLength(5);
    expect(json.utterances[3]).toMatchObject({
      start: 17,
      provider: "validation_fixture",
      speaker_id: 0,
      attribution_status: "confident",
    });
    expect(json.speakers).toEqual([
      { id: 0, label: "Moderator" },
      { id: 1, label: "Analyst" },
    ]);
    expect(mockTranscribeFile).not.toHaveBeenCalled();
    expect(mockTranscribeStream).not.toHaveBeenCalled();
  });

  it("calls transcribeFile (not transcribeUrl) for multipart requests", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("speech.mp3", "audio/mpeg");
    const req = makeMultipartRequest({ file, duration_sec: "60" });
    await POST(req as never);

    expect(mockTranscribeFile).toHaveBeenCalledOnce();
    expect(mockTranscribeUrl).not.toHaveBeenCalled();
  });

  it("returns 400 when file is missing", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeMultipartRequest({ duration_sec: "60" });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/file is required/);
  });

  it("returns 400 when duration_sec is not a valid number", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile();
    const req = makeMultipartRequest({ file, duration_sec: "not-a-number" });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/duration_sec/);
  });

  it("returns 400 when duration_sec is missing", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile();
    const req = makeMultipartRequest({ file });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/duration_sec/);
  });

  it("returns 400 when duration exceeds 4-hour cap", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile();
    const req = makeMultipartRequest({ file, duration_sec: String(4 * 3600 + 1) });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/4-hour cap/i);
  });

  it("returns 400 when file exceeds 500MB", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("huge.mp3", "audio/mpeg", 600 * 1024 * 1024);
    const req = makeMultipartRequest({ file, duration_sec: "120" });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/500MB/i);
  });

  it("returns 500 when Deepgram throws", async () => {
    mockTranscribeFile.mockRejectedValue(new Error("Quota exceeded"));

    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile();
    const req = makeMultipartRequest({ file, duration_sec: "60" });
    const res = await POST(req as never);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Quota exceeded/);
  });
});

// ─── Tests — unsupported content type ────────────────────────────────────────

describe("POST /api/transcribe-batch — unsupported content type", () => {
  it("returns 415 for text/plain", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = new Request("http://localhost/api/transcribe-batch", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "x-yentl-source-consent": "source-analysis-v1",
      },
      body: "hello",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(415);
  });

  it("returns 415 when Content-Type header is absent", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = new Request("http://localhost/api/transcribe-batch", {
      method: "POST",
      headers: {
        "x-yentl-source-consent": "source-analysis-v1",
      },
      body: "hello",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(415);
  });
});
