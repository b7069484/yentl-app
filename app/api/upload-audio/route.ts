import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

/**
 * Client-direct upload route for Vercel Blob.
 *
 * This route issues short-lived upload tokens to the browser so that the
 * client can POST audio files DIRECTLY to Vercel Blob — bypassing our
 * serverless function entirely. That sidesteps Vercel's 4.5 MB request-body
 * limit on Pro plans.
 *
 * Flow:
 *   1. Browser calls POST /api/upload-audio with { type: "blob.generate-client-token" }
 *   2. onBeforeGenerateToken validates the content-type and returns a token.
 *   3. Browser uploads file directly to Vercel Blob using the token.
 *   4. Vercel Blob calls POST /api/upload-audio with { type: "blob.upload-completed" }
 *   5. onUploadCompleted logs the completed upload (no DB write needed here).
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

/** Max audio upload size: 500 MB (matches /api/transcribe-batch cap). */
const MAX_SIZE_BYTES = 500 * 1024 * 1024;

/** All MIME types accepted by Deepgram and validated in audio-ingest-pane. */
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  // Browsers sometimes report .mp3 as audio/mp3 instead of audio/mpeg
  "audio/mp3",
];

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // No user auth layer in this app — all uploads are anonymous.
        // Restrict to audio types and enforce the 500 MB cap.
        return {
          allowedContentTypes: ALLOWED_AUDIO_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
          addRandomSuffix: true,
          // Short cache — audio files are ephemeral (transcribed then deleted)
          cacheControlMaxAge: 3600,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Called by Vercel Blob servers when the client upload finishes.
        // The browser has already received the blob URL synchronously from
        // the upload() call, so nothing to do here except log.
        console.log("upload-audio: blob upload completed", blob.url);
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
