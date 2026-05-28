import type { TranscriptSegment } from "@/lib/types";
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
  speaker?: number;
};

export function dominantSpeaker(words: DeepgramWord[]): number | null {
  if (!words || words.length === 0) return null;
  const counts = new Map<number, number>();
  for (const w of words) {
    if (typeof w.speaker !== "number") continue;
    counts.set(w.speaker, (counts.get(w.speaker) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
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
  counters: SpeakerCounters,
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
      attachMessageHandlers(ws, events, counters);
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

function attachMessageHandlers(ws: WebSocket, events: DGEvents, counters: SpeakerCounters) {
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type !== "Results") return;
      const alt = msg.channel?.alternatives?.[0];
      if (!alt) return;
      const text = alt.transcript as string;
      if (!text) return;
      if (msg.is_final) {
        const words = (alt.words as DeepgramWord[] | undefined) ?? [];
        const speakerId = dominantSpeaker(words);
        if (speakerId === null) {
          counters.consecutive += 1;
          if (!counters.warned && counters.consecutive >= NULL_SPEAKER_WARN_THRESHOLD) {
            // v1 ships with speaker segmentation off — null speaker_id is the
            // expected default, not a failure. Threshold-warn left in place
            // for the day we re-enable per BIPA-consent gate (see PARAMS comment).
            counters.warned = true;
          }
        } else {
          counters.consecutive = 0;
        }
        events.onFinal({
          text,
          start: (msg.start as number) ?? 0,
          end: ((msg.start as number) ?? 0) + ((msg.duration as number) ?? 0),
          is_final: true,
          speaker_id: speakerId,
        });
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
  // Per-stream counters — was module-level, which corrupted the new stream's state
  // during a speakersMode restart while the old socket's drain window was still alive.
  const counters: SpeakerCounters = { consecutive: 0, warned: false };

  let { key, expiresAtMs } = await fetchTokenWithRetry(signal);
  let ws = await openSocket(key, events, signal, counters);
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
      const newWs = await openSocket(next.key, events, signal, counters);
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
