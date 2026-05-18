"use client";
import { useEffect, useRef, useState } from "react";
import { SessionHeader } from "@/components/session/SessionHeader";
import { TranscriptView } from "@/components/session/TranscriptView";
import { ClaimCardStack } from "@/components/session/ClaimCardStack";
import { ConsentGate } from "@/components/consent/ConsentGate";
import { useSession } from "@/lib/client/session-store";
import { startMic, type MicHandle } from "@/lib/client/mic";
import { openDeepgramStream } from "@/lib/client/deepgram-stream";
import { onFinalUtterance } from "@/lib/client/orchestrator";
import { hasValidConsent, readConsent } from "@/lib/client/consent-ledger";

export default function SessionPage() {
  const mic = useRef<MicHandle | null>(null);
  const dg = useRef<Awaited<ReturnType<typeof openDeepgramStream>> | null>(null);
  const session = useSession();
  const [consentOpen, setConsentOpen] = useState(false);

  // Actual mic + Deepgram bring-up. Only called after consent is in hand.
  const doStart = async () => {
    session.startSession();
    dg.current = await openDeepgramStream({
      onInterim: (t) => session.setInterim(t),
      onFinal: (seg) => {
        session.appendFinal(seg);
        void onFinalUtterance(seg);
      },
      onError: (e) => console.error(e),
      onClose: () => console.log("dg closed"),
    });
    mic.current = await startMic((chunk) => dg.current?.send(chunk));
  };

  // Record-button click handler. Returning users with a valid consent record
  // skip the modal; first-time / re-prompt users see ConsentGate first.
  const requestStart = () => {
    if (hasValidConsent(readConsent())) {
      void doStart();
    } else {
      setConsentOpen(true);
    }
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
      <SessionHeader onStart={requestStart} onStop={stop} onEnd={end} />
      <main className="grid flex-1 grid-cols-2 overflow-hidden">
        <div className="overflow-auto border-r">
          <TranscriptView />
        </div>
        <div className="overflow-auto">
          <ClaimCardStack />
        </div>
      </main>
      <ConsentGate
        open={consentOpen}
        onConfirm={() => {
          setConsentOpen(false);
          void doStart();
        }}
        onCancel={() => setConsentOpen(false)}
      />
    </div>
  );
}
