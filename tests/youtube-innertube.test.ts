import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────
// vi.hoisted() lets the factory closure reference stubs before vi.mock() hoists.

const { createFn } = vi.hoisted(() => ({
  createFn: vi.fn(),
}));

vi.mock("youtubei.js", () => ({
  Innertube: {
    create: createFn,
  },
}));

// ─── Import under test (after mocks) ─────────────────────────────────────────

import { fetchViaInnertube, CaptionError } from "@/lib/server/youtube-captions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FakeSegment = {
  type: "TranscriptSegment";
  start_ms: string;
  end_ms: string;
  snippet: { text: string };
};

type FakeSectionHeader = {
  type: "TranscriptSectionHeader";
  title: { text: string };
};

function makeSegment(
  text: string,
  startMs: number,
  endMs: number,
): FakeSegment {
  return {
    type: "TranscriptSegment",
    start_ms: String(startMs),
    end_ms: String(endMs),
    snippet: { text },
  };
}

function makeSectionHeader(title: string): FakeSectionHeader {
  return { type: "TranscriptSectionHeader", title: { text: title } };
}

/**
 * Build a fake Innertube instance with a controllable transcript response.
 */
function makeFakeInnertube(opts: {
  getInfoThrows?: Error;
  getTranscriptThrows?: Error;
  selectedLanguage?: string;
  languages?: string[];
  initialSegments?: Array<FakeSegment | FakeSectionHeader>;
  selectLanguageResult?: {
    selectedLanguage?: string;
    initialSegments?: Array<FakeSegment | FakeSectionHeader>;
  };
}) {
  const {
    getInfoThrows,
    getTranscriptThrows,
    selectedLanguage = "en",
    languages = ["en"],
    initialSegments = [],
    selectLanguageResult,
  } = opts;

  type FakeTranscriptInfo = {
    selectedLanguage: string;
    languages: string[];
    transcript: { content: { body: { initial_segments: Array<FakeSegment | FakeSectionHeader> } } | null };
    selectLanguage: ReturnType<typeof vi.fn>;
  };

  const makeTranscriptInfo = (
    lang: string,
    segs: Array<FakeSegment | FakeSectionHeader>,
    langList: string[],
  ): FakeTranscriptInfo => ({
    selectedLanguage: lang,
    languages: langList,
    transcript: {
      content: {
        body: {
          initial_segments: segs,
        },
      },
    },
    // Use mockImplementation (lazy) to avoid eager infinite recursion
    selectLanguage: vi.fn().mockImplementation(() =>
      Promise.resolve(
        selectLanguageResult
          ? makeTranscriptInfo(
              selectLanguageResult.selectedLanguage ?? "en",
              selectLanguageResult.initialSegments ?? segs,
              langList,
            )
          : makeTranscriptInfo(lang, segs, langList),
      ),
    ),
  });

  const transcriptInfo = makeTranscriptInfo(selectedLanguage, initialSegments, languages);

  const videoInfo = {
    getTranscript: getTranscriptThrows
      ? vi.fn().mockRejectedValue(getTranscriptThrows)
      : vi.fn().mockResolvedValue(transcriptInfo),
  };

  const innertube = {
    getInfo: getInfoThrows
      ? vi.fn().mockRejectedValue(getInfoThrows)
      : vi.fn().mockResolvedValue(videoInfo),
  };

  return { innertube, videoInfo, transcriptInfo };
}

// ─── Reset mocks between tests ────────────────────────────────────────────────

beforeEach(() => {
  createFn.mockReset();
});

// ─── fetchViaInnertube — happy path ──────────────────────────────────────────

describe("fetchViaInnertube — happy path", () => {
  it("returns parsed segments from Innertube transcript", async () => {
    const { innertube } = makeFakeInnertube({
      selectedLanguage: "en",
      languages: ["en"],
      initialSegments: [
        makeSegment("Hello world.", 570, 4310),
        makeSegment("This is a test.", 4320, 8990),
        makeSegment("Final line.", 9000, 12000),
      ],
    });
    createFn.mockResolvedValue(innertube);

    const segments = await fetchViaInnertube("dQw4w9WgXcQ");

    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe("Hello world.");
    expect(segments[0].start).toBeCloseTo(0.57);
    expect(segments[0].end).toBeCloseTo(4.31);
    expect(segments[1].text).toBe("This is a test.");
    expect(segments[2].text).toBe("Final line.");
    expect(segments[2].start).toBeCloseTo(9.0);
    expect(segments[2].end).toBeCloseTo(12.0);
  });

  it("sets is_final: true on all segments", async () => {
    const { innertube } = makeFakeInnertube({
      initialSegments: [makeSegment("Hello.", 0, 2000)],
    });
    createFn.mockResolvedValue(innertube);

    const segments = await fetchViaInnertube("dQw4w9WgXcQ");
    for (const seg of segments) {
      expect(seg.is_final).toBe(true);
    }
  });

  it("sets speaker_id: 0 on all segments", async () => {
    const { innertube } = makeFakeInnertube({
      initialSegments: [makeSegment("Hello.", 0, 2000)],
    });
    createFn.mockResolvedValue(innertube);

    const segments = await fetchViaInnertube("dQw4w9WgXcQ");
    for (const seg of segments) {
      expect(seg.speaker_id).toBe(0);
    }
  });

  it("skips TranscriptSectionHeader nodes (no start_ms/end_ms)", async () => {
    const { innertube } = makeFakeInnertube({
      initialSegments: [
        makeSectionHeader("Part 1"),
        makeSegment("Real caption.", 0, 3000),
        makeSectionHeader("Part 2"),
        makeSegment("Another caption.", 3000, 6000),
      ],
    });
    createFn.mockResolvedValue(innertube);

    const segments = await fetchViaInnertube("dQw4w9WgXcQ");
    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe("Real caption.");
    expect(segments[1].text).toBe("Another caption.");
  });

  it("skips segments with empty text", async () => {
    const { innertube } = makeFakeInnertube({
      initialSegments: [
        makeSegment("", 0, 1000),
        makeSegment("   ", 1000, 2000),
        makeSegment("Good caption.", 2000, 4000),
      ],
    });
    createFn.mockResolvedValue(innertube);

    const segments = await fetchViaInnertube("dQw4w9WgXcQ");
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("Good caption.");
  });

  it("correctly converts milliseconds to seconds", async () => {
    const { innertube } = makeFakeInnertube({
      initialSegments: [makeSegment("Test.", 1234, 5678)],
    });
    createFn.mockResolvedValue(innertube);

    const segments = await fetchViaInnertube("dQw4w9WgXcQ");
    expect(segments[0].start).toBeCloseTo(1.234);
    expect(segments[0].end).toBeCloseTo(5.678);
  });
});

// ─── fetchViaInnertube — language selection ───────────────────────────────────

describe("fetchViaInnertube — language selection", () => {
  it("selects English when the default language is not English", async () => {
    const englishSegments = [makeSegment("English caption.", 0, 2000)];
    const { innertube, transcriptInfo } = makeFakeInnertube({
      selectedLanguage: "fr",
      languages: ["fr", "en"],
      initialSegments: [makeSegment("Légende française.", 0, 2000)],
      selectLanguageResult: {
        selectedLanguage: "en",
        initialSegments: englishSegments,
      },
    });
    createFn.mockResolvedValue(innertube);

    const segments = await fetchViaInnertube("dQw4w9WgXcQ");
    expect(transcriptInfo.selectLanguage).toHaveBeenCalledWith("en");
    expect(segments[0].text).toBe("English caption.");
  });

  it("does not call selectLanguage when already in English", async () => {
    const { innertube, transcriptInfo } = makeFakeInnertube({
      selectedLanguage: "en",
      languages: ["en"],
      initialSegments: [makeSegment("Hello.", 0, 2000)],
    });
    createFn.mockResolvedValue(innertube);

    await fetchViaInnertube("dQw4w9WgXcQ");
    expect(transcriptInfo.selectLanguage).not.toHaveBeenCalled();
  });
});

// ─── fetchViaInnertube — NO_CAPTIONS ─────────────────────────────────────────

describe("fetchViaInnertube — throws NO_CAPTIONS", () => {
  it("throws NO_CAPTIONS when getTranscript throws 'Transcript panel not found'", async () => {
    const { innertube } = makeFakeInnertube({
      getTranscriptThrows: Object.assign(
        new Error("Transcript panel not found. Video likely has no transcript."),
        { name: "InnertubeError" },
      ),
    });
    createFn.mockResolvedValue(innertube);

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS",
    });
  });

  it("throws NO_CAPTIONS when getTranscript throws 'No transcript'", async () => {
    const { innertube } = makeFakeInnertube({
      getTranscriptThrows: Object.assign(
        new Error("No transcript available for this video"),
        { name: "InnertubeError" },
      ),
    });
    createFn.mockResolvedValue(innertube);

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS",
    });
  });

  it("throws NO_CAPTIONS when getTranscript throws 'Engagement panels not found'", async () => {
    const { innertube } = makeFakeInnertube({
      getTranscriptThrows: Object.assign(
        new Error("Engagement panels not found. Video likely has no transcript."),
        { name: "InnertubeError" },
      ),
    });
    createFn.mockResolvedValue(innertube);

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS",
    });
  });

  it("throws NO_CAPTIONS when transcript body is null", async () => {
    const { innertube } = makeFakeInnertube({
      selectedLanguage: "en",
      languages: ["en"],
      // We override the transcript content to have no body
    });
    // Override the getInfo to return a videoInfo whose getTranscript returns
    // a transcript with null body
    const videoInfoWithNullBody = {
      getTranscript: vi.fn().mockResolvedValue({
        selectedLanguage: "en",
        languages: ["en"],
        transcript: {
          content: null,
        },
        selectLanguage: vi.fn(),
      }),
    };
    (innertube as { getInfo: ReturnType<typeof vi.fn> }).getInfo.mockResolvedValue(
      videoInfoWithNullBody,
    );
    createFn.mockResolvedValue(innertube);

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS",
    });
  });

  it("throws NO_CAPTIONS when segment list is empty", async () => {
    const { innertube } = makeFakeInnertube({
      selectedLanguage: "en",
      languages: ["en"],
      initialSegments: [],
    });
    createFn.mockResolvedValue(innertube);

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS",
    });
  });

  it("throws NO_CAPTIONS when all segments are section headers (no real segments)", async () => {
    const { innertube } = makeFakeInnertube({
      selectedLanguage: "en",
      languages: ["en"],
      initialSegments: [
        makeSectionHeader("Intro"),
        makeSectionHeader("Part 1"),
      ],
    });
    createFn.mockResolvedValue(innertube);

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NO_CAPTIONS",
    });
  });
});

// ─── fetchViaInnertube — PRIVATE ─────────────────────────────────────────────

describe("fetchViaInnertube — throws PRIVATE", () => {
  it("throws PRIVATE when getInfo error mentions 'private'", async () => {
    const { innertube } = makeFakeInnertube({
      getInfoThrows: new Error("Private video. Sign in if you've been granted access."),
    });
    createFn.mockResolvedValue(innertube);

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "PRIVATE",
    });
  });

  it("throws PRIVATE when getInfo error mentions 'login'", async () => {
    const { innertube } = makeFakeInnertube({
      getInfoThrows: new Error("Login required to view this content"),
    });
    createFn.mockResolvedValue(innertube);

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "PRIVATE",
    });
  });

  it("throws PRIVATE when getInfo error mentions 'unavailable'", async () => {
    const { innertube } = makeFakeInnertube({
      getInfoThrows: new Error("Video unavailable"),
    });
    createFn.mockResolvedValue(innertube);

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "PRIVATE",
    });
  });
});

// ─── fetchViaInnertube — NETWORK_ERROR ───────────────────────────────────────

describe("fetchViaInnertube — throws NETWORK_ERROR", () => {
  it("throws NETWORK_ERROR when Innertube.create() throws", async () => {
    createFn.mockRejectedValue(new Error("fetch failed: ECONNRESET"));

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });

  it("throws NETWORK_ERROR when getInfo throws a generic error", async () => {
    const { innertube } = makeFakeInnertube({
      getInfoThrows: new Error("Something unexpected happened"),
    });
    createFn.mockResolvedValue(innertube);

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });

  it("throws NETWORK_ERROR when getTranscript throws a generic error", async () => {
    const { innertube } = makeFakeInnertube({
      getTranscriptThrows: new Error("Unexpected API format"),
    });
    createFn.mockResolvedValue(innertube);

    await expect(fetchViaInnertube("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });
});
