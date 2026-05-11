#!/usr/bin/env tsx
/**
 * One-time script: reads the book PDF and produces book-entries.json
 * with { canonical_id, type, chapter, display, definition, example }
 * for each of the 55 entries.
 *
 * Run via:
 *   npm run ingest:taxonomy
 *
 * Auth: relies on VERCEL_OIDC_TOKEN in .env.local (loaded via --env-file).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { generateText, Output } from "ai";
import { z } from "zod";

// Resolve script directory in a way that works under both CJS and ESM (tsx defaults to CJS).
const SCRIPT_DIR =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const PDF_PATH = path.resolve(
  process.env.HOME!,
  "Desktop/Antisemitism/critical thinking about antisemitism.pdf",
);
const OUT_PATH = path.resolve(SCRIPT_DIR, "../lib/taxonomy/book-entries.json");

const Entry = z.object({
  canonical_id: z.string(),
  type: z.enum(["bias", "fallacy"]),
  chapter: z.string(),
  display: z.string(),
  definition: z.string(),
  example: z.string(),
});

const ExtractionResponse = z.object({
  entries: z.array(Entry),
});

const SYSTEM = `You extract structured data from a book's text.

The book: "An Illustrated Guide to Debunking Jew-Hatred: 55 Common Cognitive Biases
and Logical Fallacies Used by Antisemites" by Israel B. Bitton (2024).

The book contains:
- §I Cognitive Biases (23 entries in 5 chapters):
  1. Decision-Making & Information Processing Biases (5)
  2. Behavioral, Perceptual & Egocentric Biases (6)
  3. Belief & Probability Biases (5)
  4. Social Biases (4)
  5. Memory Biases (3)
- §II Logical Fallacies (32 entries in 4 chapters):
  1. Relevance & Distraction Fallacies (4)
  2. Deficiency in Evidence Fallacies (11)
  3. False Dilemma Fallacies (4)
  4. Manipulation Fallacies (13)

For each numbered entry (e.g., "1A — Anchoring Bias"), extract:
- canonical_id: snake_case of the name (e.g., "anchoring_bias", "ad_hominem", "appeal_to_authority", "false_dilemma")
- type: "bias" if in §I, "fallacy" if in §II
- chapter: the chapter title verbatim (e.g., "Decision-Making & Information Processing Biases")
- display: human label exactly as in the book (e.g., "Anchoring Bias")
- definition: the short definition under the title (1-2 sentences, verbatim or near-verbatim)
- example: the EXAMPLE: text that follows on the same page (1-3 sentences, verbatim or near-verbatim)

Return ALL 55 entries in book order. Do not truncate, summarize, or skip any.`;

async function main() {
  const buf = readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const { text } = await parser.getText();
  await parser.destroy();

  const { output } = await generateText({
    model: "anthropic/claude-opus-4.7",
    output: Output.object({ schema: ExtractionResponse }),
    system: SYSTEM,
    prompt: text,
  });

  if (output.entries.length !== 55) {
    throw new Error(
      `expected 55 entries, got ${output.entries.length}. ` +
      `First IDs: ${output.entries.slice(0, 5).map((e) => e.canonical_id).join(", ")}`
    );
  }

  // Spot-check counts by type
  const biasCount = output.entries.filter((e) => e.type === "bias").length;
  const fallacyCount = output.entries.filter((e) => e.type === "fallacy").length;
  if (biasCount !== 23 || fallacyCount !== 32) {
    throw new Error(`expected 23 biases + 32 fallacies, got ${biasCount} + ${fallacyCount}`);
  }

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output.entries, null, 2) + "\n");
  console.log(`Wrote ${output.entries.length} entries to ${OUT_PATH}`);
  console.log(`  Biases: ${biasCount}, Fallacies: ${fallacyCount}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
