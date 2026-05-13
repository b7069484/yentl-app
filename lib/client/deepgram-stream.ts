import type { TranscriptSegment } from "@/lib/types";

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

const REFRESH_LEAD_MS = 30_000;         // refresh 30s before expiry
const REFRESH_MAX_ATTEMPTS = 3;
const REFRESH_BACKOFF_BASE_MS = 500;
const DRAIN_FALLBACK_MS = 5_000;        // hard-close old socket if CloseStream handshake doesn't echo
const NULL_SPEAKER_WARN_THRESHOLD = 5;  // warn once after this many consecutive null speakers on diarized streams
const PARAMS = new URLSearchParams({
  model: "nova-3",
  language: "en",
  punctuate: "true",
  smart_format: "true",
  interim_results: "true",
  utterance_end_ms: "1000",
  diarize: "true",                       // populated in Task 13; included now since we own the URL
});

type TokenResponse = { key: string; expires_at: string };

async function fetchToken(signal?: AbortSignal): Promise<{ key: string; expiresAtMs: number }> {
  const res = await fetch("/api/deepgram/token", { method: "POST", signal });
  if (!res.ok) throw new Error(`token fetch failed (${res.status})`);
  const data = (await res.json()) as TokenResponse;
  const expiresAtMs = new Date(data.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs)) throw new Error("token response has invalid expires_at");
  return { key: data.key, expiresAtMs };
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
      if (attempt === REFRESH_MAX_ATTEMPTS) break;
      const backoff = REFRESH_BACKOFF_BASE_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr ?? new Error("token fetch failed after retries");
}

function openSocket(key: string, events: DGEvents, signal: AbortSignal): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("aborted")); return; }
    const ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${PARAMS}`,
      ["bearer", key],            // bearer scheme for JWTs
    );
    const onAbort = () => { try { ws.close(); } catch { /* noop */ } };
    signal.addEventListener("abort", onAbort, { once: true });

    const handleOpen = () => {
      ws.removeEventListener("open", handleOpen);
      attachMessageHandlers(ws, events);
      resolve(ws);
    };
    const handleEarlyError = (e: Event) => {
      ws.removeEventListener("error", handleEarlyError);
      signal.removeEventListener("abort", onAbort);
      reject(e);
    };
    ws.addEventListener("open", handleOpen);
    ws.addEventListener("error", handleEarlyError);
  });
}

let consecutiveNullSpeakers = 0;
let nullSpeakerWarned = false;

function attachMessageHandlers(ws: WebSocket, events: DGEvents) {
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
          consecutiveNullSpeakers += 1;
          if (!nullSpeakerWarned && consecutiveNullSpeakers >= NULL_SPEAKER_WARN_THRESHOLD) {
            console.warn(`[deepgram] ${NULL_SPEAKER_WARN_THRESHOLD} consecutive utterances missing speaker tag — diarization may have silently failed`);
            nullSpeakerWarned = true;
          }
        } else {
          consecutiveNullSpeakers = 0;
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

// Send Deepgram's CloseStream message so the server flushes in-flight utterances,
// then resolve when Deepgram echoes its own close frame. Falls back to hard-close
// after DRAIN_FALLBACK_MS if no echo.
function gracefulDrain(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; try { ws.close(); } catch { /* noop */ } resolve(); };
    ws.addEventListener("close", finish, { once: true });
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "CloseStream" }));
    } catch { /* noop */ }
    setTimeout(finish, DRAIN_FALLBACK_MS);
  });
}

export async function openDeepgramStream(events: DGEvents) {
  const controller = new AbortController();
  const signal = controller.signal;
  let closed = false;

  let { key, expiresAtMs } = await fetchTokenWithRetry(signal);
  let ws = await openSocket(key, events, signal);
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Reset per-session diagnostics
  consecutiveNullSpeakers = 0;
  nullSpeakerWarned = false;

  function scheduleRefresh() {
    if (closed) return;
    const ms = Math.max(1000, expiresAtMs - Date.now() - REFRESH_LEAD_MS);
    refreshTimer = setTimeout(refresh, ms);
  }

  async function refresh() {
    if (closed) return;
    try {
      const next = await fetchTokenWithRetry(signal);
      if (closed) return;                   // re-check after await
      const newWs = await openSocket(next.key, events, signal);
      if (closed) { try { newWs.close(); } catch { /* noop */ } return; }
      const oldWs = ws;
      ws = newWs;
      key = next.key;
      expiresAtMs = next.expiresAtMs;
      // CloseStream handshake — let Deepgram tell us when it's done draining
      void gracefulDrain(oldWs);
      scheduleRefresh();
    } catch (e) {
      events.onError(e);                    // bubble after all retries exhausted
    }
  }

  scheduleRefresh();
  const sessionStart = Date.now() / 1000;

  return {
    send: (chunk: Blob) => {
      if (ws.readyState === WebSocket.OPEN) {
        chunk.arrayBuffer().then((buf) => ws.send(buf));
      }
      // Else silently drop — the swap window is brief; existing dedup catches duplicates
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
