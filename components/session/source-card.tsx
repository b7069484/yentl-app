"use client";

import type { Source, Stance, ReputationTier } from "@/lib/types";

// ─── Theme maps ───────────────────────────────────────────────────────────────

const STANCE_DOT: Record<Stance, string> = {
  supports:    "bg-green",
  contradicts: "bg-red",
  mixed:       "bg-orange",
};

const REPUTATION_COLOR: Record<ReputationTier, string> = {
  high: "text-green",
  mid:  "text-slate",
  low:  "text-red",
};

const REPUTATION_LABEL: Record<ReputationTier, string> = {
  high: "HIGH",
  mid:  "MID",
  low:  "LOW",
};

// ─── SourceCard ───────────────────────────────────────────────────────────────

export function SourceCard({ source }: { source: Source }) {
  const initial = source.domain[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex gap-2.5 p-3 bg-cream-2 border border-line-soft rounded-[10px]">
      <div className="w-10 h-10 rounded-lg bg-ink-2 text-white flex items-center justify-center font-bold text-[12px] flex-shrink-0 select-none">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink leading-snug tracking-tight truncate">
          {source.title}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-4 mt-1 flex-wrap">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-paper ${STANCE_DOT[source.stance]}`}
          />
          <span className="truncate">{source.domain}</span>
          <span>·</span>
          <span className={`font-semibold uppercase ${REPUTATION_COLOR[source.reputation_tier]}`}>
            {REPUTATION_LABEL[source.reputation_tier]}
          </span>
        </div>
        {source.excerpt && (
          <div className="font-serif italic text-[12px] text-ink-3 mt-1.5 pl-2 border-l-2 border-line line-clamp-3">
            {source.excerpt}
          </div>
        )}
      </div>
    </div>
  );
}
