import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockParseYouTubeUrl = vi.fn();
const mockFetchOEmbed = vi.fn();

vi.mock("@/lib/server/youtube-captions", () => ({
  parseYouTubeUrl: mockParseYouTubeUrl,
}));

vi.mock("@/lib/server/youtube-oembed", () => ({
  fetchOEmbed: mockFetchOEmbed,
}));

const TEST_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const TEST_VIDEO_ID = "dQw4w9WgXcQ";

const SAMPLE_OEMBED = {
  title: "Rick Astley - Never Gonna Give You Up",
  author_name: "Rick Astley",
  thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  html: "<iframe></iframe>",
};

function makeRequest(url: string) {
  return new NextRequest(`http://localhost/api/youtube-preview?url=${encodeURIComponent(url)}`);
}

describe("GET /api/youtube-preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParseYouTubeUrl.mockReturnValue(TEST_VIDEO_ID);
    mockFetchOEmbed.mockResolvedValue(SAMPLE_OEMBED);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns resolved YouTube identity before caption fetch", async () => {
    const { GET } = await import("@/app/api/youtube-preview/route");
    const res = await GET(makeRequest(TEST_URL));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      video_id: TEST_VIDEO_ID,
      url: TEST_URL,
      title: SAMPLE_OEMBED.title,
      channel: SAMPLE_OEMBED.author_name,
      thumbnail_url: SAMPLE_OEMBED.thumbnail_url,
      thumbnail_source: "youtube-oembed",
      caption_precheck: "checked-on-fetch",
    });
  });

  it("falls back to a static YouTube thumbnail when oEmbed fails", async () => {
    mockFetchOEmbed.mockResolvedValue(null);

    const { GET } = await import("@/app/api/youtube-preview/route");
    const res = await GET(makeRequest(TEST_URL));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBeNull();
    expect(json.channel).toBeNull();
    expect(json.thumbnail_url).toContain(TEST_VIDEO_ID);
    expect(json.thumbnail_source).toBe("youtube-static");
  });

  it("rejects invalid YouTube URLs", async () => {
    mockParseYouTubeUrl.mockReturnValue(null);

    const { GET } = await import("@/app/api/youtube-preview/route");
    const res = await GET(makeRequest("https://vimeo.com/123"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe("INVALID_URL");
  });
});
