import type {
  ASRWord,
  TranscriptSegment,
  AttributionStatus,
  AttributionReason,
} from "@/lib/types";
import { getDeepgramWsUrl } from "@/lib/client/deepgram-endpoint";
import { sourceAnalysisConsentHeaders } from "@/lib/source-consent";

export type DGEvents = {
  onInterim: (text: string) => void;
  onFinal: (segment: TranscriptSegment) => void;
  onError: (err: unknown) => void;
  onClose: () => void;
};

export type DeepgramWord = {
  word: string;
  start: number;
  end: number;
  confidence?: number;
  speaker?: number;
  speaker_confidence?: number;
};

/**
 * Picks the dominant speaker over a set of words using confidence-weighted
 * duration: score(speaker) = sum(word.duration * word.speaker_confidence).
 *
 * Returns null when:
 *   - no words carry speaker info (diarize=false case), OR
 *   - the top speaker's score is within 10% of the runner-up (low-margin →
 *     surface as uncertain rather than commit a wrong label).
 */
export function dominantSpeaker(words: ASRWord[] | undefined): number | null {
  if (!words || words.length === 0) return null;

  const scores = new Map<number, number>();
  for (const w of words) {
    if (typeof w.speaker !== "number") continue;
    const duration = Math.max(0, w.end - w.start);
    const conf = typeof w.speaker_confidence === "number" ? w.speaker_confidence : 0.5;
    scores.set(w.speaker, (scores.get(w.speaker) ?? 0) + duration * conf);
  }

  if (scores.size === 0) return null;

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [topSpeaker, topScore] = ranked[0];
  const runnerScore = ranked[1]?.[1] ?? 0;

  // Low-margin: dominant speaker's lead is less than 10% of total score
  const total = ranked.reduce((sum, [, s]) => sum + s, 0);
  if (total > 0 && (topScore - runnerScore) / total < 0.1) {
    return null;
  }

  return topSpeaker;
}

/**
 * Latent boundary detection: a segment's start is within 300ms of the prior
 * segment's end. In this window Deepgram may still revise word boundaries,
 * so attribution should be held rather than committed.
 */
const LATENT_BOUNDARY_MS = 300;

export function isLatentBoundary(
  segment: { start: number },
  prior: { end: number } | undefined,
): boolean {
  if (!prior) return false;
  return (segment.start - prior.end) * 1000 < LATENT_BOUNDARY_MS;
}

const REFRESH_LEAD_MS = 30_000;
const REFRESH_MAX_ATTEMPTS = 3;
const REFRESH_BACKOFF_BASE_MS = 500;
const DRAIN_FALLBACK_MS = 5_000;
const NULL_SPEAKER_WARN_THRESHOLD = 5;
/**
 * WebSocket query params for the live Deepgram stream.
 *
 * IMPORTANT: speaker segmentation is DISABLED (diarize=false) in v1.
 * Deepgram's speaker-tagging feature records voiceprints. Under Illinois
 * BIPA — and the 2025-2026 case wave (Brewer v. Otter.ai, Cruz v.
 * Fireflies.AI) — voiceprint capture without explicit prior consent carries
 * $1k–$5k statutory damages PER recording. Yentl v1 ships with this off
 * by default per yentl-this-week-actions clause 1 (locked 2026-05-17).
 *
 * Re-enabling requires ALL of:
 *   1. BIPA-compliant consent flow with explicit voiceprint disclosure
 *   2. Voiceprint deletion-on-request mechanism
 *   3. Legal review of biometric-data handling
 *
 * Params we DO set:
 *   utterance_end_ms:1000 — treat 1 s of silence as utterance boundary. Lower
 *                          values fragment utterances; higher values delay output.
 *   numerals:true        — spoken numbers → digits; improves factual accuracy
 *                          of claims involving statistics, dates, vote counts.
 *   interim_results:true — interim transcripts for live feedback (not stored).
 *   smart_format:true    — applies punctuation + entity formatting.
 *
 * Params NOT set (and why):
 *   vad_events      — VAD endpoint events are separate from Results messages;
 *                     adding them without handling would create unprocessed
 *                     traffic. Keep false until we need silence detection.
 */
const PARAMS = new URLSearchParams({
  model: "nova-3",
  language: "en",
  punctuate: "true",
  smart_format: "true",
  interim_results: "true",
  utterance_end_ms: "1000",
  diarize: "false",
  numerals: "true",
});

type TokenResponse = { key: string; expires_at: string };
type SpeakerCounters = { consecutive: number; warned: boolean };
type StreamState = {
  counters: SpeakerCounters;
  priorSegment: TranscriptSegment | undefined;
  segmentIdx: number;
};

async function fetchToken(signal?: AbortSignal): Promise<{ key: string; expiresAtMs: number }> {
  const res = await fetch("/api/deepgram/token", {
    method: "POST",
    headers: sourceAnalysisConsentHeaders(),
    signal,
  });
  if (!res.ok) throw new Error(`token fetch failed (${res.status})`);
  const data = (await res.json()) as TokenResponse;
  const expiresAtMs = new Date(data.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs)) throw new Error("token response has invalid expires_at");
  return { key: data.key, expiresAtMs };
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) { resolve(); return; }
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => { clearTimeout(t); resolve(); };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function isAbortError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const name = (e as { name?: unknown }).name;
  const message = (e as { message?: unknown }).message;
  return name === "AbortError" || message === "aborted";
}

async function fetchTokenWithRetry(signal: AbortSignal): Promise<{ key: string; expiresAtMs: number }> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= REFRESH_MAX_ATTEMPTS; attempt++) {
    if (signal.aborted) throw new Error("aborted");
    console.warn(`[deepgram] token fetch attempt ${attempt}/${REFRESH_MAX_ATTEMPTS}`);
    try {
      return await fetchToken(signal);
    } catch (e) {
      lastErr = e;
      if (isAbortError(e)) throw e;
      if (attempt === REFRESH_MAX_ATTEMPTS) break;
      const backoff = REFRESH_BACKOFF_BASE_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
      await abortableSleep(backoff, signal);
      if (signal.aborted) throw new Error("aborted");
    }
  }
  throw lastErr ?? new Error("token fetch failed after retries");
}

function openSocket(
  key: string,
  events: DGEvents,
  signal: AbortSignal,
  state: StreamState,
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("aborted")); return; }
    const ws = new WebSocket(
      `${getDeepgramWsUrl()}?${PARAMS}`,
      ["bearer", key],
    );
    const onAbort = () => {
      try { ws.close(); } catch { /* noop */ }
      reject(new Error("aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });

    const cleanup = () => {
      ws.removeEventListener("open", handleOpen);
      ws.removeEventListener("error", handleEarlyError);
      signal.removeEventListener("abort", onAbort);
    };
    const handleOpen = () => {
      cleanup();
      attachMessageHandlers(ws, events, state);
      resolve(ws);
    };
    const handleEarlyError = (e: Event) => {
      cleanup();
      reject(e);
    };
    ws.addEventListener("open", handleOpen);
    ws.addEventListener("error", handleEarlyError);
  });
}

function attachMessageHandlers(ws: WebSocket, events: DGEvents, state: StreamState) {
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type !== "Results") return;
      const alt = msg.channel?.alternatives?.[0];
      if (!alt) return;
      const text = alt.transcript as string;
      if (!text) return;
      if (msg.is_final) {
        // Normalize raw Deepgram words to ASRWord shape.
        const rawWords = (alt.words as DeepgramWord[] | undefined) ?? [];
        const words: ASRWord[] = rawWords.map((w) => ({
          text: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence ?? 1,
          speaker: typeof w.speaker === "number" ? w.speaker : undefined,
          speaker_confidence: w.speaker_confidence,
        }));

        const speakerId = dominantSpeaker(words);

        if (speakerId === null) {
          state.counters.consecutive += 1;
          if (!state.counters.warned && state.counters.consecutive >= NULL_SPEAKER_WARN_THRESHOLD) {
            // v1 ships with speaker segmentation off — null speaker_id is the
            // expected default, not a failure. Threshold-warn left in place
            // for the day we re-enable per BIPA-consent gate (see PARAMS comment).
            state.counters.warned = true;
          }
        } else {
          state.counters.consecutive = 0;
        }

        const segStart = (msg.start as number) ?? 0;
        const segEnd = segStart + ((msg.duration as number) ?? 0);

        const segment: TranscriptSegment = {
          id: `dg-stream-${Date.now()}-${state.segmentIdx++}`,
          provider: "deepgram",
          source_audio_kind: "mic",
          text,
          start: segStart,
          end: segEnd,
          is_final: true,
          speaker_id: speakerId,
          words: words.length > 0 ? words : undefined,
        };

        // Speaker-uncertainty attribution:
        // null + had words → uncertain (low-margin confidence-weighted tie)
        // null + no words  → not_available (provider missing speaker info)
        let attribution_status: AttributionStatus | undefined;
        let attribution_reasons: AttributionReason[] | undefined;

        if (speakerId === null && words.length > 0) {
          attribution_status = "uncertain";
          attribution_reasons = ["dominant_speaker_low_margin"];
        } else if (speakerId === null) {
          attribution_status = "not_available";
          attribution_reasons = ["provider_missing_speaker"];
        }

        // Latent boundary: segment starts within 300ms of prior segment end.
        // Deepgram may still revise word boundaries in this window.
        if (isLatentBoundary(segment, state.priorSegment)) {
          attribution_status = "uncertain";
          attribution_reasons = [
            ...(attribution_reasons ?? []),
            "speaker_change_mid_segment",
          ];
        }

        if (attribution_status !== undefined) {
          segment.attribution_status = attribution_status;
          segment.attribution_reasons = attribution_reasons;
        }

        state.priorSegment = segment;
        events.onFinal(segment);
      } else {
        events.onInterim(text);
      }
    } catch (e) {
      events.onError(e);
    }
  };
  ws.onerror = (e) => events.onError(e);
  ws.onclose = () => events.onClose();
}

function gracefulDrain(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (done) return;
      done = true;
      if (timer) { clearTimeout(timer); timer = null; }
      try { ws.close(); } catch { /* noop */ }
      resolve();
    };
    ws.addEventListener("close", finish, { once: true });
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "CloseStream" }));
    } catch { /* noop */ }
    timer = setTimeout(finish, DRAIN_FALLBACK_MS);
  });
}

export async function openDeepgramStream(events: DGEvents) {
  const controller = new AbortController();
  const signal = controller.signal;
  let closed = false;
  // Per-stream state — was module-level, which corrupted the new stream's state
  // during a speakersMode restart while the old socket's drain window was still alive.
  const state: StreamState = {
    counters: { consecutive: 0, warned: false },
    priorSegment: undefined,
    segmentIdx: 0,
  };

  let { key, expiresAtMs } = await fetchTokenWithRetry(signal);
  let ws = await openSocket(key, events, signal, state);
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleRefresh() {
    if (closed) return;
    const ms = Math.max(1000, expiresAtMs - Date.now() - REFRESH_LEAD_MS);
    refreshTimer = setTimeout(refresh, ms);
  }

  async function refresh() {
    if (closed) return;
    try {
      const next = await fetchTokenWithRetry(signal);
      if (closed) return;
      const newWs = await openSocket(next.key, events, signal, state);
      if (closed) { try { newWs.close(); } catch { /* noop */ } return; }
      const oldWs = ws;
      ws = newWs;
      key = next.key;
      expiresAtMs = next.expiresAtMs;
      void gracefulDrain(oldWs);
      scheduleRefresh();
    } catch (e) {
      // A deliberate close() races refresh — that's not a user-visible error.
      if (closed || isAbortError(e)) return;
      events.onError(e);
    }
  }

  scheduleRefresh();
  const sessionStart = Date.now() / 1000;

  return {
    send: (chunk: Blob) => {
      const target = ws;
      if (target.readyState === WebSocket.OPEN) {
        chunk.arrayBuffer().then((buf) => {
          if (target.readyState === WebSocket.OPEN) target.send(buf);
        });
      }
    },
    close: () => {
      closed = true;
      controller.abort();
      if (refreshTimer) clearTimeout(refreshTimer);
      void gracefulDrain(ws);
    },
    sessionStart,
  };
}
