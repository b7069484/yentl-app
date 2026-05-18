/**
 * One-shot post-resolution cleanup:
 * 1. Set clip 0-900s on all unclipped videos >25 min
 * 2. Re-query the 2 too-short (<3min) rows and the SNL-parody false positive
 */
import { promises as fs } from "node:fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import path from "node:path";

const CSV_PATH = path.resolve(import.meta.dirname ?? __dirname, "..", "..", "test-corpus", "videos.csv");

type Row = Record<string, string>;

const REQUERIES: Record<string, string> = {
  // (one-shot; already applied — kept empty so re-run is idempotent for clipping only)
};

async function main() {
  const text = await fs.readFile(CSV_PATH, "utf8");
  const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Row[];

  let clipped = 0;
  let requeried = 0;

  for (const r of rows) {
    const d = Number(r.duration_resolved_s || 0);
    if (d > 25 * 60 && !r.clip_end_s) {
      r.clip_start_s = "0";
      r.clip_end_s = "900";
      clipped++;
    }

    if (REQUERIES[r.id]) {
      r.search_query = REQUERIES[r.id];
      r.url = "";
      r.video_id = "";
      r.title_resolved = "";
      r.channel_resolved = "";
      r.duration_resolved_s = "";
      r.clip_start_s = "";
      r.clip_end_s = "";
      r.verified = "TBD";
      requeried++;
    }
  }

  const headerOrder = [
    "id", "category", "descriptor", "search_query", "duration_min_target",
    "speakers", "overlap", "topic_tags", "review_required",
    "url", "video_id", "title_resolved", "channel_resolved", "duration_resolved_s",
    "clip_start_s", "clip_end_s",
    "verified", "notes",
  ];
  const reordered = rows.map((r) => {
    const o: Row = {};
    for (const k of headerOrder) o[k] = r[k] ?? "";
    return o;
  });
  await fs.writeFile(CSV_PATH, stringify(reordered, { header: true, columns: headerOrder }));

  console.log(`Clipped (0-900s): ${clipped} rows`);
  console.log(`Re-queried: ${requeried} rows (${Object.keys(REQUERIES).join(", ")})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
