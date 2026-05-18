/**
 * After resolve-urls runs, scan the CSV and flag rows that need human review:
 *   - verified === FALSE (search failed)
 *   - duration > 30 min (way over target)
 *   - duration < 3 min (way under target)
 *   - duration > 25 min AND no clip_end_s set (over our 5-15 min target without clipping)
 *   - same video_id resolved twice (duplicate)
 *
 * Writes test-corpus/review-batch-2.md.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { readVideos, CORPUS_DIR } from "./_shared.js";

const OUT = path.join(CORPUS_DIR, "review-batch-2.md");

async function main() {
  const rows = await readVideos();

  const failed: typeof rows = [];
  const tooLong: typeof rows = [];
  const tooShort: typeof rows = [];
  const unclippedLong: typeof rows = [];
  const duplicates: { rows: typeof rows; videoId: string }[] = [];

  const byVideoId = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.video_id) continue;
    const arr = byVideoId.get(r.video_id) ?? [];
    arr.push(r);
    byVideoId.set(r.video_id, arr);
  }
  for (const [vid, group] of byVideoId) {
    if (group.length > 1) duplicates.push({ rows: group, videoId: vid });
  }

  for (const r of rows) {
    if (r.verified === "FALSE") failed.push(r);
    if (!r.duration_resolved_s) continue;
    const d = Number(r.duration_resolved_s);
    if (d > 30 * 60) tooLong.push(r);
    if (d < 3 * 60) tooShort.push(r);
    if (d > 25 * 60 && !r.clip_end_s) unclippedLong.push(r);
  }

  const clean = rows.filter((r) => r.verified === "TRUE").length;
  const total = rows.length;

  const lines: string[] = [];
  lines.push("# Review Batch 2 — Flagged Resolution Issues\n");
  lines.push(`**${clean}/${total} verified.** Below: issues needing review or proposed action.\n`);

  if (failed.length) {
    lines.push("## Search failed\n");
    lines.push("| ID | Category | Original query | Note |");
    lines.push("|---|---|---|---|");
    for (const r of failed) {
      lines.push(`| ${r.id} | ${r.category} | \`${r.search_query}\` | needs re-query |`);
    }
    lines.push("");
  }

  if (duplicates.length) {
    lines.push("## Duplicate picks (same video_id chosen for ≥2 rows)\n");
    for (const { videoId, rows: dupRows } of duplicates) {
      lines.push(`- **${videoId}** (${dupRows[0].title_resolved}):`);
      for (const r of dupRows) {
        lines.push(`  - ${r.id} (${r.category}) — query: \`${r.search_query}\``);
      }
    }
    lines.push("");
  }

  if (tooShort.length) {
    lines.push("## Too short (<3 min)\n");
    lines.push("| ID | Title | Duration | Action |");
    lines.push("|---|---|---|---|");
    for (const r of tooShort) {
      lines.push(`| ${r.id} | ${r.title_resolved.slice(0, 60)} | ${Math.round(Number(r.duration_resolved_s) / 60)}m | needs re-query |`);
    }
    lines.push("");
  }

  if (unclippedLong.length) {
    lines.push("## Long videos without clip set (>25 min, no clip_end_s)\n");
    lines.push("| ID | Title | Duration | Suggested |");
    lines.push("|---|---|---|---|");
    for (const r of unclippedLong) {
      lines.push(`| ${r.id} | ${r.title_resolved.slice(0, 60)} | ${Math.round(Number(r.duration_resolved_s) / 60)}m | clip 0-900s, or re-query |`);
    }
    lines.push("");
  }

  if (tooLong.length) {
    lines.push("## Very long videos (>30 min) — confirm clip strategy\n");
    lines.push("| ID | Title | Duration | clip_end_s set? |");
    lines.push("|---|---|---|---|");
    for (const r of tooLong) {
      lines.push(`| ${r.id} | ${r.title_resolved.slice(0, 60)} | ${Math.round(Number(r.duration_resolved_s) / 60)}m | ${r.clip_end_s ? `yes (0-${r.clip_end_s}s)` : "**no**"} |`);
    }
    lines.push("");
  }

  if (failed.length === 0 && duplicates.length === 0 && tooShort.length === 0 && unclippedLong.length === 0 && tooLong.length === 0) {
    lines.push("## All resolutions clean ✅\n");
    lines.push("No issues flagged. Safe to proceed to batch ingest.");
  }

  await fs.writeFile(OUT, lines.join("\n"));
  console.log(`Wrote ${OUT}`);
  console.log(`Summary: ${failed.length} failed, ${duplicates.length} duplicate-groups, ${tooShort.length} too short, ${unclippedLong.length} unclipped-long, ${tooLong.length} very long`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
