import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";

// ─── Module mocks ─────────────────────────────────────────────────────────────
// Mock the thin adapter module rather than node: built-ins directly, which
// are immutable ESM namespaces. vi.hoisted() lets us reference the stubs
// inside the factory closure even though vi.mock() is hoisted to the top.

const { spawnFn, mkdtempFn, readFileFn, rmFn, tmpdirFn } = vi.hoisted(() => ({
  spawnFn: vi.fn(),
  mkdtempFn: vi.fn(),
  readFileFn: vi.fn(),
  rmFn: vi.fn(),
  tmpdirFn: vi.fn(),
}));

vi.mock("@/lib/server/yt-dlp-runner", () => ({
  spawn: spawnFn,
  mkdtemp: mkdtempFn,
  readFile: readFileFn,
  rm: rmFn,
  tmpdir: tmpdirFn,
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

// ─── Reset mocks between tests ────────────────────────────────────────────────

beforeEach(() => {
  spawnFn.mockReset();
  mkdtempFn.mockReset();
  readFileFn.mockReset();
  rmFn.mockReset();
  tmpdirFn.mockReset();

  // Sensible defaults
  tmpdirFn.mockReturnValue("/tmp");
  mkdtempFn.mockResolvedValue("/tmp/yenta-yt-abc123");
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
    // Wait for mkdtemp + spawn to run, then emit close
    await Promise.resolve();
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
    await Promise.resolve();
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
    await Promise.resolve();
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
    await Promise.resolve();
    emitClose(0);
    await promise;

    expect(rmFn).toHaveBeenCalledWith(
      "/tmp/yenta-yt-abc123",
      { recursive: true, force: true },
    );
  });

  it("passes the video URL and required flags to yt-dlp args", async () => {
    const { proc, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);
    readFileFn.mockResolvedValue(VALID_SRT);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await Promise.resolve();
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
    await Promise.resolve();
    emitClose(0);

    await expect(promise).rejects.toMatchObject({ code: "NO_CAPTIONS" });
  });

  it("throws NO_CAPTIONS when SRT parses to zero segments (empty file)", async () => {
    const { proc, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);
    readFileFn.mockResolvedValue("");

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await Promise.resolve();
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
    await Promise.resolve();
    emitStderr("ERROR: [youtube] dQw4w9WgXcQ: Private video. Sign in if you've been granted access");
    emitClose(1);

    await expect(promise).rejects.toMatchObject({ code: "PRIVATE" });
  });

  it("throws PRIVATE when stderr contains 'age-restricted'", async () => {
    const { proc, emitStderr, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await Promise.resolve();
    emitStderr("ERROR: [youtube] This video is age-restricted");
    emitClose(1);

    await expect(promise).rejects.toMatchObject({ code: "PRIVATE" });
  });

  it("throws PRIVATE when stderr contains 'login required'", async () => {
    const { proc, emitStderr, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await Promise.resolve();
    emitStderr("ERROR: Login required to access this content");
    emitClose(1);

    await expect(promise).rejects.toMatchObject({ code: "PRIVATE" });
  });

  it("throws PRIVATE when stderr contains 'not available'", async () => {
    const { proc, emitStderr, emitClose } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await Promise.resolve();
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
    await Promise.resolve();
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
    await Promise.resolve();
    emitStderr("ERROR: Something unexpected happened");
    emitClose(2);

    await expect(promise).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("throws NETWORK_ERROR when the proc 'error' event fires with non-ENOENT", async () => {
    const { proc, emitError } = makeFakeProc();
    spawnFn.mockReturnValue(proc);

    const promise = fetchCaptions("dQw4w9WgXcQ");
    await Promise.resolve();
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

    // Drain microtasks so mkdtemp resolves and the setTimeout is installed
    await Promise.resolve();

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
