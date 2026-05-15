"use client";

import { useState } from "react";
import type { SynthesisState } from "@/lib/client/session-store";

// ─── Time-ago helper ──────────────────────────────────────────────────────────

export function ageLabel(ms: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ago`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconRefresh({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={spinning ? "animate-spin" : undefined}
    >
      <path d="M12 7a5 5 0 1 1-1.5-3.5" />
      <polyline points="12,2 12,5.5 8.5,5.5" />
    </svg>
  );
}

function IconAlertTriangle() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="6,1.5 11,10 1,10" />
      <line x1="6" y1="5" x2="6" y2="7.5" />
      <circle cx="6" cy="9" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ─── Headline dot colors by index ─────────────────────────────────────────────

const HEADLINE_DOTS: string[] = [
  "bg-red",    // 0 — fallacy attribution
  "bg-green",  // 1 — verdict ratio
  "bg-amber-2",// 2 — topic concentration
];

// ─── Skeleton (warming state) ─────────────────────────────────────────────────

function WarmingSkeleton() {
  return (
    <div>
      {/* Heading row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-amber-2">
          Yenta is listening…
        </span>
      </div>

      {/* Shimmer lines */}
      <div className="space-y-2 mb-3.5">
        <div className="h-3.5 rounded-sm bg-cream-2 animate-pulse w-full" />
        <div className="h-3.5 rounded-sm bg-cream-2 animate-pulse w-4/5" />
      </div>

      {/* Chip placeholders */}
      <div className="flex flex-wrap gap-2">
        <div className="h-6 w-32 rounded-full bg-cream-2 animate-pulse" />
        <div className="h-6 w-32 rounded-full bg-cream-2 animate-pulse" />
        <div className="h-6 w-32 rounded-full bg-cream-2 animate-pulse" />
      </div>
    </div>
  );
}

// ─── SynthesisCard ────────────────────────────────────────────────────────────

export function SynthesisCard({
  synthesis,
  onHeadlineClick,
  onRefresh,
}: {
  synthesis: SynthesisState;
  onHeadlineClick: (headline: string, index: number) => void;
  onRefresh?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // null state — render nothing
  if (synthesis === null) return null;

  // warming state — skeleton
  if (synthesis.state === "warming") {
    return (
      <div className="bg-paper border border-line border-l-4 border-l-amber rounded-xl px-5 py-4">
        <WarmingSkeleton />
      </div>
    );
  }

  // fresh / refreshing / error states — full card
  const isRefreshing = synthesis.state === "refreshing";
  const isError = synthesis.state === "error";

  const text = synthesis.text;
  const headlines = synthesis.headlines ?? [];

  // Age label
  let ageSuffix: string;
  if (isRefreshing) {
    ageSuffix = "· refreshing…";
  } else {
    ageSuffix = `· ${ageLabel(synthesis.at)}`;
  }

  return (
    <div className="bg-paper border border-line border-l-4 border-l-amber rounded-xl px-5 py-4">
      {/* Heading row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-amber-2">
          Yenta&apos;s read {ageSuffix}
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh synthesis"
            className="flex items-center justify-center h-[26px] w-[26px] rounded-full text-ink-3 hover:text-ink-2 hover:bg-cream-2 transition-colors"
          >
            <IconRefresh spinning={isRefreshing} />
          </button>
        )}
      </div>

      {/* Synthesis paragraph */}
      {text ? (
        <p
          className={`font-serif text-[18px] leading-snug text-ink font-normal tracking-tight ${
            expanded ? "block" : "hidden"
          } md:block`}
        >
          {text}
        </p>
      ) : isError ? (
        /* Error fallback — no prior text available */
        <p
          className={`font-serif text-[16px] italic text-ink-3 ${
            expanded ? "block" : "hidden"
          } md:block`}
        >
          Yenta&apos;s read isn&apos;t loading. Retrying in a moment.
        </p>
      ) : null}

      {/* Headlines row */}
      {headlines.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3.5">
          {headlines.map((headline, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onHeadlineClick(headline, i)}
              className="inline-flex items-center gap-1.5 bg-cream-2 border border-line px-2.5 py-1 rounded-full text-[11.5px] text-ink-2 hover:border-ink-4"
            >
              <span
                aria-hidden
                className={`h-[6px] w-[6px] rounded-full shrink-0 ${HEADLINE_DOTS[i] ?? "bg-ink-4"}`}
              />
              {headline}
            </button>
          ))}
        </div>
      )}

      {/* Error notice */}
      {isError && (
        <div className="mt-2.5 text-[11px] text-amber-2 flex items-center gap-1.5">
          <IconAlertTriangle />
          Couldn&apos;t refresh · retrying in 30s
        </div>
      )}

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink-2 md:hidden"
      >
        {expanded ? "Hide Yenta's take ⌃" : "Read Yenta's take ⌄"}
      </button>
    </div>
  );
}
