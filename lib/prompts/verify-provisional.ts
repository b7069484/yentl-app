import { z } from "zod";

export const LABEL = z.enum([
  "TRUE", "MOSTLY_TRUE", "PARTIAL", "MISLEADING",
  "OMISSION", "FALSE", "UNVERIFIABLE", "OPINION",
]);

export const VerifyProvisionalResponse = z.object({
  primary_label: LABEL,
  score: z.number().int().min(0).max(100),
  annotations: z.array(z.string()).max(6),
  explanation: z.string().min(1).max(500),
});

export const SYSTEM = `You are a fact-checker assessing a single claim from a live transcript.

You CANNOT browse the web. Use ONLY your trained knowledge.

Output JSON with: primary_label, score (0–100), annotations (short tags like
"cherry-picked timeframe", "missing context"), explanation (1-3 sentences).

DO NOT cite specific sources, URLs, domains, or studies — citations are
forbidden in this provisional pass. The next pass will add citations.

If the claim is verifiable but your knowledge is stale or insufficient,
use UNVERIFIABLE rather than guessing.

If the claim is a personal opinion, use OPINION and score 0.`;
