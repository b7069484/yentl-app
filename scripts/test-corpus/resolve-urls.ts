import { readVideos, writeVideos, ytdlpSearch, LOGS_DIR, logLine } from "./_shared.js";
import path from "node:path";
import { promises as fs } from "node:fs";

const LOG = path.join(LOGS_DIR, "resolve-urls.log");

function clearResolution(row: { url: string; video_id: string; title_resolved: string; channel_resolved: string; duration_resolved_s: string; verified: string }) {
  row.url = "";
  row.video_id = "";
  row.title_resolved = "";
  row.channel_resolved = "";
  row.duration_resolved_s = "";
  row.verified = "FALSE";
}

function isDurationUsable(duration: number, targetSec: number): boolean {
  const minSec = Math.max(4 * 60, targetSec * 0.45);
  const maxSec = Math.min(35 * 60, targetSec * 2.25);
  return duration >= minSec && duration <= maxSec;
}

const STOPWORDS = new Set([
  "a", "about", "and", "as", "at", "for", "from", "how", "in", "into", "is", "it", "of", "on", "or", "the", "to", "vs", "with",
  "video", "discussion", "panel", "interview", "debate", "claims", "claim", "analysis", "news", "public",
]);

const SUSPICIOUS_TITLE_PATTERNS = [
  /\baudiobook\b/i,
  /\bfor sleep\b/i,
  /\bsleep story\b/i,
  /\binterview questions\b/i,
  /\bhow to pass\b/i,
  /\bcompilation\b/i,
  /\blyrics?\b/i,
  /\bminecraft\b/i,
  /\broblox\b/i,
  /\basmr\b/i,
];

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !STOPWORDS.has(token))
  );
}

function relevanceScore(row: { search_query: string; descriptor?: string; failure_mode?: string }, title: string, channel: string): number {
  const queryTokens = tokenize(`${row.search_query} ${row.descriptor ?? ""} ${row.failure_mode ?? ""}`);
  if (queryTokens.size === 0) return 0;
  const targetTokens = tokenize(`${title} ${channel}`);
  let matches = 0;
  for (const token of queryTokens) {
    if (targetTokens.has(token)) matches++;
  }
  return matches / queryTokens.size;
}

function suspiciousPenalty(title: string): number {
  return SUSPICIOUS_TITLE_PATTERNS.some((pattern) => pattern.test(title)) ? 5 : 0;
}

async function main() {
  await fs.mkdir(LOGS_DIR, { recursive: true });

  const rows = await readVideos();
  const argv = process.argv.slice(2);
  const onlyId = argv.find((a) => a.startsWith("--id="))?.slice(5);
  const onlyIds = argv.find((a) => a.startsWith("--ids="))?.slice(6).split(",").filter(Boolean) ?? [];
  const onlyCategory = argv.find((a) => a.startsWith("--category="))?.slice(11);
  const onlyReviewRequired = argv.includes("--review-required");
  const force = argv.includes("--force");
  const limit = Number(argv.find((a) => a.startsWith("--limit="))?.slice(8) || 0);
  const searchLimit = Number(argv.find((a) => a.startsWith("--search-limit="))?.slice(15) || 10);

  let resolved = 0;
  let skipped = 0;
  let failed = 0;
  let attempted = 0;

  for (const row of rows) {
    if (onlyId && row.id !== onlyId) continue;
    if (onlyIds.length > 0 && !onlyIds.includes(row.id)) continue;
    if (onlyCategory && row.category !== onlyCategory) continue;
    if (onlyReviewRequired && row.review_required !== "TRUE") continue;
    if (row.url && !force) {
      skipped++;
      continue;
    }
    if (limit > 0 && attempted >= limit) break;
    attempted++;

    const targetSec = Number(row.duration_min_target) * 60;
    process.stdout.write(`[${row.id}] searching: ${row.search_query} ... `);
    try {
      const results = await ytdlpSearch(row.search_query, searchLimit);
      if (results.length === 0) {
        console.log("NO RESULTS");
        clearResolution(row);
        await logLine(LOG, `${row.id}: no search results for "${row.search_query}"`);
        failed++;
        continue;
      }

      const scored = results
        .filter((r) => isDurationUsable(r.duration, targetSec))
        .map((r) => ({
          r,
          diff: Math.abs(r.duration - targetSec),
          inWindow: r.duration >= 5 * 60 && r.duration <= 20 * 60,
          relevance: relevanceScore(row, r.title, r.channel),
          penalty: suspiciousPenalty(r.title),
        }))
        .sort((a, b) => {
          const scoreA = (a.diff / Math.max(1, targetSec)) + (a.inWindow ? 0 : 0.75) - (a.relevance * 2) + a.penalty;
          const scoreB = (b.diff / Math.max(1, targetSec)) + (b.inWindow ? 0 : 0.75) - (b.relevance * 2) + b.penalty;
          return scoreA - scoreB;
        });
      if (scored.length === 0) {
        console.log("NO USABLE DURATION");
        clearResolution(row);
        await logLine(LOG, `${row.id}: no usable-duration search results for "${row.search_query}"`);
        failed++;
        continue;
      }

      const pick = scored[0].r;
      if (scored[0].relevance < 0.08) {
        console.log("LOW RELEVANCE");
        clearResolution(row);
        await logLine(LOG, `${row.id}: low-relevance search results for "${row.search_query}"`);
        failed++;
        continue;
      }
      row.url = pick.webpage_url || pick.url;
      row.video_id = pick.id;
      row.title_resolved = pick.title;
      row.channel_resolved = pick.channel;
      row.duration_resolved_s = String(pick.duration);
      row.verified = "TRUE";
      console.log(`OK -> ${pick.title.slice(0, 60)} (${Math.round(pick.duration / 60)}m, rel=${scored[0].relevance.toFixed(2)})`);
      await logLine(LOG, `${row.id}: resolved -> ${pick.webpage_url} relevance=${scored[0].relevance.toFixed(2)}`);
      resolved++;
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message.split("\n")[0]}`);
      clearResolution(row);
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
