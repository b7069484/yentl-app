"use client";
import { ulid } from "ulid";
import { useSession } from "./session-store";
import { hashClaim, RecentSet } from "@/lib/dedup";
import { getEntry } from "@/lib/taxonomy";
import type {
  BrowserTabContext,
  ClaimCard,
  RhetoricMarker,
  Source,
  SourcePreview,
  SessionSource,
  SpeakerId,
  TranscriptSegment,
} from "@/lib/types";

const recentClaimHashes = new RecentSet(30);
const recentMarkerHashes = new RecentSet(40);
let utteranceCounter = 0;
let lastRhetoricRunAt = 0;

// Rolling RMS state — populated by AudioMeter via onRmsSample callback (Phase 1a).
let latestRms = 0;
let peakRmsSinceLastSegment = 0;

/**
 * Called each animation frame by AudioMeter with the current RMS amplitude.
 * The orchestrator accumulates a peak window and attaches it to the next
 * finalized TranscriptSegment as audio_features. This makes Phase E prosody
 * a prompt change rather than a schema change.
 */
export function recordRmsSample(rms: number) {
  latestRms = rms;
  if (rms > peakRmsSinceLastSegment) peakRmsSinceLastSegment = rms;
}

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
  stance?: import("@/lib/types").ClaimStance;
};

function compactContextPairs(pairs: Array<[string, string | string[] | number | undefined | null]>) {
  return pairs
    .flatMap(([label, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0 ? [`${label}: ${value.join(", ")}`] : [];
      }
      if (value === undefined || value === null || value === "") return [];
      return [`${label}: ${String(value)}`];
    })
    .join("\n");
}

function browserContextForPrompt(context?: BrowserTabContext) {
  if (!context) return "";
  return compactContextPairs([
    ["page title", context.page_title],
    ["site", context.site_name],
    ["channel", context.channel_name],
    ["author", context.author_name],
    ["username", context.username],
    ["canonical url", context.canonical_url],
    ["description", context.description],
    ["detected names", context.detected_names],
  ]);
}

function sourceContextForPrompt(source: SessionSource) {
  if (source.kind === "browser_tab") {
    return browserContextForPrompt({
      ...(source.context ?? {}),
      page_title: source.context?.page_title ?? source.title,
      canonical_url: source.context?.canonical_url ?? source.url,
    });
  }

  if (source.kind === "youtube") {
    return compactContextPairs([
      ["source type", "YouTube"],
      ["title", source.title],
      ["channel", source.channel],
      ["url", source.url],
      ["video id", source.video_id],
      ["duration seconds", source.duration_sec],
    ]);
  }

  if (source.kind === "media_url") {
    return compactContextPairs([
      ["source type", "media URL"],
      ["url", source.url],
    ]);
  }

  if (source.kind === "audio_file" || source.kind === "text_doc") {
    return compactContextPairs([
      ["source type", source.kind],
      ["filename", source.filename],
      ["mime", source.mime],
    ]);
  }

  return "";
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

export async function onFinalUtterance(segment: TranscriptSegment) {
  // Attach RMS snapshot captured since the prior segment (Phase 1a prosody groundwork).
  // Only mic sources have meaningful RMS; for non-mic sources latestRms stays 0.
  segment.audio_features = {
    rms: latestRms,
    peak_rms: peakRmsSinceLastSegment,
  };
  peakRmsSinceLastSegment = 0;

  maybeRunRhetoric();
  maybeRunSynthesis();
  maybeRunDevilAdvocate();

  const { transcript, source } = useSession.getState();

  const cutoff = segment.start - 30;
  // Committee amendment (Linguist): thread speaker labels into CONTEXT so the
  // model can distinguish first-person assertion from reported speech.
  const transcriptContext = transcript
    .filter((s) => s.end >= cutoff)
    .map((s) => s.speaker_id !== null ? `[Speaker ${s.speaker_id}] ${s.text}` : s.text)
    .join(" ");
  const sourceContext = sourceContextForPrompt(source);
  const ctx = [
    sourceContext ? `SOURCE_CONTEXT:\n${sourceContext}` : "",
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

    const card: ClaimCard = {
      id: ulid(),
      claim_text: c.claim_text,
      utterance_start: c.utterance_start,
      utterance_end: c.utterance_end,
      speaker_id: segment.speaker_id,
      topic: c.topic ?? "Other",
      topic_secondary: c.topic_secondary ?? null,
      primary_label: "UNVERIFIABLE",   // overridden once verify-provisional or verify-confirmed lands
      score: 0,
      annotations: [],
      explanation: "",
      status: "checking",
      sources: [],
      stance: c.stance ?? "asserted",
    };
    useSession.getState().addClaim(card);

    void verifyProvisional(card.id, c.claim_text, sourceContext);
    void verifyConfirmed(card.id, c.claim_text, sourceContext);
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
    state.setSynthesis({ state: "refreshing", text: current.text, headlines: current.headlines, at: Date.now() });
  }

  // Use the explicit full transcript when provided (endSession path),
  // otherwise fall back to the trailing 20-utterance window (pacer path).
  const source = opts?.fullTranscript ?? transcript.slice(-20);
  const utterances = source.map((s) => ({
    speaker_id: s.speaker_id,
    text: s.text,
    start: s.start,
    end: s.end,
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

  // Abort any previous in-flight request
  synthesisAbortController?.abort();
  synthesisAbortController = new AbortController();
  const signal = synthesisAbortController.signal;

  let res: Response;
  try {
    res = await fetch("/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utterances, counters, speakers: speakersPayload }),
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
      ...(prev && "text" in prev ? { text: prev.text, headlines: prev.headlines } : {}),
      lastError: String(e),
    });
    return;
  }

  if (!res.ok) {
    const prev = useSession.getState().synthesis;
    useSession.getState().setSynthesis({
      state: "error",
      at: Date.now(),
      ...(prev && "text" in prev ? { text: prev.text, headlines: prev.headlines } : {}),
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
          .map((claim) => ({
            text: claim.claim_text,
            verdict: claim.primary_label,
            score: claim.score,
            speaker_id: claim.speaker_id,
            explanation: claim.explanation,
          })),
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
  const cutoff = last.end - 60;
  const win = transcript
    .filter((s) => s.end >= cutoff)
    .map((s) => `[${Math.floor(s.start)}s] ${s.text}`)
    .join("\n");

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

    useSession.getState().addMarker({
      ...m,
      type: correctedType,
      display: correctedDisplay,
      speaker_id: speakerId,
      id: ulid(),
    });
  }
}

async function verifyProvisional(id: string, claim_text: string, source_context?: string) {
  let res: Response;
  try {
    res = await fetch("/api/verify-provisional", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_text, source_context }),
    });
  } catch (e) {
    console.error("verify-provisional fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const data = await res.json();
  const current = useSession.getState().claims.find((c) => c.id === id);
  if (!current || current.status === "confirmed") return;
  useSession.getState().updateClaim(id, { ...data, status: "provisional" });
}

async function verifyConfirmed(id: string, claim_text: string, source_context?: string) {
  let res: Response;
  try {
    res = await fetch("/api/verify-confirmed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_text, source_context }),
    });
  } catch (e) {
    console.error("verify-confirmed fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const data = (await res.json()) as Omit<ClaimCard, "id" | "claim_text" | "utterance_start" | "utterance_end" | "speaker_id" | "topic" | "status">;
  useSession.getState().updateClaim(id, { ...data, status: "confirmed" });

  // Fire OG-preview fetches in the background; they'll patch each Source.preview when they land.
  if (Array.isArray(data.sources) && data.sources.length > 0) {
    void fetchAndApplyPreviews(id, data.sources);
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
