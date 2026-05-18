/**
 * One-shot CSV update based on review-batch-1.md decisions.
 * Adds clip_start_s / clip_end_s columns; refines queries for 8 rows;
 * clears resolved fields on those 8 so resolve-urls re-runs them.
 */
import { promises as fs } from "node:fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import path from "node:path";

const CSV_PATH = path.resolve(import.meta.dirname ?? __dirname, "..", "..", "test-corpus", "videos.csv");

type Row = Record<string, string>;

const REQUERIES: Record<string, string> = {
  israel_004: "Norman Finkelstein interview Israel Palestine 2024",
  israel_008: "Vice News Charlottesville Unite the Right documentary",
  israel_009: "Munk Debate two state solution Israel full debate",
  israel_010: "Ilhan Omar Benjamins tweet apology PBS NewsHour",
  holocaust_005: "Auschwitz Birkenau State Museum lecture educator",
  holocaust_006: "Denial 2016 film Irving Lipstadt courtroom scene",
  holocaust_009: "Yad Vashem Holocaust comparisons trivialization expert",
  holocaust_010: "Holocaust historiography intentionalist functionalist panel",
};

// Clip the first 15 min for these (rows that have the right content but are too long)
const CLIP_15MIN: string[] = [
  "israel_002",
  "israel_004",
  "holocaust_003",
  "holocaust_004",
  "holocaust_007",
  "holocaust_008",
];

async function main() {
  const text = await fs.readFile(CSV_PATH, "utf8");
  const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Row[];

  // Add new columns if missing
  for (const r of rows) {
    if (!("clip_start_s" in r)) r.clip_start_s = "";
    if (!("clip_end_s" in r)) r.clip_end_s = "";
  }

  // Reorder so the new columns sit between verified and notes
  const headerOrder = [
    "id", "category", "descriptor", "search_query", "duration_min_target",
    "speakers", "overlap", "topic_tags", "review_required",
    "url", "video_id", "title_resolved", "channel_resolved", "duration_resolved_s",
    "clip_start_s", "clip_end_s",
    "verified", "notes",
  ];

  let queried = 0, clipped = 0;
  for (const r of rows) {
    if (REQUERIES[r.id]) {
      r.search_query = REQUERIES[r.id];
      r.url = "";
      r.video_id = "";
      r.title_resolved = "";
      r.channel_resolved = "";
      r.duration_resolved_s = "";
      r.verified = "TBD";
      queried++;
    }
    if (CLIP_15MIN.includes(r.id)) {
      r.clip_start_s = "0";
      r.clip_end_s = "900";
      clipped++;
    }
  }

  const reordered = rows.map((r) => {
    const o: Row = {};
    for (const k of headerOrder) o[k] = r[k] ?? "";
    return o;
  });

  await fs.writeFile(CSV_PATH, stringify(reordered, { header: true, columns: headerOrder }));
  console.log(`Updated. Re-queried: ${queried}, clip-marked: ${clipped}`);
  console.log(`Re-query IDs: ${Object.keys(REQUERIES).join(", ")}`);
  console.log(`Clip IDs (0-900s): ${CLIP_15MIN.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
