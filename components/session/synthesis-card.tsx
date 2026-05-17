"use client";

import { useState } from "react";
import type { SynthesisState, SpeakerVerdict } from "@/lib/client/session-store";

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

// ─── Per-speaker verdict block ────────────────────────────────────────────────

const FACTUAL_GRADE_STYLE: Record<
  SpeakerVerdict["factual_grade"],
  { bg: string; text: string; label: string }
> = {
  mostly_factual:    { bg: "bg-green-soft",  text: "text-green",   label: "Mostly Factual" },
  mixed:             { bg: "bg-amber-soft",   text: "text-amber-2", label: "Mixed" },
  mostly_inaccurate: { bg: "bg-red-soft",     text: "text-red",     label: "Mostly Inaccurate" },
  insufficient:      { bg: "bg-slate-soft",   text: "text-ink-3",   label: "Insufficient data" },
};

const FAITH_GRADE_STYLE: Record<
  SpeakerVerdict["faith_grade"],
  { bg: string; text: string; label: string }
> = {
  good_faith:   { bg: "bg-green-soft", text: "text-green",   label: "Good Faith" },
  mixed:        { bg: "bg-amber-soft",  text: "text-amber-2", label: "Mixed" },
  bad_faith:    { bg: "bg-red-soft",    text: "text-red",     label: "Bad Faith" },
  insufficient: { bg: "bg-slate-soft",  text: "text-ink-3",   label: "Insufficient data" },
};

const CHIP_BASE =
  "inline-flex items-center px-2 py-px rounded-full text-[10px] font-semibold leading-snug border whitespace-nowrap";

function GradeChip({
  style,
}: {
  style: { bg: string; text: string; label: string };
}) {
  return (
    <span className={`${CHIP_BASE} ${style.bg} ${style.text} border-transparent`}>
      {style.label}
    </span>
  );
}

function SpeakerVerdictCard({ verdict, index }: { verdict: SpeakerVerdict; index: number }) {
  const paletteIndex = (verdict.speaker_id % 6) + 1;
  const factualStyle = FACTUAL_GRADE_STYLE[verdict.factual_grade];
  const faithStyle = FAITH_GRADE_STYLE[verdict.faith_grade];

  return (
    <div
      className="flex-1 min-w-0 border border-line rounded-lg px-3.5 py-3 bg-paper flex flex-col gap-2"
      data-testid={`speaker-verdict-card-${index}`}
    >
      {/* Speaker label row */}
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-[7px] w-[7px] rounded-full shrink-0"
          style={{ backgroundColor: `var(--spk-${paletteIndex})` }}
        />
        <span className="text-[11.5px] font-semibold text-ink-2 truncate">
          {verdict.label}
        </span>
      </div>

      {/* Grade chips */}
      <div className="flex flex-wrap gap-1.5">
        <GradeChip style={factualStyle} />
        <GradeChip style={faithStyle} />
      </div>

      {/* One-liner */}
      <p className="font-serif text-[13px] italic leading-snug text-ink-2 m-0">
        {verdict.one_liner}
      </p>
    </div>
  );
}

function PerSpeakerVerdicts({ verdicts }: { verdicts: SpeakerVerdict[] }) {
  if (verdicts.length === 0) return null;

  return (
    <div className="mt-4 border-t border-line pt-3.5" data-testid="per-speaker-verdicts">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-4 mb-2.5">
        Per-Speaker Verdict
      </span>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
        {verdicts.map((v, i) => (
          <SpeakerVerdictCard key={v.speaker_id} verdict={v} index={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton (warming state) ─────────────────────────────────────────────────

function WarmingSkeleton() {
  return (
    <div>
      {/* Heading row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-amber-2">
          Yentl is listening…
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
  const perSpeakerVerdicts = ("per_speaker_verdicts" in synthesis && synthesis.per_speaker_verdicts) ? synthesis.per_speaker_verdicts : [];

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
          Yentl&apos;s read {ageSuffix}
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
          Yentl&apos;s read isn&apos;t loading. Retrying in a moment.
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

      {/* Per-speaker verdicts */}
      {perSpeakerVerdicts.length > 0 && (
        <PerSpeakerVerdicts verdicts={perSpeakerVerdicts} />
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
        {expanded ? "Hide Yentl's take ⌃" : "Read Yentl's take ⌄"}
      </button>
    </div>
  );
}
