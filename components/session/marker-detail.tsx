"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { RhetoricMarker, Speaker, MarkerType, MarkerSeverity } from "@/lib/types";
import { sessionPathHref } from "@/lib/client/session-route";
import { useSession } from "@/lib/client/session-store";
import { attributionStatusLabel, isAttributionStatusResolved, speakerLabelFor } from "./attribution-labels";
import { ActionButton } from "./claim-detail";
import { createUserDisputeFlag, ReviewFlagPanel } from "./review-flag-panel";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function markerAttributionDetail(
  marker: RhetoricMarker,
  speakers: Speaker[],
): { label: string; value: string } {
  if (
    marker.speaker_id !== null &&
    (!marker.attribution_status || isAttributionStatusResolved(marker.attribution_status))
  ) {
    return {
      label: "Said by",
      value: speakerLabelFor(speakers, marker.speaker_id),
    };
  }

  return {
    label: "Attribution",
    value: marker.attribution_status
      ? attributionStatusLabel(marker.attribution_status)
      : "not available",
  };
}

// ─── Marker type + severity theming ──────────────────────────────────────────

const TYPE_PILL: Record<MarkerType, string> = {
  fallacy:  "bg-red-soft text-red border-red/20",
  bias:     "bg-orange-soft text-orange border-orange/20",
  rhetoric: "bg-purple-soft text-purple border-purple/20",
};

const TYPE_LABEL: Record<MarkerType, string> = {
  fallacy:  "Fallacy",
  bias:     "Bias",
  rhetoric: "Rhetoric",
};

const SEVERITY_DOT: Record<MarkerSeverity, string> = {
  subtle:  "bg-amber",
  clear:   "bg-orange",
  blatant: "bg-red",
};

const SEVERITY_LABEL: Record<MarkerSeverity, string> = {
  subtle:  "Subtle",
  clear:   "Clear",
  blatant: "Blatant",
};

// ─── MarkerDetail ─────────────────────────────────────────────────────────────

export function MarkerDetail({
  marker,
  speakers,
}: {
  marker: RhetoricMarker;
  speakers: Speaker[];
}) {
  const searchParams = useSearchParams();
  const attributionDetail = markerAttributionDetail(marker, speakers);
  const updateMarker = useSession((s) => s.updateMarker);
  const disputed = marker.review?.status === "disputed";

  async function onShare() {
    const path = sessionPathHref(searchParams, `/session/detail/marker/${marker.id}`);
    const url = `${window.location.origin}${path}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  }

  function onDispute() {
    updateMarker(marker.id, {
      review: createUserDisputeFlag(
        "User disputed this marker from the detail view. Re-check the excerpt, rhetoric pattern, severity, and surrounding context before relying on it.",
      ),
    });
  }

  return (
    <div className="px-6 md:px-8 pt-4 pb-12 max-w-[820px] mx-auto w-full flex flex-col gap-3.5">
      {/* ── Marker hero ────────────────────────────────────────────── */}
      <div className="bg-paper border border-line rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Type badge */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${TYPE_PILL[marker.type]}`}
          >
            {TYPE_LABEL[marker.type]}
          </span>

          {/* Severity dot + label */}
          <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <span
              className={`w-2 h-2 rounded-full ${SEVERITY_DOT[marker.severity]}`}
              aria-hidden
            />
            <span>{SEVERITY_LABEL[marker.severity]}</span>
          </div>
        </div>

        {/* Display name (archetype) */}
        <div className="font-serif text-[22px] font-medium text-ink leading-tight tracking-tight mb-2.5">
          {marker.display}
        </div>

        {/* Excerpt */}
        {marker.excerpt && (
          <blockquote className="font-serif italic text-[15px] text-ink-3 leading-snug border-l-[3px] border-line pl-3">
            &ldquo;{marker.excerpt}&rdquo;
          </blockquote>
        )}
      </div>

      {/* ── Why flagged ────────────────────────────────────────────── */}
      {marker.explanation && (
        <div className="bg-paper border border-line rounded-2xl p-4 px-5">
          <div className="text-[10.5px] tracking-wider uppercase text-ink-4 font-bold mb-2.5">
            Why flagged
          </div>
          <div className="text-[13px] text-ink-2 leading-relaxed">
            {marker.explanation}
          </div>
        </div>
      )}

      {marker.review && <ReviewFlagPanel label="Marker" review={marker.review} />}

      {/* ── Speaker + time context ─────────────────────────────────── */}
      <div className="text-[12px] text-ink-3">
        {attributionDetail.label}{" "}
        <b className="text-ink-2 font-semibold">{attributionDetail.value}</b>
        {" · "}
        {formatTs(marker.start_time)}
      </div>

      {/* ── Action row ─────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap pt-2">
        <ActionButton label="Share" onClick={onShare} />
        <ActionButton
          label={disputed ? "Marked for review" : "Dispute"}
          onClick={onDispute}
          disabled={disputed}
          tooltip={
            disputed
              ? "This marker is already marked for human review."
              : "Mark this marker for human review."
          }
        />
      </div>

      {/* ── Footer: Learn more ─────────────────────────────────────── */}
      <div className="flex items-center text-[11px] text-ink-3 pt-3 border-t border-line-soft">
        <Link
          href={sessionPathHref(searchParams, `/session/learn/marker/${marker.name}`)}
          data-testid="marker-learn-link"
          className="inline-flex min-h-11 items-center hover:text-ink-2 transition-colors"
        >
          Learn more about {marker.display} →
        </Link>
      </div>
    </div>
  );
}
