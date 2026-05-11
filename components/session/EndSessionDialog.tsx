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
import { toJSON } from "@/lib/export/json";
import { toMarkdown } from "@/lib/export/markdown";

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fileSafe(s: string) {
  return (s || "factify-session").replace(/[^\w-]+/g, "_").slice(0, 60);
}

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
      : Date.now();
    return Math.max(
      0,
      Math.round((endMs - new Date(session.startedAt).getTime()) / 1000),
    );
  }, [session.startedAt, session.endedAt]);

  const handleConfirm = () => {
    if (!session.endedAt) session.endSession();
    const data = useSession.getState().toSession();
    const stem = fileSafe(data.title || "factify-session");
    download(`${stem}.json`, toJSON(data), "application/json");
    download(`${stem}.md`, toMarkdown(data), "text/markdown");
    onClose();
    session.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>End session & export?</DialogTitle>
          <DialogDescription>
            We&apos;ll save what you captured to your downloads as JSON and
            Markdown — you can revisit, share, or feed it back in later.
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
          <Button onClick={handleConfirm}>End &amp; export</Button>
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
