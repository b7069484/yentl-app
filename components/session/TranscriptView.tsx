"use client";
import { useMemo } from "react";
import { useSession } from "@/lib/client/session-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VERDICT } from "@/lib/client/verdict-theme";
import type { ClaimCard, SpeakerId, TranscriptSegment } from "@/lib/types";

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

const SPEAKER_PALETTE = [
  { dot: "bg-spk-1", label: "text-ink",     border: "border-spk-1" },
  { dot: "bg-spk-2", label: "text-amber-2", border: "border-spk-2" },
  { dot: "bg-spk-3", label: "text-teal-2",  border: "border-spk-3" },
  { dot: "bg-spk-4", label: "text-purple",  border: "border-spk-4" },
  { dot: "bg-spk-5", label: "text-pink",    border: "border-spk-5" },
  { dot: "bg-spk-6", label: "text-orange",  border: "border-spk-6" },
];

export function paletteFor(id: SpeakerId): (typeof SPEAKER_PALETTE)[number] {
  return SPEAKER_PALETTE[id % SPEAKER_PALETTE.length];
}

type Block = { speakerId: SpeakerId | null; segments: TranscriptSegment[] };

function groupBySpeaker(segments: TranscriptSegment[]): Block[] {
  const blocks: Block[] = [];
  for (const seg of segments) {
    const last = blocks[blocks.length - 1];
    if (last && last.speakerId === seg.speaker_id) {
      last.segments.push(seg);
    } else {
      blocks.push({ speakerId: seg.speaker_id, segments: [seg] });
    }
  }
  return blocks;
}

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
  const speakers = useSession((s) => s.speakers);

  const claimByStart = useMemo(() => {
    const map = new Map<number, ClaimCard>();
    for (const c of claims) map.set(c.utterance_start, c);
    return map;
  }, [claims]);

  const speakerLabel = useMemo(() => {
    const map = new Map<number, string>();
    for (const sp of speakers) map.set(sp.id, sp.label);
    return map;
  }, [speakers]);

  const blocks = useMemo(() => groupBySpeaker(transcript), [transcript]);
  const showSpeakers = speakers.length >= 2;
  const isPresent = variant === "present";

  return (
    <ScrollArea className="h-full">
      {/*
        Committee amendment (Accessibility, WCAG 4.1.3 Status Messages):
        role="log" + aria-live="polite" tells screen readers that new content
        appended here is a continuous log of utterances. Polite (not assertive)
        avoids interrupting the user's own speech with announcements of their
        own transcription. Interim text is rendered OUTSIDE this region to
        prevent 100ms partial-word floods.
      */}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Live transcript"
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

        {blocks.map((block, blockIdx) => {
          const showHeader = showSpeakers && block.speakerId !== null;
          const palette = block.speakerId !== null ? paletteFor(block.speakerId) : null;
          return (
            <div
              key={blockIdx}
              className={`mb-3 ${showHeader && palette ? `border-l-2 pl-3 ${palette.border}` : ""}`}
            >
              {showHeader && palette && (
                <div className="mb-1 flex items-center gap-1.5">
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${palette.label}`}>
                    {speakerLabel.get(block.speakerId!) ?? `Speaker ${block.speakerId! + 1}`}
                  </span>
                </div>
              )}
              <p className="whitespace-pre-wrap text-foreground/90">
                {block.segments.map((seg, segIdx) => {
                  const claim = claimByStart.get(seg.start);
                  const text = (segIdx === 0 ? "" : " ") + seg.text;
                  if (claim) {
                    const tone = HIGHLIGHT_TONE[claim.primary_label] ?? HIGHLIGHT_TONE.UNVERIFIABLE;
                    const verdict = VERDICT[claim.primary_label];
                    return (
                      <span
                        key={segIdx}
                        data-segment-start={seg.start}
                        data-claim-id={claim.id}
                        className={`cursor-pointer rounded-sm px-0.5 transition-colors hover:brightness-95 ${tone}`}
                        title={`${verdict.short} · ${claim.score}/100 · click to focus the card`}
                        onClick={() => onClaimSegmentClick?.(claim.id)}
                      >
                        {text}
                      </span>
                    );
                  }
                  return (
                    <span key={segIdx} data-segment-start={seg.start}>
                      {text}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        })}

      </div>
      {/* Interim text rendered OUTSIDE the live region — no SR floods from partial words */}
      {interim && (
        <p className="px-4 py-1 text-muted-foreground/70" aria-hidden="true">{interim}</p>
      )}
    </ScrollArea>
  );
}
