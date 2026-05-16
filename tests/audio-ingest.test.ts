import { describe, it, expect, vi } from "vitest";

import {
  estimateDeepgramCost,
  formatDuration,
  formatBytes,
  transcribeAudioFile,
  uploadToBlob,
} from "@/lib/client/audio-ingest";

// ─── estimateDeepgramCost ─────────────────────────────────────────────────────

describe("estimateDeepgramCost", () => {
  it("60s → dollars = 0.0043, display = '$0.00' (rounds to cents)", () => {
    const result = estimateDeepgramCost(60);
    expect(result.dollars).toBeCloseTo(0.0043, 6);
    // $0.0043 rounds to $0.00 at toFixed(2)
    expect(result.display).toBe("$0.00");
  });

  it("3600s (1h) → dollars ≈ 0.258, display = '$0.26'", () => {
    const result = estimateDeepgramCost(3600);
    expect(result.dollars).toBeCloseTo(0.258, 4);
    expect(result.display).toBe("$0.26");
  });

  it("0s → dollars = 0, display = '$0.00'", () => {
    const result = estimateDeepgramCost(0);
    expect(result.dollars).toBe(0);
    expect(result.display).toBe("$0.00");
  });

  it("600s (10 min) → dollars = 0.043", () => {
    const result = estimateDeepgramCost(600);
    expect(result.dollars).toBeCloseTo(0.043, 6);
  });

  it("3000s (50 min) → dollars ≈ 0.215", () => {
    // 50 * 0.0043 = 0.215 exactly in spec; floating-point may differ slightly
    const result = estimateDeepgramCost(3000);
    expect(result.dollars).toBeCloseTo(0.215, 4);
    // display should be $0.21 or $0.22 depending on FP rounding - just check format
    expect(result.display).toMatch(/^\$0\.\d{2}$/);
  });
});

// ─── formatDuration ────────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("0s → '0:00'", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("59s → '0:59'", () => {
    expect(formatDuration(59)).toBe("0:59");
  });

  it("60s → '1:00'", () => {
    expect(formatDuration(60)).toBe("1:00");
  });

  it("90s → '1:30'", () => {
    expect(formatDuration(90)).toBe("1:30");
  });

  it("3600s → '1:00:00'", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
  });

  it("3661s → '1:01:01'", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("7199s → '1:59:59'", () => {
    expect(formatDuration(7199)).toBe("1:59:59");
  });
});

// ─── formatBytes ───────────────────────────────────────────────────────────────

describe("formatBytes", () => {
  it("500 bytes → KB format", () => {
    expect(formatBytes(500)).toMatch(/KB/);
  });

  it("2 MB → '2.0 MB'", () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });

  it("1023 * 1024 bytes → KB format (just under 1MB)", () => {
    const val = formatBytes(1023 * 1024);
    expect(val).toMatch(/KB/);
    expect(val).not.toMatch(/MB/);
  });
});

// ─── transcribeAudioFile ───────────────────────────────────────────────────────

describe("transcribeAudioFile", () => {
  it("POSTs multipart/form-data to /api/transcribe-batch and returns utterances + speakers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          utterances: [{ text: "Hello.", start: 0, end: 1, is_final: true, speaker_id: 0 }],
          speakers: [{ id: 0, label: "Speaker 1" }],
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const file = new File(["data"], "test.mp3", { type: "audio/mpeg" });
    const result = await transcribeAudioFile(file, 120);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/transcribe-batch",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );

    expect(result.utterances).toHaveLength(1);
    expect(result.utterances[0].text).toBe("Hello.");
    expect(result.speakers).toEqual([{ id: 0, label: "Speaker 1" }]);

    vi.unstubAllGlobals();
  });

  it("includes file and duration_sec in the FormData", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ utterances: [], speakers: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const file = new File(["data"], "audio.wav", { type: "audio/wav" });
    await transcribeAudioFile(file, 300);

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = opts.body as FormData;
    expect(body.get("file")).toBe(file);
    expect(body.get("duration_sec")).toBe("300");

    vi.unstubAllGlobals();
  });

  it("throws with the server error message when response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "audio exceeds 4-hour cap" }),
    }));

    const file = new File(["data"], "test.mp3", { type: "audio/mpeg" });
    await expect(transcribeAudioFile(file, 100)).rejects.toThrow("audio exceeds 4-hour cap");

    vi.unstubAllGlobals();
  });

  it("falls back to 'Transcription failed (N)' when response has no error field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    }));

    const file = new File(["data"], "test.mp3", { type: "audio/mpeg" });
    await expect(transcribeAudioFile(file, 60)).rejects.toThrow("Transcription failed (500)");

    vi.unstubAllGlobals();
  });

  it("passes the AbortSignal to fetch", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ utterances: [], speakers: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const controller = new AbortController();
    const file = new File(["data"], "test.mp3", { type: "audio/mpeg" });
    await transcribeAudioFile(file, 60, controller.signal);

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.signal).toBe(controller.signal);

    vi.unstubAllGlobals();
  });
});

// ─── uploadToBlob (deprecated) ────────────────────────────────────────────────

describe("uploadToBlob (deprecated)", () => {
  it("throws a deprecation error pointing to transcribeAudioFile", async () => {
    const file = new File(["data"], "test.mp3", { type: "audio/mpeg" });
    await expect(uploadToBlob(file)).rejects.toThrow(/uploadToBlob is no longer supported/);
  });
});
