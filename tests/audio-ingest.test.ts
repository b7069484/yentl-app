import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock @vercel/blob/client ─────────────────────────────────────────────────
// Use vi.hoisted so the mock function is available when the factory runs.

const { mockUpload } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
}));

vi.mock("@vercel/blob/client", () => ({
  upload: mockUpload,
}));

import {
  estimateDeepgramCost,
  formatDuration,
  formatBytes,
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

// ─── uploadToBlob ──────────────────────────────────────────────────────────────

describe("uploadToBlob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({
      url: "https://blob.vercel-storage.com/audio-abc123.mp3",
      pathname: "audio-abc123.mp3",
      contentType: "audio/mpeg",
      contentDisposition: "attachment",
      downloadUrl: "https://blob.vercel-storage.com/audio-abc123.mp3?download=1",
    });
  });

  it("calls upload with correct args and returns { url }", async () => {
    const file = new File(["data"], "test.mp3", { type: "audio/mpeg" });
    const result = await uploadToBlob(file);

    expect(mockUpload).toHaveBeenCalledWith(
      "test.mp3",
      file,
      expect.objectContaining({
        access: "public",
        handleUploadUrl: "/api/upload-audio",
        contentType: "audio/mpeg",
      }),
    );

    expect(result).toEqual({
      url: "https://blob.vercel-storage.com/audio-abc123.mp3",
    });
  });

  it("propagates upload errors", async () => {
    mockUpload.mockRejectedValue(new Error("Network error"));
    const file = new File(["data"], "test.wav", { type: "audio/wav" });
    await expect(uploadToBlob(file)).rejects.toThrow("Network error");
  });
});
