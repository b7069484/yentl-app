"use client";
import { useMemo } from "react";
import { useSession } from "@/lib/client/session-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VERDICT } from "@/lib/client/verdict-theme";
import { ReassignSpeakerMenu } from "@/components/session/reassign-speaker-menu";
import {
  AttributionBadge,
  worstAttributionStatus,
} from "@/components/session/AttributionBadge";
import type { ClaimCard, SpeakerId, TranscriptSegment } from "@/lib/types";
export { paletteFor } from "@/lib/client/speaker-palette";
import { paletteFor } from "@/lib/client/speaker-palette";

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

type Block = {
  speakerId: SpeakerId | null;
  /** Index of the first segment in this block within the flat transcript array. */
  firstIndex: number;
  segments: TranscriptSegment[];
};

function groupBySpeaker(segments: TranscriptSegment[]): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const last = blocks[blocks.length - 1];
    if (last && last.speakerId === seg.speaker_id) {
      last.segments.push(seg);
    } else {
      blocks.push({ speakerId: seg.speaker_id, firstIndex: i, segments: [seg] });
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
            : "mx-auto w-full max-w-3xl px-5 py-5 text-[15px] leading-relaxed sm:px-6 md:px-8"
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
                  {/*
                    The ReassignSpeakerMenu replaces the plain speaker label.
                    It renders as the same label but is clickable to open a
                    dropdown that lets the user correct mis-attributed utterances.
                    The firstIndex points to the first segment of this block; the
                    user's selection reassigns from that segment onward only if
                    all segments in the block share the same speaker — which they
                    always do by construction (groupBySpeaker).
                  */}
                  <ReassignSpeakerMenu
                    transcriptIndex={block.firstIndex}
                    speakerId={block.speakerId}
                    className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${palette.label} border-0 bg-transparent px-0 hover:bg-transparent`}
                  />
                  {/* Phase 1b: surface attribution uncertainty (worst case wins
                      across the block's segments). Confident + manual_corrected
                      render no badge. */}
                  <AttributionBadge
                    status={worstAttributionStatus(
                      block.segments.map((s) => s.attribution_status),
                    )}
                  />
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
        <p className="mx-auto w-full max-w-3xl px-5 py-1 text-muted-foreground/70 sm:px-6 md:px-8" aria-hidden="true">{interim}</p>
      )}
    </ScrollArea>
  );
}
