import { NextRequest, NextResponse } from "next/server";
import { parseYouTubeUrl } from "@/lib/server/youtube-captions";
import { fetchOEmbed } from "@/lib/server/youtube-oembed";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await enforceRateLimit(req, RATE_LIMITS.preview);
  if (limited) return limited;

  const url = req.nextUrl.searchParams.get("url")?.trim() ?? "";
  const videoId = parseYouTubeUrl(url);

  if (!url || !videoId) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_URL",
          message: "Paste a watch, shorts, embed, or youtu.be link.",
        },
      },
      { status: 400 },
    );
  }

  const oembed = await fetchOEmbed(url).catch(() => null);
  const fallbackThumbnail = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;

  return NextResponse.json({
    video_id: videoId,
    url,
    title: oembed?.title ?? null,
    channel: oembed?.author_name ?? null,
    thumbnail_url: oembed?.thumbnail_url ?? fallbackThumbnail,
    thumbnail_source: oembed?.thumbnail_url ? "youtube-oembed" : "youtube-static",
    caption_precheck: "checked-on-fetch",
  });
}
