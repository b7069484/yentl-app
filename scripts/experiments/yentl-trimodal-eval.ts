import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fetchCaptions, parseSrt } from "../../lib/server/youtube-captions";
import { mergeIntoUtterances } from "../../lib/client/utterance-merge";
import type { TranscriptSegment } from "../../lib/types";

const execFileAsync = promisify(execFile);

type Candidate = {
  id: string;
  group: "primary" | "stress";
  url: string;
  videoId: string;
  expectedSpeakers: number;
  reason: string;
};

const CANDIDATES: Candidate[] = [
  {
    id: "tarantino_channel4",
    group: "primary",
    url: "https://www.youtube.com/watch?v=GrsJDy8VjZk",
    videoId: "GrsJDy8VjZk",
    expectedSpeakers: 2,
    reason: "Adversarial two-speaker interview, loaded-question/refusal boundary.",
  },
  {
    id: "bondi_epstein_cnn",
    group: "primary",
    url: "https://www.youtube.com/watch?v=RhdgXhIF_CM",
    videoId: "RhdgXhIF_CM",
    expectedSpeakers: 4,
    reason: "Combative legal/procedural hearing with allegations and crosstalk.",
  },
  {
    id: "vance_walz_debate",
    group: "primary",
    url: "https://www.youtube.com/watch?v=XocmI6WyoE8",
    videoId: "XocmI6WyoE8",
    expectedSpeakers: 3,
    reason: "Moderated political debate with direct factual claims and evasive answers.",
  },
  {
    id: "da_race_kcra",
    group: "primary",
    url: "https://www.youtube.com/watch?v=8VzPtnT6yF8",
    videoId: "8VzPtnT6yF8",
    expectedSpeakers: 2,
    reason: "Loaded-premise local-news interview and URL-caption timing stress.",
  },
  {
    id: "vaccine_delay_rciscience",
    group: "primary",
    url: "https://www.youtube.com/watch?v=N9kMkLSsOjo",
    videoId: "N9kMkLSsOjo",
    expectedSpeakers: 4,
    reason: "Science/medical uncertainty and risk-benefit claims.",
  },
  {
    id: "maajid_mehdi_bbc",
    group: "stress",
    url: "https://www.youtube.com/watch?v=noOPNkxQE9M",
    videoId: "noOPNkxQE9M",
    expectedSpeakers: 4,
    reason: "Heated religion/politics panel; auto-caption stress reserve.",
  },
  {
    id: "hitchens_mcgrath",
    group: "stress",
    url: "https://www.youtube.com/watch?v=NX_LM7WZc9A",
    videoId: "NX_LM7WZc9A",
    expectedSpeakers: 4,
    reason: "Philosophical debate; auto-caption stress reserve.",
  },
  {
    id: "trump_biden_factcheck",
    group: "stress",
    url: "https://www.youtube.com/watch?v=Mczxmex4LNw",
    videoId: "Mczxmex4LNw",
    expectedSpeakers: 3,
    reason: "Fact-checking commentary source; auto-caption stress reserve.",
  },
];

type YtDlpInfo = {
  id: string;
  title: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  subtitles?: Record<string, unknown>;
  automatic_captions?: Record<string, unknown>;
};

type CaptionSource = {
  kind: "manual" | "auto";
  lang: string;
};

type DeepgramWord = {
  word?: string;
  punctuated_word?: string;
  start?: number;
  end?: number;
  speaker?: number;
  confidence?: number;
  speaker_confidence?: number;
};

type DeepgramUtterance = {
  transcript?: string;
  start?: number;
  end?: number;
  speaker?: number;
  words?: DeepgramWord[];
};

type DeepgramResponse = {
  results?: {
    utterances?: DeepgramUtterance[];
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        words?: DeepgramWord[];
      }>;
    }>;
  };
};

type WerResult = {
  wer: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  hits: number;
  refLen: number;
  hypLen: number;
};

type ExtractedClaim = {
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  topic: string;
  topic_secondary: string | null;
};

type Marker = {
  type: string;
  name: string;
  display: string;
  excerpt: string;
  start_time: number;
  end_time: number;
  severity: string;
  explanation: string;
};

type ClaimAnalysis = ExtractedClaim & {
  id: string;
  speaker_id: number | null;
  provisional?: {
    primary_label?: string;
    score?: number;
    explanation?: string;
    annotations?: unknown[];
  };
  confirmed?: {
    primary_label?: string;
    score?: number;
    explanation?: string;
    sources?: unknown[];
  };
  error?: string;
};

type ModeAnalysis = {
  mode: "srt" | "audio_production" | "youtube_url";
  utterancesAvailable: number;
  utterancesAnalyzed: number;
  claims: ClaimAnalysis[];
  markers: Marker[];
  errors: Array<{ stage: string; message: string }>;
};

type ModeTranscriptStats = {
  segmentCount: number;
  wordCount: number;
  firstStart: number | null;
  lastEnd: number | null;
  observedSpeakers: number;
  dominantSpeakerShare: number | null;
  avgWordConfidence: number | null;
  avgSpeakerConfidence: number | null;
};

type CandidateResult = {
  candidate: Candidate;
  title: string;
  channel: string;
  durationS: number;
  captionSource: CaptionSource | null;
  paths: Record<string, string>;
  transcriptStats: {
    srt: ModeTranscriptStats;
    youtube_url: ModeTranscriptStats;
    audio_production: ModeTranscriptStats;
    audio_diagnostic_diarized: ModeTranscriptStats;
  };
  comparisons: {
    youtubeUrlVsSrt: WerResult | null;
    audioProductionVsSrt: WerResult | null;
    audioDiagnosticVsSrt: WerResult | null;
    youtubeTimingDriftS: number | null;
  };
  analysis: {
    srt: ModeAnalysis;
    youtube_url: ModeAnalysis;
    audio_production: ModeAnalysis;
  };
  crossMode: {
    claimJaccard: Record<string, number>;
    provisionalDisagreements: Array<{
      leftMode: string;
      rightMode: string;
      leftClaim: string;
      rightClaim: string;
      leftLabel: string;
      rightLabel: string;
    }>;
    markerNameOverlap: Record<string, number>;
    explicitRevisionEvents: number;
  };
  warnings: string[];
};

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_MAX_ANALYSIS_UTTERANCES = 18;
const DEFAULT_MAX_VERIFY_PER_MODE = 4;
const DEFAULT_MAX_CONFIRMED_PER_SRT = 2;

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const repoRoot = path.resolve(import.meta.dirname, "..", "..");

function argValue(name: string): string | undefined {
  return process.argv.slice(2).find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
}

function hasArg(name: string): boolean {
  return process.argv.slice(2).includes(name);
}

function envInt(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? "");
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[^a-z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function textFromSegments(segments: TranscriptSegment[]): string {
  return segments.map((segment) => segment.text).join(" ");
}

function computeWer(refWords: string[], hypWords: string[]): WerResult {
  const m = refWords.length;
  const n = hypWords.length;
  const dp: Uint32Array[] = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  const op: Uint8Array[] = Array.from({ length: m + 1 }, () => new Uint8Array(n + 1));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
    op[i][0] = 2;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
    op[0][j] = 1;
  }
  op[0][0] = 0;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const sub = dp[i - 1][j - 1] + (refWords[i - 1] === hypWords[j - 1] ? 0 : 1);
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      let best = sub;
      let code = refWords[i - 1] === hypWords[j - 1] ? 3 : 4;
      if (del < best) { best = del; code = 2; }
      if (ins < best) { best = ins; code = 1; }
      dp[i][j] = best;
      op[i][j] = code;
    }
  }

  let i = m;
  let j = n;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;
  let hits = 0;
  while (i > 0 || j > 0) {
    const code = op[i][j];
    if (code === 3) { hits++; i--; j--; }
    else if (code === 4) { substitutions++; i--; j--; }
    else if (code === 2) { deletions++; i--; }
    else if (code === 1) { insertions++; j--; }
    else break;
  }

  const wer = m === 0 ? (n === 0 ? 0 : 1) : (substitutions + deletions + insertions) / m;
  return { wer, substitutions, deletions, insertions, hits, refLen: m, hypLen: n };
}

function compareSegments(ref: TranscriptSegment[], hyp: TranscriptSegment[]): WerResult | null {
  const refWords = normalizeWords(textFromSegments(ref));
  const hypWords = normalizeWords(textFromSegments(hyp));
  if (refWords.length === 0 || hypWords.length === 0) return null;
  return computeWer(refWords, hypWords);
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function formatNum(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return value.toFixed(digits);
}

function formatTimeRange(stats: ModeTranscriptStats): string {
  if (stats.firstStart === null || stats.lastEnd === null) return "n/a";
  return `${formatNum(stats.firstStart)}-${formatNum(stats.lastEnd)}s`;
}

async function getInfo(candidate: Candidate): Promise<YtDlpInfo> {
  const { stdout } = await execFileAsync(
    "yt-dlp",
    ["-J", "--skip-download", "--no-warnings", candidate.url],
    { maxBuffer: 80 * 1024 * 1024 },
  );
  return JSON.parse(stdout) as YtDlpInfo;
}

function chooseCaptionSource(info: YtDlpInfo): CaptionSource | null {
  const preferred = ["en", "en-US", "en-GB", "en-CA", "en-orig"];
  const manualKeys = Object.keys(info.subtitles ?? {});
  const manual = preferred.find((lang) => manualKeys.includes(lang)) ?? manualKeys.find((lang) => /^en/i.test(lang));
  if (manual) return { kind: "manual", lang: manual };

  const autoKeys = Object.keys(info.automatic_captions ?? {});
  const auto = preferred.find((lang) => autoKeys.includes(lang)) ?? autoKeys.find((lang) => /^en/i.test(lang));
  if (auto) return { kind: "auto", lang: auto };
  return null;
}

async function findFirstFile(dir: string, prefix: string, ext: string): Promise<string | null> {
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  const match = files.find((file) => file.startsWith(prefix) && file.endsWith(ext));
  return match ? path.join(dir, match) : null;
}

async function downloadSrt(candidate: Candidate, caption: CaptionSource, outDir: string): Promise<string> {
  const target = path.join(outDir, "source");
  const existing = await findFirstFile(outDir, "source", ".srt");
  if (existing) return existing;

  const flag = caption.kind === "manual" ? "--write-sub" : "--write-auto-sub";
  await execFileAsync(
    "yt-dlp",
    [
      candidate.url,
      "--skip-download",
      flag,
      "--sub-lang",
      caption.lang,
      "--sub-format",
      "srt",
      "--convert-subs",
      "srt",
      "-o",
      `${target}.%(ext)s`,
      "--no-warnings",
    ],
    { maxBuffer: 80 * 1024 * 1024 },
  );

  const produced = await findFirstFile(outDir, "source", ".srt");
  if (!produced) throw new Error(`yt-dlp did not produce SRT for ${candidate.id}`);
  return produced;
}

async function downloadAudio(candidate: Candidate, outDir: string): Promise<string> {
  const existing = await findFirstFile(outDir, "audio", ".opus");
  if (existing) return existing;

  await execFileAsync(
    "yt-dlp",
    [
      candidate.url,
      "-f",
      "bestaudio[abr<=96]/bestaudio/best",
      "--extract-audio",
      "--audio-format",
      "opus",
      "--audio-quality",
      "0",
      "-o",
      path.join(outDir, "audio.%(ext)s"),
      "--no-warnings",
      "--no-playlist",
      "--force-ipv4",
    ],
    { maxBuffer: 80 * 1024 * 1024 },
  );

  const produced = await findFirstFile(outDir, "audio", ".opus");
  if (!produced) throw new Error(`yt-dlp did not produce audio for ${candidate.id}`);
  return produced;
}

async function transcribeAudio(audioPath: string, diarize: boolean): Promise<DeepgramResponse> {
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramKey) throw new Error("DEEPGRAM_API_KEY is not set");

  const params = new URLSearchParams({
    model: "nova-3",
    language: "en",
    diarize: diarize ? "true" : "false",
    utterances: "true",
    punctuate: "true",
    smart_format: "true",
    numerals: "true",
  });

  const body = await fs.readFile(audioPath);
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${deepgramKey}`,
      "Content-Type": "audio/opus",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Deepgram HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json() as Promise<DeepgramResponse>;
}

function wordsToSegment(words: DeepgramWord[]): TranscriptSegment {
  const speakerCounts = new Map<number, number>();
  for (const word of words) {
    if (typeof word.speaker === "number") {
      speakerCounts.set(word.speaker, (speakerCounts.get(word.speaker) ?? 0) + 1);
    }
  }
  const speaker = [...speakerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  return {
    text: words.map((word) => word.punctuated_word ?? word.word ?? "").join(" ").replace(/\s+/g, " ").trim(),
    start: words[0]?.start ?? 0,
    end: words.at(-1)?.end ?? words[0]?.start ?? 0,
    is_final: true,
    speaker_id: speaker,
  };
}

function deepgramSegments(response: DeepgramResponse): TranscriptSegment[] {
  const utterances = response.results?.utterances ?? [];
  if (utterances.length > 0) {
    return utterances
      .filter((utterance) => utterance.transcript && typeof utterance.start === "number")
      .map((utterance) => ({
        text: utterance.transcript ?? "",
        start: utterance.start ?? 0,
        end: utterance.end ?? utterance.start ?? 0,
        is_final: true,
        speaker_id: typeof utterance.speaker === "number" ? utterance.speaker : 0,
      }));
  }

  const alt = response.results?.channels?.[0]?.alternatives?.[0];
  const words = alt?.words ?? [];
  if (words.length === 0 && alt?.transcript) {
    return [{ text: alt.transcript, start: 0, end: 0, is_final: true, speaker_id: 0 }];
  }

  const segments: TranscriptSegment[] = [];
  let current: DeepgramWord[] = [];
  for (const word of words) {
    current.push(word);
    if (current.length >= 28 || /[.!?]$/.test(word.punctuated_word ?? word.word ?? "")) {
      segments.push(wordsToSegment(current));
      current = [];
    }
  }
  if (current.length > 0) segments.push(wordsToSegment(current));
  return segments;
}

function transcriptStats(segments: TranscriptSegment[], response?: DeepgramResponse): ModeTranscriptStats {
  const words = normalizeWords(textFromSegments(segments));
  const speakerCounts = new Map<number, number>();
  for (const segment of segments) {
    if (typeof segment.speaker_id === "number") {
      speakerCounts.set(segment.speaker_id, (speakerCounts.get(segment.speaker_id) ?? 0) + normalizeWords(segment.text).length);
    }
  }
  const totalSpeakerWords = [...speakerCounts.values()].reduce((sum, count) => sum + count, 0);
  const dominantSpeakerShare = totalSpeakerWords > 0
    ? Math.max(...speakerCounts.values()) / totalSpeakerWords
    : null;

  const deepgramWords = response?.results?.channels?.flatMap((channel) =>
    channel.alternatives?.flatMap((alternative) => alternative.words ?? []) ?? [],
  ) ?? [];
  const wordConf = deepgramWords
    .map((word) => word.confidence)
    .filter((value): value is number => typeof value === "number");
  const speakerConf = deepgramWords
    .map((word) => word.speaker_confidence)
    .filter((value): value is number => typeof value === "number");

  return {
    segmentCount: segments.length,
    wordCount: words.length,
    firstStart: segments[0]?.start ?? null,
    lastEnd: segments.at(-1)?.end ?? null,
    observedSpeakers: speakerCounts.size,
    dominantSpeakerShare,
    avgWordConfidence: wordConf.length ? wordConf.reduce((sum, value) => sum + value, 0) / wordConf.length : null,
    avgSpeakerConfidence: speakerConf.length ? speakerConf.reduce((sum, value) => sum + value, 0) / speakerConf.length : null,
  };
}

function hashText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 128);
}

function recentArray(set: Set<string>, max: number): string[] {
  return [...set].slice(Math.max(0, set.size - max));
}

function sourceContext(candidate: Candidate, title: string, channel: string, mode: string): string {
  return [
    "source type: YouTube tri-modal evaluation",
    `candidate id: ${candidate.id}`,
    `mode: ${mode}`,
    `title: ${title}`,
    `channel: ${channel}`,
    `url: ${candidate.url}`,
    `video id: ${candidate.videoId}`,
    `expected speakers: ${candidate.expectedSpeakers}`,
    `evaluation reason: ${candidate.reason}`,
  ].join("\n");
}

function contextFor(utterances: TranscriptSegment[], index: number, sourceCtx: string): string {
  const latest = utterances[index];
  const cutoff = latest.start - 30;
  const transcriptContext = utterances
    .slice(0, index + 1)
    .filter((utterance) => utterance.end >= cutoff)
    .map((utterance) => (
      utterance.speaker_id === null || utterance.speaker_id === undefined
        ? utterance.text
        : `[Speaker ${utterance.speaker_id}] ${utterance.text}`
    ))
    .join(" ");
  return `SOURCE_CONTEXT:\n${sourceCtx}\n\nTRANSCRIPT_CONTEXT:\n${transcriptContext}`;
}

function rhetoricWindow(utterances: TranscriptSegment[], index: number): string {
  const latest = utterances[index];
  const cutoff = latest.end - 60;
  return utterances
    .slice(0, index + 1)
    .filter((utterance) => utterance.end >= cutoff)
    .map((utterance) => `[${Math.floor(utterance.start)}s] ${utterance.text}`)
    .join("\n");
}

function selectIndices(utterances: TranscriptSegment[], max: number): number[] {
  if (max <= 0 || utterances.length <= max) {
    return utterances.map((_, index) => index);
  }
  const indices = new Set<number>();
  for (let i = 0; i < max; i++) {
    indices.add(Math.round((i * (utterances.length - 1)) / (max - 1)));
  }
  return [...indices].sort((a, b) => a - b);
}

async function postJson<T>(baseUrl: string, route: string, body: unknown, timeoutMs: number): Promise<T> {
  const res = await fetch(new URL(route, baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`${route} HTTP ${res.status}: ${(await res.text()).slice(0, 240)}`);
  }
  return res.json() as Promise<T>;
}

async function analyzeMode(args: {
  baseUrl: string;
  mode: ModeAnalysis["mode"];
  candidate: Candidate;
  title: string;
  channel: string;
  segments: TranscriptSegment[];
  maxAnalysisUtterances: number;
  maxVerifyPerMode: number;
  maxConfirmedPerSrt: number;
}): Promise<ModeAnalysis> {
  const utterances = mergeIntoUtterances(args.segments);
  const indices = selectIndices(utterances, args.maxAnalysisUtterances);
  const recentClaims = new Set<string>();
  const recentMarkers = new Set<string>();
  const claims: ClaimAnalysis[] = [];
  const markers: Marker[] = [];
  const errors: ModeAnalysis["errors"] = [];
  const sourceCtx = sourceContext(args.candidate, args.title, args.channel, args.mode);

  for (let selectedIndex = 0; selectedIndex < indices.length; selectedIndex++) {
    const index = indices[selectedIndex];
    const utterance = utterances[index];
    try {
      const extracted = await postJson<{ claims: ExtractedClaim[] }>(
        args.baseUrl,
        "/api/extract-claims",
        {
          utterance: utterance.text,
          utterance_start: utterance.start,
          utterance_end: utterance.end,
          context: contextFor(utterances, index, sourceCtx),
          recent_hashes: recentArray(recentClaims, 30),
        },
        60_000,
      );

      for (const extractedClaim of extracted.claims ?? []) {
        const key = hashText(extractedClaim.claim_text);
        if (recentClaims.has(key)) continue;
        recentClaims.add(key);
        claims.push({
          ...extractedClaim,
          id: `${args.candidate.id}-${args.mode}-claim-${claims.length + 1}`,
          speaker_id: utterance.speaker_id ?? null,
        });
      }
    } catch (err) {
      errors.push({ stage: `extract:${index}`, message: (err as Error).message });
    }

    if ((selectedIndex + 1) % 4 === 0 || selectedIndex === indices.length - 1) {
      try {
        const analyzed = await postJson<{ markers: Marker[] }>(
          args.baseUrl,
          "/api/analyze-rhetoric",
          {
            transcript_window: rhetoricWindow(utterances, index),
            recent_hashes: recentArray(recentMarkers, 40),
            source_context: sourceCtx,
          },
          90_000,
        );
        for (const marker of analyzed.markers ?? []) {
          const key = hashText(`${marker.type}:${marker.excerpt}`);
          if (recentMarkers.has(key)) continue;
          recentMarkers.add(key);
          markers.push(marker);
        }
      } catch (err) {
        errors.push({ stage: `rhetoric:${index}`, message: (err as Error).message });
      }
    }
  }

  for (let i = 0; i < Math.min(args.maxVerifyPerMode, claims.length); i++) {
    try {
      claims[i].provisional = await postJson(
        args.baseUrl,
        "/api/verify-provisional",
        { claim_text: claims[i].claim_text, source_context: sourceCtx },
        60_000,
      );
    } catch (err) {
      claims[i].error = `provisional: ${(err as Error).message}`;
      errors.push({ stage: `verify-provisional:${i}`, message: (err as Error).message });
    }
  }

  if (args.mode === "srt") {
    for (let i = 0; i < Math.min(args.maxConfirmedPerSrt, claims.length); i++) {
      try {
        claims[i].confirmed = await postJson(
          args.baseUrl,
          "/api/verify-confirmed",
          { claim_text: claims[i].claim_text, source_context: sourceCtx },
          150_000,
        );
      } catch (err) {
        claims[i].error = [claims[i].error, `confirmed: ${(err as Error).message}`].filter(Boolean).join("; ");
        errors.push({ stage: `verify-confirmed:${i}`, message: (err as Error).message });
      }
    }
  }

  return {
    mode: args.mode,
    utterancesAvailable: utterances.length,
    utterancesAnalyzed: indices.length,
    claims,
    markers,
    errors,
  };
}

function tokenSet(text: string): Set<string> {
  return new Set(normalizeWords(text).filter((word) => word.length > 2));
}

function setJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function claimSimilarity(a: string, b: string): number {
  return setJaccard(tokenSet(a), tokenSet(b));
}

function analysisClaimJaccard(left: ModeAnalysis, right: ModeAnalysis): number {
  if (left.claims.length === 0 && right.claims.length === 0) return 1;
  if (left.claims.length === 0 || right.claims.length === 0) return 0;
  let matches = 0;
  for (const claim of left.claims) {
    const best = Math.max(...right.claims.map((other) => claimSimilarity(claim.claim_text, other.claim_text)));
    if (best >= 0.62) matches++;
  }
  return matches / Math.max(left.claims.length, right.claims.length);
}

function markerNameOverlap(left: ModeAnalysis, right: ModeAnalysis): number {
  const a = new Set(left.markers.map((marker) => marker.name));
  const b = new Set(right.markers.map((marker) => marker.name));
  return setJaccard(a, b);
}

function provisionalDisagreements(leftMode: string, left: ModeAnalysis, rightMode: string, right: ModeAnalysis) {
  const disagreements: CandidateResult["crossMode"]["provisionalDisagreements"] = [];
  for (const leftClaim of left.claims) {
    const leftLabel = leftClaim.provisional?.primary_label;
    if (!leftLabel) continue;
    const best = right.claims
      .map((rightClaim) => ({ claim: rightClaim, score: claimSimilarity(leftClaim.claim_text, rightClaim.claim_text) }))
      .sort((a, b) => b.score - a.score)[0];
    if (!best || best.score < 0.62) continue;
    const rightLabel = best.claim.provisional?.primary_label;
    if (rightLabel && rightLabel !== leftLabel) {
      disagreements.push({
        leftMode,
        rightMode,
        leftClaim: leftClaim.claim_text,
        rightClaim: best.claim.claim_text,
        leftLabel,
        rightLabel,
      });
    }
  }
  return disagreements;
}

function buildCrossMode(srt: ModeAnalysis, youtube: ModeAnalysis, audio: ModeAnalysis): CandidateResult["crossMode"] {
  return {
    claimJaccard: {
      "srt_vs_youtube_url": analysisClaimJaccard(srt, youtube),
      "srt_vs_audio_production": analysisClaimJaccard(srt, audio),
      "youtube_url_vs_audio_production": analysisClaimJaccard(youtube, audio),
    },
    provisionalDisagreements: [
      ...provisionalDisagreements("srt", srt, "youtube_url", youtube),
      ...provisionalDisagreements("srt", srt, "audio_production", audio),
      ...provisionalDisagreements("youtube_url", youtube, "audio_production", audio),
    ],
    markerNameOverlap: {
      "srt_vs_youtube_url": markerNameOverlap(srt, youtube),
      "srt_vs_audio_production": markerNameOverlap(srt, audio),
      "youtube_url_vs_audio_production": markerNameOverlap(youtube, audio),
    },
    explicitRevisionEvents: 0,
  };
}

function warnForResult(result: Omit<CandidateResult, "warnings">): string[] {
  const warnings: string[] = [];
  const caption = result.captionSource;
  if (!caption) warnings.push("No captions were available through yt-dlp.");
  else if (caption.kind === "auto") warnings.push("SRT baseline uses auto captions, so WER is not human-ground-truth.");

  const urlWer = result.comparisons.youtubeUrlVsSrt?.wer;
  if (typeof urlWer === "number" && urlWer > 0.2) {
    warnings.push(`URL captions diverged from SRT baseline (WER ${(urlWer * 100).toFixed(1)}%).`);
  }
  const drift = result.comparisons.youtubeTimingDriftS;
  if (typeof drift === "number" && Math.abs(drift) > 20) {
    warnings.push(`URL-caption timing drift is large (${drift.toFixed(1)}s vs video duration).`);
  }
  const audioProdSpeakers = result.transcriptStats.audio_production.observedSpeakers;
  if (result.candidate.expectedSpeakers > 1 && audioProdSpeakers <= 1) {
    warnings.push("Production-like audio transcription collapsed speakers to one speaker.");
  }
  const audioWer = result.comparisons.audioProductionVsSrt?.wer;
  if (typeof audioWer === "number" && audioWer > 0.25) {
    warnings.push(`Production-like audio transcript has high drift from SRT (WER ${(audioWer * 100).toFixed(1)}%).`);
  }
  if (result.crossMode.claimJaccard.srt_vs_audio_production < 0.35) {
    warnings.push("SRT and audio modes extracted substantially different claim sets.");
  }
  if (result.crossMode.claimJaccard.srt_vs_youtube_url < 0.35) {
    warnings.push("SRT and YouTube URL modes extracted substantially different claim sets.");
  }
  warnings.push("No explicit later-context revision events were emitted; current output schema does not expose reopen/merge/supersede behavior.");
  return warnings;
}

function labelCounts(claims: ClaimAnalysis[]): string {
  const counts = new Map<string, number>();
  for (const claim of claims) {
    const label = claim.provisional?.primary_label ?? claim.confirmed?.primary_label ?? "unverified";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => `${label}:${count}`).join(", ") || "none";
}

function markerCounts(markers: Marker[]): string {
  const counts = new Map<string, number>();
  for (const marker of markers) {
    counts.set(marker.display || marker.name, (counts.get(marker.display || marker.name) ?? 0) + 1);
  }
  return [...counts.entries()].slice(0, 6).map(([label, count]) => `${label}:${count}`).join(", ") || "none";
}

function reportFor(results: CandidateResult[], runDir: string, args: {
  maxAnalysisUtterances: number;
  maxVerifyPerMode: number;
  maxConfirmedPerSrt: number;
}) {
  const lines: string[] = [];
  lines.push("# Yentl Tri-Modal Evaluation Run");
  lines.push("");
  lines.push(`Run: \`${path.basename(runDir)}\``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Scope");
  lines.push("");
  lines.push(`- Candidates tested: ${results.length}`);
  lines.push(`- Modes analyzed: SRT/text baseline, production-like audio transcription, current YouTube URL caption ingest.`);
  lines.push(`- Diagnostic-only extra: diarized audio transcription for speaker-capability comparison.`);
  lines.push(`- Analysis sampling: up to ${args.maxAnalysisUtterances} merged utterances per video/mode, evenly spread across the source.`);
  lines.push(`- Provisional verification: up to ${args.maxVerifyPerMode} claims per video/mode.`);
  lines.push(`- Confirmed/web verification: up to ${args.maxConfirmedPerSrt} SRT-baseline claims per video.`);
  lines.push("");
  lines.push("## Transcript Reliability");
  lines.push("");
  lines.push("| Candidate | Captions | URL vs SRT WER | URL Drift | Audio Prod vs SRT WER | Audio Prod Speakers | Audio Diag Speakers | Warnings |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---|");
  for (const result of results) {
    lines.push([
      `| ${result.candidate.id}`,
      result.captionSource ? `${result.captionSource.kind}:${result.captionSource.lang}` : "none",
      formatPct(result.comparisons.youtubeUrlVsSrt?.wer),
      `${formatNum(result.comparisons.youtubeTimingDriftS)}s`,
      formatPct(result.comparisons.audioProductionVsSrt?.wer),
      String(result.transcriptStats.audio_production.observedSpeakers),
      String(result.transcriptStats.audio_diagnostic_diarized.observedSpeakers),
      result.warnings.join("<br>"),
      "|",
    ].join(" | "));
  }
  lines.push("");
  lines.push("## Analysis Consistency");
  lines.push("");
  lines.push("| Candidate | Mode | Utterances | Claims | Provisional Labels | Markers | Marker Topline | Errors |");
  lines.push("|---|---|---:|---:|---|---:|---|---:|");
  for (const result of results) {
    for (const mode of ["srt", "youtube_url", "audio_production"] as const) {
      const analysis = result.analysis[mode];
      lines.push([
        `| ${result.candidate.id}`,
        mode,
        `${analysis.utterancesAnalyzed}/${analysis.utterancesAvailable}`,
        String(analysis.claims.length),
        labelCounts(analysis.claims),
        String(analysis.markers.length),
        markerCounts(analysis.markers),
        String(analysis.errors.length),
        "|",
      ].join(" | "));
    }
  }
  lines.push("");
  lines.push("## Cross-Mode Discrepancies");
  lines.push("");
  lines.push("| Candidate | Claim Jaccard SRT/YT | Claim Jaccard SRT/Audio | Marker Overlap SRT/YT | Marker Overlap SRT/Audio | Verdict Disagreements | Revision Events |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const result of results) {
    lines.push([
      `| ${result.candidate.id}`,
      formatPct(result.crossMode.claimJaccard.srt_vs_youtube_url),
      formatPct(result.crossMode.claimJaccard.srt_vs_audio_production),
      formatPct(result.crossMode.markerNameOverlap.srt_vs_youtube_url),
      formatPct(result.crossMode.markerNameOverlap.srt_vs_audio_production),
      String(result.crossMode.provisionalDisagreements.length),
      String(result.crossMode.explicitRevisionEvents),
      "|",
    ].join(" | "));
  }
  lines.push("");
  lines.push("## Confirmed Fact-Check Samples");
  lines.push("");
  for (const result of results) {
    lines.push(`### ${result.candidate.id}`);
    const confirmed = result.analysis.srt.claims.filter((claim) => claim.confirmed);
    if (confirmed.length === 0) {
      lines.push("");
      lines.push("- No confirmed samples returned.");
      lines.push("");
      continue;
    }
    for (const claim of confirmed) {
      const sources = Array.isArray(claim.confirmed?.sources) ? claim.confirmed.sources.length : 0;
      lines.push(`- ${claim.confirmed?.primary_label ?? "n/a"} (${formatNum(claim.confirmed?.score, 2)}, sources ${sources}): ${claim.claim_text}`);
    }
    lines.push("");
  }
  lines.push("## Artifact Paths");
  lines.push("");
  lines.push(`- Summary JSON: \`${path.join(runDir, "summary.json")}\``);
  lines.push(`- Per-candidate assets and analysis: \`${path.join(runDir, "candidates")}\``);
  lines.push("");
  lines.push("## Interpretation Notes");
  lines.push("");
  lines.push("- Treat high URL-vs-SRT WER or timing drift as an ingest-layer problem before blaming claim reasoning.");
  lines.push("- Treat production audio speaker collapse as current product behavior unless a diarization consent path is enabled.");
  lines.push("- The current analysis outputs do not expose first-class later-context revision events, so revision score is recorded as zero rather than inferred.");
  return lines.join("\n");
}

async function processCandidate(candidate: Candidate, runDir: string, args: {
  baseUrl: string;
  maxAnalysisUtterances: number;
  maxVerifyPerMode: number;
  maxConfirmedPerSrt: number;
}): Promise<CandidateResult> {
  const candidateDir = path.join(runDir, "candidates", candidate.id);
  await fs.mkdir(candidateDir, { recursive: true });

  const info = await getInfo(candidate);
  const title = info.title;
  const channel = info.channel ?? info.uploader ?? "unknown";
  const durationS = Number(info.duration ?? 0);
  await fs.writeFile(path.join(candidateDir, "yt-dlp-info.json"), JSON.stringify(info, null, 2));

  const captionSource = chooseCaptionSource(info);
  if (!captionSource) throw new Error(`No English caption source for ${candidate.id}`);

  const srtPath = await downloadSrt(candidate, captionSource, candidateDir);
  const audioPath = await downloadAudio(candidate, candidateDir);
  const srtContent = await fs.readFile(srtPath, "utf8");
  const srtSegments = parseSrt(srtContent);
  await fs.writeFile(path.join(candidateDir, "srt-segments.json"), JSON.stringify(srtSegments, null, 2));

  let urlSegments: TranscriptSegment[] = [];
  try {
    urlSegments = await fetchCaptions(candidate.videoId);
  } catch (err) {
    await fs.writeFile(path.join(candidateDir, "url-captions-error.txt"), (err as Error).message);
  }
  await fs.writeFile(path.join(candidateDir, "url-captions.json"), JSON.stringify(urlSegments, null, 2));

  const prodTranscriptPath = path.join(candidateDir, "audio-production-deepgram.json");
  const diagTranscriptPath = path.join(candidateDir, "audio-diagnostic-diarized-deepgram.json");
  let audioProd: DeepgramResponse;
  let audioDiag: DeepgramResponse;

  const prodCached = await fs.readFile(prodTranscriptPath, "utf8").then((text) => JSON.parse(text) as DeepgramResponse, () => null);
  if (prodCached) audioProd = prodCached;
  else {
    audioProd = await transcribeAudio(audioPath, false);
    await fs.writeFile(prodTranscriptPath, JSON.stringify(audioProd, null, 2));
  }

  const diagCached = await fs.readFile(diagTranscriptPath, "utf8").then((text) => JSON.parse(text) as DeepgramResponse, () => null);
  if (diagCached) audioDiag = diagCached;
  else {
    audioDiag = await transcribeAudio(audioPath, true);
    await fs.writeFile(diagTranscriptPath, JSON.stringify(audioDiag, null, 2));
  }

  const audioProdSegments = deepgramSegments(audioProd);
  const audioDiagSegments = deepgramSegments(audioDiag);
  await fs.writeFile(path.join(candidateDir, "audio-production-segments.json"), JSON.stringify(audioProdSegments, null, 2));
  await fs.writeFile(path.join(candidateDir, "audio-diagnostic-diarized-segments.json"), JSON.stringify(audioDiagSegments, null, 2));

  const analysisDir = path.join(candidateDir, "analysis");
  await fs.mkdir(analysisDir, { recursive: true });
  const srtAnalysis = await analyzeMode({
    baseUrl: args.baseUrl,
    mode: "srt",
    candidate,
    title,
    channel,
    segments: srtSegments,
    maxAnalysisUtterances: args.maxAnalysisUtterances,
    maxVerifyPerMode: args.maxVerifyPerMode,
    maxConfirmedPerSrt: args.maxConfirmedPerSrt,
  });
  await fs.writeFile(path.join(analysisDir, "srt.json"), JSON.stringify(srtAnalysis, null, 2));

  const urlAnalysis = await analyzeMode({
    baseUrl: args.baseUrl,
    mode: "youtube_url",
    candidate,
    title,
    channel,
    segments: urlSegments,
    maxAnalysisUtterances: args.maxAnalysisUtterances,
    maxVerifyPerMode: args.maxVerifyPerMode,
    maxConfirmedPerSrt: args.maxConfirmedPerSrt,
  });
  await fs.writeFile(path.join(analysisDir, "youtube-url.json"), JSON.stringify(urlAnalysis, null, 2));

  const audioAnalysis = await analyzeMode({
    baseUrl: args.baseUrl,
    mode: "audio_production",
    candidate,
    title,
    channel,
    segments: audioProdSegments,
    maxAnalysisUtterances: args.maxAnalysisUtterances,
    maxVerifyPerMode: args.maxVerifyPerMode,
    maxConfirmedPerSrt: args.maxConfirmedPerSrt,
  });
  await fs.writeFile(path.join(analysisDir, "audio-production.json"), JSON.stringify(audioAnalysis, null, 2));

  const baseResult = {
    candidate,
    title,
    channel,
    durationS,
    captionSource,
    paths: {
      srt: srtPath,
      audio: audioPath,
      urlCaptions: path.join(candidateDir, "url-captions.json"),
      audioProductionTranscript: prodTranscriptPath,
      audioDiagnosticTranscript: diagTranscriptPath,
    },
    transcriptStats: {
      srt: transcriptStats(srtSegments),
      youtube_url: transcriptStats(urlSegments),
      audio_production: transcriptStats(audioProdSegments, audioProd),
      audio_diagnostic_diarized: transcriptStats(audioDiagSegments, audioDiag),
    },
    comparisons: {
      youtubeUrlVsSrt: compareSegments(srtSegments, urlSegments),
      audioProductionVsSrt: compareSegments(srtSegments, audioProdSegments),
      audioDiagnosticVsSrt: compareSegments(srtSegments, audioDiagSegments),
      youtubeTimingDriftS: durationS > 0 && urlSegments.at(-1)?.end !== undefined
        ? (urlSegments.at(-1)?.end ?? 0) - durationS
        : null,
    },
    analysis: {
      srt: srtAnalysis,
      youtube_url: urlAnalysis,
      audio_production: audioAnalysis,
    },
    crossMode: buildCrossMode(srtAnalysis, urlAnalysis, audioAnalysis),
  };

  const result: CandidateResult = {
    ...baseResult,
    warnings: warnForResult(baseResult),
  };
  await fs.writeFile(path.join(candidateDir, "result.json"), JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const baseUrl = argValue("--base-url") ?? process.env.YENTL_BASE_URL ?? DEFAULT_BASE_URL;
  const maxAnalysisUtterances = Number(argValue("--max-analysis-utterances") ?? "") || envInt("YENTL_TRIMODAL_MAX_UTTERANCES", DEFAULT_MAX_ANALYSIS_UTTERANCES);
  const maxVerifyPerMode = Number(argValue("--max-verify-per-mode") ?? "") || envInt("YENTL_TRIMODAL_MAX_VERIFY", DEFAULT_MAX_VERIFY_PER_MODE);
  const maxConfirmedPerSrt = Number(argValue("--max-confirmed-per-srt") ?? "") || envInt("YENTL_TRIMODAL_MAX_CONFIRMED", DEFAULT_MAX_CONFIRMED_PER_SRT);
  const onlyIds = argValue("--ids")?.split(",").map((id) => id.trim()).filter(Boolean);
  const includeStress = !hasArg("--primary-only");

  const runDir = path.resolve(argValue("--out") ?? path.join(repoRoot, "agent-work", "yentl-trimodal-evaluation", "runs", runId));
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(path.join(runDir, "run-config.json"), JSON.stringify({
    runId: path.basename(runDir),
    baseUrl,
    maxAnalysisUtterances,
    maxVerifyPerMode,
    maxConfirmedPerSrt,
    includeStress,
    onlyIds,
    candidates: CANDIDATES,
  }, null, 2));

  const health = await fetch(baseUrl).then((res) => res.status, () => 0);
  if (health === 0) {
    throw new Error(`Could not reach ${baseUrl}. Start the Next dev server first.`);
  }

  const selected = CANDIDATES.filter((candidate) => {
    if (!includeStress && candidate.group === "stress") return false;
    if (onlyIds && !onlyIds.includes(candidate.id)) return false;
    return true;
  });

  const results: CandidateResult[] = [];
  for (let i = 0; i < selected.length; i++) {
    const candidate = selected[i];
    console.log(`[${i + 1}/${selected.length}] ${candidate.id}`);
    try {
      const result = await processCandidate(candidate, runDir, {
        baseUrl,
        maxAnalysisUtterances,
        maxVerifyPerMode,
        maxConfirmedPerSrt,
      });
      results.push(result);
      console.log(`  ok: srt=${result.analysis.srt.claims.length} claims, url=${result.analysis.youtube_url.claims.length}, audio=${result.analysis.audio_production.claims.length}`);
      console.log(`  WER url=${formatPct(result.comparisons.youtubeUrlVsSrt?.wer)} audio=${formatPct(result.comparisons.audioProductionVsSrt?.wer)}`);
    } catch (err) {
      const errorPath = path.join(runDir, "candidates", candidate.id, "error.txt");
      await fs.mkdir(path.dirname(errorPath), { recursive: true });
      await fs.writeFile(errorPath, (err as Error).stack ?? (err as Error).message);
      console.log(`  fail: ${(err as Error).message}`);
    }
  }

  await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify({ runDir, results }, null, 2));
  await fs.writeFile(path.join(runDir, "report.md"), reportFor(results, runDir, {
    maxAnalysisUtterances,
    maxVerifyPerMode,
    maxConfirmedPerSrt,
  }));
  console.log(`\nReport: ${path.join(runDir, "report.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
