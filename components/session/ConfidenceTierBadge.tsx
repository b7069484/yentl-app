import { cn } from "@/lib/utils";
import { confidenceTier, type ConfidenceTier } from "@/lib/client/confidence-tier";

const SPEC: Record<ConfidenceTier, { label: string; tone: string }> = {
  // WCAG AA contrast verified on light-mode fills.
  high: {
    label: "High confidence",
    tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  medium: {
    label: "Medium confidence",
    tone: "bg-amber-100 text-amber-800 border-amber-200",
  },
  low: {
    label: "Low confidence",
    tone: "bg-red-100 text-red-800 border-red-200",
  },
};

export function ConfidenceTierBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const tier = confidenceTier(score);
  const spec = SPEC[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        spec.tone,
        className,
      )}
      role="note"
      aria-label={spec.label}
      data-tier={tier}
    >
      {spec.label}
    </span>
  );
}
