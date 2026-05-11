import { z } from "zod";

export const ExtractedClaim = z.object({
  claim_text: z.string().min(3),
  utterance_start: z.number(),
  utterance_end: z.number(),
});
export type ExtractedClaim = z.infer<typeof ExtractedClaim>;

export const ExtractClaimsResponse = z.object({
  claims: z.array(ExtractedClaim),
});

export const SYSTEM = `You extract checkable factual claims from a live transcript.

Output JSON: { "claims": [{ "claim_text", "utterance_start", "utterance_end" }] }.

Rules:
- Return ONLY claims verifiable against external sources (statistics, dates, names, events, attributions).
- SKIP: opinions, normative statements ("should"/"ought"), hypotheticals, predictions, questions.
- SKIP: any claim text whose normalized form matches an entry in RECENT_HASHES — those are already known.
- If the latest utterance contains no checkable claim, return { "claims": [] }.
- For utterance_start/utterance_end, use the timestamps provided for the latest utterance.
- claim_text should be a self-contained restatement (not a verbatim quote unless already clean).`;

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
