"use client";
import { useSession } from "@/lib/client/session-store";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TranscriptView() {
  const { transcript, interim } = useSession();
  return (
    <ScrollArea className="h-full p-4">
      <div
        aria-live="polite"
        aria-label="Session transcript"
        className="space-y-2 text-base leading-relaxed"
      >
        {transcript.map((seg, i) => (
          <span key={i}>{seg.text} </span>
        ))}
        {interim && <span className="text-muted-foreground">{interim}</span>}
      </div>
    </ScrollArea>
  );
}
