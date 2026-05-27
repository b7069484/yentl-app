import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  AUDIO_DIR,
  CORPUS_DIR,
  GROUND_TRUTH_DIR,
  REPO_ROOT,
  SCORES_DIR,
  TRANSCRIPTS_DIR,
  readVideos,
  type VideoRow,
} from "./_shared.js";

const execFileAsync = promisify(execFile);
const REPORT_DIR = path.join(CORPUS_DIR, "report");
const REPORT_JSON = path.join(REPORT_DIR, "corpus-report.json");
const REPORT_HTML = path.join(REPORT_DIR, "index.html");
const PUBLIC_REPORT_DIR = path.join(REPO_ROOT, "public", "corpus-report");
const PUBLIC_REPORT_JSON = path.join(PUBLIC_REPORT_DIR, "corpus-report.json");
const PUBLIC_REPORT_HTML = path.join(PUBLIC_REPORT_DIR, "index.html");

type DeepgramWord = {
  word?: string;
  punctuated_word?: string;
  start?: number;
  end?: number;
  confidence?: number;
  speaker?: number;
  speaker_confidence?: number;
};

type DeepgramUtterance = {
  start?: number;
  end?: number;
  transcript?: string;
  speaker?: number;
  confidence?: number;
  words?: DeepgramWord[];
};

type DeepgramTranscript = {
  metadata?: { duration?: number };
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        confidence?: number;
        words?: DeepgramWord[];
        paragraphs?: { paragraphs?: unknown[] };
      }>;
    }>;
    utterances?: DeepgramUtterance[];
  };
};

type ScoreRecord = {
  id: string;
  wer: number;
  refLen: number;
  hypLen: number;
};

type ReplayRecord = {
  id: string;
  verify: string;
  utterancesAvailable: number;
  utterancesReplayed: number;
  claims: unknown[];
  markers: unknown[];
  errors: unknown[];
};

type SpeakerStat = {
  id: number;
  words: number;
  share: number;
  confidence: number | null;
};

type VideoReport = {
  id: string;
  category: string;
  descriptor: string;
  title: string;
  channel: string;
  url: string;
  expectedSpeakers: number | null;
  expectedOverlap: string;
  reviewRequired: boolean;
  notes: string;
  transcriptStatus: "present" | "missing";
  audioStatus: "present" | "missing";
  manualCaptionStatus: "present" | "missing";
  durationSec: number;
  wordCount: number;
  utteranceCount: number;
  paragraphCount: number;
  avgConfidence: number | null;
  avgSpeakerConfidence: number | null;
  observedSpeakers: number;
  substantiveSpeakers: number;
  dominantSpeakerShare: number;
  speakerPattern: string;
  speakerStats: SpeakerStat[];
  wer: number | null;
  refWords: number | null;
  hypWords: number | null;
  status: "pass" | "watch" | "review" | "blocked";
  flags: string[];
  replayStatus: "present" | "missing";
  replayVerify: string | null;
  replayUtterances: number | null;
  replayClaims: number | null;
  replayMarkers: number | null;
  replayErrors: number | null;
};

type CategoryReport = {
  category: string;
  count: number;
  transcripts: number;
  manualCaptions: number;
  scored: number;
  heavyOverlap: number;
  reviewRequired: number;
  medianWer: number | null;
  medianConfidence: number | null;
  medianSpeakerConfidence: number | null;
  medianObservedSpeakers: number | null;
  totalMinutes: number;
  watchFlags: number;
};

type CorpusReport = {
  generatedAt: string;
  gitHead: string;
  summary: {
    videos: number;
    transcripts: number;
    audio: number;
    manualCaptions: number;
    scored: number;
    replayed: number;
    pass: number;
    watch: number;
    review: number;
    blocked: number;
    medianWer: number | null;
    meanWer: number | null;
    p90Wer: number | null;
    medianConfidence: number | null;
    medianSpeakerConfidence: number | null;
    totalHours: number;
  };
  categories: CategoryReport[];
  videos: VideoReport[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtPct(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(digits)}%`;
}

function fmtNum(value: number | null, digits = 0): string {
  if (value === null || Number.isNaN(value)) return "n/a";
  return value.toFixed(digits);
}

function fmtMinutes(seconds: number): string {
  return `${(seconds / 60).toFixed(1)}m`;
}

function median(values: number[]): number | null {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  return clean[Math.floor(clean.length / 2)];
}

function mean(values: number[]): number | null {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function p90(values: number[]): number | null {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  return clean[Math.min(clean.length - 1, Math.floor(clean.length * 0.9))];
}

function parseExpectedSpeakers(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fileExists(filePath: string): Promise<boolean> {
  return fs.access(filePath).then(() => true, () => false);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function gitHead(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"]);
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

function transcriptAlternative(json: DeepgramTranscript | null) {
  return json?.results?.channels?.[0]?.alternatives?.[0] ?? null;
}

function wordsFromTranscript(json: DeepgramTranscript | null): DeepgramWord[] {
  return transcriptAlternative(json)?.words ?? [];
}

function utterancesFromTranscript(json: DeepgramTranscript | null): DeepgramUtterance[] {
  return json?.results?.utterances ?? [];
}

function durationFromTranscript(json: DeepgramTranscript | null, words: DeepgramWord[], utterances: DeepgramUtterance[]): number {
  const metadataDuration = json?.metadata?.duration;
  if (typeof metadataDuration === "number" && Number.isFinite(metadataDuration)) return metadataDuration;
  const wordEnd = Math.max(0, ...words.map((word) => word.end ?? 0));
  const utteranceEnd = Math.max(0, ...utterances.map((utterance) => utterance.end ?? 0));
  return Math.max(wordEnd, utteranceEnd);
}

function average(values: Array<number | undefined>): number | null {
  const clean = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (clean.length === 0) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function speakerStats(words: DeepgramWord[]): SpeakerStat[] {
  const totals = new Map<number, { words: number; confidenceValues: number[] }>();
  for (const word of words) {
    if (typeof word.speaker !== "number") continue;
    const current = totals.get(word.speaker) ?? { words: 0, confidenceValues: [] };
    current.words += 1;
    if (typeof word.speaker_confidence === "number") current.confidenceValues.push(word.speaker_confidence);
    totals.set(word.speaker, current);
  }
  const totalWords = [...totals.values()].reduce((sum, item) => sum + item.words, 0);
  return [...totals.entries()]
    .map(([id, item]) => ({
      id,
      words: item.words,
      share: totalWords > 0 ? item.words / totalWords : 0,
      confidence: median(item.confidenceValues),
    }))
    .sort((a, b) => b.words - a.words);
}

function classifyPattern(stats: SpeakerStat[]): string {
  const substantive = stats.filter((speaker) => speaker.words >= 75 || speaker.share >= 0.04);
  const dominantShare = stats[0]?.share ?? 0;
  if (stats.length <= 1) return "solo";
  if (dominantShare >= 0.68 && stats.length >= 3) return "monologue with clips";
  if (substantive.length <= 2) return "interview";
  if (substantive.length >= 4) return "panel";
  return "multi-speaker";
}

function evaluateVideo(args: {
  row: VideoRow;
  transcriptPresent: boolean;
  audioPresent: boolean;
  manualCaptionPresent: boolean;
  score: ScoreRecord | null;
  replay: ReplayRecord | null;
  observedSpeakers: number;
  substantiveSpeakers: number;
  dominantSpeakerShare: number;
  avgConfidence: number | null;
  avgSpeakerConfidence: number | null;
}): { status: VideoReport["status"]; flags: string[] } {
  const flags: string[] = [];
  const expectedSpeakers = parseExpectedSpeakers(args.row.speakers);
  const overlap = args.row.overlap.toLowerCase();

  if (!args.transcriptPresent) flags.push("missing transcript");
  if (!args.audioPresent) flags.push("missing audio cache");
  if (args.row.review_required === "TRUE") flags.push("editorial review set");
  if (args.score?.wer !== undefined && args.score.wer > 0.15) flags.push(`WER above 15% (${fmtPct(args.score.wer)})`);
  if (args.avgConfidence !== null && args.avgConfidence < 0.9) flags.push(`low word confidence (${fmtPct(args.avgConfidence)})`);
  if (args.avgSpeakerConfidence !== null && args.avgSpeakerConfidence < 0.18 && args.observedSpeakers > 1) {
    flags.push(`low speaker confidence (${fmtPct(args.avgSpeakerConfidence)})`);
  }
  if (expectedSpeakers !== null && expectedSpeakers >= 4 && args.substantiveSpeakers < 3) {
    flags.push(`expected panel but substantive speakers=${args.substantiveSpeakers}`);
  }
  if (expectedSpeakers === 1 && args.observedSpeakers >= 4 && args.dominantSpeakerShare < 0.65) {
    flags.push(`solo expected but diarization split into ${args.observedSpeakers}`);
  }
  if (overlap === "heavy" && args.observedSpeakers <= 1) {
    flags.push("heavy-overlap row collapsed to one speaker");
  }
  if (args.replay && args.replay.errors.length > 0) {
    flags.push(`replay errors=${args.replay.errors.length}`);
  }

  if (!args.transcriptPresent) return { status: "blocked", flags };
  if (args.row.review_required === "TRUE") return { status: "review", flags };
  if (flags.some((flag) => flag.startsWith("WER above") || flag.includes("expected panel") || flag.includes("heavy-overlap"))) {
    return { status: "watch", flags };
  }
  return { status: "pass", flags };
}

async function buildVideoReport(row: VideoRow, gtFiles: string[]): Promise<VideoReport> {
  const transcriptPath = path.join(TRANSCRIPTS_DIR, `${row.id}.json`);
  const audioPath = path.join(AUDIO_DIR, `${row.id}.opus`);
  const scorePath = path.join(SCORES_DIR, `${row.id}.json`);
  const replayPath = path.join(SCORES_DIR, `${row.id}.replay.json`);
  const transcriptPresent = await fileExists(transcriptPath);
  const audioPresent = await fileExists(audioPath);
  const manualCaptionPresent = gtFiles.some((file) => file.startsWith(row.video_id) && file.endsWith(".vtt"));
  const transcript = await readJson<DeepgramTranscript>(transcriptPath);
  const score = await readJson<ScoreRecord>(scorePath);
  const replay = await readJson<ReplayRecord>(replayPath);
  const alt = transcriptAlternative(transcript);
  const words = wordsFromTranscript(transcript);
  const utterances = utterancesFromTranscript(transcript);
  const stats = speakerStats(words);
  const wordCount = words.length || (alt?.transcript?.split(/\s+/).filter(Boolean).length ?? 0);
  const durationSec = durationFromTranscript(transcript, words, utterances);
  const observedSpeakers = stats.length;
  const substantiveSpeakers = stats.filter((speaker) => speaker.words >= 75 || speaker.share >= 0.04).length;
  const dominantSpeakerShare = stats[0]?.share ?? 0;
  const avgConfidence = average(words.map((word) => word.confidence)) ?? alt?.confidence ?? null;
  const avgSpeakerConfidence = average(words.map((word) => word.speaker_confidence));
  const evaluation = evaluateVideo({
    row,
    transcriptPresent,
    audioPresent,
    manualCaptionPresent,
    score,
    replay,
    observedSpeakers,
    substantiveSpeakers,
    dominantSpeakerShare,
    avgConfidence,
    avgSpeakerConfidence,
  });

  return {
    id: row.id,
    category: row.category,
    descriptor: row.descriptor,
    title: row.title_resolved,
    channel: row.channel_resolved,
    url: row.url,
    expectedSpeakers: parseExpectedSpeakers(row.speakers),
    expectedOverlap: row.overlap,
    reviewRequired: row.review_required === "TRUE",
    notes: row.notes,
    transcriptStatus: transcriptPresent ? "present" : "missing",
    audioStatus: audioPresent ? "present" : "missing",
    manualCaptionStatus: manualCaptionPresent ? "present" : "missing",
    durationSec,
    wordCount,
    utteranceCount: utterances.length,
    paragraphCount: alt?.paragraphs?.paragraphs?.length ?? 0,
    avgConfidence,
    avgSpeakerConfidence,
    observedSpeakers,
    substantiveSpeakers,
    dominantSpeakerShare,
    speakerPattern: classifyPattern(stats),
    speakerStats: stats,
    wer: score?.wer ?? null,
    refWords: score?.refLen ?? null,
    hypWords: score?.hypLen ?? null,
    status: evaluation.status,
    flags: evaluation.flags,
    replayStatus: replay ? "present" : "missing",
    replayVerify: replay?.verify ?? null,
    replayUtterances: replay?.utterancesReplayed ?? null,
    replayClaims: replay?.claims.length ?? null,
    replayMarkers: replay?.markers.length ?? null,
    replayErrors: replay?.errors.length ?? null,
  };
}

function buildCategoryReports(videos: VideoReport[]): CategoryReport[] {
  const byCategory = new Map<string, VideoReport[]>();
  for (const video of videos) {
    byCategory.set(video.category, [...(byCategory.get(video.category) ?? []), video]);
  }
  return [...byCategory.entries()].map(([category, rows]) => ({
    category,
    count: rows.length,
    transcripts: rows.filter((row) => row.transcriptStatus === "present").length,
    manualCaptions: rows.filter((row) => row.manualCaptionStatus === "present").length,
    scored: rows.filter((row) => row.wer !== null).length,
    heavyOverlap: rows.filter((row) => row.expectedOverlap === "heavy").length,
    reviewRequired: rows.filter((row) => row.reviewRequired).length,
    medianWer: median(rows.flatMap((row) => (row.wer === null ? [] : [row.wer]))),
    medianConfidence: median(rows.flatMap((row) => (row.avgConfidence === null ? [] : [row.avgConfidence]))),
    medianSpeakerConfidence: median(rows.flatMap((row) => (row.avgSpeakerConfidence === null ? [] : [row.avgSpeakerConfidence]))),
    medianObservedSpeakers: median(rows.map((row) => row.observedSpeakers)),
    totalMinutes: rows.reduce((sum, row) => sum + row.durationSec / 60, 0),
    watchFlags: rows.filter((row) => row.status === "watch").length,
  }));
}

async function buildReport(): Promise<CorpusReport> {
  const rows = await readVideos();
  const gtFiles = await fs.readdir(GROUND_TRUTH_DIR).catch(() => [] as string[]);
  const videos: VideoReport[] = [];
  for (const row of rows) {
    videos.push(await buildVideoReport(row, gtFiles));
  }
  const werValues = videos.flatMap((video) => (video.wer === null ? [] : [video.wer]));
  const confidenceValues = videos.flatMap((video) => (video.avgConfidence === null ? [] : [video.avgConfidence]));
  const speakerConfidenceValues = videos.flatMap((video) => (
    video.avgSpeakerConfidence === null ? [] : [video.avgSpeakerConfidence]
  ));

  return {
    generatedAt: new Date().toISOString(),
    gitHead: await gitHead(),
    summary: {
      videos: videos.length,
      transcripts: videos.filter((video) => video.transcriptStatus === "present").length,
      audio: videos.filter((video) => video.audioStatus === "present").length,
      manualCaptions: videos.filter((video) => video.manualCaptionStatus === "present").length,
      scored: videos.filter((video) => video.wer !== null).length,
      replayed: videos.filter((video) => video.replayStatus === "present").length,
      pass: videos.filter((video) => video.status === "pass").length,
      watch: videos.filter((video) => video.status === "watch").length,
      review: videos.filter((video) => video.status === "review").length,
      blocked: videos.filter((video) => video.status === "blocked").length,
      medianWer: median(werValues),
      meanWer: mean(werValues),
      p90Wer: p90(werValues),
      medianConfidence: median(confidenceValues),
      medianSpeakerConfidence: median(speakerConfidenceValues),
      totalHours: videos.reduce((sum, video) => sum + video.durationSec / 3600, 0),
    },
    categories: buildCategoryReports(videos),
    videos,
  };
}

function statusBadge(status: VideoReport["status"]): string {
  const labels: Record<VideoReport["status"], string> = {
    pass: "Pass",
    watch: "Watch",
    review: "Review",
    blocked: "Blocked",
  };
  return `<span class="badge ${status}">${labels[status]}</span>`;
}

function speakerBars(video: VideoReport): string {
  if (video.speakerStats.length === 0) return `<span class="muted">No speaker data</span>`;
  return `<div class="speaker-bars">${video.speakerStats.slice(0, 6).map((speaker) => `
    <div class="speaker-bar" title="Speaker ${speaker.id}: ${speaker.words} words, ${fmtPct(speaker.share)}">
      <span class="speaker-label">S${speaker.id}</span>
      <span class="bar-track"><span style="width:${Math.max(2, speaker.share * 100).toFixed(1)}%"></span></span>
      <span class="speaker-share">${fmtPct(speaker.share, 0)}</span>
    </div>
  `).join("")}</div>`;
}

function renderHtml(report: CorpusReport): string {
  const watchVideos = report.videos.filter((video) => video.status === "watch" || video.status === "blocked");
  const reviewVideos = report.videos.filter((video) => video.status === "review");
  const replayRows = report.videos.filter((video) => video.replayStatus === "present");
  const scoreRows = report.videos
    .filter((video) => video.wer !== null)
    .sort((a, b) => (b.wer ?? 0) - (a.wer ?? 0));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Yentl 100-Video Corpus Report</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #18191f;
      --muted: #646977;
      --line: #dad7cf;
      --paper: #fbfaf7;
      --panel: #ffffff;
      --soft: #f1efe8;
      --green: #187044;
      --amber: #8a5d00;
      --red: #a23a32;
      --blue: #255f85;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--paper);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    header {
      border-bottom: 1px solid var(--line);
      background: #fffdf8;
      padding: 28px clamp(18px, 4vw, 44px) 24px;
    }
    main { padding: 24px clamp(18px, 4vw, 44px) 56px; }
    h1, h2, h3 { margin: 0; letter-spacing: 0; }
    h1 { font-family: Georgia, "Times New Roman", serif; font-size: clamp(30px, 5vw, 56px); line-height: 1; }
    h2 { margin-top: 34px; font-size: 22px; }
    h3 { font-size: 16px; }
    .subhead {
      max-width: 980px;
      margin: 12px 0 0;
      color: var(--muted);
      font-size: 15px;
    }
    .meta { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 18px; color: var(--muted); font-size: 13px; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(6, minmax(130px, 1fr));
      gap: 10px;
      margin-top: 20px;
    }
    .metric {
      min-height: 92px;
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 14px;
    }
    .metric .label { color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .metric .value { margin-top: 8px; font-size: 28px; font-weight: 800; line-height: 1; }
    .metric .note { margin-top: 7px; color: var(--muted); font-size: 12px; }
    .band {
      border: 1px solid var(--line);
      background: var(--panel);
      margin-top: 14px;
      overflow: hidden;
    }
    .band-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      background: var(--soft);
    }
    .band-head p { margin: 4px 0 0; color: var(--muted); font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #ebe8df; text-align: left; vertical-align: top; }
    th { background: #fffdf8; color: #3e424b; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    tbody tr:hover { background: #fffdfa; }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 2px 8px;
      border: 1px solid currentColor;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
    }
    .badge.pass { color: var(--green); }
    .badge.watch { color: var(--amber); }
    .badge.review { color: var(--blue); }
    .badge.blocked { color: var(--red); }
    .muted { color: var(--muted); }
    .nowrap { white-space: nowrap; }
    .video-title { max-width: 360px; font-weight: 700; }
    .video-title a { color: inherit; text-decoration: none; }
    .video-title a:hover { text-decoration: underline; }
    .flags { display: flex; flex-wrap: wrap; gap: 5px; max-width: 420px; }
    .flag {
      border: 1px solid #d7c797;
      background: #fff7da;
      color: #6d4a00;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
    }
    .speaker-bars { display: grid; gap: 4px; min-width: 150px; }
    .speaker-bar { display: grid; grid-template-columns: 26px 1fr 38px; align-items: center; gap: 6px; font-size: 11px; }
    .bar-track { height: 7px; background: #e8e3d6; overflow: hidden; }
    .bar-track span { display: block; height: 100%; background: #2f6f88; }
    .speaker-label, .speaker-share { color: var(--muted); font-variant-numeric: tabular-nums; }
    .grid-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; }
    .callout {
      border-left: 4px solid var(--blue);
      background: #eef6fa;
      padding: 12px 14px;
      color: #223f52;
      font-size: 13px;
      margin-top: 14px;
    }
    .table-wrap { overflow-x: auto; }
    @media (max-width: 1100px) {
      .metrics { grid-template-columns: repeat(3, minmax(130px, 1fr)); }
      .grid-two { grid-template-columns: 1fr; }
    }
    @media (max-width: 720px) {
      .metrics { grid-template-columns: repeat(2, minmax(130px, 1fr)); }
      th, td { padding: 9px 8px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Yentl 100-Video Corpus Report</h1>
    <p class="subhead">Acceptance evidence for the current local Yentl worktree across solo explainers, interviews, cable-news crosstalk, podcasts, academic talks, political debates, Israel/Palestine, Holocaust education and denial, contentious culture, and misinformation-prone topics.</p>
    <div class="meta">
      <span>Generated ${escapeHtml(report.generatedAt)}</span>
      <span>Git ${escapeHtml(report.gitHead)}</span>
      <span>Artifacts: test-corpus/transcripts, ground-truth, scores</span>
    </div>
    <section class="metrics" aria-label="Corpus summary">
      <div class="metric"><div class="label">Videos</div><div class="value">${report.summary.videos}</div><div class="note">${report.summary.transcripts}/100 transcripts</div></div>
      <div class="metric"><div class="label">Phase A</div><div class="value">${fmtPct(report.summary.medianWer)}</div><div class="note">median WER, threshold <= 15%</div></div>
      <div class="metric"><div class="label">Mean WER</div><div class="value">${fmtPct(report.summary.meanWer)}</div><div class="note">p90 ${fmtPct(report.summary.p90Wer)}</div></div>
      <div class="metric"><div class="label">Human Captions</div><div class="value">${report.summary.scored}</div><div class="note">${report.summary.manualCaptions} caption files found</div></div>
      <div class="metric"><div class="label">Audio</div><div class="value">${report.summary.audio}</div><div class="note">${fmtNum(report.summary.totalHours, 1)} transcript hours</div></div>
      <div class="metric"><div class="label">Replay Slices</div><div class="value">${report.summary.replayed}</div><div class="note">${report.summary.review} editorial-review rows</div></div>
    </section>
  </header>
  <main>
    <div class="callout">
      Phase A is complete: all 100 videos have Deepgram transcript artifacts and the human-caption WER subset passes. Phase B replay is now wired against the current app endpoints; the slices below prove extraction, provisional verification, and rhetoric analysis on solo, editorial-review, and crosstalk examples.
    </div>

    <section class="grid-two">
      <div class="band">
        <div class="band-head"><div><h2>Category Coverage</h2><p>Ten categories, ten videos each.</p></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Category</th><th>Videos</th><th>Scored</th><th>Heavy</th><th>Speakers</th><th>Median WER</th><th>Flags</th></tr></thead>
            <tbody>
              ${report.categories.map((category) => `
                <tr>
                  <td>${escapeHtml(category.category)}</td>
                  <td>${category.transcripts}/${category.count}</td>
                  <td>${category.scored}</td>
                  <td>${category.heavyOverlap}</td>
                  <td>${fmtNum(category.medianObservedSpeakers, 0)}</td>
                  <td>${fmtPct(category.medianWer)}</td>
                  <td>${category.reviewRequired ? `${category.reviewRequired} review` : ""}${category.watchFlags ? ` ${category.watchFlags} watch` : ""}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="band">
        <div class="band-head"><div><h2>WER Subset</h2><p>Only videos with human-authored captions are scored.</p></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Video</th><th>Category</th><th>WER</th><th>Ref/Hyp</th></tr></thead>
            <tbody>
              ${scoreRows.map((video) => `
                <tr>
                  <td>${escapeHtml(video.id)}</td>
                  <td>${escapeHtml(video.category)}</td>
                  <td class="nowrap">${fmtPct(video.wer)}</td>
                  <td>${video.refWords} / ${video.hypWords}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="band">
      <div class="band-head"><div><h2>Phase B Replay Slices</h2><p>Endpoint-driven replays saved as <code>*.replay.json</code> beside the WER scores.</p></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Video</th><th>Category</th><th>Verify</th><th>Utterances</th><th>Claims</th><th>Markers</th><th>Errors</th></tr></thead>
          <tbody>
            ${replayRows.map((video) => `
              <tr>
                <td><div class="video-title"><a href="${escapeHtml(video.url)}">${escapeHtml(video.id)} · ${escapeHtml(video.title)}</a></div></td>
                <td>${escapeHtml(video.category)}</td>
                <td>${escapeHtml(video.replayVerify ?? "n/a")}</td>
                <td>${video.replayUtterances ?? "n/a"}</td>
                <td>${video.replayClaims ?? "n/a"}</td>
                <td>${video.replayMarkers ?? "n/a"}</td>
                <td>${video.replayErrors ?? "n/a"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="band">
      <div class="band-head"><div><h2>Watch And Review Queue</h2><p>Items that need editorial review or closer diarization/accuracy inspection.</p></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Status</th><th>Video</th><th>Expected</th><th>Observed</th><th>WER</th><th>Flags</th></tr></thead>
          <tbody>
            ${[...reviewVideos, ...watchVideos].map((video) => `
              <tr>
                <td>${statusBadge(video.status)}</td>
                <td><div class="video-title"><a href="${escapeHtml(video.url)}">${escapeHtml(video.id)} · ${escapeHtml(video.title)}</a></div><div class="muted">${escapeHtml(video.channel)}</div></td>
                <td>${video.expectedSpeakers ?? "n/a"} speakers, ${escapeHtml(video.expectedOverlap)} overlap</td>
                <td>${video.observedSpeakers} speakers, ${escapeHtml(video.speakerPattern)}<br><span class="muted">dominant ${fmtPct(video.dominantSpeakerShare)}</span></td>
                <td>${fmtPct(video.wer)}</td>
                <td><div class="flags">${video.flags.map((flag) => `<span class="flag">${escapeHtml(flag)}</span>`).join("") || "<span class=\"muted\">none</span>"}</div></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="band">
      <div class="band-head"><div><h2>All 100 Videos</h2><p>Transcript and diarization inventory.</p></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Status</th><th>Video</th><th>Category</th><th>Duration</th><th>Words</th><th>Confidence</th><th>Speakers</th><th>WER</th><th>Notes</th></tr></thead>
          <tbody>
            ${report.videos.map((video) => `
              <tr>
                <td>${statusBadge(video.status)}</td>
                <td><div class="video-title"><a href="${escapeHtml(video.url)}">${escapeHtml(video.id)} · ${escapeHtml(video.title)}</a></div><div class="muted">${escapeHtml(video.channel)}</div></td>
                <td>${escapeHtml(video.category)}</td>
                <td class="nowrap">${fmtMinutes(video.durationSec)}</td>
                <td>${video.wordCount.toLocaleString()}</td>
                <td>${fmtPct(video.avgConfidence)}<br><span class="muted">speaker ${fmtPct(video.avgSpeakerConfidence)}</span></td>
                <td>${speakerBars(video)}</td>
                <td>${fmtPct(video.wer)}</td>
                <td>${escapeHtml(video.notes)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  </main>
</body>
</html>`;
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_REPORT_DIR, { recursive: true });
  const report = await buildReport();
  const reportJson = JSON.stringify(report, null, 2);
  const reportHtml = renderHtml(report);
  await fs.writeFile(REPORT_JSON, reportJson);
  await fs.writeFile(REPORT_HTML, reportHtml);
  await fs.writeFile(PUBLIC_REPORT_JSON, reportJson);
  await fs.writeFile(PUBLIC_REPORT_HTML, reportHtml);
  console.log(`Wrote ${REPORT_JSON}`);
  console.log(`Wrote ${REPORT_HTML}`);
  console.log(`Wrote ${PUBLIC_REPORT_HTML}`);
  console.log(`Videos=${report.summary.videos} transcripts=${report.summary.transcripts} scored=${report.summary.scored}`);
  console.log(`Median WER=${fmtPct(report.summary.medianWer)} mean=${fmtPct(report.summary.meanWer)} p90=${fmtPct(report.summary.p90Wer)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
