import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock SSRF-pinned fetch ───────────────────────────────────────────────────

const { mockFetchWithSsrfGuard } = vi.hoisted(() => ({
  mockFetchWithSsrfGuard: vi.fn(),
}));

vi.mock("@/lib/server/ssrf-guard", () => ({
  fetchWithSsrfGuard: mockFetchWithSsrfGuard,
}));

import { checkMediaMime } from "@/lib/server/media-mime";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function headResponse(status: number, contentType: string | null) {
  const headers = new Headers();
  if (contentType !== null) {
    headers.set("Content-Type", contentType);
  }
  return Promise.resolve(
    new Response(null, { status, headers }),
  );
}

function networkError() {
  return Promise.reject(Object.assign(new Error("Failed to fetch"), { name: "TypeError" }));
}

function abortError() {
  return Promise.reject(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
}

function timeoutError() {
  return Promise.reject(Object.assign(new Error("The operation timed out"), { name: "TimeoutError" }));
}

function ssrfBlocked(message = "URL resolved to a private address") {
  return Object.assign(new Error(message), { code: "SSRF_BLOCKED" });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("checkMediaMime — audio MIME types", () => {
  it("returns ok for audio/mpeg", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "audio/mpeg"));
    const result = await checkMediaMime("https://example.com/ep.mp3");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("audio/mpeg");
    expect(mockFetchWithSsrfGuard).toHaveBeenCalledWith("https://example.com/ep.mp3", {
      method: "HEAD",
      timeoutMs: 5000,
    });
  });

  it("returns ok for audio/wav", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "audio/wav"));
    const result = await checkMediaMime("https://example.com/ep.wav");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("audio/wav");
  });

  it("returns ok for audio/x-m4a", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "audio/x-m4a"));
    const result = await checkMediaMime("https://example.com/ep.m4a");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("audio/x-m4a");
  });

  it("returns ok for audio/ogg", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "audio/ogg"));
    const result = await checkMediaMime("https://example.com/ep.ogg");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("audio/ogg");
  });

  it("accepts Wikimedia-style application/ogg as audio/ogg", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "application/ogg"));
    const result = await checkMediaMime("https://example.com/ep.ogg");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("audio/ogg");
  });

  it("returns ok for audio/webm", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "audio/webm"));
    const result = await checkMediaMime("https://example.com/ep.webm");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("audio/webm");
  });

  it("returns ok for audio/flac", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "audio/flac"));
    const result = await checkMediaMime("https://example.com/ep.flac");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("audio/flac");
  });
});

describe("checkMediaMime — video MIME types", () => {
  it("returns ok for video/mp4", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "video/mp4"));
    const result = await checkMediaMime("https://example.com/clip.mp4");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("video/mp4");
  });

  it("returns ok for video/webm", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "video/webm"));
    const result = await checkMediaMime("https://example.com/clip.webm");
    expect(result.ok).toBe(true);
  });
});

describe("checkMediaMime — Content-Type with charset parameter", () => {
  it("strips charset and still accepts audio/mpeg; charset=utf-8", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "audio/mpeg; charset=utf-8"));
    const result = await checkMediaMime("https://example.com/ep.mp3");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("audio/mpeg");
  });
});

describe("checkMediaMime — application/octet-stream fallback", () => {
  it("accepts application/octet-stream + .mp3 path", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "application/octet-stream"));
    const result = await checkMediaMime("https://cdn.example.com/audio/episode.mp3");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("audio/mp3");
  });

  it("accepts application/octet-stream + .wav path", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "application/octet-stream"));
    const result = await checkMediaMime("https://cdn.example.com/audio/episode.wav");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("audio/wav");
  });

  it("accepts application/octet-stream + .m4a path", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "application/octet-stream"));
    const result = await checkMediaMime("https://cdn.example.com/audio/episode.m4a");
    expect(result.ok).toBe(true);
  });

  it("accepts application/octet-stream + .mp4 path", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "application/octet-stream"));
    const result = await checkMediaMime("https://cdn.example.com/video/clip.mp4");
    expect(result.ok).toBe(true);
  });

  it("rejects application/octet-stream + .pdf path", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "application/octet-stream"));
    const result = await checkMediaMime("https://cdn.example.com/doc/report.pdf");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Unsupported content type");
  });

  it("rejects application/octet-stream + no extension", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "application/octet-stream"));
    const result = await checkMediaMime("https://cdn.example.com/audio/stream");
    expect(result.ok).toBe(false);
  });
});

describe("checkMediaMime — missing or empty Content-Type", () => {
  it("falls back to extension when Content-Type header is absent", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, null));
    const result = await checkMediaMime("https://cdn.example.com/episode.mp3");
    expect(result.ok).toBe(true);
    expect(result.mime).toBe("audio/mp3");
  });
});

describe("checkMediaMime — unsupported types", () => {
  it("rejects text/html", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "text/html"));
    const result = await checkMediaMime("https://example.com/page.html");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Unsupported content type");
  });

  it("rejects application/json", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(200, "application/json"));
    const result = await checkMediaMime("https://api.example.com/data.json");
    expect(result.ok).toBe(false);
  });
});

describe("checkMediaMime — HTTP error responses", () => {
  it("returns ok: false with 'URL not reachable' for 404", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(404, "text/html"));
    const result = await checkMediaMime("https://example.com/missing.mp3");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("URL not reachable");
  });

  it("returns ok: false with 'URL not reachable' for 403", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(403, null));
    const result = await checkMediaMime("https://example.com/forbidden.mp3");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("URL not reachable");
  });

  it("returns ok: false with 'URL not reachable' for 500", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(headResponse(500, null));
    const result = await checkMediaMime("https://example.com/error");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("URL not reachable");
  });
});

describe("checkMediaMime — network errors", () => {
  it("returns ok: false with 'Network error' on TypeError (DNS fail, etc.)", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(networkError());
    const result = await checkMediaMime("https://nonexistent.example.com/ep.mp3");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Network error");
  });

  it("returns ok: false with 'Timeout' on AbortError (AbortSignal.timeout expired)", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(abortError());
    const result = await checkMediaMime("https://slow.example.com/ep.mp3");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Timeout");
  });

  it("returns ok: false with 'Timeout' on TimeoutError (Node 18+ AbortSignal.timeout)", async () => {
    mockFetchWithSsrfGuard.mockReturnValueOnce(timeoutError());
    const result = await checkMediaMime("https://slow.example.com/ep.mp3");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Timeout");
  });
});

describe("checkMediaMime — SSRF guard failures", () => {
  it("propagates SSRF_BLOCKED for a private literal IP target", async () => {
    const error = ssrfBlocked("URL resolved to a private address: 127.0.0.1");
    mockFetchWithSsrfGuard.mockRejectedValueOnce(error);

    await expect(checkMediaMime("http://127.0.0.1/audio.mp3")).rejects.toMatchObject({
      code: "SSRF_BLOCKED",
      message: "URL resolved to a private address: 127.0.0.1",
    });
  });

  it("propagates SSRF_BLOCKED for a DNS-rebind/private resolution target", async () => {
    const error = ssrfBlocked('"rebind.example.test" resolves to a private address (10.0.0.8)');
    mockFetchWithSsrfGuard.mockRejectedValueOnce(error);

    await expect(checkMediaMime("https://rebind.example.test/audio.mp3")).rejects.toMatchObject({
      code: "SSRF_BLOCKED",
    });
  });
});
