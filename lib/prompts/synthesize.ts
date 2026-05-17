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
// Per-speaker verdict schema
// ---------------------------------------------------------------------------

export const SpeakerVerdictSchema = z.object({
  speaker_id: z.number(),
  label: z.string(),
  factual_grade: z.enum(["mostly_factual", "mixed", "mostly_inaccurate", "insufficient"]),
  faith_grade: z.enum(["good_faith", "mixed", "bad_faith", "insufficient"]),
  one_liner: z.string(),
});

export type SpeakerVerdict = z.infer<typeof SpeakerVerdictSchema>;

// ---------------------------------------------------------------------------
// Response schema — EXACTLY 3 headlines enforced by zod tuple
// ---------------------------------------------------------------------------

export const SynthesizeResponse = z.object({
  text: z.string(),
  headlines: z.tuple([z.string(), z.string(), z.string()]),
  per_speaker_verdicts: z.array(SpeakerVerdictSchema).optional(),
});

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export const SYSTEM_PREFIX = `You are Yentl, a live fact-check synthesizer. You read what's happened so far in a real-time conversation and produce a concise read for the user.

Given:
- The last N utterances (with [Speaker X] prefixes)
- Running counters: total claims, false/partial/true breakdown, fallacy/bias/rhetoric counts
- Speaker labels

Produce JSON with three fields:

1. \`text\`: ONE short paragraph (60–90 words). Describe what's happening in the conversation: who is making claims, what positions they're taking, what the disputed terrain is. Use the speakers' names from the labels. Mention specific verdicts/markers by count when relevant (e.g., "3 false claims and 2 fallacies have surfaced"). Plain prose, no markdown.

2. \`headlines\`: EXACTLY 3 one-line insights, each ≤80 chars. Each headline derives from the counters/speakers, never from raw transcript:
   - Headline 1 — speaker fallacy attribution: if any speaker has ≥2 markers, call out the count and (if they share archetype) the archetype. Else: skip with a fallback like "No fallacies attributed to any single speaker yet."
   - Headline 2 — verdict ratio: if any speaker has ≥2 claims all of the same verdict family, call it out ("Mira's claims: 4/4 verified"). Else: a topic-aware fallback ("Mixed verdicts across both speakers so far").
   - Headline 3 — topic concentration: if any topic appears in ≥40% of claims, call it out ("Climate: 62% of claims"). Else: ("Topics spread across science, politics, and culture").

3. \`per_speaker_verdicts\`: ONE entry per speaker listed in SPEAKERS. Each entry has:
   - \`speaker_id\`: the speaker's numeric id
   - \`label\`: the speaker's label string
   - \`factual_grade\`: one of "mostly_factual" | "mixed" | "mostly_inaccurate" | "insufficient"
     - mostly_factual = ≥2 verified TRUE/MOSTLY_TRUE claims AND ≤1 FALSE/MISLEADING for this speaker
     - mixed = roughly equal balance of true vs partial/misleading for this speaker
     - mostly_inaccurate = ≥2 FALSE/MISLEADING AND ≤1 TRUE for this speaker
     - insufficient = fewer than 2 verdicted claims for this speaker
   - \`faith_grade\`: one of "good_faith" | "mixed" | "bad_faith" | "insufficient"
     - good_faith = engaging with the topic, no or minimal fallacies/hostile rhetoric
     - mixed = some fallacies/rhetoric markers but mostly genuine engagement
     - bad_faith = pattern of fallacies, ad hominem, evasion, or hostile framing
     - insufficient = not enough to judge
   - \`one_liner\`: ≤16 words, plain-language summary of this speaker's stance and credibility

Rules for per_speaker_verdicts:
- Produce exactly one entry per speaker in SPEAKERS (even if they have no claims yet — use "insufficient" for both grades).
- Be conservative: use "insufficient" when data is thin. Do NOT infer bad faith from a single weak signal; require a pattern.
- The one_liner must be ≤16 words, plain prose, no markdown.
- Do NOT repeat the grade labels verbatim in the one_liner.

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
