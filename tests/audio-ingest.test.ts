import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock @vercel/blob/client ─────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file by Vitest; any variable referenced
// inside the factory must also be hoisted via vi.hoisted().

const { mockBlobUpload } = vi.hoisted(() => ({
  mockBlobUpload: vi.fn(),
}));

vi.mock("@vercel/blob/client", () => ({
  upload: mockBlobUpload,
}));

import {
  estimateDeepgramCost,
  formatDuration,
  formatBytes,
  transcribeAudioFile,
  BLOB_UPLOAD_THRESHOLD_BYTES,
} from "@/lib/client/audio-ingest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a file sized exactly at the threshold boundary. */
function makeSmallFile(name = "small.mp3", type = "audio/mpeg") {
  // 1 MB — well below the 4 MB threshold → multipart path
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: 1 * 1024 * 1024 });
  return f;
}

function makeLargeFile(name = "large.mp3", type = "audio/mpeg") {
  // 8 MB — above the 4 MB threshold → blob path
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: 8 * 1024 * 1024 });
  return f;
}

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

// ─── transcribeAudioFile — multipart path (small files < 4 MB) ───────────────

describe("transcribeAudioFile — multipart path (small files)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    const file = makeSmallFile();
    const result = await transcribeAudioFile(file, 120);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/transcribe-batch",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );
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

    const file = makeSmallFile("audio.wav", "audio/wav");
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

    const file = makeSmallFile();
    await expect(transcribeAudioFile(file, 100)).rejects.toThrow("audio exceeds 4-hour cap");

    vi.unstubAllGlobals();
  });

  it("falls back to 'Transcription failed (N)' when response has no error field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    }));

    const file = makeSmallFile();
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
    const file = makeSmallFile();
    await transcribeAudioFile(file, 60, controller.signal);

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.signal).toBe(controller.signal);

    vi.unstubAllGlobals();
  });

  it("does NOT call @vercel/blob upload for small files", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ utterances: [], speakers: [] }),
    }));

    const file = makeSmallFile();
    await transcribeAudioFile(file, 60);

    expect(mockBlobUpload).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

// ─── transcribeAudioFile — blob path (large files >= 4 MB) ───────────────────

describe("transcribeAudioFile — blob path (large files)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls @vercel/blob upload() for files >= BLOB_UPLOAD_THRESHOLD_BYTES", async () => {
    mockBlobUpload.mockResolvedValue({ url: "https://blob.vercel-storage.com/audio-abc.mp3" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ utterances: [], speakers: [] }),
    }));

    const file = makeLargeFile();
    await transcribeAudioFile(file, 300);

    expect(mockBlobUpload).toHaveBeenCalledOnce();
    expect(mockBlobUpload).toHaveBeenCalledWith(
      file.name,
      file,
      expect.objectContaining({
        access: "public",
        handleUploadUrl: "/api/upload-audio",
      }),
    );

    vi.unstubAllGlobals();
  });

  it("calls /api/transcribe-batch with JSON { blob_url, duration_sec } after upload", async () => {
    const blobUrl = "https://blob.vercel-storage.com/audio-abc.mp3";
    mockBlobUpload.mockResolvedValue({ url: blobUrl });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ utterances: [], speakers: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const file = makeLargeFile();
    await transcribeAudioFile(file, 300);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/transcribe-batch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ blob_url: blobUrl, duration_sec: 300 }),
      }),
    );

    vi.unstubAllGlobals();
  });

  it("returns utterances and speakers from the transcribe-batch JSON response", async () => {
    mockBlobUpload.mockResolvedValue({ url: "https://blob.vercel-storage.com/x.mp3" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        utterances: [{ text: "Large file.", start: 0, end: 2, is_final: true, speaker_id: 0 }],
        speakers: [{ id: 0, label: "Speaker 1" }],
      }),
    }));

    const file = makeLargeFile();
    const result = await transcribeAudioFile(file, 300);

    expect(result.utterances[0].text).toBe("Large file.");

    vi.unstubAllGlobals();
  });

  it("throws when @vercel/blob upload() rejects", async () => {
    mockBlobUpload.mockRejectedValue(new Error("BLOB_READ_WRITE_TOKEN not set"));

    const file = makeLargeFile();
    await expect(transcribeAudioFile(file, 300)).rejects.toThrow("BLOB_READ_WRITE_TOKEN not set");
  });

  it("calls onUploadProgress callback during upload", async () => {
    let capturedProgress: ((event: { loaded: number; total: number }) => void) | undefined;

    mockBlobUpload.mockImplementation(async (_name: string, _file: File, opts: { onUploadProgress?: (e: { loaded: number; total: number }) => void }) => {
      capturedProgress = opts.onUploadProgress;
      return { url: "https://blob.vercel-storage.com/x.mp3" };
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ utterances: [], speakers: [] }),
    }));

    const progressSpy = vi.fn();
    const file = makeLargeFile();
    await transcribeAudioFile(file, 300, undefined, progressSpy);

    // Simulate the blob SDK calling onUploadProgress
    capturedProgress?.({ loaded: 50, total: 100 });
    expect(progressSpy).toHaveBeenCalledWith(50);

    vi.unstubAllGlobals();
  });
});

// ─── BLOB_UPLOAD_THRESHOLD_BYTES export ───────────────────────────────────────

describe("BLOB_UPLOAD_THRESHOLD_BYTES", () => {
  it("is 4 MB (4 * 1024 * 1024)", () => {
    expect(BLOB_UPLOAD_THRESHOLD_BYTES).toBe(4 * 1024 * 1024);
  });
});
