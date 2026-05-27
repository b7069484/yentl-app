import { promises as fs } from "node:fs";
import path from "node:path";
import { readVideos, TRANSCRIPTS_DIR, GROUND_TRUTH_DIR, SCORES_DIR, LOGS_DIR, logLine } from "./_shared.js";

const LOG = path.join(LOGS_DIR, "score-wer.log");

function parseTimestamp(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const secondsPart = Number(parts.at(-1));
  const minutesPart = Number(parts.at(-2));
  const hoursPart = parts.length === 3 ? Number(parts[0]) : 0;
  if ([secondsPart, minutesPart, hoursPart].some((part) => Number.isNaN(part))) return null;
  return hoursPart * 3600 + minutesPart * 60 + secondsPart;
}

function cueOverlapsClip(startS: number | null, endS: number | null, clip?: { startS: number; endS: number }): boolean {
  if (!clip || startS === null || endS === null) return true;
  return endS >= clip.startS && startS <= clip.endS;
}

function cleanVttText(line: string): string {
  return line.replace(/<[^>]+>/g, "").trim();
}

function parseVtt(vtt: string, clip?: { startS: number; endS: number }): string {
  const lines = vtt.split(/\r?\n/);
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("WEBVTT")) continue;
    if (line.startsWith("NOTE")) continue;
    if (line.startsWith("STYLE")) continue;
    if (line.startsWith("REGION")) continue;

    const timingLine = line.includes("-->") ? line : lines[i + 1]?.trim();
    if (!timingLine?.includes("-->")) continue;
    if (timingLine !== line) i++;

    const [rawStart, rawEnd] = timingLine.split("-->");
    const startS = parseTimestamp(rawStart);
    const endS = parseTimestamp(rawEnd.trim().split(/\s+/)[0]);
    const cueLines: string[] = [];

    while (i + 1 < lines.length && lines[i + 1].trim()) {
      i++;
      const cleaned = cleanVttText(lines[i]);
      if (cleaned) cueLines.push(cleaned);
    }

    if (cueOverlapsClip(startS, endS, clip)) {
      out.push(...cueLines);
    }
  }

  return out.join(" ");
}

function extractDeepgramTranscript(json: { results?: { channels?: { alternatives?: { transcript?: string }[] }[] } }): string {
  return json.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
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

type WerResult = {
  wer: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  hits: number;
  refLen: number;
  hypLen: number;
};

function computeWer(ref: string[], hyp: string[]): WerResult {
  const m = ref.length;
  const n = hyp.length;
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
      const sub = dp[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1);
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      let best = sub;
      let code = ref[i - 1] === hyp[j - 1] ? 3 : 4;
      if (del < best) { best = del; code = 2; }
      if (ins < best) { best = ins; code = 1; }
      dp[i][j] = best;
      op[i][j] = code;
    }
  }

  let i = m, j = n;
  let s = 0, d = 0, ins = 0, hits = 0;
  while (i > 0 || j > 0) {
    const code = op[i][j];
    if (code === 3) { hits++; i--; j--; }
    else if (code === 4) { s++; i--; j--; }
    else if (code === 2) { d++; i--; }
    else if (code === 1) { ins++; j--; }
    else break;
  }

  const wer = m === 0 ? (n === 0 ? 0 : 1) : (s + d + ins) / m;
  return { wer, substitutions: s, deletions: d, insertions: ins, hits, refLen: m, hypLen: n };
}

async function main() {
  await fs.mkdir(SCORES_DIR, { recursive: true });
  await fs.mkdir(LOGS_DIR, { recursive: true });

  const argv = process.argv.slice(2);
  const onlyId = argv.find((a) => a.startsWith("--id="))?.slice(5);
  const onlyIds = argv.find((a) => a.startsWith("--ids="))?.slice(6).split(",").filter(Boolean) ?? [];

  const rows = await readVideos();
  const targets = rows.filter((r) => {
    if (r.verified !== "TRUE" || !r.video_id) return false;
    if (onlyId && r.id !== onlyId) return false;
    if (onlyIds.length > 0 && !onlyIds.includes(r.id)) return false;
    return true;
  });
  const results: { id: string; wer: number; refLen: number; hypLen: number }[] = [];
  let scored = 0;
  let skipped = 0;

  const gtFiles = await fs.readdir(GROUND_TRUTH_DIR).catch(() => [] as string[]);

  for (const row of targets) {
    const transcriptPath = path.join(TRANSCRIPTS_DIR, `${row.id}.json`);
    const vttFile = gtFiles.find((f) => f.startsWith(row.video_id) && f.endsWith(".vtt"));
    const vttPath = vttFile ? path.join(GROUND_TRUTH_DIR, vttFile) : "";

    const hasT = await fs.access(transcriptPath).then(() => true, () => false);
    if (!hasT || !vttPath) {
      skipped++;
      continue;
    }

    const [tJson, vtt] = await Promise.all([
      fs.readFile(transcriptPath, "utf8"),
      fs.readFile(vttPath, "utf8"),
    ]);
    const dgText = extractDeepgramTranscript(JSON.parse(tJson));
    const clip = row.clip_end_s
      ? { startS: Number(row.clip_start_s || "0"), endS: Number(row.clip_end_s) }
      : undefined;
    const refText = parseVtt(vtt, clip);

    const ref = normalize(refText);
    const hyp = normalize(dgText);
    const result = computeWer(ref, hyp);
    const scorePath = path.join(SCORES_DIR, `${row.id}.json`);
    await fs.writeFile(scorePath, JSON.stringify({ id: row.id, phase: "A", ...result }, null, 2));
    results.push({ id: row.id, wer: result.wer, refLen: result.refLen, hypLen: result.hypLen });
    scored++;
    console.log(`${row.id.padEnd(20)} WER=${(result.wer * 100).toFixed(2)}%  ref=${result.refLen}w  hyp=${result.hypLen}w`);
  }

  if (results.length === 0) {
    console.log("\nNo videos had both a transcript and ground-truth captions.");
    return;
  }

  const sorted = [...results].sort((a, b) => a.wer - b.wer);
  const median = sorted[Math.floor(sorted.length / 2)].wer;
  const mean = results.reduce((sum, r) => sum + r.wer, 0) / results.length;
  const p90 = sorted[Math.floor(sorted.length * 0.9)].wer;

  console.log(`\nScored: ${scored}, skipped (missing transcript or ground-truth): ${skipped}`);
  console.log(`Median WER: ${(median * 100).toFixed(2)}%`);
  console.log(`Mean WER:   ${(mean * 100).toFixed(2)}%`);
  console.log(`p90 WER:    ${(p90 * 100).toFixed(2)}%`);
  console.log(`Acceptance threshold (README): median ≤ 15%`);

  await logLine(LOG, `scored=${scored} median=${median.toFixed(4)} mean=${mean.toFixed(4)} p90=${p90.toFixed(4)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
