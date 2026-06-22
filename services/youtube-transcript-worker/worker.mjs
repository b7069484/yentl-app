#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DEFAULT_PORT = 8080;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

export function isValidVideoId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id);
}

function response(status, body, headers = {}) {
  return {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
    body,
  };
}

export function jsonError(status, code, message) {
  return response(status, { error: { code, message } });
}

export function parseSrt(srt) {
  const segments = [];
  const normalized = String(srt).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n\s*\n/).filter((block) => block.trim());

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 3) continue;

    const match =
      /^(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/.exec(
        lines[1],
      );
    if (!match) continue;

    const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = match;
    const start =
      Number(h1) * 3600 + Number(m1) * 60 + Number(s1) + Number(ms1) / 1000;
    const end =
      Number(h2) * 3600 + Number(m2) * 60 + Number(s2) + Number(ms2) / 1000;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;

    const text = lines
      .slice(2)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;

    const previous = segments[segments.length - 1];
    if (previous?.text === text) {
      previous.end = Math.max(previous.end, end);
      continue;
    }

    segments.push({
      text,
      start,
      end,
      is_final: true,
      speaker_id: 0,
    });
  }

  return segments;
}

export function mapYtDlpError(error) {
  const stderr = String(error?.stderr || error?.message || "").toLowerCase();

  if (/private video|sign in|login required|age-restricted|age restricted|unavailable|not available/.test(stderr)) {
    return { status: 403, code: "PRIVATE", message: "Video is private or login-required" };
  }

  if (/no subtitles|no captions|subtitles are disabled/.test(stderr)) {
    return { status: 404, code: "NO_CAPTIONS", message: "No English captions available" };
  }

  if (/timed out|timeout/.test(stderr)) {
    return { status: 504, code: "NETWORK_ERROR", message: "yt-dlp timed out" };
  }

  return {
    status: 502,
    code: "NETWORK_ERROR",
    message: `yt-dlp failed${error?.code ? ` with exit ${error.code}` : ""}`,
  };
}

function authFailure(url, headers, env) {
  const token = env.YENTL_YOUTUBE_TRANSCRIPT_WORKER_TOKEN?.trim();
  if (!token) return null;

  const auth = headers.authorization || headers.Authorization || "";
  if (auth === `Bearer ${token}`) return null;

  return jsonError(401, "PRIVATE", "Unauthorized transcript worker request", {
    "www-authenticate": "Bearer",
  });
}

export async function runYtDlp(videoId, env = process.env) {
  const binary = env.YT_DLP_PATH?.trim() || "yt-dlp";
  const timeoutMs = Number(env.YT_DLP_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const tmpDir = await mkdtemp(join(tmpdir(), "yentl-youtube-worker-"));

  try {
    const outPattern = join(tmpDir, "captions.%(ext)s");
    const args = [
      "--write-auto-sub",
      "--write-sub",
      "--sub-lang",
      "en",
      "--skip-download",
      "--convert-subs",
      "srt",
      "--no-warnings",
      "--extractor-args",
      "youtube:player_client=mweb,tv_embedded,web",
      "-o",
      outPattern,
      `https://www.youtube.com/watch?v=${videoId}`,
    ];

    await execFileAsync(binary, args, {
      timeout: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
      maxBuffer: DEFAULT_MAX_BUFFER,
    });

    const srt = await readFile(join(tmpDir, "captions.en.srt"), "utf8");
    const segments = parseSrt(srt);
    if (segments.length === 0) {
      throw Object.assign(new Error("Caption file was empty"), {
        stderr: "no captions",
      });
    }
    return segments;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function handleTranscriptRequest(url, headers = {}, env = process.env, fetcher = runYtDlp) {
  const parsed = new URL(url, "http://localhost");

  if (parsed.pathname === "/healthz") {
    return response(200, { ok: true });
  }

  const authResponse = authFailure(parsed, headers, env);
  if (authResponse) return authResponse;

  const videoId = parsed.searchParams.get("video_id") || "";
  if (!isValidVideoId(videoId)) {
    return jsonError(400, "INVALID_URL", "Missing or invalid video_id");
  }

  try {
    const transcriptSegments = await fetcher(videoId, env);
    return response(200, { transcript_segments: transcriptSegments });
  } catch (error) {
    const mapped = mapYtDlpError(error);
    return jsonError(mapped.status, mapped.code, mapped.message);
  }
}

export function startServer(env = process.env) {
  const port = Number(env.PORT || DEFAULT_PORT);
  const server = createServer(async (req, res) => {
    if (req.method !== "GET") {
      const notAllowed = jsonError(405, "NETWORK_ERROR", "Method not allowed");
      res.writeHead(notAllowed.status, notAllowed.headers);
      res.end(JSON.stringify(notAllowed.body));
      return;
    }

    const result = await handleTranscriptRequest(
      req.url || "/",
      req.headers,
      env,
    );
    res.writeHead(result.status, result.headers);
    res.end(JSON.stringify(result.body));
  });

  server.listen(Number.isFinite(port) ? port : DEFAULT_PORT, () => {
    const address = server.address();
    const boundPort = typeof address === "object" && address ? address.port : port;
    console.log(`youtube transcript worker listening on :${boundPort}`);
  });
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
