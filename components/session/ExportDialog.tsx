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
import { useSession } from "@/lib/client/session-store";
import { exportSession } from "@/lib/client/export-actions";

export function ExportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const transcriptCount = useSession((s) => s.transcript.length);
  const claimCount = useSession((s) => s.claims.length);
  const markerCount = useSession((s) => s.markers.length);
  const isEmpty =
    transcriptCount === 0 && claimCount === 0 && markerCount === 0;

  const doExport = (kind: "report" | "markdown" | "json") => {
    const data = useSession.getState().toSession();
    exportSession(data, kind);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export this session</DialogTitle>
          <DialogDescription>
            Pick a format. The report opens in a new tab — save it as PDF from
            the browser&apos;s print dialog if you want a hard copy.
          </DialogDescription>
        </DialogHeader>

        {isEmpty ? (
          <p className="text-sm text-muted-foreground">
            Nothing to export yet — start a session and capture some claims or
            markers first.
          </p>
        ) : (
          <div className="space-y-2">
            <FormatRow
              label="Open as report"
              hint="Styled HTML in a new tab — print to PDF, share, embed."
              primary
              onClick={() => doExport("report")}
            />
            <FormatRow
              label="Markdown file"
              hint="Plain-text export for notes apps, version control, or pasting."
              onClick={() => doExport("markdown")}
            />
            <FormatRow
              label="JSON file"
              hint="Raw structured data — for re-importing, scripting, or analysis."
              onClick={() => doExport("json")}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormatRow({
  label,
  hint,
  onClick,
  primary = false,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition hover:border-foreground/30 hover:bg-card ${
        primary
          ? "border-foreground/30 bg-card"
          : "border-border/60 bg-card/40"
      }`}
    >
      <div className="flex-1">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      </div>
      <span aria-hidden className="self-center text-foreground/40 group-hover:text-foreground/70">
        →
      </span>
    </button>
  );
}
