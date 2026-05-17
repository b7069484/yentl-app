"use client";
import { ulid } from "ulid";
import { useSession } from "./session-store";
import { hashClaim, RecentSet } from "@/lib/dedup";
import { getEntry } from "@/lib/taxonomy";
import type {
  ClaimCard,
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

let synthesisUtteranceCounter = 0;
let lastSynthesisRunAt = 0;
let synthesisAbortController: AbortController | null = null;

type ExtractedClaim = {
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  topic: string;
  topic_secondary: string | null;
};

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
  maybeRunRhetoric();
  maybeRunSynthesis();

  const { transcript } = useSession.getState();

  const cutoff = segment.start - 30;
  // Committee amendment (Linguist): thread speaker labels into CONTEXT so the
  // model can distinguish first-person assertion from reported speech.
  const ctx = transcript
    .filter((s) => s.end >= cutoff)
    .map((s) => s.speaker_id !== null ? `[Speaker ${s.speaker_id}] ${s.text}` : s.text)
    .join(" ");

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
    };
    useSession.getState().addClaim(card);

    void verifyProvisional(card.id, c.claim_text);
    void verifyConfirmed(card.id, c.claim_text);
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

async function runRhetoric() {
  const { transcript } = useSession.getState();
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

async function verifyProvisional(id: string, claim_text: string) {
  let res: Response;
  try {
    res = await fetch("/api/verify-provisional", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_text }),
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

async function verifyConfirmed(id: string, claim_text: string) {
  let res: Response;
  try {
    res = await fetch("/api/verify-confirmed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_text }),
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
