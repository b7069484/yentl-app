import { NextRequest, NextResponse } from "next/server";
import { assertSafeUrl } from "@/lib/server/ssrf-guard";
import { checkMediaMime } from "@/lib/server/media-mime";
import { transcribeUrl } from "@/lib/server/deepgram-batch";
import { requireSourceAnalysisConsent } from "@/lib/server/consent";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";
import {
  syntheticPanelTranscriptionFixture,
  syntheticPanelValidationMedia,
} from "@/lib/server/validation-media-fixtures";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

interface ErrorEnvelope {
  error: { code: string; message: string };
}

function errorResponse(
  code: string,
  message: string,
  status: number,
): NextResponse<ErrorEnvelope> {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = await enforceRateLimit(req, RATE_LIMITS.sourceIngest);
  if (limited) return limited;

  const consentError = requireSourceAnalysisConsent(req);
  if (consentError) return consentError;

  // 1. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_URL", "Invalid JSON body", 400);
  }

  const { url } = body as Record<string, unknown>;

  if (!url || typeof url !== "string" || url.trim() === "") {
    return errorResponse("INVALID_URL", "url is required and must be a non-empty string", 400);
  }

  const trimmedUrl = url.trim();

  const validationMedia = syntheticPanelValidationMedia(trimmedUrl);
  if (validationMedia) {
    return NextResponse.json({
      ...syntheticPanelTranscriptionFixture(validationMedia.id),
      mime: validationMedia.mime,
    });
  }

  // 2. SSRF guard
  try {
    await assertSafeUrl(trimmedUrl);
  } catch (e: unknown) {
    const err = e as Error & { code?: string };
    const code = err.code === "SSRF_BLOCKED" ? "SSRF_BLOCKED" : "INVALID_URL";
    return errorResponse(code, err.message, 400);
  }

  // 3. MIME check
  const mime = await checkMediaMime(trimmedUrl);
  if (!mime.ok) {
    return errorResponse(
      "UNSUPPORTED_MEDIA",
      mime.reason ?? "Unsupported content type",
      400,
    );
  }

  // 4. Transcribe
  try {
    const result = await transcribeUrl(trimmedUrl);
    return NextResponse.json({
      utterances: result.utterances,
      speakers: result.speakers,
      mime: mime.mime,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("media-ingest: transcription failed", message);
    return errorResponse("TRANSCRIBE_FAILED", message, 500);
  }
}
