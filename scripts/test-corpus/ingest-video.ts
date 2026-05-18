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
    return { status: "skip", reason: "transcript already exists" };
  }

  const audioExists = await fs.access(audioPath).then(() => true, () => false);
  if (!audioExists) {
    const clip = row.clip_end_s
      ? { startS: Number(row.clip_start_s || "0"), endS: Number(row.clip_end_s) }
      : undefined;
    process.stdout.write(`  downloading audio${clip ? ` (clip ${clip.startS}s-${clip.endS}s)` : ""}... `);
    try {
      await ytdlpDownloadAudio(row.url, audioPath, clip);
      process.stdout.write("done\n");
    } catch (err) {
      const msg = (err as Error).message.split("\n")[0];
      await logLine(LOG, `${row.id}: yt-dlp audio download failed - ${msg}`);
      return { status: "fail", reason: `audio download: ${msg}` };
    }
  } else {
    process.stdout.write(`  audio cached\n`);
  }

  process.stdout.write(`  transcribing via Deepgram... `);
  try {
    const result = await transcribe(audioPath, deepgramKey);
    await fs.mkdir(TRANSCRIPTS_DIR, { recursive: true });
    await fs.writeFile(transcriptPath, JSON.stringify(result, null, 2));
    process.stdout.write("done\n");
    await logLine(LOG, `${row.id}: transcribed ok`);
    return { status: "ok" };
  } catch (err) {
    const msg = (err as Error).message.split("\n")[0];
    await logLine(LOG, `${row.id}: deepgram failed - ${msg}`);
    return { status: "fail", reason: `deepgram: ${msg}` };
  }
}

async function main() {
  await fs.mkdir(LOGS_DIR, { recursive: true });
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  await fs.mkdir(TRANSCRIPTS_DIR, { recursive: true });

  const { deepgramKey } = loadEnv();
  const argv = process.argv.slice(2);
  const onlyId = argv.find((a) => a.startsWith("--id="))?.slice(5);
  if (!onlyId) {
    console.error("Usage: ingest-video.ts --id=<video_id>");
    console.error("For batch ingest of all rows, use ingest-all.ts");
    process.exit(1);
  }

  const rows = await readVideos();
  const row = rows.find((r) => r.id === onlyId);
  if (!row) {
    console.error(`No row with id=${onlyId}`);
    process.exit(1);
  }

  console.log(`[${row.id}] ${row.descriptor}`);
  const result = await ingestOne(row, deepgramKey);
  console.log(`Result: ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
  if (result.status === "fail") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
