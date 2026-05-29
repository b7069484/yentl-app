import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";

// ─── Module mocks ─────────────────────────────────────────────────────────────
// Mock the thin adapter module rather than node: built-ins directly, which
// are immutable ESM namespaces. vi.hoisted() lets us reference the stubs
// inside the factory closure even though vi.mock() is hoisted to the top.

const { spawnFn, mkdtempFn, readFileFn, rmFn, tmpdirFn, innertubeCreateFn, youtubeTranscriptFetchFn } =
  vi.hoisted(() => ({
    spawnFn: vi.fn(),
    mkdtempFn: vi.fn(),
    readFileFn: vi.fn(),
    rmFn: vi.fn(),
    tmpdirFn: vi.fn(),
    innertubeCreateFn: vi.fn(),
    youtubeTranscriptFetchFn: vi.fn(),
  }));

vi.mock("@/lib/server/yt-dlp-runner", () => ({
  spawn: spawnFn,
  mkdtemp: mkdtempFn,
  readFile: readFileFn,
  rm: rmFn,
  tmpdir: tmpdirFn,
  getYtDlpBinaryPath: () => "yt-dlp",
}));

// Mock youtubei.js so the Innertube primary path can be controlled per-test.
// Default: create() throws NETWORK_ERROR so yt-dlp tests exercise the fallback.
vi.mock("youtubei.js", () => ({
  Innertube: {
    create: innertubeCreateFn,
  },
}));

vi.mock("youtube-transcript", () => ({
  YoutubeTranscript: {
    fetchTranscript: youtubeTranscriptFetchFn,
  },
}));

// ─── Import under test (after mocks) ─────────────────────────────────────────

import { fetchCaptions, parseSrt } from "@/lib/server/youtube-captions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MockSpawnProc = EventEmitter & {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: ReturnType<typeof vi.fn>;
};

/**
 * Builds a fake child_process handle that the spawn mock returns.
 */
function makeFakeProc(): {
  proc: MockSpawnProc;
  emitStdout: (data: string) => void;
  emitStderr: (data: string) => void;
  emitError: (err: Error) => void;
  emitClose: (code: number | null) => void;
} {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const proc = Object.assign(new EventEmitter(), {
    stdout,
    stderr,
    kill: vi.fn(),
  }) as MockSpawnProc;

  return {
    proc,
    emitStdout: (data) => stdout.emit("data", Buffer.from(data)),
    emitStderr: (data) => stderr.emit("data", Buffer.from(data)),
    emitError: (err) => proc.emit("error", err),
    emitClose: (code) => proc.emit("close", code),
  };
}

const VALID_SRT = `1
00:00:00,570 --> 00:00:04,310
Hello world.

2
00:00:04,320 --> 00:00:08,990
This is a test.

3
00:00:09,000 --> 00:00:12,000
Final line.
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Flush all pending microtasks (several Promise.resolve() ticks).
 *
 * fetchCaptions now tries Innertube first before falling back to yt-dlp.
 * The Innertube call adds extra microtask ticks before spawnYtDlp is invoked,
 * so a single `await Promise.resolve()` is no longer sufficient. This helper
 * drains enough ticks to let the Innertube rejection settle and the yt-dlp
 * spawn to be called, without requiring real timers.
 */
async function flushPromises(ticks = 10): Promise<void> {
  for (let i = 0; i < ticks; i++) {
    await Promise.resolve();
  }
}

// ─── Reset mocks between tests ────────────────────────────────────────────────

beforeEach(() => {
  spawnFn.mockReset();
  mkdtempFn.mockReset();
  readFileFn.mockReset();
  rmFn.mockReset();
  tmpdirFn.mockReset();
  innertubeCreateFn.mockReset();
  youtubeTranscriptFetchFn.mockReset();

  // Default Innertube to fail with NETWORK_ERROR so existing yt-dlp tests
  // exercise the fallback path without needing per-test Innertube setup.
  innertubeCreateFn.mockRejectedValue(new Error("Innertube unavailable (test default)"));
  youtubeTranscriptFetchFn.mockRejectedValue(
    new Error("No transcripts are available (test default)"),
  );

  // Sensible defaults
  tmpdirFn.mockReturnValue("/tmp");
  mkdtempFn.mockResolvedValue("/tmp/yentl-yt-abc123");
  rmFn.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── fetchCaptions — happy path ───────────────────────────────────────────────

describe("fetchCaptions — happy path", () => {
  it("returns parsed segments when spawn exits 0 and SRT file exists", async () => {
    const { proc, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);
    readFileFn.mockResolvedValue(VALID_SRT);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    // flushPromises drains Innertube rejection + mkdtemp + spawnYtDlp ticks
    await flushPromises();
    emitClose(0);

    const segments = await promise;
    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe("Hello world.");
    expect(segments[0].start).toBeCloseTo(0.57);
    expect(segments[0].end).toBeCloseTo(4.31);
    expect(segments[2].text).toBe("Final line.");
  });

  it("sets is_final: true on all segments", async () => {
    const { proc, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);
    readFileFn.mockResolvedValue(VALID_SRT);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitClose(0);

    const segments = await promise;
    for (const seg of segments) {
      expect(seg.is_final).toBe(true);
    }
  });

  it("sets speaker_id: 0 on all segments", async () => {
    const { proc, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);
    readFileFn.mockResolvedValue(VALID_SRT);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitClose(0);

    const segments = await promise;
    for (const seg of segments) {
      expect(seg.speaker_id).toBe(0);
    }
  });

  it("cleans up the temp dir even on success", async () => {
    const { proc, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);
    readFileFn.mockResolvedValue(VALID_SRT);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitClose(0);
    await promise;

    expect(rmFn).toHaveBeenCalledWith(
      "/tmp/yentl-yt-abc123",
      { recursive: true, force: true },
    );
  });

  it("passes the video URL and required flags to yt-dlp args", async () => {
    const { proc, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);
    readFileFn.mockResolvedValue(VALID_SRT);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitClose(0);
    await promise;

    expect(spawnFn).toHaveBeenCalledTimes(1);
    const args = spawnFn.mock.calls[0][1] as string[];
    expect(args).toContain("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(args).toContain("--skip-download");
    expect(args).toContain("--convert-subs");
    expect(args).toContain("srt");
    expect(args).toContain("--sub-lang");
    expect(args).toContain("en");
  });
});

// ─── fetchCaptions — NO_CAPTIONS ─────────────────────────────────────────────

describe("fetchCaptions — throws NO_CAPTIONS when SRT file is absent", () => {
  it("throws NO_CAPTIONS when spawn exits 0 but readFile throws ENOENT", async () => {
    const { proc, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);
    const enoent = Object.assign(new Error("ENOENT: no such file"), { code: "ENOENT" });
    readFileFn.mockRejectedValue(enoent);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitClose(0);

    await expect(promise).rejects.toMatchObject({ code: "NO_CAPTIONS" });
  });

  it("throws NO_CAPTIONS when SRT parses to zero segments (empty file)", async () => {
    const { proc, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);
    readFileFn.mockResolvedValue("");

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitClose(0);

    await expect(promise).rejects.toMatchObject({ code: "NO_CAPTIONS" });
  });
});

// ─── fetchCaptions — PRIVATE ─────────────────────────────────────────────────

describe("fetchCaptions — throws PRIVATE on private/restricted videos", () => {
  it("throws PRIVATE when stderr contains 'Private video'", async () => {
    const { proc, emitStderr, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitStderr("ERROR: [youtube] dQw4w9WgXcQ: Private video. Sign in if you've been granted access");
    emitClose(1);

    await expect(promise).rejects.toMatchObject({ code: "PRIVATE" });
  });

  it("throws PRIVATE when stderr contains 'age-restricted'", async () => {
    const { proc, emitStderr, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitStderr("ERROR: [youtube] This video is age-restricted");
    emitClose(1);

    await expect(promise).rejects.toMatchObject({ code: "PRIVATE" });
  });

  it("throws PRIVATE when stderr contains 'login required'", async () => {
    const { proc, emitStderr, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitStderr("ERROR: Login required to access this content");
    emitClose(1);

    await expect(promise).rejects.toMatchObject({ code: "PRIVATE" });
  });

  it("throws PRIVATE when stderr contains 'not available'", async () => {
    const { proc, emitStderr, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitStderr("ERROR: This video is not available in your country");
    emitClose(1);

    await expect(promise).rejects.toMatchObject({ code: "PRIVATE" });
  });
});

// ─── fetchCaptions — YT_DLP_MISSING ─────────────────────────────────────────

describe("fetchCaptions — throws YT_DLP_MISSING when yt-dlp binary is absent", () => {
  it("throws YT_DLP_MISSING when the proc 'error' event fires with ENOENT", async () => {
    const { proc, emitError } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    const enoent = Object.assign(new Error("spawn yt-dlp ENOENT"), {
      code: "ENOENT",
    });
    emitError(enoent);

    await expect(promise).rejects.toMatchObject({ code: "YT_DLP_MISSING" });
  });
});

// ─── fetchCaptions — NETWORK_ERROR ───────────────────────────────────────────

describe("fetchCaptions — throws NETWORK_ERROR for generic non-zero exit", () => {
  it("throws NETWORK_ERROR when yt-dlp exits non-zero with unknown stderr", async () => {
    const { proc, emitStderr, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitStderr("ERROR: Something unexpected happened");
    emitClose(2);

    await expect(promise).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("throws NETWORK_ERROR when the proc 'error' event fires with non-ENOENT", async () => {
    const { proc, emitError } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    const err = Object.assign(new Error("EACCES: permission denied"), {
      code: "EACCES",
    });
    emitError(err);

    await expect(promise).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

// ─── fetchCaptions — timeout ─────────────────────────────────────────────────

describe("fetchCaptions — throws NETWORK_ERROR on timeout", () => {
  it("kills the process and throws NETWORK_ERROR after 60s", async () => {
    vi.useFakeTimers();

    const { proc } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    // Suppress unhandled-rejection noise — we will assert on it below
    promise.catch(() => {});

    // Drain microtasks: Innertube rejection ticks + mkdtemp + spawnYtDlp +
    // setTimeout registration all happen in the microtask queue.
    await flushPromises();

    // Advance past the 60s timeout — fires the SIGKILL + reject
    await vi.advanceTimersByTimeAsync(61_000);

    await expect(promise).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: expect.stringContaining("timed out"),
    });
    expect(proc.kill).toHaveBeenCalledWith("SIGKILL");
  }, 15_000); // generous wall-clock timeout for fake timer tests
});

// ─── parseSrt — standard cases ────────────────────────────────────────────────

describe("parseSrt — standard SRT with 3 blocks", () => {
  it("returns 3 segments with correct timestamps", () => {
    const segments = parseSrt(VALID_SRT);
    expect(segments).toHaveLength(3);
    expect(segments[0].start).toBeCloseTo(0.57);
    expect(segments[0].end).toBeCloseTo(4.31);
    expect(segments[1].start).toBeCloseTo(4.32);
    expect(segments[1].end).toBeCloseTo(8.99);
    expect(segments[2].start).toBeCloseTo(9.0);
    expect(segments[2].end).toBeCloseTo(12.0);
  });

  it("preserves [Music] cue markers (not stripped)", () => {
    const srt = `1
00:00:00,000 --> 00:00:03,000
[Music]
`;
    const segments = parseSrt(srt);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("[Music]");
  });

  it("strips <c.colorE5E5E5> tags but keeps the text inside them", () => {
    const srt = `1
00:00:00,000 --> 00:00:05,000
<c.colorE5E5E5>hello</c.colorE5E5E5> world
`;
    const segments = parseSrt(srt);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("hello world");
  });

  it("strips generic <c> tags", () => {
    const srt = `1
00:00:00,000 --> 00:00:05,000
<c>tagged</c> text
`;
    const segments = parseSrt(srt);
    expect(segments[0].text).toBe("tagged text");
  });

  it("handles sub-second offsets with correct decimal precision", () => {
    const srt = `1
00:00:00,570 --> 00:00:19,310
Content here.
`;
    const segments = parseSrt(srt);
    expect(segments[0].start).toBeCloseTo(0.57, 2);
    expect(segments[0].end).toBeCloseTo(19.31, 2);
  });

  it("returns empty array for empty SRT string", () => {
    expect(parseSrt("")).toEqual([]);
    expect(parseSrt("   \n\n   ")).toEqual([]);
  });

  it("skips blocks with malformed timeline (no -->)", () => {
    const srt = `1
BAD TIMELINE LINE
Caption text.

2
00:00:01,000 --> 00:00:02,000
Good line.
`;
    const segments = parseSrt(srt);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("Good line.");
  });

  it("joins multi-line caption text with a space", () => {
    const srt = `1
00:00:00,000 --> 00:00:05,000
line one
line two
line three
`;
    const segments = parseSrt(srt);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("line one line two line three");
  });
});

// ─── parseSrt — deduplication (yt-dlp carousel) ───────────────────────────────

describe("parseSrt — deduplication of consecutive identical text", () => {
  it("collapses 3 consecutive identical segments into 1 with extended end", () => {
    const srt = `1
00:00:01,000 --> 00:00:03,000
the same text

2
00:00:02,000 --> 00:00:04,000
the same text

3
00:00:03,000 --> 00:00:05,000
the same text
`;
    const segments = parseSrt(srt);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("the same text");
    expect(segments[0].start).toBeCloseTo(1.0);
    expect(segments[0].end).toBeCloseTo(5.0);
  });

  it("does not dedupe non-consecutive identical segments", () => {
    const srt = `1
00:00:01,000 --> 00:00:02,000
hello

2
00:00:02,000 --> 00:00:03,000
world

3
00:00:03,000 --> 00:00:04,000
hello
`;
    const segments = parseSrt(srt);
    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe("hello");
    expect(segments[1].text).toBe("world");
    expect(segments[2].text).toBe("hello");
  });

  it("collapses a run of 2 but keeps a separate non-matching segment", () => {
    const srt = `1
00:00:00,000 --> 00:00:02,000
first

2
00:00:01,000 --> 00:00:03,000
first

3
00:00:03,000 --> 00:00:05,000
second
`;
    const segments = parseSrt(srt);
    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe("first");
    expect(segments[0].end).toBeCloseTo(3.0);
    expect(segments[1].text).toBe("second");
  });
});

// ─── parseSrt — Windows CRLF line endings ────────────────────────────────────

describe("parseSrt — CRLF line endings", () => {
  it("handles \\r\\n line endings correctly", () => {
    const srt = "1\r\n00:00:00,000 --> 00:00:02,000\r\nHello CRLF.\r\n\r\n";
    const segments = parseSrt(srt);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("Hello CRLF.");
  });
});

// ─── fetchCaptions — Innertube-first orchestration ───────────────────────────
// These tests verify the wrapper's two-path strategy:
//   1. Innertube succeeds → return immediately, yt-dlp never called
//   2. Innertube fails with PRIVATE → rethrow immediately, yt-dlp never called
//   3. Innertube fails with NETWORK_ERROR → fall through to yt-dlp
//   4. Innertube fails with NO_CAPTIONS → fall through to yt-dlp

function makeInnertubeVideoInfo(segments: Array<{
  type: "TranscriptSegment";
  start_ms: string;
  end_ms: string;
  snippet: { text: string };
}>) {
  return {
    getTranscript: vi.fn().mockResolvedValue({
      selectedLanguage: "en",
      languages: ["en"],
      transcript: {
        content: {
          body: { initial_segments: segments },
        },
      },
      selectLanguage: vi.fn(),
    }),
  };
}

describe("fetchCaptions — Innertube-first orchestration", () => {
  it("returns Innertube segments directly when Innertube succeeds", async () => {
    const innertubeInstance = {
      getInfo: vi.fn().mockResolvedValue(
        makeInnertubeVideoInfo([
          { type: "TranscriptSegment", start_ms: "0", end_ms: "2000", snippet: { text: "Hello from Innertube." } },
        ]),
      ),
    };
    innertubeCreateFn.mockResolvedValue(innertubeInstance);

    const segments = await fetchCaptions("dQw4w9WgXcQ");
    // Should NOT call spawn (yt-dlp) since Innertube succeeded
    expect(spawnFn).not.toHaveBeenCalled();
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("Hello from Innertube.");
  });

  it("falls back to youtube-transcript before yt-dlp when Innertube misses captions", async () => {
    const innertubeInstance = {
      getInfo: vi.fn().mockRejectedValue(
        new Error("Transcript panel not found. Video likely has no transcript."),
      ),
    };
    innertubeCreateFn.mockResolvedValue(innertubeInstance);
    youtubeTranscriptFetchFn.mockResolvedValue([
      {
        text: "  Transcript scraper line.  ",
        offset: 16260,
        duration: 2000,
        lang: "en",
      },
    ]);

    const segments = await fetchCaptions("dQw4w9WgXcQ");

    expect(youtubeTranscriptFetchFn).toHaveBeenCalledWith("dQw4w9WgXcQ", {
      lang: "en",
    });
    expect(spawnFn).not.toHaveBeenCalled();
    expect(segments).toEqual([
      {
        text: "Transcript scraper line.",
        start: 16.26,
        end: 18.26,
        is_final: true,
        speaker_id: 0,
      },
    ]);
  });

  it("re-throws PRIVATE immediately without trying yt-dlp", async () => {
    const innertubeInstance = {
      getInfo: vi.fn().mockRejectedValue(new Error("Private video. Sign in.")),
    };
    innertubeCreateFn.mockResolvedValue(innertubeInstance);

    await expect(fetchCaptions("dQw4w9WgXcQ")).rejects.toMatchObject({
      code: "PRIVATE",
    });
    // yt-dlp must not be called
    expect(spawnFn).not.toHaveBeenCalled();
  });

  it("falls back to yt-dlp when Innertube throws NETWORK_ERROR", async () => {
    // Innertube already mocked to fail in beforeEach (the default).
    // Just set up yt-dlp to succeed.
    const { proc, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);
    readFileFn.mockResolvedValue(VALID_SRT);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitClose(0);

    const segments = await promise;
    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe("Hello world.");
  });

  it("falls back to yt-dlp when Innertube throws NO_CAPTIONS", async () => {
    const innertubeInstance = {
      getInfo: vi.fn().mockRejectedValue(
        new Error("Transcript panel not found. Video likely has no transcript."),
      ),
    };
    innertubeCreateFn.mockResolvedValue(innertubeInstance);

    const { proc, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);
    readFileFn.mockResolvedValue(VALID_SRT);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitClose(0);

    const segments = await promise;
    expect(segments).toHaveLength(3);
    expect(spawnFn).toHaveBeenCalledTimes(1);
  });

  it("throws yt-dlp error when both Innertube and yt-dlp fail", async () => {
    // Innertube: default mock (NETWORK_ERROR)
    // yt-dlp: non-zero exit with unknown stderr
    const { proc, emitStderr, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await flushPromises();
    emitStderr("ERROR: Something unexpected happened");
    emitClose(2);

    await expect(promise).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

// Phase 1d Task 1 — the trimodal eval found URL caption timing drift up to
// 467.6 seconds. Root cause: `normalizeTranscriptTime` heuristic only divided
// values > 1000 by 1000, treating sub-second offsets (< 1000ms, < 1s into the
// video) as seconds — a 1000× timeline expansion for early captions. The
// youtube-transcript package returns ms unconditionally, so the heuristic is
// wrong by design. These tests pin down the correct behavior.
describe("fetchCaptions — youtube-transcript timing (Phase 1d Task 1)", () => {
  it("treats offset and duration as milliseconds for sub-second values", async () => {
    const innertubeInstance = {
      getInfo: vi.fn().mockRejectedValue(
        new Error("Transcript panel not found. Video likely has no transcript."),
      ),
    };
    innertubeCreateFn.mockResolvedValue(innertubeInstance);
    youtubeTranscriptFetchFn.mockResolvedValue([
      {
        text: "Hello.",
        offset: 500,      // 0.5 seconds in
        duration: 800,    // 0.8 seconds long
        lang: "en",
      },
    ]);

    const segments = await fetchCaptions("dQw4w9WgXcQ");
    expect(segments).toEqual([
      {
        text: "Hello.",
        start: 0.5,
        end: 1.3,
        is_final: true,
        speaker_id: 0,
      },
    ]);
  });

  it("handles a mixed timeline — early caption + later caption — without expanding either", async () => {
    const innertubeInstance = {
      getInfo: vi.fn().mockRejectedValue(
        new Error("Transcript panel not found. Video likely has no transcript."),
      ),
    };
    innertubeCreateFn.mockResolvedValue(innertubeInstance);
    youtubeTranscriptFetchFn.mockResolvedValue([
      { text: "Cold open.", offset: 0, duration: 900, lang: "en" },         // 0 → 0.9s
      { text: "Greeting.", offset: 900, duration: 1100, lang: "en" },       // 0.9 → 2.0s
      { text: "Later.", offset: 60000, duration: 2500, lang: "en" },        // 60 → 62.5s
    ]);

    const segments = await fetchCaptions("dQw4w9WgXcQ");
    expect(segments).toHaveLength(3);
    expect(segments[0].start).toBe(0);
    expect(segments[0].end).toBeCloseTo(0.9, 3);
    expect(segments[1].start).toBeCloseTo(0.9, 3);
    expect(segments[1].end).toBeCloseTo(2.0, 3);
    expect(segments[2].start).toBe(60);
    expect(segments[2].end).toBeCloseTo(62.5, 3);
  });
});
