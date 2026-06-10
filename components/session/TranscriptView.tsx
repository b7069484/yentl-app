"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Highlighter, Search, X } from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VERDICT } from "@/lib/client/verdict-theme";
import { ReassignSpeakerMenu } from "@/components/session/reassign-speaker-menu";
import { documentAnchorLabel } from "@/lib/document-anchor";
import { PLAYABLE_SOURCE_KINDS } from "@/lib/source-kinds";
import type { ClaimCard, DocumentAnchor, RhetoricMarker, SpeakerId, TranscriptSegment } from "@/lib/types";
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
  entries: TranscriptEntry[];
};

type TranscriptEntry = {
  segment: TranscriptSegment;
  transcriptIndex: number;
  hasFinding: boolean;
  matchesSearch: boolean;
};

type SpeakerFilter = "all" | SpeakerId;

function groupBySpeaker(entries: TranscriptEntry[]): Block[] {
  const blocks: Block[] = [];
  for (const entry of entries) {
    const seg = entry.segment;
    const last = blocks[blocks.length - 1];
    if (last && last.speakerId === seg.speaker_id) {
      last.entries.push(entry);
    } else {
      blocks.push({ speakerId: seg.speaker_id, firstIndex: entry.transcriptIndex, entries: [entry] });
    }
  }
  return blocks;
}

function documentAnchorKey(anchor?: DocumentAnchor): string {
  if (!anchor) return "";
  return [
    anchor.kind,
    anchor.block_index,
    anchor.paragraph_index ?? "",
    anchor.cue_index ?? "",
    anchor.speaker_label ?? "",
  ].join(":");
}

function overlapsSegment(
  segment: TranscriptSegment,
  item: Pick<ClaimCard, "utterance_start" | "utterance_end"> | Pick<RhetoricMarker, "start_time" | "end_time">,
): boolean {
  const start = "utterance_start" in item ? item.utterance_start : item.start_time;
  const end = "utterance_end" in item ? item.utterance_end : item.end_time;
  return start < segment.end && end > segment.start;
}

function transcriptEntryKey(entry: TranscriptEntry): string {
  return entry.segment.id ?? `${entry.segment.start}:${entry.transcriptIndex}`;
}

function formatTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const m = Math.floor(safeSeconds / 60);
  const s = Math.floor(safeSeconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function highlightedText(text: string, query: string): React.ReactNode {
  const needle = query.trim();
  if (!needle) return text;
  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let index = lowerText.indexOf(lowerNeedle);
  let key = 0;

  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    const end = index + needle.length;
    parts.push(
      <mark key={`match-${key}`} className="rounded-sm bg-amber-soft px-0.5 text-ink">
        {text.slice(index, end)}
      </mark>,
    );
    cursor = end;
    key += 1;
    index = lowerText.indexOf(lowerNeedle, cursor);
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
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
  const markers = useSession((s) => s.markers);
  const speakers = useSession((s) => s.speakers);
  const source = useSession((s) => s.source);
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState<SpeakerFilter>("all");
  const [findingsOnly, setFindingsOnly] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  const claimByStart = useMemo(() => {
    const map = new Map<number, ClaimCard>();
    for (const c of claims) map.set(c.utterance_start, c);
    return map;
  }, [claims]);

  const entries = useMemo<TranscriptEntry[]>(() => {
    return transcript.map((segment, transcriptIndex) => {
      const hasFinding =
        claims.some((claim) => overlapsSegment(segment, claim)) ||
        markers.some((marker) => overlapsSegment(segment, marker));
      return {
        segment,
        transcriptIndex,
        hasFinding,
        matchesSearch: normalizedQuery.length === 0 || segment.text.toLowerCase().includes(normalizedQuery),
      };
    });
  }, [claims, markers, normalizedQuery, transcript]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (speakerFilter !== "all" && entry.segment.speaker_id !== speakerFilter) return false;
      if (findingsOnly && !entry.hasFinding) return false;
      return entry.matchesSearch;
    });
  }, [entries, findingsOnly, speakerFilter]);

  const blocks = useMemo(() => groupBySpeaker(filteredEntries), [filteredEntries]);
  const searchMatches = normalizedQuery.length > 0
    ? entries.filter((entry) => entry.matchesSearch).length
    : null;
  const showSpeakers = speakers.length >= 2;
  const isPresent = variant === "present";
  const showReviewTools = !isPresent;
  const canJumpToMedia = !isPresent && PLAYABLE_SOURCE_KINDS.has(source.kind);
  const visibleCount = filteredEntries.length;
  const findingsCount = entries.filter((entry) => entry.hasFinding).length;
  const summary = normalizedQuery.length > 0
    ? `${visibleCount} of ${transcript.length} lines shown · ${searchMatches ?? 0} search matches`
    : `${visibleCount} of ${transcript.length} lines shown`;

  function watchHrefFor(seconds: number): string {
    const next = new URLSearchParams(searchParams.toString());
    next.set("view", "watch");
    next.set("t", Math.max(0, seconds).toFixed(2).replace(/\.00$/, ""));
    return `/session?${next.toString()}`;
  }

  return (
    <ScrollArea className="h-full">
      {showReviewTools && (
        <section
          aria-label="Transcript review controls"
          data-testid="transcript-review-controls"
          className="sticky top-0 z-10 border-b border-line bg-paper/95 px-5 py-3 backdrop-blur sm:px-6 md:px-8"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search transcript</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search transcript"
                  className="h-11 w-full rounded-lg border border-line bg-cream pl-9 pr-10 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-teal"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear transcript search"
                    onClick={() => setQuery("")}
                    className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-4 transition-colors hover:bg-paper"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </label>
              <button
                type="button"
                data-testid="transcript-findings-filter"
                aria-pressed={findingsOnly}
                onClick={() => setFindingsOnly((active) => !active)}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-[12px] font-semibold transition-colors ${
                  findingsOnly
                    ? "border-teal bg-teal-soft text-teal"
                    : "border-line bg-paper text-ink-3 hover:text-ink-2"
                }`}
              >
                <Highlighter className="h-4 w-4" aria-hidden />
                Findings
                <span className="rounded-full bg-paper px-1.5 py-0.5 text-[10px] text-ink-3">{findingsCount}</span>
              </button>
            </div>
            {showSpeakers && (
              <div className="flex gap-1 overflow-x-auto pb-0.5" aria-label="Speaker transcript filter">
                <button
                  type="button"
                  data-testid="transcript-speaker-filter-all"
                  aria-pressed={speakerFilter === "all"}
                  onClick={() => setSpeakerFilter("all")}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 text-[12px] font-medium transition-colors sm:min-h-9 ${
                    speakerFilter === "all"
                      ? "border-ink bg-ink text-paper"
                      : "border-line bg-paper text-ink-3 hover:text-ink-2"
                  }`}
                >
                  All
                </button>
                {speakers.map((speaker) => {
                  const palette = paletteFor(speaker.id);
                  return (
                    <button
                      key={speaker.id}
                      type="button"
                      data-testid={`transcript-speaker-filter-${speaker.id}`}
                      aria-pressed={speakerFilter === speaker.id}
                      onClick={() => setSpeakerFilter(speaker.id)}
                      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition-colors sm:min-h-9 ${
                        speakerFilter === speaker.id
                          ? "border-ink bg-ink text-paper"
                          : "border-line bg-paper text-ink-3 hover:text-ink-2"
                      }`}
                    >
                      <span aria-hidden className={`h-2 w-2 rounded-full ${palette.dot}`} />
                      {speaker.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div
              data-testid="transcript-filter-summary"
              role="status"
              className="text-[11px] font-medium text-ink-4"
            >
              {summary}
            </div>
          </div>
        </section>
      )}
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

        {transcript.length > 0 && filteredEntries.length === 0 && (
          <p className="rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink-3">
            No matching transcript lines.
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
                </div>
              )}
              <p className="whitespace-pre-wrap text-foreground/90">
                {block.entries.map((entry, segIdx) => {
                  const seg = entry.segment;
                  const claim = claimByStart.get(seg.start);
                  const anchorLabel = documentAnchorLabel(seg.document_anchor);
                  const previousAnchor = block.entries[segIdx - 1]?.segment.document_anchor;
                  const showAnchor =
                    anchorLabel !== null &&
                    documentAnchorKey(seg.document_anchor) !== documentAnchorKey(previousAnchor);
                  if (claim) {
                    const tone = HIGHLIGHT_TONE[claim.primary_label] ?? HIGHLIGHT_TONE.UNVERIFIABLE;
                    const verdict = VERDICT[claim.primary_label];
                    return (
                      <span key={transcriptEntryKey(entry)}>
                        {segIdx === 0 ? null : " "}
                        {showAnchor && (
                          <span className="mr-1.5 inline-flex rounded border border-line bg-cream px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-4">
                            {anchorLabel}
                          </span>
                        )}
                        {canJumpToMedia && (
                          <Link
                            href={watchHrefFor(seg.start)}
                            data-testid={`transcript-jump-${seg.start}`}
                            className="mr-1.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-ink-4 transition-colors hover:border-teal hover:text-teal sm:min-h-0 sm:min-w-0"
                            title={`Open Watch at ${formatTime(seg.start)}`}
                          >
                            {formatTime(seg.start)}
                          </Link>
                        )}
                        <span
                          data-segment-start={seg.start}
                          data-claim-id={claim.id}
                          className={`cursor-pointer rounded-sm px-0.5 transition-colors hover:brightness-95 ${tone}`}
                          title={`${verdict.short} · ${claim.score}/100 · click to focus the card`}
                          onClick={() => onClaimSegmentClick?.(claim.id)}
                        >
                          {highlightedText(seg.text, query)}
                        </span>
                      </span>
                    );
                  }
                  return (
                    <span key={transcriptEntryKey(entry)}>
                      {segIdx === 0 ? null : " "}
                      {showAnchor && (
                        <span className="mr-1.5 inline-flex rounded border border-line bg-cream px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-4">
                          {anchorLabel}
                        </span>
                      )}
                      {canJumpToMedia && (
                        <Link
                          href={watchHrefFor(seg.start)}
                          data-testid={`transcript-jump-${seg.start}`}
                          className="mr-1.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-ink-4 transition-colors hover:border-teal hover:text-teal sm:min-h-0 sm:min-w-0"
                          title={`Open Watch at ${formatTime(seg.start)}`}
                        >
                          {formatTime(seg.start)}
                        </Link>
                      )}
                      <span data-segment-start={seg.start}>
                        {highlightedText(seg.text, query)}
                      </span>
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
