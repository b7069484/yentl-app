"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Square } from "lucide-react";
import { useSession } from "@/lib/client/session-store";

function formatRecTime(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * RecordingBeacon — fixed-position visual indicator while a session is
 * recording. Required by:
 *   - California Penal Code §632 (two-party consent UX)
 *   - Apple App Store guideline 5.1.2(i) (persistent recording indicator)
 *   - Pragmatic two-party-consent compliance for 12 US states
 *
 * Renders only when `isRecording === true`. Includes:
 *   - Pulsing red dot with motion-reduce:animate-none for prefers-reduced-motion
 *   - Live REC HH:MM:SS timer counting from startedAt
 *   - End session button (44×44 touch target, visible focus ring)
 *   - aria-live announcements when recording state changes
 */
export function RecordingBeacon() {
  const isRecording = useSession((s) => s.isRecording);
  const startedAt = useSession((s) => s.startedAt);
  const endSession = useSession((s) => s.endSession);

  const subscribeNow = useCallback((onStoreChange: () => void) => {
    if (!isRecording) return () => {};
    const t = setInterval(onStoreChange, 1000);
    return () => clearInterval(t);
  }, [isRecording]);
  const now = useSyncExternalStore(subscribeNow, Date.now, Date.now);
  const announcement = isRecording ? "Live capture started" : "Live capture stopped";

  const startedAtMs = startedAt ? Date.parse(startedAt) : null;
  const elapsedMs =
    startedAtMs && Number.isFinite(startedAtMs) ? now - startedAtMs : 0;
  const timer = formatRecTime(elapsedMs);

  if (!isRecording) {
    return (
      <span
        data-testid="recording-beacon-announcer"
        aria-live="polite"
        className="sr-only"
      >
        {announcement}
      </span>
    );
  }

  return (
    <div
      data-testid="recording-beacon"
      className="fixed right-3 top-3 z-[60] flex items-center gap-2 rounded-full border bg-white/95 px-3 py-1.5 shadow-[0_4px_14px_rgba(20,23,31,.12)] backdrop-blur sm:right-4 sm:top-4"
      style={{ borderColor: "rgba(239,68,68,.32)" }}
      aria-label={`Recording for ${timer}`}
    >
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red animate-pulse motion-reduce:animate-none"
      />
      <span className="font-mono text-[11px] font-bold uppercase tracking-[.08em] text-[#B91C1C]">
        Rec
      </span>
      <span className="font-mono text-[11.5px] font-semibold tabular-nums text-ink-2">
        {timer}
      </span>
      <button
        type="button"
        onClick={endSession}
        aria-label="End recording session"
        className="ml-1 inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-full text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 hover:brightness-110"
        style={{
          background: "linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)",
          boxShadow:
            "0 4px 12px rgba(185,28,28,.32), inset 0 1px 0 rgba(255,255,255,.18)",
        }}
      >
        <Square className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
      </button>
      <span
        data-testid="recording-beacon-announcer"
        aria-live="polite"
        className="sr-only"
      >
        {announcement}
      </span>
    </div>
  );
}
