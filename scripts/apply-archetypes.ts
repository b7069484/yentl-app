import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import readline from "node:readline/promises";
import { z } from "zod";
import { ARCHETYPES } from "../lib/taxonomy/archetypes";
import { ALL } from "../lib/taxonomy";
import { EXTRAS, type ExtraEntry } from "../lib/taxonomy/extras";

const ArchetypeEnum = z.enum(ARCHETYPES);
const Confidence = z.enum(["high", "medium", "low"]);
const Proposal = z.object({
  canonical_id: z.string(),
  proposed_archetype: ArchetypeEnum,
  rationale: z.string(),
  confidence: Confidence,
});
const ProposalsFile = z.array(Proposal);

// ANSI colors — green=high, yellow=medium, red=low
const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

async function main() {
  const dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
  const proposalsPath = path.join(dirname, "archetype-proposals.json");
  const raw = JSON.parse(readFileSync(proposalsPath, "utf8"));
  const proposals = ProposalsFile.parse(raw);

  console.log(`[apply] loaded ${proposals.length} proposals from ${proposalsPath}`);
  console.log();

  const byConf = { high: [] as typeof proposals, medium: [] as typeof proposals, low: [] as typeof proposals };
  for (const p of proposals) byConf[p.confidence].push(p);

  // Render diff: low confidence first, then medium, then high (the order most worth scanning)
  for (const conf of ["low", "medium", "high"] as const) {
    if (byConf[conf].length === 0) continue;
    const color = conf === "low" ? C.red : conf === "medium" ? C.yellow : C.green;
    console.log(`${C.bold}${color}═══ ${conf.toUpperCase()} CONFIDENCE (${byConf[conf].length}) ═══${C.reset}`);
    for (const p of byConf[conf]) {
      const entry = ALL.find((e) => e.canonical_id === p.canonical_id);
      const display = entry?.display ?? p.canonical_id;
      const type = entry?.type ?? "?";
      console.log(`${color}${p.confidence === "low" ? "?" : p.confidence === "medium" ? "~" : "✓"}${C.reset} ${C.bold}${display}${C.reset} ${C.dim}[${type}]${C.reset} → ${color}${p.proposed_archetype}${C.reset}`);
      console.log(`  ${C.dim}${p.rationale}${C.reset}`);
    }
    console.log();
  }

  // Confirm
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Apply all ${proposals.length} proposals? Press Enter to apply, anything else to abort: `);
  rl.close();
  if (answer.trim() !== "") {
    console.log("[apply] aborted; no files written.");
    return;
  }

  const byId = new Map(proposals.map((p) => [p.canonical_id, p.proposed_archetype]));

  // Apply to book-entries.json
  const bookPath = path.join(dirname, "..", "lib", "taxonomy", "book-entries.json");
  const bookEntries = JSON.parse(readFileSync(bookPath, "utf8")) as Array<Record<string, unknown>>;
  for (const e of bookEntries) {
    const a = byId.get(e.canonical_id as string);
    if (a) e.archetype = a;
  }
  writeFileSync(bookPath, JSON.stringify(bookEntries, null, 2) + "\n");
  console.log(`[apply] wrote ${bookPath}`);

  // Regenerate extras.ts deterministically
  const extrasPath = path.join(dirname, "..", "lib", "taxonomy", "extras.ts");
  const updatedExtras: ExtraEntry[] = EXTRAS.map((e) => ({ ...e, archetype: byId.get(e.canonical_id) }));
  const HEADER = `import type { MarkerType } from "../types";
import type { Archetype } from "./archetypes";

export type ExtraEntry = {
  canonical_id: string;
  type: MarkerType;
  display: string;
  aka?: string;
  archetype?: Archetype;
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
    return `  { ${parts.join(", ")} },`;
  });
  writeFileSync(extrasPath, HEADER + rows.join("\n") + "\n" + FOOTER);
  console.log(`[apply] wrote ${extrasPath}`);
  console.log("[apply] done. Run `npx tsc --noEmit && npm run test:run` to verify.");
}

main().catch((e) => { console.error(e); process.exit(1); });
