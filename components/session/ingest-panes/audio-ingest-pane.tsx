"use client";
import { useSession } from "@/lib/client/session-store";
import { ArrowLeft } from "lucide-react";

export function AudioIngestPane() {
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  return (
    <div className="max-w-[680px] mx-auto px-6 pt-8 pb-12">
      <button
        type="button"
        onClick={() => setPrerecordStage("picker")}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink-2 mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sources
      </button>
      <div className="text-center py-12 text-ink-3">
        <div className="font-serif text-[22px] text-ink mb-2">Coming in T4</div>
        <div className="text-[13px]">Audio file ingest pane — implementation lands in the next task.</div>
      </div>
    </div>
  );
}
