import { join } from "node:path";
import { spawn, mkdtemp, readFile, rm, tmpdir, getYtDlpBinaryPath } from "./yt-dlp-runner";
import type { TranscriptSegment } from "@/lib/types";

// ─── Custom error class ────────────────────────────────────────────────────────

export type CaptionErrorCode =
  | "NO_CAPTIONS"
  | "PRIVATE" // age-restricted / login-required / region-locked
  | "NETWORK_ERROR"
  | "YT_DLP_MISSING"; // yt-dlp binary not on PATH

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
export function isValidVideoId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}

// ─── HTML entity decoder (kept for parseCaptionsXml) ──────────────────────────

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

// ─── XML parser (kept for reference; no longer called from fetchCaptions) ─────

/**
 * Parses a timedtext XML response body into TranscriptSegment[].
 * Returns an empty array if the transcript has no text nodes.
 *
 * Expected format:
 *   <transcript>
 *     <text start="0.5" dur="2.3">Caption text</text>
 *     ...
 *   </transcript>
 *
 * @deprecated No longer called from fetchCaptions (now uses yt-dlp + SRT).
 * Kept here as a reference and for tests that may exercise it directly.
 */
export function parseCaptionsXml(xml: string): TranscriptSegment[] {
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

// ─── SRT parser ───────────────────────────────────────────────────────────────

/**
 * Parses an SRT subtitle file into TranscriptSegment[].
 *
 * SRT format:
 *   1
 *   00:00:00,570 --> 00:00:19,310
 *   [Music]
 *
 *   2
 *   00:00:19,320 --> 00:00:22,990
 *   the uh uniform code of military
 *
 * yt-dlp's SRT output for auto-generated captions often produces overlapping/duplicate
 * segments (a "carousel" effect — same text appearing in 2-3 consecutive segments with
 * slightly shifted timing). These are deduped: consecutive segments with identical text
 * are collapsed into one segment with extended end.
 */
export function parseSrt(srt: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  // Normalize line endings
  const normalized = srt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Each block is separated by a blank line
  const blocks = normalized.split(/\n\s*\n/).filter((b) => b.trim().length > 0);

  for (const block of blocks) {
    const lines = block.split("\n");
    // First line: index number (we ignore it)
    // Second line: timestamps
    // Remaining lines: caption text
    if (lines.length < 3) continue;

    const timeline = lines[1];
    const match =
      /^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/.exec(
        timeline,
      );
    if (!match) continue;

    const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = match;
    const start =
      parseInt(h1) * 3600 +
      parseInt(m1) * 60 +
      parseInt(s1) +
      parseInt(ms1) / 1000;
    const end =
      parseInt(h2) * 3600 +
      parseInt(m2) * 60 +
      parseInt(s2) +
      parseInt(ms2) / 1000;

    if (end < start) continue;

    // Join remaining lines, strip <c>, <c.colorXX> tags but keep cue markers like [Music]
    let text = lines.slice(2).join(" ").trim();
    text = text.replace(/<[^>]+>/g, ""); // strip <c>, <c.color>, etc.
    text = text.replace(/\s+/g, " "); // collapse whitespace

    if (!text) continue;

    segments.push({
      text,
      start,
      end,
      is_final: true,
      speaker_id: 0,
    });
  }

  // Dedupe: collapse consecutive segments with identical text by extending the
  // first one's end to cover them all (yt-dlp carousel effect).
  const deduped: TranscriptSegment[] = [];
  for (const seg of segments) {
    const last = deduped[deduped.length - 1];
    if (last && last.text === seg.text) {
      last.end = Math.max(last.end, seg.end);
    } else {
      deduped.push(seg);
    }
  }

  return deduped;
}

// ─── yt-dlp runner ────────────────────────────────────────────────────────────

const YT_DLP_TIMEOUT_MS = 60_000;

function spawnYtDlp(
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(getYtDlpBinaryPath(), args);
    } catch (err) {
      // spawn() itself throws synchronously if the binary is missing on some platforms
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        reject(
          new CaptionError("YT_DLP_MISSING", "yt-dlp is not installed on the server"),
        );
      } else {
        reject(
          new CaptionError(
            "NETWORK_ERROR",
            `yt-dlp spawn failed: ${(err as Error).message}`,
          ),
        );
      }
      return;
    }

    let stdout = "";
    let stderr = "";
    let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      timer = null;
      proc.kill("SIGKILL");
      reject(new CaptionError("NETWORK_ERROR", "yt-dlp timed out after 60s"));
    }, YT_DLP_TIMEOUT_MS);

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk;
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk;
    });

    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (err.code === "ENOENT") {
        reject(
          new CaptionError("YT_DLP_MISSING", "yt-dlp is not installed on the server"),
        );
      } else {
        reject(
          new CaptionError("NETWORK_ERROR", `yt-dlp spawn failed: ${err.message}`),
        );
      }
    });

    proc.on("close", (exitCode: number | null) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      resolve({ exitCode: exitCode ?? -1, stdout, stderr });
    });
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetches captions for a YouTube video using yt-dlp.
 *
 * yt-dlp is spawned with --write-auto-sub --write-sub --sub-lang en
 * --skip-download --convert-subs srt, writing output to a temp directory.
 * The resulting SRT is parsed and returned as TranscriptSegment[].
 *
 * Requires yt-dlp on the server PATH (locally: brew install yt-dlp).
 *
 * @throws CaptionError({ code: "NO_CAPTIONS" }) when no English captions available
 * @throws CaptionError({ code: "PRIVATE" }) when video is private, age-restricted, or unavailable
 * @throws CaptionError({ code: "NETWORK_ERROR" }) on spawn failure or timeout
 * @throws CaptionError({ code: "YT_DLP_MISSING" }) when yt-dlp binary is not on PATH
 */
export async function fetchCaptions(videoId: string): Promise<TranscriptSegment[]> {
  const tmpDir = await mkdtemp(join(tmpdir(), "yentl-yt-"));
  try {
    const outPattern = join(tmpDir, "captions.%(ext)s");
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const args = [
      "--write-auto-sub", // include auto-generated as fallback
      "--write-sub", // prefer manual
      "--sub-lang",
      "en",
      "--skip-download",
      "--convert-subs",
      "srt",
      "--no-warnings",
      "-o",
      outPattern,
      videoUrl,
    ];

    const result = await spawnYtDlp(args);

    if (result.exitCode !== 0) {
      // Categorize known yt-dlp errors via stderr matching
      const stderr = result.stderr.toLowerCase();
      if (stderr.includes("private video") || stderr.includes("sign in") || stderr.includes("login required")) {
        throw new CaptionError("PRIVATE", "Video is private or login-required");
      }
      if (stderr.includes("age-restricted") || stderr.includes("age restricted")) {
        throw new CaptionError("PRIVATE", "Video is age-restricted");
      }
      if (
        stderr.includes("unavailable") ||
        stderr.includes("not available")
      ) {
        throw new CaptionError("PRIVATE", "Video is unavailable");
      }
      throw new CaptionError(
        "NETWORK_ERROR",
        `yt-dlp exited ${result.exitCode}: ${result.stderr.slice(0, 200)}`,
      );
    }

    // Read the SRT file (yt-dlp writes captions.en.srt)
    const srtPath = join(tmpDir, "captions.en.srt");
    let srtContent: string;
    try {
      srtContent = await readFile(srtPath, "utf-8");
    } catch {
      // yt-dlp succeeded but didn't write the SRT — means no captions
      throw new CaptionError(
        "NO_CAPTIONS",
        "No English captions available for this video",
      );
    }

    const segments = parseSrt(srtContent);
    if (segments.length === 0) {
      throw new CaptionError("NO_CAPTIONS", "Caption file was empty");
    }
    return segments;
  } finally {
    // Clean up temp dir
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
