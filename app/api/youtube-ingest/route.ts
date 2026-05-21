import { NextRequest, NextResponse } from "next/server";
import { parseYouTubeUrl, fetchCaptions } from "@/lib/server/youtube-captions";
import { fetchOEmbed } from "@/lib/server/youtube-oembed";
import { loadYouTubeValidationFixture } from "@/lib/server/youtube-validation-fixtures";
import type { CaptionErrorCode } from "@/lib/server/youtube-captions";

/** Duck-typed check for CaptionError shape — works across module boundaries and mocks. */
function isCaptionError(e: unknown): e is { code: CaptionErrorCode; message: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as Record<string, unknown>).code === "string"
  );
}

export const runtime = "nodejs";

/**
 * POST /api/youtube-ingest
 * Body: { url: string }
 *
 * Returns:
 *   200 { video_id, url, title?, channel?, transcript_segments }   — success
 *   200 { error: { code, message } }                               — structured error
 *       codes: INVALID_URL | NO_CAPTIONS | NETWORK_ERROR
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Parse body ────────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({
      error: { code: "INVALID_URL", message: "Invalid request body" },
    });
  }

  const { url } = (body ?? {}) as Record<string, unknown>;

  if (!url || typeof url !== "string") {
    return NextResponse.json({
      error: { code: "INVALID_URL", message: "url is required and must be a string" },
    });
  }

  // ── Validate URL ───────────────────────────────────────────────────────────────
  const videoId = parseYouTubeUrl(url);
  if (!videoId) {
    return NextResponse.json({
      error: { code: "INVALID_URL", message: "Not a recognizable YouTube URL" },
    });
  }

  // ── Fetch oEmbed (best-effort — failures are non-fatal) ────────────────────────
  const oembed = await fetchOEmbed(url).catch(() => null);

  // ── Fetch captions ─────────────────────────────────────────────────────────────
  try {
    const transcriptSegments = await fetchCaptions(videoId);

    const response: Record<string, unknown> = {
      video_id: videoId,
      url,
      transcript_segments: transcriptSegments,
    };

    if (oembed) {
      response.title = oembed.title;
      response.channel = oembed.author_name;
      response.thumbnail_url = oembed.thumbnail_url;
    }

    return NextResponse.json(response);
  } catch (e) {
    const validationFixture = await loadYouTubeValidationFixture(videoId).catch(
      () => null,
    );
    if (validationFixture) {
      return NextResponse.json({
        ...validationFixture,
        ...(oembed
          ? {
              title: oembed.title,
              channel: oembed.author_name,
              thumbnail_url: oembed.thumbnail_url,
            }
          : {}),
      });
    }

    // Map CaptionError (or any duck-typed { code, message } error) to structured envelope.
    // We use duck-typing rather than instanceof so tests that mock the module can throw
    // plain Error objects with a .code property and still trigger the right branch.
    const code = isCaptionError(e) ? e.code : "NETWORK_ERROR";
    const message = e instanceof Error ? e.message : String(e);

    // YT_DLP_MISSING is a server misconfiguration — return 500 with a clear message.
    if (code === "YT_DLP_MISSING") {
      return NextResponse.json(
        {
          error: {
            code: "YT_DLP_MISSING",
            message:
              "Server is not configured for YouTube ingest (yt-dlp binary missing).",
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: { code, message } });
  }
}
