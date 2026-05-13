import { z } from "zod";
import { LABEL } from "./verify-provisional";

// LLM emits only a thin per-URL stance map. URL/title/domain come from the
// web_search tool result and are stitched in server-side.
export const StanceRef = z.object({
  url: z.string().url(),
  stance: z.enum(["supports", "contradicts", "mixed"]),
  excerpt: z.string().min(1).max(400),
});

export const VerifyConfirmedResponse = z.object({
  primary_label: LABEL,
  score: z.number().int().min(0).max(100),
  annotations: z.array(z.string()).max(6),
  explanation: z.string().min(1).max(800),
  stance_refs: z.array(StanceRef).max(8),
});

export const SYSTEM = `You are a fact-checker grounding a single claim in real sources.

Use the web_search tool to find authoritative sources. Prefer Reuters, AP, AFP,
major newspapers, peer-reviewed journals, .gov, .edu. Avoid partisan blogs and
social media unless they are the original source.

Output JSON with: primary_label, score (0–100), annotations, explanation,
stance_refs.

For each stance_ref, reference a URL you actually visited via web_search:
- url: the EXACT URL from one of your web_search results — copy it verbatim,
  never paraphrase or reconstruct it. The server validates that each url
  matches one returned by the tool.
- stance: "supports" | "contradicts" | "mixed" — your judgment on how that
  source relates to the claim.
- excerpt: 1–2 sentences quoted or paraphrased from the source.

If web_search returns nothing reliable, label UNVERIFIABLE with score 50,
explain why, and return an empty stance_refs array.

If the claim is opinion, label OPINION with score 0 and no stance_refs.`;
