import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readVideos, GROUND_TRUTH_DIR, LOGS_DIR, logLine } from "./_shared.js";

const execFileAsync = promisify(execFile);
const LOG = path.join(LOGS_DIR, "ground-truth.log");

async function fetchManualSubs(url: string, videoId: string): Promise<string | null> {
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
        path.join(GROUND_TRUTH_DIR, `${videoId}.%(ext)s`),
        "--no-warnings",
      ],
      { maxBuffer: 50 * 1024 * 1024 }
    );
  } catch {
    return null;
  }
  const files = await fs.readdir(GROUND_TRUTH_DIR);
  const match = files.find((f) => f.startsWith(videoId) && f.endsWith(".vtt"));
  return match ? path.join(GROUND_TRUTH_DIR, match) : null;
}

async function main() {
  await fs.mkdir(LOGS_DIR, { recursive: true });
  await fs.mkdir(GROUND_TRUTH_DIR, { recursive: true });

  const rows = await readVideos();
  const argv = process.argv.slice(2);
  const onlyId = argv.find((a) => a.startsWith("--id="))?.slice(5);
  const onlyIds = argv.find((a) => a.startsWith("--ids="))?.slice(6).split(",").filter(Boolean) ?? [];

  const targets = rows.filter((r) => {
    if (r.verified !== "TRUE" || !r.url) return false;
    if (onlyId && r.id !== onlyId) return false;
    if (onlyIds.length > 0 && !onlyIds.includes(r.id)) return false;
    return true;
  });
  console.log(`Fetching ground-truth captions for ${targets.length} videos...`);

  let found = 0;
  let missing = 0;
  let errored = 0;

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i];
    process.stdout.write(`[${i + 1}/${targets.length}] ${row.id}... `);

    const expected = path.join(GROUND_TRUTH_DIR, `${row.video_id}.vtt`);
    const existing = await fs.access(expected).then(() => true, () => false);
    if (existing) {
      console.log("cached");
      found++;
      continue;
    }

    try {
      const result = await fetchManualSubs(row.url, row.video_id);
      if (result) {
        console.log(`found -> ${path.basename(result)}`);
        await logLine(LOG, `${row.id}: ground-truth captions found`);
        found++;
      } else {
        console.log("no manual captions");
        await logLine(LOG, `${row.id}: no manual captions available`);
        missing++;
      }
    } catch (err) {
      const msg = (err as Error).message.split("\n")[0];
      console.log(`error - ${msg.slice(0, 80)}`);
      await logLine(LOG, `${row.id}: error - ${msg}`);
      errored++;
    }
  }

  console.log(`\nDone. Found: ${found}, missing: ${missing}, errored: ${errored}`);
  console.log(`\nNote: only videos with HUMAN-AUTHORED captions are reliable ground-truth.`);
  console.log(`Auto-captions are excluded by design (they're machine-transcribed too).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
