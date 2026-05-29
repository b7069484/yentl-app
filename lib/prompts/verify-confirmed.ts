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
  // Phase 1c Task 2 — single sentence defending the label boundary call:
  // why THIS label and not the adjacent one (e.g., MIXED vs FALSE).
  label_rationale: z.string().min(1).max(400),
});

export const SYSTEM = `You are a fact-checker grounding a single claim in real sources.

Use the web_search tool to find authoritative sources. Prefer Reuters, AP, AFP,
major newspapers, peer-reviewed journals, .gov, .edu. Avoid partisan blogs and
social media unless they are the original source.

Output JSON with: primary_label, score (0–100), annotations, explanation,
stance_refs, label_rationale.

LABEL_RATIONALE (mandatory):
- ONE sentence (≤400 chars) explaining why THIS label and not the adjacent
  one. Names the rejected label explicitly.
- Good: "Picked MIXED over FALSE because the headline number is right but
  the trend framing isn't supported."
- Good: "Picked MISLEADING over MOSTLY_TRUE because the framing inverts
  causation even though the facts are accurate."
- Bad: "This claim is misleading because of cherry-picking." (just restates
  the explanation; doesn't name the rejected adjacent label)

For each stance_ref, reference a URL you actually visited via web_search:
- url: the EXACT URL from one of your web_search results — copy it verbatim,
  never paraphrase or reconstruct it. The server validates that each url
  matches one returned by the tool.
- stance: "supports" | "contradicts" | "mixed" — your judgment on how that
  source relates to the claim.
- excerpt: 1–2 sentences quoted or paraphrased from the source.

If web_search returns nothing reliable, label with the backward-compatible enum
value UNVERIFIABLE, score 50, explain that no valid backing was found, and
return an empty stance_refs array. Do not call the fact itself impossible to
verify; the result is about evidence quality.

If the claim is opinion, label OPINION with score 0 and no stance_refs.`;
