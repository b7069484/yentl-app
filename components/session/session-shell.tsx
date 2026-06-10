"use client";

import type { ReactNode } from "react";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pause, Play, Download, Square, Save, Library, Plus, MonitorPlay } from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import { Button } from "@/components/ui/button";
import { SpeakerRail } from "@/components/session/speaker-rail";
import { ExportDialog } from "@/components/session/ExportDialog";
import { EndSessionDialog } from "@/components/session/EndSessionDialog";
import { SaveSessionDialog } from "@/components/session/SaveSessionDialog";
import { SourceSwitchDialog } from "@/components/session/SourceSwitchDialog";
import { stopBrowserTabCapture } from "@/components/session/ExtensionBridge";
import { sessionViewHref, tvHrefForSessionContext } from "@/lib/client/session-route";
export { PLAYABLE_SOURCE_KINDS } from "@/lib/source-kinds";
import { PLAYABLE_SOURCE_KINDS } from "@/lib/source-kinds";

// ─── BrandMark ────────────────────────────────────────────────────────────────

function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const fontMap = { sm: "text-[18px]", md: "text-[22px]", lg: "text-[32px]" };
  const dotMap = { sm: "w-1.5 h-1.5 ml-1.5", md: "w-2 h-2 ml-1.5", lg: "w-2.5 h-2.5 ml-2" };
  return (
    <span className="inline-flex min-w-0 items-baseline gap-2 sm:gap-3">
      <Link
        href="/session"
        className={`font-serif ${fontMap[size]} inline-flex min-h-11 items-center font-medium tracking-tight text-ink`}
      >
        <span>yentl</span>
        <span
          aria-hidden
          className={`yentl-dot inline-block ${dotMap[size]} self-baseline`}
        />
      </Link>
      <Link
        href="/sessions"
        className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-ink-3 transition-colors hover:text-ink-2 self-center"
        title="Sessions library"
      >
        <Library className="h-3 w-3" />
        Library
      </Link>
    </span>
  );
}

// ─── LivePill ─────────────────────────────────────────────────────────────────

type PillState = "listening" | "waiting" | "paused" | "idle" | "ended" | "error";

function LivePill({ state, elapsed }: { state: PillState; elapsed: string }) {
  const cfg = {
    listening: {
      bg: "bg-green-soft",
      border: "border-[rgba(15,138,95,0.2)]",
      dot: "bg-green motion-safe:animate-pulse",
      label: "Listening",
    },
    waiting: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      dot: "bg-blue-500",
      label: "Waiting",
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
    error: {
      bg: "bg-red-soft",
      border: "border-red-soft",
      dot: "bg-red",
      label: "Needs attention",
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
  const source = useSession((s) => s.source);
  const sourceKind = source.kind;

  const showWatch = PLAYABLE_SOURCE_KINDS.has(sourceKind);
  const showSourceReview = sourceKind === "text_doc";

  const tabs = [
    { key: "overview", label: "Overview", href: sessionViewHref(sp, "overview") },
    ...(showWatch
      ? [{ key: "watch", label: "Watch", href: sessionViewHref(sp, "watch") }]
      : []),
    ...(showSourceReview
      ? [{ key: "source", label: "Source", href: sessionViewHref(sp, "source") }]
      : []),
    { key: "transcript", label: "Transcript", href: sessionViewHref(sp, "transcript") },
    {
      key: "claims",
      label: `Claims · ${counts.claims}`,
      href: sessionViewHref(sp, "claims"),
    },
    {
      key: "markers",
      label: `Markers · ${counts.markers}`,
      href: sessionViewHref(sp, "markers"),
    },
  ];

  // Active state: exact match for overview/transcript/watch, prefix match for claims/markers
  // so that deep-linked filtered lists (e.g., ?view=claims&filter=...) still highlight.
  function isActive(tabKey: string): boolean {
    if (tabKey === "overview") return view === "overview";
    if (tabKey === "watch") return view === "watch";
    if (tabKey === "source") return view === "source";
    if (tabKey === "transcript") return view === "transcript";
    if (tabKey === "claims") return view === "claims" || view.startsWith("claims");
    if (tabKey === "markers") return view === "markers" || view.startsWith("markers");
    return false;
  }

  return (
    <nav
      aria-label="Session views"
      className="grid w-full min-w-0 grid-cols-2 gap-1 min-[380px]:grid-cols-3 sm:flex sm:w-auto sm:items-center sm:overflow-x-auto sm:pb-0"
    >
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg px-2.5 py-2 text-center text-[12px] font-medium leading-tight sm:min-h-9 sm:justify-start sm:px-3 sm:py-1.5 ${
            isActive(t.key)
              ? "bg-cream-2 text-ink"
              : "text-ink-3 hover:text-ink-2"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

// ─── TopControls ──────────────────────────────────────────────────────────────

function TopControls() {
  const router = useRouter();
  const sp = useSearchParams();
  const isRecording = useSession((s) => s.isRecording);
  const endedAt = useSession((s) => s.endedAt);
  const startedAt = useSession((s) => s.startedAt);
  const sourceKind = useSession((s) => s.source.kind);
  const transcriptCount = useSession((s) => s.transcript.length);
  const claimsCount = useSession((s) => s.claims.length);
  const markersCount = useSession((s) => s.markers.length);
  const synthesis = useSession((s) => s.synthesis);
  const devilAdvocate = useSession((s) => s.devilAdvocate);
  const setRecording = useSession((s) => s.setRecording);
  const reset = useSession((s) => s.reset);
  const [exportOpen, setExportOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [sourceSwitchOpen, setSourceSwitchOpen] = useState(false);
  const hasUsefulContent =
    transcriptCount > 0 ||
    claimsCount > 0 ||
    markersCount > 0 ||
    synthesis?.state === "fresh" ||
    synthesis?.state === "refreshing" ||
    (synthesis?.state === "error" && !!synthesis.text) ||
    devilAdvocate?.state === "fresh" ||
    devilAdvocate?.state === "refreshing" ||
    (devilAdvocate?.state === "error" && !!devilAdvocate.brief);
  const roomHref = tvHrefForSessionContext(sp);

  function handleChooseSource() {
    setSourceSwitchOpen(true);
  }

  function confirmChooseSource() {
    if (sourceKind === "browser_tab" && startedAt && !endedAt) {
      stopBrowserTabCapture();
    }
    reset();
    setSourceSwitchOpen(false);
    router.push("/session");
  }

  function saveBeforeSwitching() {
    setSourceSwitchOpen(false);
    setSaveOpen(true);
  }

  function exportBeforeSwitching() {
    setSourceSwitchOpen(false);
    setExportOpen(true);
  }

  function saveBeforeEnding() {
    setEndOpen(false);
    setSaveOpen(true);
  }

  function exportBeforeEnding() {
    setEndOpen(false);
    setExportOpen(true);
  }

  return (
    <>
      <div
        role="toolbar"
        aria-label="Session actions"
        className={[
          "fixed inset-x-0 bottom-0 z-30 grid w-full min-w-0 grid-cols-4 gap-2",
          "border-t border-line bg-paper/95 px-3 py-2 shadow-[0_-10px_30px_rgba(31,27,24,0.12)] backdrop-blur",
          "pb-[calc(0.5rem+env(safe-area-inset-bottom))]",
          "min-[520px]:grid-cols-6",
          "sm:static sm:ml-auto sm:flex sm:w-auto sm:items-center sm:justify-end sm:gap-1.5",
          "sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:shadow-none sm:backdrop-blur-none",
        ].join(" ")}
      >
        {startedAt && sourceKind === "mic" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-11 w-full px-3 sm:h-10 sm:w-auto"
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
        {startedAt && (
          <Button
            variant="ghost"
            size="sm"
            className="h-11 w-full px-3 sm:h-10 sm:w-auto"
            onClick={handleChooseSource}
          >
            <Plus className="h-3.5 w-3.5" /> Sources
          </Button>
        )}
        {startedAt && (
          <Link
            href={roomHref}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-accent hover:text-accent-foreground sm:h-10 sm:w-auto"
          >
            <MonitorPlay className="h-3.5 w-3.5" /> Room
          </Link>
        )}
        {startedAt && hasUsefulContent && (
          <Button
            variant="default"
            size="sm"
            className="h-11 w-full bg-teal px-3 text-white hover:bg-teal-2 sm:h-10 sm:w-auto"
            onClick={() => setSaveOpen(true)}
          >
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-11 w-full px-3 sm:h-10 sm:w-auto"
          onClick={() => setExportOpen(true)}
        >
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        {startedAt && (
          <Button
            variant="ghost"
            size="sm"
            className="h-11 w-full border border-transparent px-3 text-red-600 hover:bg-red-50 hover:text-red-700 sm:h-10 sm:w-auto"
            disabled={!!endedAt}
            onClick={() => setEndOpen(true)}
          >
            <Square className="h-3.5 w-3.5" /> End
          </Button>
        )}
      </div>
      <SaveSessionDialog open={saveOpen} onClose={() => setSaveOpen(false)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <EndSessionDialog
        open={endOpen}
        onClose={() => setEndOpen(false)}
        onSaveFirst={saveBeforeEnding}
        onExportFirst={exportBeforeEnding}
      />
      <SourceSwitchDialog
        open={sourceSwitchOpen}
        onClose={() => setSourceSwitchOpen(false)}
        onConfirm={confirmChooseSource}
        onSaveFirst={saveBeforeSwitching}
        onExportFirst={exportBeforeSwitching}
        active={!!startedAt && !endedAt}
        counts={{
          transcript: transcriptCount,
          claims: claimsCount,
          markers: markersCount,
        }}
      />
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
  const sourceKind = useSession((s) => s.source.kind);
  const browserTabStatus = useSession((s) => s.browserTabStatus);

  if (endedAt) return "ended";
  if (!startedAt) return "idle";
  if (sourceKind === "browser_tab") {
    if (browserTabStatus?.phase === "error") return "error";
    if (
      !isRecording ||
      browserTabStatus?.phase === "waiting_for_extension" ||
      browserTabStatus?.phase === "extension_connected" ||
      browserTabStatus?.phase === "no_audio_detected" ||
      browserTabStatus?.phase === "tab_changed"
    ) {
      return "waiting";
    }
  }
  if (isRecording) return "listening";
  return "paused";
}

// ─── Active speaker hook ──────────────────────────────────────────────────────

function useActiveSpeakerId(): number | null {
  const transcript = useSession((s) => s.transcript);
  if (transcript.length === 0) return null;
  return transcript[transcript.length - 1].speaker_id;
}

function useSpeakerRailEmptyLabel(): string {
  const startedAt = useSession((s) => s.startedAt);
  const endedAt = useSession((s) => s.endedAt);
  const isRecording = useSession((s) => s.isRecording);
  const sourceKind = useSession((s) => s.source.kind);
  const browserTabStatus = useSession((s) => s.browserTabStatus);

  if (!startedAt) return "Choose a source to begin";
  if (endedAt) return "Session ended";
  if (sourceKind === "browser_tab") {
    if (browserTabStatus?.phase === "error") return "Browser tab needs attention";
    if (browserTabStatus?.phase === "waiting_for_extension") return "Waiting for the Yentl extension…";
    if (browserTabStatus?.phase === "extension_connected") return "Connected; waiting for media audio…";
    if (browserTabStatus?.phase === "no_audio_detected") return "No media audio detected yet…";
    if (browserTabStatus?.phase === "tab_changed") return "Return to the captured tab…";
    if (!isRecording) return "Waiting for in-page media audio…";
    return "Analyzing media on this page…";
  }
  if (!isRecording) return "Paused";
  return "Listening for voices…";
}

// ─── SessionShell ─────────────────────────────────────────────────────────────

function PanelSurfaceShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}

function SessionShellInner({ children }: { children: ReactNode }) {
  const sp = useSearchParams();
  const isExtensionPanel = sp.get("surface") === "extension-panel";
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
  const speakerRailEmptyLabel = useSpeakerRailEmptyLabel();
  const isRecording = useSession((s) => s.isRecording);
  const hasSession = startedAt !== null;

  if (isExtensionPanel) {
    return <PanelSurfaceShell>{children}</PanelSurfaceShell>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {hasSession && (
        <>
          {/* Sticky header */}
          <header className="sticky top-0 z-20 bg-cream border-b border-line-soft">
            <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2.5 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:px-6 md:px-8">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                <BrandMark size="md" />
                <LivePill state={pillState} elapsed={elapsed} />
              </div>
              <div className="min-w-0 sm:flex-1">
                <Suspense fallback={null}>
                  <Tabs counts={{ claims: claimsCount, markers: markersCount }} />
                </Suspense>
              </div>
              <TopControls />
            </div>
          </header>

          {/* Speaker rail */}
          <SpeakerRail
            speakers={speakers}
            activeSpeakerId={activeSpeakerId}
            onRename={renameSpeaker}
            emptyLabel={speakerRailEmptyLabel}
            meterActive={isRecording && activeSpeakerId !== null}
          />
        </>
      )}

      {/* Body slot */}
      <main className={hasSession ? "flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0" : "flex-1"}>
        {children}
      </main>
    </div>
  );
}

export function SessionShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PanelSurfaceShell>{children}</PanelSurfaceShell>}>
      <SessionShellInner>{children}</SessionShellInner>
    </Suspense>
  );
}
