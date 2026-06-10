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
import { stopBrowserTabCapture } from "@/components/session/ExtensionBridge";

export function EndSessionDialog({
  open,
  onClose,
  onSaveFirst,
  onExportFirst,
}: {
  open: boolean;
  onClose: () => void;
  onSaveFirst?: () => void;
  onExportFirst?: () => void;
}) {
  const session = useSession();
  const claimCount = useSession((s) => s.claims.length);
  const markerCount = useSession((s) => s.markers.length);
  const transcriptCount = useSession((s) => s.transcript.length);
  const hasCapturedWork =
    transcriptCount > 0 || claimCount > 0 || markerCount > 0;

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
      if (session.source.kind === "browser_tab") {
        stopBrowserTabCapture();
      }
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
            so you can review, save a local snapshot, or export a portable
            report when you&apos;re ready.
          </DialogDescription>
        </DialogHeader>

        <dl className="mt-1 grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-card/60 p-3 text-center">
          <Stat label="Utterances" value={transcriptCount} />
          <Stat label="Claims" value={claimCount} />
          <Stat label="Markers" value={markerCount} />
          <Stat label="Duration" value={fmtDuration(elapsed)} wide />
        </dl>

        {hasCapturedWork ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-sm font-medium text-foreground">
              Keep a copy before stopping
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={onSaveFirst}
                disabled={!onSaveFirst}
                className="w-full justify-start"
              >
                Save first
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onExportFirst}
                disabled={!onExportFirst}
                className="w-full justify-start"
              >
                Export first
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            No transcript, claims, or markers have been captured yet.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Keep going
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            End session
          </Button>
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
