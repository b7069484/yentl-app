/**
 * scripts/enrich-taxonomy.ts
 *
 * Two-phase taxonomy enrichment:
 *   Phase 1 (--phase 1): Call Anthropic Opus to propose how_to_spot, further_reading,
 *                         related_canonical_ids, and wikipedia_slug for every taxonomy entry.
 *                         Writes scripts/taxonomy-enrichment-proposals.json.
 *   Phase 2 (--phase 2): Read proposals, validate, show colored diff, confirm, write to
 *                         lib/taxonomy/book-entries.json and regenerate lib/taxonomy/extras.ts.
 *
 * Flags:
 *   --phase 1|2    Required.
 *   --limit N      (Phase 1 only) Process at most N entries. Useful for smoke-tests.
 *   --dry-run      Phase 1: print batch prompts, skip LLM calls.
 *                  Phase 2: render diff, skip writes.
 */

import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import readline from "node:readline/promises";
import { z } from "zod";
import { ALL } from "../lib/taxonomy";
import { EXTRAS, type ExtraEntry } from "../lib/taxonomy/extras";

// ---------------------------------------------------------------------------
// CLI arg parsing (only used when run as a script, not when imported)
// ---------------------------------------------------------------------------

function parseCLI() {
  const args = process.argv.slice(2);
  function flag(name: string): string | undefined {
    const idx = args.indexOf(name);
    return idx !== -1 ? args[idx + 1] : undefined;
  }
  return {
    phase: flag("--phase"),
    limit: flag("--limit") !== undefined ? parseInt(flag("--limit")!, 10) : undefined,
    dryRun: args.includes("--dry-run"),
  };
}

// ---------------------------------------------------------------------------
// File paths
// ---------------------------------------------------------------------------

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const PROPOSALS_PATH = path.join(dirname, "taxonomy-enrichment-proposals.json");
const BOOK_PATH = path.join(dirname, "..", "lib", "taxonomy", "book-entries.json");
const EXTRAS_PATH = path.join(dirname, "..", "lib", "taxonomy", "extras.ts");

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const FurtherReadingSchema = z.object({
  source: z.enum(["wikipedia", "sep", "other"]),
  slug_or_path: z.string().min(1),
  title: z.string().min(1),
  mins: z.number().int().min(3).max(60).optional(),
});

export const ProposalSchema = z.object({
  canonical_id: z.string(),
  how_to_spot: z.array(z.string().min(8).max(220)).min(3).max(5),
  further_reading: z.array(FurtherReadingSchema).min(1).max(4),
  related_canonical_ids: z.array(z.string()).min(3).max(8),
  wikipedia_slug: z.string().optional(),
});

export type Proposal = z.infer<typeof ProposalSchema>;

const ProposalsFileSchema = z.object({
  proposals: z.array(ProposalSchema),
});

// ---------------------------------------------------------------------------
// ANSI colors
// ---------------------------------------------------------------------------

const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

// ---------------------------------------------------------------------------
// System prompt (verbatim from spec)
// ---------------------------------------------------------------------------

const SYSTEM = `You enrich a taxonomy of cognitive biases, logical fallacies, and rhetorical devices with educational scaffolding. For each entry the user gives you, produce:

1. \`how_to_spot\`: 3 to 5 SHORT bullet sentences (≤30 words each) describing concrete cues a lay listener could use to detect this in real-time speech. Be specific about phrases, rhetorical moves, and emotional tells. Do NOT just restate the definition.

2. \`further_reading\`: 2 to 3 entries. For each, pick the BEST authoritative source. Prefer:
   - \`wikipedia\` — provide the slug (e.g., "Slippery_slope"). Skip if no Wikipedia article exists.
   - \`sep\` — Stanford Encyclopedia of Philosophy. Provide the entry path (e.g., "slippery-slope-arguments"). Skip if no SEP entry exists.
   - \`other\` — only if Wikipedia/SEP don't cover this. Provide a full https:// URL to a reputable academic or journalistic source. Do NOT invent URLs you are not confident actually exist.
   For each, include a \`title\` (article title or topic) and \`mins\` (estimated read time, 5–30).

3. \`related_canonical_ids\`: 4 to 6 canonical_ids of related patterns from the same taxonomy. ONLY use canonical_ids from the list provided in the user prompt. Do not invent. Prioritize patterns that frequently co-occur in real-world rhetoric, not just topical neighbors.

4. \`wikipedia_slug\`: ONLY set this if the auto-derived slug from canonical_id would be wrong. The default rule: lowercase canonical_id with underscores → capitalize first letter, keep underscores. (e.g., "slippery_slope" → "Slippery_slope".) Skip this field unless the article has a different title (e.g., canonical_id "loss_aversion" → Wikipedia article is "Loss_aversion"; but "gamblers_fallacy_bias" → article is "Gambler%27s_fallacy"). Be conservative — only include when you're confident the auto-derivation breaks.

Return JSON: { "proposals": [{ canonical_id, how_to_spot, further_reading, related_canonical_ids, wikipedia_slug? }] }.

Be terse. Be accurate. If you're not sure a Wikipedia/SEP article exists, OMIT that further_reading entry rather than fabricate. Better to have 1 high-confidence reading than 3 made-up ones.`;

// ---------------------------------------------------------------------------
// Phase 1: Proposer
// ---------------------------------------------------------------------------

async function phase1(opts: { limit?: number; dryRun: boolean }) {
  const { limit, dryRun } = opts;
  const allEntries = ALL;
  const entries = limit !== undefined ? allEntries.slice(0, limit) : allEntries;
  const BATCH_SIZE = 25;

  // Build the full list line for related-id context
  const allIdsBlock = allEntries
    .map((e) => `${e.canonical_id} [${e.type}] "${e.display}"`)
    .join("\n");

  console.log(
    `[phase1] Processing ${entries.length} of ${allEntries.length} entries in batches of ${BATCH_SIZE}${dryRun ? " (DRY RUN)" : ""}…`
  );

  const allProposals: Proposal[] = [];

  for (let batchStart = 0; batchStart < entries.length; batchStart += BATCH_SIZE) {
    const batch = entries.slice(batchStart, batchStart + BATCH_SIZE);
    const batchEnd = batchStart + batch.length;
    const batchLabel = `${batchStart + 1}–${batchEnd}`;

    // Build per-entry lines for this batch
    const batchLines = batch
      .map((e) => {
        const parts: string[] = [`- ${e.canonical_id} [${e.type}] "${e.display}"`];
        if (e.aka) parts[0] += ` (aka ${e.aka})`;
        if (e.definition) parts[0] += ` — ${e.definition}`;
        return parts[0];
      })
      .join("\n");

    const userPrompt = `ALL CANONICAL IDS IN TAXONOMY (for related_canonical_ids — only pick from this list):
${allIdsBlock}

---

ENRICH THESE ${batch.length} ENTRIES (batch ${batchLabel}):
${batchLines}

Return exactly ${batch.length} proposals in order. One proposal per entry.`;

    if (dryRun) {
      console.log(`\n${"═".repeat(60)}`);
      console.log(`${C.bold}BATCH ${batchLabel} — SYSTEM PROMPT:${C.reset}`);
      console.log(`${"─".repeat(60)}`);
      console.log(SYSTEM);
      console.log(`\n${C.bold}USER PROMPT:${C.reset}`);
      console.log(`${"─".repeat(60)}`);
      console.log(userPrompt);
      console.log(`${"═".repeat(60)}\n`);
      continue;
    }

    console.log(`[phase1] Batch ${batchLabel}: calling Opus for ${batch.length} entries…`);

    // Lazy import to prevent module-level side effects during dry-run
    const { generateText, Output } = await import("ai");
    const { opus } = await import("../lib/server/anthropic");

    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: ProposalsFileSchema }),
      system: SYSTEM,
      prompt: userPrompt,
    });

    const rawProposals = output.proposals;
    console.log(
      `[phase1] Batch ${batchLabel}: received ${rawProposals.length} proposals (expected ${batch.length})`
    );
    if (rawProposals.length !== batch.length) {
      console.warn(
        `[phase1] WARNING: expected ${batch.length}, got ${rawProposals.length} — continuing`
      );
    }

    // Validate and filter related_canonical_ids
    const allCanonicalIds = new Set(allEntries.map((e) => e.canonical_id));
    for (const p of rawProposals) {
      const unknownIds = p.related_canonical_ids.filter((id) => !allCanonicalIds.has(id));
      if (unknownIds.length > 0) {
        console.warn(
          `[phase1] WARNING: ${p.canonical_id} has unknown related_ids (dropping): ${unknownIds.join(", ")}`
        );
        p.related_canonical_ids = p.related_canonical_ids.filter((id) =>
          allCanonicalIds.has(id)
        );
      }
      if (p.how_to_spot.length < 3) {
        console.warn(
          `[phase1] WARNING: ${p.canonical_id} has only ${p.how_to_spot.length} how_to_spot entries (expected ≥3)`
        );
      }
    }

    allProposals.push(...rawProposals);
  }

  if (dryRun) {
    console.log(`[phase1] Dry run complete. ${entries.length} entries would have been processed.`);
    return;
  }

  // Write proposals file
  writeFileSync(PROPOSALS_PATH, JSON.stringify({ proposals: allProposals }, null, 2) + "\n");
  console.log(`\n[phase1] Wrote ${allProposals.length} proposals to ${PROPOSALS_PATH}`);
  console.log(`[phase1] Coverage: ${allProposals.length}/${allEntries.length} entries enriched`);
  console.log(
    `[phase1] Next: review proposals, then run \`pnpm tsx scripts/enrich-taxonomy.ts --phase 2\``
  );
}

// ---------------------------------------------------------------------------
// Phase 2: Applier
// ---------------------------------------------------------------------------

async function phase2(opts: { dryRun: boolean }) {
  const { dryRun } = opts;
  // Load and validate proposals
  let rawFile: unknown;
  try {
    rawFile = JSON.parse(readFileSync(PROPOSALS_PATH, "utf8"));
  } catch {
    console.error(`[phase2] Cannot read ${PROPOSALS_PATH} — run Phase 1 first.`);
    process.exit(1);
  }

  const parsed = ProposalsFileSchema.safeParse(rawFile);
  if (!parsed.success) {
    console.error(`[phase2] Proposals file failed validation:`, parsed.error.format());
    process.exit(1);
  }

  const proposals = parsed.data.proposals;
  const allCanonicalIds = new Set(ALL.map((e) => e.canonical_id));
  console.log(`[phase2] Loaded ${proposals.length} proposals from ${PROPOSALS_PATH}`);

  // Post-validate: drop unknown related_canonical_ids, warn
  for (const p of proposals) {
    const unknown = p.related_canonical_ids.filter((id) => !allCanonicalIds.has(id));
    if (unknown.length > 0) {
      console.warn(
        `[phase2] WARNING: ${p.canonical_id} has unknown related_ids (dropping): ${unknown.join(", ")}`
      );
      p.related_canonical_ids = p.related_canonical_ids.filter((id) => allCanonicalIds.has(id));
    }
  }

  // Render colored diff
  console.log();
  console.log(`${C.bold}${C.cyan}═══ ENRICHMENT DIFF (${proposals.length} entries) ═══${C.reset}`);
  console.log();

  for (const p of proposals) {
    const entry = ALL.find((e) => e.canonical_id === p.canonical_id);
    const display = entry?.display ?? p.canonical_id;
    const type = entry?.type ?? "?";
    console.log(
      `${C.bold}${C.green}+${C.reset} ${C.bold}${display}${C.reset} ${C.dim}[${type}]${C.reset} ${C.dim}(${p.canonical_id})${C.reset}`
    );
    console.log(
      `  ${C.cyan}how_to_spot:${C.reset} ${p.how_to_spot.length} bullets  ` +
        `${C.cyan}further_reading:${C.reset} ${p.further_reading.length}  ` +
        `${C.cyan}related:${C.reset} ${p.related_canonical_ids.length}` +
        (p.wikipedia_slug ? `  ${C.cyan}wiki_slug:${C.reset} ${p.wikipedia_slug}` : "")
    );
  }

  console.log();

  if (dryRun) {
    console.log(`[phase2] Dry run — no files written.`);
    return;
  }

  // Confirm
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `Apply ${proposals.length} enrichments to book-entries.json + extras.ts? Press Enter to apply, anything else to abort: `
  );
  rl.close();
  if (answer.trim() !== "") {
    console.log("[phase2] Aborted — no files written.");
    return;
  }

  const byId = new Map(proposals.map((p) => [p.canonical_id, p]));
  let skipped = 0;

  // Apply to book-entries.json
  const bookEntries = JSON.parse(readFileSync(BOOK_PATH, "utf8")) as Array<Record<string, unknown>>;
  for (const e of bookEntries) {
    const proposal = byId.get(e.canonical_id as string);
    if (!proposal) {
      skipped++;
      continue;
    }
    e.how_to_spot = proposal.how_to_spot;
    e.further_reading = proposal.further_reading;
    e.related_canonical_ids = proposal.related_canonical_ids;
    if (proposal.wikipedia_slug !== undefined) {
      e.wikipedia_slug = proposal.wikipedia_slug;
    }
  }
  writeFileSync(BOOK_PATH, JSON.stringify(bookEntries, null, 2) + "\n");
  console.log(`[phase2] Wrote ${BOOK_PATH}`);

  // Regenerate extras.ts deterministically
  const updatedExtras: ExtraEntry[] = EXTRAS.map((e) => {
    const proposal = byId.get(e.canonical_id);
    if (!proposal) return e;
    return {
      ...e,
      how_to_spot: proposal.how_to_spot,
      further_reading: proposal.further_reading,
      related_canonical_ids: proposal.related_canonical_ids,
      ...(proposal.wikipedia_slug !== undefined
        ? { wikipedia_slug: proposal.wikipedia_slug }
        : {}),
    };
  });

  const HEADER = `import type { MarkerType } from "../types";
import type { Archetype } from "./archetypes";
import type { FurtherReading } from "./types";

export type ExtraEntry = {
  canonical_id: string;
  type: MarkerType;
  display: string;
  aka?: string;
  archetype?: Archetype;
  how_to_spot?: string[];
  further_reading?: FurtherReading[];
  related_canonical_ids?: string[];
  wikipedia_slug?: string;
};

export const EXTRAS: ExtraEntry[] = [
`;
  const FOOTER = `];\n`;

  const rows = updatedExtras.map((e) => {
    const parts: string[] = [];
    parts.push(`canonical_id: ${JSON.stringify(e.canonical_id)}`);
    parts.push(`type: ${JSON.stringify(e.type)}`);
    parts.push(`display: ${JSON.stringify(e.display)}`);
    if (e.aka) parts.push(`aka: ${JSON.stringify(e.aka)}`);
    if (e.archetype) parts.push(`archetype: ${JSON.stringify(e.archetype)}`);
    if (e.how_to_spot && e.how_to_spot.length > 0)
      parts.push(`how_to_spot: ${JSON.stringify(e.how_to_spot)}`);
    if (e.further_reading && e.further_reading.length > 0)
      parts.push(`further_reading: ${JSON.stringify(e.further_reading)}`);
    if (e.related_canonical_ids && e.related_canonical_ids.length > 0)
      parts.push(`related_canonical_ids: ${JSON.stringify(e.related_canonical_ids)}`);
    if (e.wikipedia_slug) parts.push(`wikipedia_slug: ${JSON.stringify(e.wikipedia_slug)}`);
    return `  { ${parts.join(", ")} },`;
  });

  writeFileSync(EXTRAS_PATH, HEADER + rows.join("\n") + "\n" + FOOTER);
  console.log(`[phase2] Wrote ${EXTRAS_PATH}`);

  if (skipped > 0) {
    console.log(
      `[phase2] Skipped ${skipped} entries with no proposal (safe to re-apply once proposals are added).`
    );
  }

  console.log("[phase2] Done. Run `pnpm tsc --noEmit && pnpm test:run` to verify.");
}

// ---------------------------------------------------------------------------
// Entry point — only runs when executed directly (not when imported by tests)
// ---------------------------------------------------------------------------

const isMain = (() => {
  try {
    // ESM / tsx: import.meta.url is the file URL of this module
    const thisFile = fileURLToPath(import.meta.url);
    return process.argv[1] === thisFile;
  } catch {
    // CommonJS fallback
    return require.main === module;
  }
})();

if (isMain) {
  const { phase, limit, dryRun } = parseCLI();
  if (phase !== "1" && phase !== "2") {
    console.error("Usage: pnpm tsx scripts/enrich-taxonomy.ts --phase 1|2 [--limit N] [--dry-run]");
    process.exit(1);
  }
  const run =
    phase === "1"
      ? phase1({ limit, dryRun })
      : phase2({ dryRun });
  run.catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
