import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock deepgram-batch ──────────────────────────────────────────────────────

const mockTranscribeUrl = vi.fn();
const mockTranscribeFile = vi.fn();

vi.mock("@/lib/server/deepgram-batch", () => ({
  transcribeUrl: mockTranscribeUrl,
  transcribeFile: mockTranscribeFile,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_UTTERANCES = [
  { text: "Hello world.", start: 0, end: 1.5, is_final: true, speaker_id: 0 },
];

const VALID_SPEAKERS = [{ id: 0, label: "Speaker 1" }];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/transcribe-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeAudioFile(name = "audio.mp3", type = "audio/mpeg", size = 1024): File {
  const content = "x".repeat(Math.min(size, 100));
  const file = new File([content], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
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
    headers: { "Content-Type": "multipart/form-data; boundary=boundary" },
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(415);
  });

  it("returns 415 when Content-Type header is absent", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = new Request("http://localhost/api/transcribe-batch", {
      method: "POST",
      body: "hello",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(415);
  });
});
