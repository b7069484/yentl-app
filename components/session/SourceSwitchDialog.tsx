"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SourceSwitchDialog({
  open,
  onClose,
  onConfirm,
  onSaveFirst,
  onExportFirst,
  counts,
  active,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSaveFirst: () => void;
  onExportFirst: () => void;
  counts: {
    transcript: number;
    claims: number;
    markers: number;
  };
  active: boolean;
}) {
  const hasCapturedWork =
    counts.transcript > 0 || counts.claims > 0 || counts.markers > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose another source?</DialogTitle>
          <DialogDescription>
            {active
              ? "This will stop the current session and return you to the source chooser."
              : "This will return you to the source chooser."}{" "}
            Save or export first if you need to keep this run.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-2 rounded-lg border border-border/60 bg-card/60 p-3 text-center">
          <Stat label="Utterances" value={counts.transcript} />
          <Stat label="Claims" value={counts.claims} />
          <Stat label="Markers" value={counts.markers} />
        </dl>

        {!hasCapturedWork && (
          <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            No transcript, claims, or markers have been captured yet.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Keep current source
          </Button>
          {hasCapturedWork && (
            <>
              <Button variant="outline" onClick={onSaveFirst}>
                Save first
              </Button>
              <Button variant="outline" onClick={onExportFirst}>
                Export first
              </Button>
            </>
          )}
          <Button variant="destructive" onClick={onConfirm}>
            Choose new source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
