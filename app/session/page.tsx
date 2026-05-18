"use client";
import { useEffect, useRef } from "react";
import { SessionHeader } from "@/components/session/SessionHeader";
import { TranscriptView } from "@/components/session/TranscriptView";
import { AIDisclosureFooter } from "@/components/session/AIDisclosureFooter";
import { AIGeneratedBadge } from "@/components/ui/ai-generated-badge";
import { SessionTimer } from "@/components/session/SessionTimer";
import { TwoPartyDisclosure } from "@/components/session/TwoPartyDisclosure";
import { ClaimsLiveRegion } from "@/components/session/ClaimsLiveRegion";
import { useSession } from "@/lib/client/session-store";
import { startMic, type MicHandle } from "@/lib/client/mic";
import { openDeepgramStream } from "@/lib/client/deepgram-stream";

export default function SessionPage() {
  const mic = useRef<MicHandle | null>(null);
  const dg = useRef<Awaited<ReturnType<typeof openDeepgramStream>> | null>(null);
  const session = useSession();

  const start = async () => {
    session.startSession();
    dg.current = await openDeepgramStream({
      onInterim: (t) => session.setInterim(t),
      onFinal: (seg) => session.appendFinal(seg),
      onError: (e) => console.error(e),
      onClose: () => console.log("dg closed"),
    });
    mic.current = await startMic((chunk) => dg.current?.send(chunk));
  };

  const stop = () => {
    mic.current?.stop();
    dg.current?.close();
    session.setRecording(false);
  };

  const end = () => {
    stop();
    session.endSession();
    // export comes in Phase 6 (Task 24)
  };

  useEffect(() => () => { mic.current?.stop(); dg.current?.close(); }, []);

  return (
    <div className="flex h-screen flex-col">
      <SessionHeader onStart={start} onStop={stop} onEnd={end} />
      <SessionTimer />
      <TwoPartyDisclosure />
      <main id="main-content" className="flex-1 overflow-hidden">
        <TranscriptView />
      </main>
      <ClaimsLiveRegion />
      <div className="flex items-center justify-between border-t px-4 py-1">
        <AIGeneratedBadge />
      </div>
      <AIDisclosureFooter />
    </div>
  );
}
