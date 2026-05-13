"use client";
import { useState } from "react";
import type { RhetoricMarker } from "@/lib/types";
import { getEntry } from "@/lib/taxonomy";
import { SpeakerBadge } from "./SpeakerBadge";

const TYPE_THEME: Record<
  RhetoricMarker["type"],
  { label: string; pill: string; stripe: string }
> = {
  bias: {
    label: "Bias",
    pill: "bg-indigo-50 text-indigo-800 border-indigo-200",
    stripe: "bg-indigo-400",
  },
  fallacy: {
    label: "Fallacy",
    pill: "bg-rose-50 text-rose-800 border-rose-200",
    stripe: "bg-rose-400",
  },
  rhetoric: {
    label: "Rhetoric",
    pill: "bg-teal-50 text-teal-800 border-teal-200",
    stripe: "bg-teal-400",
  },
};

const SEVERITY_DOT: Record<RhetoricMarker["severity"], string> = {
  subtle: "bg-slate-400",
  clear: "bg-amber-500",
  blatant: "bg-rose-600",
};

const SEVERITY_LABEL: Record<RhetoricMarker["severity"], string> = {
  subtle: "Subtle",
  clear: "Clear",
  blatant: "Blatant",
};

export function MarkerChip({
  marker,
  onClick,
  compact = false,
}: {
  marker: RhetoricMarker;
  onClick?: () => void;
  compact?: boolean;
}) {
  const theme = TYPE_THEME[marker.type];
  const taxonomyEntry = getEntry(marker.name);
  const [showDetail, setShowDetail] = useState(false);

  return (
    <article
      className={`group relative overflow-hidden rounded-lg border border-border/70 bg-card text-card-foreground transition hover:border-foreground/30 hover:shadow-sm ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${theme.stripe}`}
      />
      <div className={`pl-3.5 pr-3 ${compact ? "py-2" : "py-2.5"}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider ${theme.pill}`}
          >
            {theme.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[marker.severity]}`}
            />
            {SEVERITY_LABEL[marker.severity]}
          </span>
          <SpeakerBadge speakerId={marker.speaker_id} />
        </div>
        <h4 className="mt-1 text-sm font-semibold leading-snug text-foreground">
          {marker.display}
        </h4>
        <p className="mt-1 line-clamp-2 text-[12px] italic text-foreground/70">
          &ldquo;{marker.excerpt}&rdquo;
        </p>
        {!compact && (
          <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
            {marker.explanation}
          </p>
        )}

        {!compact && taxonomyEntry && (taxonomyEntry.definition || taxonomyEntry.example) && (
          <button
            type="button"
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/60 hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetail((v) => !v);
            }}
          >
            <span
              aria-hidden
              className={`transition-transform ${showDetail ? "rotate-90" : ""}`}
            >
              ›
            </span>
            {showDetail ? "Hide definition" : "What is this?"}
          </button>
        )}
        {showDetail && taxonomyEntry && (
          <div className="mt-1.5 space-y-1 border-l-2 border-border/70 pl-2 text-[12px] leading-relaxed">
            {taxonomyEntry.definition && (
              <p className="text-foreground/80">{taxonomyEntry.definition}</p>
            )}
            {taxonomyEntry.example && (
              <p className="text-foreground/60">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
                  Example ·{" "}
                </span>
                {taxonomyEntry.example}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
