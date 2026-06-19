import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireSourceAnalysisConsent } from "@/lib/server/consent";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";
import { SOURCE_ANALYSIS_CONSENT_VALUE, hasSourceAnalysisConsent } from "@/lib/source-consent";

/**
 * Client-direct media-upload route for Vercel Blob.
 *
 * This route issues short-lived upload tokens to the browser so that the
 * client can POST audio/video files DIRECTLY to Vercel Blob — bypassing our
 * serverless function entirely. That sidesteps Vercel's 4.5 MB request-body
 * limit on Pro plans.
 *
 * Flow:
 *   1. Browser calls POST /api/upload-audio with { type: "blob.generate-client-token" }
 *   2. onBeforeGenerateToken validates the content-type and returns a token.
 *   3. Browser uploads file directly to Vercel Blob using the token.
 *   4. Vercel Blob calls POST /api/upload-audio with { type: "blob.upload-completed" }
 *   5. onUploadCompleted accepts the callback without a DB write.
 *   6. Browser receives the blob URL and calls /api/transcribe-batch with
 *      { blob_url, duration_sec } JSON — the existing JSON branch handles it.
 *
 * Env var required: BLOB_READ_WRITE_TOKEN
 *   - Set via Vercel dashboard → Storage → Create Blob Store (auto-creates token)
 *   - Pull locally: `vercel env pull`
 *
 * NOTE: onUploadCompleted is called by Vercel servers and does NOT fire in
 * local dev without an ngrok tunnel. That's fine — we don't need it to do
 * anything critical here; we rely on the browser passing the URL back.
 */

/** Max media upload size: 500 MB (matches /api/transcribe-batch cap). */
const MAX_SIZE_BYTES = 500 * 1024 * 1024;

/** All media MIME types accepted by Deepgram and validated in audio-ingest-pane. */
const ALLOWED_MEDIA_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  // Browsers sometimes report .mp3 as audio/mp3 instead of audio/mpeg
  "audio/mp3",
];

function clientPayloadFromBody(body: HandleUploadBody): string | null {
  if (
    body.type === "blob.generate-client-token" &&
    typeof body.payload.clientPayload === "string"
  ) {
    return body.payload.clientPayload;
  }
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const limited = await enforceRateLimit(request, RATE_LIMITS.uploadToken);
  if (limited) return limited;

  const body = (await request.json()) as HandleUploadBody;
  const clientPayload = clientPayloadFromBody(body);

  if (body.type === "blob.generate-client-token") {
    const consentError = requireSourceAnalysisConsent(request, clientPayload);
    if (consentError) return consentError;
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, payload) => {
        if (!hasSourceAnalysisConsent(request, payload)) {
          throw new Error("source analysis consent is required");
        }

        return {
          allowedContentTypes: ALLOWED_MEDIA_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
          addRandomSuffix: true,
          // Short cache — audio files are ephemeral (transcribed then deleted)
          cacheControlMaxAge: 3600,
          tokenPayload: JSON.stringify({
            pathname,
            consent: SOURCE_ANALYSIS_CONSENT_VALUE,
          }),
        };
      },
      onUploadCompleted: async () => {
        // Called by Vercel Blob servers when the client upload finishes.
        // The browser has already received the blob URL synchronously from
        // the upload() call, so this hook intentionally has no side effect.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
