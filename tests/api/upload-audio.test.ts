import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock @vercel/blob/client ─────────────────────────────────────────────────

const mockHandleUpload = vi.fn();

vi.mock("@vercel/blob/client", () => ({
  handleUpload: mockHandleUpload,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/upload-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const GENERATE_TOKEN_BODY = {
  type: "blob.generate-client-token",
  payload: {
    pathname: "audio.mp3",
    multipart: false,
    clientPayload: null,
  },
};

const UPLOAD_COMPLETED_BODY = {
  type: "blob.upload-completed",
  payload: {
    blob: {
      url: "https://blob.vercel-storage.com/audio-abc123.mp3",
      pathname: "audio-abc123.mp3",
      contentType: "audio/mpeg",
      contentDisposition: "attachment",
      downloadUrl: "https://blob.vercel-storage.com/audio-abc123.mp3?download=1",
    },
    tokenPayload: "{}",
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/upload-audio", () => {
  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-rw-token";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    vi.clearAllMocks();
  });

  it("returns 500 when BLOB_READ_WRITE_TOKEN is not set", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    const { POST } = await import("@/app/api/upload-audio/route");
    const req = makeRequest(GENERATE_TOKEN_BODY);
    const res = await POST(req as never);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/BLOB_READ_WRITE_TOKEN/);
  });

  it("calls handleUpload and returns its response for generate-client-token events", async () => {
    const expectedResponse = {
      type: "blob.generate-client-token",
      clientToken: "eyJ...",
    };
    mockHandleUpload.mockResolvedValue(expectedResponse);

    const { POST } = await import("@/app/api/upload-audio/route");
    const req = makeRequest(GENERATE_TOKEN_BODY);
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(expectedResponse);
    expect(mockHandleUpload).toHaveBeenCalledOnce();
  });

  it("calls handleUpload and returns its response for upload-completed events", async () => {
    const expectedResponse = { type: "blob.upload-completed", response: "ok" };
    mockHandleUpload.mockResolvedValue(expectedResponse);

    const { POST } = await import("@/app/api/upload-audio/route");
    const req = makeRequest(UPLOAD_COMPLETED_BODY);
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(expectedResponse);
  });

  it("passes allowed content types to handleUpload's onBeforeGenerateToken", async () => {
    mockHandleUpload.mockImplementation(async (opts: {
      onBeforeGenerateToken: (pathname: string, payload: null) => Promise<unknown>;
    }) => {
      // Simulate the SDK calling onBeforeGenerateToken
      const tokenConfig = await opts.onBeforeGenerateToken("audio.mp3", null);
      return { __tokenConfig: tokenConfig };
    });

    const { POST } = await import("@/app/api/upload-audio/route");
    const req = makeRequest(GENERATE_TOKEN_BODY);
    const res = await POST(req as never);
    const json = await res.json() as { __tokenConfig: { allowedContentTypes: string[]; maximumSizeInBytes: number } };

    expect(json.__tokenConfig.allowedContentTypes).toContain("audio/mpeg");
    expect(json.__tokenConfig.allowedContentTypes).toContain("audio/wav");
    expect(json.__tokenConfig.allowedContentTypes).toContain("audio/x-m4a");
    expect(json.__tokenConfig.maximumSizeInBytes).toBe(500 * 1024 * 1024);
  });

  it("returns 400 when handleUpload throws", async () => {
    mockHandleUpload.mockRejectedValue(new Error("Unauthorized content type"));

    const { POST } = await import("@/app/api/upload-audio/route");
    const req = makeRequest(GENERATE_TOKEN_BODY);
    const res = await POST(req as never);

    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/Unauthorized content type/);
  });
});
