import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock @vercel/blob/client ─────────────────────────────────────────────────
//
// handleUpload orchestrates two phases:
//   1. token generation  → body.type === "blob.generate-client-token"
//   2. upload-completed  → body.type === "blob.upload-completed"
//
// We mock the module so tests never need BLOB_READ_WRITE_TOKEN.
// vi.mock is hoisted — variables referenced in the factory must use vi.hoisted().

const { mockHandleUpload } = vi.hoisted(() => ({
  mockHandleUpload: vi.fn(),
}));

vi.mock("@vercel/blob/client", () => ({
  handleUpload: mockHandleUpload,
}));

// ─── Import route AFTER mocks are established ─────────────────────────────────

import { POST } from "@/app/api/upload-audio/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/upload-audio", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-yentl-source-consent": "source-analysis-v1",
    },
    body: JSON.stringify(body),
  });
}

const GENERATE_TOKEN_BODY = {
  type: "blob.generate-client-token",
  payload: {
    pathname: "audio.mp3",
    callbackUrl: "https://example.com/api/upload-audio",
    clientPayload: null,
    multipart: false,
  },
};

const UPLOAD_COMPLETED_BODY = {
  type: "blob.upload-completed",
  blob: {
    url: "https://abc.public.blob.vercel-storage.com/audio-xyz.mp3",
    downloadUrl: "https://abc.public.blob.vercel-storage.com/audio-xyz.mp3",
    pathname: "audio-xyz.mp3",
    size: 7_400_000,
    uploadedAt: new Date().toISOString(),
    contentType: "audio/mpeg",
    contentDisposition: "inline",
  },
  tokenPayload: JSON.stringify({ pathname: "audio.mp3" }),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/upload-audio — token generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with the handleUpload response on success", async () => {
    const mockResponse = { type: "blob.generate-client-token", clientToken: "tok_abc" };
    mockHandleUpload.mockResolvedValue(mockResponse);

    const req = makeRequest(GENERATE_TOKEN_BODY);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockResponse);
  });

  it("passes body and request to handleUpload", async () => {
    mockHandleUpload.mockResolvedValue({ clientToken: "tok_xyz" });

    const req = makeRequest(GENERATE_TOKEN_BODY);
    await POST(req);

    expect(mockHandleUpload).toHaveBeenCalledOnce();
    const callArgs = mockHandleUpload.mock.calls[0][0];
    expect(callArgs).toHaveProperty("body");
    expect(callArgs).toHaveProperty("request");
    expect(callArgs).toHaveProperty("onBeforeGenerateToken");
    expect(callArgs).toHaveProperty("onUploadCompleted");
  });

  it("returns 400 when handleUpload throws", async () => {
    mockHandleUpload.mockRejectedValue(new Error("Invalid token"));

    const req = makeRequest(GENERATE_TOKEN_BODY);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid token/);
  });

  it("returns 400 for malformed JSON without calling handleUpload", async () => {
    const req = new Request("http://localhost/api/upload-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON body" });
    expect(mockHandleUpload).not.toHaveBeenCalled();
  });

  it("requires source analysis consent before generating an upload token", async () => {
    const req = new Request("http://localhost/api/upload-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(GENERATE_TOKEN_BODY),
    });
    const res = await POST(req);

    expect(res.status).toBe(428);
    expect(mockHandleUpload).not.toHaveBeenCalled();
  });
});

describe("POST /api/upload-audio — onBeforeGenerateToken validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onBeforeGenerateToken returns allowedContentTypes including audio and video media", async () => {
    let capturedToken: Awaited<ReturnType<Parameters<typeof mockHandleUpload>[0]["onBeforeGenerateToken"]>> | undefined;

    mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      capturedToken = await onBeforeGenerateToken("audio.mp3", null);
      return { clientToken: "tok_abc" };
    });

    const req = makeRequest(GENERATE_TOKEN_BODY);
    await POST(req);

    expect(capturedToken).toBeDefined();
    expect(capturedToken!.allowedContentTypes).toContain("audio/mpeg");
    expect(capturedToken!.allowedContentTypes).toContain("audio/wav");
    expect(capturedToken!.allowedContentTypes).toContain("audio/ogg");
    expect(capturedToken!.allowedContentTypes).toContain("audio/webm");
    expect(capturedToken!.allowedContentTypes).toContain("video/mp4");
    expect(capturedToken!.allowedContentTypes).toContain("video/quicktime");
    expect(capturedToken!.allowedContentTypes).toContain("video/webm");
  });

  it("onBeforeGenerateToken enforces maximumSizeInBytes of 500 MB", async () => {
    let capturedToken: Awaited<ReturnType<Parameters<typeof mockHandleUpload>[0]["onBeforeGenerateToken"]>> | undefined;

    mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      capturedToken = await onBeforeGenerateToken("audio.mp3", null);
      return { clientToken: "tok_abc" };
    });

    const req = makeRequest(GENERATE_TOKEN_BODY);
    await POST(req);

    expect(capturedToken!.maximumSizeInBytes).toBe(500 * 1024 * 1024);
  });

  it("onBeforeGenerateToken sets addRandomSuffix: true", async () => {
    let capturedToken: Awaited<ReturnType<Parameters<typeof mockHandleUpload>[0]["onBeforeGenerateToken"]>> | undefined;

    mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      capturedToken = await onBeforeGenerateToken("audio.mp3", null);
      return { clientToken: "tok_abc" };
    });

    const req = makeRequest(GENERATE_TOKEN_BODY);
    await POST(req);

    expect(capturedToken!.addRandomSuffix).toBe(true);
  });

  it("onBeforeGenerateToken stores consent in the token payload", async () => {
    let capturedToken: Awaited<ReturnType<Parameters<typeof mockHandleUpload>[0]["onBeforeGenerateToken"]>> | undefined;

    mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
      capturedToken = await onBeforeGenerateToken("audio.mp3", null);
      return { clientToken: "tok_abc" };
    });

    const req = makeRequest(GENERATE_TOKEN_BODY);
    await POST(req);

    expect(capturedToken!.tokenPayload).toBe(JSON.stringify({
      pathname: "audio.mp3",
      consent: "source-analysis-v1",
    }));
  });
});

describe("POST /api/upload-audio — onUploadCompleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("onUploadCompleted resolves without logging or throwing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockHandleUpload.mockImplementation(async ({ onUploadCompleted }) => {
      // Simulate Vercel calling the completed callback
      await onUploadCompleted({
        blob: UPLOAD_COMPLETED_BODY.blob as never,
        tokenPayload: UPLOAD_COMPLETED_BODY.tokenPayload,
      });
      return { ok: true };
    });

    const req = makeRequest(UPLOAD_COMPLETED_BODY);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
