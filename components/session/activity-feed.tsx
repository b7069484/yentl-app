"use client";

import Link from "next/link";
import { VerdictChip } from "./chips";
import { MarkerChip } from "./chips";
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
      className="flex items-center gap-3 px-3.5 py-2.5 bg-paper border border-line rounded-[10px] cursor-pointer hover:border-line-strong"
    >
      {/* Timestamp */}
      <span className="text-[10px] text-ink-4 tabular-nums flex-shrink-0 w-9">
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

      {/* Quote */}
      <span className="font-serif italic text-[13px] text-ink-3 flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
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
}: {
  events: ActivityEvent[];  // already sorted desc, pre-limited by caller
  buildClaimHref: (id: string) => string;
  buildMarkerHref: (id: string) => string;
}) {
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-2.5">
        <div className="text-[10.5px] tracking-[.12em] uppercase text-ink-4 font-bold">
          Recent activity
        </div>
        <Link
          href="/session?view=transcript"
          className="text-[11px] text-ink-3 hover:text-ink-2 transition-colors"
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
