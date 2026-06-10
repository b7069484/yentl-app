import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "csv-parse/sync";

export const REPO_ROOT = path.resolve(import.meta.dirname ?? __dirname, "..", "..");

type ManifestRow = {
  window_id: string;
  corpus_id: string;
  source_id: string;
  start_s: string;
  end_s: string;
  failure_family: string;
  expected_risk: string;
  review_required: string;
  label_path: string;
  notes: string;
};

type ReferenceSpan = {
  id: string;
  start_s: number;
  end_s: number;
  speaker_id?: string;
  owner_speaker_id?: string;
  expected_provider_speaker_id?: number | null;
  overlap_class?: string;
  stance?: string;
  unsafe_attribution?: boolean;
};

type UnsafeSpan = {
  id: string;
  start_s: number;
  end_s: number;
  reason: string;
};

type Sidecar = {
  schema_version: number;
  window_id: string;
  corpus_id: string;
  source_id: string;
  start_s: number;
  end_s: number;
  reviewer?: string;
  review_date?: string;
  transcript_usable?: boolean;
  labels?: {
    reference_text?: string;
    turns?: ReferenceSpan[];
    claims?: ReferenceSpan[];
    markers?: ReferenceSpan[];
    unsafe_attribution_spans?: UnsafeSpan[];
  };
};

type DeepgramWord = {
  word?: string;
  punctuated_word?: string;
  start?: number;
  end?: number;
  confidence?: number;
  speaker?: number;
  speaker_confidence?: number;
};

type DeepgramTranscript = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        words?: DeepgramWord[];
      }>;
    }>;
  };
};

type SpanStats = {
  words: DeepgramWord[];
  wordCount: number;
  duration: number;
  speakerDurations: Map<number, number>;
  meanSpeakerConfidence: number | null;
  dominantSpeaker: number | null;
};

export type WindowScore = {
  window_id: string;
  corpus_id: string;
  source_id: string;
  start_s: number;
  end_s: number;
  failure_family: string;
  expected_risk: string;
  review_required: boolean;
  label_status: "missing" | "partial" | "scored" | "error";
  missing_labels: string[];
  transcript_status: "present" | "missing";
  word_count: number;
  speaker_purity: number | null;
  speaker_time_error: number | null;
  claim_owner_accuracy: number | null;
  unsafe_attribution_recall: number | null;
  quote_vs_endorsement_errors: number | null;
  marker_owner_accuracy: number | null;
  wer: number | null;
  warnings: string[];
};

export type AttributionReport = {
  generated_at: string;
  summary: {
    windows: number;
    scored: number;
    partial: number;
    missing_labels: number;
    missing_transcripts: number;
    review_required: number;
    mean_speaker_purity: number | null;
    mean_claim_owner_accuracy: number | null;
    unsafe_attribution_recall: number | null;
    quote_vs_endorsement_errors: number;
  };
  windows: WindowScore[];
};

type ScoreOptions = {
  repoRoot?: string;
  manifests?: string[];
  outDir?: string;
  publicDir?: string | null;
  speakerConfidenceThreshold?: number;
};

function parseBool(value: string | undefined): boolean {
  return (value ?? "").trim().toUpperCase() === "TRUE" || (value ?? "").trim().toLowerCase() === "true";
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

function readWords(transcript: DeepgramTranscript | null): DeepgramWord[] {
  return transcript?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
}

function wordsInWindow(words: DeepgramWord[], startS: number, endS: number): DeepgramWord[] {
  return words.filter((word) => {
    const start = typeof word.start === "number" ? word.start : null;
    const end = typeof word.end === "number" ? word.end : null;
    if (start === null || end === null) return false;
    return end > startS && start < endS;
  });
}

function wordDuration(word: DeepgramWord): number {
  if (typeof word.start !== "number" || typeof word.end !== "number") return 0;
  return Math.max(0, word.end - word.start);
}

function spanStats(words: DeepgramWord[], startS: number, endS: number): SpanStats {
  const spanWords = wordsInWindow(words, startS, endS);
  const speakerDurations = new Map<number, number>();
  const speakerConfidence: number[] = [];
  let duration = 0;

  for (const word of spanWords) {
    const dur = wordDuration(word);
    duration += dur;
    if (typeof word.speaker === "number") {
      speakerDurations.set(word.speaker, (speakerDurations.get(word.speaker) ?? 0) + dur);
    }
    if (typeof word.speaker_confidence === "number" && Number.isFinite(word.speaker_confidence)) {
      speakerConfidence.push(word.speaker_confidence);
    }
  }

  let dominantSpeaker: number | null = null;
  let dominantDuration = -1;
  for (const [speaker, dur] of speakerDurations.entries()) {
    if (dur > dominantDuration) {
      dominantSpeaker = speaker;
      dominantDuration = dur;
    }
  }

  return {
    words: spanWords,
    wordCount: spanWords.length,
    duration,
    speakerDurations,
    dominantSpeaker,
    meanSpeakerConfidence: speakerConfidence.length
      ? speakerConfidence.reduce((sum, value) => sum + value, 0) / speakerConfidence.length
      : null,
  };
}

function baselinePredictUnsafe(stats: SpanStats, speakerConfidenceThreshold: number): boolean {
  if (stats.wordCount === 0) return true;
  if (stats.speakerDurations.size > 1) return true;
  return stats.meanSpeakerConfidence !== null && stats.meanSpeakerConfidence < speakerConfidenceThreshold;
}

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function wer(referenceText: string, hypothesisText: string): number | null {
  const ref = normalize(referenceText);
  const hyp = normalize(hypothesisText);
  if (ref.length === 0) return hyp.length === 0 ? 0 : 1;

  const dp = Array.from({ length: ref.length + 1 }, () => new Uint32Array(hyp.length + 1));
  for (let i = 0; i <= ref.length; i++) dp[i][0] = i;
  for (let j = 0; j <= hyp.length; j++) dp[0][j] = j;

  for (let i = 1; i <= ref.length; i++) {
    for (let j = 1; j <= hyp.length; j++) {
      const sub = dp[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1);
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      dp[i][j] = Math.min(sub, del, ins);
    }
  }

  return dp[ref.length][hyp.length] / ref.length;
}

function pct(value: number | null): string {
  return value === null || Number.isNaN(value) ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function average(values: Array<number | null>): number | null {
  const clean = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreSpeakerPurity(turns: ReferenceSpan[] | undefined, words: DeepgramWord[], missing: string[]): number | null {
  if (!turns?.length) {
    missing.push("turn_labels");
    return null;
  }

  let expectedDuration = 0;
  let matchingDuration = 0;
  let scoredAny = false;

  for (const turn of turns) {
    if (typeof turn.expected_provider_speaker_id !== "number") {
      missing.push(`turn:${turn.id}:expected_provider_speaker_id`);
      continue;
    }
    const stats = spanStats(words, turn.start_s, turn.end_s);
    if (stats.wordCount === 0 || stats.duration === 0) {
      missing.push(`turn:${turn.id}:transcript_words`);
      continue;
    }
    scoredAny = true;
    expectedDuration += stats.duration;
    matchingDuration += stats.speakerDurations.get(turn.expected_provider_speaker_id) ?? 0;
  }

  return scoredAny && expectedDuration > 0 ? matchingDuration / expectedDuration : null;
}

function scoreOwnerAccuracy(spans: ReferenceSpan[] | undefined, words: DeepgramWord[], labelName: string, missing: string[]): number | null {
  if (!spans?.length) return null;

  let correct = 0;
  let scored = 0;
  for (const span of spans) {
    if (typeof span.expected_provider_speaker_id !== "number") {
      missing.push(`${labelName}:${span.id}:expected_provider_speaker_id`);
      continue;
    }
    const stats = spanStats(words, span.start_s, span.end_s);
    if (stats.dominantSpeaker === null) {
      missing.push(`${labelName}:${span.id}:dominant_speaker`);
      continue;
    }
    scored++;
    if (stats.dominantSpeaker === span.expected_provider_speaker_id) correct++;
  }

  return scored ? correct / scored : null;
}

function scoreUnsafeRecall(spans: UnsafeSpan[] | undefined, words: DeepgramWord[], speakerConfidenceThreshold: number): number | null {
  if (!spans?.length) return null;

  let recalled = 0;
  for (const span of spans) {
    const stats = spanStats(words, span.start_s, span.end_s);
    if (baselinePredictUnsafe(stats, speakerConfidenceThreshold)) recalled++;
  }
  return recalled / spans.length;
}

function scoreQuoteErrors(claims: ReferenceSpan[] | undefined): number | null {
  if (!claims?.length) return null;
  return claims.filter((claim) => claim.stance && claim.stance !== "asserted").length;
}

async function readManifest(manifestPath: string): Promise<ManifestRow[]> {
  const text = await fs.readFile(manifestPath, "utf8");
  return parse(text, { columns: true, skip_empty_lines: true, trim: true }) as ManifestRow[];
}

function resolveLabelPath(repoRoot: string, row: ManifestRow): string {
  if (path.isAbsolute(row.label_path)) return row.label_path;
  return path.join(repoRoot, row.corpus_id, row.label_path);
}

async function scoreWindow(
  repoRoot: string,
  row: ManifestRow,
  speakerConfidenceThreshold: number
): Promise<WindowScore> {
  const startS = Number(row.start_s);
  const endS = Number(row.end_s);
  const missingLabels: string[] = [];
  const warnings: string[] = [];
  const transcriptPath = path.join(repoRoot, row.corpus_id, "transcripts", `${row.source_id}.json`);
  const labelPath = resolveLabelPath(repoRoot, row);
  const transcript = await readJson<DeepgramTranscript>(transcriptPath);
  const transcriptStatus = transcript ? "present" : "missing";
  const words = readWords(transcript);
  const windowWords = wordsInWindow(words, startS, endS);

  if (!transcript) warnings.push(`Missing transcript: ${path.relative(repoRoot, transcriptPath)}`);

  if (!(await fileExists(labelPath))) {
    return {
      window_id: row.window_id,
      corpus_id: row.corpus_id,
      source_id: row.source_id,
      start_s: startS,
      end_s: endS,
      failure_family: row.failure_family,
      expected_risk: row.expected_risk,
      review_required: parseBool(row.review_required),
      label_status: "missing",
      missing_labels: [`sidecar:${path.relative(repoRoot, labelPath)}`],
      transcript_status: transcriptStatus,
      word_count: windowWords.length,
      speaker_purity: null,
      speaker_time_error: null,
      claim_owner_accuracy: null,
      unsafe_attribution_recall: null,
      quote_vs_endorsement_errors: null,
      marker_owner_accuracy: null,
      wer: null,
      warnings,
    };
  }

  const sidecar = await readJson<Sidecar>(labelPath);
  if (!sidecar?.labels) {
    return {
      window_id: row.window_id,
      corpus_id: row.corpus_id,
      source_id: row.source_id,
      start_s: startS,
      end_s: endS,
      failure_family: row.failure_family,
      expected_risk: row.expected_risk,
      review_required: parseBool(row.review_required),
      label_status: "error",
      missing_labels: ["sidecar_labels"],
      transcript_status: transcriptStatus,
      word_count: windowWords.length,
      speaker_purity: null,
      speaker_time_error: null,
      claim_owner_accuracy: null,
      unsafe_attribution_recall: null,
      quote_vs_endorsement_errors: null,
      marker_owner_accuracy: null,
      wer: null,
      warnings: [...warnings, `Invalid sidecar: ${path.relative(repoRoot, labelPath)}`],
    };
  }

  const speakerPurity = scoreSpeakerPurity(sidecar.labels.turns, words, missingLabels);
  const claimOwnerAccuracy = scoreOwnerAccuracy(sidecar.labels.claims, words, "claim", missingLabels);
  const markerOwnerAccuracy = scoreOwnerAccuracy(sidecar.labels.markers, words, "marker", missingLabels);
  const unsafeRecall = scoreUnsafeRecall(sidecar.labels.unsafe_attribution_spans, words, speakerConfidenceThreshold);
  const quoteErrors = scoreQuoteErrors(sidecar.labels.claims);
  const hypothesisText = windowWords.map((word) => word.punctuated_word ?? word.word ?? "").join(" ");
  const windowWer = sidecar.labels.reference_text ? wer(sidecar.labels.reference_text, hypothesisText) : null;

  if (!sidecar.labels.reference_text) missingLabels.push("reference_text");
  if (!Array.isArray(sidecar.labels.claims)) missingLabels.push("claim_labels");
  if (!Array.isArray(sidecar.labels.unsafe_attribution_spans)) missingLabels.push("unsafe_attribution_spans");
  if (!Array.isArray(sidecar.labels.markers)) missingLabels.push("marker_labels");

  return {
    window_id: row.window_id,
    corpus_id: row.corpus_id,
    source_id: row.source_id,
    start_s: startS,
    end_s: endS,
    failure_family: row.failure_family,
    expected_risk: row.expected_risk,
    review_required: parseBool(row.review_required),
    label_status: missingLabels.length ? "partial" : "scored",
    missing_labels: [...new Set(missingLabels)],
    transcript_status: transcriptStatus,
    word_count: windowWords.length,
    speaker_purity: speakerPurity,
    speaker_time_error: speakerPurity === null ? null : 1 - speakerPurity,
    claim_owner_accuracy: claimOwnerAccuracy,
    unsafe_attribution_recall: unsafeRecall,
    quote_vs_endorsement_errors: quoteErrors,
    marker_owner_accuracy: markerOwnerAccuracy,
    wer: windowWer,
    warnings,
  };
}

function summarize(windows: WindowScore[]): AttributionReport["summary"] {
  const unsafeExpected = windows.filter((window) => window.unsafe_attribution_recall !== null);
  const quoteErrors = windows.reduce((sum, window) => sum + (window.quote_vs_endorsement_errors ?? 0), 0);
  return {
    windows: windows.length,
    scored: windows.filter((window) => window.label_status === "scored").length,
    partial: windows.filter((window) => window.label_status === "partial").length,
    missing_labels: windows.filter((window) => window.label_status === "missing").length,
    missing_transcripts: windows.filter((window) => window.transcript_status === "missing").length,
    review_required: windows.filter((window) => window.review_required).length,
    mean_speaker_purity: average(windows.map((window) => window.speaker_purity)),
    mean_claim_owner_accuracy: average(windows.map((window) => window.claim_owner_accuracy)),
    unsafe_attribution_recall: unsafeExpected.length ? average(unsafeExpected.map((window) => window.unsafe_attribution_recall)) : null,
    quote_vs_endorsement_errors: quoteErrors,
  };
}

function renderHtml(report: AttributionReport): string {
  const rows = report.windows.map((window) => `
      <tr>
        <td>${escapeHtml(window.window_id)}</td>
        <td>${escapeHtml(window.corpus_id)}/${escapeHtml(window.source_id)}</td>
        <td>${escapeHtml(window.failure_family)}</td>
        <td>${escapeHtml(window.label_status)}</td>
        <td>${pct(window.speaker_purity)}</td>
        <td>${pct(window.claim_owner_accuracy)}</td>
        <td>${pct(window.unsafe_attribution_recall)}</td>
        <td>${window.quote_vs_endorsement_errors ?? "n/a"}</td>
        <td>${pct(window.wer)}</td>
        <td>${escapeHtml(window.missing_labels.join(", ") || "none")}</td>
      </tr>`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Yentl Speaker Attribution Hard Windows</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #18202f; background: #f7f8fb; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 24px 0; }
    .metric { background: white; border: 1px solid #d9deea; border-radius: 8px; padding: 12px; }
    .metric strong { display: block; font-size: 20px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d9deea; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e7eaf1; font-size: 13px; vertical-align: top; }
    th { background: #eef2f8; font-size: 12px; text-transform: uppercase; letter-spacing: .02em; }
  </style>
</head>
<body>
  <h1>Yentl Speaker Attribution Hard Windows</h1>
  <p>Generated ${escapeHtml(report.generated_at)}. Missing labels are blockers, not passes.</p>
  <section class="summary">
    <div class="metric">Windows<strong>${report.summary.windows}</strong></div>
    <div class="metric">Scored<strong>${report.summary.scored}</strong></div>
    <div class="metric">Partial<strong>${report.summary.partial}</strong></div>
    <div class="metric">Missing Labels<strong>${report.summary.missing_labels}</strong></div>
    <div class="metric">Mean Speaker Purity<strong>${pct(report.summary.mean_speaker_purity)}</strong></div>
    <div class="metric">Mean Claim Owner Accuracy<strong>${pct(report.summary.mean_claim_owner_accuracy)}</strong></div>
  </section>
  <table>
    <thead>
      <tr>
        <th>Window</th>
        <th>Source</th>
        <th>Failure Family</th>
        <th>Labels</th>
        <th>Speaker Purity</th>
        <th>Claim Owner</th>
        <th>Unsafe Recall</th>
        <th>Quote Errors</th>
        <th>WER</th>
        <th>Missing</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

async function writeReport(report: AttributionReport, outDir: string, publicDir: string | null): Promise<void> {
  await fs.mkdir(outDir, { recursive: true });
  const json = JSON.stringify(report, null, 2);
  const html = renderHtml(report);
  await fs.writeFile(path.join(outDir, "speaker-attribution-report.json"), json);
  await fs.writeFile(path.join(outDir, "index.html"), html);

  if (publicDir) {
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(path.join(publicDir, "speaker-attribution-report.json"), json);
    await fs.writeFile(path.join(publicDir, "index.html"), html);
  }
}

export async function scoreHardWindows(options: ScoreOptions = {}): Promise<AttributionReport> {
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const manifests = options.manifests ?? [
    path.join(repoRoot, "test-corpus", "speaker-attribution-windows.csv"),
    path.join(repoRoot, "test-corpus-2", "speaker-attribution-windows.csv"),
  ];
  const windows: WindowScore[] = [];
  for (const manifest of manifests) {
    const rows = await readManifest(manifest);
    for (const row of rows) {
      windows.push(await scoreWindow(repoRoot, row, options.speakerConfidenceThreshold ?? 0.55));
    }
  }

  const report: AttributionReport = {
    generated_at: new Date().toISOString(),
    summary: summarize(windows),
    windows,
  };

  const outDir = options.outDir ?? path.join(repoRoot, "test-corpus", "speaker-attribution", "report");
  const publicDir = options.publicDir === undefined
    ? path.join(repoRoot, "public", "speaker-attribution-report")
    : options.publicDir;
  await writeReport(report, outDir, publicDir);
  return report;
}

function cliOptions(argv: string[]): ScoreOptions {
  const opts: ScoreOptions = {};
  const manifests: string[] = [];
  for (const arg of argv) {
    if (arg.startsWith("--manifest=")) manifests.push(path.resolve(arg.slice("--manifest=".length)));
    else if (arg.startsWith("--out-dir=")) opts.outDir = path.resolve(arg.slice("--out-dir=".length));
    else if (arg === "--no-public") opts.publicDir = null;
    else if (arg.startsWith("--public-dir=")) opts.publicDir = path.resolve(arg.slice("--public-dir=".length));
    else if (arg.startsWith("--speaker-confidence-threshold=")) {
      opts.speakerConfidenceThreshold = Number(arg.slice("--speaker-confidence-threshold=".length));
    }
  }
  if (manifests.length) opts.manifests = manifests;
  return opts;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const report = await scoreHardWindows(cliOptions(argv));
  console.log(`Speaker-attribution windows: ${report.summary.windows}`);
  console.log(`Scored: ${report.summary.scored}, partial: ${report.summary.partial}, missing labels: ${report.summary.missing_labels}`);
  console.log(`Mean speaker purity: ${pct(report.summary.mean_speaker_purity)}`);
  console.log(`Mean claim-owner accuracy: ${pct(report.summary.mean_claim_owner_accuracy)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
