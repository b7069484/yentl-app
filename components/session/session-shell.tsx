"use client";

import type { ReactNode } from "react";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Pause, Play, Download, Square } from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import { Button } from "@/components/ui/button";
import { SpeakerRail } from "@/components/session/speaker-rail";
import { ExportDialog } from "@/components/session/ExportDialog";
import { EndSessionDialog } from "@/components/session/EndSessionDialog";

// ─── BrandMark ────────────────────────────────────────────────────────────────

function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const fontMap = { sm: "text-[18px]", md: "text-[22px]", lg: "text-[32px]" };
  const dotMap = { sm: "w-1.5 h-1.5", md: "w-2 h-2", lg: "w-2.5 h-2.5" };
  return (
    <Link
      href="/session"
      className={`font-serif ${fontMap[size]} font-medium tracking-tight text-ink inline-flex items-baseline`}
    >
      <span>yenta</span>
      <span
        className={`inline-block ${dotMap[size]} rounded-full bg-amber ml-0.5 ring-2 ring-[rgba(216,155,44,0.18)] self-end mb-1`}
      />
    </Link>
  );
}

// ─── LivePill ─────────────────────────────────────────────────────────────────

type PillState = "listening" | "paused" | "idle" | "ended";

function LivePill({ state, elapsed }: { state: PillState; elapsed: string }) {
  const cfg = {
    listening: {
      bg: "bg-green-soft",
      border: "border-[rgba(15,138,95,0.2)]",
      dot: "bg-green animate-pulse",
      label: "Listening",
    },
    paused: {
      bg: "bg-amber-soft",
      border: "border-[rgba(216,155,44,0.3)]",
      dot: "bg-amber",
      label: "Paused",
    },
    idle: {
      bg: "bg-cream-2",
      border: "border-line",
      dot: "bg-ink-4",
      label: "Idle",
    },
    ended: {
      bg: "bg-slate-soft",
      border: "border-[rgba(91,96,117,0.3)]",
      dot: "bg-ink-4",
      label: "Ended",
    },
  };
  const c = cfg[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${c.bg} ${c.border} border px-2.5 py-1 rounded-full text-[11px] font-medium text-ink-2`}
    >
      <span className={`w-[7px] h-[7px] rounded-full ${c.dot}`} />
      {c.label}
      <span className="text-[10.5px] tabular-nums text-ink-3 ml-0.5">
        · {elapsed}
      </span>
    </span>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function Tabs({ counts }: { counts: { claims: number; markers: number } }) {
  const sp = useSearchParams();
  const view = sp.get("view") || "overview";

  const tabs = [
    { key: "overview", label: "Overview", href: "/session" },
    { key: "transcript", label: "Transcript", href: "/session?view=transcript" },
    {
      key: "claims",
      label: `Claims · ${counts.claims}`,
      href: "/session?view=claims",
    },
    {
      key: "markers",
      label: `Markers · ${counts.markers}`,
      href: "/session?view=markers",
    },
  ];

  // Active state: exact match for overview/transcript, prefix match for claims/markers
  // so that deep-linked filtered lists (e.g., ?view=claims&filter=...) still highlight.
  function isActive(tabKey: string): boolean {
    if (tabKey === "overview") return view === "overview";
    if (tabKey === "transcript") return view === "transcript";
    if (tabKey === "claims") return view === "claims" || view.startsWith("claims");
    if (tabKey === "markers") return view === "markers" || view.startsWith("markers");
    return false;
  }

  return (
    <div className="inline-flex items-center gap-1 overflow-x-auto">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap ${
            isActive(t.key)
              ? "bg-cream-2 text-ink"
              : "text-ink-3 hover:text-ink-2"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

// ─── TopControls ──────────────────────────────────────────────────────────────

function TopControls() {
  const isRecording = useSession((s) => s.isRecording);
  const endedAt = useSession((s) => s.endedAt);
  const startedAt = useSession((s) => s.startedAt);
  const setRecording = useSession((s) => s.setRecording);
  const [exportOpen, setExportOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  return (
    <>
      <div className="ml-auto inline-flex items-center gap-1.5">
        {startedAt && (
          <Button
            variant="ghost"
            size="sm"
            disabled={!!endedAt}
            onClick={() => setRecording(!isRecording)}
          >
            {isRecording ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {isRecording ? "Pause" : "Resume"}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        {startedAt && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 border border-transparent hover:bg-red-50 hover:text-red-700"
            disabled={!!endedAt}
            onClick={() => setEndOpen(true)}
          >
            <Square className="h-3.5 w-3.5" /> End
          </Button>
        )}
      </div>
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <EndSessionDialog open={endOpen} onClose={() => setEndOpen(false)} />
    </>
  );
}

// ─── Elapsed time helper ──────────────────────────────────────────────────────

export function useElapsed(
  startedAt: string | null,
  endedAt: string | null,
): string {
  if (!startedAt) return "00:00";
  const startMs = new Date(startedAt).getTime();
  const endMs = endedAt ? new Date(endedAt).getTime() : Date.now();
  const sec = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${(m % 60).toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Pill state computation ───────────────────────────────────────────────────

function usePillState(): PillState {
  const isRecording = useSession((s) => s.isRecording);
  const endedAt = useSession((s) => s.endedAt);
  const startedAt = useSession((s) => s.startedAt);

  if (endedAt) return "ended";
  if (!startedAt) return "idle";
  if (isRecording) return "listening";
  return "paused";
}

// ─── Active speaker hook ──────────────────────────────────────────────────────

function useActiveSpeakerId(): number | null {
  const transcript = useSession((s) => s.transcript);
  if (transcript.length === 0) return null;
  return transcript[transcript.length - 1].speaker_id;
}

// ─── SessionShell ─────────────────────────────────────────────────────────────

export function SessionShell({ children }: { children: ReactNode }) {
  const startedAt = useSession((s) => s.startedAt);
  const endedAt = useSession((s) => s.endedAt);
  const speakers = useSession((s) => s.speakers);
  const renameSpeaker = useSession((s) => s.renameSpeaker);
  const claimsCount = useSession(
    (s) => s.claims.filter((c) => c.status !== "checking").length,
  );
  const markersCount = useSession((s) => s.markers.length);

  const pillState = usePillState();
  const elapsed = useElapsed(startedAt, endedAt);
  const activeSpeakerId = useActiveSpeakerId();

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-cream border-b border-line-soft">
        <div className="px-6 md:px-8 py-3 flex items-center gap-4 flex-wrap max-w-[1280px] mx-auto w-full">
          <BrandMark size="md" />
          <LivePill state={pillState} elapsed={elapsed} />
          <Suspense fallback={null}>
            <Tabs counts={{ claims: claimsCount, markers: markersCount }} />
          </Suspense>
          <TopControls />
        </div>
      </header>

      {/* Speaker rail */}
      <SpeakerRail
        speakers={speakers}
        activeSpeakerId={activeSpeakerId}
        onRename={renameSpeaker}
      />

      {/* Body slot */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
