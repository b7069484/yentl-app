const FETCH_TIMEOUT_MS = 5_000;

const ALLOWED_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "m4a",
  "mp4",
  "ogg",
  "webm",
  "opus",
  "flac",
]);

/** Audio MIME prefix for extension-based fallback. */
const AUDIO_EXT_MIMES: Record<string, string> = {
  mp3: "audio/mp3",
  wav: "audio/wav",
  m4a: "audio/m4a",
  mp4: "video/mp4",
  ogg: "audio/ogg",
  webm: "audio/webm",
  opus: "audio/opus",
  flac: "audio/flac",
};

export interface MimeCheckResult {
  ok: boolean;
  mime?: string;
  reason?: string;
}

/**
 * Performs a HEAD request against `url` and determines whether it points to
 * audio or video content.
 *
 * Resolution order:
 * 1. `Content-Type` starts with `audio/` or `video/` → accept
 * 2. `Content-Type` is `application/octet-stream` or absent → fall back to URL path extension
 *    - If extension is in the allow-list → accept with a best-effort MIME
 *    - Otherwise → reject
 * 3. Any other MIME type → reject
 *
 * Returns `{ ok: true, mime }` or `{ ok: false, reason }`.
 */
export async function checkMediaMime(url: string): Promise<MimeCheckResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e: unknown) {
    if ((e as Error).name === "AbortError" || (e as Error).name === "TimeoutError") {
      return { ok: false, reason: "Timeout" };
    }
    return { ok: false, reason: "Network error" };
  }

  if (!response.ok) {
    return { ok: false, reason: "URL not reachable" };
  }

  const contentType = (response.headers.get("Content-Type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  // Direct audio or video MIME
  if (contentType.startsWith("audio/") || contentType.startsWith("video/")) {
    return { ok: true, mime: contentType };
  }

  // Fallback for opaque content types — check URL extension
  if (contentType === "application/octet-stream" || contentType === "") {
    const ext = extractExtension(url);
    if (ext && ALLOWED_EXTENSIONS.has(ext)) {
      return { ok: true, mime: AUDIO_EXT_MIMES[ext] ?? `audio/${ext}` };
    }
    return { ok: false, reason: "Unsupported content type" };
  }

  return { ok: false, reason: "Unsupported content type" };
}

/** Extracts the lowercase file extension from a URL path (without the dot). */
function extractExtension(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const filename = pathname.split("/").pop() ?? "";
    const dot = filename.lastIndexOf(".");
    if (dot === -1) return null;
    return filename.slice(dot + 1).toLowerCase();
  } catch {
    return null;
  }
}
