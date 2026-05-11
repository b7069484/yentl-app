import type { TranscriptSegment } from "@/lib/types";

export type DGEvents = {
  onInterim: (text: string) => void;
  onFinal: (segment: TranscriptSegment) => void;
  onError: (err: unknown) => void;
  onClose: () => void;
};

export async function openDeepgramStream(events: DGEvents) {
  // Fetch token
  const res = await fetch("/api/deepgram/token", { method: "POST" });
  if (!res.ok) throw new Error("token fetch failed");
  const { key } = (await res.json()) as { key: string };

  // Model is a single string — swap here to upgrade (e.g. nova-3 → nova-4 when available).
  const params = new URLSearchParams({
    model: "nova-3",
    language: "en",
    punctuate: "true",
    smart_format: "true",
    interim_results: "true",
    utterance_end_ms: "1000",
  });

  const ws = new WebSocket(
    `wss://api.deepgram.com/v1/listen?${params}`,
    ["token", key],
  );

  let sessionStart = Date.now() / 1000;

  ws.onopen = () => { sessionStart = Date.now() / 1000; };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === "Results") {
        const alt = msg.channel?.alternatives?.[0];
        if (!alt) return;
        const text = alt.transcript as string;
        if (!text) return;
        if (msg.is_final) {
          events.onFinal({
            text,
            start: (msg.start as number) ?? 0,
            end: ((msg.start as number) ?? 0) + ((msg.duration as number) ?? 0),
            is_final: true,
          });
        } else {
          events.onInterim(text);
        }
      }
    } catch (e) {
      events.onError(e);
    }
  };

  ws.onerror = (e) => events.onError(e);
  ws.onclose = () => events.onClose();

  return {
    send: (chunk: Blob) => {
      if (ws.readyState === WebSocket.OPEN) {
        chunk.arrayBuffer().then((buf) => ws.send(buf));
      }
    },
    close: () => ws.close(),
    sessionStart,
  };
}
