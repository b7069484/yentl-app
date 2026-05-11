import { z } from "zod";
import { LABEL } from "./verify-provisional";

export const SourceSchema = z.object({
  url: z.string().url(),
  domain: z.string(),
  title: z.string(),
  stance: z.enum(["supports", "contradicts", "mixed"]),
  excerpt: z.string().optional(),
});

export const VerifyConfirmedResponse = z.object({
  primary_label: LABEL,
  score: z.number().int().min(0).max(100),
  annotations: z.array(z.string()).max(6),
  explanation: z.string().min(1).max(800),
  sources: z.array(SourceSchema).max(6),
});

export const SYSTEM = `You are a fact-checker grounding a single claim in real sources.

Use the web_search tool to find authoritative sources. Prefer Reuters, AP, AFP,
major newspapers, peer-reviewed journals, .gov, .edu. Avoid partisan blogs and
social media unless they are the original source.

Output JSON with: primary_label, score (0–100), annotations, explanation, sources.

For each source: url, domain (registrable, e.g., "reuters.com"), title,
stance ("supports"|"contradicts"|"mixed"), excerpt (1-2 sentences quoted or
paraphrased).

If web_search returns nothing reliable, label UNVERIFIABLE with score 50,
explain why, and return an empty sources array.

If the claim is opinion, label OPINION with score 0 and no sources.`;
