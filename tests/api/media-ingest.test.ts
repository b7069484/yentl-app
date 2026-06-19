import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock server-side modules ──────────────────────────────────────────────────

const mockAssertSafeUrl = vi.fn();
const mockCheckMediaMime = vi.fn();
const mockTranscribeUrl = vi.fn();

vi.mock("@/lib/server/ssrf-guard", () => ({
  assertSafeUrl: mockAssertSafeUrl,
}));

vi.mock("@/lib/server/media-mime", () => ({
  checkMediaMime: mockCheckMediaMime,
}));

vi.mock("@/lib/server/deepgram-batch", () => ({
  transcribeUrl: mockTranscribeUrl,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEST_URL = "https://example.com/episode.mp3";
const LOCAL_VALIDATION_WAV_URL = "http://localhost:3000/validation/yentl-synthetic-panel.wav";
const LOCAL_VALIDATION_MP4_URL = "http://localhost:3000/validation/yentl-synthetic-panel.mp4";
const LOCAL_VALIDATION_MOV_URL = "http://localhost:3000/validation/yentl-synthetic-panel.mov";
const LOCAL_VALIDATION_WEBM_URL = "http://localhost:3000/validation/yentl-synthetic-panel.webm";

const SAMPLE_UTTERANCES = [
  { text: "Hello.", start: 0, end: 1.5, is_final: true, speaker_id: 0 },
];

const SAMPLE_SPEAKERS = [{ id: 0, label: "Speaker 1" }];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/media-ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-yentl-source-consent": "source-analysis-v1",
    },
    body: JSON.stringify(body),
  });
}

function ssrfError(code: "SSRF_BLOCKED" | "INVALID_URL", message: string): Error {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/media-ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy path
    mockAssertSafeUrl.mockResolvedValue(undefined);
    mockCheckMediaMime.mockResolvedValue({ ok: true, mime: "audio/mpeg" });
    mockTranscribeUrl.mockResolvedValue({
      utterances: SAMPLE_UTTERANCES,
      speakers: SAMPLE_SPEAKERS,
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  // ─── Happy path ─────────────────────────────────────────────────────────────

  describe("happy path", () => {
    it("returns 200 with utterances, speakers, and mime", async () => {
      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.utterances).toEqual(SAMPLE_UTTERANCES);
      expect(json.speakers).toEqual(SAMPLE_SPEAKERS);
      expect(json.mime).toBe("audio/mpeg");
    });

    it("passes the url to assertSafeUrl", async () => {
      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      await POST(req as never);

      expect(mockAssertSafeUrl).toHaveBeenCalledWith(TEST_URL);
    });

    it("passes the url to checkMediaMime", async () => {
      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      await POST(req as never);

      expect(mockCheckMediaMime).toHaveBeenCalledWith(TEST_URL);
    });

    it("passes the url to transcribeUrl", async () => {
      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      await POST(req as never);

      expect(mockTranscribeUrl).toHaveBeenCalledWith(TEST_URL);
    });

    it("returns the deterministic local WAV validation transcript without calling Deepgram", async () => {
      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: LOCAL_VALIDATION_WAV_URL });
      const res = await POST(req as never);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.validation_fixture).toBe(true);
      expect(json.validation_fixture_id).toBe("yentl_synthetic_panel_wav");
      expect(json.mime).toBe("audio/wav");
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
      expect(mockAssertSafeUrl).not.toHaveBeenCalled();
      expect(mockCheckMediaMime).not.toHaveBeenCalled();
      expect(mockTranscribeUrl).not.toHaveBeenCalled();
    });

    it("returns the deterministic local MP4 validation transcript without calling Deepgram", async () => {
      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: LOCAL_VALIDATION_MP4_URL });
      const res = await POST(req as never);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.validation_fixture).toBe(true);
      expect(json.validation_fixture_id).toBe("yentl_synthetic_panel_mp4");
      expect(json.mime).toBe("video/mp4");
      expect(json.utterances).toHaveLength(5);
      expect(json.utterances[0]).toMatchObject({
        provider: "validation_fixture",
        speaker_id: 0,
        attribution_status: "confident",
        source_audio_kind: "audio_file",
      });
      expect(json.speakers).toEqual([
        { id: 0, label: "Moderator" },
        { id: 1, label: "Analyst" },
      ]);
      expect(mockAssertSafeUrl).not.toHaveBeenCalled();
      expect(mockCheckMediaMime).not.toHaveBeenCalled();
      expect(mockTranscribeUrl).not.toHaveBeenCalled();
    });

    it.each([
      [LOCAL_VALIDATION_MOV_URL, "video/quicktime", "yentl_synthetic_panel_mov"],
      [LOCAL_VALIDATION_WEBM_URL, "video/webm", "yentl_synthetic_panel_webm"],
    ])("returns the deterministic local validation transcript for %s without calling Deepgram", async (url, mime, fixtureId) => {
      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url });
      const res = await POST(req as never);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.validation_fixture).toBe(true);
      expect(json.validation_fixture_id).toBe(fixtureId);
      expect(json.mime).toBe(mime);
      expect(json.utterances).toHaveLength(5);
      expect(json.utterances[0]).toMatchObject({
        provider: "validation_fixture",
        speaker_id: 0,
        attribution_status: "confident",
        source_audio_kind: "audio_file",
      });
      expect(json.speakers).toEqual([
        { id: 0, label: "Moderator" },
        { id: 1, label: "Analyst" },
      ]);
      expect(mockAssertSafeUrl).not.toHaveBeenCalled();
      expect(mockCheckMediaMime).not.toHaveBeenCalled();
      expect(mockTranscribeUrl).not.toHaveBeenCalled();
    });
  });

  // ─── Validation errors ───────────────────────────────────────────────────────

  describe("validation: empty / missing url", () => {
    it("returns 400 when url is empty string", async () => {
      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: "" });
      const res = await POST(req as never);

      expect(res.status).toBe(400);
    });

    it("returns 400 when url is missing from body", async () => {
      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({});
      const res = await POST(req as never);

      expect(res.status).toBe(400);
    });

    it("returns 400 when url is whitespace only", async () => {
      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: "   " });
      const res = await POST(req as never);

      expect(res.status).toBe(400);
    });

    it("returns 400 when body is invalid JSON", async () => {
      const { POST } = await import("@/app/api/media-ingest/route");
      const req = new Request("http://localhost/api/media-ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-yentl-source-consent": "source-analysis-v1",
        },
        body: "{{bad json",
      });
      const res = await POST(req as never);

      expect(res.status).toBe(400);
    });
  });

  // ─── SSRF_BLOCKED ────────────────────────────────────────────────────────────

  describe("SSRF_BLOCKED", () => {
    it("returns 400 with code SSRF_BLOCKED when assertSafeUrl throws SSRF_BLOCKED", async () => {
      mockAssertSafeUrl.mockRejectedValue(
        ssrfError("SSRF_BLOCKED", "resolved to a private address"),
      );

      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: "http://192.168.1.1/audio.mp3" });
      const res = await POST(req as never);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("SSRF_BLOCKED");
    });
  });

  // ─── INVALID_URL ─────────────────────────────────────────────────────────────

  describe("INVALID_URL", () => {
    it("returns 400 with code INVALID_URL when assertSafeUrl throws INVALID_URL", async () => {
      mockAssertSafeUrl.mockRejectedValue(
        ssrfError("INVALID_URL", "Not a valid URL"),
      );

      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: "ftp://example.com/audio.mp3" });
      const res = await POST(req as never);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("INVALID_URL");
    });
  });

  // ─── UNSUPPORTED_MEDIA ───────────────────────────────────────────────────────

  describe("UNSUPPORTED_MEDIA", () => {
    it("returns 400 with code UNSUPPORTED_MEDIA when checkMediaMime returns ok: false", async () => {
      mockCheckMediaMime.mockResolvedValue({
        ok: false,
        reason: "Unsupported content type",
      });

      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: "https://example.com/document.pdf" });
      const res = await POST(req as never);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("UNSUPPORTED_MEDIA");
    });

    it("includes reason from checkMediaMime in the error message", async () => {
      mockCheckMediaMime.mockResolvedValue({
        ok: false,
        reason: "URL not reachable",
      });

      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      const json = await res.json();
      expect(json.error.message).toMatch(/URL not reachable/);
    });
  });

  // ─── TRANSCRIBE_FAILED ───────────────────────────────────────────────────────

  describe("TRANSCRIBE_FAILED", () => {
    it("returns 500 with code TRANSCRIBE_FAILED when transcribeUrl throws", async () => {
      mockTranscribeUrl.mockRejectedValue(new Error("Deepgram quota exceeded"));

      const { POST } = await import("@/app/api/media-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error.code).toBe("TRANSCRIBE_FAILED");
      expect(json.error.message).toMatch(/Deepgram quota exceeded/);
    });
  });
});
