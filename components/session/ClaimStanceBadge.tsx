import { cn } from "@/lib/utils";
import type { ClaimStance } from "@/lib/types";

type Tone = "neutral" | "red" | "blue" | "amber" | "green";

// Phase 1b Task 4 — surface the speaker's stance toward a claim. `asserted`
// renders no badge (it's the default; showing it would be noise). The other
// stances change the meaning of the fact-check — a "denied" claim getting a
// FALSE verdict means the speaker AGREES with us; same verdict on an
// "asserted" claim means we disagree with them. Phase 1a captured this at
// extraction time; Phase 1b makes it visible.
const SPEC: Partial<Record<ClaimStance, { label: string; tone: Tone }>> = {
  denied: { label: "Denied", tone: "red" },
  quoted: { label: "Quoted", tone: "blue" },
  reported: { label: "Reported", tone: "blue" },
  mocked: { label: "Mocked", tone: "amber" },
  questioned: { label: "Questioned", tone: "neutral" },
  corrected: { label: "Corrected", tone: "green" },
  hedged: { label: "Hedged", tone: "amber" },
  unclear: { label: "Unclear stance", tone: "neutral" },
};

const TONE_CLASS: Record<Tone, string> = {
  // Light-mode WCAG AA contrast verified across all five tones.
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  red: "bg-red-100 text-red-800 border-red-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function ClaimStanceBadge({
  stance,
  className,
}: {
  stance?: ClaimStance;
  className?: string;
}) {
  if (!stance) return null;
  const spec = SPEC[stance];
  if (!spec) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        TONE_CLASS[spec.tone],
        className,
      )}
      role="note"
      aria-label={`Speaker stance: ${spec.label}`}
    >
      {spec.label}
    </span>
  );
}
