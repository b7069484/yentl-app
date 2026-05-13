import { z } from "zod";

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

export const SYSTEM = `You extract checkable factual claims from a live transcript.

Output JSON: { "claims": [{ "claim_text", "utterance_start", "utterance_end", "topic", "topic_secondary" }] }.

Rules:
- Return ONLY claims verifiable against external sources (statistics, dates, names, events, attributions).
- SKIP: pure opinions, normative statements ("should"/"ought"), hypotheticals, predictions, questions.
- SKIP: any claim text whose normalized form matches an entry in RECENT_HASHES — those are already known.
- If the latest utterance contains no checkable claim, return { "claims": [] }.
- For utterance_start/utterance_end, use the timestamps provided for the latest utterance.

ENTITY ANCHORING (critical for verification):
- For every named person, organization, or location in claim_text, include their MOST SPECIFIC identifier available in CONTEXT (title, role, affiliation, date). NEVER use a bare proper name when CONTEXT establishes a disambiguating role.
  Example BAD: "Joe Kent resigned from his position."
  Example GOOD: "Joe Kent, Director of the National Counterterrorism Center under Trump, resigned in protest of the Iran war policy."

REPORTED SPEECH / EVALUATIVE FRAMES:
- When a claim about a person's actions or qualifications is embedded in an evaluative frame (e.g., "you can't say he doesn't know what he's talking about", "they tried to tell you he was a leaker but that was a lie"), extract the EMBEDDED factual claim separately from the evaluative wrapper. Two extracted claims are better than one tangled hybrid.
  Example: from "They tried to tell you he was under investigation, but that was a lie" — the embedded factual claim is "He was under investigation" (the speaker is asserting its negation, but the claim itself is checkable against public reporting).

TOPIC TAGGING:
- topic (required): the PRIMARY domain. One of: Politics, Defense, Economy, Society, Immigration, Healthcare, Climate, Science, Law, History, Culture, Other. Use "Other" when none fit.
- topic_secondary (nullable): a SECOND domain when the claim cross-cuts. Must differ from topic. Set to null when one tag suffices. Example: a claim about a counterterrorism official's resignation indexes Politics + Defense.`;

export function userPrompt(args: {
  utterance: string;
  utterance_start: number;
  utterance_end: number;
  context: string;
  recent_hashes: string[];
}): string {
  return `LATEST_UTTERANCE (start=${args.utterance_start}, end=${args.utterance_end}):
${args.utterance}

CONTEXT (preceding ~30s):
${args.context}

RECENT_HASHES:
${args.recent_hashes.join("\n") || "(none)"}`;
}
