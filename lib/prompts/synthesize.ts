import { z } from "zod";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const ClaimSummarySchema = z.object({
  text: z.string(),
  verdict: z.string(),
  score: z.number().optional(),
  speaker_id: z.number().nullable(),
  topic: z.string().nullable().optional(),
  stance: z.string().optional(),
  attribution_status: z.string().optional(),
  attribution_reasons: z.array(z.string()).default([]),
  explanation: z.string().optional(),
});

export const SynthesizeRequest = z.object({
  utterances: z.array(
    z.object({
      speaker_id: z.number().nullable(),
      text: z.string(),
      start: z.number(),
      end: z.number(),
      source_audio_kind: z.string().optional(),
      anchor: z.string().optional(),
      attribution_status: z.string().optional(),
      attribution_reasons: z.array(z.string()).default([]),
      overlap_class: z.string().optional(),
      turn_id: z.string().optional(),
      segment_id: z.string().optional(),
    }),
  ),
  analysis_scope: z.object({
    mode: z.enum(["live_window", "full_session"]),
    total_utterances: z.number().int().nonnegative(),
    included_utterances: z.number().int().nonnegative(),
  }).optional(),
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
  claims: z.array(ClaimSummarySchema).default([]),
  source_context: z.string().max(12_000).default(""),
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

export const SynthesisMetaReadSchema = z.object({
  posture: z.enum(["good_faith", "mixed", "bad_faith_risk", "insufficient"]),
  source_health: z.enum(["strong", "mixed", "thin", "unknown"]),
  scope: z.enum(["live_window", "full_session"]),
  summary: z.string(),
  uncertainty: z.string(),
  key_question: z.string(),
});

export type SynthesisMetaRead = z.infer<typeof SynthesisMetaReadSchema>;

// ---------------------------------------------------------------------------
// Response schema — EXACTLY 3 headlines enforced by zod tuple
// ---------------------------------------------------------------------------

export const SynthesizeResponse = z.object({
  text: z.string(),
  headlines: z.tuple([z.string(), z.string(), z.string()]),
  per_speaker_verdicts: z.array(SpeakerVerdictSchema).optional(),
  meta_read: SynthesisMetaReadSchema.optional(),
});

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export const SYSTEM_PREFIX = `You are Yentl, a live fact-check synthesizer. You read what's happened so far in a real-time conversation and produce a concise read for the user.

Given:
- The last N utterances (with [Speaker X] prefixes)
- Source context when available, including document overview and article/page metadata
- Utterance attribution metadata when available: attribution status, overlap class, turn id, and segment id
- Recent claim summaries with verdicts, owners, stance, attribution status, and topics
- Running counters: total claims, false/partial/true breakdown, fallacy/bias/rhetoric counts
- Speaker labels

Produce JSON with four fields:

1. \`text\`: ONE short paragraph (60–90 words). Describe what's happening in the conversation: who is making claims, what positions they're taking, what the disputed terrain is. Use the speakers' names from the labels. Mention specific verdicts/markers by count when relevant (e.g., "3 false claims and 2 fallacies have surfaced"). Plain prose, no markdown.

2. \`headlines\`: EXACTLY 3 one-line insights, each ≤80 chars. Each headline derives from the counters/speakers, never from raw transcript:
   - Headline 1 — speaker fallacy attribution: if any speaker has ≥2 markers, call out the count and (if they share archetype) the archetype. Else: skip with a fallback like "No fallacies attributed to any single speaker yet."
   - Headline 2 — verdict ratio: use CLAIMS, not counters alone. If any confident owner has ≥2 claims all of the same verdict family, call it out ("Mira's claims: 4/4 verified"). Else: a topic-aware fallback ("Mixed verdicts across both speakers so far").
   - Headline 3 — topic concentration: use CLAIMS topics. If any topic appears in ≥40% of claims, call it out ("Climate: 62% of claims"). Else: ("Topics spread across science, politics, and culture").

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
- Use CLAIMS for speaker factual grades. Do not infer per-speaker claim ratios from aggregate counters.
- Do not count null-owner, uncertain, unsafe_overlap, quote_or_clip, quoted, reported, mocked, or questioned claims as clean assertions by that speaker. Mention uncertainty when it matters.
- Be conservative: use "insufficient" when data is thin. Do NOT infer bad faith from a single weak signal; require a pattern.
- The one_liner must be ≤16 words, plain prose, no markdown.
- Do NOT repeat the grade labels verbatim in the one_liner.
- Use SOURCE_CONTEXT and utterance anchors for orientation only. Do not treat them as evidence for factual verdicts.

4. \`meta_read\`: ONE conversation-level read that preserves the whole-context view:
   - \`posture\`: "good_faith" | "mixed" | "bad_faith_risk" | "insufficient"
   - \`source_health\`: "strong" | "mixed" | "thin" | "unknown"
   - \`scope\`: copy ANALYSIS_SCOPE.mode exactly: "live_window" or "full_session"
   - \`summary\`: one sentence that names the overall conversation posture without overstating intent
   - \`uncertainty\`: one sentence naming what is still uncertain or thin
   - \`key_question\`: one concrete question the user should inspect next

Rules for meta_read:
- Prefer "insufficient" when there are fewer than two clean owned claims and little source context.
- Use "bad_faith_risk" only for a pattern, not a single marker or one weak claim.
- Use source_health="thin" when source context is absent, claims are mostly unverified, or evidence is mostly provisional.
- Use source_health="mixed" when some source context or verified evidence exists but important gaps remain.
- Use source_health="strong" only when multiple clean owned claims have source-backed verdicts and source context is present.
- The uncertainty field is required even when the read seems strong.

Be terse. Do NOT editorialize. Do NOT add advice. Do NOT mention yourself.`;

// ---------------------------------------------------------------------------
// userPrompt builder
// ---------------------------------------------------------------------------

export function userPrompt(args: {
  utterances: Array<{
    speaker_id: number | null;
    text: string;
    start: number;
    end: number;
    source_audio_kind?: string;
    anchor?: string;
    attribution_status?: string;
    attribution_reasons?: string[];
    overlap_class?: string;
    turn_id?: string;
    segment_id?: string;
  }>;
  counters: { claims: number; false: number; partial: number; true: number; fallacy: number; bias: number; rhetoric: number };
  speakers: Array<{ id: number; label: string }>;
  claims?: z.infer<typeof ClaimSummarySchema>[];
  source_context?: string;
  analysis_scope?: {
    mode: "live_window" | "full_session";
    total_utterances: number;
    included_utterances: number;
  };
}): string {
  const speakerMap = new Map(args.speakers.map((s) => [s.id, s.label]));

  const utterancesText = args.utterances
    .map((u) => {
      const label =
        u.speaker_id !== null
          ? (speakerMap.get(u.speaker_id) ?? `Speaker ${u.speaker_id}`)
          : "Unknown";
      const anchor = u.anchor ? `[${u.anchor}] ` : "";
      const sourceKind = u.source_audio_kind ? `[source=${u.source_audio_kind}] ` : "";
      const attribution = [
        u.attribution_status ? `attribution=${u.attribution_status}` : null,
        u.overlap_class ? `overlap=${u.overlap_class}` : null,
        u.turn_id ? `turn=${u.turn_id}` : null,
        u.segment_id ? `segment=${u.segment_id}` : null,
        u.attribution_reasons?.length ? `reasons=${u.attribution_reasons.join(",")}` : null,
      ].filter(Boolean).join(" ");
      const attributionText = attribution ? `[${attribution}] ` : "";
      return `${anchor}${sourceKind}[${label}] ${attributionText}${u.text}`;
    })
    .join("\n");

  const { counters } = args;
  const speakerLabels = args.speakers.map((s) => `${s.id}: ${s.label}`).join(", ") || "(none)";
  const claimsText = (args.claims ?? []).length > 0
    ? (args.claims ?? [])
        .map((claim, index) => {
          const owner =
            claim.speaker_id !== null
              ? (speakerMap.get(claim.speaker_id) ?? `Speaker ${claim.speaker_id}`)
              : "Unknown owner";
          const score = typeof claim.score === "number" ? ` score=${claim.score}` : "";
          const topic = claim.topic ? ` topic=${claim.topic}` : "";
          const stance = claim.stance ? ` stance=${claim.stance}` : "";
          const attribution = claim.attribution_status ? ` attribution=${claim.attribution_status}` : "";
          const reasons = claim.attribution_reasons.length > 0
            ? ` reasons=${claim.attribution_reasons.join(",")}`
            : "";
          return `${index + 1}. [${owner}] verdict=${claim.verdict}${score}${topic}${stance}${attribution}${reasons}: ${claim.text}`;
        })
        .join("\n")
    : "(none yet)";

  const sourceContext = args.source_context?.trim();
  const analysisScope = args.analysis_scope
    ? `mode=${args.analysis_scope.mode} included_utterances=${args.analysis_scope.included_utterances} total_utterances=${args.analysis_scope.total_utterances}`
    : "mode=live_window included_utterances=unknown total_utterances=unknown";

  return `${sourceContext ? `SOURCE_CONTEXT:\n${sourceContext}\n\n` : ""}UTTERANCES:
${utterancesText || "(none)"}

CLAIMS:
${claimsText}

COUNTERS:
total_claims=${counters.claims} false=${counters.false} partial=${counters.partial} true=${counters.true} fallacy=${counters.fallacy} bias=${counters.bias} rhetoric=${counters.rhetoric}

ANALYSIS_SCOPE:
${analysisScope}

SPEAKERS:
${speakerLabels}`;
}
