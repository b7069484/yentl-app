"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SessionHeader } from "@/components/session/SessionHeader";
import { TranscriptView } from "@/components/session/TranscriptView";
import { ClaimCardStack } from "@/components/session/ClaimCardStack";
import { MarkersPanel } from "@/components/session/MarkersPanel";
import { MarkerTicker } from "@/components/session/MarkerTicker";
import { ClaimCard } from "@/components/session/ClaimCard";
import { EndSessionDialog } from "@/components/session/EndSessionDialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useSession } from "@/lib/client/session-store";
import { startMic, type MicHandle } from "@/lib/client/mic";
import { openDeepgramStream } from "@/lib/client/deepgram-stream";
import { onFinalUtterance } from "@/lib/client/orchestrator";

export default function SessionPage() {
  const mic = useRef<MicHandle | null>(null);
  const dg = useRef<Awaited<ReturnType<typeof openDeepgramStream>> | null>(null);
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  const [highlightedClaimId, setHighlightedClaimId] = useState<string | null>(null);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    setEndDialogOpen(true);
  };

  useEffect(() => () => teardown(), []);

  // Dev-only shim for end-to-end testing without a real microphone.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __factify?: Record<string, unknown> };
    w.__factify = { ...(w.__factify ?? {}), onFinalUtterance };
  }, []);

  // Click a claim card → scroll its corresponding transcript segment into view.
  const focusTranscriptAt = useCallback((utteranceStart: number) => {
    const root = containerRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(
      `[data-segment-start="${utteranceStart}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Briefly highlight the segment's own claim, if any.
    const claimId = el?.dataset.claimId;
    if (claimId) {
      setHighlightedClaimId(claimId);
      window.setTimeout(() => setHighlightedClaimId(null), 1800);
    }
  }, []);

  // Click a transcript highlight → scroll the card stack to that claim.
  const focusCard = useCallback((claimId: string) => {
    const root = containerRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-claim-id="${claimId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedClaimId(claimId);
    window.setTimeout(() => setHighlightedClaimId(null), 1800);
  }, []);

  // Click a marker → scroll the transcript to that timestamp (nearest segment).
  const focusTranscriptAtTime = useCallback((time: number) => {
    const { transcript } = useSession.getState();
    if (transcript.length === 0) return;
    const nearest = transcript.reduce((best, s) =>
      Math.abs(s.start - time) < Math.abs(best.start - time) ? s : best,
    );
    focusTranscriptAt(nearest.start);
  }, [focusTranscriptAt]);

  const mode = session.mode;

  return (
    <div
      ref={containerRef}
      className="flex h-screen flex-col bg-background"
    >
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

      {mode === "A" ? (
        <main className="grid flex-1 grid-cols-[1.05fr_1fr_340px] divide-x divide-border/60 overflow-hidden">
          <Panel label="Transcript" hint="Highlights are clickable">
            <TranscriptView variant="compact" onClaimSegmentClick={focusCard} />
          </Panel>
          <Panel label="Claims" hint="Scored against the open web">
            <ClaimCardStack
              highlightedId={highlightedClaimId}
              onCardClick={(_id, start) => focusTranscriptAt(start)}
            />
          </Panel>
          <Panel label="Markers" hint="Click to jump in transcript">
            <MarkersPanel onMarkerClick={focusTranscriptAtTime} />
          </Panel>
        </main>
      ) : (
        <main className="flex flex-1 flex-col overflow-hidden">
          <section
            aria-label="Transcript (present)"
            className="flex-1 min-h-0 overflow-hidden bg-background"
          >
            <TranscriptView variant="present" onClaimSegmentClick={focusCard} />
          </section>
          <PresentClaimStrip
            highlightedId={highlightedClaimId}
            onCardClick={(_id, start) => focusTranscriptAt(start)}
          />
          <MarkerTicker onMarkerClick={focusTranscriptAtTime} />
        </main>
      )}

      <EndSessionDialog
        open={endDialogOpen}
        onClose={() => setEndDialogOpen(false)}
      />
    </div>
  );
}

function Panel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="flex min-h-0 flex-col overflow-hidden bg-background"
    >
      <div className="flex items-baseline justify-between border-b border-border/50 bg-card/40 px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        {hint && (
          <span className="text-[10px] text-muted-foreground/80">{hint}</span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </section>
  );
}

function PresentClaimStrip({
  highlightedId,
  onCardClick,
}: {
  highlightedId: string | null;
  onCardClick: (id: string, start: number) => void;
}) {
  const claims = useSession((s) => s.claims);
  if (claims.length === 0) {
    return (
      <div className="flex shrink-0 items-center gap-3 border-t border-border/60 bg-card/40 px-5 py-3 text-[12px] italic text-muted-foreground">
        Claims will appear here as you speak.
      </div>
    );
  }
  return (
    <ScrollArea className="shrink-0 border-t border-border/60 bg-card/40">
      <div className="flex gap-3 px-4 py-3">
        {claims
          .slice()
          .reverse()
          .map((c) => (
            <div
              key={c.id}
              data-claim-id={c.id}
              className="w-[300px] shrink-0 animate-in fade-in slide-in-from-bottom-1 duration-300"
            >
              <ClaimCard
                card={c}
                highlighted={highlightedId === c.id}
                onClick={() => onCardClick(c.id, c.utterance_start)}
              />
            </div>
          ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
