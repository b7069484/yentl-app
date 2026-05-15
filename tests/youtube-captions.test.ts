import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock global fetch ─────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** A minimal timedtext XML response with HTML entities in text */
const FIXTURE_XML = `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text start="0.5" dur="2.3">Hello &amp; welcome</text>
  <text start="2.8" dur="1.5">It&#39;s a &lt;test&gt;</text>
  <text start="4.3" dur="3.1">&quot;Quoted&quot; text</text>
</transcript>`;

/** Empty transcript (no captions) */
const EMPTY_XML = `<?xml version="1.0" encoding="utf-8"?><transcript/>`;

/** Empty transcript with whitespace children */
const EMPTY_WITH_WS_XML = `<transcript>
</transcript>`;

function okResponse(body: string) {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
  };
}

function notFoundResponse() {
  return {
    ok: false,
    status: 404,
    text: () => Promise.resolve("Not Found"),
  };
}

// ─── Import under test (after stubbing fetch) ─────────────────────────────────

import { fetchCaptions } from "@/lib/server/youtube-captions";

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchCaptions — happy path (lang=en returns data)", () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(okResponse(FIXTURE_XML));
  });

  it("returns TranscriptSegment[] with correct count", async () => {
    const segments = await fetchCaptions("dQw4w9WgXcQ");
    expect(segments).toHaveLength(3);
  });

  it("maps start seconds correctly (float)", async () => {
    const segments = await fetchCaptions("dQw4w9WgXcQ");
    expect(segments[0].start).toBeCloseTo(0.5);
    expect(segments[1].start).toBeCloseTo(2.8);
    expect(segments[2].start).toBeCloseTo(4.3);
  });

  it("maps end as start + dur", async () => {
    const segments = await fetchCaptions("dQw4w9WgXcQ");
    expect(segments[0].end).toBeCloseTo(0.5 + 2.3);
    expect(segments[1].end).toBeCloseTo(2.8 + 1.5);
    expect(segments[2].end).toBeCloseTo(4.3 + 3.1);
  });

  it("decodes HTML entities in text (&amp; → &)", async () => {
    const segments = await fetchCaptions("dQw4w9WgXcQ");
    expect(segments[0].text).toBe("Hello & welcome");
  });

  it("decodes &#39; to single quote and < > tags", async () => {
    const segments = await fetchCaptions("dQw4w9WgXcQ");
    expect(segments[1].text).toBe("It's a <test>");
  });

  it("decodes &quot; to double quote", async () => {
    const segments = await fetchCaptions("dQw4w9WgXcQ");
    expect(segments[2].text).toBe('"Quoted" text');
  });

  it("sets is_final: true on all segments", async () => {
    const segments = await fetchCaptions("dQw4w9WgXcQ");
    for (const seg of segments) {
      expect(seg.is_final).toBe(true);
    }
  });

  it("sets speaker_id: 0 on all segments", async () => {
    const segments = await fetchCaptions("dQw4w9WgXcQ");
    for (const seg of segments) {
      expect(seg.speaker_id).toBe(0);
    }
  });

  it("calls the timedtext API with the video ID", async () => {
    await fetchCaptions("dQw4w9WgXcQ");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("dQw4w9WgXcQ"),
    );
  });
});

describe("fetchCaptions — fallback: lang=en empty → lang=en-US returns data", () => {
  beforeEach(() => {
    // First call (lang=en) → empty transcript; second call (lang=en-US) → data
    mockFetch
      .mockResolvedValueOnce(okResponse(EMPTY_XML))
      .mockResolvedValueOnce(okResponse(FIXTURE_XML));
  });

  it("falls back to en-US when en is empty and returns segments", async () => {
    const segments = await fetchCaptions("dQw4w9WgXcQ");
    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe("Hello & welcome");
  });

  it("makes at least 2 fetch calls (en then en-US)", async () => {
    await fetchCaptions("dQw4w9WgXcQ");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("fetchCaptions — fallback: en + en-US empty → asr returns data", () => {
  beforeEach(() => {
    mockFetch
      .mockResolvedValueOnce(okResponse(EMPTY_XML))
      .mockResolvedValueOnce(okResponse(EMPTY_XML))
      .mockResolvedValueOnce(okResponse(FIXTURE_XML));
  });

  it("falls back to asr track and returns segments", async () => {
    const segments = await fetchCaptions("dQw4w9WgXcQ");
    expect(segments).toHaveLength(3);
  });

  it("makes 3 fetch calls before succeeding", async () => {
    await fetchCaptions("dQw4w9WgXcQ");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("last call includes kind=asr", async () => {
    await fetchCaptions("dQw4w9WgXcQ");
    const calls = mockFetch.mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls[2]).toContain("asr");
  });
});

describe("fetchCaptions — NO_CAPTIONS error", () => {
  it("throws NO_CAPTIONS when all three tracks return empty XML", async () => {
    mockFetch.mockResolvedValue(okResponse(EMPTY_XML));

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS",
    });
  });

  it("throws NO_CAPTIONS when tracks return empty-with-whitespace XML", async () => {
    mockFetch.mockResolvedValue(okResponse(EMPTY_WITH_WS_XML));

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS",
    });
  });
});

describe("fetchCaptions — NETWORK_ERROR", () => {
  it("throws NETWORK_ERROR when fetch rejects (network failure)", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });

  it("throws NETWORK_ERROR when all fetch calls return 404", async () => {
    mockFetch.mockResolvedValue(notFoundResponse());

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });
});
