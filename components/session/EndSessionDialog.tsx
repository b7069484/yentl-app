"use client";
import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/client/session-store";
import { runFinalSynthesis } from "@/lib/client/orchestrator";

export function EndSessionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const session = useSession();
  const claimCount = useSession((s) => s.claims.length);
  const markerCount = useSession((s) => s.markers.length);
  const transcriptCount = useSession((s) => s.transcript.length);

  const elapsed = useMemo(() => {
    if (!session.startedAt) return 0;
    const endMs = session.endedAt
      ? new Date(session.endedAt).getTime()
      // eslint-disable-next-line react-hooks/purity -- snapshot at dialog open; dialog does not need to tick
      : Date.now();
    return Math.max(
      0,
      Math.round((endMs - new Date(session.startedAt).getTime()) / 1000),
    );
  }, [session.startedAt, session.endedAt]);

  const handleConfirm = () => {
    if (!session.endedAt) {
      session.endSession();
      // For non-mic sources (bulk-ingested content), trigger a final synthesis
      // pass over the FULL transcript. The trailing-window pacer only covers
      // the last ~30s; this gives users a read of the complete session.
      // Mic sessions are excluded — they run synthesis per-utterance via the pacer.
      void runFinalSynthesis();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>End this session?</DialogTitle>
          <DialogDescription>
            Recording stops. Your transcript, claims, and markers stay on screen
            so you can review and export them — use the Export button when
            you&apos;re ready.
          </DialogDescription>
        </DialogHeader>

        <dl className="mt-1 grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-card/60 p-3 text-center">
          <Stat label="Utterances" value={transcriptCount} />
          <Stat label="Claims" value={claimCount} />
          <Stat label="Markers" value={markerCount} />
          <Stat label="Duration" value={fmtDuration(elapsed)} wide />
        </dl>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Keep going
          </Button>
          <Button onClick={handleConfirm}>End session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: number | string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-3 border-t border-border/40 pt-2" : ""}>
      <div className="font-mono text-xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function fmtDuration(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${String(r).padStart(2, "0")}s`;
}
