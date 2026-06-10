"use client";
import { ulid } from "ulid";
import { useSession } from "./session-store";
import { claimContextForVerification, compactContextPairs, sourceContextForPrompt } from "./analysis-context";
import { hashClaim, RecentSet } from "@/lib/dedup";
import { documentAnchorLabel } from "@/lib/document-anchor";
import { bestSourceQuoteRange } from "@/lib/source-evidence";
import { getEntry } from "@/lib/taxonomy";
import type {
  AttributionReason,
  AttributionStatus,
  ClaimCard,
  ClaimOwnership,
  ClaimStance,
  DocumentAnchor,
  OverlapClass,
  RhetoricMarker,
  Source,
  SourcePreview,
  SpeakerId,
  TranscriptSegment,
} from "@/lib/types";

const recentClaimHashes = new RecentSet(30);
const recentMarkerHashes = new RecentSet(40);
let utteranceCounter = 0;
let lastRhetoricRunAt = 0;

let latestRms = 0;
let peakRmsSinceLastSegment = 0;

let synthesisUtteranceCounter = 0;
let lastSynthesisRunAt = 0;
let synthesisAbortController: AbortController | null = null;

let devilUtteranceCounter = 0;
let lastDevilRunAt = 0;
let devilAbortController: AbortController | null = null;

type ExtractedClaim = {
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  topic: string;
  topic_secondary: string | null;
  stance?: ClaimStance;
  ownership?: ClaimOwnership;
};

const LOW_CONFIDENCE_OWNER_STATUSES = new Set<AttributionStatus>([
  "uncertain",
  "unsafe_overlap",
  "quote_or_clip",
  "not_available",
]);

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function fallbackOwnershipConfidence(status: AttributionStatus): number {
  if (status === "manual_corrected") return 0.9;
  if (status === "confident") return 0.8;
  if (status === "probable") return 0.6;
  if (status === "uncertain") return 0.35;
  return 0.2;
}

function fallbackOwnerSpeakerId(segment: TranscriptSegment, status: AttributionStatus): SpeakerId | null {
  if (segment.speaker_id === null) return null;
  if (LOW_CONFIDENCE_OWNER_STATUSES.has(status)) return null;
  return segment.speaker_id;
}

function fallbackSourceTurnIds(segment: TranscriptSegment): string[] {
  return segment.turn_id ? [segment.turn_id] : [];
}

function fallbackSourceSegmentIds(segment: TranscriptSegment): string[] {
  return segment.id ? [segment.id] : [];
}

function claimSummaryForAnalysis(claim: ClaimCard) {
  return {
    text: claim.claim_text,
    verdict: claim.primary_label,
    score: claim.score,
    speaker_id: claim.ownership?.owner_speaker_id ?? claim.speaker_id,
    topic: claim.topic,
    stance: claim.ownership?.stance ?? claim.stance,
    attribution_status: claim.ownership?.attribution_status,
    attribution_reasons: claim.ownership?.attribution_reasons ?? [],
    explanation: claim.explanation,
  };
}

function claimSummariesForSynthesis(claims: ClaimCard[]) {
  return claims.slice(-24).map(claimSummaryForAnalysis);
}

export function claimOwnershipForSegment(
  segment: TranscriptSegment,
  stance: ClaimStance,
  modelOwnership?: ClaimOwnership,
): ClaimOwnership {
  const fallbackStatus: AttributionStatus =
    segment.attribution_status ?? (segment.speaker_id === null ? "not_available" : "confident");
  const fallback: ClaimOwnership = {
    owner_speaker_id: fallbackOwnerSpeakerId(segment, fallbackStatus),
    attribution_status: fallbackStatus,
    attribution_reasons: segment.attribution_reasons ?? [],
    stance,
    confidence: fallbackOwnershipConfidence(fallbackStatus),
    source_turn_ids: fallbackSourceTurnIds(segment),
    source_segment_ids: fallbackSourceSegmentIds(segment),
  };

  if (!modelOwnership) return fallback;

  return {
    owner_speaker_id: modelOwnership.owner_speaker_id,
    attribution_status: modelOwnership.attribution_status,
    attribution_reasons:
      modelOwnership.attribution_reasons.length > 0
        ? modelOwnership.attribution_reasons
        : fallback.attribution_reasons,
    stance: modelOwnership.stance,
    confidence: clamp01(modelOwnership.confidence),
    source_turn_ids:
      modelOwnership.source_turn_ids.length > 0
        ? modelOwnership.source_turn_ids
        : fallback.source_turn_ids,
    source_segment_ids:
      modelOwnership.source_segment_ids.length > 0
        ? modelOwnership.source_segment_ids
        : fallback.source_segment_ids,
  };
}

export function documentAnchorLabelForPrompt(anchor?: DocumentAnchor): string | null {
  return documentAnchorLabel(anchor);
}

export function documentAnchorWithClaimQuote(
  anchor: DocumentAnchor | undefined,
  segmentText: string,
  claimText: string,
): DocumentAnchor | undefined {
  if (!anchor) return undefined;
  const quote = bestSourceQuoteRange(claimText, segmentText, {
    minScore: 0.25,
    allowSingleSentence: true,
  });
  if (!quote) return anchor;

  const baseOffset = Number.isFinite(anchor.char_start) ? anchor.char_start ?? 0 : 0;
  return {
    ...anchor,
    char_start: baseOffset + quote.start,
    char_end: baseOffset + quote.end,
    quote_text: quote.text,
  };
}

function documentAnchorContextForPrompt(anchor?: DocumentAnchor): string {
  if (!anchor) return "";
  return compactContextPairs([
    ["label", documentAnchorLabelForPrompt(anchor)],
    ["kind", anchor.kind],
    ["block", anchor.block_index + 1],
    ["paragraph", anchor.paragraph_index !== undefined ? anchor.paragraph_index + 1 : undefined],
    ["line range", anchor.line_start !== undefined ? `${anchor.line_start}-${anchor.line_end ?? anchor.line_start}` : undefined],
    ["cue", anchor.cue_index !== undefined ? anchor.cue_index + 1 : undefined],
    ["speaker label", anchor.speaker_label],
    ["character range", anchor.char_start !== undefined && anchor.char_end !== undefined ? `${anchor.char_start}-${anchor.char_end}` : undefined],
    ["quote", anchor.quote_text],
  ]);
}

function transcriptContextLineForPrompt(segment: TranscriptSegment): string {
  const speaker = segment.speaker_id !== null ? `[Speaker ${segment.speaker_id}]` : "[Unknown speaker]";
  const anchor = documentAnchorLabelForPrompt(segment.document_anchor);
  const sourceKind = segment.source_audio_kind ? `[${segment.source_audio_kind}]` : "";
  const position = anchor ? `[${anchor}]` : "";
  return [position, sourceKind, speaker, segment.text].filter(Boolean).join(" ");
}

function normalizeRms(rms: number): number {
  if (!Number.isFinite(rms)) return 0;
  return Math.max(0, Math.min(1, rms));
}

export function recordRmsSample(rms: number) {
  const normalized = normalizeRms(rms);
  latestRms = normalized;
  peakRmsSinceLastSegment = Math.max(peakRmsSinceLastSegment, normalized);
}

export function withAudioFeatures(segment: TranscriptSegment): TranscriptSegment {
  const peakRms = Math.max(peakRmsSinceLastSegment, latestRms);
  peakRmsSinceLastSegment = latestRms;
  return {
    ...segment,
    audio_features: {
      ...segment.audio_features,
      rms: latestRms,
      peak_rms: peakRms,
    },
  };
}

export function resetAudioFeatureWindowForTest() {
  latestRms = 0;
  peakRmsSinceLastSegment = 0;
}

export function attributeMarker(
  m: { start_time: number; end_time: number },
  transcript: TranscriptSegment[],
): SpeakerId | null {
  const overlapping = transcript.filter(
    (s) => s.end >= m.start_time && s.start <= m.end_time && s.speaker_id !== null,
  );
  if (overlapping.length === 0) return null;
  const ids = new Set(overlapping.map((s) => s.speaker_id as number));
  return ids.size === 1 ? (overlapping[0].speaker_id as number) : null;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function markerOverlappingSegments(
  m: { start_time: number; end_time: number },
  transcript: TranscriptSegment[],
): TranscriptSegment[] {
  return transcript.filter((s) => s.end >= m.start_time && s.start <= m.end_time);
}

function compactIds(values: Array<string | null | undefined>): string[] {
  return unique(values.filter((value): value is string => Boolean(value)));
}

function primaryOverlapClass(segments: TranscriptSegment[]): OverlapClass {
  const overlap = segments.find((s) => s.overlap_class && s.overlap_class !== "none")?.overlap_class;
  return overlap ?? "none";
}

function strongestOverlapClass(
  transcriptOverlapClass: OverlapClass,
  modelOverlapClass?: OverlapClass,
): OverlapClass {
  return transcriptOverlapClass !== "none"
    ? transcriptOverlapClass
    : (modelOverlapClass ?? "none");
}

function fallbackMarkerAttributionStatus(
  segments: TranscriptSegment[],
  speakerId: SpeakerId | null,
  overlapClass: OverlapClass,
): AttributionStatus {
  const statuses = segments
    .map((s) => s.attribution_status)
    .filter((value): value is AttributionStatus => Boolean(value));

  if (statuses.includes("unsafe_overlap") || overlapClass === "parallel_claim") return "unsafe_overlap";
  if (statuses.includes("quote_or_clip") || overlapClass === "crowd_or_bleed") return "quote_or_clip";
  if (statuses.includes("uncertain")) return "uncertain";
  if (statuses.includes("probable")) return "probable";
  if (statuses.includes("manual_corrected")) return "manual_corrected";
  if (speakerId !== null && segments.length > 0) return "confident";
  return segments.length > 0 ? "uncertain" : "not_available";
}

function fallbackMarkerAttributionReasons(
  segments: TranscriptSegment[],
  status: AttributionStatus,
  overlapClass: OverlapClass,
): AttributionReason[] {
  const reasons = unique(segments.flatMap((s) => s.attribution_reasons ?? []));
  if (reasons.length > 0) return reasons;
  if (status === "confident") return ["single_speaker_high_confidence"];
  if (status === "not_available") return ["provider_missing_speaker"];
  if (overlapClass === "parallel_claim") return ["parallel_claim"];
  if (overlapClass === "competitive_interruption") return ["competitive_interruption"];
  if (overlapClass === "backchannel_continuer") return ["short_backchannel"];
  if (overlapClass === "crowd_or_bleed") return ["crowd_or_bleed"];
  return ["dominant_speaker_low_margin"];
}

function attributionSafetyRank(status: AttributionStatus): number {
  switch (status) {
    case "confident":
    case "manual_corrected":
      return 4;
    case "probable":
      return 3;
    case "uncertain":
      return 2;
    case "unsafe_overlap":
    case "quote_or_clip":
    case "not_available":
      return 1;
  }
}

function saferMarkerAttributionStatus(
  fallbackStatus: AttributionStatus,
  modelStatus?: AttributionStatus,
): AttributionStatus {
  if (!modelStatus) return fallbackStatus;
  return attributionSafetyRank(modelStatus) < attributionSafetyRank(fallbackStatus)
    ? modelStatus
    : fallbackStatus;
}

function trustedModelIds(modelIds: string[] | undefined, transcriptIds: string[]): string[] {
  if (!modelIds?.length) return transcriptIds;
  const trusted = modelIds.filter((id) => transcriptIds.includes(id));
  return trusted.length > 0 ? trusted : transcriptIds;
}

type MarkerAttributionInput = Partial<
  Pick<
    RhetoricMarker,
    | "attribution_status"
    | "attribution_reasons"
    | "overlap_class"
    | "source_turn_ids"
    | "source_segment_ids"
  >
>;

export function markerAttributionForSpan(
  marker: { start_time: number; end_time: number },
  transcript: TranscriptSegment[],
  modelAttribution: MarkerAttributionInput = {},
): Pick<
  RhetoricMarker,
  "attribution_status" | "attribution_reasons" | "overlap_class" | "source_turn_ids" | "source_segment_ids"
> {
  const overlapping = markerOverlappingSegments(marker, transcript);
  const speakerId = attributeMarker(marker, transcript);
  const transcriptOverlapClass = primaryOverlapClass(overlapping);
  const overlapClass = strongestOverlapClass(transcriptOverlapClass, modelAttribution.overlap_class);
  const fallbackStatus = fallbackMarkerAttributionStatus(overlapping, speakerId, overlapClass);
  const attributionStatus = saferMarkerAttributionStatus(
    fallbackStatus,
    modelAttribution.attribution_status,
  );
  const shouldTrustModelReasons =
    modelAttribution.attribution_status === attributionStatus &&
    modelAttribution.attribution_reasons?.length;
  const attributionReasons = shouldTrustModelReasons
      ? modelAttribution.attribution_reasons
      : fallbackMarkerAttributionReasons(overlapping, attributionStatus, overlapClass);
  const transcriptTurnIds = compactIds(overlapping.map((s) => s.turn_id));
  const transcriptSegmentIds = compactIds(overlapping.map((s) => s.id));

  return {
    attribution_status: attributionStatus,
    attribution_reasons: attributionReasons,
    overlap_class: overlapClass,
    source_turn_ids: trustedModelIds(modelAttribution.source_turn_ids, transcriptTurnIds),
    source_segment_ids: trustedModelIds(modelAttribution.source_segment_ids, transcriptSegmentIds),
  };
}

export function formatRhetoricTranscriptLine(segment: TranscriptSegment): string {
  const tags = [
    `speaker=${segment.speaker_id === null ? "unknown" : `Speaker ${segment.speaker_id}`}`,
    `attribution=${segment.attribution_status ?? (segment.speaker_id === null ? "not_available" : "confident")}`,
    `overlap=${segment.overlap_class ?? "none"}`,
    segment.turn_id ? `turn=${segment.turn_id}` : null,
    segment.id ? `segment=${segment.id}` : null,
  ].filter(Boolean);

  return `[${Math.floor(segment.start)}s] ${tags.join(" ")} :: ${segment.text}`;
}

export function rhetoricTranscriptWindowForSegments(
  transcript: TranscriptSegment[],
  endAtSeconds = transcript.at(-1)?.end ?? 0,
): string {
  const cutoff = endAtSeconds - 60;
  return transcript
    .filter((s) => s.end >= cutoff)
    .map(formatRhetoricTranscriptLine)
    .join("\n");
}

export async function onFinalUtterance(segment: TranscriptSegment) {
  maybeRunRhetoric();
  maybeRunSynthesis();
  maybeRunDevilAdvocate();

  const { transcript, source } = useSession.getState();

  const cutoff = segment.start - 30;
  // Committee amendment (Linguist): thread speaker labels into CONTEXT so the
  // model can distinguish first-person assertion from reported speech.
  const transcriptContext = transcript
    .filter((s) => s.end >= cutoff)
    .map(transcriptContextLineForPrompt)
    .join("\n");
  const sourceContext = sourceContextForPrompt(source);
  const documentPosition = documentAnchorContextForPrompt(segment.document_anchor);
  const ctx = [
    sourceContext ? `SOURCE_CONTEXT:\n${sourceContext}` : "",
    documentPosition ? `CURRENT_DOCUMENT_POSITION:\n${documentPosition}` : "",
    `TRANSCRIPT_CONTEXT:\n${transcriptContext}`,
  ].filter(Boolean).join("\n\n");

  let res: Response;
  try {
    res = await fetch("/api/extract-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utterance: segment.text,
        utterance_start: segment.start,
        utterance_end: segment.end,
        context: ctx,
        recent_hashes: recentClaimHashes.toArray(),
        speaker_id: segment.speaker_id,
        segment_id: segment.id ?? null,
        turn_id: segment.turn_id ?? null,
        attribution_status: segment.attribution_status,
        attribution_reasons: segment.attribution_reasons ?? [],
        overlap_class: segment.overlap_class,
        source_audio_kind: segment.source_audio_kind,
        document_anchor: segment.document_anchor,
      }),
    });
  } catch (e) {
    console.error("extract-claims fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const { claims } = (await res.json()) as { claims: ExtractedClaim[] };
  if (!Array.isArray(claims) || claims.length === 0) return;

  for (const c of claims) {
    const h = hashClaim(c.claim_text);
    if (recentClaimHashes.has(h)) continue;
    recentClaimHashes.add(h);

    const stance = c.stance ?? "asserted";
    const ownership = claimOwnershipForSegment(segment, stance, c.ownership);
    const card: ClaimCard = {
      id: ulid(),
      claim_text: c.claim_text,
      utterance_start: c.utterance_start,
      utterance_end: c.utterance_end,
      speaker_id: ownership.owner_speaker_id,
      topic: c.topic ?? "Other",
      topic_secondary: c.topic_secondary ?? null,
      primary_label: "UNVERIFIABLE",   // overridden once verify-provisional or verify-confirmed lands
      score: 0,
      annotations: [],
      explanation: "",
      status: "checking",
      sources: [],
      stance,
      ownership,
      document_anchor: documentAnchorWithClaimQuote(segment.document_anchor, segment.text, c.claim_text),
    };
    useSession.getState().addClaim(card);

    void verifyProvisional(card, sourceContext);
    void verifyConfirmed(card, sourceContext);
  }
}

export function maybeRunRhetoric() {
  utteranceCounter += 1;
  const now = Date.now();
  const timeSince = now - lastRhetoricRunAt;
  if (utteranceCounter % 5 === 0 || timeSince > 30_000) {
    lastRhetoricRunAt = now;
    void runRhetoric();
  }
}

export function maybeRunSynthesis() {
  synthesisUtteranceCounter += 1;
  const now = Date.now();
  const timeSince = now - lastSynthesisRunAt;
  if (synthesisUtteranceCounter % 5 === 0 || timeSince > 30_000) {
    lastSynthesisRunAt = now;
    void runSynthesis();
  }
}

export function abortSynthesis() {
  synthesisAbortController?.abort();
}

export function abortDevilAdvocate() {
  devilAbortController?.abort();
}

/**
 * Bypasses the synthesis pacer and runs synthesis immediately once.
 * Used by bulkIngest after processing all segments so the full imported
 * document gets a synthesis pass without waiting for the throttle timer.
 * The existing pacer (maybeRunSynthesis) is unaffected.
 */
export async function runSynthesisNow(): Promise<void> {
  await runSynthesis();
}

/**
 * Triggers a synthesis pass over the FULL transcript for non-mic sources.
 *
 * Called when a session ends for bulk-ingest sources (YouTube, audio file,
 * text doc, media URL). Because these sources load all content at once, the
 * trailing-window pacer may have only synthesised the last ~30 s of material.
 * This function bypasses the window and sends the complete transcript so the
 * user's final read describes the whole session.
 *
 * Guards:
 *  - source.kind === "mic" → no-op. Mic sessions are paced per-utterance;
 *    calling this would double-fire synthesis at session end.
 *  - empty transcript → no-op. Nothing to synthesise.
 */
export async function runFinalSynthesis(): Promise<void> {
  const state = useSession.getState();
  if (state.source.kind === "mic") return;
  if (state.transcript.length === 0) return;
  await runSynthesis({ fullTranscript: state.transcript });
  await runDevilAdvocate({ fullTranscript: state.transcript });
}

async function runSynthesis(opts?: { fullTranscript?: TranscriptSegment[] }) {
  const state = useSession.getState();
  const { transcript, claims, markers, speakers } = state;

  // Signal warming/refreshing state before the fetch
  const current = state.synthesis;
  if (current === null) {
    state.setSynthesis({ state: "warming", at: Date.now() });
  } else if (current.state === "fresh" || current.state === "refreshing") {
    state.setSynthesis({
      state: "refreshing",
      text: current.text,
      headlines: current.headlines,
      ...(current.per_speaker_verdicts !== undefined
        ? { per_speaker_verdicts: current.per_speaker_verdicts }
        : {}),
      at: Date.now(),
    });
  }

  // Use the explicit full transcript when provided (endSession path),
  // otherwise fall back to the trailing 20-utterance window (pacer path).
  const source = opts?.fullTranscript ?? transcript.slice(-20);
  const utterances = source.map((s) => ({
    speaker_id: s.speaker_id,
    text: s.text,
    start: s.start,
    end: s.end,
    source_audio_kind: s.source_audio_kind,
    anchor: documentAnchorLabelForPrompt(s.document_anchor),
  }));

  // Build counters from claims
  let trueCount = 0;
  let partialCount = 0;
  let falseCount = 0;
  for (const c of claims) {
    const lbl = c.primary_label;
    if (lbl === "TRUE" || lbl === "MOSTLY_TRUE") trueCount += 1;
    else if (lbl === "PARTIAL" || lbl === "MISLEADING" || lbl === "OMISSION") partialCount += 1;
    else if (lbl === "FALSE") falseCount += 1;
  }
  let fallacyCount = 0;
  let biasCount = 0;
  let rhetoricCount = 0;
  for (const m of markers) {
    if (m.type === "fallacy") fallacyCount += 1;
    else if (m.type === "bias") biasCount += 1;
    else if (m.type === "rhetoric") rhetoricCount += 1;
  }

  const counters = {
    claims: claims.length,
    false: falseCount,
    partial: partialCount,
    true: trueCount,
    fallacy: fallacyCount,
    bias: biasCount,
    rhetoric: rhetoricCount,
  };

  const speakersPayload = speakers.map((s) => ({ id: s.id, label: s.label }));
  const claimsPayload = claimSummariesForSynthesis(claims);

  // Abort any previous in-flight request
  synthesisAbortController?.abort();
  synthesisAbortController = new AbortController();
  const signal = synthesisAbortController.signal;

  let res: Response;
  try {
    res = await fetch("/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utterances,
        counters,
        speakers: speakersPayload,
        claims: claimsPayload,
        source_context: sourceContextForPrompt(state.source),
      }),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      // Aborted — no state change, keep prior state
      return;
    }
    console.error("synthesize fetch failed", e);
    const prev = useSession.getState().synthesis;
    useSession.getState().setSynthesis({
      state: "error",
      at: Date.now(),
      ...(prev && "text" in prev
        ? {
          text: prev.text,
          headlines: prev.headlines,
          ...(prev.per_speaker_verdicts !== undefined
            ? { per_speaker_verdicts: prev.per_speaker_verdicts }
            : {}),
        }
        : {}),
      lastError: String(e),
    });
    return;
  }

  if (!res.ok) {
    const prev = useSession.getState().synthesis;
    useSession.getState().setSynthesis({
      state: "error",
      at: Date.now(),
      ...(prev && "text" in prev
        ? {
          text: prev.text,
          headlines: prev.headlines,
          ...(prev.per_speaker_verdicts !== undefined
            ? { per_speaker_verdicts: prev.per_speaker_verdicts }
            : {}),
        }
        : {}),
    });
    return;
  }

  const data = (await res.json()) as { text: string; headlines: string[]; per_speaker_verdicts?: import("@/lib/client/session-store").SpeakerVerdict[] };
  useSession.getState().setSynthesis({
    state: "fresh",
    text: data.text,
    headlines: data.headlines,
    ...(data.per_speaker_verdicts !== undefined ? { per_speaker_verdicts: data.per_speaker_verdicts } : {}),
    at: Date.now(),
  });
}

export function maybeRunDevilAdvocate() {
  devilUtteranceCounter += 1;
  const state = useSession.getState();
  if (state.transcript.length < 3) return;

  const now = Date.now();
  const timeSince = now - lastDevilRunAt;
  if (devilUtteranceCounter % 7 === 0 || timeSince > 45_000) {
    lastDevilRunAt = now;
    void runDevilAdvocate();
  }
}

async function runDevilAdvocate(opts?: { fullTranscript?: TranscriptSegment[] }) {
  const state = useSession.getState();
  const transcript = opts?.fullTranscript ?? state.transcript.slice(-16);
  if (transcript.length < 3) return;

  const current = state.devilAdvocate;
  if (current?.state === "fresh" || current?.state === "refreshing") {
    state.setDevilAdvocate({ state: "refreshing", brief: current.brief, at: Date.now() });
  } else {
    state.setDevilAdvocate({ state: "warming", at: Date.now() });
  }

  devilAbortController?.abort();
  devilAbortController = new AbortController();
  const signal = devilAbortController.signal;

  let res: Response;
  try {
    res = await fetch("/api/devil-advocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utterances: transcript.map((s) => ({
          speaker_id: s.speaker_id,
          text: s.text,
          start: s.start,
          end: s.end,
        })),
        claims: state.claims
          .filter((claim) => claim.status !== "checking")
          .slice(-8)
          .map(claimSummaryForAnalysis),
        markers: state.markers.slice(-8).map((marker) => ({
          display: marker.display,
          severity: marker.severity,
          excerpt: marker.excerpt,
          speaker_id: marker.speaker_id,
          explanation: marker.explanation,
        })),
        source_context: sourceContextForPrompt(state.source),
      }),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    console.error("devil-advocate fetch failed", e);
    const prev = useSession.getState().devilAdvocate;
    useSession.getState().setDevilAdvocate({
      state: "error",
      at: Date.now(),
      ...(prev && "brief" in prev ? { brief: prev.brief } : {}),
      lastError: String(e),
    });
    return;
  }

  if (!res.ok) {
    const prev = useSession.getState().devilAdvocate;
    useSession.getState().setDevilAdvocate({
      state: "error",
      at: Date.now(),
      ...(prev && "brief" in prev ? { brief: prev.brief } : {}),
    });
    return;
  }

  const data = (await res.json()) as {
    stance: string;
    strongest_counterarguments: [string, string, string];
    weakest_assumption: string;
    questions: [string, string];
    confidence: "low" | "medium" | "high";
    model?: string;
  };

  useSession.getState().setDevilAdvocate({
    state: "fresh",
    brief: data,
    at: Date.now(),
  });
}

async function runRhetoric() {
  const { transcript, source } = useSession.getState();
  if (transcript.length === 0) return;

  const last = transcript[transcript.length - 1];
  const win = rhetoricTranscriptWindowForSegments(transcript, last.end);

  let res: Response;
  try {
    res = await fetch("/api/analyze-rhetoric", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript_window: win,
        recent_hashes: recentMarkerHashes.toArray(),
        source_context: sourceContextForPrompt(source),
      }),
    });
  } catch (e) {
    console.error("analyze-rhetoric fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const { markers } = (await res.json()) as {
    markers: Array<Omit<RhetoricMarker, "id" | "speaker_id">>;
  };
  if (!Array.isArray(markers) || markers.length === 0) return;

  const currentTranscript = useSession.getState().transcript;

  for (const m of markers) {
    // Validate against taxonomy — drop unknowns, auto-correct mismatched type/display
    const entry = getEntry(m.name);
    if (!entry) continue;
    const correctedType = entry.type;
    const correctedDisplay = entry.display;

    // Dedup key: (type, excerpt) — see spec §6.4
    const h = hashClaim(`${correctedType}::${m.excerpt}`);
    if (recentMarkerHashes.has(h)) continue;
    recentMarkerHashes.add(h);

    const speakerId = attributeMarker(
      { start_time: m.start_time, end_time: m.end_time },
      currentTranscript,
    );
    const attribution = markerAttributionForSpan(
      { start_time: m.start_time, end_time: m.end_time },
      currentTranscript,
      m,
    );

    useSession.getState().addMarker({
      ...m,
      ...attribution,
      type: correctedType,
      display: correctedDisplay,
      speaker_id: speakerId,
      id: ulid(),
    });
  }
}

async function verifyProvisional(claim: ClaimCard, source_context?: string) {
  let res: Response;
  try {
    res = await fetch("/api/verify-provisional", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim_text: claim.claim_text,
        source_context,
        claim_context: claimContextForVerification(claim),
      }),
    });
  } catch (e) {
    console.error("verify-provisional fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const data = await res.json();
  const current = useSession.getState().claims.find((c) => c.id === claim.id);
  if (!current || current.status === "confirmed") return;
  useSession.getState().updateClaim(claim.id, { ...data, status: "provisional" });
}

async function verifyConfirmed(claim: ClaimCard, source_context?: string) {
  let res: Response;
  try {
    res = await fetch("/api/verify-confirmed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim_text: claim.claim_text,
        source_context,
        claim_context: claimContextForVerification(claim),
      }),
    });
  } catch (e) {
    console.error("verify-confirmed fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const data = (await res.json()) as Omit<ClaimCard, "id" | "claim_text" | "utterance_start" | "utterance_end" | "speaker_id" | "topic" | "status">;
  useSession.getState().updateClaim(claim.id, { ...data, status: "confirmed" });

  // Fire OG-preview fetches in the background; they'll patch each Source.preview when they land.
  if (Array.isArray(data.sources) && data.sources.length > 0) {
    void fetchAndApplyPreviews(claim.id, data.sources);
  }
}

async function fetchAndApplyPreviews(claimId: string, sources: Source[]) {
  const urls = sources.map((s) => s.url);
  let res: Response;
  try {
    res = await fetch("/api/source-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
  } catch (e) {
    console.error("source-preview fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const { previews } = (await res.json()) as {
    previews: Record<string, SourcePreview | null>;
  };
  const current = useSession.getState().claims.find((c) => c.id === claimId);
  if (!current) return;
  const patched = current.sources.map((s) => {
    const p = previews[s.url];
    return p ? { ...s, preview: p } : s;
  });
  useSession.getState().updateClaim(claimId, { sources: patched });
}
