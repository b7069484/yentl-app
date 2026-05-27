import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock server-side modules ──────────────────────────────────────────────────

const mockParseYouTubeUrl = vi.fn();
const mockFetchCaptions = vi.fn();
const mockFetchOEmbed = vi.fn();

vi.mock("@/lib/server/youtube-captions", () => ({
  parseYouTubeUrl: mockParseYouTubeUrl,
  fetchCaptions: mockFetchCaptions,
}));

vi.mock("@/lib/server/youtube-oembed", () => ({
  fetchOEmbed: mockFetchOEmbed,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEST_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const TEST_VIDEO_ID = "dQw4w9WgXcQ";

const SAMPLE_SEGMENTS = [
  { text: "Hello.", start: 0, end: 1.5, is_final: true, speaker_id: 0 },
  { text: "World.", start: 1.5, end: 3.0, is_final: true, speaker_id: 0 },
];

const SAMPLE_OEMBED = {
  title: "Rick Astley - Never Gonna Give You Up",
  author_name: "Rick Astley",
  thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  html: "<iframe></iframe>",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/youtube-ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-yentl-source-consent": "source-analysis-v1",
    },
    body: JSON.stringify(body),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/youtube-ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid URL, happy oEmbed, happy captions
    mockParseYouTubeUrl.mockReturnValue(TEST_VIDEO_ID);
    mockFetchOEmbed.mockResolvedValue(SAMPLE_OEMBED);
    mockFetchCaptions.mockResolvedValue(SAMPLE_SEGMENTS);
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("happy path", () => {
    it("returns 200 with transcript_segments on valid URL", async () => {
      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.transcript_segments).toEqual(SAMPLE_SEGMENTS);
    });

    it("includes video_id in the response", async () => {
      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      const json = await res.json();
      expect(json.video_id).toBe(TEST_VIDEO_ID);
    });

    it("includes url in the response", async () => {
      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      const json = await res.json();
      expect(json.url).toBe(TEST_URL);
    });

    it("includes title from oEmbed when available", async () => {
      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      const json = await res.json();
      expect(json.title).toBe(SAMPLE_OEMBED.title);
    });

    it("includes channel from oEmbed when available", async () => {
      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      const json = await res.json();
      expect(json.channel).toBe(SAMPLE_OEMBED.author_name);
    });

    it("still returns captions even when oEmbed fails", async () => {
      mockFetchOEmbed.mockResolvedValue(null);

      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.transcript_segments).toEqual(SAMPLE_SEGMENTS);
      // title/channel not present when oEmbed fails
      expect(json.title).toBeUndefined();
      expect(json.channel).toBeUndefined();
    });
  });

  describe("error: INVALID_URL", () => {
    it("returns error response when URL is invalid (parseYouTubeUrl returns null)", async () => {
      mockParseYouTubeUrl.mockReturnValue(null);

      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = makeRequest({ url: "https://vimeo.com/123456" });
      const res = await POST(req as never);

      const json = await res.json();
      expect(json.error.code).toBe("INVALID_URL");
    });

    it("returns error response when url field is missing", async () => {
      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = makeRequest({});
      const res = await POST(req as never);

      const json = await res.json();
      expect(json.error.code).toBe("INVALID_URL");
    });

    it("returns error response when body is invalid JSON", async () => {
      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = new Request("http://localhost/api/youtube-ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-yentl-source-consent": "source-analysis-v1",
        },
        body: "{{bad json",
      });
      const res = await POST(req as never);

      const json = await res.json();
      expect(json.error).toBeTruthy();
    });
  });

  describe("error: NO_CAPTIONS", () => {
    it("returns error with NO_CAPTIONS code when captions throw NO_CAPTIONS", async () => {
      const err = Object.assign(new Error("No captions"), { code: "NO_CAPTIONS" });
      mockFetchCaptions.mockRejectedValue(err);

      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      const json = await res.json();
      expect(json.error.code).toBe("NO_CAPTIONS");
    });
  });

  describe("error: PRIVATE", () => {
    it("returns error with PRIVATE code when video is private/age-restricted", async () => {
      const err = Object.assign(new Error("Video not playable"), { code: "PRIVATE" });
      mockFetchCaptions.mockRejectedValue(err);

      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      const json = await res.json();
      expect(json.error.code).toBe("PRIVATE");
    });
  });

  describe("error: NETWORK_ERROR", () => {
    it("returns error with NETWORK_ERROR code when captions throw NETWORK_ERROR", async () => {
      const err = Object.assign(new Error("Network fail"), { code: "NETWORK_ERROR" });
      mockFetchCaptions.mockRejectedValue(err);

      const { POST } = await import("@/app/api/youtube-ingest/route");
      const req = makeRequest({ url: TEST_URL });
      const res = await POST(req as never);

      const json = await res.json();
      expect(json.error.code).toBe("NETWORK_ERROR");
    });
  });
});
