"use client";

import { useState } from "react";
import Link from "next/link";
import type { ClaimCard, Speaker, Source, PrimaryLabel, Stance, ReputationTier } from "@/lib/types";
import { useSession } from "@/lib/client/session-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Verdict theme maps ───────────────────────────────────────────────────────

const VERDICT_LABEL: Record<PrimaryLabel, string> = {
  TRUE: "True",
  MOSTLY_TRUE: "Mostly True",
  PARTIAL: "Partially True",
  MISLEADING: "Misleading",
  OMISSION: "Missing Context",
  FALSE: "False",
  UNVERIFIABLE: "Unverifiable",
  OPINION: "Opinion",
};

const VERDICT_PILL: Record<PrimaryLabel, string> = {
  TRUE:         "bg-green-soft text-green border-green/30",
  MOSTLY_TRUE:  "bg-green-soft text-green border-green/20",
  PARTIAL:      "bg-orange-soft text-orange border-orange/30",
  MISLEADING:   "bg-orange-soft text-orange border-orange/30",
  OMISSION:     "bg-orange-soft text-orange border-orange/30",
  FALSE:        "bg-red-soft text-red border-red/30",
  UNVERIFIABLE: "bg-slate-soft text-slate border-slate/30",
  OPINION:      "bg-purple-soft text-purple border-purple/30",
};

const VERDICT_SCORE_TEXT: Record<PrimaryLabel, string> = {
  TRUE:         "text-green",
  MOSTLY_TRUE:  "text-green",
  PARTIAL:      "text-orange",
  MISLEADING:   "text-orange",
  OMISSION:     "text-orange",
  FALSE:        "text-red",
  UNVERIFIABLE: "text-slate",
  OPINION:      "text-slate",
};

const VERDICT_FILL: Record<PrimaryLabel, string> = {
  TRUE:         "bg-green",
  MOSTLY_TRUE:  "bg-green",
  PARTIAL:      "bg-orange",
  MISLEADING:   "bg-orange",
  OMISSION:     "bg-orange",
  FALSE:        "bg-red",
  UNVERIFIABLE: "bg-slate",
  OPINION:      "bg-purple",
};

const VERDICT_BORDER_LEFT: Record<PrimaryLabel, string> = {
  TRUE:         "border-l-green",
  MOSTLY_TRUE:  "border-l-green",
  PARTIAL:      "border-l-orange",
  MISLEADING:   "border-l-orange",
  OMISSION:     "border-l-orange",
  FALSE:        "border-l-red",
  UNVERIFIABLE: "border-l-slate",
  OPINION:      "border-l-purple",
};

// ─── Source theme maps ────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerdictLabel({ verdict }: { verdict: PrimaryLabel }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${VERDICT_PILL[verdict]}`}
    >
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

function ScorePill({ score, verdict }: { score: number; verdict: PrimaryLabel }) {
  return (
    <span
      className={`font-serif text-[32px] font-medium leading-none tabular-nums ${VERDICT_SCORE_TEXT[verdict]}`}
    >
      {Math.round(score)}
      <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-ink-4 ml-0.5">
        /100
      </span>
    </span>
  );
}

function ConfBar({ verdict, score }: { verdict: PrimaryLabel; score: number }) {
  return (
    <div className="mt-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-4 font-bold mb-1.5 flex justify-between">
        <span>Confidence</span>
        <span>{Math.round(score)} / 100</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(score)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence: ${Math.round(score)} out of 100`}
        className="h-1.5 bg-cream-2 rounded-full overflow-hidden"
      >
        <div
          className={`h-full ${VERDICT_FILL[verdict]} transition-all duration-500`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

function SourceCard({ source }: { source: Source }) {
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
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STANCE_DOT[source.stance]}`}
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

export function ActionButton({
  label,
  onClick,
  disabled,
  loading,
  tooltip,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={tooltip}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
        disabled || loading
          ? "bg-cream-2 border-line text-ink-4 cursor-not-allowed"
          : "bg-paper border-line text-ink-2 hover:bg-cream-2"
      }`}
    >
      {loading && (
        <span
          aria-hidden
          className="w-2.5 h-2.5 rounded-full border-2 border-ink-4 border-t-transparent animate-spin"
        />
      )}
      {label}
    </button>
  );
}

// ─── ClaimDetail ──────────────────────────────────────────────────────────────

export function ClaimDetail({
  claim,
  speakers,
}: {
  claim: ClaimCard;
  speakers: Speaker[];
}) {
  const speakerLabel =
    speakers.find((s) => s.id === claim.speaker_id)?.label ?? "Unknown";
  const [rechecking, setRechecking] = useState(false);
  const updateClaim = useSession((s) => s.updateClaim);

  async function onRecheck() {
    setRechecking(true);
    try {
      const res = await fetch("/api/verify-confirmed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_text: claim.claim_text }),
      });
      if (res.ok) {
        const data = await res.json();
        updateClaim(claim.id, { ...data, status: "confirmed" });
      }
    } catch (e) {
      console.error("recheck failed", e);
    } finally {
      setRechecking(false);
    }
  }

  async function onShare() {
    const url = `${window.location.origin}/session/detail/claim/${claim.id}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="px-6 md:px-8 pt-4 pb-12 max-w-[820px] mx-auto w-full flex flex-col gap-3.5">
      {/* ── Hero card ──────────────────────────────────────────────── */}
      <div
        className={`bg-paper border border-line border-l-[6px] ${VERDICT_BORDER_LEFT[claim.primary_label]} rounded-2xl p-5`}
      >
        <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
          <VerdictLabel verdict={claim.primary_label} />
          <ScorePill score={claim.score} verdict={claim.primary_label} />
        </div>
        <div className="font-serif italic font-medium text-[20px] text-ink-2 leading-snug tracking-tight">
          &ldquo;{claim.claim_text}&rdquo;
        </div>
        <ConfBar verdict={claim.primary_label} score={claim.score} />
      </div>

      {/* ── Why this verdict ───────────────────────────────────────── */}
      {(claim.annotations.length > 0 || claim.explanation) && (
        <div className="bg-paper border border-line rounded-2xl p-4 px-5">
          <div className="text-[10.5px] tracking-wider uppercase text-ink-4 font-bold mb-2.5">
            Why this verdict
          </div>
          {claim.explanation && (
            <div className="text-[13px] text-ink-2 leading-relaxed mb-3">
              {claim.explanation}
            </div>
          )}
          {claim.annotations.length > 0 && (
            <ul className="space-y-2">
              {claim.annotations.map((a, i) => (
                <li
                  key={i}
                  className="text-[13px] leading-relaxed text-ink-2 flex gap-2"
                >
                  <span className="text-ink-4 leading-5 flex-shrink-0">●</span>
                  {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Sources ────────────────────────────────────────────────── */}
      {claim.sources.length > 0 && (
        <div className="bg-paper border border-line rounded-2xl p-4 px-5">
          <div className="text-[10.5px] tracking-wider uppercase text-ink-4 font-bold mb-2.5">
            Sources · {claim.sources.length}
          </div>
          <div className="flex flex-col gap-2">
            {claim.sources.map((s, i) => (
              <SourceCard key={i} source={s} />
            ))}
          </div>
        </div>
      )}

      {/* ── Speaker + time context ─────────────────────────────────── */}
      <div className="text-[12px] text-ink-3">
        Said by{" "}
        <b className="text-ink-2 font-semibold">{speakerLabel}</b>
        {" · "}
        {formatTs(claim.utterance_start)}
      </div>

      {/* ── Action row ─────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap pt-2">
        <ActionButton label="Share" onClick={onShare} />
        <ActionButton label="Save" disabled />
        <ActionButton
          label="Re-check"
          onClick={onRecheck}
          disabled={rechecking || claim.status === "checking"}
          loading={rechecking}
        />
        <ActionButton
          label="Dispute · coming soon"
          disabled
          tooltip="A dispute workflow is planned for v2."
        />
      </div>

      {/* ── Footer links ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-[11px] text-ink-3 pt-3 border-t border-line-soft flex-wrap gap-2">
        <Link
          href={`/session?view=transcript#claim-${claim.id}`}
          className="hover:text-ink-2 transition-colors"
        >
          See in transcript context →
        </Link>
        <Link
          href={`/session/learn/claim/${claim.id}`}
          className="hover:text-ink-2 transition-colors"
        >
          Learn more →
        </Link>
      </div>
    </div>
  );
}
