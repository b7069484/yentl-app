import { NextResponse } from "next/server";
import { requireSourceAnalysisConsent } from "@/lib/server/consent";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
// pdf-parse is loaded lazily INSIDE the handler try/catch (below) so module-load
// failures surface as JSON instead of Vercel's opaque /500 page. The worker
// source is an inlined data URL: no file, no chunk, no path dependency on
// Vercel's serverless bundle.
type PDFParseModule = typeof import("pdf-parse");
type PDFParseInstance = InstanceType<PDFParseModule["PDFParse"]>;

let pdfParseClass: PDFParseModule["PDFParse"] | null = null;
let pdfWorkerReady = false;
type DocumentIngestResponse =
  | { filename: string; mime: string; text: string; page_count?: number; byte_count: number }
  | { error: { code: string; message: string } };

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } } satisfies DocumentIngestResponse, { status });
}

export async function POST(req: Request): Promise<NextResponse<DocumentIngestResponse>> {
  const limited = await enforceRateLimit(req, RATE_LIMITS.sourceIngest);
  if (limited) return limited as NextResponse<DocumentIngestResponse>;

  const consentError = requireSourceAnalysisConsent(req);
  if (consentError) return consentError as NextResponse<DocumentIngestResponse>;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError("INVALID_FORM", "Could not read the uploaded document.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("MISSING_FILE", "file is required", 400);
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return jsonError("FILE_TOO_LARGE", "Documents must be 25 MB or smaller.", 413);
  }

  const filename = file.name || "document";
  const mime = file.type || mimeFromName(filename);
  if (mime !== "application/pdf" && !filename.toLowerCase().endsWith(".pdf")) {
    return jsonError("UNSUPPORTED_DOCUMENT", "Only PDF document extraction is handled by this endpoint.", 415);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let parser: PDFParseInstance | null = null;
  try {
    const PDFParse = await loadPdfParse();
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = normalizeExtractedText(result.text ?? "");
    if (text.split(/\s+/).filter(Boolean).length < 20) {
      return jsonError(
        "NO_TEXT_LAYER",
        "This PDF does not expose enough selectable text for direct import. OCR is not yet wired in this build; use Chrome capture, paste text, or upload audio/video if available.",
        422,
      );
    }
    return NextResponse.json({
      filename,
      mime: "application/pdf",
      text,
      page_count: result.total,
      byte_count: file.size,
    });
  } catch (error) {
    console.error("document-ingest: PDF parse failed", error instanceof Error ? error.message : error);
    return jsonError(
      "PDF_PARSE_FAILED",
      error instanceof Error ? error.message : "Could not extract text from this PDF.",
      500,
    );
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

async function loadPdfParse() {
  installPdfJsNodeFallbacks();

  if (!pdfParseClass) {
    const mod = await import("pdf-parse");
    pdfParseClass = mod.PDFParse;
  }

  if (!pdfWorkerReady) {
    const { PDF_WORKER_DATA_URL } = await import("@/lib/server/pdf-worker-data-url");
    pdfParseClass.setWorker(PDF_WORKER_DATA_URL);
    pdfWorkerReady = true;
  }

  return pdfParseClass;
}

function installPdfJsNodeFallbacks() {
  const globalScope = globalThis as Record<string, unknown>;

  // Vercel's Node runtime does not expose DOMMatrix, and pdfjs-dist constructs
  // one at import time. Text extraction does not render to canvas, so this small
  // 2D matrix fallback is enough to let the parser load without bundling a
  // native canvas dependency into the function.
  globalScope.DOMMatrix ??= MinimalDOMMatrix;
  globalScope.ImageData ??= MinimalImageData;
  globalScope.Path2D ??= MinimalPath2D;
}

type MatrixLike = {
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  e?: number;
  f?: number;
};

class MinimalDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: string | number[] | MatrixLike) {
    if (Array.isArray(init)) {
      this.applyArray(init);
      return;
    }

    if (init && typeof init === "object") {
      this.a = Number(init.a ?? 1);
      this.b = Number(init.b ?? 0);
      this.c = Number(init.c ?? 0);
      this.d = Number(init.d ?? 1);
      this.e = Number(init.e ?? 0);
      this.f = Number(init.f ?? 0);
    }
  }

  get is2D() {
    return true;
  }

  get isIdentity() {
    return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0;
  }

  get m11() {
    return this.a;
  }

  set m11(value: number) {
    this.a = value;
  }

  get m12() {
    return this.b;
  }

  set m12(value: number) {
    this.b = value;
  }

  get m13() {
    return 0;
  }

  get m14() {
    return 0;
  }

  get m21() {
    return this.c;
  }

  set m21(value: number) {
    this.c = value;
  }

  get m22() {
    return this.d;
  }

  set m22(value: number) {
    this.d = value;
  }

  get m23() {
    return 0;
  }

  get m24() {
    return 0;
  }

  get m31() {
    return 0;
  }

  get m32() {
    return 0;
  }

  get m33() {
    return 1;
  }

  get m34() {
    return 0;
  }

  get m41() {
    return this.e;
  }

  set m41(value: number) {
    this.e = value;
  }

  get m42() {
    return this.f;
  }

  set m42(value: number) {
    this.f = value;
  }

  get m43() {
    return 0;
  }

  get m44() {
    return 1;
  }

  multiplySelf(other?: MinimalDOMMatrix | MatrixLike) {
    if (!other) return this;
    const next = new MinimalDOMMatrix(other);
    const a = this.a * next.a + this.c * next.b;
    const b = this.b * next.a + this.d * next.b;
    const c = this.a * next.c + this.c * next.d;
    const d = this.b * next.c + this.d * next.d;
    const e = this.a * next.e + this.c * next.f + this.e;
    const f = this.b * next.e + this.d * next.f + this.f;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    return this;
  }

  preMultiplySelf(other?: MinimalDOMMatrix | MatrixLike) {
    if (!other) return this;
    const next = new MinimalDOMMatrix(other);
    return this.applyArray([
      next.a * this.a + next.c * this.b,
      next.b * this.a + next.d * this.b,
      next.a * this.c + next.c * this.d,
      next.b * this.c + next.d * this.d,
      next.a * this.e + next.c * this.f + next.e,
      next.b * this.e + next.d * this.f + next.f,
    ]);
  }

  translate(tx = 0, ty = 0) {
    return new MinimalDOMMatrix(this).translateSelf(tx, ty);
  }

  translateSelf(tx = 0, ty = 0) {
    return this.multiplySelf(new MinimalDOMMatrix([1, 0, 0, 1, tx, ty]));
  }

  scale(scaleX = 1, scaleY = scaleX) {
    return new MinimalDOMMatrix(this).scaleSelf(scaleX, scaleY);
  }

  scaleSelf(scaleX = 1, scaleY = scaleX) {
    return this.multiplySelf(new MinimalDOMMatrix([scaleX, 0, 0, scaleY, 0, 0]));
  }

  invertSelf() {
    const determinant = this.a * this.d - this.b * this.c;
    if (determinant === 0) {
      this.a = Number.NaN;
      this.b = Number.NaN;
      this.c = Number.NaN;
      this.d = Number.NaN;
      this.e = Number.NaN;
      this.f = Number.NaN;
      return this;
    }

    const a = this.d / determinant;
    const b = -this.b / determinant;
    const c = -this.c / determinant;
    const d = this.a / determinant;
    const e = (this.c * this.f - this.d * this.e) / determinant;
    const f = (this.b * this.e - this.a * this.f) / determinant;
    return this.applyArray([a, b, c, d, e, f]);
  }

  private applyArray(values: number[]) {
    if (values.length >= 16) {
      this.a = Number(values[0]);
      this.b = Number(values[1]);
      this.c = Number(values[4]);
      this.d = Number(values[5]);
      this.e = Number(values[12]);
      this.f = Number(values[13]);
      return this;
    }

    if (values.length >= 6) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = values.slice(0, 6).map(Number);
    }
    return this;
  }
}

class MinimalImageData {
  data: Uint8ClampedArray;
  colorSpace: PredefinedColorSpace = "srgb";

  constructor(dataOrWidth: Uint8ClampedArray | number, width?: number, height?: number) {
    if (typeof dataOrWidth === "number") {
      this.width = dataOrWidth;
      this.height = width ?? 0;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
      return;
    }

    this.data = dataOrWidth;
    this.width = width ?? 0;
    this.height = height ?? 0;
  }

  width: number;
  height: number;
}

class MinimalPath2D {
  addPath() {
    return undefined;
  }
}

function mimeFromName(filename: string) {
  return filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "";
}

function normalizeExtractedText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
