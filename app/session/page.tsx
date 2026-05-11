"use client";
import { useEffect, useRef, useState } from "react";
import { SessionHeader } from "@/components/session/SessionHeader";
import { TranscriptView } from "@/components/session/TranscriptView";
import { ClaimCardStack } from "@/components/session/ClaimCardStack";
import { useSession } from "@/lib/client/session-store";
import { startMic, type MicHandle } from "@/lib/client/mic";
import { openDeepgramStream } from "@/lib/client/deepgram-stream";
import { onFinalUtterance } from "@/lib/client/orchestrator";

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
        onFinal: (seg) => {
          session.appendFinal(seg);
          void onFinalUtterance(seg);
        },
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
      <main className="grid flex-1 grid-cols-[1.1fr_1fr] divide-x divide-border/60 overflow-hidden">
        <section
          aria-label="Transcript"
          className="flex min-h-0 flex-col overflow-hidden bg-background"
        >
          <PanelHeader label="Transcript" hint="Interim text fades to final" />
          <div className="min-h-0 flex-1 overflow-hidden">
            <TranscriptView />
          </div>
        </section>
        <section
          aria-label="Claims"
          className="flex min-h-0 flex-col overflow-hidden bg-background"
        >
          <PanelHeader label="Claims" hint="Each card cites its sources" />
          <div className="min-h-0 flex-1 overflow-hidden">
            <ClaimCardStack />
          </div>
        </section>
      </main>
    </div>
  );
}

function PanelHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/50 bg-card/40 px-4 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {hint && (
        <span className="text-[10px] text-muted-foreground/80">{hint}</span>
      )}
    </div>
  );
}
