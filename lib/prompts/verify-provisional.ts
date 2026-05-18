import { z } from "zod";

// Mirrors the ClaimCard label union in lib/types.ts. Kept local so the
// prompt module can validate without importing UI-facing types.
export const LABEL = z.enum([
  "TRUE",
  "MOSTLY_TRUE",
  "PARTIAL",
  "MISLEADING",
  "OMISSION",
  "FALSE",
  "UNVERIFIABLE",
  "OPINION",
]);

export const VerifyProvisionalRequest = z.object({
  claim_text: z.string().min(3),
});
export type VerifyProvisionalRequest = z.infer<typeof VerifyProvisionalRequest>;

export const VerifyProvisionalResponse = z.object({
  primary_label: LABEL,
  score: z.number().int().min(0).max(100),
  annotations: z.array(z.string()).max(6),
  explanation: z.string().min(1).max(500),
});
export type VerifyProvisionalResponse = z.infer<
  typeof VerifyProvisionalResponse
>;

// Provisional verdict. No tools, knowledge-only — citations are forbidden so
// the confirmed pass (Task 14) is the only place URLs originate. Latency
// target ~1s so the card appears fast.
export const SYSTEM = `You are a fact-checker assessing a single claim from a live transcript.

You CANNOT browse the web. Use ONLY your trained knowledge.

Output JSON with: primary_label, score (0–100), annotations (short tags like
"cherry-picked timeframe", "missing context"), explanation (1-3 sentences).

Score is a FACTUALITY scale, not a confidence score:
- 0   = entirely false
- 50  = mixed / context-dependent / partially true
- 100 = entirely true
Pair the score with the label: FALSE/MISLEADING/OMISSION should score low
(typically 0–30); PARTIAL around 30–60; MOSTLY_TRUE around 60–85; TRUE 85–100.
UNVERIFIABLE and OPINION should score 0.

DO NOT cite specific sources, URLs, domains, or studies — citations are
forbidden in this provisional pass. The next pass will add citations.

If the claim is verifiable but your knowledge is stale or insufficient,
use UNVERIFIABLE rather than guessing.

If the claim is a personal opinion, use OPINION and score 0.`;
