import { promises as fs } from "node:fs";
import path from "node:path";
import { readVideos, TRANSCRIPTS_DIR, GROUND_TRUTH_DIR, SCORES_DIR, LOGS_DIR, logLine } from "./_shared.js";

const LOG = path.join(LOGS_DIR, "score-wer.log");

function parseVtt(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith("WEBVTT")) continue;
    if (line.startsWith("NOTE")) continue;
    if (/^\d+$/.test(line.trim())) continue;
    if (/-->/.test(line)) continue;
    if (line.startsWith("STYLE")) continue;
    const cleaned = line.replace(/<[^>]+>/g, "").trim();
    if (cleaned) out.push(cleaned);
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

  const rows = await readVideos();
  const targets = rows.filter((r) => r.verified === "TRUE" && r.video_id);
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
    const refText = parseVtt(vtt);

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
