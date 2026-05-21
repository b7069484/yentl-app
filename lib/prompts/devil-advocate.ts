import { z } from "zod";

export const DevilAdvocateRequest = z.object({
  utterances: z.array(
    z.object({
      speaker_id: z.number().nullable(),
      text: z.string(),
      start: z.number(),
      end: z.number(),
    }),
  ).min(1),
  claims: z.array(
    z.object({
      text: z.string(),
      verdict: z.string(),
      score: z.number().optional(),
      speaker_id: z.number().nullable(),
      explanation: z.string().optional(),
    }),
  ).default([]),
  markers: z.array(
    z.object({
      display: z.string(),
      severity: z.string(),
      excerpt: z.string(),
      speaker_id: z.number().nullable(),
      explanation: z.string().optional(),
    }),
  ).default([]),
  source_context: z.string().optional(),
});

export const DevilAdvocateResponse = z.object({
  stance: z.string(),
  strongest_counterarguments: z.tuple([z.string(), z.string(), z.string()]),
  weakest_assumption: z.string(),
  questions: z.tuple([z.string(), z.string()]),
  confidence: z.enum(["low", "medium", "high"]),
});

export const SYSTEM = `You are Yentl's Devil's Advocate, powered by Grok.

Your job is not to be contrarian for sport. Your job is to stress-test the current transcript and analysis so the user can see the best opposing interpretation, missing evidence, and weak assumptions before accepting a verdict.

Return JSON only:
- stance: one plain-language sentence naming the main thing a careful skeptic would challenge.
- strongest_counterarguments: exactly 3 concise points. Each should be charitable, evidence-aware, and specific to the transcript.
- weakest_assumption: one sentence naming the assumption most likely to fail.
- questions: exactly 2 questions the user should ask before deciding.
- confidence: "low", "medium", or "high" confidence that the challenge is meaningful.

Rules:
- Do not invent facts, sources, statistics, or events not present in the input.
- Use source context only to disambiguate people, channels, pages, and topics. Do not treat page metadata as external evidence.
- Do not reverse a claim verdict unless the input itself supports the challenge.
- If the transcript is thin, say so and keep confidence low.
- Avoid snark. Be sharp, fair, and useful.`;

export function userPrompt(args: z.infer<typeof DevilAdvocateRequest>): string {
  const utterances = args.utterances
    .map((u) => {
      const speaker = u.speaker_id === null ? "Unknown" : `Speaker ${u.speaker_id + 1}`;
      return `[${Math.floor(u.start)}s ${speaker}] ${u.text}`;
    })
    .join("\n");

  const claims = args.claims.length > 0
    ? args.claims
        .map((claim, index) => {
          const speaker = claim.speaker_id === null ? "Unknown" : `Speaker ${claim.speaker_id + 1}`;
          const score = typeof claim.score === "number" ? ` score=${claim.score}` : "";
          const explanation = claim.explanation ? ` explanation="${claim.explanation}"` : "";
          return `${index + 1}. [${speaker}] verdict=${claim.verdict}${score}: ${claim.text}${explanation}`;
        })
        .join("\n")
    : "(none yet)";

  const markers = args.markers.length > 0
    ? args.markers
        .map((marker, index) => {
          const speaker = marker.speaker_id === null ? "Unknown" : `Speaker ${marker.speaker_id + 1}`;
          const explanation = marker.explanation ? ` explanation="${marker.explanation}"` : "";
          return `${index + 1}. [${speaker}] ${marker.display} severity=${marker.severity}: "${marker.excerpt}"${explanation}`;
        })
        .join("\n")
    : "(none yet)";

  const sourceContext = args.source_context?.trim()
    ? `SOURCE_CONTEXT:\n${args.source_context.trim()}\n\n`
    : "";

  return `${sourceContext}TRANSCRIPT:
${utterances}

CURRENT CLAIM ANALYSIS:
${claims}

CURRENT RHETORIC MARKERS:
${markers}`;
}

export function parseDevilAdvocateText(text: string) {
  const trimmed = text.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Grok did not return a JSON object.");
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1));
  return DevilAdvocateResponse.parse(parsed);
}
