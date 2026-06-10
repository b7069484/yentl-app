import { z } from "zod";
import type {
  AttributionReason,
  AttributionStatus,
  ClaimOwnership,
  ClaimStance,
  DocumentAnchor,
  OverlapClass,
  SourceAudioKind,
} from "@/lib/types";

export const TOPIC = z.enum([
  "Politics",
  "Defense",
  "Economy",
  "Society",
  "Immigration",
  "Healthcare",
  "Climate",
  "Science",
  "Law",
  "History",
  "Culture",
  "Other",
]);
export type Topic = z.infer<typeof TOPIC>;

export const STANCE_VALUES = [
  "asserted",
  "denied",
  "quoted",
  "reported",
  "mocked",
  "questioned",
  "corrected",
  "hedged",
  "unclear",
] as const satisfies readonly ClaimStance[];

export const ATTRIBUTION_STATUS_VALUES = [
  "confident",
  "probable",
  "uncertain",
  "unsafe_overlap",
  "quote_or_clip",
  "manual_corrected",
  "not_available",
] as const satisfies readonly AttributionStatus[];

export const ATTRIBUTION_REASON_VALUES = [
  "single_speaker_high_confidence",
  "dominant_speaker_low_margin",
  "speaker_change_mid_segment",
  "short_backchannel",
  "competitive_interruption",
  "parallel_claim",
  "crowd_or_bleed",
  "quoted_or_reported_speech",
  "provider_missing_speaker",
  "manual_user_action",
] as const satisfies readonly AttributionReason[];

export const OVERLAP_CLASS_VALUES = [
  "none",
  "backchannel_continuer",
  "collaborative_completion",
  "competitive_interruption",
  "repair_initiation",
  "parallel_claim",
  "crowd_or_bleed",
  "unknown_overlap",
] as const satisfies readonly OverlapClass[];

export const SOURCE_AUDIO_KIND_VALUES = [
  "mic",
  "browser_tab",
  "audio_file",
  "youtube_caption",
  "srt_vtt",
  "text_import",
  "diagnostic_corpus",
] as const satisfies readonly SourceAudioKind[];

export const DOCUMENT_ANCHOR_KIND_VALUES = [
  "paragraph",
  "speaker_turn",
  "caption_cue",
  "article_chunk",
] as const satisfies readonly DocumentAnchor["kind"][];

export const DocumentAnchorSchema = z.object({
  kind: z.enum(DOCUMENT_ANCHOR_KIND_VALUES),
  block_index: z.number().int().nonnegative(),
  paragraph_index: z.number().int().nonnegative().optional(),
  line_start: z.number().int().positive().optional(),
  line_end: z.number().int().positive().optional(),
  cue_index: z.number().int().nonnegative().optional(),
  speaker_label: z.string().max(80).optional(),
  char_start: z.number().int().nonnegative().optional(),
  char_end: z.number().int().nonnegative().optional(),
  quote_text: z.string().max(2_000).optional(),
}) satisfies z.ZodType<DocumentAnchor>;

export const ExtractedClaimOwnership = z.object({
  owner_speaker_id: z.number().int().nonnegative().nullable(),
  attribution_status: z.enum(ATTRIBUTION_STATUS_VALUES),
  attribution_reasons: z.array(z.enum(ATTRIBUTION_REASON_VALUES)),
  stance: z.enum(STANCE_VALUES),
  confidence: z.number().min(0).max(1),
  source_turn_ids: z.array(z.string()),
  source_segment_ids: z.array(z.string()),
}) satisfies z.ZodType<ClaimOwnership>;

export const ExtractedClaim = z.object({
  claim_text: z.string().min(3),
  utterance_start: z.number(),
  utterance_end: z.number(),
  topic: TOPIC,
  topic_secondary: TOPIC.nullable(),
  stance: z.enum(STANCE_VALUES).default("asserted"),
  ownership: ExtractedClaimOwnership.optional(),
});
export type ExtractedClaim = z.infer<typeof ExtractedClaim>;

export const ExtractClaimsResponse = z.object({
  claims: z.array(ExtractedClaim),
});

export const SYSTEM = `You extract checkable factual claims from a live transcript.

Output JSON: { "claims": [{ "claim_text", "utterance_start", "utterance_end", "topic", "topic_secondary", "stance", "ownership" }] }.

Rules:
- Return ONLY claims verifiable against external sources (statistics, dates, names, events, attributions).
- SKIP: pure opinions, normative statements ("should"/"ought"), hypotheticals, predictions, questions.
- SKIP: any claim text whose normalized form matches an entry in RECENT_HASHES — those are already known.
- If the latest utterance contains no checkable claim, return { "claims": [] }.
- For utterance_start/utterance_end, use the timestamps provided for the latest utterance.

ENTITY ANCHORING (critical for verification):
- CONTEXT may include SOURCE_CONTEXT from the page title, channel, author, username, canonical URL, and detected names. Use it for disambiguation, not as proof of a factual claim.
- CONTEXT may include SOURCE_CONTEXT, CURRENT_DOCUMENT_POSITION, and anchor-labelled TRANSCRIPT_CONTEXT. Use those labels to keep a claim tied to the surrounding article, paragraph, caption cue, or speaker turn.
- For every named person, organization, or location in claim_text, include their MOST SPECIFIC identifier available in CONTEXT (title, role, affiliation, date). NEVER use a bare proper name when CONTEXT establishes a disambiguating role.
  Example BAD: "Joe Kent resigned from his position."
  Example GOOD: "Joe Kent, Director of the National Counterterrorism Center under Trump, resigned in protest of the Iran war policy."

REPORTED SPEECH / EVALUATIVE FRAMES:
- When a claim about a person's actions or qualifications is embedded in an evaluative frame (e.g., "you can't say he doesn't know what he's talking about", "they tried to tell you he was a leaker but that was a lie"), extract the EMBEDDED factual claim separately from the evaluative wrapper. Two extracted claims are better than one tangled hybrid.
  Example: from "They tried to tell you he was under investigation, but that was a lie" — the embedded factual claim is "He was under investigation" (the speaker is asserting its negation, but the claim itself is checkable against public reporting).

STANCE TAGGING:
- For every extracted claim, set stance to how the current speaker held the claim:
  - "asserted": the speaker makes the claim as their own truth.
  - "denied": the speaker denies the claim, e.g. "X is not true."
  - "quoted": the speaker repeats someone else's claim verbatim and attributes it.
  - "reported": the speaker paraphrases what someone else said.
  - "mocked": the speaker repeats the claim sarcastically or to ridicule it.
  - "questioned": the speaker raises the claim as a question, not a statement.
  - "corrected": the speaker corrects a prior false or incomplete claim.
  - "hedged": the speaker states the claim with explicit uncertainty, e.g. "I think..." or "maybe..."
  - "unclear": the context is insufficient to determine how the speaker held the claim.
- When stance is "quoted", "reported", "mocked", or "questioned", still extract the checkable claim. Downstream verification will treat it differently from a direct assertion.

CLAIM OWNERSHIP:
- For every extracted claim, include ownership:
  { "owner_speaker_id", "attribution_status", "attribution_reasons", "stance", "confidence", "source_turn_ids", "source_segment_ids" }.
- owner_speaker_id is the speaker responsible for the proposition, not always the raw voice in the segment.
- Use SEGMENT_ATTRIBUTION as the floor: if attribution_status is "unsafe_overlap", "quote_or_clip", or "not_available", do not confidently assign an owner; set owner_speaker_id to null unless the surrounding context makes ownership explicit.
- For quoted, reported, mocked, questioned, interrupted, or parallel speech, prefer "uncertain" or "quote_or_clip" over a confident owner.
- confidence is 0..1 and should be low when owner_speaker_id is null because attribution is unsafe, mixed, quoted, or missing.
- source_turn_ids and source_segment_ids should include the current turn/segment IDs when available.

TOPIC TAGGING:
- topic (required): the PRIMARY domain. One of: Politics, Defense, Economy, Society, Immigration, Healthcare, Climate, Science, Law, History, Culture, Other. Use "Other" when none fit.
- topic_secondary (nullable): a SECOND domain when the claim cross-cuts. Must differ from topic. Set to null when one tag suffices. Example: a claim about a counterterrorism official's resignation indexes Politics + Defense.`;

export function userPrompt(args: {
  utterance: string;
  utterance_start: number;
  utterance_end: number;
  context: string;
  recent_hashes: string[];
  speaker_id?: number | null;
  segment_id?: string | null;
  turn_id?: string | null;
  attribution_status?: AttributionStatus;
  attribution_reasons?: AttributionReason[];
  overlap_class?: OverlapClass;
  source_audio_kind?: SourceAudioKind;
  document_anchor?: DocumentAnchor;
}): string {
  const documentAnchor = args.document_anchor
    ? [
        `document_anchor: ${args.document_anchor.kind} ${args.document_anchor.block_index + 1}`,
        args.document_anchor.paragraph_index !== undefined
          ? `paragraph: ${args.document_anchor.paragraph_index + 1}`
          : "",
        args.document_anchor.cue_index !== undefined
          ? `cue: ${args.document_anchor.cue_index + 1}`
          : "",
        args.document_anchor.line_start !== undefined
          ? `lines: ${args.document_anchor.line_start}-${args.document_anchor.line_end ?? args.document_anchor.line_start}`
          : "",
        args.document_anchor.speaker_label ? `speaker_label: ${args.document_anchor.speaker_label}` : "",
        args.document_anchor.char_start !== undefined && args.document_anchor.char_end !== undefined
          ? `chars: ${args.document_anchor.char_start}-${args.document_anchor.char_end}`
          : "",
        args.document_anchor.quote_text ? `quote: ${args.document_anchor.quote_text}` : "",
      ].filter(Boolean).join("\n")
    : "";
  const attribution = [
    ["speaker_id", args.speaker_id],
    ["segment_id", args.segment_id],
    ["turn_id", args.turn_id],
    ["attribution_status", args.attribution_status],
    ["attribution_reasons", args.attribution_reasons?.join(", ")],
    ["overlap_class", args.overlap_class],
    ["source_audio_kind", args.source_audio_kind],
    ["document_position", documentAnchor],
  ]
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

  return `LATEST_UTTERANCE (start=${args.utterance_start}, end=${args.utterance_end}):
${args.utterance}

${attribution ? `SEGMENT_ATTRIBUTION:\n${attribution}\n\n` : ""}\
CONTEXT (source metadata + preceding ~30s):
${args.context}

RECENT_HASHES:
${args.recent_hashes.join("\n") || "(none)"}`;
}
