"use client";
import { Flag } from "lucide-react";
import { useState } from "react";
import { ReportFlow } from "./ReportFlow";

export function ReportVerdictButton({ verdictRef }: { verdictRef?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Report this verdict"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <Flag className="size-4" aria-hidden="true" />
      </button>
      <ReportFlow open={open} onClose={() => setOpen(false)} verdictRef={verdictRef} />
    </>
  );
}
