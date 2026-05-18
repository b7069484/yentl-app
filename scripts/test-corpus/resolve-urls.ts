import { readVideos, writeVideos, ytdlpSearch, LOGS_DIR, logLine } from "./_shared.js";
import path from "node:path";
import { promises as fs } from "node:fs";

const LOG = path.join(LOGS_DIR, "resolve-urls.log");

async function main() {
  await fs.mkdir(LOGS_DIR, { recursive: true });

  const rows = await readVideos();
  const argv = process.argv.slice(2);
  const onlyId = argv.find((a) => a.startsWith("--id="))?.slice(5);
  const onlyCategory = argv.find((a) => a.startsWith("--category="))?.slice(11);
  const onlyReviewRequired = argv.includes("--review-required");
  const force = argv.includes("--force");

  let resolved = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (onlyId && row.id !== onlyId) continue;
    if (onlyCategory && row.category !== onlyCategory) continue;
    if (onlyReviewRequired && row.review_required !== "TRUE") continue;
    if (row.url && !force) {
      skipped++;
      continue;
    }

    const targetSec = Number(row.duration_min_target) * 60;
    process.stdout.write(`[${row.id}] searching: ${row.search_query} ... `);
    try {
      const results = await ytdlpSearch(row.search_query, 5);
      if (results.length === 0) {
        console.log("NO RESULTS");
        row.verified = "FALSE";
        await logLine(LOG, `${row.id}: no search results for "${row.search_query}"`);
        failed++;
        continue;
      }

      const scored = results
        .map((r) => ({
          r,
          diff: Math.abs(r.duration - targetSec),
          inWindow: r.duration >= 5 * 60 && r.duration <= 20 * 60,
        }))
        .sort((a, b) => {
          if (a.inWindow && !b.inWindow) return -1;
          if (!a.inWindow && b.inWindow) return 1;
          return a.diff - b.diff;
        });

      const pick = scored[0].r;
      row.url = pick.webpage_url || pick.url;
      row.video_id = pick.id;
      row.title_resolved = pick.title;
      row.channel_resolved = pick.channel;
      row.duration_resolved_s = String(pick.duration);
      row.verified = "TRUE";
      console.log(`OK -> ${pick.title.slice(0, 60)} (${Math.round(pick.duration / 60)}m)`);
      await logLine(LOG, `${row.id}: resolved -> ${pick.webpage_url}`);
      resolved++;
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message.split("\n")[0]}`);
      row.verified = "FALSE";
      await logLine(LOG, `${row.id}: error - ${(err as Error).message}`);
      failed++;
    }

    await writeVideos(rows);
  }

  console.log(`\nDone. Resolved: ${resolved}, skipped: ${skipped}, failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
