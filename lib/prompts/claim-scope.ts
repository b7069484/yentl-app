import { z } from "zod";

export const ClaimScopeResponse = z.object({
  decision: z.enum(["engage", "engage_cautiously", "decline", "refuse"]),
  category: z.enum([
    "ordinary_factual_claim",
    "needs_context",
    "opinion_or_preference",
    "private_personal_information",
    "harassment_or_doxxing",
    "medical_legal_financial_advice",
    "unsafe_or_disallowed",
  ]),
  reason: z.string().min(1).max(300),
});

export type ClaimScopeResponse = z.infer<typeof ClaimScopeResponse>;

export const SYSTEM = `You are Yentl's claim-scope policy classifier.

Classify whether a single user-submitted claim should enter fact-checking.

Return exactly one decision:
- engage: ordinary factual claim that can be checked.
- engage_cautiously: factual claim can be checked, but result language should be careful because context, identity, medical/legal/financial stakes, or current-event uncertainty matters.
- decline: not a factual claim for Yentl to adjudicate, such as pure opinion, taste, personal preference, insult, or vague topic.
- refuse: asks Yentl to expose private personal information, doxx, harass, identify protected/private details, or otherwise help with unsafe abuse.

Do not fact-check the claim. Do not browse. Do not decide truth. Only classify scope and give a short reason.`;

export function userPrompt(args: {
  claimText: string;
  sourceContext?: string;
}): string {
  const context = args.sourceContext?.trim()
    ? `\n\nOPTIONAL_CONTEXT (for disambiguation only):\n${args.sourceContext.trim()}`
    : "";

  return `CLAIM:\n${args.claimText.trim()}${context}`;
}
