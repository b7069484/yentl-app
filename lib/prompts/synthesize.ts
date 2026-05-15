import { z } from "zod";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

export const SynthesizeRequest = z.object({
  utterances: z.array(
    z.object({
      speaker_id: z.number().nullable(),
      text: z.string(),
      start: z.number(),
      end: z.number(),
    }),
  ),
  counters: z.object({
    claims: z.number(),
    false: z.number(),
    partial: z.number(),
    true: z.number(),
    fallacy: z.number(),
    bias: z.number(),
    rhetoric: z.number(),
  }),
  speakers: z.array(
    z.object({
      id: z.number(),
      label: z.string(),
    }),
  ),
});

// ---------------------------------------------------------------------------
// Response schema — EXACTLY 3 headlines enforced by zod tuple
// ---------------------------------------------------------------------------

export const SynthesizeResponse = z.object({
  text: z.string(),
  headlines: z.tuple([z.string(), z.string(), z.string()]),
});

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export const SYSTEM_PREFIX = `You are Yenta, a live fact-check synthesizer. You read what's happened so far in a real-time conversation and produce a concise read for the user.

Given:
- The last N utterances (with [Speaker X] prefixes)
- Running counters: total claims, false/partial/true breakdown, fallacy/bias/rhetoric counts
- Speaker labels

Produce JSON with two fields:

1. \`text\`: ONE short paragraph (60–90 words). Describe what's happening in the conversation: who is making claims, what positions they're taking, what the disputed terrain is. Use the speakers' names from the labels. Mention specific verdicts/markers by count when relevant (e.g., "3 false claims and 2 fallacies have surfaced"). Plain prose, no markdown.

2. \`headlines\`: EXACTLY 3 one-line insights, each ≤80 chars. Each headline derives from the counters/speakers, never from raw transcript:
   - Headline 1 — speaker fallacy attribution: if any speaker has ≥2 markers, call out the count and (if they share archetype) the archetype. Else: skip with a fallback like "No fallacies attributed to any single speaker yet."
   - Headline 2 — verdict ratio: if any speaker has ≥2 claims all of the same verdict family, call it out ("Mira's claims: 4/4 verified"). Else: a topic-aware fallback ("Mixed verdicts across both speakers so far").
   - Headline 3 — topic concentration: if any topic appears in ≥40% of claims, call it out ("Climate: 62% of claims"). Else: ("Topics spread across science, politics, and culture").

Be terse. Do NOT editorialize. Do NOT add advice. Do NOT mention yourself.`;

// ---------------------------------------------------------------------------
// userPrompt builder
// ---------------------------------------------------------------------------

export function userPrompt(args: {
  utterances: Array<{ speaker_id: number | null; text: string; start: number; end: number }>;
  counters: { claims: number; false: number; partial: number; true: number; fallacy: number; bias: number; rhetoric: number };
  speakers: Array<{ id: number; label: string }>;
}): string {
  const speakerMap = new Map(args.speakers.map((s) => [s.id, s.label]));

  const utterancesText = args.utterances
    .map((u) => {
      const label =
        u.speaker_id !== null
          ? (speakerMap.get(u.speaker_id) ?? `Speaker ${u.speaker_id}`)
          : "Unknown";
      return `[${label}] ${u.text}`;
    })
    .join("\n");

  const { counters } = args;
  const speakerLabels = args.speakers.map((s) => `${s.id}: ${s.label}`).join(", ") || "(none)";

  return `UTTERANCES:
${utterancesText || "(none)"}

COUNTERS:
total_claims=${counters.claims} false=${counters.false} partial=${counters.partial} true=${counters.true} fallacy=${counters.fallacy} bias=${counters.bias} rhetoric=${counters.rhetoric}

SPEAKERS:
${speakerLabels}`;
}
