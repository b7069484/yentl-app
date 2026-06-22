import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { requireSourceAnalysisConsent } from "@/lib/server/consent";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";
import { PDF_WORKER_DATA_URL } from "@/lib/server/pdf-worker-data-url";

export const runtime = "nodejs";
export const maxDuration = 60;

// Configure the pdf-parse worker ONCE from an inlined data URL (no runtime file
// read, no dynamic worker chunk). This is what lets document-ingest survive
// Vercel's serverless bundle, where both the file-read data URL and the
// fake-worker fallback fail to locate pdf.worker.mjs.
PDFParse.setWorker(PDF_WORKER_DATA_URL);

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
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
  let parser: InstanceType<typeof PDFParse> | null = null;
  try {
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
