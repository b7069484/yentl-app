import type { TranscriptSegment } from "@/lib/types";

// ─── Custom error class ────────────────────────────────────────────────────────

export type CaptionErrorCode =
  | "NO_CAPTIONS"
  | "PRIVATE" // PRIVATE — reserved for future detection of private/age-restricted videos; currently mapped to NETWORK_ERROR
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

// ─── Timedtext endpoint variants ──────────────────────────────────────────────

function captionUrls(videoId: string): string[] {
  return [
    `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`,
    `https://www.youtube.com/api/timedtext?lang=en-US&v=${videoId}`,
    `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&kind=asr`,
  ];
}

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
 * Fetches captions for a YouTube video using the timedtext endpoint.
 * Tries lang=en → lang=en-US → lang=en&kind=asr in sequence.
 *
 * @throws CaptionError({ code: "NO_CAPTIONS" }) when all tracks return empty
 * @throws CaptionError({ code: "NETWORK_ERROR" }) on fetch failure or non-2xx
 */
export async function fetchCaptions(videoId: string): Promise<TranscriptSegment[]> {
  const urls = captionUrls(videoId);

  let anyNonOk = false;

  for (const url of urls) {
    let response: Response;
    try {
      response = await fetch(url);
    } catch (e) {
      // Network-level failure (DNS, TCP, etc.) — try remaining variants
      anyNonOk = true;
      continue;
    }

    if (!response.ok) {
      // Non-2xx (e.g. 404) — fall through to the next variant
      anyNonOk = true;
      continue;
    }

    const xml = await response.text();
    const segments = parseCaptionsXml(xml);

    if (segments.length > 0) {
      return segments;
    }
    // Empty 200 transcript — try the next URL variant
  }

  // All variants exhausted — determine the best error to surface
  if (anyNonOk) {
    // At least one URL returned non-200 or network-failed; no variant had captions
    throw new CaptionError(
      "NETWORK_ERROR",
      `All timedtext endpoints failed or returned non-2xx for video ${videoId}.`,
    );
  }

  // All returned 200 but empty — no captions available
  throw new CaptionError(
    "NO_CAPTIONS",
    `No captions found for video ${videoId}. The video may not have captions enabled.`,
  );
}
