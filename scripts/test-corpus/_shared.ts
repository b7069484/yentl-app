import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const execFileAsync = promisify(execFile);

export const REPO_ROOT = path.resolve(import.meta.dirname ?? __dirname, "..", "..");

function resolveCorpusDir(): string {
  const configured = process.env.YENTL_CORPUS_DIR;
  if (!configured) return path.join(REPO_ROOT, "test-corpus");
  return path.isAbsolute(configured) ? configured : path.join(REPO_ROOT, configured);
}

export const CORPUS_DIR = resolveCorpusDir();
export const CSV_PATH = path.join(CORPUS_DIR, "videos.csv");
export const AUDIO_DIR = path.join(CORPUS_DIR, "audio");
export const TRANSCRIPTS_DIR = path.join(CORPUS_DIR, "transcripts");
export const GROUND_TRUTH_DIR = path.join(CORPUS_DIR, "ground-truth");
export const SCORES_DIR = path.join(CORPUS_DIR, "scores");
export const LOGS_DIR = path.join(CORPUS_DIR, "logs");

export type VideoRow = {
  id: string;
  category: string;
  failure_mode?: string;
  descriptor: string;
  search_query: string;
  duration_min_target: string;
  speaker_count_target?: string;
  speakers: string;
  overlap: string;
  sensitivity_level?: string;
  quotation_risk?: string;
  identity_or_harm_risk?: string;
  topic_tags: string;
  review_required: string;
  ideal_pass_behavior?: string;
  critical_trap?: string;
  url: string;
  video_id: string;
  title_resolved: string;
  channel_resolved: string;
  duration_resolved_s: string;
  clip_start_s: string;
  clip_end_s: string;
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
  let stdout = "";
  try {
    const result = await execFileAsync(
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
    stdout = result.stdout;
  } catch (err) {
    stdout = typeof (err as { stdout?: unknown }).stdout === "string"
      ? (err as { stdout: string }).stdout
      : "";
    if (!stdout.trim()) throw err;
  }
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

function fmtSecs(n: number): string {
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function ytdlpDownloadAudio(
  url: string,
  outPath: string,
  clip?: { startS: number; endS: number }
): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  if (clip) {
    const dir = path.dirname(outPath);
    const stem = path.basename(outPath, ".opus");
    const sourceStem = path.join(dir, `${stem}.source`);
    const sourceTemplate = `${sourceStem}.%(ext)s`;

    const existing = await fs.readdir(dir).catch(() => [] as string[]);
    await Promise.all(
      existing
        .filter((file) => file.startsWith(`${stem}.source.`) || file === `${stem}.webm.part`)
        .map((file) => fs.rm(path.join(dir, file), { force: true }))
    );

    await execFileAsync(
      "yt-dlp",
      [
        url,
        "-f",
        "bestaudio[abr<=96]/bestaudio/best",
        "-o",
        sourceTemplate,
        "--no-warnings",
        "--no-playlist",
        "--force-ipv4",
      ],
      { maxBuffer: 50 * 1024 * 1024 }
    );

    const files = await fs.readdir(dir);
    const sourceFile = files.find((file) => file.startsWith(`${stem}.source.`) && !file.endsWith(".part"));
    if (!sourceFile) {
      throw new Error(`yt-dlp did not produce a source audio file for ${stem}`);
    }

    const sourcePath = path.join(dir, sourceFile);
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        fmtSecs(clip.startS),
        "-t",
        String(Math.max(1, clip.endS - clip.startS)),
        "-i",
        sourcePath,
        "-vn",
        "-acodec",
        "libopus",
        "-b:a",
        "48k",
        outPath,
      ],
      { maxBuffer: 50 * 1024 * 1024 }
    );
    await fs.rm(sourcePath, { force: true });
    return;
  }

  const args = [
    url,
    "-f",
    "bestaudio[abr<=96]/bestaudio/best",
    "--extract-audio",
    "--audio-format",
    "opus",
    "--audio-quality",
    "0",
    "-o",
    outPath.replace(/\.opus$/, ".%(ext)s"),
    "--no-warnings",
    "--no-playlist",
    "--force-ipv4",
  ];
  await execFileAsync("yt-dlp", args, { maxBuffer: 50 * 1024 * 1024 });
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
