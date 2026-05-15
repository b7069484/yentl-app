import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Caption XML used for happy-path tests */
const VALID_CAPTION_XML = `<?xml version="1.0"?><transcript><text start="0.5" dur="2.3">Hello world.</text><text start="3.0" dur="1.5">This is a test.</text></transcript>`;

/** Two tracks: first has kind="asr" (auto-generated), second has no kind (manual) */
const VALID_HTML = `<html><head></head><body><script>var ytInitialPlayerResponse = ${JSON.stringify({
  playabilityStatus: { status: "OK" },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl: "https://www.youtube.com/api/timedtext?caps=asr&v=dQw4w9WgXcQ",
          languageCode: "en",
          kind: "asr",
        },
        {
          baseUrl: "https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ",
          languageCode: "en",
        },
      ],
    },
  },
})};var ytcfg = {};</script></body></html>`;

/** Only one track, ASR */
const ASR_ONLY_HTML = `<html><body><script>var ytInitialPlayerResponse = ${JSON.stringify({
  playabilityStatus: { status: "OK" },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl: "https://www.youtube.com/api/timedtext?caps=asr&v=dQw4w9WgXcQ",
          languageCode: "en",
          kind: "asr",
        },
      ],
    },
  },
})};var x = 1;</script></body></html>`;

/** Watch page with no captionTracks (captions key missing) */
const NO_CAPTIONS_HTML = `<html><body><script>var ytInitialPlayerResponse = ${JSON.stringify({
  playabilityStatus: { status: "OK" },
  captions: undefined,
})};var x = 1;</script></body></html>`;

/** Watch page where playabilityStatus is LOGIN_REQUIRED */
const PRIVATE_HTML = `<html><body><script>var ytInitialPlayerResponse = ${JSON.stringify({
  playabilityStatus: {
    status: "LOGIN_REQUIRED",
    reason: "Sign in to confirm your age",
  },
})};var x = 1;</script></body></html>`;

/** Non-English tracks only */
const NON_ENGLISH_HTML = `<html><body><script>var ytInitialPlayerResponse = ${JSON.stringify({
  playabilityStatus: { status: "OK" },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        {
          baseUrl: "https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=fr",
          languageCode: "fr",
        },
        {
          baseUrl: "https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=de",
          languageCode: "de",
        },
      ],
    },
  },
})};var x = 1;</script></body></html>`;

/** HTML that does not contain ytInitialPlayerResponse at all */
const NO_PLAYER_RESPONSE_HTML = `<html><body><p>Error: Something went wrong</p></body></html>`;

/** An empty caption XML */
const EMPTY_CAPTION_XML = `<?xml version="1.0"?><transcript/>`;

/** dur before start — attribute order independence check */
const DUR_BEFORE_START_XML = `<?xml version="1.0"?><transcript><text dur="2.0" start="1.0">hi</text></transcript>`;

/** No dur attribute */
const NO_DUR_XML = `<?xml version="1.0"?><transcript><text start="3.0">no-dur</text></transcript>`;

/** Caption XML with HTML entities */
const ENTITIES_XML = `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text start="0.5" dur="2.3">Hello &amp; welcome</text>
  <text start="2.8" dur="1.5">It&#39;s a &lt;test&gt;</text>
  <text start="4.3" dur="3.1">&quot;Quoted&quot; text</text>
</transcript>`;

function okResponse(body: string) {
  return { ok: true, status: 200, text: () => Promise.resolve(body) };
}

function notFoundResponse() {
  return { ok: false, status: 404, text: () => Promise.resolve("Not Found") };
}

// ─── Import under test ─────────────────────────────────────────────────────────

import { fetchCaptions } from "@/lib/server/youtube-captions";

// ─── Reset mocks between tests ─────────────────────────────────────────────────

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ─── fetchCaptions — happy path ────────────────────────────────────────────────

describe("fetchCaptions — picks manual English over auto-generated", () => {
  it("returns 2 segments from VALID_CAPTION_XML", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(VALID_HTML))
      .mockResolvedValueOnce(okResponse(VALID_CAPTION_XML));
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchCaptions("dQw4w9WgXcQ");

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe("Hello world.");
    expect(segments[0].start).toBeCloseTo(0.5);
    expect(segments[0].end).toBeCloseTo(0.5 + 2.3);
    expect(segments[1].text).toBe("This is a test.");
    expect(segments[1].start).toBeCloseTo(3.0);
  });

  it("makes exactly 2 fetch calls (watch page + caption URL)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(VALID_HTML))
      .mockResolvedValueOnce(okResponse(VALID_CAPTION_XML));
    vi.stubGlobal("fetch", fetchMock);

    await fetchCaptions("dQw4w9WgXcQ");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("second fetch uses the manual (non-asr) track baseUrl", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(VALID_HTML))
      .mockResolvedValueOnce(okResponse(VALID_CAPTION_XML));
    vi.stubGlobal("fetch", fetchMock);

    await fetchCaptions("dQw4w9WgXcQ");

    const secondCallUrl = fetchMock.mock.calls[1][0] as string;
    // Manual track baseUrl does not contain "caps=asr"
    expect(secondCallUrl).not.toContain("caps=asr");
  });

  it("sets is_final: true on all segments", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(VALID_HTML))
      .mockResolvedValueOnce(okResponse(VALID_CAPTION_XML));
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchCaptions("dQw4w9WgXcQ");

    for (const seg of segments) {
      expect(seg.is_final).toBe(true);
    }
  });

  it("sets speaker_id: 0 on all segments", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(VALID_HTML))
      .mockResolvedValueOnce(okResponse(VALID_CAPTION_XML));
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchCaptions("dQw4w9WgXcQ");

    for (const seg of segments) {
      expect(seg.speaker_id).toBe(0);
    }
  });
});

describe("fetchCaptions — falls back to ASR English when no manual track", () => {
  it("returns segments when only an ASR track is available", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(ASR_ONLY_HTML))
      .mockResolvedValueOnce(okResponse(VALID_CAPTION_XML));
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchCaptions("dQw4w9WgXcQ");

    expect(segments).toHaveLength(2);
  });

  it("second fetch uses the ASR track baseUrl (contains caps=asr)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(ASR_ONLY_HTML))
      .mockResolvedValueOnce(okResponse(VALID_CAPTION_XML));
    vi.stubGlobal("fetch", fetchMock);

    await fetchCaptions("dQw4w9WgXcQ");

    const secondCallUrl = fetchMock.mock.calls[1][0] as string;
    expect(secondCallUrl).toContain("caps=asr");
  });
});

// ─── fetchCaptions — PRIVATE ───────────────────────────────────────────────────

describe("fetchCaptions — throws PRIVATE on LOGIN_REQUIRED", () => {
  it("throws CaptionError with code PRIVATE", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(PRIVATE_HTML));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "PRIVATE",
    });
  });

  it("error message includes the playabilityStatus reason", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(PRIVATE_HTML));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      message: expect.stringContaining("Sign in"),
    });
  });
});

// ─── fetchCaptions — NO_CAPTIONS ──────────────────────────────────────────────

describe("fetchCaptions — throws NO_CAPTIONS when captionTracks is missing", () => {
  it("throws NO_CAPTIONS when captions key is absent from playerResponse", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(NO_CAPTIONS_HTML));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS",
    });
  });
});

describe("fetchCaptions — throws NO_CAPTIONS when no English track available", () => {
  it("throws NO_CAPTIONS when only French and German tracks exist", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(okResponse(NON_ENGLISH_HTML));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS",
    });
  });
});

describe("fetchCaptions — throws NO_CAPTIONS when caption XML is empty", () => {
  it("throws NO_CAPTIONS when the caption XML has no text nodes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(VALID_HTML))
      .mockResolvedValueOnce(okResponse(EMPTY_CAPTION_XML));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS",
    });
  });
});

// ─── fetchCaptions — NETWORK_ERROR ────────────────────────────────────────────

describe("fetchCaptions — throws NETWORK_ERROR on watch page non-2xx", () => {
  it("throws NETWORK_ERROR when watch page returns 403", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(notFoundResponse());
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });

  it("throws NETWORK_ERROR when fetch() itself rejects (network down)", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });
});

describe("fetchCaptions — throws NETWORK_ERROR when ytInitialPlayerResponse is absent", () => {
  it("throws NETWORK_ERROR when the HTML has no ytInitialPlayerResponse", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(NO_PLAYER_RESPONSE_HTML));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });
});

// ─── parseCaptionsXml — attribute order independence ──────────────────────────

describe("parseCaptionsXml — attribute order independence (via fetchCaptions)", () => {
  it("parses <text dur='2.0' start='1.0'> (dur before start) correctly", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(VALID_HTML))
      .mockResolvedValueOnce(okResponse(DUR_BEFORE_START_XML));
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchCaptions("dQw4w9WgXcQ");

    expect(segments).toHaveLength(1);
    expect(segments[0].start).toBeCloseTo(1.0);
    expect(segments[0].end).toBeCloseTo(3.0); // 1.0 + 2.0
    expect(segments[0].text).toBe("hi");
  });

  it("parses <text start='3.0'> (no dur) as end === start", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(VALID_HTML))
      .mockResolvedValueOnce(okResponse(NO_DUR_XML));
    vi.stubGlobal("fetch", fetchMock);

    const segments = await fetchCaptions("dQw4w9WgXcQ");

    expect(segments).toHaveLength(1);
    expect(segments[0].start).toBeCloseTo(3.0);
    expect(segments[0].end).toBeCloseTo(3.0);
    expect(segments[0].text).toBe("no-dur");
  });
});

// ─── parseCaptionsXml — HTML entity decoding ──────────────────────────────────

describe("parseCaptionsXml — HTML entity decoding (via fetchCaptions)", () => {
  async function fetchWithXml(xml: string) {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(VALID_HTML))
      .mockResolvedValueOnce(okResponse(xml));
    vi.stubGlobal("fetch", fetchMock);
    return fetchCaptions("dQw4w9WgXcQ");
  }

  it("decodes &amp; → &", async () => {
    const segments = await fetchWithXml(ENTITIES_XML);
    expect(segments[0].text).toBe("Hello & welcome");
  });

  it("decodes &#39; → ' and &lt; &gt; → < >", async () => {
    const segments = await fetchWithXml(ENTITIES_XML);
    expect(segments[1].text).toBe("It's a <test>");
  });

  it("decodes &quot; → \"", async () => {
    const segments = await fetchWithXml(ENTITIES_XML);
    expect(segments[2].text).toBe('"Quoted" text');
  });
});
