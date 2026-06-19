import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateText, Output } from "ai";
import { z } from "zod";
import { opus } from "../lib/server/anthropic";
import { ALL, type TaxonomyEntry } from "../lib/taxonomy";
import { ARCHETYPES } from "../lib/taxonomy/archetypes";

const ArchetypeEnum = z.enum(ARCHETYPES);
const Confidence = z.enum(["high", "medium", "low"]);

const Proposal = z.object({
  canonical_id: z.string(),
  proposed_archetype: ArchetypeEnum,
  rationale: z.string().min(8).max(220),
  confidence: Confidence,
});

const ClassifyResponse = z.object({
  assignments: z.array(Proposal),
});

// Severity operational definition (Psychologist amendment) — pinned to detectability
// by a lay listener, not rhetorical force. This is the same axis used in the
// analyze-rhetoric prompt's severity field, restated here for consistency.
const SEVERITY_DEF = `Severity (when emitted in marker analysis, not this script's output) is pinned to detectability by a motivated lay listener:
- "blatant": an untrained listener would notice something is off
- "clear": a typical listener notices on reflection
- "subtle": even a trained analyst might miss on first pass`;

const SYSTEM = `You categorize cognitive biases, logical fallacies, and rhetorical devices into 15 archetype categories. The archetype is a coarse-grained tag that groups related items so they can share a visual icon.

Archetypes (pick exactly ONE per entry; "unknown" only when none fit):
- appeal_to:        appeal-to-* (popularity, emotion, fear, nature, tradition) — broad-base persuasion via inflating a non-evidential support
- dismissal:        ad hominem, genetic, tone policing — attacks on the source not the substance
- generalization:   hasty, sweeping, anecdotal, stereotype-from-one
- redirection:      strawman, red herring, whataboutism, tu quoque — change the subject
- fear:             appeals to fear, slippery slope (when fear-driven), catastrophizing
- authority:        appeal to authority specifically, authority bias, halo effect — credibility-transfer
- emotion:          sympathy, pity, indignation — non-fear emotional appeals
- vagueness:        innuendo, hand-waving, glittering generalities, weasel words
- repetition:       drumbeat, big lie, repetition for emphasis, illusory truth
- false_binary:     false dilemma, black-and-white, no-true-scotsman
- false_causation:  post hoc, single cause, correlation-as-causation
- in_group:         tribalism, dog whistle, us-vs-them, in/out-group bias
- framing:          loaded language, euphemism, dysphemism, framing effects
- burden:           shifting burden of proof, appeal to ignorance
- identity:         confirmation bias, motivated reasoning, anchoring, naive realism — beliefs about self/world that bias reasoning
- unknown:          truly no fit

Important disambiguations (Cognitive Psychologist guidance):
- "Appeal to Authority" can be read as both \`appeal_to\` AND \`authority\`. Route ALL fallacy-form appeal-to-authority entries to \`appeal_to\`; reserve \`authority\` for the bias variant (deference without argument evaluation) and halo-effect-style credibility transfer.
- "Slippery Slope" can be \`fear\` (if scary-consequences-driven) or \`false_causation\` (if causation-chain-driven). Read the entry's definition/aka to decide.

${SEVERITY_DEF}

For each entry output: canonical_id (verbatim), proposed_archetype, rationale (one sentence), confidence ("high" / "medium" / "low" — how sure are you given the entry's name+definition+examples).

Return JSON: { "assignments": [{ canonical_id, proposed_archetype, rationale, confidence }] }.`;

async function main() {
  const items: TaxonomyEntry[] = ALL;
  const lines = items.map((e) =>
    `- ${e.canonical_id} [${e.type}] "${e.display}"${e.aka ? ` (aka ${e.aka})` : ""}${e.definition ? ` — ${e.definition}` : ""}`
  ).join("\n");

  console.log(`[propose] Classifying ${items.length} taxonomy entries…`);

  const { output } = await generateText({
    model: opus,
    output: Output.object({ schema: ClassifyResponse }),
    system: SYSTEM,
    prompt: `ENTRIES:\n${lines}\n\nReturn one assignment per entry. ${items.length} expected.`,
  });

  if (output.assignments.length !== items.length) {
    console.warn(`[propose] expected ${items.length} assignments, got ${output.assignments.length}`);
  }

  const dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
  const proposalsPath = path.join(dirname, "archetype-proposals.json");
  writeFileSync(proposalsPath, JSON.stringify(output.assignments, null, 2) + "\n");

  const byConfidence = { high: 0, medium: 0, low: 0 };
  for (const a of output.assignments) byConfidence[a.confidence] += 1;
  console.log(`[propose] wrote ${proposalsPath}`);
  console.log(`[propose] confidence breakdown: high=${byConfidence.high} medium=${byConfidence.medium} low=${byConfidence.low}`);
  console.log(`[propose] next: review proposals (especially low-confidence ones), then run \`npm run apply:archetypes\``);
}

main().catch((e) => { console.error(e); process.exit(1); });
