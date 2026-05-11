"use client";
import { useEffect, useRef, useState } from "react";
import { SessionHeader } from "@/components/session/SessionHeader";
import { TranscriptView } from "@/components/session/TranscriptView";
import { useSession } from "@/lib/client/session-store";
import { startMic, type MicHandle } from "@/lib/client/mic";
import { openDeepgramStream } from "@/lib/client/deepgram-stream";

export default function SessionPage() {
  const mic = useRef<MicHandle | null>(null);
  const dg = useRef<Awaited<ReturnType<typeof openDeepgramStream>> | null>(null);
  const session = useSession();
  const [error, setError] = useState<string | null>(null);

  const teardown = () => {
    try { mic.current?.stop(); } catch {}
    try { dg.current?.close(); } catch {}
    mic.current = null;
    dg.current = null;
  };

  const start = async () => {
    setError(null);
    session.startSession();
    try {
      dg.current = await openDeepgramStream({
        onInterim: (t) => session.setInterim(t),
        onFinal: (seg) => session.appendFinal(seg),
        onError: () => {
          setError(
            "Lost connection to Deepgram. Check your network or refresh and try again.",
          );
          teardown();
          session.setRecording(false);
        },
        onClose: () => {},
      });
      mic.current = await startMic((chunk) => dg.current?.send(chunk));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const friendly = /permission|denied|notallowed/i.test(msg)
        ? "Microphone access was blocked. Allow mic permission in your browser and click Record again."
        : /token/i.test(msg)
          ? "Couldn't reach the transcription service. Check that the dev server has VERCEL_OIDC_TOKEN and DEEPGRAM_API_KEY set."
          : `Couldn't start the session: ${msg}`;
      setError(friendly);
      teardown();
      session.setRecording(false);
    }
  };

  const stop = () => {
    teardown();
    session.setRecording(false);
  };

  const end = () => {
    stop();
    session.endSession();
    // export lands in Phase 6 (Task 24)
  };

  useEffect(() => () => teardown(), []);

  return (
    <div className="flex h-screen flex-col bg-background">
      <SessionHeader onStart={start} onStop={stop} onEnd={end} />
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 border-b border-red-200 bg-red-50 px-5 py-2 text-sm text-red-900"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded px-2 py-0.5 text-xs font-medium text-red-900/80 hover:bg-red-100"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}
      <main className="flex-1 overflow-hidden">
        <TranscriptView />
      </main>
    </div>
  );
}
