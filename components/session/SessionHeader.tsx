"use client";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/client/session-store";

export function SessionHeader({
  onStart, onStop, onEnd,
}: {
  onStart: () => void;
  onStop: () => void;
  onEnd: () => void;
}) {
  const { isRecording, mode, toggleMode, title, startedAt } = useSession();
  const elapsed = startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0;

  return (
    <header className="flex items-center justify-between gap-4 border-b p-4">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-muted"}`} />
        <span className="font-mono text-sm">{formatTime(elapsed)}</span>
        <span className="text-sm text-muted-foreground">{title || "Untitled session"}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleMode}>
          {mode === "A" ? "Present mode" : "Two-column"}
        </Button>
        {isRecording ? (
          <Button variant="outline" size="sm" onClick={onStop}>Pause</Button>
        ) : (
          <Button size="sm" onClick={onStart}>Record</Button>
        )}
        <Button variant="destructive" size="sm" onClick={onEnd}>End session</Button>
      </div>
    </header>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
