"use client";

import type { LucideIcon } from "lucide-react";
import { Activity, Flame, Radio, ShieldCheck, Siren } from "lucide-react";
import { VERDICT } from "@/lib/client/verdict-theme";
import { cn } from "@/lib/utils";
import type { ClaimCard, PrimaryLabel, RhetoricMarker } from "@/lib/types";

export type SignalTone = "green" | "amber" | "red" | "neutral";

export type SignalDatum = {
  label: string;
  value: string;
  detail: string;
  tone: SignalTone;
  pulse?: boolean;
};

export type LiveSignalSummary = {
  currentRead: SignalDatum;
  claimRisk: SignalDatum;
  rhetoricHeat: SignalDatum;
  evidenceState: SignalDatum;
  liveState: SignalDatum;
  newFinding: SignalDatum;
};

type LiveSignalInput = {
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  liveState: SignalDatum;
};

const toneClasses: Record<
  SignalTone,
  {
    panel: string;
    dot: string;
    icon: string;
    bar: string;
  }
> = {
  green: {
    panel: "border-green/25 bg-green-soft text-green",
    dot: "bg-green",
    icon: "text-green",
    bar: "bg-green",
  },
  amber: {
    panel: "border-amber/35 bg-amber-50 text-amber-900",
    dot: "bg-amber",
    icon: "text-amber-900",
    bar: "bg-amber",
  },
  red: {
    panel: "border-red-soft bg-red-soft/45 text-red",
    dot: "bg-red",
    icon: "text-red",
    bar: "bg-red",
  },
  neutral: {
    panel: "border-line bg-cream text-ink-3",
    dot: "bg-ink-4",
    icon: "text-ink-4",
    bar: "bg-ink-4",
  },
};

const highRiskLabels = new Set<PrimaryLabel>(["FALSE", "MISLEADING", "OMISSION"]);
const cautionLabels = new Set<PrimaryLabel>(["PARTIAL", "UNVERIFIABLE"]);
const supportedLabels = new Set<PrimaryLabel>(["TRUE", "MOSTLY_TRUE"]);

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

function checkedClaims(claims: ClaimCard[]) {
  return claims.filter((claim) => claim.status !== "checking");
}

function claimCounts(claims: ClaimCard[]) {
  const checked = checkedClaims(claims);
  const checking = claims.length - checked.length;
  const falseCount = checked.filter((claim) => claim.primary_label === "FALSE").length;
  const misleadingCount = checked.filter((claim) =>
    claim.primary_label === "MISLEADING" || claim.primary_label === "OMISSION",
  ).length;
  const cautionCount = checked.filter((claim) => cautionLabels.has(claim.primary_label)).length;
  const supportedCount = checked.filter((claim) => supportedLabels.has(claim.primary_label)).length;
  const opinionCount = checked.filter((claim) => claim.primary_label === "OPINION").length;

  return {
    checked,
    checking,
    falseCount,
    misleadingCount,
    cautionCount,
    supportedCount,
    opinionCount,
  };
}

function currentReadSignal(claims: ClaimCard[]): SignalDatum {
  const counts = claimCounts(claims);

  if (claims.length === 0) {
    return {
      label: "Current read",
      value: "Listening",
      detail: "Waiting for a checkable claim.",
      tone: "amber",
    };
  }

  if (counts.falseCount > 0) {
    return {
      label: "Current read",
      value: VERDICT.FALSE.short,
      detail: `${plural(counts.falseCount, "false claim")} surfaced.`,
      tone: "red",
    };
  }

  if (counts.misleadingCount > 0) {
    return {
      label: "Current read",
      value: VERDICT.MISLEADING.short,
      detail: `${plural(counts.misleadingCount, "misleading/context risk")} surfaced.`,
      tone: "red",
    };
  }

  if (counts.cautionCount > 0) {
    const noBacking = counts.checked.some((claim) => claim.primary_label === "UNVERIFIABLE");
    return {
      label: "Current read",
      value: noBacking ? VERDICT.UNVERIFIABLE.short : VERDICT.PARTIAL.short,
      detail: `${plural(counts.cautionCount, "claim")} still needs stronger evidence.`,
      tone: "amber",
    };
  }

  if (counts.checking > 0 && counts.checked.length === 0) {
    return {
      label: "Current read",
      value: "Checking",
      detail: `${plural(counts.checking, "claim")} in progress.`,
      tone: "amber",
    };
  }

  if (counts.supportedCount > 0) {
    return {
      label: "Current read",
      value: VERDICT.TRUE.short,
      detail: `${plural(counts.supportedCount, "supported claim")} and no high-risk claim yet.`,
      tone: "green",
    };
  }

  if (counts.opinionCount > 0) {
    return {
      label: "Current read",
      value: VERDICT.OPINION.short,
      detail: "Opinion detected, not a checkable fact.",
      tone: "neutral",
    };
  }

  return {
    label: "Current read",
    value: "Checking",
    detail: `${plural(counts.checking, "claim")} in progress.`,
    tone: "amber",
  };
}

function claimRiskSignal(claims: ClaimCard[]): SignalDatum {
  const counts = claimCounts(claims);

  if (claims.length === 0) {
    return {
      label: "Claim risk",
      value: "Waiting",
      detail: "No checkable claim yet.",
      tone: "amber",
    };
  }

  if (counts.falseCount + counts.misleadingCount > 0) {
    return {
      label: "Claim risk",
      value: "High",
      detail: `${plural(counts.falseCount + counts.misleadingCount, "high-risk claim")} found.`,
      tone: "red",
    };
  }

  if (counts.cautionCount > 0 || counts.checking > 0) {
    return {
      label: "Claim risk",
      value: "Caution",
      detail: `${plural(counts.cautionCount + counts.checking, "claim")} incomplete.`,
      tone: "amber",
    };
  }

  return {
    label: "Claim risk",
    value: "Low",
    detail: `${plural(counts.checked.length, "claim")} checked without high risk.`,
    tone: counts.checked.length > 0 ? "green" : "amber",
  };
}

function rhetoricHeatSignal(markers: RhetoricMarker[]): SignalDatum {
  const blatant = markers.filter((marker) => marker.severity === "blatant").length;
  const clear = markers.filter((marker) => marker.severity === "clear").length;

  if (blatant > 0 || clear >= 3) {
    return {
      label: "Rhetoric heat",
      value: "High",
      detail: blatant > 0
        ? `${plural(blatant, "severe marker")} detected.`
        : `${plural(clear, "clear marker")} detected.`,
      tone: "red",
    };
  }

  if (clear > 0) {
    return {
      label: "Rhetoric heat",
      value: "Rising",
      detail: `${plural(clear, "clear marker")} detected.`,
      tone: "amber",
    };
  }

  if (markers.length > 0) {
    return {
      label: "Rhetoric heat",
      value: "Low",
      detail: `${plural(markers.length, "subtle marker")} detected.`,
      tone: "green",
    };
  }

  return {
    label: "Rhetoric heat",
    value: "Calm",
    detail: "No rhetoric marker yet.",
    tone: "green",
  };
}

function evidenceStateSignal(claims: ClaimCard[]): SignalDatum {
  const checked = checkedClaims(claims);
  const checking = claims.length - checked.length;

  if (claims.length === 0) {
    return {
      label: "Evidence state",
      value: "Waiting",
      detail: "No evidence check needed yet.",
      tone: "amber",
    };
  }

  if (checking > 0) {
    return {
      label: "Evidence state",
      value: "Checking",
      detail: `${plural(checking, "claim")} still being verified.`,
      tone: "amber",
    };
  }

  const cited = checked.filter((claim) => claim.sources.length > 0).length;
  const needsBacking = checked.filter((claim) =>
    claim.sources.length === 0 || claim.primary_label === "UNVERIFIABLE",
  ).length;

  if (needsBacking > 0) {
    return {
      label: "Evidence state",
      value: "Needs backing",
      detail: `${plural(needsBacking, "claim")} lacks strong source support.`,
      tone: "amber",
    };
  }

  if (cited > 0) {
    return {
      label: "Evidence state",
      value: "Cited",
      detail: `${plural(cited, "claim")} backed by source evidence.`,
      tone: "green",
    };
  }

  return {
    label: "Evidence state",
    value: "Incomplete",
    detail: "Evidence is not strong enough yet.",
    tone: "amber",
  };
}

function claimTone(label: PrimaryLabel): SignalTone {
  if (highRiskLabels.has(label)) return "red";
  if (cautionLabels.has(label)) return "amber";
  if (supportedLabels.has(label)) return "green";
  return "neutral";
}

function newFindingSignal(claims: ClaimCard[], markers: RhetoricMarker[]): SignalDatum {
  const latestClaim = claims
    .filter((claim) => claim.status !== "checking")
    .slice()
    .sort((a, b) => b.utterance_start - a.utterance_start)[0];
  const latestMarker = markers.slice().sort((a, b) => b.start_time - a.start_time)[0];

  if (!latestClaim && !latestMarker) {
    return {
      label: "Pulse",
      value: "Quiet",
      detail: "No new finding yet.",
      tone: "neutral",
    };
  }

  if (latestClaim && (!latestMarker || latestClaim.utterance_start >= latestMarker.start_time)) {
    return {
      label: "Pulse",
      value: VERDICT[latestClaim.primary_label].short,
      detail: "Latest claim finding.",
      tone: claimTone(latestClaim.primary_label),
      pulse: true,
    };
  }

  return {
    label: "Pulse",
    value: latestMarker.severity === "blatant" ? "Severe" : latestMarker.severity === "clear" ? "Marker" : "Subtle",
    detail: latestMarker.display,
    tone: latestMarker.severity === "blatant" ? "red" : latestMarker.severity === "clear" ? "amber" : "green",
    pulse: true,
  };
}

export function buildLiveSignalSummary({
  claims,
  markers,
  liveState,
}: LiveSignalInput): LiveSignalSummary {
  return {
    currentRead: currentReadSignal(claims),
    claimRisk: claimRiskSignal(claims),
    rhetoricHeat: rhetoricHeatSignal(markers),
    evidenceState: evidenceStateSignal(claims),
    liveState,
    newFinding: newFindingSignal(claims, markers),
  };
}

function SignalCell({
  signal,
  icon: Icon,
  compact = false,
}: {
  signal: SignalDatum;
  icon: LucideIcon;
  compact?: boolean;
}) {
  const classes = toneClasses[signal.tone];

  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden border p-3",
        compact ? "min-h-[62px] rounded-md" : "min-h-[96px] rounded-lg",
        classes.panel,
      )}
      data-signal-tone={signal.tone}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] opacity-75">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                classes.dot,
                signal.pulse && "motion-safe:animate-pulse",
              )}
              aria-hidden
            />
            <span className="truncate">{signal.label}</span>
          </div>
          <div
            className={cn(
              "mt-1 truncate font-semibold leading-tight",
              compact ? "text-[13px]" : "text-[20px]",
            )}
          >
            {signal.value}
          </div>
        </div>
        <Icon className={cn("mt-0.5 shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4", classes.icon)} aria-hidden />
      </div>
      <p className={cn("mt-1 line-clamp-2 leading-snug opacity-85", compact ? "text-[10.5px]" : "text-[12px]")}>
        {signal.detail}
      </p>
      <span className={cn("absolute inset-x-0 bottom-0 h-1", classes.bar)} aria-hidden />
    </div>
  );
}

export function WatchSignalBoard({ summary }: { summary: LiveSignalSummary }) {
  return (
    <section
      className="w-full"
      data-testid="watch-signal-board"
      aria-label="Live signal board"
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <SignalCell signal={summary.currentRead} icon={Activity} />
        <SignalCell signal={summary.rhetoricHeat} icon={Flame} />
        <SignalCell signal={summary.evidenceState} icon={ShieldCheck} />
        <SignalCell signal={summary.liveState} icon={Radio} />
      </div>
    </section>
  );
}

export function ExtensionSignalStrip({ summary }: { summary: LiveSignalSummary }) {
  return (
    <section
      className="grid grid-cols-2 gap-1.5"
      data-testid="extension-signal-strip"
      aria-label="Live signal strip"
    >
      <SignalCell signal={summary.claimRisk} icon={Siren} compact />
      <SignalCell signal={summary.rhetoricHeat} icon={Flame} compact />
      <SignalCell signal={summary.evidenceState} icon={ShieldCheck} compact />
      <SignalCell signal={summary.newFinding} icon={Activity} compact />
    </section>
  );
}
