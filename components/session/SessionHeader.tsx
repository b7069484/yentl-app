"use client";
import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { AudioMeter } from "@/components/session/AudioMeter";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/client/session-store";

export function SessionHeader({
  onStart, onStop, onEnd, onExport, audioStream,
}: {
  onStart: () => void;
  onStop: () => void;
  onEnd: () => void;
  onExport: () => void;
  audioStream: MediaStream | null;
}) {
  const { isRecording, mode, toggleMode, title, startedAt } = useSession();
  const hasContent = useSession(
    (s) => s.transcript.length > 0 || s.claims.length > 0 || s.markers.length > 0,
  );
  const [, setTick] = useState(0);

  // Tick once a second while recording so the clock keeps moving during silence
  // (store updates alone would only refresh on incoming utterances).
  useEffect(() => {
    if (!isRecording || !startedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording, startedAt]);

  const elapsed = startedAt
    ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
    : 0;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border/60 bg-card/60 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-2.5 py-1">
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full transition-colors ${
              isRecording ? "bg-red-500 animate-pulse" : "bg-muted-foreground/40"
            }`}
          />
          <span className="font-mono text-xs tabular-nums text-foreground/80">
            {formatTime(elapsed)}
          </span>
          <AudioMeter stream={isRecording ? audioStream : null} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {isRecording ? "Listening" : startedAt ? "Paused" : "Idle"}
          </span>
          <span className="max-w-[42ch] truncate text-sm text-foreground/90">
            {title ? prettifyTitle(title) : "Untitled session"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SpeakersModeToggle />
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMode}
          aria-pressed={mode === "D"}
        >
          {mode === "A" ? "Present mode" : "Two-column"}
        </Button>
        {isRecording ? (
          <Button variant="outline" size="sm" onClick={onStop}>
            Pause
          </Button>
        ) : (
          <Button size="sm" onClick={onStart}>
            {startedAt ? "Resume" : "Record"}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={!hasContent}
          title={hasContent ? "Export this session" : "Capture content first"}
        >
          Export
        </Button>
        <Button variant="destructive" size="sm" onClick={onEnd}>
          End session
        </Button>
      </div>
    </header>
  );
}

function SpeakersModeToggle() {
  const speakersMode = useSession((s) => s.speakersMode);
  const setSpeakersMode = useSession((s) => s.setSpeakersMode);
  return (
    <Button
      variant={speakersMode ? "default" : "outline"}
      size="sm"
      onClick={() => setSpeakersMode(!speakersMode)}
      aria-pressed={speakersMode}
      title={
        speakersMode
          ? "Speakers mode ON — capturing audio played through this device. Click to disable."
          : "Speakers mode OFF — your voice only. Click to also capture audio played through this device's speakers."
      }
      className="gap-1.5"
    >
      <Volume2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Speakers</span>
    </Button>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

// Sessions auto-name themselves with a timestamp. Trim it to a clock for the header.
function prettifyTitle(t: string) {
  const d = new Date(t);
  if (isNaN(d.getTime())) return t;
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}
