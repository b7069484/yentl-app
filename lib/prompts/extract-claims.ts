import { z } from "zod";
import type { ClaimStance } from "@/lib/types";

export const STANCE_VALUES = [
  "asserted",
  "denied",
  "quoted",
  "reported",
  "mocked",
  "questioned",
  "corrected",
  "hedged",
  "unclear",
] as const satisfies readonly ClaimStance[];

export const TOPIC = z.enum([
  "Politics",
  "Defense",
  "Economy",
  "Society",
  "Immigration",
  "Healthcare",
  "Climate",
  "Science",
  "Law",
  "History",
  "Culture",
  "Other",
]);
export type Topic = z.infer<typeof TOPIC>;

export const ExtractedClaim = z.object({
  claim_text: z.string().min(3),
  utterance_start: z.number(),
  utterance_end: z.number(),
  topic: TOPIC,
  topic_secondary: TOPIC.nullable(),
});
export type ExtractedClaim = z.infer<typeof ExtractedClaim>;

export const ExtractClaimsResponse = z.object({
  claims: z.array(ExtractedClaim),
});

export const EXTRACT_CLAIMS_SCHEMA = z.object({
  claims: z.array(
    z.object({
      claim_text: z.string().min(3),
      utterance_start: z.number(),
      utterance_end: z.number(),
      topic: TOPIC,
      topic_secondary: TOPIC.nullable(),
      stance: z.enum(STANCE_VALUES).default("asserted"),
    }),
  ),
});

export const EXTRACT_CLAIMS_SYSTEM = `You extract checkable factual claims from a live transcript.

Output JSON: { "claims": [{ "claim_text", "utterance_start", "utterance_end", "topic", "topic_secondary" }] }.

Rules:
- Return ONLY claims verifiable against external sources (statistics, dates, names, events, attributions).
- SKIP: pure opinions, normative statements ("should"/"ought"), hypotheticals, predictions, questions.
- SKIP: any claim text whose normalized form matches an entry in RECENT_HASHES — those are already known.
- If the latest utterance contains no checkable claim, return { "claims": [] }.
- For utterance_start/utterance_end, use the timestamps provided for the latest utterance.

ENTITY ANCHORING (critical for verification):
- CONTEXT may include SOURCE_CONTEXT from the page title, channel, author, username, canonical URL, and detected names. Use it for disambiguation, not as proof of a factual claim.
- For every named person, organization, or location in claim_text, include their MOST SPECIFIC identifier available in CONTEXT (title, role, affiliation, date). NEVER use a bare proper name when CONTEXT establishes a disambiguating role.
  Example BAD: "Joe Kent resigned from his position."
  Example GOOD: "Joe Kent, Director of the National Counterterrorism Center under Trump, resigned in protest of the Iran war policy."

REPORTED SPEECH / EVALUATIVE FRAMES:
- When a claim about a person's actions or qualifications is embedded in an evaluative frame (e.g., "you can't say he doesn't know what he's talking about", "they tried to tell you he was a leaker but that was a lie"), extract the EMBEDDED factual claim separately from the evaluative wrapper. Two extracted claims are better than one tangled hybrid.
  Example: from "They tried to tell you he was under investigation, but that was a lie" — the embedded factual claim is "He was under investigation" (the speaker is asserting its negation, but the claim itself is checkable against public reporting).

TOPIC TAGGING:
- topic (required): the PRIMARY domain. One of: Politics, Defense, Economy, Society, Immigration, Healthcare, Climate, Science, Law, History, Culture, Other. Use "Other" when none fit.
- topic_secondary (nullable): a SECOND domain when the claim cross-cuts. Must differ from topic. Set to null when one tag suffices. Example: a claim about a counterterrorism official's resignation indexes Politics + Defense.

STANCE:
For every claim you extract, you MUST also assign a stance — how the speaker held the claim:
  - "asserted": the speaker is making this claim as their own truth
  - "denied": the speaker is denying this claim (e.g., "X is not true")
  - "quoted": the speaker is repeating someone else's claim verbatim, attributed
  - "reported": the speaker is paraphrasing what someone else said
  - "mocked": the speaker is repeating the claim sarcastically or to ridicule it
  - "questioned": the speaker is raising the claim as a question, not a statement
  - "corrected": the speaker is correcting a prior false claim
  - "hedged": the speaker is making the claim with explicit uncertainty ("I think...", "maybe...")
  - "unclear": you cannot determine the stance from context

When stance is "quoted", "reported", "mocked", or "questioned", the claim should still be extracted, but the fact-checker downstream will weight the verdict against the original speaker (when known), not the current speaker.`;

/** Back-compat alias — the route currently imports this name. */
export const SYSTEM = EXTRACT_CLAIMS_SYSTEM;

export function userPrompt(args: {
  utterance: string;
  utterance_start: number;
  utterance_end: number;
  context: string;
  recent_hashes: string[];
}): string {
  return `LATEST_UTTERANCE (start=${args.utterance_start}, end=${args.utterance_end}):
${args.utterance}

CONTEXT (source metadata + preceding ~30s):
${args.context}

RECENT_HASHES:
${args.recent_hashes.join("\n") || "(none)"}`;
}
