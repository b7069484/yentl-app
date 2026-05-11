import type { PrimaryLabel, ReputationTier, Stance } from "@/lib/types";

export type VerdictTheme = {
  label: string;
  short: string;
  blurb: string;
  pill: string;
  ring: string;
  dot: string;
  scoreText: string;
};

export const VERDICT: Record<PrimaryLabel, VerdictTheme> = {
  TRUE: {
    label: "True",
    short: "True",
    blurb: "Matches authoritative sources.",
    pill: "bg-emerald-50 text-emerald-800 border-emerald-300",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
    scoreText: "text-emerald-700",
  },
  MOSTLY_TRUE: {
    label: "Mostly true",
    short: "Mostly true",
    blurb: "Core claim holds; minor caveats apply.",
    pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
    ring: "ring-emerald-200",
    dot: "bg-emerald-400",
    scoreText: "text-emerald-700",
  },
  PARTIAL: {
    label: "Partially true",
    short: "Partial",
    blurb: "Part of the claim is supported, part isn't.",
    pill: "bg-amber-50 text-amber-900 border-amber-300",
    ring: "ring-amber-200",
    dot: "bg-amber-500",
    scoreText: "text-amber-800",
  },
  MISLEADING: {
    label: "Misleading",
    short: "Misleading",
    blurb: "Technically defensible but designed to mislead.",
    pill: "bg-amber-50 text-amber-900 border-amber-400",
    ring: "ring-amber-200",
    dot: "bg-amber-600",
    scoreText: "text-amber-800",
  },
  OMISSION: {
    label: "Missing context",
    short: "Omission",
    blurb: "True on its face but key context is missing.",
    pill: "bg-orange-50 text-orange-900 border-orange-300",
    ring: "ring-orange-200",
    dot: "bg-orange-500",
    scoreText: "text-orange-800",
  },
  FALSE: {
    label: "False",
    short: "False",
    blurb: "Contradicts authoritative sources.",
    pill: "bg-rose-50 text-rose-800 border-rose-300",
    ring: "ring-rose-200",
    dot: "bg-rose-600",
    scoreText: "text-rose-700",
  },
  UNVERIFIABLE: {
    label: "Unverifiable",
    short: "Unverifiable",
    blurb: "Couldn't find authoritative evidence either way.",
    pill: "bg-slate-50 text-slate-700 border-slate-300",
    ring: "ring-slate-200",
    dot: "bg-slate-500",
    scoreText: "text-slate-600",
  },
  OPINION: {
    label: "Opinion",
    short: "Opinion",
    blurb: "A value judgment, not a checkable fact.",
    pill: "bg-violet-50 text-violet-800 border-violet-300",
    ring: "ring-violet-200",
    dot: "bg-violet-500",
    scoreText: "text-violet-700",
  },
};

export const REPUTATION_TIER: Record<
  ReputationTier,
  { label: string; pill: string; description: string }
> = {
  high: {
    label: "High",
    pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
    description: "Wire service, peer-reviewed, .gov/.edu.",
  },
  mid: {
    label: "Mid",
    pill: "bg-slate-50 text-slate-700 border-slate-200",
    description: "General-audience publishers.",
  },
  low: {
    label: "Low",
    pill: "bg-rose-50 text-rose-800 border-rose-200",
    description: "Partisan, social, or rumor-prone outlets.",
  },
};

export const STANCE: Record<
  Stance,
  { icon: string; label: string; tone: string }
> = {
  supports: {
    icon: "✓",
    label: "Supports",
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  contradicts: {
    icon: "✗",
    label: "Contradicts",
    tone: "text-rose-700 bg-rose-50 border-rose-200",
  },
  mixed: {
    icon: "~",
    label: "Mixed",
    tone: "text-amber-700 bg-amber-50 border-amber-200",
  },
};
