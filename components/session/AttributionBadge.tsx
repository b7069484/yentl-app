import { cn } from "@/lib/utils";
import type { AttributionStatus } from "@/lib/types";

type BadgeSpec = {
  label: string;
  tone: "neutral" | "amber" | "blue";
};

// Phase 1b Task 3 — graduated attribution badges. `confident` and
// `manual_corrected` render no badge (the speaker name carries those cases);
// every other status surfaces an inline cue so users know the speaker label
// isn't fully reliable.
const SPEC: Partial<Record<AttributionStatus, BadgeSpec>> = {
  probable: { label: "Probably", tone: "amber" },
  uncertain: { label: "Speaker uncertain", tone: "amber" },
  unsafe_overlap: { label: "Overlapping speech", tone: "amber" },
  quote_or_clip: { label: "Clip / quoted audio", tone: "blue" },
  not_available: { label: "Speaker unknown", tone: "neutral" },
};

const TONE_CLASS: Record<BadgeSpec["tone"], string> = {
  // Light-mode contrast verified: amber-800 on amber-100 ≈ 5.6:1; blue-800 on
  // blue-100 ≈ 7.2:1; slate-700 on slate-100 ≈ 8.1:1. All pass WCAG AA.
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
};

export function AttributionBadge({
  status,
  className,
}: {
  status: AttributionStatus | null;
  className?: string;
}) {
  const effective = status ?? "not_available";
  const spec = SPEC[effective];
  if (!spec) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        TONE_CLASS[spec.tone],
        className,
      )}
      role="note"
      aria-label={`Attribution: ${spec.label}`}
    >
      {spec.label}
    </span>
  );
}

// Worst-case aggregation across a speaker block. Used by TranscriptView to
// surface a single badge per block instead of one per segment.
const SEVERITY: Record<AttributionStatus, number> = {
  confident: 0,
  manual_corrected: 0,
  probable: 1,
  quote_or_clip: 2,
  uncertain: 3,
  unsafe_overlap: 4,
  not_available: 5,
};

export function worstAttributionStatus(
  statuses: Array<AttributionStatus | null | undefined>,
): AttributionStatus | null {
  let worst: AttributionStatus | null = null;
  let worstScore = -1;
  for (const s of statuses) {
    if (!s) continue;
    const score = SEVERITY[s] ?? 0;
    if (score > worstScore) {
      worst = s;
      worstScore = score;
    }
  }
  return worst;
}
