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

export const VerifyClaimContext = z.object({
  speaker_id: z.number().nullable().optional(),
  topic: z.string().nullable().optional(),
  stance: z.string().optional(),
  attribution_status: z.string().optional(),
  attribution_reasons: z.array(z.string()).default([]),
});

export const VerifyPromptRequest = z.object({
  claim_text: z.string(),
  source_context: z.string().optional(),
  claim_context: VerifyClaimContext.optional(),
});

export const SYSTEM = `You are a fact-checker assessing a single claim from a live transcript.

You CANNOT browse the web. Use ONLY your trained knowledge.

Output JSON with: primary_label, score (0–100), annotations (short tags like
"cherry-picked timeframe", "missing context"), explanation (1-3 sentences).

DO NOT cite specific sources, URLs, domains, or studies — citations are
forbidden in this provisional pass. The next pass will add citations.

If the claim is checkable but your knowledge is stale or insufficient, use the
backward-compatible enum value UNVERIFIABLE to mean "not enough reliable
backing found yet"; do not describe the fact itself as impossible to verify.

Use CLAIM_CONTEXT to understand how the claim appeared in conversation; it is
not evidence. Verify the proposition's truth, but do not imply the visible
speaker asserted it directly when stance or attribution says it was quoted,
reported, denied, mocked, questioned, uncertain, unsafe, or clip-sourced.

If the claim is a personal opinion, use OPINION and score 0.`;

function formatClaimContext(context: z.infer<typeof VerifyClaimContext> | undefined): string {
  if (!context) return "";
  const speaker = context.speaker_id === null
    ? "Unknown owner"
    : typeof context.speaker_id === "number"
      ? `Speaker ${context.speaker_id + 1}`
      : "Unspecified owner";
  const topic = context.topic ? ` topic=${context.topic}` : "";
  const stance = context.stance ? ` stance=${context.stance}` : "";
  const attribution = context.attribution_status ? ` attribution=${context.attribution_status}` : "";
  const attributionReasons = context.attribution_reasons ?? [];
  const reasons = attributionReasons.length > 0
    ? ` attribution_reasons=${attributionReasons.join(",")}`
    : "";
  return `CLAIM_CONTEXT (conversation metadata only; not evidence):\n[${speaker}]${topic}${stance}${attribution}${reasons}\n\n`;
}

export function userPrompt(args: z.infer<typeof VerifyPromptRequest>): string {
  const sourceContext = args.source_context?.trim()
    ? `SOURCE_CONTEXT (for disambiguation only; not evidence):\n${args.source_context.trim()}\n\n`
    : "";
  return `${sourceContext}${formatClaimContext(args.claim_context)}CLAIM:\n${args.claim_text}`;
}
