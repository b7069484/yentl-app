import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock deepgram-batch ──────────────────────────────────────────────────────

const mockTranscribeUrl = vi.fn();

vi.mock("@/lib/server/deepgram-batch", () => ({
  transcribeUrl: mockTranscribeUrl,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_UTTERANCES = [
  { text: "Hello world.", start: 0, end: 1.5, is_final: true, speaker_id: 0 },
];

const VALID_SPEAKERS = [{ id: 0, label: "Speaker 1" }];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/transcribe-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/transcribe-batch", () => {
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
    const req = makeRequest({ blob_url: "https://blob.vercel-storage.com/audio.mp3", duration_sec: 120 });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.utterances).toEqual(VALID_UTTERANCES);
    expect(json.speakers).toEqual(VALID_SPEAKERS);
  });

  it("returns 400 when blob_url is missing", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeRequest({ duration_sec: 60 });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/blob_url/);
  });

  it("returns 400 when blob_url is null", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeRequest({ blob_url: null });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
  });

  it("returns 400 when duration_sec exceeds 4 hours (14400)", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeRequest({
      blob_url: "https://blob.vercel-storage.com/audio.mp3",
      duration_sec: 14401,
    });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/maximum allowed duration/i);
  });

  it("accepts duration_sec exactly at 4 hours (14400) — boundary passes", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const req = makeRequest({
      blob_url: "https://blob.vercel-storage.com/audio.mp3",
      duration_sec: 14400,
    });
    const res = await POST(req as never);
    // 14400 is not > 14400, so passes
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
    const req = makeRequest({ blob_url: "https://blob.vercel-storage.com/audio.mp3" });
    const res = await POST(req as never);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Deepgram quota exceeded/);
  });
});
