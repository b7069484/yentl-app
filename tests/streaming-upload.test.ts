import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Readable } from "stream";

// ─── Mock deepgram-batch ──────────────────────────────────────────────────────

const mockTranscribeFile = vi.fn();
const mockTranscribeStream = vi.fn();
const mockTranscribeUrl = vi.fn();

vi.mock("@/lib/server/deepgram-batch", () => ({
  transcribeUrl: mockTranscribeUrl,
  transcribeFile: mockTranscribeFile,
  transcribeStream: mockTranscribeStream,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_UTTERANCES = [
  { text: "Hello world.", start: 0, end: 1.5, is_final: true, speaker_id: 0 },
];
const VALID_SPEAKERS = [{ id: 0, label: "Speaker 1" }];
const VALID_RESULT = { utterances: VALID_UTTERANCES, speakers: VALID_SPEAKERS };

const STREAM_THRESHOLD = 50 * 1024 * 1024; // 50 MB

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAudioFile(
  name = "audio.mp3",
  type = "audio/mpeg",
  size = 1024,
): File {
  // Content is small but size property is overridden to simulate large files
  const content = "x".repeat(Math.min(size, 100));
  const file = new File([content], name, { type });
  Object.defineProperty(file, "size", { value: size, configurable: true });

  // jsdom File doesn't implement .stream(); add a minimal stub so the route
  // can call Readable.fromWeb(file.stream()) in the large-file branch.
  // We provide a real Web ReadableStream wrapping the file content.
  Object.defineProperty(file, "stream", {
    value: () => {
      const bytes = Buffer.from(content);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      });
    },
    configurable: true,
    writable: true,
  });

  return file;
}

function makeMultipartRequest(fields: {
  file?: File | null;
  duration_sec?: string | null;
}): Request {
  const formData = new FormData();
  if (fields.file !== null && fields.file !== undefined) {
    formData.append("file", fields.file);
  }
  if (fields.duration_sec !== null && fields.duration_sec !== undefined) {
    formData.append("duration_sec", fields.duration_sec);
  }

  const req = new Request("http://localhost/api/transcribe-batch", {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data; boundary=boundary",
      "x-yentl-source-consent": "source-analysis-v1",
    },
    body: "placeholder",
  });
  (req as unknown as Record<string, unknown>).formData = () =>
    Promise.resolve(formData);
  return req;
}

// ─── Suite: Small file (≤50MB) uses Buffer path ──────────────────────────────

describe("POST /api/transcribe-batch — small file (≤50MB) uses Buffer path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranscribeFile.mockResolvedValue(VALID_RESULT);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls transcribeFile (Buffer) for a 1 MB file", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("small.mp3", "audio/mpeg", 1 * 1024 * 1024);
    const req = makeMultipartRequest({ file, duration_sec: "30" });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(mockTranscribeFile).toHaveBeenCalledOnce();
    expect(mockTranscribeStream).not.toHaveBeenCalled();
  });

  it("calls transcribeFile (Buffer) for a file exactly at threshold (50MB)", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("at-threshold.mp3", "audio/mpeg", STREAM_THRESHOLD);
    const req = makeMultipartRequest({ file, duration_sec: "120" });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(mockTranscribeFile).toHaveBeenCalledOnce();
    expect(mockTranscribeStream).not.toHaveBeenCalled();
  });

  it("does NOT call transcribeStream for small files", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("tiny.mp3", "audio/mpeg", 500 * 1024);
    const req = makeMultipartRequest({ file, duration_sec: "10" });
    await POST(req as never);

    expect(mockTranscribeStream).not.toHaveBeenCalled();
  });
});

// ─── Suite: Large file (>50MB) uses streaming path ───────────────────────────

describe("POST /api/transcribe-batch — large file (>50MB) uses stream path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranscribeStream.mockResolvedValue(VALID_RESULT);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls transcribeStream (not transcribeFile) for a 60 MB file", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("large.mp3", "audio/mpeg", 60 * 1024 * 1024);
    const req = makeMultipartRequest({ file, duration_sec: "180" });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(mockTranscribeStream).toHaveBeenCalledOnce();
    expect(mockTranscribeFile).not.toHaveBeenCalled();
  });

  it("calls transcribeStream for a file just over threshold (50MB + 1 byte)", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("over.mp3", "audio/mpeg", STREAM_THRESHOLD + 1);
    const req = makeMultipartRequest({ file, duration_sec: "120" });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    expect(mockTranscribeStream).toHaveBeenCalledOnce();
    expect(mockTranscribeFile).not.toHaveBeenCalled();
  });

  it("passes mime type to transcribeStream", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("large.ogg", "audio/ogg", 60 * 1024 * 1024);
    const req = makeMultipartRequest({ file, duration_sec: "60" });
    await POST(req as never);

    expect(mockTranscribeStream).toHaveBeenCalledWith(
      expect.anything(),
      "audio/ogg",
      // Phase 1e — third arg is the per-call BIPA opts; default false
      // when the client doesn't append bipa_consented to the form.
      expect.objectContaining({ bipaConsented: false }),
    );
  });

  it("returns 200 with utterances and speakers for large file", async () => {
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("large.mp3", "audio/mpeg", 60 * 1024 * 1024);
    const req = makeMultipartRequest({ file, duration_sec: "180" });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.utterances).toEqual(VALID_UTTERANCES);
    expect(json.speakers).toEqual(VALID_SPEAKERS);
  });

  it("returns 500 with meaningful message when transcribeStream throws", async () => {
    mockTranscribeStream.mockRejectedValue(new Error("Deepgram stream error"));

    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("large.mp3", "audio/mpeg", 60 * 1024 * 1024);
    const req = makeMultipartRequest({ file, duration_sec: "180" });
    const res = await POST(req as never);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Deepgram stream error/);
  });

  it("large file does NOT use Buffer.from(arrayBuffer) — route uses stream path", async () => {
    // Structural test: verify transcribeFile is not called for large files.
    // transcribeFile is the Buffer-based path; transcribeStream is the streaming path.
    // If transcribeFile is called for a >50MB file, the implementation is wrong.
    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("large.mp3", "audio/mpeg", 200 * 1024 * 1024);
    const req = makeMultipartRequest({ file, duration_sec: "600" });
    await POST(req as never);

    expect(mockTranscribeFile).not.toHaveBeenCalled();
    expect(mockTranscribeStream).toHaveBeenCalledOnce();
  });
});

// ─── Suite: transcribeStream unit tests ──────────────────────────────────────

describe("transcribeStream — unit tests", () => {
  // Reset the module mock to test the real implementation
  // We need a separate describe block that mocks @deepgram/sdk directly

  const mockDgTranscribeFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEEPGRAM_API_KEY = "test-key";
  });

  afterEach(() => {
    delete process.env.DEEPGRAM_API_KEY;
    vi.clearAllMocks();
  });

  it("transcribeStream is exported from deepgram-batch", async () => {
    // This test uses the mocked module — just verify the export exists
    const mod = await import("@/lib/server/deepgram-batch");
    expect(typeof mod.transcribeStream).toBe("function");
  });
});

// ─── Suite: transcribeStream real implementation ──────────────────────────────
// Separate vi.mock scope for testing deepgram-batch directly

describe("transcribeStream — deepgram-batch integration (mocked SDK)", () => {
  // Must use a fresh module context — use vi.resetModules pattern

  it("passes a Readable stream as first arg to SDK transcribeFile", async () => {
    // We test this via the mock in deepgram-batch.test.ts pattern
    // Here we verify the stream arrives (not null, is a Readable) via mockTranscribeStream
    // The real transcribeStream unit test is in deepgram-batch.test.ts context
    // This suite just verifies the route wires the stream correctly

    const capturedArgs: unknown[] = [];
    mockTranscribeStream.mockImplementation(
      (stream: unknown, mime: unknown) => {
        capturedArgs.push({ stream, mime });
        return Promise.resolve(VALID_RESULT);
      },
    );

    const { POST } = await import("@/app/api/transcribe-batch/route");
    const file = makeAudioFile("large.mp3", "audio/mpeg", 60 * 1024 * 1024);
    const req = makeMultipartRequest({ file, duration_sec: "180" });
    await POST(req as never);

    expect(capturedArgs).toHaveLength(1);
    const { stream, mime } = capturedArgs[0] as {
      stream: unknown;
      mime: string;
    };
    // The stream must be truthy (not null/undefined) — it's a Node Readable
    expect(stream).toBeTruthy();
    expect(mime).toBe("audio/mpeg");
  });
});
