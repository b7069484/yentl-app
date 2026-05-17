"use client";
import { useSession } from "@/lib/client/session-store";
import { paletteFor } from "@/lib/client/speaker-palette";
import type { SpeakerId } from "@/lib/types";

export function SpeakerBadge({ speakerId }: { speakerId: SpeakerId | null }) {
  const speakers = useSession((s) => s.speakers);
  if (speakerId === null) return null;
  const label = speakers.find((sp) => sp.id === speakerId)?.label ?? `Speaker ${speakerId + 1}`;
  const palette = paletteFor(speakerId);
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
      {label}
    </span>
  );
}
