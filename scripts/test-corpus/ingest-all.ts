import { promises as fs } from "node:fs";
import path from "node:path";
import {
  readVideos,
  ytdlpDownloadAudio,
  AUDIO_DIR,
  TRANSCRIPTS_DIR,
  LOGS_DIR,
  loadEnv,
  logLine,
  type VideoRow,
} from "./_shared.js";

const LOG = path.join(LOGS_DIR, "ingest.log");

async function transcribe(audioPath: string, deepgramKey: string) {
  const audio = await fs.readFile(audioPath);
  const params = new URLSearchParams({
    model: "nova-3",
    language: "en",
    diarize: "true",
    utterances: "true",
    punctuate: "true",
    smart_format: "true",
    paragraphs: "true",
  });
  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${deepgramKey}`,
      "Content-Type": "audio/opus",
    },
    body: audio,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Deepgram HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }
  return res.json();
}

async function ingestOne(row: VideoRow, deepgramKey: string): Promise<{ status: "ok" | "skip" | "fail"; reason?: string }> {
  if (row.verified !== "TRUE" || !row.url) {
    return { status: "skip", reason: "url not resolved" };
  }
  const audioPath = path.join(AUDIO_DIR, `${row.id}.opus`);
  const transcriptPath = path.join(TRANSCRIPTS_DIR, `${row.id}.json`);

  const transcriptExists = await fs.access(transcriptPath).then(() => true, () => false);
  if (transcriptExists) {
    return { status: "skip", reason: "transcript cached" };
  }

  const audioExists = await fs.access(audioPath).then(() => true, () => false);
  if (!audioExists) {
    const clip = row.clip_end_s
      ? { startS: Number(row.clip_start_s || "0"), endS: Number(row.clip_end_s) }
      : undefined;
    try {
      await ytdlpDownloadAudio(row.url, audioPath, clip);
    } catch (err) {
      const msg = (err as Error).message.split("\n")[0];
      await logLine(LOG, `${row.id}: yt-dlp audio download failed - ${msg}`);
      return { status: "fail", reason: `audio: ${msg.slice(0, 100)}` };
    }
  }

  try {
    const result = await transcribe(audioPath, deepgramKey);
    await fs.writeFile(transcriptPath, JSON.stringify(result, null, 2));
    await logLine(LOG, `${row.id}: transcribed ok`);
    return { status: "ok" };
  } catch (err) {
    const msg = (err as Error).message.split("\n")[0];
    await logLine(LOG, `${row.id}: deepgram failed - ${msg}`);
    return { status: "fail", reason: `deepgram: ${msg.slice(0, 100)}` };
  }
}

async function main() {
  await fs.mkdir(LOGS_DIR, { recursive: true });
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  await fs.mkdir(TRANSCRIPTS_DIR, { recursive: true });

  const { deepgramKey } = loadEnv();
  const argv = process.argv.slice(2);
  const categoryFilter = argv.find((a) => a.startsWith("--category="))?.slice(11);
  const onlyIds = argv.find((a) => a.startsWith("--ids="))?.slice(6).split(",").filter(Boolean) ?? [];
  const limit = Number(argv.find((a) => a.startsWith("--limit="))?.slice(8) || 0);

  const rows = await readVideos();
  const targets = rows.filter((r) => {
    if (categoryFilter && r.category !== categoryFilter) return false;
    if (onlyIds.length > 0 && !onlyIds.includes(r.id)) return false;
    return true;
  });
  const sliced = limit > 0 ? targets.slice(0, limit) : targets;

  console.log(`Ingesting ${sliced.length} videos${categoryFilter ? ` in category=${categoryFilter}` : ""}`);
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < sliced.length; i++) {
    const row = sliced[i];
    process.stdout.write(`[${i + 1}/${sliced.length}] ${row.id} (${row.category})... `);
    const result = await ingestOne(row, deepgramKey);
    console.log(`${result.status}${result.reason ? ` (${result.reason})` : ""}`);
    if (result.status === "ok") ok++;
    else if (result.status === "skip") skip++;
    else fail++;
  }

  console.log(`\nDone. OK: ${ok}, skipped: ${skip}, failed: ${fail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
