"use client";
import { useMemo } from "react";
import { useSession } from "@/lib/client/session-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VERDICT } from "@/lib/client/verdict-theme";
import type { ClaimCard } from "@/lib/types";

const HIGHLIGHT_TONE: Record<ClaimCard["primary_label"], string> = {
  TRUE: "bg-emerald-50 border-b-2 border-emerald-300",
  MOSTLY_TRUE: "bg-emerald-50 border-b-2 border-emerald-200",
  PARTIAL: "bg-amber-50 border-b-2 border-amber-300",
  MISLEADING: "bg-amber-50 border-b-2 border-amber-400",
  OMISSION: "bg-orange-50 border-b-2 border-orange-300",
  FALSE: "bg-rose-50 border-b-2 border-rose-300",
  UNVERIFIABLE: "bg-slate-50 border-b-2 border-slate-300",
  OPINION: "bg-violet-50 border-b-2 border-violet-300",
};

export function TranscriptView({
  variant = "compact",
  onClaimSegmentClick,
}: {
  variant?: "compact" | "present";
  onClaimSegmentClick?: (claimId: string) => void;
} = {}) {
  const transcript = useSession((s) => s.transcript);
  const interim = useSession((s) => s.interim);
  const claims = useSession((s) => s.claims);

  const claimByStart = useMemo(() => {
    const map = new Map<number, ClaimCard>();
    for (const c of claims) map.set(c.utterance_start, c);
    return map;
  }, [claims]);

  const isPresent = variant === "present";

  return (
    <ScrollArea className="h-full">
      <div
        className={`${
          isPresent
            ? "mx-auto max-w-3xl px-8 py-10 text-[22px] leading-[1.55]"
            : "px-4 py-3 text-[15px] leading-relaxed"
        }`}
      >
        {transcript.length === 0 && !interim && (
          <p className="text-sm italic text-muted-foreground">
            Press <span className="font-semibold text-foreground">Record</span> and start talking — final segments appear here, claims to the right.
          </p>
        )}
        <p className="whitespace-pre-wrap text-foreground/90">
          {transcript.map((seg, i) => {
            const claim = claimByStart.get(seg.start);
            const text = (i === 0 ? "" : " ") + seg.text;
            if (claim) {
              const tone = HIGHLIGHT_TONE[claim.primary_label] ?? HIGHLIGHT_TONE.UNVERIFIABLE;
              const verdict = VERDICT[claim.primary_label];
              return (
                <span
                  key={i}
                  data-segment-start={seg.start}
                  data-claim-id={claim.id}
                  className={`cursor-pointer rounded-sm px-0.5 transition-colors hover:brightness-95 ${tone}`}
                  title={`${verdict.short} · ${claim.score}/100 · click to focus the card`}
                  onClick={() =>
                    onClaimSegmentClick?.(claim.id)
                  }
                >
                  {text}
                </span>
              );
            }
            return (
              <span key={i} data-segment-start={seg.start}>
                {text}
              </span>
            );
          })}
          {interim && (
            <span className="text-muted-foreground/70">
              {transcript.length > 0 ? " " : ""}
              {interim}
            </span>
          )}
        </p>
      </div>
    </ScrollArea>
  );
}
