"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { HomeOverview } from "@/components/session/home-overview";
import { TranscriptView } from "@/components/session/TranscriptView";
import { FilteredList } from "@/components/session/filtered-list";

export default function SessionPage() {
  return (
    <Suspense>
      <SessionPageInner />
    </Suspense>
  );
}

function SessionPageInner() {
  const sp = useSearchParams();
  const view = sp.get("view") || "overview";
  const startedAt = useSession((s) => s.startedAt);
  const startSession = useSession((s) => s.startSession);

  if (!startedAt) {
    return <PreRecord onStart={() => startSession()} />;
  }

  switch (view) {
    case "transcript":
      return <TranscriptView variant="compact" />;
    case "claims":
    case "markers":
      return <FilteredList />;
    case "overview":
    default:
      return <HomeOverview />;
  }
}

function PreRecord({ onStart }: { onStart: () => void }) {
  return (
    <div className="px-6 pt-12 pb-12 max-w-[680px] mx-auto w-full text-center">
      <div className="mx-auto w-24 h-24 rounded-full bg-paper border border-line flex items-center justify-center mb-6 shadow-sm">
        <svg viewBox="0 0 24 24" className="w-12 h-12 text-teal" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
      <h1 className="font-serif text-[28px] font-medium tracking-tight text-ink">Yenta is ready to listen.</h1>
      <p className="text-[14px] text-ink-3 mt-2 max-w-prose mx-auto">
        Tap below to start a session. Yenta transcribes the conversation in real time, fact-checks every claim against the open web, and surfaces the biases and fallacies tucked into the rhetoric.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-7 inline-flex items-center gap-2 px-5 py-3 bg-teal text-white rounded-xl text-[14px] font-medium hover:bg-teal-2 shadow-md"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        </svg>
        Start a session
      </button>
      <div className="mt-4 text-[11.5px] text-ink-4">Multi-speaker · English · Browser mic</div>
    </div>
  );
}
