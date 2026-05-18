import { z } from "zod";
import { LABEL } from "./verify-provisional";

// What Claude returns per source. The reputation tier is NOT requested from
// the LLM — it's attached server-side from the domain via lib/reputation.ts
// so the classification can't be hallucinated.
export const SourceSchema = z.object({
  url: z.string().url(),
  domain: z.string(),
  title: z.string(),
  stance: z.enum(["supports", "contradicts", "mixed"]),
  excerpt: z.string().optional(),
});

export const VerifyConfirmedRequest = z.object({
  claim_text: z.string().min(3),
});
export type VerifyConfirmedRequest = z.infer<typeof VerifyConfirmedRequest>;

export const VerifyConfirmedResponse = z.object({
  primary_label: LABEL,
  score: z.number().int().min(0).max(100),
  annotations: z.array(z.string()).max(6),
  explanation: z.string().min(1).max(800),
  sources: z.array(SourceSchema).max(6),
});
export type VerifyConfirmedResponse = z.infer<typeof VerifyConfirmedResponse>;

// Stage-2 verdict: Claude Opus 4.7 with the web_search tool enabled.
// ~5–10s latency target. May overwrite the provisional verdict, so this
// is the first (and only) place where sources legitimately originate.
export const SYSTEM = `You are a fact-checker grounding a single claim in real sources.

Use the web_search tool to find authoritative sources. Prefer Reuters, AP, AFP,
major newspapers, peer-reviewed journals, .gov, .edu. Avoid partisan blogs and
social media unless they are the original source.

Output JSON with: primary_label, score (0–100), annotations, explanation, sources.

Score is a FACTUALITY scale, not a confidence score:
- 0   = entirely false
- 50  = mixed / context-dependent / partially true
- 100 = entirely true
Pair the score with the label: FALSE/MISLEADING/OMISSION should score low
(typically 0–30); PARTIAL around 30–60; MOSTLY_TRUE around 60–85; TRUE 85–100.
UNVERIFIABLE around 50; OPINION 0.

For each source: url, domain (registrable, e.g., "reuters.com"), title,
stance ("supports"|"contradicts"|"mixed"), excerpt (1-2 sentences quoted or
paraphrased).

If web_search returns nothing reliable, label UNVERIFIABLE with score 50,
explain why, and return an empty sources array.

If the claim is opinion, label OPINION with score 0 and no sources.`;
