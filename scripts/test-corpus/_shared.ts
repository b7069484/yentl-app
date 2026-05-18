import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const execFileAsync = promisify(execFile);

export const REPO_ROOT = path.resolve(import.meta.dirname ?? __dirname, "..", "..");
export const CORPUS_DIR = path.join(REPO_ROOT, "test-corpus");
export const CSV_PATH = path.join(CORPUS_DIR, "videos.csv");
export const AUDIO_DIR = path.join(CORPUS_DIR, "audio");
export const TRANSCRIPTS_DIR = path.join(CORPUS_DIR, "transcripts");
export const GROUND_TRUTH_DIR = path.join(CORPUS_DIR, "ground-truth");
export const SCORES_DIR = path.join(CORPUS_DIR, "scores");
export const LOGS_DIR = path.join(CORPUS_DIR, "logs");

export type VideoRow = {
  id: string;
  category: string;
  descriptor: string;
  search_query: string;
  duration_min_target: string;
  speakers: string;
  overlap: string;
  topic_tags: string;
  review_required: string;
  url: string;
  video_id: string;
  title_resolved: string;
  channel_resolved: string;
  duration_resolved_s: string;
  verified: string;
  notes: string;
};

export async function readVideos(): Promise<VideoRow[]> {
  const text = await fs.readFile(CSV_PATH, "utf8");
  return parse(text, { columns: true, skip_empty_lines: true, trim: true }) as VideoRow[];
}

export async function writeVideos(rows: VideoRow[]): Promise<void> {
  const csv = stringify(rows, { header: true });
  await fs.writeFile(CSV_PATH, csv);
}

export type YtdlpVideoInfo = {
  id: string;
  title: string;
  channel: string;
  duration: number;
  url: string;
  webpage_url: string;
  upload_date?: string;
  subtitles?: Record<string, unknown>;
  automatic_captions?: Record<string, unknown>;
};

export async function ytdlpSearch(query: string, limit = 5): Promise<YtdlpVideoInfo[]> {
  const { stdout } = await execFileAsync(
    "yt-dlp",
    [
      `ytsearch${limit}:${query}`,
      "--dump-json",
      "--no-download",
      "--no-warnings",
      "--no-playlist",
      "--ignore-errors",
    ],
    { maxBuffer: 50 * 1024 * 1024 }
  );
  return stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as YtdlpVideoInfo);
}

export async function ytdlpInfo(url: string): Promise<YtdlpVideoInfo> {
  const { stdout } = await execFileAsync(
    "yt-dlp",
    [url, "--dump-json", "--no-download", "--no-warnings", "--no-playlist"],
    { maxBuffer: 50 * 1024 * 1024 }
  );
  return JSON.parse(stdout) as YtdlpVideoInfo;
}

export async function ytdlpDownloadAudio(url: string, outPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await execFileAsync(
    "yt-dlp",
    [
      url,
      "-f",
      "bestaudio/best",
      "--extract-audio",
      "--audio-format",
      "opus",
      "--audio-quality",
      "0",
      "-o",
      outPath.replace(/\.opus$/, ".%(ext)s"),
      "--no-warnings",
      "--no-playlist",
    ],
    { maxBuffer: 50 * 1024 * 1024 }
  );
}

export async function ytdlpDownloadSubs(url: string, outDir: string, videoId: string): Promise<string | null> {
  await fs.mkdir(outDir, { recursive: true });
  try {
    await execFileAsync(
      "yt-dlp",
      [
        url,
        "--skip-download",
        "--write-sub",
        "--sub-lang",
        "en,en-US,en-GB",
        "--sub-format",
        "vtt",
        "--convert-subs",
        "vtt",
        "-o",
        path.join(outDir, `${videoId}.%(ext)s`),
        "--no-warnings",
      ],
      { maxBuffer: 50 * 1024 * 1024 }
    );
  } catch {
    return null;
  }
  const files = await fs.readdir(outDir);
  const match = files.find((f) => f.startsWith(videoId) && f.endsWith(".vtt"));
  return match ? path.join(outDir, match) : null;
}

export function loadEnv(): { deepgramKey: string } {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    throw new Error("DEEPGRAM_API_KEY not set. Run with --env-file=.env.local");
  }
  return { deepgramKey: key };
}

export function logLine(file: string, msg: string): Promise<void> {
  const ts = new Date().toISOString();
  return fs.appendFile(file, `[${ts}] ${msg}\n`);
}
