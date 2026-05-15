import type { TranscriptSegment } from "@/lib/types";

// ─── Custom error class ────────────────────────────────────────────────────────

export type CaptionErrorCode =
  | "NO_CAPTIONS"
  | "PRIVATE"
  | "NETWORK_ERROR";

export class CaptionError extends Error {
  constructor(
    public readonly code: CaptionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CaptionError";
  }
}

// ─── URL parser ────────────────────────────────────────────────────────────────

/**
 * Extracts a YouTube video ID from any recognized YouTube URL variant.
 * Returns null if the URL is not a recognized YouTube URL.
 *
 * Supported:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://m.youtube.com/watch?v=VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 * Trailing query params (e.g. ?t=10) are ignored.
 */
export function parseYouTubeUrl(url: string): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const { hostname, pathname, searchParams } = parsed;

  // Normalize: strip www. and m. prefix
  const host = hostname.replace(/^(www\.|m\.)/, "");

  if (host === "youtu.be") {
    // https://youtu.be/VIDEO_ID
    const id = pathname.slice(1); // remove leading /
    return isValidVideoId(id) ? id : null;
  }

  if (host === "youtube.com") {
    // /watch?v=VIDEO_ID
    if (pathname === "/watch") {
      const id = searchParams.get("v");
      return id && isValidVideoId(id) ? id : null;
    }

    // /embed/VIDEO_ID  or  /shorts/VIDEO_ID
    const embedMatch = pathname.match(/^\/(embed|shorts)\/([^/?#]+)/);
    if (embedMatch) {
      const id = embedMatch[2];
      return isValidVideoId(id) ? id : null;
    }
  }

  return null;
}

/** YouTube video IDs are exactly 11 chars: letters, digits, -, _ */
function isValidVideoId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

// ─── Watch-page scrape helpers ────────────────────────────────────────────────

type CaptionTrack = {
  baseUrl: string;
  languageCode: string;
  kind?: string; // "asr" = auto-generated; absent = manual
  name?: { simpleText?: string } | { runs?: Array<{ text: string }> };
};

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Matches `var ytInitialPlayerResponse = {...};` in YouTube watch-page HTML.
 * The trailing `;` followed by `var` or `</script>` is a reliable terminator
 * that avoids over-capturing when other JS vars follow on the same line.
 */
const PLAYER_RESPONSE_RE =
  /var\s+ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\})\s*;\s*(?:var|<\/script>)/;

// ─── HTML entity decoder ───────────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeHtmlEntities(text: string): string {
  // Named entities first
  let result = text.replace(/&[a-zA-Z]+;/g, (m) => HTML_ENTITIES[m] ?? m);
  // Numeric entities: &#NNN; or &#xHHH;
  result = result.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16)),
  );
  return result;
}

// ─── XML parser ───────────────────────────────────────────────────────────────

/**
 * Parses a timedtext XML response body into TranscriptSegment[].
 * Returns an empty array if the transcript has no text nodes.
 *
 * Expected format:
 *   <transcript>
 *     <text start="0.5" dur="2.3">Caption text</text>
 *     ...
 *   </transcript>
 */
function parseCaptionsXml(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  // Match each <text ...>...</text> element, capturing the full attribute string
  // so we can extract start/dur in any order (real YouTube timedtext varies).
  const TEXT_TAG_RE = /<text\s+([^>]*)>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = TEXT_TAG_RE.exec(xml)) !== null) {
    const attrs = match[1];
    const rawText = match[2].trim();

    if (!rawText) continue;

    // Extract start (required) and dur (optional) order-independently
    const startMatch = /\bstart="([^"]*)"/.exec(attrs);
    const durMatch = /\bdur="([^"]*)"/.exec(attrs);

    const start = startMatch ? parseFloat(startMatch[1]) : NaN;
    if (!Number.isFinite(start) || start < 0) continue; // skip malformed

    const dur = durMatch ? parseFloat(durMatch[1]) : 0; // missing dur → 0

    const text = decodeHtmlEntities(rawText);
    segments.push({
      text,
      start,
      end: start + dur,
      is_final: true,
      speaker_id: 0,
    });
  }

  return segments;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetches captions for a YouTube video by scraping the watch page and
 * extracting captionTracks from ytInitialPlayerResponse. This is the robust
 * approach used by youtube-transcript libraries: the baseUrl in the track is
 * pre-authenticated and reliably returns the caption XML.
 *
 * Track preference order:
 *   1. Manual English (languageCode === "en", no kind)
 *   2. Manual en-region (languageCode starts with "en", no kind)
 *   3. Auto-generated English (languageCode === "en", kind === "asr")
 *   4. Auto-generated en-region (languageCode starts with "en", kind === "asr")
 *
 * @throws CaptionError({ code: "NO_CAPTIONS" }) when no English track found or XML is empty
 * @throws CaptionError({ code: "PRIVATE" }) when video is not playable (age-restricted, private, etc.)
 * @throws CaptionError({ code: "NETWORK_ERROR" }) on fetch failure or non-2xx
 */
export async function fetchCaptions(videoId: string): Promise<TranscriptSegment[]> {
  // 1. Fetch the watch page
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en`;
  let html: string;
  try {
    const res = await fetch(watchUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      throw new CaptionError(
        "NETWORK_ERROR",
        `Watch page returned ${res.status} for video ${videoId}`,
      );
    }
    html = await res.text();
  } catch (e) {
    if (e instanceof CaptionError) throw e;
    throw new CaptionError(
      "NETWORK_ERROR",
      `Watch page fetch failed: ${String(e)}`,
    );
  }

  // 2. Extract ytInitialPlayerResponse
  const match = PLAYER_RESPONSE_RE.exec(html);
  if (!match) {
    throw new CaptionError(
      "NETWORK_ERROR",
      `Could not locate ytInitialPlayerResponse in watch page for video ${videoId}`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let playerResponse: any;
  try {
    playerResponse = JSON.parse(match[1]);
  } catch {
    throw new CaptionError(
      "NETWORK_ERROR",
      `Failed to parse ytInitialPlayerResponse JSON for video ${videoId}`,
    );
  }

  // 3. Detect playability issues (private, age-restricted, unavailable)
  const status = playerResponse?.playabilityStatus?.status;
  if (status && status !== "OK") {
    const reason = playerResponse?.playabilityStatus?.reason ?? status;
    throw new CaptionError("PRIVATE", `Video not playable: ${reason}`);
  }

  // 4. Extract caption tracks
  const tracks: CaptionTrack[] =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  if (tracks.length === 0) {
    throw new CaptionError(
      "NO_CAPTIONS",
      `No caption tracks listed for video ${videoId}`,
    );
  }

  // 5. Pick the best English track
  const englishManual = tracks.find(
    (t) => t.languageCode === "en" && !t.kind,
  );
  const enRegionManual = tracks.find(
    (t) => t.languageCode.startsWith("en") && !t.kind,
  );
  const englishAsr = tracks.find(
    (t) => t.languageCode === "en" && t.kind === "asr",
  );
  const enRegionAsr = tracks.find(
    (t) => t.languageCode.startsWith("en") && t.kind === "asr",
  );

  const chosen = englishManual ?? enRegionManual ?? englishAsr ?? enRegionAsr;

  if (!chosen) {
    throw new CaptionError(
      "NO_CAPTIONS",
      `No English caption track found for video ${videoId}`,
    );
  }

  // 6. Fetch the caption XML from the pre-authenticated baseUrl
  let xml: string;
  try {
    const captionRes = await fetch(chosen.baseUrl, {
      headers: { "User-Agent": BROWSER_UA },
    });
    if (!captionRes.ok) {
      throw new CaptionError(
        "NETWORK_ERROR",
        `Caption track fetch returned ${captionRes.status} for video ${videoId}`,
      );
    }
    xml = await captionRes.text();
  } catch (e) {
    if (e instanceof CaptionError) throw e;
    throw new CaptionError(
      "NETWORK_ERROR",
      `Caption track fetch failed: ${String(e)}`,
    );
  }

  // 7. Parse and return
  const segments = parseCaptionsXml(xml);
  if (segments.length === 0) {
    throw new CaptionError(
      "NO_CAPTIONS",
      `Caption track was empty for video ${videoId}`,
    );
  }

  return segments;
}
