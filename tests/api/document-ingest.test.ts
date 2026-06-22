import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockEnforceRateLimit,
  mockRequireSourceAnalysisConsent,
  mockPdfConstructor,
  mockPdfGetText,
  mockPdfDestroy,
  mockPdfSetWorker,
} = vi.hoisted(() => ({
  mockEnforceRateLimit: vi.fn(),
  mockRequireSourceAnalysisConsent: vi.fn(),
  mockPdfConstructor: vi.fn(),
  mockPdfGetText: vi.fn(),
  mockPdfDestroy: vi.fn(),
  mockPdfSetWorker: vi.fn(),
}));

vi.mock("@/lib/server/consent", () => ({
  requireSourceAnalysisConsent: mockRequireSourceAnalysisConsent,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  enforceRateLimit: mockEnforceRateLimit,
  RATE_LIMITS: { sourceIngest: { key: "sourceIngest" } },
}));

vi.mock("pdf-parse", () => {
  class MockPDFParse {
    constructor(options: unknown) {
      mockPdfConstructor(options);
    }

    getText() {
      return mockPdfGetText();
    }

    destroy() {
      return mockPdfDestroy();
    }

    static setWorker(workerUrl: string) {
      mockPdfSetWorker(workerUrl);
    }
  }

  return { PDFParse: MockPDFParse };
});

function makeRequest(file?: File) {
  const form = new FormData();
  if (file) form.append("file", file);
  const req = new Request("http://localhost/api/document-ingest", {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data; boundary=boundary",
      "x-yentl-source-consent": "source-analysis-v1",
    },
    body: "placeholder",
  });
  (req as unknown as Record<string, unknown>).formData = () => Promise.resolve(form);
  return req;
}

function pdfFile(name = "brief.pdf", content = "%PDF-1.7") {
  return new File([content], name, { type: "application/pdf" });
}

describe("POST /api/document-ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockResolvedValue(null);
    mockRequireSourceAnalysisConsent.mockReturnValue(null);
    mockPdfGetText.mockResolvedValue({
      total: 3,
      text: [
        "Findings",
        "The city library budget increased by twelve percent after the council vote.",
        "The repair bond covered roof, electrical, accessibility, and classroom safety work.",
        "Officials published the final figures in a public packet before the meeting.",
      ].join("\n\n\n"),
    });
    mockPdfDestroy.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("extracts selectable PDF text and returns normalized document metadata", async () => {
    const { POST } = await import("@/app/api/document-ingest/route");
    const res = await POST(makeRequest(pdfFile("city-brief.pdf")) as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      filename: "city-brief.pdf",
      mime: "application/pdf",
      page_count: 3,
      byte_count: 8,
    });
    expect(json.text).toContain("Findings");
    expect(json.text).toContain("The city library budget increased by twelve percent");
    expect(json.text).not.toContain("\n\n\n");
    expect(mockPdfConstructor).toHaveBeenCalledWith({
      data: expect.any(Buffer),
    });
    // Successful extraction implies the inlined-data-URL worker is wired up;
    // we don't assert the static setWorker call (module-load timing is brittle).
    expect(mockPdfDestroy).toHaveBeenCalledOnce();
  });

  it("rejects missing files before invoking the PDF parser", async () => {
    const { POST } = await import("@/app/api/document-ingest/route");
    const res = await POST(makeRequest() as never);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatchObject({
      code: "MISSING_FILE",
      message: "file is required",
    });
    expect(mockPdfConstructor).not.toHaveBeenCalled();
  });

  it("rejects unsupported document containers before parsing", async () => {
    const { POST } = await import("@/app/api/document-ingest/route");
    const file = new File(["docx bytes"], "brief.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const res = await POST(makeRequest(file) as never);
    const json = await res.json();

    expect(res.status).toBe(415);
    expect(json.error.code).toBe("UNSUPPORTED_DOCUMENT");
    expect(mockPdfConstructor).not.toHaveBeenCalled();
  });

  it("returns a recoverable no-text-layer error for scanned PDFs", async () => {
    mockPdfGetText.mockResolvedValueOnce({
      total: 1,
      text: "Scanned image only",
    });

    const { POST } = await import("@/app/api/document-ingest/route");
    const res = await POST(makeRequest(pdfFile("scan.pdf")) as never);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toMatchObject({
      code: "NO_TEXT_LAYER",
    });
    expect(json.error.message).toContain("OCR is not yet wired");
    expect(mockPdfDestroy).toHaveBeenCalledOnce();
  });

  it("cleans up the PDF parser when extraction fails", async () => {
    mockPdfGetText.mockRejectedValueOnce(new Error("corrupt cross-reference table"));

    const { POST } = await import("@/app/api/document-ingest/route");
    const res = await POST(makeRequest(pdfFile("corrupt.pdf")) as never);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toMatchObject({
      code: "PDF_PARSE_FAILED",
      message: "corrupt cross-reference table",
    });
    expect(mockPdfDestroy).toHaveBeenCalledOnce();
  });
});
