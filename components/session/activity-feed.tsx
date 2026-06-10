"use client";

import Link from "next/link";
import { VerdictChip } from "./chips";
import { MarkerChip } from "./chips";
import { sessionViewHref } from "@/lib/client/session-route";
import type { PrimaryLabel, MarkerType, MarkerSeverity, SpeakerId } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityClaim = {
  kind: "claim";
  id: string;
  ts: number;            // seconds
  speakerId: SpeakerId | null;
  speakerLabel: string;
  verdict: PrimaryLabel;
  score: number;
  quote: string;
};

export type ActivityMarker = {
  kind: "marker";
  id: string;
  ts: number;
  speakerId: SpeakerId | null;
  speakerLabel: string;
  markerType: MarkerType;
  display: string;
  severity?: MarkerSeverity;
  quote: string;
};

export type ActivityEvent = ActivityClaim | ActivityMarker;

// ─── Helper ───────────────────────────────────────────────────────────────────

export function formatTs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── ActivityRow (internal) ───────────────────────────────────────────────────

function ChevronRight() {
  return (
    <svg
      className="w-3.5 h-3.5 text-ink-4 flex-shrink-0"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="5,2 10,7 5,12" />
    </svg>
  );
}

function ActivityRow({
  event,
  buildClaimHref,
  buildMarkerHref,
}: {
  event: ActivityEvent;
  buildClaimHref: (id: string) => string;
  buildMarkerHref: (id: string) => string;
}) {
  const href =
    event.kind === "claim"
      ? buildClaimHref(event.id)
      : buildMarkerHref(event.id);

  const avatarIndex = ((event.speakerId ?? 0) % 6) + 1;

  return (
    <Link
      href={href}
      className="flex min-h-11 flex-col gap-2 rounded-[10px] border border-line bg-paper px-3.5 py-3 cursor-pointer hover:border-line-strong sm:flex-row sm:items-center sm:gap-3 sm:py-2.5"
    >
      <span className="flex min-w-0 items-center gap-2 sm:contents">
        {/* Timestamp */}
        <span className="w-9 flex-shrink-0 text-[10px] tabular-nums text-ink-4">
          {formatTs(event.ts)}
        </span>

        {/* Speaker avatar */}
        <span
          className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0 bg-spk-${avatarIndex}`}
        >
          {event.speakerLabel[0]}
        </span>

        {/* Verdict or Marker chip */}
        {event.kind === "claim" ? (
          <VerdictChip verdict={event.verdict} score={event.score} />
        ) : (
          <MarkerChip
            type={event.markerType}
            display={event.display}
            severity={event.severity}
          />
        )}
      </span>

      {/* Quote */}
      <span className="min-w-0 flex-1 font-serif text-[13.5px] italic leading-snug text-ink-3 line-clamp-3 sm:overflow-hidden sm:text-ellipsis sm:whitespace-nowrap sm:text-[13px] sm:line-clamp-none">
        &ldquo;{event.quote}&rdquo;
      </span>

      <ChevronRight />
    </Link>
  );
}

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

export function ActivityFeed({
  events,
  buildClaimHref,
  buildMarkerHref,
  transcriptHref = sessionViewHref(null, "transcript"),
}: {
  events: ActivityEvent[];  // already sorted desc, pre-limited by caller
  buildClaimHref: (id: string) => string;
  buildMarkerHref: (id: string) => string;
  transcriptHref?: string;
}) {
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-2.5">
        <div className="text-[10.5px] tracking-[.12em] uppercase text-ink-4 font-bold">
          Recent activity
        </div>
        <Link
          href={transcriptHref}
          className="inline-flex min-h-11 items-center rounded-lg px-1 text-[11px] text-ink-3 transition-colors hover:text-ink-2"
        >
          See full transcript &rarr;
        </Link>
      </div>

      {/* Event list or empty state */}
      {events.length === 0 ? (
        <div className="text-[11.5px] italic text-ink-4 py-3">
          No claims or markers yet — keep talking.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((event) => (
            <ActivityRow
              key={event.id}
              event={event}
              buildClaimHref={buildClaimHref}
              buildMarkerHref={buildMarkerHref}
            />
          ))}
        </div>
      )}
    </div>
  );
}
